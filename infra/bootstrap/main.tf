data "aws_caller_identity" "current" {}

# --- State bucket ---------------------------------------------------------------

# The account ID makes the name globally unique without a random suffix, so it
# can be derived instead of looked up.
resource "aws_s3_bucket" "tfstate" {
  bucket = "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"

  # Losing this bucket loses the record of every resource in the main stack.
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "${var.project_name}-tfstate"
  }
}

# Every write keeps the previous version, so a corrupted or wrongly applied
# state can be rolled back.
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Old versions are only for recovery; 90 days is plenty and keeps the bucket
# from growing forever.
resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    id     = "expire-noncurrent-state"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  depends_on = [aws_s3_bucket_versioning.tfstate]
}

# The state holds the RDS master password in plaintext (D-03 exception).
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ACLs off: access is decided by IAM and the bucket policy only.
resource "aws_s3_bucket_ownership_controls" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

data "aws_iam_policy_document" "tfstate_tls_only" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.tfstate.arn,
      "${aws_s3_bucket.tfstate.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  policy = data.aws_iam_policy_document.tfstate_tls_only.json

  # S3 rejects a policy while the public access block is still being applied.
  depends_on = [aws_s3_bucket_public_access_block.tfstate]
}

# --- GitHub OIDC ------------------------------------------------------------------

# Lets IAM trust tokens issued by GitHub Actions. No thumbprint: AWS validates
# GitHub's certificate through its own trust store, and the provider made the
# argument optional.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  tags = {
    Name = "github-actions"
  }
}

# --- CI role ----------------------------------------------------------------------

# Both conditions are StringEquals on purpose: a wildcard in `sub` is the
# classic mistake that lets any repository (or any branch) assume the role.
# Pinning the Environment, instead of a branch, works for push, dispatch and
# workflow_run alike; the Environment itself only admits main.
data "aws_iam_policy_document" "ci_trust" {
  statement {
    sid     = "GitHubActionsProductionEnvironment"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:${var.github_environment}"]
    }
  }
}

# Named outside the `${project_name}-*` prefix, so a future IAM permission
# scoped to the project's own roles can never reach this one.
resource "aws_iam_role" "ci" {
  name                 = "github-actions-${var.project_name}"
  description          = "Assumed by GitHub Actions jobs in the ${var.github_environment} environment of ${var.github_repository} to run terraform apply on infra/."
  assume_role_policy   = data.aws_iam_policy_document.ci_trust.json
  max_session_duration = 3600

  tags = {
    Name = "github-actions-${var.project_name}"
  }
}

# Everything except IAM and Organizations: enough for the main stack (VPC, EC2,
# RDS, S3 state and lockfile) and no way to create users, keys or roles. If the
# main stack ever needs to create roles, add a statement scoped to
# arn:aws:iam::<account>:role/${project_name}-* instead of widening this.
resource "aws_iam_role_policy_attachment" "ci_power_user" {
  role       = aws_iam_role.ci.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

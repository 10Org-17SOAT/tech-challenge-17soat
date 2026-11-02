# ---------------------------------------------------------------------------
# Bootstrap stack — the one documented exception to D-07 (single root module).
#
# It creates what the main stack (infra/) cannot create for itself:
#   - the S3 bucket that holds the main stack's state, which cannot live in
#     the state it stores;
#   - the GitHub OIDC provider and the CI role, which the pipeline needs in
#     order to run the very apply that would otherwise create them.
#
# Applied ONCE, by hand, by an account admin. Its own state stays local and is
# ignored by Git: it holds no secret and can be rebuilt with `terraform import`.
# See infra/README.md, section 14.
# ---------------------------------------------------------------------------

terraform {
  # Same floor as the main stack (infra/versions.tf).
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Mandatory here, unlike the main stack: this stack runs from a personal
  # machine with admin credentials, where pointing at the wrong account is the
  # likeliest mistake.
  allowed_account_ids = [var.account_id]

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
      Stack     = "bootstrap"
    }
  }
}

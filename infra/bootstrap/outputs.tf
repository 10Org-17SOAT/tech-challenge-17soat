# Values to copy into the `production` GitHub Environment (variables, not
# secrets: none of them is a credential) and into infra/backend.hcl. The CI
# access key is created by hand; see README section 14.

output "state_bucket" {
  description = "Bucket of the main stack's state. GitHub variable TF_STATE_BUCKET and `bucket` in infra/backend.hcl."
  value       = aws_s3_bucket.tfstate.bucket
}

output "aws_region" {
  description = "Region of the bucket. GitHub variable AWS_REGION and `region` in infra/backend.hcl."
  value       = var.aws_region
}

output "ci_user_name" {
  description = "IAM user whose access key goes into the `production` Environment secrets AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
  value       = aws_iam_user.ci.name
}

output "backend_hcl" {
  description = "Content of infra/backend.hcl (Git-ignored) for running the main stack locally."
  value       = <<-EOT
    bucket = "${aws_s3_bucket.tfstate.bucket}"
    region = "${var.aws_region}"
  EOT
}

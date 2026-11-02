# Values to copy into the `production` GitHub Environment (variables, not
# secrets: none of them is a credential) and into infra/backend.hcl.

output "state_bucket" {
  description = "Bucket of the main stack's state. GitHub variable TF_STATE_BUCKET and `bucket` in infra/backend.hcl."
  value       = aws_s3_bucket.tfstate.bucket
}

output "aws_region" {
  description = "Region of the bucket. GitHub variable AWS_REGION and `region` in infra/backend.hcl."
  value       = var.aws_region
}

output "ci_role_arn" {
  description = "Role the pipeline assumes through OIDC. GitHub variable AWS_ROLE_ARN."
  value       = aws_iam_role.ci.arn
}

output "backend_hcl" {
  description = "Content of infra/backend.hcl (Git-ignored) for running the main stack locally."
  value       = <<-EOT
    bucket = "${aws_s3_bucket.tfstate.bucket}"
    region = "${var.aws_region}"
  EOT
}

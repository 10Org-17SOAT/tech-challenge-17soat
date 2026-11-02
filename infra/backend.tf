# ---------------------------------------------------------------------------
# Remote state — resolves D-06.
#
# Partial configuration: the bucket and its region come from the bootstrap
# stack (infra/bootstrap) and are passed at init time, so no account-specific
# value is committed:
#
#   local:  terraform init -backend-config=backend.hcl     (Git-ignored file;
#           content in `terraform -chdir=bootstrap output -raw backend_hcl`)
#   CI:     terraform init -backend-config="bucket=$TF_STATE_BUCKET" \
#                          -backend-config="region=$AWS_REGION"
#
# `terraform validate` and `fmt` do not need it: `init -backend=false`.
# ---------------------------------------------------------------------------

terraform {
  backend "s3" {
    key = "tech-challenge-soat/terraform.tfstate"

    # The state holds the RDS master password in plaintext (D-03 exception).
    encrypt = true

    # Lock as an S3 object; DynamoDB locking is deprecated.
    use_lockfile = true
  }
}

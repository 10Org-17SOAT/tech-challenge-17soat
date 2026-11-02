# ---------------------------------------------------------------------------
# Values of the production stack — committed on purpose, contains NO secrets.
#
# The single source of the values for every `apply`: the pipeline (job `infra`
# of .github/workflows/deploy.yml) and anyone running Terraform by hand use this
# same file, or one apply would undo the other (README, section 11):
#
#   terraform -chdir=infra plan -var-file=production.tfvars
#
# Resolves C-04 (region and account guard) and C-09 (K3s version pinned).
# The RDS password is not here: Terraform generates it (D-03 exception).
# ---------------------------------------------------------------------------

# --- AWS integration -----------------------------------------------------

# The project's region: the account's SCP denies most services elsewhere
# (README, section 14).
aws_region = "us-east-2"

# Account of the AWS Settings project "POS FIAP". An account ID is an
# identifier, not a credential.
allowed_account_ids = ["057704057039"]

# --- Identity and environment --------------------------------------------

project_name = "tech-challenge-soat"
environment  = "production"

# --- Compute -------------------------------------------------------------

# The account is on the AWS free plan: RunInstances only accepts free-tier
# eligible types. t4g.small is the largest ARM one (2 vCPU, 2 GiB).
instance_type = "t4g.small"

# Pinned so a recreated VM runs the same cluster. Keep the kubectl version in
# .github/actions/kubeconfig within one minor of it. Changing it recreates the
# VM (user_data_replace_on_change), which the pipeline refuses to do: apply it
# by hand.
k3s_version = "v1.36.5+k3s1"

# --- Database (RDS) ------------------------------------------------------

# The free plan rejects CreateDBInstance with a longer backup retention.
db_backup_retention_days = 1

# --- VM access -----------------------------------------------------------

# Dedicated to this environment. The private half is the SSH_PRIVATE_KEY secret
# of the `production` GitHub Environment, used by the kubeconfig action.
# Changing it recreates the VM.
ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIM5crwfuK83KzBS4aAm4wutp2Yo165jcTuLOeKv28y7v tech-challenge-soat production (GitHub Actions)"

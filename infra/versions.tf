# ---------------------------------------------------------------------------
# Version contract of the infrastructure foundation.
# ---------------------------------------------------------------------------

terraform {
  # 1.9.0 is the floor because it is the first version whose `validation`
  # rules can reference other variables — which `variables.tf` uses to ensure
  # the public subnet CIDR fits inside the VPC CIDR.
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    # Database layer (database.tf): RDS master password and final snapshot suffix.
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
    # Database layer (database.tf): non-secret db.env for the k8s/overlays/aws overlay.
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

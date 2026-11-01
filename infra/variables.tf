# ---------------------------------------------------------------------------
# Shared input variables
# Rule: each new variable belongs to the layer that uses it, not to this file.
# ---------------------------------------------------------------------------
#
# GENERAL RULES
#
# 1. Every variable has a default. That is what keeps
#    `terraform plan -input=false` from ever prompting the operator.
# 2. No `sensitive` variables. No secret comes in through here: the Terraform
#    state stores values in PLAINTEXT even when the output is sensitive.
#    Secrets belong in a k8s Secret.
# 3. `null` means "not provided yet": the provider uses its own default or the
#    owning layer decides. Never use `null` to bypass a validation.
# 4. Every `validation` states the rule and its consequence.
# 5. No region, CIDR, name or tag literal outside this file.

# --- AWS integration -----------------------------------------------------

variable "aws_region" {
  type        = string
  description = "AWS region where the infrastructure is created. Region is a cost and latency choice, not boilerplate: us-east-1 is the default only because it was the review default, not because it is the best choice for this project."
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be an AWS region, e.g. sa-east-1."
  }
}

variable "allowed_account_ids" {
  type        = list(string)
  description = "AWS account IDs (12 digits) this state may operate on. Safety guard: keeps an apply from hitting the wrong account. Empty list = no restriction; each value must be filled in explicitly."
  default     = []

  # The empty list is a VALID state and the default: it means the guard is off.
  # There is no "non-empty list" validation here on purpose — it would reject
  # the default itself and break `terraform plan` for anyone who has not filled
  # in the value yet. `providers.tf` turns the empty list into `null` for the
  # provider (decision D-12).
  validation {
    condition     = alltrue([for id in var.allowed_account_ids : can(regex("^[0-9]{12}$", id))])
    error_message = "Each allowed_account_ids entry must be an AWS account ID with exactly 12 digits."
  }
}

# --- Identity and environment -----------------------------------------

variable "project_name" {
  type        = string
  description = "Project name, used as the resource name prefix and as the Project tag value. Not to be confused with the repository name or the database name."
  default     = "tech-challenge-soat"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,28}[a-z0-9]$", var.project_name))
    error_message = "project_name must start and end with a lowercase letter or digit, contain only [a-z0-9-], and be 3 to 30 characters long."
  }
}

variable "environment" {
  type        = string
  description = "Logical environment, used only as a tag (decision D-04). Stacks of different environments are told apart by project_name, not by this variable."
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "environment must be development, staging or production."
  }
}

# --- Kubernetes --------------------------------

variable "k8s_namespace" {
  type        = string
  description = "Kubernetes namespace where the application workloads are installed. The namespace is cluster configuration data, not a Terraform resource."
  default     = "tech-challenge-soat"

  validation {
    condition     = can(regex("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", var.k8s_namespace)) && length(var.k8s_namespace) <= 63
    error_message = "k8s_namespace must be a valid DNS-1123 label up to 63 characters: only [a-z0-9-], starting and ending with [a-z0-9]."
  }
}

# --- Network ----------------------------------

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block."
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid IPv4 CIDR, e.g. 10.0.0.0/16."
  }
}

variable "public_subnet_cidr" {
  type        = string
  description = "CIDR block of the public subnet that hosts the K3s VM. Must be contained in vpc_cidr — the validation below enforces it."
  default     = "10.0.1.0/24"

  validation {
    condition = (
      can(cidrnetmask(var.public_subnet_cidr)) &&
      can(cidrnetmask(var.vpc_cidr)) &&
      tonumber(split("/", var.public_subnet_cidr)[1]) > tonumber(split("/", var.vpc_cidr)[1]) &&
      # Caps the enumeration in the containment validation below at 65536
      # entries (newbits <= 16). Protects `plan` from an absurd combination,
      # such as vpc_cidr at /8 with public_subnet_cidr at /32.
      tonumber(split("/", var.public_subnet_cidr)[1]) - tonumber(split("/", var.vpc_cidr)[1]) <= 16
    )
    error_message = "public_subnet_cidr must be a valid IPv4 CIDR, with a mask more specific than vpc_cidr and at most 16 bits more specific (e.g. /16 -> /32)."
  }

  # This validation references another variable, which requires
  # Terraform >= 1.9.0 — the reason for `required_version` in versions.tf.
  #
  # Terraform has no `cidrcontains` function, and `within()` does not check
  # address range containment. The correct approach here is to enumerate the
  # subnets of the right size that fit in the VPC and require the subnet to be
  # one of them.
  #
  # Do not replace it with `cidrsubnet(vpc, newbits, 0) == subnet`: that only
  # checks the subnet is the FIRST one of its size, and would reject
  # 10.0.1.0/24 in a 10.0.0.0/16 VPC, which is the default pair and perfectly
  # valid.
  validation {
    condition = contains(
      [
        for i in range(pow(
          2,
          tonumber(split("/", var.public_subnet_cidr)[1]) - tonumber(split("/", var.vpc_cidr)[1])
          )) : cidrsubnet(
          var.vpc_cidr,
          tonumber(split("/", var.public_subnet_cidr)[1]) - tonumber(split("/", var.vpc_cidr)[1]),
          i
        )
      ],
      var.public_subnet_cidr
    )
    error_message = "public_subnet_cidr must be contained in vpc_cidr. Adjust both together."
  }
}

variable "availability_zone" {
  type        = string
  description = "Availability Zone of the public subnet and the instance. null picks the first AZ (alphabetically) that offers instance_type. A given AZ that does not offer the type fails at plan time."
  default     = null

  validation {
    condition     = var.availability_zone == null || can(regex("^[a-z]{2}-[a-z]+-[1-9][a-z]$", var.availability_zone))
    error_message = "availability_zone must be null or a valid AZ, e.g. sa-east-1a."
  }
}

# Any IPv4 address. A constant, not a variable: it is the destination of the
# internet route, the VM's unrestricted egress and the source of the ports
# opened by decision (see the security.tf header). It lives here because of
# rule 5.
locals {
  anywhere_cidr = "0.0.0.0/0"
}

# --- Compute ----------------------------------

variable "instance_type" {
  type        = string
  description = "VM instance type. t4g is ARM (Graviton), so the build environment must also be ARM for the image not to run under emulation."
  default     = "t4g.medium"

  validation {
    condition     = length(var.instance_type) > 0
    error_message = "instance_type must not be empty."
  }
}

variable "root_volume_size" {
  type        = number
  description = "Size in GiB of the VM root volume. The minimum covers the distro image plus K3s and the application; 20 GiB is plenty for a single instance."
  default     = 20

  validation {
    condition     = var.root_volume_size >= 8 && var.root_volume_size <= 1024
    error_message = "root_volume_size must be between 8 and 1024 GiB."
  }
}

variable "ami_owner" {
  type        = string
  description = "Owner ID of the base AMI, so the name filter never resolves to a third-party image. Canonical (Ubuntu)."
  default     = "099720109477"

  validation {
    condition     = can(regex("^[0-9]{12}$", var.ami_owner))
    error_message = "ami_owner must be a numeric AWS account ID with exactly 12 digits."
  }
}

variable "ami_name_filter" {
  type        = string
  description = "Name filter of the base AMI. The default looks up Ubuntu 24.04 LTS (Noble), ARM64 (gp3) variant, consistent with a t4g.* instance_type."
  default     = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"

  validation {
    condition     = length(var.ami_name_filter) > 0
    error_message = "ami_name_filter must not be empty: without a filter the AMI lookup is ambiguous across many images."
  }
}

# --- Operations -------------------------------

variable "k3s_version" {
  type        = string
  description = "K3s version to install, in the installer's exact format, e.g. v1.31.5+k3s1. null lets the install script resolve it, which makes the deployment non-reproducible."
  default     = null

  validation {
    condition     = var.k3s_version == null || can(regex("^v[0-9]+\\.[0-9]+\\.[0-9]+\\+k3s1$", var.k3s_version))
    error_message = "k3s_version must be null or a version in the installer's exact format, e.g. v1.31.5+k3s1."
  }
}

variable "domain" {
  type        = string
  description = "Fully qualified domain of the API, for the ACME certificate and public DNS. null while there is no domain: access happens through IP and port."
  default     = null

  validation {
    condition     = var.domain == null || can(regex("^([a-z0-9]([-a-z0-9]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain))
    error_message = "domain must be null or a valid lowercase FQDN, e.g. api.example.com."
  }
}

variable "account_id" {
  type        = string
  description = "AWS account that hosts the project. No default on purpose: the provider refuses to run against any other account. Find it with `aws sts get-caller-identity`."

  validation {
    condition     = can(regex("^[0-9]{12}$", var.account_id))
    error_message = "account_id must be an AWS account ID with exactly 12 digits."
  }
}

variable "aws_region" {
  type        = string
  description = "Region of the state bucket. Must match aws_region of the main stack, which the CI uses for both."
  default     = "us-east-2"

  validation {
    condition     = can(regex("^[a-z]{2}(-[a-z]+)+-[0-9]$", var.aws_region))
    error_message = "aws_region must be an AWS region code, e.g. us-east-2."
  }
}

variable "project_name" {
  type        = string
  description = "Same value as project_name in the main stack. Names the state bucket and the CI role."
  default     = "tech-challenge-soat"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-32 characters of [a-z0-9-], starting with a letter and not ending with a hyphen."
  }
}

variable "github_repository" {
  type        = string
  description = "GitHub repository, as owner/name, whose workflows may assume the CI role."
  default     = "10Org-17SOAT/tech-challenge-17soat"

  validation {
    condition     = can(regex("^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$", var.github_repository))
    error_message = "github_repository must look like owner/name."
  }
}

variable "github_environment" {
  type        = string
  description = "GitHub Environment a job must run in to assume the CI role. Its deployment branches are restricted to main in the repository settings."
  default     = "production"

  validation {
    condition     = can(regex("^[A-Za-z0-9._-]+$", var.github_environment))
    error_message = "github_environment must contain only letters, digits, dots, underscores and hyphens."
  }
}

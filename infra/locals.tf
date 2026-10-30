locals {
  # Resource name prefix: ${local.name_prefix}-<role>.
  # Decision D-04: the environment is NOT part of the name. Different
  # environments are different stacks, and different stacks already get their
  # own prefix through `var.project_name`. Labels are for data, not for
  # resource identity.
  name_prefix = var.project_name

  # Tags applied by the provider's `default_tags`, so they reach EVERY resource
  # created in any layer without anyone repeating them.
  #
  # The `Name` tag is NOT here on purpose: `default_tags` does not interpolate,
  # and a resource name depends on its type (`${local.name_prefix}-vpc`,
  # `${local.name_prefix}-ec2`, ...). Whoever creates the resource declares its
  # own `Name` in their file — once, without repeating the three below.
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

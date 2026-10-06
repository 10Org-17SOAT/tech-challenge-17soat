locals {
  # Prefixo de nome de recurso: ${local.name_prefix}-<papel>.
  # Decisão D-04: o ambiente NÃO entra no nome. Ambientes diferentes são
  # stacks diferentes, e stacks diferentes já têm prefixo próprio via
  # `var.project_name`. Rótulo é para dado, não é para identidade de recurso.
  name_prefix = var.project_name

  # Tags aplicadas pelo `default_tags` do provider, logo valem para TODO
  # recurso criado em 3.2 e 3.3 sem que ninguém precise repeti-las.
  #
  # A tag `Name` NÃO está aqui de propósito: `default_tags` não interpola, e o
  # nome de um recurso depende do tipo dele (`${local.name_prefix}-vpc`,
  # `${local.name_prefix}-ec2`, ...). Quem cria o recurso declara a própria
  # `Name` no seu arquivo — uma vez, sem duplicar as três de cima.
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

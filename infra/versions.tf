# ---------------------------------------------------------------------------
# Contrato de versões da fundação de infraestrutura.
# ---------------------------------------------------------------------------

terraform {
  # 1.9.0 é o piso porque é a primeira versão cujas regras de `validation` podem
  # referenciar outras variáveis — o que `variables.tf` usa para garantir que o
  # CIDR da subnet pública caiba dentro do CIDR da VPC.
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

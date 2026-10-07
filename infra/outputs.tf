# ---------------------------------------------------------------------------
# Contrato de saída para ferramentas externas ao Terraform.
# Sem resource e sem data source, nenhum output pode vazar valor sensível.
# ---------------------------------------------------------------------------
#
# Estes outputs existem para o CI, para o time consumir
# `terraform output` sem ler arquivos. Eles NÃO são o canal de comunicação
# leem o estado direto, por `var.` e `local.`.


output "project_name" {
  description = "Prefixo de nome de recurso em uso, derivado de var.project_name. Deve-se usar este valor em vez de repetir o literal."
  value       = var.project_name
}

output "environment" {
  description = "Ambiente lógico em uso. Usado como tag, não como parte do nome de recurso."
  value       = var.environment
}

output "aws_region" {
  description = "Região AWS em uso. Usado para montar ARNs e para decidir o endpoint da API."
  value       = var.aws_region
}

output "k8s_namespace" {
  description = "Namespace Kubernetes reservado para a aplicação. Este output apenas declara a intenção."
  value       = var.k8s_namespace
}

output "vpc_cidr" {
  description = "CIDR da VPC reservado para a camada de rede. Declarado aqui para que não precise de um default próprio."
  value       = var.vpc_cidr
}

output "public_subnet_cidr" {
  description = "CIDR da subnet pública reservado para a camada de rede, onde fica a VM de execução."
  value       = var.public_subnet_cidr
}

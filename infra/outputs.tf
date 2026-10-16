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

# --- Cluster K3s -------------------------------------------------------------

output "k3s_public_ip" {
  description = "IP fixo (EIP) da VM do K3s."
  value       = aws_eip.k3s.public_ip
}

output "api_url" {
  description = "URL pública da aplicação, servida pelo NodePort 30080. Responde só depois que os manifests de k8s/base forem aplicados."
  value       = "http://${aws_eip.k3s.public_ip}:30080"
}

output "ssh_command" {
  description = "Comando para entrar na VM. Exige que ssh_public_key tenha sido informada."
  value       = "ssh ubuntu@${aws_eip.k3s.public_ip}"
}

output "kubeconfig_command" {
  description = "Copia o kubeconfig do K3s para ./kubeconfig trocando o endereço interno pelo IP público. Rodar alguns minutos após o apply (o K3s instala no primeiro boot)."
  value       = "ssh ubuntu@${aws_eip.k3s.public_ip} sudo cat /etc/rancher/k3s/k3s.yaml | sed 's/127.0.0.1/${aws_eip.k3s.public_ip}/' > kubeconfig"
}

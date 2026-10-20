# ---------------------------------------------------------------------------
# Security group da VM do K3s.
#
# As três portas de entrada ficam abertas para 0.0.0.0/0 por decisão
# deliberada: cada operador (inclusive avaliadores) roda o próprio apply, e
# exigir o IP de quem acessa quebraria toda vez que o IP residencial mudasse.
# O risco é aceito porque nenhuma porta dá acesso sem credencial:
#   - 22    → a AMI Ubuntu aceita só chave SSH, login por senha vem desligado;
#   - 6443  → a API do K3s exige o certificado de cliente do kubeconfig;
#   - 30080 → é a API pública da aplicação, feita para ser acessada.
# Qualquer outra porta do K3s (ex.: 10250 do kubelet) continua fechada.
# ---------------------------------------------------------------------------

locals {
  ingress_ports = {
    ssh     = 22    # acesso administrativo à VM
    k3s_api = 6443  # kubectl → API server do K3s
    app_api = 30080 # NodePort do Service `api` (k8s/base/api/service.yaml)
  }
}

resource "aws_security_group" "k3s" {
  name        = "${local.name_prefix}-k3s-sg"
  description = "K3s VM ingress: SSH, Kubernetes API and application NodePort"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-k3s-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "k3s" {
  for_each = local.ingress_ports

  security_group_id = aws_security_group.k3s.id
  description       = each.key
  cidr_ipv4         = local.anywhere_cidr
  from_port         = each.value
  to_port           = each.value
  ip_protocol       = "tcp"

  tags = {
    Name = "${local.name_prefix}-${replace(each.key, "_", "-")}"
  }
}

# A VM precisa de saída livre para baixar o K3s e as imagens de container.
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.k3s.id
  cidr_ipv4         = local.anywhere_cidr
  ip_protocol       = "-1"

  tags = {
    Name = "${local.name_prefix}-egress-all"
  }
}

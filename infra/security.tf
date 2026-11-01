# ---------------------------------------------------------------------------
# Security group of the K3s VM.
#
# The three ingress ports are open to 0.0.0.0/0 on purpose: every operator
# (evaluators included) runs their own apply, and requiring the caller's IP
# would break every time a home IP changed.
# The risk is accepted because no port grants access without a credential:
#   - 22    → the Ubuntu AMI only accepts SSH keys, password login is off;
#   - 6443  → the K3s API requires the kubeconfig client certificate;
#   - 30080 → the public application API, meant to be reached.
# Every other K3s port (e.g. kubelet's 10250) stays closed.
# ---------------------------------------------------------------------------

locals {
  ingress_ports = {
    ssh     = 22    # administrative access to the VM
    k3s_api = 6443  # kubectl → K3s API server
    app_api = 30080 # NodePort of the `api` Service (k8s/base/api/service.yaml)
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

# The VM needs unrestricted egress to download K3s and container images.
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.k3s.id
  cidr_ipv4         = local.anywhere_cidr
  ip_protocol       = "-1"

  tags = {
    Name = "${local.name_prefix}-egress-all"
  }
}

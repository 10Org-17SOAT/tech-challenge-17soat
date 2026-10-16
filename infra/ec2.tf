# AMI Ubuntu 24.04 LTS ARM64 mais recente da Canonical (decisão D-10).
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = [var.ami_owner]

  filter {
    name   = "name"
    values = [var.ami_name_filter]
  }
}

variable "ssh_public_key" {
  type        = string
  description = "Conteúdo da chave pública SSH (ex.: o arquivo ~/.ssh/id_ed25519.pub) autorizada a entrar na VM como `ubuntu`. É por SSH que se copia o kubeconfig. null cria a VM sem chave: o cluster sobe, mas ninguém consegue entrar nela."
  default     = null

  validation {
    condition     = var.ssh_public_key == null || can(regex("^(ssh-(ed25519|rsa)|ecdsa-sha2-nistp[0-9]+) ", var.ssh_public_key))
    error_message = "ssh_public_key deve ser null ou o conteúdo de uma chave pública OpenSSH, ex.: \"ssh-ed25519 AAAA... voce@maquina\"."
  }
}

resource "aws_key_pair" "admin" {
  count = var.ssh_public_key == null ? 0 : 1

  key_name   = "${local.name_prefix}-admin"
  public_key = var.ssh_public_key
}

# IP fixo da VM. Criado ANTES da instância para que o IP já seja conhecido no
# user-data (vai no certificado do K3s via --tls-san) e para que o kubeconfig
# continue válido se a VM for parada e ligada de novo. Custo igual ao do IP
# público automático enquanto estiver associado.
resource "aws_eip" "k3s" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-k3s-eip"
  }
}

resource "aws_instance" "k3s" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.k3s.id]
  key_name               = var.ssh_public_key == null ? null : aws_key_pair.admin[0].key_name

  user_data = templatefile("${path.module}/user-data.sh", {
    k3s_version = var.k3s_version == null ? "" : var.k3s_version
    public_ip   = aws_eip.k3s.public_ip
  })
  # Mudar o script só tem efeito num boot novo: recria a VM em vez de deixar
  # o user-data alterado sem nunca rodar.
  user_data_replace_on_change = true

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  # IMDSv2 obrigatório: bloqueia o roubo de credencial via SSRF no IMDSv1.
  metadata_options {
    http_tokens = "required"
  }

  # O user-data baixa o K3s no primeiro boot; sem a rota para a internet
  # pronta, o download falha e o cluster nunca sobe.
  depends_on = [aws_route_table_association.public]

  tags = {
    Name = "${local.name_prefix}-k3s"
  }
}

resource "aws_eip_association" "k3s" {
  instance_id   = aws_instance.k3s.id
  allocation_id = aws_eip.k3s.id
}

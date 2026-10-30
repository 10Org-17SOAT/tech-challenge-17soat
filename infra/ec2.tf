# Latest Ubuntu 24.04 LTS ARM64 AMI from Canonical (decision D-10).
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
  description = "SSH public key content (e.g. the ~/.ssh/id_ed25519.pub file) allowed to log into the VM as `ubuntu`. The kubeconfig is copied over SSH. Required: the VM has no other way in, and changing the key later recreates the instance."

  validation {
    condition     = can(regex("^(ssh-(ed25519|rsa)|ecdsa-sha2-nistp[0-9]+) ", var.ssh_public_key))
    error_message = "ssh_public_key must be the content of an OpenSSH public key, e.g. \"ssh-ed25519 AAAA... you@machine\"."
  }
}

resource "aws_key_pair" "admin" {
  key_name   = "${local.name_prefix}-admin"
  public_key = var.ssh_public_key
}

# Static IP of the VM. Created BEFORE the instance so the IP is already known
# in the user-data (it goes into the K3s certificate via --tls-san) and so the
# kubeconfig stays valid if the VM is stopped and started again. Costs the same
# as the automatic public IP while it is associated.
resource "aws_eip" "k3s" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-k3s-eip"
  }
}

# Network interface created outside the instance so it gets the EIP before
# boot. If the EIP were associated with an already running instance, the IP
# swap would cut the K3s download in the middle of the user-data, which never
# runs again.
resource "aws_network_interface" "k3s" {
  subnet_id       = aws_subnet.public.id
  security_groups = [aws_security_group.k3s.id]

  tags = {
    Name = "${local.name_prefix}-k3s-eni"
  }
}

resource "aws_eip_association" "k3s" {
  network_interface_id = aws_network_interface.k3s.id
  allocation_id        = aws_eip.k3s.id
}

resource "aws_instance" "k3s" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.admin.key_name

  primary_network_interface {
    network_interface_id = aws_network_interface.k3s.id
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    k3s_version = var.k3s_version == null ? "" : var.k3s_version
    public_ip   = aws_eip.k3s.public_ip
  })
  # A script change only takes effect on a fresh boot: recreate the VM instead
  # of leaving changed user-data that never runs.
  user_data_replace_on_change = true

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  # IMDSv2 required: blocks credential theft through SSRF on IMDSv1.
  metadata_options {
    http_tokens = "required"
  }

  # The user-data downloads K3s on first boot; without the internet route in
  # place and the EIP already on the interface, the download fails and the
  # cluster never comes up.
  depends_on = [aws_route_table_association.public, aws_eip_association.k3s]

  # The data source always picks the latest AMI: without this, any apply after
  # Canonical publishes a new image would recreate the VM (empty cluster, new
  # certificates, invalid kubeconfig). To update the image on purpose:
  # terraform apply -replace=aws_instance.k3s
  lifecycle {
    ignore_changes = [ami]
  }

  tags = {
    Name = "${local.name_prefix}-k3s"
  }
}

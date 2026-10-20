resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# Nem toda AZ oferece todo tipo de instância (em us-east-1, use1-az3 não tem
# t4g). Se a AZ da subnet não tiver o tipo, a VM falha com Unsupported e só
# recriando a subnet para sair disso.
data "aws_ec2_instance_type_offerings" "k3s" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
}

# AZs comuns da região: sem isso Local Zones habilitadas na conta entrariam
# como candidatas.
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Ordenadas para a escolha ser a mesma a cada plan.
  instance_type_azs = sort(setintersection(
    data.aws_ec2_instance_type_offerings.k3s.locations,
    data.aws_availability_zones.available.names,
  ))
  # Ternário em vez de coalesce: coalesce falha com tudo null, e aí o erro
  # sairia genérico em vez da mensagem da precondition da subnet.
  availability_zone = var.availability_zone != null ? var.availability_zone : try(local.instance_type_azs[0], null)
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidr
  availability_zone = local.availability_zone
  # Sem isso a EC2 nasce só com IP privado e fica inalcançável de fora.
  map_public_ip_on_launch = true

  lifecycle {
    precondition {
      condition     = contains(local.instance_type_azs, coalesce(local.availability_zone, "-"))
      error_message = "Nenhuma AZ disponível oferece ${var.instance_type}, ou a availability_zone informada não oferece. AZs com o tipo: ${join(", ", local.instance_type_azs)}."
    }

    # Uma AZ que passe a oferecer o tipo pode mudar a escolha automática; sem
    # isto a subnet (e a VM junto) seria recriada. Para trocar de AZ de
    # propósito: terraform apply -replace=aws_subnet.public
    ignore_changes = [availability_zone]
  }

  tags = {
    Name = "${local.name_prefix}-public-subnet"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

# Rota padrão pela internet gateway: é o que torna a subnet pública.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

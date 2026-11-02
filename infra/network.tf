resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# Not every AZ offers every instance type (in us-east-1, use1-az3 has no t4g).
# If the subnet's AZ lacks the type, the VM fails with Unsupported and the only
# way out is recreating the subnet.
data "aws_ec2_instance_type_offerings" "k3s" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [var.instance_type]
  }
}

# Regular AZs of the region: without this, Local Zones enabled on the account
# would become candidates.
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Sorted so the choice is the same on every plan.
  instance_type_azs = sort(setintersection(
    data.aws_ec2_instance_type_offerings.k3s.locations,
    data.aws_availability_zones.available.names,
  ))
  # Ternary instead of coalesce: coalesce fails when everything is null, and
  # the error would be generic instead of the subnet precondition message.
  availability_zone = var.availability_zone != null ? var.availability_zone : try(local.instance_type_azs[0], null)
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidr
  availability_zone = local.availability_zone
  # Without this the EC2 instance only gets a private IP and is unreachable
  # from outside.
  map_public_ip_on_launch = true

  lifecycle {
    precondition {
      condition     = contains(local.instance_type_azs, coalesce(local.availability_zone, "-"))
      error_message = "No available AZ offers ${var.instance_type}, or the given availability_zone does not. AZs with the type: ${join(", ", local.instance_type_azs)}."
    }

    # An AZ that starts offering the type may change the automatic choice;
    # without this the subnet (and the VM with it) would be recreated. To move
    # AZs on purpose: terraform apply -replace=aws_subnet.public
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

# Default route through the internet gateway: this is what makes the subnet
# public.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = local.anywhere_cidr
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

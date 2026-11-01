# ---------------------------------------------------------------------------
# Database layer — managed PostgreSQL (RDS), outside the cluster.
#
# Depends on the network layer (#119) through exactly two names:
#   aws_vpc.main                 → where the private subnets are created
#   aws_security_group.k3s       → the only source allowed on the DB port
#
# The database has no route to the internet, is not public and only accepts
# TLS connections (rds.force_ssl). The application reaches it with
# DB_SSL=true plus the AWS CA mounted from a ConfigMap — see the README,
# "Banco de dados" section.
#
# Nothing here talks to the cluster: the password reaches the Secret through
# `kubectl`, and the endpoint through k8s/overlays/aws/db.env. That keeps this
# layer clear of open item C-01 (Terraform reaching the K3s API).
# ---------------------------------------------------------------------------

# --- Variables ----------------------------------------------------------------

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDRs of the two private database subnets, one per AZ. RDS requires a subnet group spanning at least two AZs, even with Multi-AZ disabled."
  default     = ["10.0.11.0/24", "10.0.12.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) == 2 && length(distinct(var.private_subnet_cidrs)) == 2
    error_message = "private_subnet_cidrs must contain exactly two distinct CIDRs, one per AZ."
  }

  validation {
    condition     = alltrue([for cidr in var.private_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Each private_subnet_cidrs entry must be a valid IPv4 CIDR, e.g. 10.0.11.0/24."
  }

  # Containment: the subnet must be more specific than the VPC and, reduced to
  # the VPC mask, land on the same network address. `cidrhost` normalizes the
  # address by the mask, so there is no need to enumerate candidate subnets.
  validation {
    condition = alltrue([
      for cidr in var.private_subnet_cidrs : (
        can(cidrnetmask(cidr)) &&
        tonumber(split("/", cidr)[1]) > tonumber(split("/", var.vpc_cidr)[1]) &&
        cidrhost("${split("/", cidr)[0]}/${split("/", var.vpc_cidr)[1]}", 0) == cidrhost(var.vpc_cidr, 0)
      )
    ])
    error_message = "Each private_subnet_cidrs entry must be contained in vpc_cidr."
  }

  validation {
    condition     = !contains(var.private_subnet_cidrs, var.public_subnet_cidr)
    error_message = "private_subnet_cidrs must not reuse public_subnet_cidr."
  }
}

variable "db_engine_version" {
  type        = string
  description = "PostgreSQL major version. Matches the postgres:16-alpine image used by docker-compose and the local overlay; AWS applies minor versions in the maintenance window."
  default     = "16"

  validation {
    condition     = can(regex("^[0-9]{2}$", var.db_engine_version))
    error_message = "db_engine_version must be the major version only, e.g. 16."
  }
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class. db.t4g.micro is the smallest ARM (Graviton) class, consistent with the t4g choice of the compute layer."
  default     = "db.t4g.micro"

  validation {
    condition     = startswith(var.db_instance_class, "db.")
    error_message = "db_instance_class must be an RDS class, e.g. db.t4g.micro."
  }
}

variable "db_allocated_storage" {
  type        = number
  description = "Storage in GiB (gp3). 20 is the gp3 minimum on RDS and the free tier ceiling."
  default     = 20

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 100
    error_message = "db_allocated_storage must be between 20 and 100 GiB."
  }
}

variable "db_name" {
  type        = string
  description = "Database created with the instance. Same value as DB_NAME in the ConfigMap and in docker-compose."
  default     = "tech_challenge"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{0,62}$", var.db_name))
    error_message = "db_name must start with a letter and contain only [a-z0-9_], up to 63 characters."
  }
}

variable "db_username" {
  type        = string
  description = "Master username. Same value as DB_USER in the local overlay Secret; it is not a secret, the password is."
  default     = "postgres"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{0,62}$", var.db_username))
    error_message = "db_username must start with a letter and contain only [a-z0-9_], up to 63 characters."
  }
}

variable "db_backup_retention_days" {
  type        = number
  description = "Days of automated backups. Resolves C-08; backup storage is free up to the database size."
  default     = 7

  validation {
    condition     = var.db_backup_retention_days >= 1 && var.db_backup_retention_days <= 35
    error_message = "db_backup_retention_days must be between 1 and 35."
  }
}

variable "db_deletion_protection" {
  type        = bool
  description = "Prevents the instance from being destroyed. To run `terraform destroy`: set it to false, run `apply`, then `destroy` — a final snapshot is kept."
  default     = true
}

variable "db_apply_immediately" {
  type        = bool
  description = "Applies instance changes right away instead of in the maintenance window. May restart the database."
  default     = false
}

# --- Database network -----------------------------------------------------------

# data.aws_availability_zones.available comes from network.tf.
resource "aws_subnet" "db" {
  count = length(var.private_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false

  tags = {
    Name = "${local.name_prefix}-db-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# A dedicated table holding only the VPC's implicit local route. Without it the
# subnets would inherit the main table, which the network layer may point at
# the internet gateway.
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-db"
  }
}

resource "aws_route_table_association" "db" {
  count = length(aws_subnet.db)

  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = aws_subnet.db[*].id

  tags = {
    Name = "${local.name_prefix}-db"
  }
}

# No egress rule: the database only answers, it never opens a connection. The
# provider removes the allow-all egress rule AWS creates by default.
resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db"
  description = "PostgreSQL: accepts only the K3s node"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-db"
  }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_k3s" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.k3s.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from the K3s node"

  tags = {
    Name = "${local.name_prefix}-db-from-k3s-node"
  }
}

# --- Instance -------------------------------------------------------------------

# Explicit rather than the AWS default, so the TLS requirement lives in code:
# without DB_SSL=true the application is refused by the migration on boot.
resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-postgres${var.db_engine_version}"
  family = "postgres${var.db_engine_version}"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name = "${local.name_prefix}-postgres${var.db_engine_version}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Alphanumeric only: 40 characters give ~238 bits and avoid both the
# characters RDS forbids (/ @ " space) and any escaping trouble in shell or
# YAML. It lives in the Terraform state — hence apply requires the encrypted S3
# backend (README section 7 and the D-03 exception).
resource "random_password" "db" {
  length  = 40
  special = false
}

# Stable final snapshot suffix: `timestamp()` would change on every plan.
resource "random_id" "db_final_snapshot" {
  byte_length = 4
}

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine                     = "postgres"
  engine_version             = var.db_engine_version
  auto_minor_version_upgrade = true
  instance_class             = var.db_instance_class
  parameter_group_name       = aws_db_parameter_group.main.name

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false
  ca_cert_identifier     = "rds-ca-rsa2048-g1"

  backup_retention_period   = var.db_backup_retention_days
  copy_tags_to_snapshot     = true
  deletion_protection       = var.db_deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-db-final-${random_id.db_final_snapshot.hex}"
  apply_immediately         = var.db_apply_immediately

  performance_insights_enabled = false
  monitoring_interval          = 0

  tags = {
    Name = "${local.name_prefix}-db"
  }
}

# --- Cluster integration ----------------------------------------------------------

# Non-secret values only. The k8s/overlays/aws overlay merges this file into
# app-config; without it `kubectl apply -k` fails, which keeps the AWS overlay
# from being deployed before the database exists. Ignored by Git.
resource "local_file" "db_env" {
  filename        = "${path.module}/../k8s/overlays/aws/db.env"
  file_permission = "0644"
  content         = <<-EOT
    DB_HOST=${aws_db_instance.main.address}
    DB_PORT=${aws_db_instance.main.port}
    DB_NAME=${aws_db_instance.main.db_name}
  EOT
}

# ---------------------------------------------------------------------------
# TEMPORARY STUB — DELETE BEFORE MERGING.
#
# Exists only so the database layer can be validated and planned before the
# network layer (#119) lands. The names are the ones agreed with #119:
#   aws_vpc.main                 → VPC
#   aws_security_group.k3s_node  → K3s node security group
# When #119 merges, delete this file: the names match and database.tf does not
# change. If it is left behind, Terraform fails with "Duplicate resource" — on
# purpose.
#
# Never run `apply` with this file present.
# ---------------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_security_group" "k3s_node" {
  name   = "${local.name_prefix}-k3s-node"
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-k3s-node"
  }
}

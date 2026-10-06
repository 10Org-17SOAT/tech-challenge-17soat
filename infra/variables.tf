# ---------------------------------------------------------------------------
# Variáveis de entrada compartilhadas
# Regra: cada nova variável pertence à task que a usa, não a este arquivo.
# ---------------------------------------------------------------------------
#
# REGRAS GERAIS
#
# 1. Toda variável tem default. É o que garante `terraform plan -input=false`
#    nunca pedir nada ao operador.
# 2. Nenhuma variável `sensitive`. Nenhum segredo entra por aqui: o estado do
#    Terraform guarda valores em PLAINTEXT mesmo quando o output é sensível.
#    Segredo pertence a k8s Secret.
# 3. `null` significa "não informado ainda": o provider usa o padrão dele ou a
#    task dona decide. Nunca use `null` para burlar uma validação.
# 4. Todo `validation` cita a regra e a consequence em português.
# 5. Nenhum literal de região, CIDR, nome ou tag fora deste arquivo.

# --- Integração AWS -------------------------------------------------------

variable "aws_region" {
  type        = string
  description = "Região AWS onde a infraestrutura será criada. Região é escolha de custo e latência, não um detalhe de boilerplate: us-east-1 é padrão apenas porque foi o default de revisão, não porque seja a melhor escolha para este projeto."
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region deve estar no formato de região AWS, ex.: sa-east-1."
  }
}

variable "allowed_account_ids" {
  type        = list(string)
  description = "Lista de IDs de conta AWS (12 dígitos) em que este estado pode operar. Guard de segurança: impede que um apply acerte a conta errada. Lista vazia = sem restrição; cada valor deve ser preenchido explicitamente."
  default     = []

  # A lista vazia é um estado VÁLIDO e é o default: significa guard desativado.
  # Não existe validação de "lista não vazia" aqui de propósito — ela rejeitaria
  # o próprio default e quebraria `terraform plan` na conta de quem ainda não
  # preencheu o valor. `providers.tf` traduz lista vazia em `null` para o
  # provider (decisão D-12).
  validation {
    condition     = alltrue([for id in var.allowed_account_ids : can(regex("^[0-9]{12}$", id))])
    error_message = "Cada entrada de allowed_account_ids deve ser um ID de conta AWS com exatamente 12 dígitos."
  }
}

# --- Identidade e ambiente -----------------------------------------------

variable "project_name" {
  type        = string
  description = "Nome do projeto, usado como prefixo de nome de recurso e como valor da tag Project. Não confundir com o nome do repositório nem com o do banco."
  default     = "tech-challenge-soat"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,28}[a-z0-9]$", var.project_name))
    error_message = "project_name deve começar e terminar com letra minúscula ou dígito, conter apenas [a-z0-9-], e ter entre 3 e 30 caracteres."
  }
}

variable "environment" {
  type        = string
  description = "Ambiente lógico, usado apenas como tag (decisão D-04). Stacks de ambientes diferentes se distinguem por project_name, não por esta variável."
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "environment deve ser development, staging ou production."
  }
}

# --- Kubernetes --------------------------------

variable "k8s_namespace" {
  type        = string
  description = "Namespace Kubernetes onde os workloads da aplicação serão instalados. Namespace é um dado de configuração do cluster, não um recurso do Terraform."
  default     = "tech-challenge-soat"

  validation {
    condition     = can(regex("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", var.k8s_namespace)) && length(var.k8s_namespace) <= 63
    error_message = "k8s_namespace deve ser um label DNS-1123 válido com até 63 caracteres: apenas [a-z0-9-], começando e terminando com [a-z0-9]."
  }
}

# --- Rede --------------------------------------

variable "vpc_cidr" {
  type        = string
  description = "Bloco CIDR da VPC."
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr deve ser um CIDR IPv4 válido, ex.: 10.0.0.0/16."
  }
}

variable "public_subnet_cidr" {
  type        = string
  description = "Bloco CIDR da subnet pública que hospeda o bastion/NAT. Deve estar contido em vpc_cidr — a validação abaixo garante isso."
  default     = "10.0.1.0/24"

  validation {
    condition = (
      can(cidrnetmask(var.public_subnet_cidr)) &&
      can(cidrnetmask(var.vpc_cidr)) &&
      tonumber(split("/", var.public_subnet_cidr)[1]) > tonumber(split("/", var.vpc_cidr)[1]) &&
      # Limita a enumeração da validação de contenção abaixo a 65536 entradas
      # (newbits <= 16). Protege o `plan` de uma combinação absurda, tipo
      # vpc_cidr em /8 com public_subnet_cidr em /32.
      tonumber(split("/", var.public_subnet_cidr)[1]) - tonumber(split("/", var.vpc_cidr)[1]) <= 16
    )
    error_message = "public_subnet_cidr deve ser um CIDR IPv4 válido, com máscara mais específica que a de vpc_cidr e no máximo 16 bits mais específica (ex.: /16 -> /32)."
  }

  # Esta validação referencia outra variável, o que exige Terraform >= 1.9.0 —
  # razão de `required_version` em versions.tf.
  #
  # Terraform não tem função `cidrcontains`, e `within()` não faz containment de
  # faixa de endereços. A forma correta aqui é enumerar as sub-redes do tamanho
  # certo que cabem na VPC e exigir que a subnet seja uma delas.
  #
  # Não substitua por `cidrsubnet(vpc, newbits, 0) == subnet`: isso só verifica
  # que a subnet é a PRIMEIRA do tamanho, e rejeitaria 10.0.1.0/24 numa VPC
  # 10.0.0.0/16, que é o par default e é perfeitamente válido.
  validation {
    condition = contains(
      [
        for i in range(pow(
          2,
          tonumber(split("/", var.public_subnet_cidr)[1]) - tonumber(split("/", var.vpc_cidr)[1])
          )) : cidrsubnet(
          var.vpc_cidr,
          tonumber(split("/", var.public_subnet_cidr)[1]) - tonumber(split("/", var.vpc_cidr)[1]),
          i
        )
      ],
      var.public_subnet_cidr
    )
    error_message = "public_subnet_cidr deve estar contido em vpc_cidr. Com os defaults, o único valor aceito é 10.0.1.0/24. Ajuste os dois em conjunto."
  }
}

variable "availability_zone" {
  type        = string
  description = "Availability Zone da subnet pública e da instância. null deixa o provider escolher, o que é aceitável para uma AZ por região mas reduz a previsibilidade do custo e da resiliência."
  default     = null

  validation {
    condition     = var.availability_zone == null || can(regex("^[a-z]{2}-[a-z]+-[1-9][a-z]$", var.availability_zone))
    error_message = "availability_zone deve ser null ou uma AZ válida, ex.: sa-east-1a."
  }
}

# --- Cálculo ------------------------------------

variable "instance_type" {
  type        = string
  description = "Tipo de instância da VM. t4g é ARM (Graviton) e o ambiente de build também precisa ser ARM para a imagem não rodar em emulação."
  default     = "t4g.medium"

  validation {
    condition     = length(var.instance_type) > 0
    error_message = "instance_type não pode ser vazio."
  }
}

variable "root_volume_size" {
  type        = number
  description = "Tamanho em GiB do volume raiz da VM. O mínimo cobre a imagem da distro mais o K3s e a aplicação; 20 GiB é folgado para uma única instância."
  default     = 20

  validation {
    condition     = var.root_volume_size >= 8 && var.root_volume_size <= 1024
    error_message = "root_volume_size deve estar entre 8 e 1024 GiB."
  }
}

variable "ami_owner" {
  type        = string
  description = "ID do owner da AMI base, para que o filtro de nome nunca resolva para a imagem de terceiros. Ubuntu Canonical."
  default     = "099720109477"

  validation {
    condition     = can(regex("^[0-9]{12}$", var.ami_owner))
    error_message = "ami_owner deve ser um ID numérico de conta AWS com exatamente 12 dígitos."
  }
}

variable "ami_name_filter" {
  type        = string
  description = "Filtro do nome da AMI base. O padrão busca Ubuntu 24.04 LTS (Noble) na variante ARM64 (gp3), coerente com instance_type t4g.*."
  default     = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"

  validation {
    condition     = length(var.ami_name_filter) > 0
    error_message = "ami_name_filter não pode ser vazio: sem filtro a busca de AMI fica indefinida entre várias imagens."
  }
}

# --- Operação -----------------------------------

variable "k3s_version" {
  type        = string
  description = "Versão do K3s a ser instalada, no formato exato do instalador, ex.: v1.31.5+k3s1. null deixa o install script resolver, o que torna a implantação não reprodutível."
  default     = null

  validation {
    condition     = var.k3s_version == null || can(regex("^v[0-9]+\\.[0-9]+\\.[0-9]+\\+k3s1$", var.k3s_version))
    error_message = "k3s_version deve ser null ou uma versão no formato exato do instalador, ex.: v1.31.5+k3s1."
  }
}

variable "domain" {
  type        = string
  description = "Domínio Fully Qualified da API, para certificado ACME e DNS público. null enquanto não houver domínio: o acesso happens por IP e porta."
  default     = null

  validation {
    condition     = var.domain == null || can(regex("^([a-z0-9]([-a-z0-9]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain))
    error_message = "domain deve ser null ou um FQDN válido em minúsculas, ex.: api.exemplo.com.br."
  }
}

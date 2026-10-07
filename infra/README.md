# Infraestrutura como Código

Infraestrutura do projeto em AWS, gerenciada com Terraform. Este diretório é a
**fundação** da stack: define as convenções, os limites de versão, o contrato de
configuração e a política de segredos que o resto da infraestrutura reutiliza.

---

## 1. Decisões de arquitetura

| ID | Decisão | Consequência prática |
|---|---|---|
| D-01 | AWS como provedor de nuvem | Uma dependência de AWS em toda a stack. Não há caminho para outro provedor sem reescrever a fundação. |
| D-02 | Banco de dados in-cluster (StatefulSet do Postgres) | Não há `aws_db_instance`, `aws_db_subnet_group` nem leitura de porta 5432 pela internet. Menos superfície, menos custo, menor disponibilidade. |
| D-03 | Segredos em k8s Secret | Nenhuma variável `sensitive` no Terraform e nenhum segredo em arquivo versionado. O estado do Terraform guarda valores em **plaintext** mesmo quando o output é sensível. |
| D-04 | `environment` é apenas tag; `project_name` é o prefixo de nome | Ambientes diferentes são stacks diferentes. Stack = prefixo próprio, não ambiente no nome do recurso. |
| D-05 | Sem Secret Manager, sem Parameter Store | Segredo nasce e morre com o cluster (decisão D-03). |
| D-06 | Backend S3 apenas documentado, não configurado | `terraform init` usa backend local implícito. Ver seção 7. |
| D-07 | Estrutura plana, um root module, um `versions.tf` | Um único lugar para os limites de versão. Ver seções 3 e 4. |
| D-08 | Credencial pela cadeia padrão do provider AWS | Nenhuma credencial em código, em `.tf` ou em `.tfvars`. |
| D-09 | `public_subnet_cidr` deve estar contido em `vpc_cidr`, validado | Com os defaults, o único valor aceito é `10.0.1.0/24`. Mudar um exige mudar o outro. |
| D-10 | AMI Ubuntu 24.04 LTS ARM64, owner fixo `099720109477` | Imagem de sistema, reconstruível, e sem risco de o filtro resolver para AMI de terceiro. |
| D-11 | Terraform é executado por container Docker | Nenhuma instalação no host. Ver seção 12. |
| D-12 | `allowed_account_ids` usa ternário com `null` | Preserva o guard com lista preenchida e funciona com o default vazio. |

---

## 2. Organização e responsabilidade por arquivo

### Fundação — este diretório

| Componente | Arquivo | Estado |
|---|---|---|
| Versões de Terraform e providers | `versions.tf` | Fechado |
| Provider AWS | `providers.tf` | Fechado |
| Nomes e tags | `locals.tf` | Fechado |
| Variáveis compartilhadas | `variables.tf` | Fechado |
| Outputs de contrato | `outputs.tf` | Fechado; camadas seguintes acrescentam os seus |
| Exemplo de valores | `terraform.tfvars.example` | — |
| Higiene de artefatos | `.gitignore` | — |
| Estratégia e contratos | `README.md` | — |

### Camada de rede e computação

| Componente | Arquivo |
|---|---|
| VPC, subnets, rotas, IGW, NAT, Security Groups | `network.tf`, `security.tf` |
| IAM (EC2 role / instance profile) | `iam.tf` |
| Repositório ECR | `ecr.tf` |
| Instância EC2 | `ec2.tf` |
| Provisionamento da VM | `user-data.sh` |

### Camada de cluster e dados

| Componente | Arquivo |
|---|---|
| Cluster K3s | `kubernetes.tf` |
| Segredos da aplicação | `secrets.tf` |
| Volume persistente do banco | `storage.tf` |

As camadas são aplicadas em ordem: **fundação → rede e computação → cluster e
dados**. Ver a pendência **C-02** na seção 9 para o porquê de não ser um passo
único.

---

## 3. Nomes de arquivo reservados

Estes nomes são reservados. Nenhum arquivo pode ser criado com o mesmo nome e um
outro propósito:

```
versions.tf   providers.tf   locals.tf    variables.tf   outputs.tf
network.tf    security.tf    iam.tf       ecr.tf         ec2.tf
user-data.sh  kubernetes.tf  secrets.tf   storage.tf     .gitignore
README.md     .terraform.lock.hcl
terraform.tfvars
```

---

## 4. Exceções permitidas a `versions.tf`

`versions.tf` é **fechado**, com exceção documentada: quando uma camada precisar de
um provider que a fundação não usa, ela **acrescenta uma linha** ao bloco
`required_providers`.

| Camada | Provider | Quando |
|---|---|---|
| Rede e computação | `hashicorp/helm` | Instalar/consultar charts, se o caminho escolhido não for o script de instalação |
| Rede e computação | `hashicorp/time` | Se algum recurso exigir espera explícita entre operações |
| Cluster e dados | `hashicorp/kubernetes` | **Condicionada à leitura de C-03**: só entra se os objetos do cluster forem gerenciados por Terraform. Se a opção escolhida for `kubectl`, o provider não é necessário. |

Regras da exceção:

1. **Acrescentar**, nunca reordenar, remover ou reescrever o que já existe.
2. O provider entra em `required_providers` **e** o bloco `provider` correspondente
   vai no arquivo da camada dona. Nenhum segundo bloco `provider "aws"` neste
   arquivo.
3. A camada dona registra a exceção na seção 2 deste README.

---

## 5. O que não deve ser repetido

Esta seção existe para impedir duplicação. Se um destes itens aparecer em
`network.tf`, `ec2.tf`, `kubernetes.tf`, `secrets.tf` ou `storage.tf`, é um erro.

| Não repetir | Por quê |
|---|---|
| Bloco `terraform {}` ou `required_providers` | Contrato único em `versions.tf` |
| Bloco `provider "aws"` | Provider único em `providers.tf` |
| `${var.project_name}-` em nome de recurso | Usar `${local.name_prefix}-<papel>` |
| Tags `Project`, `Environment`, `ManagedBy` | Vêm de `default_tags` automaticamente |
| Literal de região | Usar `var.aws_region` |
| Literal de CIDR | Usar `var.vpc_cidr` / `var.public_subnet_cidr` |
| Literal de namespace | Usar `var.k8s_namespace` |
| `terraform_remote_state` | Root module único; todas as camadas compartilham o mesmo estado |
| Módulo Terraform | Decisão D-07; não há reutilização a extrair |

O único item que as camadas seguintes declaram por conta própria é a tag `Name`,
porque `default_tags` não interpola o nome do recurso.

---

## 6. Contrato de rede

A fundação **declara** os parâmetros de rede; a camada de rede **cria** os recursos.

| Item | Onde |
|---|---|
| `vpc_cidr`, `public_subnet_cidr`, `availability_zone` | `variables.tf` (parâmetro) |
| VPC, subnet pública, IGW, rota padrão, NAT gateway, Security Groups | `network.tf`, `security.tf` |

Regras de contenção já validadas por `variables.tf`:

- `public_subnet_cidr` precisa ter máscara mais específica que `vpc_cidr`;
- `public_subnet_cidr` precisa estar contido em `vpc_cidr`;
- com os defaults, o único par aceito é `10.0.0.0/16` + `10.0.1.0/24`.

Subnets privadas, NAT gateway e Elastic IP, se existirem, são responsabilidade da
camada de rede e **não** têm variável aqui — a fundação não as declara para não
congelar uma decisão que ainda não foi tomada.

---

## 7. Contrato de backend S3

**Estado local implícito.** Não existe `backend.tf` e não existe bloco `backend`.
`terraform init` usa backend local.

⚠️ **Ative o backend remoto ANTES do primeiro `terraform apply` que crie recursos.**

Configuração a ser criada no momento da primeira aplicação real:

```hcl
terraform {
  backend "s3" {
    bucket         = "<bucket-de-estado>"
    key            = "tech-challenge-soat/terraform.tfstate"
    region         = "<regiao-do-bucket>"
    encrypt        = true
    use_lockfile   = true
  }
}
```

Regras e o motivo de cada uma:

| Regra | Motivo |
|---|---|
| `encrypt = true` | O estado guarda valores de recurso em plaintext. |
| `use_lockfile = true` | Locking via DynamoDB está **deprecado**; o lock passa a ser um objeto S3. |
| `key` inclui o nome do projeto | Dois ambientes não podem compartilhar o mesmo objeto. |
| Bucket **fora** da VPC | O `init` roda antes de existir VPC, e o bucket não deve depender do que provisiona. |
| `dynamodb_table` **ausente** | Depreciado. |

Fluxo de migração do estado local para o S3:

```bash
terraform init -migrate-state -backend-config=backend.hcl
```

`backend.hcl` fica no `.gitignore` deste diretório.

---

## 8. Mapa `documento → realidade`

| Documento assume | Realidade deste repositório | Correção aplicada |
|---|---|---|
| Next.js | **NestJS** (`src/main.ts`, `nest-cli.json`) | Nenhum — Terraform é agnóstico. O provisionamento da aplicação segue o NestJS. |
| API em porta `6443` | `k8s/base/api/service.yaml` é **NodePort 30080** | Ver C-01 na seção 9. |
| Banco gerenciado (RDS) | `k8s/base/postgres/statefulset.yaml`, `postgres:16-alpine` | D-02: banco in-cluster. Nenhum `aws_db_*`. |
| `APP_BASE_URL` derivado do host | `k8s/base/configmap.yaml` fixa `http://localhost:30080` | Reescrito via k8s ConfigMap. |
| `MONGO_URI` | **Inexistente.** `docs/adr/0004` escolheu PostgreSQL + Drizzle | Nenhuma variável `mongo_*`. |
| Build x86_64 | `ami_name_filter` padrão é ARM64 (`gp3`) | D-10: build precisa ser ARM64 para não emular. Ver C-05. |
| Compose como "infraestrutura" | Compose é **ambiente de desenvolvimento**, não deploy | Deploy provisionado via manifests versionados. |

Valores reais confirmados no repositório:

| Dado | Valor | Origem |
|---|---|---|
| Nome do banco | `tech_challenge` | `docker-compose.yml`, `k8s/base/configmap.yaml` |
| Usuário do banco | `postgres` | `docker-compose.yml`, `k8s/base/postgres/statefulset.yaml` |
| Nome do Secret | `app-secrets` | `k8s/base/secret.yaml` |
| Imagem do banco | `postgres:16-alpine` | `k8s/base/postgres/statefulset.yaml` |
| Porta da API | `30080` (NodePort) | `k8s/base/api/service.yaml` |
| Migrations no boot | `docker-entrypoint.sh` | exige que o banco esteja pronto |

---

## 9. Decisões em aberto

Nada nesta lista bloqueia a fundação. Todos os itens precisam ser resolvidos antes
do primeiro `apply` que provisione recursos.

### Bloqueiam a camada de cluster

| ID | Questão | Impacto | Recomendação |
|---|---|---|---|
| **C-01** | A documentação assume API em `6443`, mas o Service é NodePort `30080`. Um NodePort não é "kube-apiserver": não dá endpoint para o Terraform rodar de dentro da cluster. | **Bloqueia o caminho de execução do Terraform dentro do cluster.** | Executar o Terraform **sobre a EC2 via SSM**, usando a rede interna. Alternativa: expor o `kube-apiserver` em um `kubernetes_service` NodePort na porta `6443`. |
| **C-02** | O `terraform apply` da camada de rede termina antes do K3s existir na VM. O provisionamento do cluster precisa rodar **depois**, num segundo apply. | A infraestrutura não pode ser criada em um apply só. | **Sequência explícita em dois applies**, documentada. Não é um bug: é consequência de C-01. |
| **C-03** | Qual é o escopo do Terraform para o cluster: (a) Secret + volume, (b) Secret + volume + namespace + aplicações, (c) nada — `kubectl`. | Não há conflito de arquivo; há **ausência de definição**. | **(a)**: Secret e volume pelo Terraform, manifests versionados no repositório. É a fronteira mais limpa e mantém a fundação honesta. |
| **C-11** | O provisionamento dentro do cluster precisa do binário do Terraform na VM. **Isto é um requisito novo, e ainda não está em nenhuma fonte.** | Se a alternativa de C-01 for escolhida, o `user-data.sh` precisa instalar o Terraform. **Sem isso, o Terraform não tem como rodar na VM.** | **Resolver C-01 antes de escrever `user-data.sh`.** |

### Bloqueiam a primeira aplicação real

| ID | Questão | Impacto | Recomendação |
|---|---|---|---|
| **C-04** | `aws_region` e `allowed_account_ids` não foram definidos. | Vão para a conta real com os defaults. | Definir antes do primeiro apply. A fundação funciona sem eles: o guard fica desativado. |
| **C-05** | A AMI é ARM64, mas não há definição de build da imagem ARM. | Emulação por `qemu`, ou `exec format error`. | Definir antes de provisionar a VM. |
| **C-07** | Sem `domain` (D-03 não traz ACME aqui), a API fica em `IP:porta`. | Sem TLS nem hostname estável. | `domain = null` é o default; a estratégia de exposição é decisão da camada de cluster. |
| **C-08** | Backup do Postgres in-cluster não está definido. O volume é único e local. | Perda de dados em recriação da VM. | Definir junto com a camada de cluster. |
| **C-09** | Versão do K3s não fixada (`k3s_version = null`). | Implantação não reprodutível. | Fixar antes do primeiro apply. |
| **C-10** | `MAIL_FROM` (`oficina@example.com`) é placeholder no ConfigMap e no compose. | E-mail real sairia de endereço inexistente. | Ajustar via Secret/ConfigMap. |

### Hygiene do repositório

| ID | Questão | Impacto | Recomendação |
|---|---|---|---|
| **C-06** | `aws-nextjs-k3s-terraform.md` está **untracked** no repositório. Nenhum arquivo dele é fonte de verdade. | Risco de alguém implementar a partir dele. | Versionar ou remover, se a documentação entrar no escopo. Nenhum arquivo dele foi alterado por esta fundação. |

---

## 10. Descobrir conta e região

Comando **somente leitura**, custo zero, não escreve nada, não altera estado:

```bash
aws sts get-caller-identity
```

Resposta esperada:

```json
{
  "UserId": "...",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/..."
}
```

O campo `Account` é o valor de `allowed_account_ids`. Preencha em
`terraform.tfvars` (local, ignorado pelo Git), nunca neste arquivo.

> **Pendência de ambiente:** a AWS CLI não está instalada neste ambiente, então
> este comando foi **documentado e não executado**. `Account` e `Region` reais
> permanecem em aberto (C-04).

---

## 11. Regra do operador único

O estado é compartilhado; o `apply` não é.

| Operação | Pode ser paralelismo? | Motivo |
|---|---|---|
| `terraform fmt`, `validate`, `plan` | **Sim** | Não escreve estado. |
| `terraform apply` | **Não** | Duas aplicações simultâneas correm para state lock e uma falha. |

Regra operacional: **um único operador executa `apply`.**

⚠️ **Com backend local, o estado fica na máquina de quem aplicou.** Se duas
pessoas aplicarem em máquinas diferentes, o estado se divide e cada uma recria
os recursos da outra. Por isso o backend S3 (seção 7) deve ser ativado **antes**
do primeiro apply que provisione recursos — não depois.

---

## 12. Verificação

Terraform é executado por container (decisão D-11), então os comandos abaixo são
os que esta fundação usou de fato:

```bash
# Imagem fixada: resultado reproduzível. `required_version` é >= 1.9.0.
TF=hashicorp/terraform:1.16.5

docker run --rm -v "$PWD:/work" -w /work "$TF" fmt
docker run --rm -v "$PWD:/work" -w /work "$TF" init -input=false
docker run --rm -v "$PWD:/work" -w /work "$TF" validate
docker run --rm -v "$PWD:/work" -w /work "$TF" providers
docker run --rm -v "$PWD:/work" -w /work "$TF" plan -input=false
docker run --rm -v "$PWD:/work" -w /work "$TF" state list
```

`--user "$(id -u):$(id -g)"` evita que `.terraform/` e `.terraform.lock.hcl` nasçam
com ownership de root no bind mount. Sem isso o lock fica com dono `root` e o
`git status` o mostra como modificado a cada execução.

**Validações que exigem a AWS CLI, ausentes neste ambiente** (seção 10): nenhuma.

### Resultado observado

Executado em 2026-10-05 com Terraform **v1.16.5** (linux_amd64) e provider
**hashicorp/aws v6.67.0**.

| Verificação | Comando | Resultado |
|---|---|---|
| Formatação | `fmt -check -recursive` | ✅ exit 0 — todos os arquivos formatados |
| `init` | `init -input=false` | ✅ exit 0 — `hashicorp/aws v6.67.0` instalado, lock gerado |
| `init` idempotente | `init -input=false` (2ª vez) | ✅ exit 0 — sem reinstalação |
| Validação | `validate` | ✅ `Success! The configuration is valid.` |
| Provider | `providers` | ✅ 1 provider: `hashicorp/aws ~> 6.0` |
| Plano | `plan -input=false` | ✅ exit 0 — **apenas** `Changes to Outputs`, nenhum recurso |
| Sem prompt | `plan -input=false` | ✅ **nenhuma** solicitação de credencial, mesmo com `allowed_account_ids = []` |
| Estado vazio | `state list` | ✅ `No state file was found!` — nada foi criado |
| Zero `resource` | `grep -c '^resource '` | ✅ 0 |
| Zero `data` | `grep -c '^data '` | ✅ 0 |
| Zero `backend` / `module` | `grep -c` | ✅ 0 / 0 |
| Sem credencial em `.tf` | `grep` (ignorando comentários) | ✅ 0 atribuições |
| Sem segredo / `sensitive` | `grep` (ignorando comentários) | ✅ 0 — nenhuma variável `sensitive` |
| `.tfvars` ignorado | `git check-ignore -v` | ✅ ignorado |
| `.example` versionável | `git check-ignore` (negativo) | ✅ não ignorado |
| Lock versionável | `git check-ignore` (negativo) | ✅ não ignorado |
| State e plugins ignorados | `git check-ignore -v` | ✅ ignorados |
| Sem duplicação | `grep` (CIDR, região, tags, nome, unicidade) | ✅ 0 ocorrências indevidas |
| Sem recurso de rede ou cluster | `grep -E 'aws_(vpc\|subnet\|instance\|db_\|...)'` | ✅ 0 |
| Variáveis | contagem + `type`/`description`/`default` | ✅ 14 / 14 / 14 / 14 |
| Outputs / locals | contagem | ✅ 6 / 2 |

### Validações negativas

Provam que as regras de `validation` **disparam**, e não apenas que existem.
Todas retornaram exit ≠ 0 com a mensagem esperada:

| Entrada inválida | Mensagem disparada |
|---|---|
| `k8s_namespace=INVALID_Namespace` | `k8s_namespace` deve ser um label DNS-1123 válido |
| `vpc_cidr=nao-e-cidr` | `vpc_cidr` deve ser um CIDR IPv4 válido |
| `public_subnet_cidr=192.168.5.0/24` | `public_subnet_cidr` deve estar contido em `vpc_cidr` |
| `environment=producao` | `environment` deve ser development, staging ou production |
| `allowed_account_ids=["123"]` | cada entrada deve ter exatamente 12 dígitos |

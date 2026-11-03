# Infraestrutura como Código

Infraestrutura do projeto em AWS, gerenciada com Terraform. Este diretório é a
**fundação** da stack: define as convenções, os limites de versão, o contrato de
configuração e a política de segredos que o resto da infraestrutura reutiliza.

---

## 1. Decisões de arquitetura

| ID | Decisão | Consequência prática |
|---|---|---|
| D-01 | AWS como provedor de nuvem | Uma dependência de AWS em toda a stack. Não há caminho para outro provedor sem reescrever a fundação. |
| D-02 | Banco de dados no **RDS**, fora do cluster (revisado na #120; antes: StatefulSet in-cluster) | `database.tf` só usa o provider `aws` e não depende de alcançar a API do K3s (C-01). O banco sobrevive à recriação da VM e tem backup automático (C-08). Privado, sem rota para a internet, porta 5432 aberta só para o nó K3s. O StatefulSet continua no overlay **local**. |
| D-03 | Segredos em k8s Secret | Nenhuma variável `sensitive` no Terraform e nenhum segredo em arquivo versionado. O estado do Terraform guarda valores em **plaintext** mesmo quando o output é sensível. **Exceção (#120):** segredo *gerado* pelo Terraform (`random_password` da senha do RDS) é permitido, exposto só como output `sensitive`, e exige o backend S3 cifrado (seção 7) antes do primeiro `apply`. |
| D-04 | `environment` é apenas tag; `project_name` é o prefixo de nome | Ambientes diferentes são stacks diferentes. Stack = prefixo próprio, não ambiente no nome do recurso. |
| D-05 | Sem Secret Manager, sem Parameter Store | Segredo nasce e morre com o cluster (decisão D-03). |
| D-06 | Backend S3 **configurado** (revisado na #147; antes: apenas documentado) | `backend.tf` com configuração parcial: bucket e região vêm de `-backend-config`. O bucket é criado pela stack de bootstrap. Ver seções 7 e 14. |
| D-07 | Estrutura plana, um root module, um `versions.tf` | Um único lugar para os limites de versão. Ver seções 3 e 4. **Exceção (#147):** `bootstrap/` é um segundo root module, com state local, que cria só o bucket do state e o usuário IAM do CI — o que este root não consegue criar para si mesmo. Ver seção 14. |
| D-08 | Credencial pela cadeia padrão do provider AWS | Nenhuma credencial em código, em `.tf` ou em `.tfvars`. |
| D-09 | `public_subnet_cidr` deve estar contido em `vpc_cidr`, validado | Com os defaults, o único valor aceito é `10.0.1.0/24`. Mudar um exige mudar o outro. |
| D-10 | AMI Ubuntu 24.04 LTS ARM64, owner fixo `099720109477` | Imagem de sistema, reconstruível, e sem risco de o filtro resolver para AMI de terceiro. A instância ignora mudanças de `ami` (`lifecycle.ignore_changes`): AMI nova não recria a VM sozinha. Para atualizar a imagem de propósito: `terraform apply -replace=aws_instance.k3s`. |
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
| Valores de produção (versionados, sem segredo) | `production.tfvars` | Fechado (#129) |
| Higiene de artefatos | `.gitignore` | — |
| Backend remoto (S3, configuração parcial) | `backend.tf` | Fechado (#147) |
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
| Banco de dados (RDS, subnets privadas, SG, parameter group) | `database.tf` |

### Bootstrap — `bootstrap/` (root separado, #147)

| Componente | Arquivo |
|---|---|
| Versão e provider (com `allowed_account_ids` obrigatório) | `bootstrap/versions.tf` |
| Variáveis (`account_id` sem default) | `bootstrap/variables.tf` |
| Bucket do state, usuário IAM do CI | `bootstrap/main.tf` |
| Valores para o GitHub e para o `backend.hcl` | `bootstrap/outputs.tf` |

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
user-data.sh  kubernetes.tf  secrets.tf   database.tf    .gitignore
README.md     .terraform.lock.hcl          backend.tf     backend.hcl
terraform.tfvars
bootstrap/
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
| Banco de dados | `hashicorp/random` | **Em uso** (#120): senha mestre do RDS e sufixo estável do snapshot final. |
| Banco de dados | `hashicorp/local` | **Em uso** (#120): grava `k8s/components/aws-runtime/db.env` (sem segredo). Só para quem roda localmente; no CI, a action `tf-outputs` regrava o arquivo a partir do state. |
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
`network.tf`, `ec2.tf`, `kubernetes.tf`, `secrets.tf` ou `database.tf`, é um erro.

| Não repetir | Por quê |
|---|---|
| Bloco `terraform {}` ou `required_providers` | Contrato único em `versions.tf` |
| Bloco `provider "aws"` | Provider único em `providers.tf` |
| `${var.project_name}-` em nome de recurso | Usar `${local.name_prefix}-<papel>` |
| Tags `Project`, `Environment`, `ManagedBy` | Vêm de `default_tags` automaticamente |
| Literal de região | Usar `var.aws_region` |
| Literal de CIDR | Usar `var.vpc_cidr` / `var.public_subnet_cidr` / `var.private_subnet_cidrs` |
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
| `private_subnet_cidrs` | `database.tf` (parâmetro da camada de banco) |
| VPC, subnet pública, IGW, rota padrão, NAT gateway, Security Groups | `network.tf`, `security.tf` |
| Subnets privadas do banco, tabela de rotas e subnet group | `database.tf` |

Regras de contenção já validadas por `variables.tf`:

- `public_subnet_cidr` precisa ter máscara mais específica que `vpc_cidr`;
- `public_subnet_cidr` precisa estar contido em `vpc_cidr`;
- com os defaults, o único par aceito é `10.0.0.0/16` + `10.0.1.0/24`.

NAT gateway e Elastic IP, se existirem, são responsabilidade da camada de rede e
**não** têm variável aqui — a fundação não as declara para não congelar uma
decisão que ainda não foi tomada.

As **subnets privadas do banco** são da camada de banco (`database.tf`, #120):
duas, uma por AZ (exigência do subnet group do RDS), com tabela de rotas própria
sem saída para a internet e CIDRs em `var.private_subnet_cidrs`, validados contra
`vpc_cidr` e `public_subnet_cidr`. A camada de banco depende da de rede por
exatamente dois nomes: `aws_vpc.main` e `aws_security_group.k3s`.

---

## 7. Contrato de backend S3

**Backend remoto ativo (#147).** `backend.tf` declara o backend `s3` com
configuração **parcial**: `key`, `encrypt` e `use_lockfile` estão versionados;
`bucket` e `region` são passados no `init`, porque dependem da conta. O bucket
é criado pela stack de bootstrap (seção 14).

```hcl
terraform {
  backend "s3" {
    key          = "tech-challenge-soat/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
```

Como inicializar:

```bash
# Local: backend.hcl fica no .gitignore deste diretório.
terraform -chdir=bootstrap output -raw backend_hcl > backend.hcl
terraform init -backend-config=backend.hcl

# CI: valores vindos das variables do environment `production`.
terraform init -backend-config="bucket=$TF_STATE_BUCKET" -backend-config="region=$AWS_REGION"

# fmt/validate, sem credencial e sem tocar no state:
terraform init -backend=false
```

Regras e o motivo de cada uma:

| Regra | Motivo |
|---|---|
| `encrypt = true` | O estado guarda valores de recurso em plaintext (inclusive a senha do RDS, exceção da D-03). |
| `use_lockfile = true` | Locking via DynamoDB está **deprecado**; o lock passa a ser um objeto S3. |
| `key` inclui o nome do projeto | Dois ambientes não podem compartilhar o mesmo objeto. |
| Bucket **fora** da VPC e fora deste root | O `init` roda antes de existir VPC, e o bucket não pode morar no state que ele guarda. |
| `bucket`/`region` fora do código | Nenhum valor específico de conta versionado. |
| Bucket versionado, cifrado, sem acesso público, só TLS | Ver `bootstrap/main.tf`. Versões antigas expiram em 90 dias. |

---

## 8. Mapa `documento → realidade`

| Documento assume | Realidade deste repositório | Correção aplicada |
|---|---|---|
| Next.js | **NestJS** (`src/main.ts`, `nest-cli.json`) | Nenhum — Terraform é agnóstico. O provisionamento da aplicação segue o NestJS. |
| API em porta `6443` | `k8s/base/api/service.yaml` é **NodePort 30080** | Ver C-01 na seção 9. |
| Banco gerenciado (RDS) | AWS: RDS em `database.tf`; local: `k8s/overlays/local/postgres/statefulset.yaml` | D-02 revisado: RDS na AWS, StatefulSet só no overlay local. |
| `APP_BASE_URL` derivado do host | `k8s/base/config/configmap.yaml` fixa `http://localhost:30080` | Na AWS, `app.env` (gerado pelo `tf-outputs` a partir do output `api_url`) sobrescreve no ConfigMap. |
| `MONGO_URI` | **Inexistente.** `docs/adr/0004` escolheu PostgreSQL + Drizzle | Nenhuma variável `mongo_*`. |
| Build x86_64 | `ami_name_filter` padrão é ARM64 (`gp3`) | D-10: build precisa ser ARM64 para não emular. Ver C-05. |
| Compose como "infraestrutura" | Compose é **ambiente de desenvolvimento**, não deploy | Deploy provisionado via manifests versionados. |

Valores reais confirmados no repositório:

| Dado | Valor | Origem |
|---|---|---|
| Nome do banco | `tech_challenge` | `docker-compose.yml`, `k8s/base/config/configmap.yaml` |
| Usuário do banco | `postgres` | `docker-compose.yml`, `k8s/overlays/local/postgres/statefulset.yaml` |
| Nome do Secret | `app-secrets` | `k8s/overlays/local/secret.yaml` |
| Imagem do banco | `postgres:16-alpine` | `k8s/overlays/local/postgres/statefulset.yaml` |
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
| ~~**C-04**~~ | ~~`aws_region` e `allowed_account_ids` não foram definidos.~~ | **Resolvido (#129):** `production.tfvars` fixa `us-east-2` e a conta do projeto. | — |
| **C-05** | A AMI é ARM64, mas não há definição de build da imagem ARM. | Emulação por `qemu`, ou `exec format error`. | Definir antes de provisionar a VM. |
| **C-07** | Sem `domain` (D-03 não traz ACME aqui), a API fica em `IP:porta`. | Sem TLS nem hostname estável. | `domain = null` é o default; a estratégia de exposição é decisão da camada de cluster. |
| ~~**C-08**~~ | ~~Backup do Postgres in-cluster não está definido.~~ | **Resolvido (#120):** o banco é RDS, fora da VM, com 1 dia de backup automático (máximo do free plan) (`db_backup_retention_days`) e snapshot final no destroy. | — |
| ~~**C-09**~~ | ~~Versão do K3s não fixada (`k3s_version = null`).~~ | **Resolvido (#129):** `production.tfvars` fixa `v1.36.5+k3s1`, a mesma minor do `kubectl` da pipeline. | — |
| ~~**C-10**~~ | ~~`MAIL_FROM` (`oficina@example.com`) é placeholder no ConfigMap e no compose.~~ | **Resolvido:** na AWS o driver é `brevo` e `MAIL_FROM` vem da variable do environment, via `app.env`. | — |

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

Regra operacional: **o operador do `apply` é a pipeline** (job `infra` do
`deploy.yml`, #129), rodando no environment `production` a partir de `main`. O
lock (`use_lockfile`) impede dois `apply` simultâneos — inclusive um local
contra o do CI.

`apply` local continua possível (credencial admin + `backend.hcl`), mas é
exceção consciente: para destruir/recriar recursos, que a pipeline recusa, ou
para corrigir algo que travou o CI. Use sempre o mesmo `production.tfvars` do
CI, ou um `apply` desfaz o outro.

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
| `k8s_namespace=INVALID_Namespace` | `k8s_namespace must be a valid DNS-1123 label` |
| `vpc_cidr=nao-e-cidr` | `vpc_cidr must be a valid IPv4 CIDR` |
| `public_subnet_cidr=192.168.5.0/24` | `public_subnet_cidr must be contained in vpc_cidr` |
| `environment=producao` | `environment must be development, staging or production` |
| `allowed_account_ids=["123"]` | `Each allowed_account_ids entry must be an AWS account ID with exactly 12 digits` |

---

## 13. Banco de dados (RDS)

Provisionado por `database.tf` (#120). Pré-requisitos do primeiro `apply`: a
camada de rede (#119) aplicada e o **backend S3 cifrado** ativo — a senha mestre
é gerada pelo Terraform e fica no estado (exceção em D-03).

### Deploy pela pipeline (#129)

Todo commit em `main` que passa no CI vira imagem (`cd.yml`) e é implantado
pelo `deploy.yml`, em três jobs no environment `production`. Um job que falha
impede o seguinte:

```
cd.yml (imagem) ──► infra ──► db-migrate ──► deploy
```

| Job | O que faz |
|---|---|
| `infra` | `terraform plan -var-file=production.tfvars` → **guarda** → `apply`. O resumo do plano vai para o job summary. A guarda (`.github/scripts/terraform-plan-guard.sh`) **falha se o plano tiver qualquer `delete` ou `replace`**: destruir ou recriar (RDS, VM, EIP) é sempre manual (seção 11). |
| `db-migrate` | Lê o state (action `tf-outputs`: `db.env` e IP da VM), busca o kubeconfig por SSH (action `kubeconfig`, com retry de ~10 min enquanto o K3s sobe), aplica o ConfigMap `rds-ca` e o Secret `app-secrets`, roda o Job `db-migrate` (`k8s/overlays/aws-migrate`) com a imagem do commit e espera ele completar. Se falhar, mostra os logs e o deploy para, com a versão anterior no ar. |
| `deploy` | Rollout da API (`k8s/overlays/aws`) com a imagem do commit e espera o `rollout status`. |

O state remoto é a única fonte dos endereços: nada é copiado à mão para
variáveis do GitHub. O Secret `app-secrets` é reaplicado em todo deploy, com
`DB_USER`/`DB_PASSWORD` lidos do state dentro do próprio step (nunca como
output de job). Migrations precisam ser compatíveis com a versão anterior do
código ([ADR-0006](../docs/adr/0006-migrations-compativeis-com-a-versao-anterior.md)).

### Secrets e variables do environment `production`

| Tipo | Nome | Origem |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Usuário IAM do CI (seção 14) |
| Secret | `SSH_PRIVATE_KEY` | Metade privada da chave em `ssh_public_key` do `production.tfvars`, dedicada ao ambiente |
| Secret | `JWT_SECRET` | Fixo, gerado uma vez (`openssl rand -base64 48`). Trocar desloga todo mundo. |
| Secret | `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Primeiro admin (senha com 12+ caracteres) |
| Secret | `BREVO_API_KEY` | Chave de API do Brevo (envio dos e-mails ao cliente) |
| Variable | `MAIL_FROM` | Remetente verificado no Brevo. Fora do repositório, que é público |
| Variable | `TF_STATE_BUCKET`, `AWS_REGION` | `terraform -chdir=infra/bootstrap output` |

O `deploy.yml` também pode ser disparado à mão (Actions → *CD - Deploy K8s*, a
partir de `main`) para reimplantar ou voltar para uma imagem que já está no
registry.

### Subir o ambiente à mão

Exceção consciente (seção 11), por exemplo para depurar sem a pipeline. Use o
mesmo `production.tfvars` e as mesmas etapas, na mesma ordem:

```bash
# 1. Provisionar. Grava k8s/components/aws-runtime/db.env (DB_HOST, DB_PORT, DB_NAME).
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra apply -var-file=production.tfvars

# 2. Kubeconfig (a VM instala o K3s no primeiro boot; pode levar alguns minutos).
eval "$(terraform -chdir=infra output -raw kubeconfig_command)"
export KUBECONFIG=$PWD/kubeconfig

# 3. CA da AWS: o RDS só aceita TLS e a CA dele não está no trust store do Node.
curl -fsSLo global-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
kubectl create configmap rds-ca --from-file=global-bundle.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Secret com as credenciais reais. Nunca em arquivo versionado. Use o mesmo
#    JWT_SECRET do environment, ou os tokens emitidos pela pipeline deixam de valer.
kubectl create secret generic app-secrets \
  --from-literal=DB_USER="$(terraform -chdir=infra output -raw db_username)" \
  --from-literal=DB_PASSWORD="$(terraform -chdir=infra output -raw db_password)" \
  --from-literal=JWT_SECRET='<mesmo valor do secret JWT_SECRET>' \
  --from-literal=BOOTSTRAP_ADMIN_EMAIL='<email do admin>' \
  --from-literal=BOOTSTRAP_ADMIN_PASSWORD='<senha do admin, 12+ caracteres>' \
  --from-literal=BREVO_API_KEY='<mesmo valor do secret BREVO_API_KEY>' \
  --dry-run=client -o yaml | kubectl apply -f -

# 5. app.env: link de aprovação no e-mail e remetente do Brevo (não versionado).
printf 'APP_BASE_URL=%s\nMAIL_FROM=%s\n' \
  "$(terraform -chdir=infra output -raw api_url)" '<mesmo valor da variable MAIL_FROM>' \
  > k8s/components/aws-runtime/app.env

# 6. Migration e aplicação, com a imagem do commit.
IMAGE=<DOCKERHUB_IMAGE>:<sha>
.github/scripts/render-overlay.sh k8s/overlays/aws-migrate "$IMAGE" migrate.yaml
kubectl delete job db-migrate --ignore-not-found && kubectl apply -f migrate.yaml
kubectl wait --for=condition=complete job/db-migrate --timeout=5m
.github/scripts/render-overlay.sh k8s/overlays/aws "$IMAGE" manifests.yaml
kubectl apply -f manifests.yaml && kubectl rollout status deployment/api
```

Os dois overlays usam o component `k8s/components/aws-runtime`, que liga
`DB_SSL=true`, monta a CA em `NODE_EXTRA_CA_CERTS`, usa `NODE_ENV=production` e
**não** roda o seed: os usuários do seed têm senha versionada no repositório. O
primeiro admin vem de `BOOTSTRAP_ADMIN_*`.

### Destruir

`db_deletion_protection` é `true` por padrão. Para um `terraform destroy`:
defina `db_deletion_protection = false` no `production.tfvars`, rode `apply` e só
então `destroy`. Um snapshot final (`<prefixo>-db-final-<sufixo>`) é mantido.

### Pendências fora da camada de banco

| Item | Hoje | Dono |
|---|---|---|
| ~~`APP_BASE_URL`~~ | **Resolvido:** o `tf-outputs` grava o output `api_url` em `app.env` | — |
| ~~Imagem da API~~ | **Resolvido (#145/#146):** imagem do Docker Hub, trocada pela pipeline (`render-overlay.sh`) | — |

---

## 14. Bootstrap (backend S3 e usuário IAM do CI)

`bootstrap/` (#147) cria o que este root não consegue criar para si mesmo:

| Recurso | Por que não está no root principal |
|---|---|
| Bucket S3 do state | O `init` precisa dele antes de ler qualquer `.tf`; não pode morar no state que guarda. |
| Usuário IAM `github-actions-<project_name>` | A pipeline precisa da credencial para rodar o `apply` que a criaria. |

O usuário tem `PowerUserAccess`: tudo, exceto IAM e Organizations. Uma chave
vazada não consegue criar usuários, chaves ou roles. A access key fica como
**secret** do environment **`production`**, que só aceita a branch `main`.

### Por que access key e não OIDC (exceção)

O plano original era OIDC do GitHub + role, sem nenhuma chave da AWS no GitHub.
A conta do projeto não permite: ela é um **projeto do AWS Settings**
(settings.aws.com), criado dentro de uma organização gerenciada pela AWS, que
aplica SCPs próprias
([docs](https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html)).
Um *explicit deny* de SCP vale mesmo para um usuário com `AdministratorAccess`.

| SCP | Efeito | Consequência |
|---|---|---|
| `p-012d3bs2` (região) | Só libera a região do projeto (`us-east-2`); em `us-east-1`, só ações globais | `aws_region` usa `us-east-2` por padrão, nas duas stacks. |
| `p-2rzg8ea8` | Nega `iam:*OpenIDConnectProvider*` em qualquer região | Sem OIDC: o CI usa um usuário IAM com access key. |

Verificado na conta: `CreateUser`, `AttachUserPolicy`, `CreateAccessKey`, e a
checagem de permissão de EC2 (`t4g.small`), VPC, EIP, key pair, security group
e RDS (`postgres`, `db.t4g.micro`, `gp3`) passam.

O que se perde em relação ao OIDC:

| | OIDC + role | Usuário IAM + access key |
|---|---|---|
| Duração da credencial | 1h, gerada a cada job | Permanente, até ser revogada |
| Se vazar | Expira sozinha | Vale até alguém desativar a chave |
| Restrição a `main` | Trust policy da AWS **e** environment do GitHub | **Só** o environment do GitHub |

Para liberar o OIDC, o dono do projeto precisaria fazer upgrade para o plano
pago e ativar os *advanced features* no settings.aws.com (os dois passos são
irreversíveis e valem para todos os projetos dele) e então editar a SCP. Numa
conta AWS comum, sem essas SCPs, volte ao OIDC.

Outros limites da conta: a SCP do free tier só libera uma lista de serviços; o
free plan só aceita tipos de EC2 elegíveis (por isso `t4g.small`) e no máximo
1 dia de backup no RDS; o
*spend limit* do projeto passa a negar `ec2:RunInstances`,
`rds:CreateDBInstance` e outros perto do limite de gasto; e a conta fecha
depois de 6 meses ou quando os créditos acabam.

### Executar (uma vez, por um admin da conta)

```bash
export AWS_PROFILE=<perfil admin da conta do projeto>
aws sts get-caller-identity                     # confira o Account

cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars    # preencha account_id
terraform init
terraform plan                                  # só criações
terraform apply
terraform output
```

### Criar a access key do CI

Fora do Terraform: `aws_iam_access_key` gravaria o secret em plaintext no
state. A chave vai direto da CLI para o GitHub, sem passar por arquivo.

Pré-requisito: o environment `production` já existe (seção seguinte, passo 1);
sem ele, `gh secret set --env` falha. Rode da raiz do repositório:

```bash
REPO=10Org-17SOAT/tech-challenge-17soat
USER_NAME=$(terraform -chdir=infra/bootstrap output -raw ci_user_name)
[ -n "$USER_NAME" ] || { echo "ci_user_name vazio: rode o bootstrap antes"; return 1 2>/dev/null || exit 1; }
KEY=$(aws iam create-access-key --user-name "$USER_NAME" --output json) || return 1 2>/dev/null || exit 1
gh secret set AWS_ACCESS_KEY_ID     --env production --repo "$REPO" --body "$(jq -r .AccessKey.AccessKeyId <<<"$KEY")"
gh secret set AWS_SECRET_ACCESS_KEY --env production --repo "$REPO" --body "$(jq -r .AccessKey.SecretAccessKey <<<"$KEY")"
unset KEY
```

**Rotação** (a cada entrega, ou na hora se houver suspeita de vazamento): crie a
chave nova e atualize os secrets como acima; depois desative e apague a antiga
(`aws iam list-access-keys` → `update-access-key --status Inactive` →
`delete-access-key`). O IAM permite no máximo duas chaves por usuário.

### Configurar o GitHub

Em *Settings → Environments → `production`* (admin do repositório):

1. **Deployment branches:** *Selected branches* → só `main`. Sem isso, um
   `workflow_dispatch` de outra branch entra no environment e recebe a chave.
2. **Secrets:** `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` (seção anterior).
3. **Variables** (não secrets — nenhum é credencial):

| Variable | Valor |
|---|---|
| `TF_STATE_BUCKET` | `terraform output -raw state_bucket` |
| `AWS_REGION` | `terraform output -raw aws_region` |

O mesmo pelo `gh`:

```bash
REPO=10Org-17SOAT/tech-challenge-17soat
gh api -X PUT "repos/$REPO/environments/production" --input - <<'JSON'
{"deployment_branch_policy": {"protected_branches": false, "custom_branch_policies": true}}
JSON
gh api -X POST "repos/$REPO/environments/production/deployment-branch-policies" -f name=main
gh variable set TF_STATE_BUCKET --env production --repo "$REPO" --body "$(terraform output -raw state_bucket)"
gh variable set AWS_REGION      --env production --repo "$REPO" --body "$(terraform output -raw aws_region)"
```

No workflow, o job declara `environment: production` e usa
`aws-actions/configure-aws-credentials` com `aws-access-key-id` e
`aws-secret-access-key` vindos desses secrets.

### State do bootstrap

Fica em `infra/bootstrap/terraform.tfstate`, **só na máquina de quem aplicou**,
ignorado pelo Git. Não guarda segredo. Guarde uma cópia em lugar seguro. Se for
perdido, recupere com `terraform import`:

```bash
terraform import aws_s3_bucket.tfstate <state_bucket>
terraform import aws_iam_user.ci github-actions-<project_name>
terraform import aws_iam_user_policy_attachment.ci_power_user \
  github-actions-<project_name>/arn:aws:iam::aws:policy/PowerUserAccess
# ...e os recursos auxiliares do bucket (versioning, encryption, etc.)
# pelo mesmo nome do bucket.
```

### Destruir

O bucket tem `prevent_destroy`: perder o bucket é perder o registro de toda a
infraestrutura. Para remover o bootstrap de propósito, destrua antes o root
principal, esvazie o bucket (inclusive versões antigas) e retire o
`prevent_destroy`.

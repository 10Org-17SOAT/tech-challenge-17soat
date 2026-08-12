<div align="center">
  <h1>🚗 Tech Challenge - Sistema de Gerenciamento</h1>
  <p><strong>Uma API robusta e escalável construída com NestJS para gerenciamento de veículos e serviços</strong></p>
  
  ![License](https://img.shields.io/badge/license-UNLICENSED-blue)
  ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
  ![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?logo=nestjs&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/postgresql-%23336791.svg?logo=postgresql&logoColor=white)
</div>

---

## 📋 Descrição do Projeto

Solução completa para **gerenciamento de veículos, serviços, pagamentos e onboarding de mecânicos**. Desenvolvida com arquitetura **Clean Architecture** e **Domain-Driven Design (DDD)**, garantindo escalabilidade e manutenibilidade.

### 🎯 Módulos Principais

| Módulo | Descrição |
|--------|-----------|
| 🚗 **Vehicle Management** | Cadastro e gerenciamento de veículos |
| 🔧 **Mechanic** | Gerenciamento de mecânicos e profissionais |
| 💳 **Payment** | Processamento de pagamentos |
| 🛠️ **Service Order** | Gestão de ordens de serviço |
| 📦 **Stock** | Controle de estoque de peças |
| 👤 **Onboarding** | Integração de novos usuários |

---

## 🚀 Quick Start

### ✅ Pré-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 13.x
- **Docker** e **Docker Compose** (opcional)

### 📦 Instalação

```bash
# 1️⃣ Clonar o repositório
git clone <seu-repositorio>
cd tech-challenge-17soat

# 2️⃣ Instalar dependências
npm install

# 3️⃣ Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 🗄️ Configuração do Banco de Dados

```bash
# ⬇️ Gerar migrations
npm run db:generate

# ⬆️ Aplicar migrations
npm run db:migrate

# 📤 Fazer push do schema (Drizzle)
npm run db:push

# 🎨 Abrir Drizzle Studio (interface visual)
npm run db:studio
```

---

## 🏃 Executando a Aplicação

### 💻 Desenvolvimento

```bash
# Inicia o servidor em modo watch
npm run start:dev

# ✨ Saída esperada:
# [Nest] 12345 - 01/01/2025, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345 - 01/01/2025, 10:30:02 AM     LOG [InstanceLoader] DatabaseModule dependencies initialized
# [Nest] 12345 - 01/01/2025, 10:30:02 AM     LOG [RoutesResolver] AppController {/}:
# [Nest] 12345 - 01/01/2025, 10:30:02 AM     LOG [NestApplication] Nest application successfully started
```

### 🔍 Debug

```bash
# Inicia servidor em modo debug
npm run start:debug

# Conecte seu debugger na porta 9229
```

### 🏭 Produção

```bash
# 1️⃣ Compilar aplicação
npm run build

# 2️⃣ Iniciar servidor
npm run start:prod
```

---

## 🧪 Testes

### 🔬 Testes Unitários

```bash
# Executar todos os testes unitários
npm run test

# Modo watch (testes contínuos)
npm run test:watch

# Com cobertura detalhada
npm run test:cov
```

### 🌐 Testes E2E

```bash
# Executar testes de integração
npm run test:e2e

# Com cobertura
npm run test:cov
```

---

## 🛠️ Ferramentas e Scripts

### Formatação e Lint

```bash
# 🎨 Formatar código (Prettier)
npm run format

# ✅ Validar e corrigir código (ESLint)
npm run lint
```

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run start` | Inicia servidor em produção |
| `npm run start:dev` | Desenvolvimento com hot-reload |
| `npm run start:debug` | Debug com inspetor Node.js |
| `npm run build` | Compila TypeScript para JavaScript |
| `npm run test` | Executa testes unitários |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run test:cov` | Testes com cobertura |
| `npm run test:e2e` | Testes de integração |
| `npm run lint` | Valida código com ESLint |
| `npm run format` | Formata código com Prettier |
| `npm run db:generate` | Gera migrations |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:push` | Faz push do schema |
| `npm run db:studio` | Abre interface visual do banco |

---

## 📁 Estrutura do Projeto

```
src/
├── shared/                    # 🔄 Código compartilhado
│   └── config/               # ⚙️ Configurações
│       ├── database/         # 🗄️ Banco de dados
│       ├── env/              # 🔐 Variáveis de ambiente
│       └── swagger/          # 📚 Documentação API
├── modules/                   # 📦 Módulos da aplicação
│   ├── vehicle-management/   # 🚗 Gestão de veículos
│   ├── mechanic/             # 🔧 Gerenciamento de mecânicos
│   ├── payment/              # 💳 Pagamentos
│   ├── service-order/        # 🛠️ Ordens de serviço
│   ├── stock/                # 📦 Estoque
│   └── onboarding/           # 👤 Onboarding
├── app.module.ts             # 🏗️ Módulo raiz
└── main.ts                   # 🚀 Ponto de entrada
```

### 🏛️ Arquitetura de Módulo (DDD)

Cada módulo segue a estrutura:

```
module/
├── application/              # 🎯 Casos de uso
│   ├── dtos/                # 📤 Transferência de dados
│   └── use-cases/           # 💼 Lógica de negócio
├── domain/                   # 🎨 Entidades e regras
│   ├── entities/            # 📦 Objetos de negócio
│   ├── exceptions/          # ⚠️ Erros de domínio
│   ├── repositories/        # 🔍 Contratos
│   └── value-objects/       # 💎 Valores imutáveis
├── infrastructure/           # 🔌 Implementações técnicas
│   ├── mappers/            # 🔄 Conversões
│   ├── persistence/        # 💾 Persistência
│   └── repositories/       # 📚 Implementações
└── presentation/            # 🎬 Interface HTTP
    ├── controllers/        # 🎮 Endpoints
    ├── guards/            # 🔐 Segurança
    └── pipes/             # 🔀 Validações
```

---

## 🔗 Integrações e Dependências

### 🗄️ Banco de Dados
- **PostgreSQL** com Drizzle ORM
- Migrations automáticas
- Type-safe queries

### 🔐 Segurança
- Validação com **Zod**
- Environment variables com **dotenv**
- Guards e pipes customizados

### 📚 Documentação
- **Swagger/OpenAPI** automático
- **Scalar API Reference**

### 🧪 Testes
- **Jest** para unit tests
- **Supertest** para E2E tests

---

## 🌍 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# 🚀 Servidor
NODE_ENV=development
PORT=3000

# 🗄️ Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/tech_challenge

# 🔐 Segurança
JWT_SECRET=your_secret_key
JWT_EXPIRATION=24h

# 📧 Email (se necessário)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=seu_email@gmail.com
MAIL_PASS=sua_senha

# 💳 Pagamentos (se necessário)
STRIPE_KEY=sk_test_xxx
```

---

## 📚 Recursos Úteis

- 🌐 [Documentação NestJS](https://docs.nestjs.com)
- 📖 [Drizzle ORM](https://orm.drizzle.team)
- 🔑 [Zod Validation](https://zod.dev)
- 🎨 [TypeScript Best Practices](https://www.typescriptlang.org/docs)
- 🏛️ [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob licença **UNLICENSED**. Veja `LICENSE` para detalhes.

---

## 👨‍💻 Suporte

Para dúvidas ou problemas:

1. 📖 Consulte a documentação oficial
2. 🔍 Verifique issues já abertas
3. 💬 Abra uma nova issue com detalhes do problema

---

<div align="center">
  <p><strong>Desenvolvido com ❤️ para o Tech Challenge</strong></p>
  <p>Última atualização: 2025</p>
</div>

# ADR-0006: Autenticação com JWT, usuários e roles

- Status: Aceita
- Data: 2026-08-30

## Contexto

A API precisa controlar acesso às rotas e garantir que apenas usuários autenticados possam consumir recursos sensíveis. Também é necessário distinguir tipos de acesso conforme o perfil do usuário, como administração, atendimento técnico e uso do cliente.

Sem uma autenticação explícita, qualquer requisição poderia acessar endpoints de gerenciamento, estoque, ordens e dados de usuários. Além disso, sem uma hierarquia de papéis, o sistema ficaria sem controle granular de permissões.

## Decisão

Usaremos autenticação baseada em JWT para proteger os endpoints, mantendo o fluxo simples e alinhado ao padrão do projeto. O usuário será modelado com dados básicos de identidade e o perfil de acesso será representado por uma role.

### Estrutura do usuário

O usuário terá, no mínimo:

- `user_id`
- `name`
- `email`
- `password_hash`
- `role_id`

A senha será armazenada em hash, nunca em texto puro.

### Estrutura de roles

A aplicação definirá as seguintes roles:

- `admin`
- `consultor_tecnico`
- `cliente`

A role será representada em código por um identificador numérico ou enum e será incluída no payload do JWT para permitir validação de autorização nas rotas.

### Fluxo de autenticação

1. O cliente envia e-mail e senha para o endpoint de login.
2. O backend valida as credenciais contra o usuário encontrado no repositório.
3. Se válidas, o sistema gera um JWT contendo os dados mínimos do usuário, especialmente `sub` (id do usuário) e `role_id`.
4. O cliente envia o token no header `Authorization: Bearer <token>`.
5. O guard JWT valida a assinatura e a expiração do token.
6. O payload é convertido em `request.user` para uso no contexto da rota.

### Fluxo de autorização

Para rotas com acesso restrito, será usado um guard de roles. Esse guard verificará se a role do usuário está autorizada para a rota específica. Exemplo:

- rota admin-only: apenas `admin`
- rota técnica: `admin` e `consultor_tecnico`
- rota do cliente: `cliente`

## Justificativa

A escolha do JWT é adequada porque:

- é simples de integrar ao NestJS;
- evita sessão em servidor para APIs stateless;
- permite transporte seguro em headers HTTP;
- reduz a necessidade de armazenamento de estado no backend.

A escolha de roles é adequada porque:

- separa autenticação de autorização;
- simplifica o controle de acesso por perfil;
- mantém a solução acessível e extensível sem criar complexidade desnecessária.

## Consequências

### Positivas

- Endpoints sensíveis ficam protegidos.
- O projeto passa a distinguir usuários comuns, técnicos e administradores.
- O token transporta identidade e papel do usuário de forma padronizada.
- A arquitetura fica pronta para evoluir com regras mais finas no futuro.

### Negativas / Considerações

- O token precisa ser protegido com secret forte e ambiente configurado corretamente.
- O controle de expiração e renovação precisa ser pensado no futuro.
- Se a aplicação crescer, pode ser necessário migrar de roles simples para permissões mais granulares.

## Resultado

A solução adotada fornece autenticação mínima, segura e prática para a API, com autorização por role sem introduzir uma complexidade desnecessária para o nível atual do projeto.

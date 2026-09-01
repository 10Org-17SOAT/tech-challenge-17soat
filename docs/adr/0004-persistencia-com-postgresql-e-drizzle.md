# ADR-0004: Persistência com PostgreSQL e Drizzle ORM

- Status: Aceita
- Data: 2026-08-10

## Contexto

O sistema precisa persistir dados de múltiplos domínios (ordem de serviço, pagamento, estoque, autenticação, onboarding, mecânico) com consistência transacional entre entidades relacionadas dentro de um mesmo módulo (ex.: criar uma ordem de serviço e reservar itens de estoque), suporte a consultas estruturadas e evolução de schema rastreável — sem introduzir complexidade operacional incompatível com o estágio do projeto (ver ADR-0001).

Avaliamos a escolha de banco de dados e da camada de acesso a dados pelos pilares abaixo, considerando apenas os relevantes para este contexto.

### Data Schema

O domínio tem entidades bem definidas e relacionamentos claros entre elas (ordem de serviço referencia itens de estoque e pagamento, usuários têm papéis, etc.). O schema é conhecido antecipadamente e evolui de forma controlada, não é um caso de dados semiestruturados ou schema altamente variável — cenário que favorece um banco relacional com schema explícito em vez de um modelo schemaless.

### Access Pattern

O acesso aos dados é predominantemente relacional: consultas que cruzam entidades relacionadas (ex.: buscar uma ordem de serviço com seus itens e status de pagamento), filtros e agregações sobre colunas estruturadas. Esse padrão de acesso é atendido naturalmente por SQL e joins, sem necessidade de um modelo de acesso por chave-valor ou documento.

### Read vs Write

O sistema não tem um perfil de leitura massivamente superior à escrita a ponto de justificar desnormalização agressiva ou um banco orientado a leitura (ex.: read replicas especializadas, cache-first). Leituras e escritas transacionais (criar pedido, registrar pagamento, ajustar estoque) acontecem de forma equilibrada e frequentemente na mesma operação de negócio, o que reforça a necessidade de consistência forte entre elas.

### ACID

Operações de negócio como "criar ordem de serviço e debitar estoque" ou "confirmar pagamento e atualizar status do pedido" precisam ser atômicas: ou tudo é persistido, ou nada é. Um banco com garantias ACID completas evita estados inconsistentes (ex.: pedido criado sem reserva de estoque) sem que a aplicação precise implementar compensação manual para cada caso.

### CAP (Teorema CAP)

Este é um sistema de deploy único (ver ADR-0001), sem múltiplos nós de banco distribuídos geograficamente nesta fase — não há um cenário real de partição de rede entre réplicas a ser tolerado. Nesse contexto, priorizar Consistência e Disponibilidade (CA) em um único nó é a escolha correta: não faz sentido pagar o custo de modelagem para tolerância a partição (P) — que normalmente implica abrir mão de consistência forte (AP) ou de disponibilidade em certos cenários (CP) — quando o sistema não está distribuído para começar. Um banco relacional como o PostgreSQL, operando como um único nó (ou réplica primária), entrega consistência forte sem essa complexidade.

## Decisão

Usaremos **PostgreSQL** como banco de dados relacional e **Drizzle ORM** para modelagem de schema e acesso aos dados.

## Justificativa

### PostgreSQL

- Atende diretamente aos pilares acima: schema relacional bem definido, acesso por consultas estruturadas com joins, e garantias ACID completas para operações que atravessam múltiplas entidades do mesmo módulo.
- É um banco maduro, estável e amplamente suportado em aplicações back-end, o que reduz risco operacional e facilita encontrar solução para problemas comuns.
- Dado o contexto de nó único (sem necessidade de tolerância a partição via CAP), o PostgreSQL entrega o par Consistência + Disponibilidade sem exigir a complexidade operacional de um banco distribuído.

### Drizzle ORM

- Escolhido pela **simplicidade**: API mínima, sem a camada de abstrações e "mágica" presente em ORMs mais robustos (ex.: decorators complexos, unit of work, lazy loading implícito).
- Escolhido pela **transparência**: as queries geradas são muito próximas de SQL puro, o que facilita entender exatamente o que será executado no banco e reduz a chance de comportamento inesperado (ex.: N+1 queries escondidas).
- Escolhido pela **leveza**: menor overhead de runtime e de aprendizado comparado a ORMs mais completos, o que se encaixa no time pequeno e no prazo do projeto.
- Mantém tipagem forte de ponta a ponta (schema TypeScript-first), reduzindo erros em tempo de desenvolvimento sem abrir mão da proximidade com SQL.
- A modelagem com schemas e migrations dá previsibilidade e rastreabilidade à evolução do banco.

## Alternativas consideradas

- **Banco NoSQL orientado a documentos**: descartado. O domínio tem schema bem definido e relacionamentos claros entre entidades (Data Schema e Access Pattern), o que um banco de documentos atenderia pior do que um relacional, exigindo desnormalização ou joins feitos na aplicação.
- **ORM mais completo (ex.: TypeORM, Prisma com camada de abstração mais pesada)**: descartado em favor do Drizzle por não entregar o nível de transparência e leveza desejado — mais abstração entre o código e o SQL real executado, maior superfície de aprendizado e maior custo de manutenção para o time.

## Consequências

- O projeto fica pronto para persistir dados de forma tipada, segura e com consistência transacional garantida pelo banco.
- As mudanças no schema passam a ser rastreáveis por migrations.
- O banco passa a ser um componente explícito da arquitetura, com queries próximas de SQL puro, facilitando debugging e revisão.
- Caso o sistema evolua para múltiplos nós de banco distribuídos (replicação multi-região, sharding), as decisões sobre CAP e ACID feitas aqui precisarão ser revisitadas — esta ADR assume explicitamente o cenário de nó único do estágio atual do projeto.

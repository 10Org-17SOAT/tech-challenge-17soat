# ADR-0003: Usar Clean Architecture nas camadas internas dos módulos

- Status: Aceita
- Data: 2026-08-10

## Contexto

Definido o monolito modular (ver ADR-0001) e o NestJS como framework (ver ADR-0002), é preciso decidir como cada módulo organiza suas camadas internamente — como as regras de negócio se separam de detalhes de infraestrutura (banco de dados, HTTP, bibliotecas externas).

## Decisão

Cada módulo será organizado internamente seguindo os princípios de Clean Architecture, com camadas `domain`, `application` e `infrastructure`: o domínio não depende de frameworks, ORM ou HTTP; casos de uso na camada de aplicação dependem apenas de interfaces do domínio; e a infraestrutura implementa essas interfaces.

## Justificativa

- O projeto já assume, pela ADR-0001, que módulos precisam de fronteiras internas bem definidas — Clean Architecture formaliza como essas fronteiras se organizam dentro de cada módulo, isolando regra de negócio de detalhes técnicos.
- O domínio (entidades, casos de uso) fica independente de framework, ORM e HTTP, o que reduz o impacto de trocar uma peça de infraestrutura (ex.: trocar o ORM) sem reescrever regra de negócio.
- Orientação a testes: como o domínio não depende de infraestrutura, casos de uso podem ser testados sem subir banco de dados ou servidor HTTP.
- Serve como documentação viva da arquitetura: a própria estrutura de pastas comunica onde está a regra de negócio e onde estão os detalhes técnicos, facilitando onboarding de novos desenvolvedores.

## Alternativas consideradas

- **Vertical Slice**: descartada nesta fase. Entrega mais rápido e tem curva de aprendizado menor, mas tende a duplicar lógica entre slices e a acoplar regra de negócio a detalhes de entrada/saída, o que enfraquece o isolamento de domínio que o projeto busca dentro de cada módulo.
- **Hexagonal / Onion**: architeturas próximas em espírito (isolamento do domínio via portas e adaptadores), com trade-offs semelhantes aos da Clean Architecture. Não foram adotadas explicitamente por não trazerem benefício adicional relevante para o tamanho e a maturidade deste projeto além do que a Clean Architecture já oferece.

## Consequências

- Cada módulo terá as camadas `domain/`, `application/` e `infrastructure/`, com regras claras de dependência entre elas (ver a skill `modular-monolith`).
- Maior verbosidade e esforço inicial para escrever cada funcionalidade (entidade, interface de repositório, caso de uso, implementação de infraestrutura), em troca de testabilidade e menor acoplamento.
- Exige disciplina da equipe para não deixar a camada de domínio depender de infraestrutura ou framework — sem enforcement automático, esse é um risco real de degradação ao longo do projeto.
- Há risco de over-engineering em funcionalidades muito simples (ex.: um CRUD trivial), que deve ser avaliado caso a caso sem abandonar a estrutura geral do módulo.

# ADR-0002: Usar NestJS com TypeScript

- Status: Aceita
- Data: 2026-08-10

## Contexto

Definido o monolito modular como arquitetura do projeto (ver ADR-0001), é preciso escolher um framework de aplicação capaz de expressar módulos de domínio com fronteiras claras, injeção de dependência e organização em camadas — sem exigir que a equipe construa essa disciplina manualmente sobre um framework sem opinião estrutural.

## Decisão

Usaremos NestJS como framework principal, com TypeScript como linguagem de desenvolvimento, estruturando a aplicação em módulos (camadas `domain/application/infrastructure`, fronteiras explícitas — ver ADR-0003 e a skill `modular-monolith`).

## Justificativa

- O NestJS organiza a aplicação nativamente em módulos (`@Module`), com injeção de dependência e decorators, permitindo declarar explicitamente o que cada módulo expõe (`exports`) e o que permanece interno — o suporte estrutural que a decisão de monolito modular (ADR-0001) exige, sem precisar impor essa disciplina manualmente sobre um framework sem opinião.
- O TypeScript reduz erros em tempo de desenvolvimento e melhora a manutenção.
- A stack permite integração com validação, injeção de dependência e testes em ambiente padronizado.

## Alternativas consideradas

- **Fastify**: descartado por não impor nenhuma convenção de módulos, camadas ou injeção de dependência. Isso deixaria toda a disciplina de modularização exigida pela ADR-0001 sob responsabilidade exclusiva da equipe, sem apoio do framework — com maior risco de as fronteiras entre módulos se perderem ao longo do projeto.

## Consequências

- A aplicação passa a ter uma estrutura modular clara, com fronteiras entre domínios (payment, stock, service-order etc.) definidas por convenção de código.
- O código fica mais previsível para evolução e manutenção.
- O uso de decorators facilita controllers, providers e injeção de dependência.

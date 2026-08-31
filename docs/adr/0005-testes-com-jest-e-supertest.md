# ADR-0005: Testes com Jest e Supertest

- Status: Aceita
- Data: 2026-08-30

## Contexto

O projeto precisa garantir qualidade, regressão e comportamento de API. Sem testes automatizados, mudanças pequenas podem quebrar fluxos importantes.

## Decisão

Usaremos Jest para testes unitários e Supertest para testes de integração/E2E HTTP.

## Justificativa

- Jest é nativo para projetos TypeScript e amplamente usado no ecossistema Node.js.
- Supertest facilita testes de endpoints em ambiente NestJS.
- A combinação cobre tanto lógica de domínio quanto comportamento de API.

## Consequências

- O backend passa a ter cobertura em nível de regra de negócio e de interface.
- Mudanças futuras podem ser validadas com mais segurança.
- O projeto fica mais adequado para evoluções contínuas e refatorações.

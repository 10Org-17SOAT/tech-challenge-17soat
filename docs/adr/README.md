# ADRs do Projeto

Este diretório reúne as Arquitetural Decision Records (ADR) do projeto. Cada ADR documenta uma decisão importante da arquitetura, o contexto que a motivou e as consequências de sua adoção.

## Índice

- [ADR-0001: Usar NestJS com TypeScript](./0001-usar-nestjs-com-typescript.md)
- [ADR-0002: Organização por módulos de domínio](./0002-organizacao-por-modulos-de-dominio.md)
- [ADR-0003: Persistência com PostgreSQL e Drizzle ORM](./0003-persistencia-com-postgresql-e-drizzle.md)
- [ADR-0004: Validação com Zod e DTOs](./0004-validacao-com-zod-e-dtos.md)
- [ADR-0005: Testes com Jest e Supertest](./0005-testes-com-jest-e-supertest.md)
- [ADR-0006: Autenticação com JWT, usuários e roles](./0006-autenticacao-jwt-roles-e-usuarios.md)

## Visão geral

O projeto foi estruturado como uma API REST em NestJS, com separação por módulos de negócio e persistência em banco PostgreSQL usando Drizzle. A arquitetura favorece: domínio explícito, casode-uso isolados, validação de contratos em DTOs e cobertura de testes automatizados.

# ADR-0001: Usar NestJS com TypeScript

- Status: Aceita
- Data: 2026-08-30

## Contexto

O projeto exige uma API REST robusta, organizada e de fácil manutenção, com suporte a módulos, validação e integração com banco de dados relacional. Também há necessidade de manter uma base de código consistente e testável.

## Decisão

Usaremos NestJS como framework principal, com TypeScript como linguagem de desenvolvimento.

## Justificativa

- O NestJS já organiza a aplicação em módulos e casos de uso, alinhando-se ao padrão de clean architecture.
- O TypeScript reduz erros em tempo de desenvolvimento e melhora a manutenção.
- A stack permite integração com validação, injeção de dependência e testes em ambiente padronizado.

## Consequências

- A aplicação passa a ter uma estrutura modular clara.
- O código fica mais previsível para evolução e manutenção.
- O uso de decorators facilita controllers, providers e injeção de dependência.

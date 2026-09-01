# ADR-0003: Persistência com PostgreSQL e Drizzle ORM

- Status: Aceita
- Data: 2026-08-30

## Contexto

O sistema precisa garantir consistência transacional, suporte a consultas estruturadas e integração com banco relacional sem complexidade excessiva.

## Decisão

Usaremos PostgreSQL como banco relacional e Drizzle ORM para modelagem e acesso aos dados.

## Justificativa

- O PostgreSQL é estável e bem suportado em aplicações de back-end.
- O Drizzle oferece tipagem forte e integração natural com TypeScript.
- A configuração com schemas e migrations dá previsibilidade na evolução do banco.

## Consequências

- O projeto fica pronto para persistir dados de forma tipada e segura.
- As mudanças no schema passam a ser rastreáveis por migrations.
- O banco passa a ser um componente explícito da arquitetura.

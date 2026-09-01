# ADR-0002: Organização por módulos de domínio

- Status: Aceita
- Data: 2026-08-30

## Contexto

O código precisa escalar com múltiplos domínios de negócio, como estoque, usuários, pagamentos e ordens de serviço. Sem organização por módulo, a base cresce de forma acoplada e difícil de evoluir.

## Decisão

A aplicação será dividida em módulos por domínio: `stock`, `users`, `payment`, `mechanic`, `service-order` e `onboarding`, seguindo a estrutura de domínio, aplicação, infraestrutura e apresentação.

## Justificativa

- Mantém responsabilidade separada por contexto de negócio.
- Facilita a busca e manutenção de regras específicas.
- Permite evolução independente de cada módulo.

## Consequências

- Cada módulo tem suas próprias entidades, casos de uso, repositórios e DTOs.
- O desenho favorece baixo acoplamento e alta coesão.
- Novos módulos podem ser adicionados sem impactar a estrutura global.

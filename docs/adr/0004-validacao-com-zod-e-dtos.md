# ADR-0004: Validação com Zod e DTOs

- Status: Aceita
- Data: 2026-08-30

## Contexto

Os endpoints precisam receber e responder dados com contratos claros. Sem validação consistente, entradas inválidas podem quebrar a lógica de negócio ou expor inconsistências no payload.

## Decisão

Usaremos Zod para validar entradas e DTOs para formalizar os contratos das rotas.

## Justificativa

- O Zod permite validação forte e legível.
- Os DTOs dos controllers ficam alinhados com a API pública.
- Isso reduz esforço de validação manual e melhora a previsibilidade.

## Consequências

- Os endpoints rejeitam payloads inválidos antes de entrarem no domínio.
- A API pública se torna mais consistente e documentável.
- As regras de contrato ficam centralizadas junto ao módulo.

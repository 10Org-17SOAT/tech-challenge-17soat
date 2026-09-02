# ADR-0005: Validação com Zod e DTOs

- Status: Aceita
- Data: 2026-08-10

## Contexto

Os endpoints precisam receber e responder dados com contratos claros. Sem validação consistente, entradas inválidas podem quebrar a lógica de negócio, propagar dados malformados para o domínio ou expor inconsistências no payload de resposta.

Isso cobre duas frentes distintas:

- **Validação de entrada (input)**: o que chega em body, query params e route params precisa ser validado antes de alcançar controllers e casos de uso — tipo, formato, obrigatoriedade e regras de negócio simples (ex.: CPF válido, e-mail bem formado, enum de status). Além de validar, é preciso **sanitizar**: normalizar e rejeitar campos que a API não espera (ex.: remover/rejeitar propriedades extras não declaradas no schema), evitando que dados não previstos cheguem ao domínio ou à persistência.
- **Validação de saída (output)**: o que a API responde também precisa seguir um contrato — evita vazar campos internos que não deveriam ser expostos (ex.: hash de senha, colunas técnicas) e garante que a resposta documentada na API é, de fato, a que é enviada.

## Decisão

Usaremos **Zod** para validar e sanitizar entradas (body, query, params) e saídas (responses) das rotas, com **DTOs** (via `nestjs-zod`, gerando classes a partir de schemas Zod) para formalizar os contratos, aplicados globalmente por um pipe de validação (`ZodValidationPipe`) no nível da aplicação.

## Justificativa

- O Zod permite validação forte, declarativa e legível, com um único schema descrevendo tanto o shape dos dados quanto as regras de validação (formato, obrigatoriedade, valores permitidos).
- Por padrão, `z.object()` já ignora chaves não declaradas no schema (e pode ser configurado para rejeitá-las explicitamente com `.strict()`), o que cobre a necessidade de sanitização de input sem exigir lógica adicional na aplicação.
- Os mesmos schemas usados para validar entrada são reaproveitados para descrever e validar a saída (response schemas), garantindo que a API nunca responda um payload fora do contrato documentado nem vaze campos internos que não fazem parte do schema de resposta.
- Os DTOs dos controllers ficam alinhados com a API pública e com a documentação (Swagger/OpenAPI gerado a partir dos schemas), evitando divergência entre o que é validado e o que é documentado.
- Aplicar a validação de forma centralizada (pipe global) reduz esforço de validação manual espalhado pelos controllers e melhora a previsibilidade: toda rota passa pelo mesmo mecanismo de validação/sanitização antes de alcançar a lógica de negócio.
- **Familiaridade da equipe**: os membros do grupo já têm experiência prévia com Zod em outros projetos, o que reduz a curva de aprendizado, acelera a entrega e diminui o risco de uso incorreto da ferramenta. 

## Alternativas consideradas

- **class-validator + class-transformer**: alternativa comum no ecossistema NestJS, mas descartada porque a equipe tem menos familiaridade com o padrão baseado em decorators e porque o Zod já cobre tanto validação de input quanto de output com uma única definição de schema, reaproveitável em outras camadas (ex.: tipagem inferida via `z.infer`).
- **Validação manual (if/throw nos controllers)**: descartada por espalhar regras de validação pelo código, dificultar reuso entre input/output e aumentar o risco de inconsistência entre o que é validado e o que é documentado.

## Consequências

- Os endpoints rejeitam (e sanitizam) payloads inválidos antes de entrarem no domínio, incluindo campos não previstos no schema.
- As respostas da API são validadas contra um schema de saída, reduzindo o risco de vazar dados internos não intencionais.
- A API pública se torna mais consistente e documentável, com o Swagger gerado diretamente a partir dos schemas Zod.
- As regras de contrato ficam centralizadas junto ao módulo, junto aos DTOs de entrada e saída de cada rota.
- A tipagem TypeScript dos DTOs é inferida diretamente do schema Zod, eliminando duplicação entre validação e tipos.

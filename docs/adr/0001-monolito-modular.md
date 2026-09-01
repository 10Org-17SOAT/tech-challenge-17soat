# ADR-0001: Adotar um monolito modular

- Status: Aceita
- Data: 2026-08-10

## Contexto

O sistema cobre múltiplos Bounded Contexts(ordem de serviço, pagamento, estoque, autenticação, onboarding e mecânico) que precisam evoluir de forma organizada. Diante disso, existe um dilema de granularidade: organizar tudo como um monolito tradicional, sem fronteiras internas, tende a acumular acoplamento acidental entre domínios e dificultar a manutenção conforme o sistema cresce. 

## Decisão

Adotaremos um **monolito modular**: um único processo e um único deploy, mas com o código organizado em módulos de domínio isolados por convenção e disciplina (fronteiras lógicas), não por processos ou serviços separados (fronteiras físicas). Cada módulo encapsula suas próprias regras de negócio e expõe apenas o que for intencionalmente público para os demais módulos.

## Justificativa

- Separar fronteiras lógicas (módulos) de fronteiras físicas (deploy) permite obter os principais benefícios de organização por domínio — baixo acoplamento, responsabilidade clara, evolução independente de cada área de negócio — sem pagar o custo operacional de uma arquitetura distribuída.
- Times pequenos e domínios ainda em consolidação se beneficiam de visibilidade total do sistema em um único repositório/processo, o que facilita debugging, testes de ponta a ponta e revisão de código.
- Comunicação entre módulos via chamadas locais (em vez de rede) elimina uma classe inteira de problemas prematuros: latência de rede, falhas parciais, serialização entre serviços.
- A separação lógica ainda impõe disciplina: cada módulo deve ter fronteiras bem definidas e comunicação explícita com os demais, evitando que o monolito degenere em uma base de código acoplada e difícil de evoluir.

## Alternativas consideradas

- **Monolito tradicional (sem módulos internos)**: descartado por tender ao acoplamento acidental entre domínios conforme o sistema cresce, dificultando localizar e alterar regras de negócio isoladamente.

## Consequências

- Os módulos se comunicam entre si por eventos de domínio, evitando chamadas diretas entre implementações internas e mantendo o acoplamento explícito e controlado.
- A organização por módulos de domínio passa a ser uma decorrência direta desta decisão, não uma escolha isolada (ver skill `modular-monolith` para as regras de fronteira entre módulos).
- A escolha do framework de aplicação (ver ADR-0002) deve favorecer suporte nativo a módulos e injeção de dependência, para que as fronteiras lógicas sejam fáceis de expressar e manter.
- Exige disciplina contínua da equipe para não deixar as fronteiras entre módulos se degradarem, já que nada impede, em tempo de execução, que um módulo acesse detalhes internos de outro — a separação é garantida por convenção de código, não pelo runtime.
- Caso no futuro surja necessidade real de escalar ou isolar um domínio específico, a separação lógica já existente facilita a extração de um módulo para um serviço dedicado.

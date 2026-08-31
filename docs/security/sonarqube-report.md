# Relatório de Vulnerabilidades — SonarQube (SonarCloud)

> **Projeto:** tech-challenge-17soat
> **Ferramenta:** SonarCloud (SonarQube Cloud) integrado via GitHub Actions
> **Dashboard:** <!-- TODO: link do projeto no SonarCloud -->
> **Data da análise inicial:** <!-- TODO -->
> **Data da análise final:** <!-- TODO -->

## 1. Metodologia

A análise estática de código foi realizada com o SonarCloud, executado automaticamente
pelo pipeline de CI (`.github/workflows/sonar.yml`) a cada push na branch `develop` e em
cada pull request. O pipeline executa os testes unitários com cobertura
(`npm run test:cov`) e envia o resultado ao SonarCloud junto com a análise estática.

**Escopo da remediação:** todas as *vulnerabilities* e todos os *security hotspots*
apontados pela ferramenta. *Bugs* foram corrigidos de forma oportunista; *code smells*
ficaram fora do escopo por não terem impacto de segurança.

O fluxo adotado:

1. **Snapshot inicial ("antes")** — análise da branch `develop` após a integração de
   todas as features.
2. **Ciclo de correção** — branch dedicada com as correções, revisada via pull request.
3. **Snapshot final ("depois")** — nova análise da `develop` após o merge das correções.

## 2. Análise inicial (antes das correções)

<!-- TODO: screenshot do dashboard (Overview) -->

| Métrica | Valor |
| --- | --- |
| Vulnerabilities | <!-- TODO --> |
| Security Hotspots | <!-- TODO --> |
| Bugs | <!-- TODO --> |
| Code Smells | <!-- TODO --> |
| Coverage | <!-- TODO --> |
| Security Rating | <!-- TODO --> |

### 2.1 Vulnerabilidades encontradas

<!-- TODO: uma linha por vulnerability -->

| # | Regra (Sonar) | Severidade | Arquivo | Descrição |
| --- | --- | --- | --- | --- |
| 1 | | | | |

### 2.2 Security hotspots encontrados

| # | Regra (Sonar) | Categoria | Arquivo | Descrição |
| --- | --- | --- | --- | --- |
| 1 | | | | |

## 3. Correções realizadas

<!-- TODO: uma seção por correção, referenciando o item da tabela acima -->

### 3.1 <!-- título da correção -->

- **Item:** #1 (seção 2.1)
- **Causa:** <!-- por que o código era vulnerável -->
- **Correção:** <!-- o que foi alterado -->
- **Commit/PR:** <!-- link -->

## 4. Análise final (depois das correções)

<!-- TODO: screenshot do dashboard (Overview) -->

| Métrica | Antes | Depois |
| --- | --- | --- |
| Vulnerabilities | | |
| Security Hotspots | | |
| Bugs | | |
| Code Smells | | |
| Coverage | | |
| Security Rating | | |

## 5. Conclusão

<!-- TODO: resumo do resultado e link do dashboard para verificação -->

# ADR-0006: Migrations compatíveis com a versão anterior (expand/contract)

- Status: Aceita
- Data: 2026-11-02

## Contexto

A pipeline de deploy (`.github/workflows/deploy.yml`, #129) aplica o schema antes de trocar a versão da API:

```
infra (terraform apply) ──► db-migrate (Job de migration) ──► deploy (rollout da API)
```

Entre o fim do `db-migrate` e o fim do rollout existe uma janela em que **os pods da versão anterior continuam atendendo, já com o schema novo**. O rolling update só remove um pod antigo depois que o novo fica pronto, e um rollout que falha deixa os pods antigos no ar indefinidamente. O mesmo vale para um rollback: a imagem anterior volta a rodar sobre o schema mais novo, porque migrations não são revertidas.

Se uma migration remover ou renomear uma coluna que o código anterior ainda usa, a versão antiga quebra durante essa janela. Isso pode acontecer num deploy que, de resto, está correto.

## Decisão

Toda migration precisa ser **compatível com o código da versão imediatamente anterior**. Mudanças incompatíveis são feitas em duas etapas (padrão *expand/contract*), cada uma no seu próprio deploy:

1. **Expand**: a migration só adiciona (tabela, coluna anulável ou com default, índice). O código novo passa a escrever no formato novo e continua aceitando o antigo.
2. **Contract**: num deploy **posterior**, quando nenhuma versão em produção depende mais do formato antigo, uma nova migration remove o que sobrou.

Na prática:

| Mudança | Como fazer |
|---|---|
| Adicionar coluna | Anulável ou com `DEFAULT`; `NOT NULL` só no deploy seguinte, depois de preencher. |
| Renomear coluna | Criar a nova, escrever nas duas e ler da nova; remover a antiga num deploy seguinte. |
| Remover coluna ou tabela | Primeiro um deploy que pare de usar; depois a migration que remove. |
| Mudar tipo de coluna | Coluna nova com o tipo novo, backfill, troca de leitura; remover a antiga depois. |
| Adicionar `NOT NULL`, `UNIQUE` ou FK | Só depois que os dados existentes e o código anterior já respeitam a regra. |

## Justificativa

- O rollout sem indisponibilidade depende de duas versões rodarem ao mesmo tempo sobre o mesmo banco, então o schema precisa servir às duas.
- Rodar a migration num Job separado, antes do rollout, faz uma migration com erro parar o deploy enquanto a versão anterior continua no ar. Isso só é seguro se a migration que **funcionou** não quebrar a versão anterior.
- O rollback vira só a troca da imagem: com migrations compatíveis, não é preciso reverter o schema, o que o drizzle não faz automaticamente.

## Alternativas consideradas

- **Migrations reversíveis (down) e rollback do schema**: descartada. O migrator do drizzle só aplica para frente, e um down que apaga colunas perde os dados escritos depois do deploy.
- **Parar a API durante o deploy** (`Recreate` em vez de rolling update): descartada. Troca o cuidado nas migrations por indisponibilidade em todo deploy, e um rollout que falha deixa o sistema fora do ar em vez de na versão anterior.
- **Migration no boot de cada pod, sem Job separado**: descartada como mecanismo principal. O primeiro pod novo migraria o banco enquanto os antigos ainda atendem, a mesma janela de hoje, mas sem uma etapa que pare o deploy quando a migration falha. O entrypoint continua migrando no boot como no-op de segurança, protegido por advisory lock (`scripts/migrate.ts`).

## Consequências

- Remover ou renomear algo no schema exige dois PRs, em deploys separados.
- Quem revisa um PR com migration confere se o código **anterior** continua funcionando com o schema novo, não só o código novo.
- Um rollback para a versão imediatamente anterior é sempre seguro do ponto de vista do schema. Voltar mais de uma versão pode não ser, se um *contract* já tiver sido aplicado.
- Vale para todas as migrations em `src/shared/config/database/migrations`, inclusive as geradas pelo `drizzle-kit`: o arquivo gerado precisa ser revisado à mão quando contém `DROP` ou `ALTER ... TYPE`.

```yaml
name: Relatório de Bug
description: Registre um problema encontrado no projeto.
title: "[Feat]: "
labels:
  - feat
  - triage
assignees: []

type: bug
body:
  - type: markdown
    attributes:
      value: |
        Obrigado por dedicar seu tempo para preencher este relatório de bug!

  - type: input
    id: contact
    attributes:
      label: Dados para contato
      description: Como podemos entrar em contato caso precisemos de mais informações?
      placeholder: ex. email@exemplo.com
    validations:
      required: false

  - type: textarea
    id: what-happened
    attributes:
      label: O que aconteceu?
      description: Descreva o problema encontrado e informe também o que você esperava que acontecesse.
      placeholder: Descreva o que aconteceu...
      value: "Ocorreu um problema..."
    validations:
      required: true

  - type: dropdown
    id: version
    attributes:
      label: Versão
      description: Qual versão do sistema você está utilizando?
      options:
        - 1.0.2 (Padrão)
        - 1.0.3 (Edge)
      default: 0
    validations:
      required: true

  - type: dropdown
    id: browsers
    attributes:
      label: Em quais navegadores o problema acontece?
      description: Selecione todos os navegadores nos quais você identificou o problema.
      multiple: true
      options:
        - Firefox
        - Google Chrome
        - Safari
        - Microsoft Edge

  - type: textarea
    id: logs
    attributes:
      label: Logs relevantes
      description: |
        Cole aqui qualquer log relevante para o problema.
        O conteúdo será formatado automaticamente como código, portanto não é necessário utilizar crases.
      render: shell

  - type: checkboxes
    id: terms
    attributes:
      label: Código de Conduta
      description: Ao enviar este issue, você concorda em seguir o Código de Conduta deste projeto.
      options:
        - label: Concordo em seguir o Código de Conduta deste projeto.
          required: true

  - type: textarea
    id: screenshots
    attributes:
      label: Capturas de tela
      description: Se aplicável, adicione capturas de tela que ajudem a explicar o problema.
    validations:
      required: false
```

# ---------------------------------------------------------------------------
# Provider AWS — integração segura, sem provisionar nada.
# Integração via cadeia padrão de credenciais; nenhum segredo em código.
# Regra: (bloco FECHADO) as camadas seguintes declaram o provider delas (helm,
#        kubernetes) em arquivo próprio; nunca acrescentam um segundo bloco ao
#        arquivo deste.
# ---------------------------------------------------------------------------
# Este bloco existe para que a integração
# com a AWS esteja correta e auditável desde já, sem custo e sem risco.

provider "aws" {
  region = var.aws_region

  # Guard de segurança contra o erro mais caro desta infraestrutura: um apply
  # na conta errada. `null` desativa o guard.
  #
  # O guard precisa do ternário porque uma lista vazia é rejeitada pelo schema do
  # provider (exige lista não vazia)
  # O ternário preserva os dois comportamento: lista preenchida = guard
  # ativo; lista vazia = guard desativado.
  allowed_account_ids = length(var.allowed_account_ids) > 0 ? var.allowed_account_ids : null

  # Tags comuns aplicadas a todo recurso de qualquer camada, sem repetição.
  # Consequência de consequência: quem cria um recurso NÃO repete Project,
  # Environment e ManagedBy, e declara apenas a tag `Name`.
  default_tags {
    tags = local.common_tags
  }

  # Deliberadamente AUSENTE, e cada ausência é uma decisão:
  #   access_key / secret_key / token  → credencial nunca em código (D-08). O
  #     provider usa a cadeia padrão: AWS_PROFILE, AWS_ACCESS_KEY_ID,
  #     AWS_WEB_IDENTITY_TOKEN_FILE (IRSA), ~/.aws/credentials.
  #   profile                         → impede que o estado fique preso ao
  #     perfil de quem rodou o apply.
  #   endpoints                       → um endpoint apontando para local não
  #     pode ser introduzido por engano.
  #   alias / assume_role             → a camada de rede pode declarar um
  #     provider próprio se precisar de role específica; não se mistura com
  #     o da fundação.
}

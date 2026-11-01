# ---------------------------------------------------------------------------
# AWS provider — secure integration, provisions nothing by itself.
# Integration through the default credential chain; no secret in code.
# Rule: (CLOSED block) later layers declare their own providers (helm,
#       kubernetes) in their own file; they never add a second block to this
#       file.
# ---------------------------------------------------------------------------
# This block exists so the AWS integration is correct and auditable from day
# one, at no cost and no risk.

provider "aws" {
  region = var.aws_region

  # Safety guard against the most expensive mistake in this infrastructure: an
  # apply against the wrong account. `null` disables the guard.
  #
  # The guard needs the ternary because the provider schema rejects an empty
  # list (it requires a non-empty one).
  # The ternary keeps both behaviors: filled list = guard on; empty list =
  # guard off.
  allowed_account_ids = length(var.allowed_account_ids) > 0 ? var.allowed_account_ids : null

  # Common tags applied to every resource of every layer, without repetition.
  # Consequence: whoever creates a resource does NOT repeat Project,
  # Environment and ManagedBy, and declares only the `Name` tag.
  default_tags {
    tags = local.common_tags
  }

  # Deliberately ABSENT, and each absence is a decision:
  #   access_key / secret_key / token  → credentials never in code (D-08). The
  #     provider uses the default chain: AWS_PROFILE, AWS_ACCESS_KEY_ID,
  #     AWS_WEB_IDENTITY_TOKEN_FILE (IRSA), ~/.aws/credentials.
  #   profile                         → keeps the state from being tied to the
  #     profile of whoever ran the apply.
  #   endpoints                       → an endpoint pointing at a local
  #     service cannot be introduced by mistake.
  #   alias / assume_role             → the network layer may declare its own
  #     provider if it needs a specific role; it does not mix with the
  #     foundation's.
}

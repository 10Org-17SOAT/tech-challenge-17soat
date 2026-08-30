Reviewer configuration for the ship-it pipeline.

```
reviewer: coderabbit
config: .coderabbit.yaml
watch: on
escalation: none
```

CodeRabbit reviews PRs targeting `main` and `develop` automatically. Its
`path_instructions` encode this repo's Clean Architecture / Modular
Monolith layer rules (see GUIDELINES.md) so violations are flagged inline
per layer (domain/application/infrastructure/presentation). Human review
is still required before merge; CodeRabbit reduces the first-pass triage
load, it does not replace approval.

CodeRabbit has no access to this repo's Claude Code skills (`/clean-architecture`,
`/modular-monolith`) or to GUIDELINES.md at review time — it only sees what is
literally written in `.coderabbit.yaml`. The `path_instructions` there are a
manual transcription of GUIDELINES.md's rules. Whoever edits GUIDELINES.md
must update `.coderabbit.yaml` in the same PR, or CodeRabbit will keep
enforcing the stale rule set.

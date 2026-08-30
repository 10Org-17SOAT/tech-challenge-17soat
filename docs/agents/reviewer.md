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

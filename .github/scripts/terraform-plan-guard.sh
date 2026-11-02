#!/usr/bin/env bash
# Refuses a Terraform plan that deletes or replaces anything.
#
#   terraform show -json plan.tfplan > plan.json
#   .github/scripts/terraform-plan-guard.sh plan.json
#
# The pipeline only creates and updates in place. Destroying or recreating a
# resource (the RDS instance, the VM, the EIP) loses data or changes addresses,
# so it is always done by hand, on purpose (infra/README.md, section 11).
#
# A replace shows up in the JSON plan as ["delete","create"] or
# ["create","delete"], so looking for "delete" catches both. Data source reads
# and no-ops pass.
#
# Exit codes: 0 = safe, 1 = deletes or replaces found, 2 = usage or bad input.
set -euo pipefail

plan_json=${1:?usage: terraform-plan-guard.sh <plan.json>}

if ! jq -e '.resource_changes | type == "array" or . == null' "$plan_json" > /dev/null 2>&1; then
  echo "::error::$plan_json is not a Terraform JSON plan (terraform show -json)."
  exit 2
fi

# One indented line per resource: "  <actions> <address>",
# e.g. "  delete,create aws_instance.k3s".
changes=$(jq -r '
  [.resource_changes // [] | .[]
   | select(.change.actions != ["no-op"] and .change.actions != ["read"])
   | "  \(.change.actions | join(",")) \(.address)"]
  | .[]' "$plan_json")

destructive=$(jq -r '
  [.resource_changes // [] | .[]
   | select(.change.actions | index("delete"))
   | "  \(.change.actions | join(",")) \(.address)"]
  | .[]' "$plan_json")

echo "Planned changes:"
echo "${changes:-  (none)}"

if [ -n "$destructive" ]; then
  echo
  echo "::error::The plan deletes or replaces resources; the pipeline never does that. Apply it by hand if it is intended (infra/README.md, section 11)."
  echo "$destructive"
  exit 1
fi

echo
echo "No deletes or replaces."

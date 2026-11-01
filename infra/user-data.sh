#!/bin/bash
# Template rendered by templatefile() in ec2.tf: every dollar-brace
# interpolation belongs to Terraform, comments included. A shell variable in
# that form needs the dollar sign doubled.
#
# Runs only once, on first boot, as root. Logs to
# /var/log/cloud-init-output.log.
set -euo pipefail

# Empty INSTALL_K3S_VERSION = the installer resolves the current stable version
# (open item C-09: pin `k3s_version` for a reproducible deployment).
#
# --tls-san: adds the public IP to the API server certificate. Without it,
# kubectl outside the VM rejects the connection, because the certificate only
# covers the internal IPs.
#
# Retry: the script runs only once, so a transient failure (DNS not ready yet,
# get.k3s.io or GitHub flaky) would leave the VM without a cluster forever. The
# whole attempt is repeated because the installer also downloads the binary,
# and rerunning the installer is safe.
for attempt in $(seq 1 10); do
  curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${k3s_version}" sh -s - server \
    --tls-san "${public_ip}" && exit 0
  echo "K3s install failed (attempt $attempt/10); retrying in 15s." >&2
  sleep 15
done

echo "K3s install failed after 10 attempts." >&2
exit 1

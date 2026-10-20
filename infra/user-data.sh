#!/bin/bash
# Template renderizado por templatefile() em ec2.tf: toda interpolação com
# cifrão e chaves é do Terraform, inclusive em comentário. Variável do shell
# nesse formato precisa do cifrão duplicado.
#
# Roda uma única vez, no primeiro boot, como root. Log em
# /var/log/cloud-init-output.log.
set -euo pipefail

# INSTALL_K3S_VERSION vazio = o instalador resolve a versão estável do momento
# (pendência C-09: fixe `k3s_version` para implantação reprodutível).
#
# --tls-san: inclui o IP público no certificado do API server. Sem isso o
# kubectl de fora da VM recusa a conexão, porque o certificado só vale para os
# IPs internos.
#
# Retry: o script roda uma vez só, então uma falha transitória (DNS ainda não
# pronto, get.k3s.io ou GitHub instáveis) deixaria a VM sem cluster para
# sempre. A tentativa inteira repete porque o instalador também baixa o
# binário, e rodar o instalador de novo é seguro.
for attempt in $(seq 1 10); do
  curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${k3s_version}" sh -s - server \
    --tls-san "${public_ip}" && exit 0
  echo "Instalação do K3s falhou (tentativa $attempt/10); nova tentativa em 15s." >&2
  sleep 15
done

echo "Instalação do K3s falhou após 10 tentativas." >&2
exit 1

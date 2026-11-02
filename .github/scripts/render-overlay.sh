#!/usr/bin/env bash
# Renders a kustomize overlay with the API image swapped for a registry image.
#
#   .github/scripts/render-overlay.sh k8s/overlays/aws <image> manifests.yaml
#
# The committed overlays keep the base image name (tech-challenge-api), so they
# render the same thing for whoever runs `kubectl apply -k` by hand. The image
# to deploy is set by a throwaway overlay on top, which lives inside the
# checkout because kustomize refuses absolute resource paths.
#
# The image must be immutable: a tag (the commit SHA) or a digest.
set -euo pipefail

overlay=${1:?usage: render-overlay.sh <overlay dir> <image> <output file>}
image=${2:?usage: render-overlay.sh <overlay dir> <image> <output file>}
output=${3:?usage: render-overlay.sh <overlay dir> <image> <output file>}

case "$image" in
  *@*)
    name="${image%@*}"
    pin="    digest: ${image#*@}"
    ;;
  *)
    # Only a colon after the last slash is a tag; one before it is a registry
    # port (localhost:5000/api).
    case "${image##*/}" in
      *:*) ;;
      *)
        echo "::error::Image '$image' has no tag or digest. Deploy an immutable tag, e.g. the commit SHA."
        exit 1
        ;;
    esac
    name="${image%:*}"
    pin="    newTag: ${image##*:}"
    ;;
esac

tmp=$(mktemp -d "$(dirname "$overlay")/.render-XXXXXX")
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/kustomization.yaml" <<YAML
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../$(basename "$overlay")
images:
  - name: tech-challenge-api
    newName: $name
$pin
YAML

kubectl kustomize "$tmp" > "$output"
grep -n 'image:' "$output"

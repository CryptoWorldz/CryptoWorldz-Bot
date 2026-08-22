#!/usr/bin/env bash
set -euo pipefail

gate="${1:-STATUS}"
result="${2:-PASS}"
echo "DEPLOYMENT_STATUS gate=$gate result=$result run=${GITHUB_RUN_ID:-local} sha=${GITHUB_SHA:-local}"

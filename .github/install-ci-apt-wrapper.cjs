const { execFileSync } = require('node:child_process');
const { writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

if (process.env.GITHUB_ACTIONS !== 'true') {
  process.exit(0);
}

const wrapper = `#!/usr/bin/env bash
set -euo pipefail
real=/usr/bin/apt-get
subcommand="\${1:-}"

if [ "$subcommand" != "update" ] && [ "$subcommand" != "install" ]; then
  exec "$real" "$@"
fi

for attempt in 1 2 3; do
  if [ "$subcommand" = "update" ]; then
    if /usr/bin/timeout 75s "$real" \
      -o Acquire::Retries=2 \
      -o Acquire::http::Timeout=15 \
      -o Acquire::https::Timeout=15 \
      -o Acquire::ForceIPv4=true \
      "$@"; then
      exit 0
    fi
  else
    if /usr/bin/timeout 180s "$real" \
      -o DPkg::Lock::Timeout=30 \
      -o Acquire::Retries=2 \
      -o Acquire::http::Timeout=15 \
      -o Acquire::https::Timeout=15 \
      -o Acquire::ForceIPv4=true \
      "$@"; then
      exit 0
    fi
    /usr/bin/dpkg --configure -a || true
  fi
  echo "CI_APT_RETRY attempt=$attempt subcommand=$subcommand" >&2
  sleep 3
done

exit 1
`;

const temp = join(process.env.RUNNER_TEMP || tmpdir(), `oneworldz-apt-get-${process.pid}`);
writeFileSync(temp, wrapper, { mode: 0o755 });
execFileSync('/usr/bin/sudo', ['/usr/bin/install', '-m', '0755', temp, '/usr/local/bin/apt-get'], { stdio: 'inherit' });
rmSync(temp, { force: true });
console.log('CI_APT_NETWORK_GUARD=INSTALLED');

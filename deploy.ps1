param(
  [string]$User = "ubuntu",
  [string]$Host = "124.223.182.79",
  [string]$RemoteBase = "/home/ubuntu/pxrecycle"
)

$ErrorActionPreference = "Stop"

# 1) Pack workspace (exclude heavy/unsafe stuff)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$pkg = "release-$stamp.tgz"
Write-Host "Packing → $pkg"
tar -czf $pkg `
  --exclude=".git" `
  --exclude="node_modules" `
  --exclude=".next" `
  --exclude=".env*" `
  --exclude="**/*.log" `
  *

# 2) Upload to server
Write-Host "Uploading to $User@$Host:~/$pkg"
scp $pkg "$User@$Host:~/$pkg"

# 3) Remote deploy (extract, install, build, symlink, pm2 reload)
$remote = @"
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
BASE="$RemoteBase"
REL="\$BASE/releases/\$STAMP"
PKG="\$HOME/$pkg"

mkdir -p "\$REL"
tar -xzf "\$PKG" -C "\$REL"

cd "\$REL"
# Install deps (server build ensures native modules match)
npm ci
# Load production env and build
export $(grep -v '^#' "\$BASE/.env.production" | xargs -d '\n' -I {} echo {})
npm run build

# Point current -> new release
ln -sfn "\$REL" "\$BASE/current"

# Ensure ecosystem file is present (from the upload)
# Reload (zero-downtime); create if not exists
pm2 startOrReload "\$BASE/current/ecosystem.config.cjs" --update-env
pm2 save

# Cleanup uploaded package
rm -f "\$PKG"
echo "Deployed to \$REL"
"@

Write-Host "Running remote deploy steps..."
ssh "$User@$Host" "bash -lc '$remote'"

# 4) Cleanup local package
Remove-Item $pkg -Force
Write-Host "Done. Visit: http://$Host:3000"
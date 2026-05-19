# =============================================================================
# auto-deploy.ps1 — 自动 git pull + prisma generate + build + pm2 重启/首次启动
#
# 用法（管理员 PowerShell 可选）：
#   .\scripts\auto-deploy.ps1
#   或复制到运行机如 C:\scripts\auto-deploy.ps1，按需改顶部参数。
#
# 与 ecosystem.config.cjs 配套：
#   - pm2 进程名默认为 pxrecycle（勿再用 recycle-app，除非你已改 ecosystem）
#   - 入库 → MaterialStorage + ChangeLog 依赖 Next 长驻进程内的 purchase-auto-sync；
#     需 DATABASE_URL、（可选）OPS_JWT_SECRET 等在 .env / .env.production
#   - MySQL 侧需已执行 prisma/sql/purchase_warehouse_sync_signal.sql（触发器 + 可选 EVENT）
# =============================================================================

param(
    [string] $ProjectPath = "D:\app\pxrecycle\recycle",
    [string] $AppName = "pxrecycle",
    [string] $GitBranch = "main",
    [string] $LogFile = "C:\scripts\deploy-log.txt"
)

$ErrorActionPreference = "Stop"

function Write-DeployLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$timestamp - $Message"
    Write-Host $line
    if (!(Test-Path (Split-Path $LogFile -Parent))) {
        New-Item -ItemType Directory -Path (Split-Path $LogFile -Parent) -Force | Out-Null
    }
    $line | Tee-Object -FilePath $LogFile -Append
}

try {
    Write-DeployLog "========== 开始部署 =========="
    Write-DeployLog "ProjectPath=$ProjectPath AppName=$AppName Branch=$GitBranch"

    if (!(Test-Path $ProjectPath)) {
        Write-DeployLog "ERROR: 项目目录不存在: $ProjectPath"
        exit 1
    }

    Set-Location $ProjectPath
    Write-DeployLog "进入项目目录: $ProjectPath"

    # 建议保留本地 .env / .env.production（勿提交仓库）；git clean -fd 会删未跟踪文件
    if (!(Test-Path ".env.production") -and !(Test-Path ".env")) {
        Write-DeployLog "WARN: 未找到 .env 或 .env.production，生产 DATABASE_URL 等将无法加载，应用可能起不来。"
    }

    # 运维登录 JWT：未配置时写入 .ops-jwt-secret，并同步到 .env.production（避免 OPS_JWT_SECRET is required）
    $opsSecretFile = Join-Path $ProjectPath ".ops-jwt-secret"
    $envProdPath = Join-Path $ProjectPath ".env.production"
    $opsSecret = $null
    if (Test-Path $opsSecretFile) {
        $opsSecret = (Get-Content $opsSecretFile -Raw).Trim()
    }
    if (-not $opsSecret) {
        $bytes = New-Object byte[] 32
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $opsSecret = ([BitConverter]::ToString($bytes)).Replace("-", "").ToLower()
        Set-Content -Path $opsSecretFile -Value $opsSecret -Encoding UTF8 -NoNewline
        Write-DeployLog "已生成运维 JWT 密钥: $opsSecretFile"
    }
    if (Test-Path $envProdPath) {
        $envText = Get-Content $envProdPath -Raw
        if ($envText -notmatch '(?m)^\s*OPS_JWT_SECRET\s*=') {
            Add-Content -Path $envProdPath -Value "`nOPS_JWT_SECRET=`"$opsSecret`""
            Write-DeployLog "已在 .env.production 追加 OPS_JWT_SECRET"
        }
    } elseif (Test-Path (Join-Path $ProjectPath ".env")) {
        $envPath = Join-Path $ProjectPath ".env"
        $envText = Get-Content $envPath -Raw
        if ($envText -notmatch '(?m)^\s*OPS_JWT_SECRET\s*=') {
            Add-Content -Path $envPath -Value "`nOPS_JWT_SECRET=`"$opsSecret`""
            Write-DeployLog "已在 .env 追加 OPS_JWT_SECRET"
        }
    }

    Write-DeployLog "清理 git 本地改动（reset --hard；clean 排除 .env* 以免删掉本机密钥）..."
    & git reset --hard HEAD
    if ($LASTEXITCODE -ne 0) { throw "git reset 失败" }
    # -e 保留未入库的本地环境文件；勿删 .env / .env.production，否则 DATABASE_URL 丢失
    # 排除 .next.deploy-backup：构建前会暂存于此，勿被 clean 删掉
    & git clean -fd -e .env -e .env.local -e .env.production -e .env.development -e .next.deploy-backup
    if ($LASTEXITCODE -ne 0) { throw "git clean 失败" }

    Write-DeployLog "git pull origin $GitBranch ..."
    & git pull origin $GitBranch
    if ($LASTEXITCODE -ne 0) {
        Write-DeployLog "ERROR: git pull 失败"
        exit 1
    }

    Write-DeployLog "安装依赖（优先 npm ci，无 lock 则用 npm install）..."
    if (Test-Path "package-lock.json") {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci 失败" }
    } else {
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install 失败" }
    }

    Write-DeployLog "Prisma generate（生成 generated/prisma 客户端，build 依赖）..."
    & npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-DeployLog "ERROR: npx prisma generate 失败"
        exit 1
    }

    # 构建前将 .next 挪走作备份：若 npm run build 失败，可恢复上一版产物（须在 git clean 之后，且 clean 已 -e 排除备份目录）
    $nextBackup = Join-Path $ProjectPath ".next.deploy-backup"
    Write-DeployLog "备份现有 .next → $nextBackup（若存在）..."
    if (Test-Path $nextBackup) {
        Remove-Item -Path $nextBackup -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path ".next") {
        Move-Item -Path ".next" -Destination $nextBackup -Force
    }

    Write-DeployLog "执行 npm run build..."
    $env:NODE_ENV = "production"
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-DeployLog "ERROR: npm run build 失败，尝试恢复上一版 .next"
        if (Test-Path ".next") {
            Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path $nextBackup) {
            Move-Item -Path $nextBackup -Destination (Join-Path $ProjectPath ".next") -Force
            Write-DeployLog "已恢复 .next，pm2 仍可使用旧构建；请修复构建错误后重新部署"
        }
        exit 1
    }
    if (Test-Path $nextBackup) {
        Remove-Item -Path $nextBackup -Recurse -Force -ErrorAction SilentlyContinue
        Write-DeployLog "构建成功，已删除部署备份 .next.deploy-backup"
    }

    $ecosystem = Join-Path $ProjectPath "ecosystem.config.cjs"
    if (!(Test-Path $ecosystem)) {
        Write-DeployLog "ERROR: 未找到 ecosystem.config.cjs，无法 pm2 启动"
        exit 1
    }

    Write-DeployLog "pm2：若进程已存在则 restart，否则 start ecosystem.config.cjs ..."
    $pm2Exists = $false
    try {
        $jlist = & pm2 jlist 2>$null
        if ($jlist) {
            $apps = $jlist | ConvertFrom-Json
            if ($apps -isnot [System.Array]) { $apps = @($apps) }
            if ($apps | Where-Object { $_.name -eq $AppName }) { $pm2Exists = $true }
        }
    } catch {
        $pm2Exists = $false
    }

    Set-Location $ProjectPath
    if ($pm2Exists) {
        & pm2 restart $AppName --update-env
        if ($LASTEXITCODE -ne 0) {
            Write-DeployLog "ERROR: pm2 restart $AppName 失败"
            exit 1
        }
        Write-DeployLog "已 pm2 restart $AppName --update-env"
    } else {
        & pm2 start ecosystem.config.cjs --update-env
        if ($LASTEXITCODE -ne 0) {
            Write-DeployLog "ERROR: pm2 start ecosystem.config.cjs 失败"
            exit 1
        }
        Write-DeployLog "已 pm2 start ecosystem.config.cjs（首次或进程不存在）"
        Write-DeployLog "提示: 可执行 pm2 save 使开机自启（需 pm2 startup 已配置）"
    }

    Write-DeployLog "========== 部署成功 =========="
    Write-DeployLog "入库同步链：PurchaseWarehouse 变更 →（DB 触发器）Signal.pending → Node instrumentation 调 syncMaterialStorageFromPurchase。请确认 MySQL 已执行 prisma/sql/purchase_warehouse_sync_signal.sql，且本机 pm2 进程常驻。"
}
catch {
    Write-DeployLog "ERROR: $($_.Exception.Message)"
    exit 1
}

#Requires -RunAsAdministrator
<#
  在运行 Next/PM2 的 Win10 电脑上以「管理员」打开 PowerShell，执行：
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    cd E:\pxrecycle   # 改成你的项目目录
    .\scripts\allow-inbound-port-3000.ps1

  作用：放行 TCP 3000 入站，解决同事机访问 http://本机IP:3000 一直转圈/超时。
#>

$RuleName = "PXRecycle Next.js TCP 3000 (inbound)"
$Existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
if ($Existing) {
  Write-Host "规则已存在: $RuleName — 跳过创建。"
  exit 0
}

New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Any
Write-Host "已创建防火墙入站规则: $RuleName"
Write-Host "请确认同事与该机在同一网段，且访问 http://<本机IP>:3000"

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Instale Node.js 24 ou superior.' }
if (-not (Test-Path -LiteralPath '.env')) { throw 'Copie web/.env.example para .env e configure DATABASE_URL antes de iniciar.' }
if (-not (Test-Path -LiteralPath 'node_modules/pg')) { throw 'Execute npm.cmd ci para instalar as dependencias.' }
$demoUrl = 'http://127.0.0.1:4180'
try {
    $existingResponse = Invoke-WebRequest -UseBasicParsing -Uri $demoUrl -TimeoutSec 2
    if ($existingResponse.Content -match 'Gest.o do condom.nio') {
        Write-Host "O painel ja esta rodando: $demoUrl"
        return
    }
} catch {}
& $nodeExecutable --env-file=.env web/setup.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o banco. Confira o arquivo .env e a conexao.' }
& $nodeExecutable scripts/build-web.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha no build do painel.' }
& $nodeExecutable --env-file=.env dist/painel/web/server.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar. Verifique porta, banco e configuracao.' }

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $nodeExecutable)) {
    throw 'Node.js nao encontrado. Instale Node.js 24 ou superior e execute novamente.'
}
& $nodeExecutable -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if ($LASTEXITCODE -ne 0) { throw 'Use Node.js 24 ou superior.' }
& $nodeExecutable scripts/build.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha no build.' }
& $nodeExecutable --test prototype/delivery-server.test.mjs whatsapp-estudos-export/waha/bridge.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes.' }
$demoPort = 4173
if ($env:PORT) {
    if (-not [int]::TryParse($env:PORT, [ref]$demoPort) -or $demoPort -lt 1 -or $demoPort -gt 65535) {
        throw 'PORT deve ser um numero entre 1 e 65535.'
    }
}
$demoUrl = "http://127.0.0.1:$demoPort"
$existingResponse = $null
try {
    $existingResponse = Invoke-WebRequest -UseBasicParsing -Uri $demoUrl -TimeoutSec 3
} catch {
    $existingResponse = $null
}
if ($existingResponse -and $existingResponse.Content -match 'Central de apresenta' -and $existingResponse.Content -match 'acompanhamento-entregas.html') {
    Write-Host "A central ja esta rodando: $demoUrl"
    Write-Host 'Abra esse endereco no navegador. Nenhum segundo servidor foi iniciado.'
    Write-Host 'Para carregar alteracoes no servidor ou no ambiente, pare a instancia original com Ctrl+C e execute novamente.'
    return
}
Write-Host "Abra a central: $demoUrl. Ctrl+C para parar."
& $nodeExecutable dist/prototype/delivery-server.mjs
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel iniciar a demonstracao. Verifique a porta e a configuracao do n8n. Se a porta estiver ocupada por outro servico, defina PORT=4174 e execute novamente.' }

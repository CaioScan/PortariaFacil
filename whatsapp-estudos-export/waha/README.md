# WAHA, n8n e Groq para estudos

Ponte local que recebe eventos do WAHA, envia o texto de um comando ao n8n
por HTTPS e devolve a resposta da Groq ao WhatsApp.

O repositório não inclui telefone vinculado, sessão autenticada, tokens,
credenciais do n8n nem capturas do ambiente local. Cada instalação configura
suas próprias credenciais e vincula seu WhatsApp por QR Code.

WAHA é um cliente não oficial; o projeto informa que existe risco de bloqueio
 da conta. Documentação: https://waha.devlike.pro/docs/overview/quick-start/

## Preparar uma instalação nova

Instale e abra o Docker com suporte a containers Linux. No PowerShell, dentro
 da pasta `waha`:

```powershell
$wahaConfig = Join-Path $env:LOCALAPPDATA 'WAHA-Estudos'
New-Item -ItemType Directory -Force -Path $wahaConfig | Out-Null
docker pull devlikeapro/waha:latest
docker run --rm -v "${wahaConfig}:/app/env" devlikeapro/waha:latest init-waha /app/env
Copy-Item -LiteralPath ./bridge.env.example -Destination (Join-Path $wahaConfig 'bridge.env')
```

Execute a inicialização apenas em instalação nova. O `init-waha` gera `.env`
com as credenciais do WAHA, painel e Swagger na pasta privada. Não publique
esse arquivo nem a saída do comando.

O Compose usa `%LOCALAPPDATA%/WAHA-Estudos` por padrão no Windows. Para outro
sistema ou diretório, defina `WAHA_CONFIG_DIR` com o caminho absoluto da pasta
privada que contém `.env` e `bridge.env`.

## Configurar a ponte

Edite a cópia privada de `bridge.env`, seguindo `bridge.env.example`:

- `WAHA_API_KEY`: chave gerada pela sua instalação do WAHA.
- `N8N_WEBHOOK_KEY`: chave aleatória para a credencial Header Auth do n8n.
- `WAHA_HOOK_SECRET`: outra chave aleatória para autenticar os eventos locais.
- `N8N_WEBHOOK_URL`: URL HTTPS de produção do seu próprio fluxo n8n.
- `BOT_ENABLED`: mantenha `false` até concluir a vinculação e os testes.
- `TEST_GROUP_ID`: vazio para usar somente a conversa consigo mesmo.

Use chaves independentes com pelo menos 32 caracteres. O token da Groq fica
na credencial Groq do n8n, separado destas chaves.

```powershell
docker compose up -d
```

Abra http://127.0.0.1:3000/dashboard, entre com as credenciais locais,
crie a sessão `default` e vincule o WhatsApp por QR Code em
**Dispositivos conectados**. O WAHA só publica porta no próprio computador;
a ponte não publica portas. A sessão fica no volume Docker `sessions`,
fora dos arquivos versionados.

## Configurar o n8n

Monte um fluxo com esta sequência:

1. **Webhook**: POST, caminho `waha-estudos-groq`, autenticação Header Auth,
   cabeçalho `X-Study-Key` com o valor privado de `N8N_WEBHOOK_KEY`; resposta
   por um nó Respond to Webhook.
2. **Code**: valide `body.text` como texto não vazio de até 2000 caracteres
   e devolva esse texto em `chatInput`.
3. **Basic LLM Chain**: use `chatInput` como entrada e conecte um
   **Groq Chat Model** com sua credencial e um modelo disponível na conta.
4. **Respond to Webhook**: devolva JSON `{"reply":"resposta do modelo"}`,
   usando o campo `text` produzido pela cadeia.

Teste o fluxo, publique-o e configure sua URL de produção na ponte.
Somente o texto do comando é encaminhado ao n8n/Groq, sem telefone ou histórico.

Na sessão do WAHA, cadastre um webhook com URL `http://bridge:3001/events`,
evento `message.any` e cabeçalho `X-Relay-Key` com o valor privado de
`WAHA_HOOK_SECRET`. Preserve as demais configurações da sessão ao atualizá-la.

Depois dos testes, altere `BOT_ENABLED=true` na configuração privada:

```powershell
docker compose up -d --no-deps bridge
```

## Uso e limites

Envie `!ia explique o que é uma API` na conversa consigo mesmo. Com
`TEST_GROUP_ID` vazio, mensagens de outras pessoas e grupos são ignoradas.
Se configurar explicitamente um grupo autorizado, comandos `!ia` de todos
os participantes desse grupo serão aceitos e respondidos nele.

Respostas recebem o prefixo `🤖`. Mensagens da API, mensagens sem comando e
eventos antigos são ignorados para evitar ciclos. Há limite de 100 comandos
por dia por processo, intervalo mínimo de 3 segundos e deduplicação em memória.
Reiniciar a ponte reinicia esses limites e o cache. Falhas de envio não são
repetidas automaticamente. O computador e o Docker precisam permanecer ligados.

## Verificação e parada

```powershell
docker compose run --rm --no-deps -v './bridge.test.mjs:/app/bridge.test.mjs:ro' bridge node --test bridge.test.mjs
docker compose stop bridge
```

Para parar tudo preservando a sessão:

```powershell
docker compose down
```

O `.gitignore` exclui credenciais, sessões e capturas locais. Os identificadores
nos testes são fictícios. Revise o conteúdo preparado antes de qualquer commit.

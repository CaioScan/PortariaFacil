# Demos CondoBot — Portaria Fácil

Protótipos HTML fornecidos pelo proponente para discussão da experiência. O nome CondoBot e o conteúdo dos arquivos foram preservados; os nomes dos arquivos foram simplificados para facilitar os links.

| Demo | Arquivo | Experiência |
| --- | --- | --- |
| Painel do síndico | [painel-sindico.html](painel-sindico.html) | Chamados, encomendas, reservas, avisos, métricas e mural. |
| Acompanhamento de entregas | [acompanhamento-entregas.html](acompanhamento-entregas.html) | Registro, reaviso, retirada e histórico de tentativas com integração opcional ao n8n. |
| Morador + Síndico | [demo-morador-sindico.html](demo-morador-sindico.html) | Conversa simulada com chamados, reservas, financeiro e contato com síndico. |
| Onboarding | [onboarding.html](onboarding.html) | Cadastro do condomínio e etapas simuladas de conexão. |
| Painel de Comunicação | [painel-comunicacao.html](painel-comunicacao.html) | Destinos dos avisos, aprovação e mural interno. |

## Visualização

O GitHub mostra o código dos HTMLs. Para interagir, baixe cada arquivo pelo botão **Download raw file** ou baixe o repositório e abra os HTMLs no navegador. As simulações locais não exigem instalação de dependências.

Veja também a [explicação de como funciona o acompanhamento de entregas e sua integração com o n8n](./COMO-FUNCIONA.md).

Para iniciar o acompanhamento de entregas com a API local, use Node.js 24 ou superior:

```powershell
node prototype/delivery-server.mjs
```

Abra `http://127.0.0.1:4173`. Sem configuração, o painel usa dados demonstrativos e não envia avisos. As alterações ficam no armazenamento local do navegador.

### Integração n8n

Importe [n8n-workflow-entregas.json](../whatsapp-estudos-export/n8n-workflow-entregas.json) no n8n e crie uma credencial **Header Auth** com o nome `X-Delivery-Key` e uma chave aleatória de pelo menos 32 caracteres. Ative o workflow e configure a URL do webhook e a mesma chave no servidor local. Em PowerShell:

```powershell
$env:N8N_DELIVERY_WEBHOOK_URL = 'https://seu-n8n.example/webhook/portaria-entregas'
$env:N8N_DELIVERY_WEBHOOK_KEY = 'sua-chave-aleatoria-com-pelo-menos-32-caracteres'
node prototype/delivery-server.mjs
```

Para n8n local, a URL pode usar `http://localhost`, `http://127.0.0.1` ou `http://host.docker.internal`; destinos remotos precisam de HTTPS. A chave fica no processo Node e não é entregue ao navegador.

O workflow de demonstração valida e confirma o recebimento do evento, mas não envia WhatsApp nem persiste encomendas. A tela registra os dados no `localStorage`; o backend de produção ainda deve autorizar o destinatário, persistir a encomenda e controlar o histórico antes de solicitar avisos. O n8n não deve ser tratado como fonte de verdade.

O preenchimento assistido do onboarding depende da API `claude.use` do ambiente onde o demo foi criado e pode não funcionar em navegador comum. Os formulários permitem preenchimento manual. Os botões de conexão e a conclusão do cadastro não comprovam conexão com WhatsApp ou agenda.

## Limites e MVP

Os demos HTML originais usam dados de exemplo e não possuem backend ou autenticação real. O acompanhamento de entregas salva exemplos no navegador e pode encaminhar eventos sintéticos ao workflow n8n, mas não envia mensagens WhatsApp. Indicadores, boletos, horários disponíveis e o retorno em 24 horas úteis são ilustrativos.

O MVP prioriza **avisos de encomendas e chamados**, conforme [processo e escopo](../docs/produto/processo-e-escopo.md). Reservas, financeiro, agenda, comunicação coletiva e mural representam evolução futura. Ainda é necessário registrar validação com usuários reais.

## Origem

| Arquivo recebido | Arquivo publicado |
| --- | --- |
| CondoBot — Painel do síndico.html | painel-sindico.html |
| Demo_ CondoBot — Morador + Síndico.html | demo-morador-sindico.html |
| Onboarding — CondoBot.html | onboarding.html |
| Painel de Comunicação — CondoBot.html | painel-comunicacao.html |

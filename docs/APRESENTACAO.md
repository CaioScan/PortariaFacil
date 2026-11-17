# Apresentação local — Portaria Fácil

## Preparar e iniciar

Use Node.js 24 ou superior. A demonstração não exige instalação de pacotes npm. Na raiz deste repositório:

```powershell
.\apresentar.ps1
```

O script encontra o Node no PATH ou no runtime local do Codex, valida/empacota as telas em `dist/`, executa os testes e inicia a central em **http://127.0.0.1:4173**. Se a política local bloquear scripts, execute os comandos npm abaixo em vez de alterar a política do computador.

Com Node/npm disponíveis no PATH, os passos também podem ser mostrados separadamente:

```powershell
npm run build
npm test
npm run start:dist
```

O projeto é HTML/JavaScript com Node.js: o build verifica sintaxe dos scripts, valida o JSON dos workflows e empacota páginas/servidor. Não gera APK nem compila C#. A versão MAUI anterior é outro projeto e não faz parte desta apresentação.

`dist/` é gerado localmente e não vai para o Git. Não contém as credenciais ou os arquivos de sessão do WhatsApp. Para reconstruí-lo, execute o build.

## Roteiro de demonstração (aproximadamente 7 minutos)

1. Mostre o build e os testes no terminal e explique o problema do caderno/interfone e dos relatos sem acompanhamento.
2. Abra a central e selecione **Entregas**. Use os dados demonstrativos; registre uma encomenda fictícia, confira o estado do aviso, reavise e confirme a retirada com nome do recebedor. Recarregue para mostrar a persistência neste navegador.
3. Selecione **Morador e chamados** e percorra “Reportar um problema”. Mostre o protocolo e a atualização do painel dentro da mesma simulação.
4. Selecione **Painel do síndico** e altere o status de um chamado de exemplo. Explique que esta tela não recebe dados dos outros demos.
5. Mostre **Cadastro do condomínio** com preenchimento manual. Conexões são simuladas e a IA do onboarding depende do ambiente original.
6. Mostre **Comunicação** como evolução futura, junto a reservas e financeiro presentes nos demos.
7. Feche com o escopo do MVP e as integrações que ainda precisam ser concluídas.

## n8n e WhatsApp

Sem variáveis de webhook, o acompanhamento de entregas roda em demonstração e não envia eventos externos. O modo configurado encaminha o evento ao n8n e valida a confirmação recebida; não comprova envio ou leitura de WhatsApp.

Para demonstrar n8n real, configure antes da execução as variáveis `N8N_DELIVERY_WEBHOOK_URL` e `N8N_DELIVERY_WEBHOOK_KEY` conforme [o guia](../prototype/README.md). Não mostre a chave na apresentação. Credenciais não são necessárias para o modo local.

O estudo WAHA/n8n/Groq é separado do fluxo de entregas. Não ligue o bot durante a apresentação como se já notificasse moradores automaticamente. Os testes automatizados usam substitutos locais, sem enviar mensagens.

## Encerrar e resolver problemas

- **Parar:** Ctrl+C no terminal do servidor.
- **Central já iniciada:** o script detecta a página existente, informa seu endereço e termina sem iniciar outro servidor. Para aplicar mudanças no servidor ou nas variáveis de ambiente, pare a instância original e inicie novamente.
- **Porta ocupada:** consulte a central existente ou defina `$env:PORT='4174'` e inicie novamente, abrindo a mesma porta no navegador. O script respeita PORT.
- **Configuração parcial do n8n:** complete URL/chave ou remova as variáveis do terminal para usar demonstração local.
- **Restaurar entregas:** o botão de restauração substitui somente os dados demonstrativos de entregas deste navegador; use-o apenas após conferir que são dados de teste.
- **Dados entre telas:** somente entregas usa localStorage. As outras páginas reiniciam seus exemplos ao recarregar; não há base compartilhada.

O fluxo em URL pública, autenticação real, persistência compartilhada e adaptação de WhatsApp aos chamados/encomendas continuam pendentes. Esta entrega organiza e executa os protótipos existentes para apresentação.

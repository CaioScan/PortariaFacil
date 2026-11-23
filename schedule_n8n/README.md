# Schedule n8n — configuração local e segurança

Workflow experimental da PR #6 para encomendas e chamados. O export é entregue **inativo**: configure credenciais, valide em ambiente de teste e só então ative manualmente. Não substitui a aprovação independente da PR.

## Credenciais fora do Git

1. Copie `.env.example` para `.env` nesta pasta (ignorado pelo Git).
2. Preencha valores novos, aleatórios e diferentes para PostgreSQL, Redis, API WAHA e dashboard. O Compose recusa inicialização se algum estiver vazio.
3. No n8n, configure as credenciais de PostgreSQL, Redis, WAHA e Gemini. Para o nó **Baixar Imagem1**, selecione uma credencial **Header Auth**, com Name `X-Api-Key` e Value igual à nova chave WAHA. O segredo fica no cofre do n8n, não no export.
4. Valide com `docker compose --env-file .env config --quiet` e inicie com `docker compose --env-file .env up -d` a partir desta pasta.

As portas publicadas escutam somente em `127.0.0.1`. Dentro da rede Docker, n8n acessa os serviços pelos nomes `postgres`, `redis` e `waha`. Não exponha essas portas por proxy/túnel nem publique este ambiente sem autenticar o webhook, configurar HTTPS e revisar permissões.

**Credenciais antigas já apareceram no histórico público. É necessário rotacioná-las nos serviços e atualizar o cofre n8n.** Remover do commit atual não revoga uma chave. Esta alteração não troca senhas de instalações existentes e não reescreve o histórico. No PostgreSQL com volume existente, mudar `POSTGRES_PASSWORD` no Compose não altera a senha do usuário já criado: faça a alteração administrativa correspondente e atualize os clientes. Não apague volumes para trocar senhas. Faça backup e planeje reinícios para aplicar as demais mudanças.

## Proteção de encomendas

- A identidade vem do webhook WAHA e do cadastro consultado em **Filtra Morador**, não da IA. IDs `@lid` sem telefone resolvido são recusados. Telefones brasileiros são comparados integralmente após normalização do DDI, não pelos dez últimos dígitos.
- Não existe fallback para encomendas de outros moradores.
- Uma pendência do remetente pode ser selecionada sem código. Com várias pendências, informe `RETIREI 1234` ou `RETIREI <protocolo UUID>`. Código duplicado também é tratado como ambiguidade; o UUID pode desambiguar.
- Comandos de retirada são explícitos. `não recebi` e texto ambíguo não registram retirada. A IA não fornece nem a autorização nem o código de seleção.
- A gravação revalida morador ativo, vínculo pela unidade completa, código, protocolo e status pendente. Uma retirada concorrente ou repetida não confirma novamente.
- Falta de correspondência ou ambiguidade não altera encomendas; o morador recebe orientação para informar o código/protocolo.

## Verificação

`npm test` na raiz executa as regressões sem precisar de WhatsApp ou IA. Para executar também a integração PostgreSQL em schema temporário isolado:

```powershell
node --env-file-if-exists=.env --test schedule_n8n/seguranca.test.mjs
```

Nesse comando, `.env` é o arquivo privado da raiz do repositório com `DATABASE_URL`, não o arquivo Compose desta pasta. O teste não usa nem altera tabelas `public`: cria e remove exclusivamente seu próprio schema aleatório `pf_sched_test_*`.

Os testes conferem o código embutido no export e executam as queries de seleção/baixa com dados sintéticos. Não demonstram importação/ativação no n8n, autenticação efetiva do WAHA, entrega de mensagens, OCR ou triagem de chamados. A rotação de segredos e o teste ponta a ponta continuam sendo tarefas do operador.

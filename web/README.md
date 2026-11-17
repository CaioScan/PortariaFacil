# Painel Portaria Fácil

Site operacional em Node.js 24 e PostgreSQL/Neon. Interface inspirada na referência [Positivus](https://www.figma.com/community/file/1230604708032389430). Tipografia Space Grotesk distribuída com licença OFL em `public/FONT-LICENSE.txt`.

## Executar localmente

Na raiz do repositório:

```powershell
npm.cmd ci
# Apenas em instalação nova: copie web/.env.example para .env e configure a conexão privada.
npm.cmd run web:setup
npm.cmd run web:build
npm.cmd run web:start:dist
```

Abra **http://127.0.0.1:4180**. O inicializador `iniciar-painel.ps1` também prepara o banco, faz build e inicia o painel. Se já houver um painel na porta padrão, informa o endereço existente. Para usar outra porta ou ambiente, use os comandos npm e ajuste WEB_PORT/APP_ORIGIN. Ctrl+C encerra o processo.

O setup cria o administrador somente se não existir. O acesso inicial é salvo em `acesso-local.txt`, excluído do Git, e a senha não é impressa no terminal. ADMIN_PASSWORD permite definir uma senha inicial de pelo menos 10 caracteres. Rodar o setup novamente não redefine uma senha existente.

## Funcionalidades

- Login de administrador e síndico, senha scrypt, sessão no banco com cookie HttpOnly/SameSite, proteção de origem e token CSRF.
- Cadastro, consulta, edição, desativação e exclusão de moradores sem histórico.
- Unidades com bloco, andar e apartamento; cadastros existentes são descobertos da base.
- Cadastro, edição, desativação e exclusão de síndicos; criação de conta e registro em responsaveis na mesma transação.
- Encomendas com morador selecionado por unidade, transportadora, descrição, rastreio, código de retirada e confirmação do recebedor.
- Chamados com solicitante opcional, local, descrição, responsável, status, solução, reabertura e histórico das alterações feitas no painel.
- Consulta com busca, filtros e atualização a cada 30 segundos (pausada em formulário aberto/aba oculta).
- Upload CSV/XLSX de moradores com prévia, erros por linha, confirmação explícita e importação transacional.

## Banco existente e compatibilidade

`DATA_SCHEMA=public` utiliza **as tabelas fornecidas pelo proponente**: `moradores`, `responsaveis`, `encomendas` e `chamados`. Moradores são lidos diretamente; não há cópia periódica para uma segunda tabela de moradores.

São preservadas as regras existentes: **um cadastro por bloco + andar + apartamento** e WhatsApp único. Não é possível cadastrar vários moradores na mesma combinação com essa estrutura. O painel não remove nem recria tabelas existentes, não substitui triggers e não altera essas restrições.

O schema `DATABASE_SCHEMA=portaria_facil` guarda autenticação, unidades ainda sem morador, autorização de WhatsApp/e-mail, descrição/rastreio/recebedor de encomenda e local/solução/histórico de chamado. Essas informações complementares não existem na estrutura original. Alterar a chave do morador fora do painel pode desassociar o e-mail/autorização complementares; os vínculos nativos de encomendas/chamados seguem a FK existente.

A base pública não possui coluna de condomínio. Por isso ela fica vinculada a **um único condomínio** em `native_binding`; outras contas/condomínios não recebem acesso automático a essa base. Não apresentar esta versão como SaaS multi-condomínio completo.

Encomendas usam `AGUARDANDO_RETIRADA` e `RETIRADA`. Chamados usam `ABERTO`, `EM_ANDAMENTO`, `RESOLVIDO`, `CANCELADO`. Novas entradas feitas pela integração nessas tabelas aparecem ao atualizar. Os históricos complementares registram apenas ações do painel; não inventam auditoria de eventos anteriores.

Houve uma conciliação única dos moradores inicialmente cadastrados no schema privado do painel para a base existente, sem sobrescrever chaves ou WhatsApp. As tabelas privadas antigas foram preservadas como legado e não são a fonte das listas atuais.

## Importação de moradores

Em **Moradores → Importar planilha**, baixe o modelo CSV, preencha e envie. CSV deve usar UTF-8 (separador `;`, vírgula ou tabulação); Excel deve ser `.xlsx` e a primeira aba será lida. Limites: **2 MB e 500 registros** por envio. Use células de texto para manter zeros iniciais de telefone, andar e apartamento.

Colunas: `nome`, `bloco`, `andar`, `apartamento`, `whatsapp`, `email`, `endereco`, `complemento`, `ativo`, `autoriza_whatsapp`. Nome, apartamento e WhatsApp são obrigatórios; bloco/andar vazios representam unidade sem esses identificadores. Use `sim`/`não` nas duas últimas colunas. Ativo vazio assume sim; autorização vazia assume não.

A prévia não grava moradores. Duplicados por chave composta ou WhatsApp são ignorados, sem atualizar existentes. Qualquer erro de validação impede confirmar o lote. Confirme também a criação das unidades novas antes de salvar. Os dados validados ficam em lote temporário vinculado ao operador por 15 minutos; a confirmação é transacional e não pode ser repetida. Lotes expirados são removidos no próximo upload. Não enviar dados reais em arquivos para o Git.

## Testes e build

```powershell
npm.cmd run web:check
npm.cmd run web:test
npm.cmd run web:build
```

Testes de integração com DATABASE_URL usam um schema temporário exclusivo `pf_test_...`, dados fictícios e remoção somente desse schema. Sem DATABASE_URL, os testes de banco são pulados. Nenhum teste envia WhatsApp ou altera os 50 cadastros originais da base pública.

O build gera `dist/painel/` por lista explícita de arquivos. Não inclui `.env`, senhas, sessões, screenshots ou moradores. JavaScript é validado e empacotado; não existe compilação de APK nesta etapa.

## Preparação para publicação

O pacote contém interface e API Node.js. No destino, configure DATABASE_URL como segredo, APP_ORIGIN com a URL HTTPS, WEB_HOST=0.0.0.0 e PORT/WEB_PORT conforme a hospedagem. Cookies Secure são habilitados com APP_ORIGIN HTTPS. Instale dependências com `npm ci`, execute o setup de forma controlada e inicie o servidor. Não publique a senha/URL do banco no frontend.

A publicação no site do GPT será avaliada na próxima etapa: precisa manter um backend compatível, conexão privada com PostgreSQL e testes dos fluxos após o deploy. Copiar somente os HTMLs não mantém login ou gravações. Exportação estática não é equivalente ao painel operacional.

## Limites atuais

O painel não envia WhatsApp, não faz interpretação por IA e não configura WAHA automaticamente. Esses fluxos precisam de integração própria; registrar cadastro, encomenda ou chamado não equivale a avisar alguém. Responsáveis existentes sem conta de operador podem ser atribuídos a chamados, mas não ganham login automaticamente. O administrador controla os acessos de síndicos; não há recuperação automática de senha ou cadastro público.

A conexão compartilhada na conversa deve ser rotacionada no Neon antes de disponibilizar o ambiente a terceiros; atualize somente o segredo privado após a troca.

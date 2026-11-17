# Painel PostgreSQL — implementação local

Data: 16/11/2026. Solicitação: novo CRUD de moradores/síndicos, entrada de encomendas no banco informado, visual semelhante ao Positivus, upload de moradores e opção de chamados. Publicação será tratada em etapa posterior.

## Decisões e intervenção do proponente

A implementação começou com tabelas privadas separadas. O proponente informou que já existiam moradores e forneceu o DDL. Foi confirmada a presença de 50 moradores em `public.moradores`. A leitura/gravação foi corrigida para usar diretamente essa estrutura, preservando os cadastros existentes e suas restrições de chave composta e WhatsApp único.

Um morador cadastrado no painel durante a primeira versão foi conciliado com a base pública sem sobrescrever cadastros, e a conciliação foi marcada para não se repetir. As tabelas privadas iniciais foram preservadas como legado. Autenticação e campos complementares ficam no schema privado, separados da fonte dos cadastros.

Como a estrutura fornecida não tem condomínio nos registros públicos, o painel vincula essa base a um único condomínio e bloqueia outros vínculos. Não foi removida a restrição de um cadastro por bloco/andar/apartamento.

## Trabalho realizado

- API Node.js com PostgreSQL/Neon via TLS, consultas parametrizadas e transações.
- Login, hash de senha, cookies de sessão no banco, CSRF e limite de tentativas de acesso.
- Moradores/unidades, síndicos com conta de acesso e vínculo em responsaveis, encomendas com retirada e chamados com responsável/status/solução/histórico.
- Upload CSV/XLSX em worker limitado, validação por linha, prévia, confirmação única e deduplicação sem sobrescrever existentes.
- Interface responsiva inspirada no Positivus; fonte local com licença incluída.
- Build do painel por lista explícita, iniciante PowerShell e documentação de execução/publicação.

## Validação e limites

Testes de domínio e integração usam dados fictícios em schema temporário exclusivo. Foram verificados CRUD, restrições, isolamento, sessões, acesso direto à tabela existente, importação e retirada. Um teste encontrou uma ambiguidade de tipo SQL na atualização de chamado; foi corrigida com tipo explícito no parâmetro de status.

Verificação no navegador: login, navegação, formulário, visualização em celular, prévia de upload XLSX e logout. A prévia de teste não foi confirmada na base pública. Não foram enviados WhatsApps, nem feitas chamadas de IA.

As credenciais estão somente em arquivos privados ignorados pelo Git e variáveis de ambiente. Envio WhatsApp e interpretação de relatos por IA continuam pendentes de ligação ao painel.

## Publicação e versionamento

Após a implementação local, o proponente solicitou publicação no GPT Sites. A adaptação para Cloudflare Workers usa o driver Neon serverless e conserva a base existente. Foram conferidos login, navegação, prévia XLSX e logout no navegador, além de gravações de moradores, síndicos, encomendas/retiradas, chamados/solução e importação transacional em schema temporário isolado. A publicação privada foi concluída em https://portaria-facil-gestao.scannn.chatgpt.site.

O proponente solicitou em seguida commit no GitHub. O painel local, a central de demonstração e a cópia sanitizada da adaptação Sites são preparados em branch de funcionalidade e PR para revisão. Arquivos de ambiente, credenciais, banco, sessões e screenshots não integram o commit. Nenhuma aprovação acadêmica é inferida do deploy ou dos testes.

# Portaria Fácil no GPT Sites

Fonte sanitizada da versão publicada em https://portaria-facil-gestao.scannn.chatgpt.site. O repositório de fonte gerenciado pelo Sites é separado deste GitHub; um push no GitHub não publica automaticamente uma nova versão do Site. Para atualizar o Site, use seu project_id existente no manifest e o fluxo de publicação do Sites.

Após `npm ci`, execute `npm run build`. O arquivo `worker/assets.generated.mjs` é gerado pelo build e não precisa ser editado nem versionado nesta cópia.

Adaptação do painel existente: interface Positivus, login, PostgreSQL Neon, moradores, síndicos, encomendas, chamados e importação CSV/XLSX.

O Site é privado por padrão e usa a proteção de acesso do GPT Sites. O login de operador do painel é uma autorização adicional do sistema existente. A credencial do banco é um segredo do runtime, nunca um arquivo de código ou asset.

As tabelas existentes public.moradores, public.responsaveis, public.encomendas e public.chamados continuam como fonte dos registros. O schema portaria_facil preserva sessões, permissões e campos complementares. Nenhuma migração ou seed é executada pelo Worker publicado.

Build: npm run build. O artefato é um Worker ES module em dist/server/index.js. Usa o driver Neon serverless com HTTP/WebSocket para preservar transações sem conexões TCP do Node. Imports de Excel são lidos dentro dos limites do Worker; permanecem limitados a 2 MB e 500 linhas, com prévia e confirmação.

Variáveis de runtime: DATABASE_URL (segredo), DATABASE_SCHEMA e DATA_SCHEMA. Não configure credenciais no manifest, fonte ou frontend.

WhatsApp e IA não são disparados automaticamente por este painel. Alterações nesta versão hospedada devem preservar as regras operacionais e os testes do projeto original.

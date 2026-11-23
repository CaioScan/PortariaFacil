# Correções de segurança da PR #6 — 23/11/2026

Caio solicitou correção dos bloqueios identificados na revisão e novo commit na própria branch `feat/schedule_n8n`, sem merge.

Foram removidos os segredos fixos do Compose e do header de download no export. O Compose exige variáveis privadas e publica portas apenas em loopback; o download usa credencial Header Auth do n8n. Foi entregue exemplo sem valores e orientação para rotacionar segredos já expostos. Nenhuma senha de serviço real foi alterada e o histórico não foi reescrito.

Na resposta de encomendas, o remetente e o cadastro ativo são conferidos sem identidade fornecida pelo modelo de IA. O fallback global foi removido. Seleção ambígua exige código/protocolo do próprio morador; a baixa revalida vínculo, código, status e autorização no SQL. Comandos negativos não confirmam retirada. O export fica inativo até configuração e teste pelo operador.

Regressões executadas: correspondência exata entre export e fontes de segurança; parser de remetente e comandos; configuração sem segredos e portas locais; integração PostgreSQL com moradores sintéticos A/B em schema isolado, incluindo A sem encomenda tentando retirar a de B, múltiplas encomendas, código incorreto ou duplicado, morador desativado e retiradas concorrentes. Quatro testes aprovados, incluindo PostgreSQL.

Limites: o Docker Engine local não estava disponível. Não foram iniciados contêineres, ativado workflow, realizadas chamadas de IA, enviadas mensagens ou alterados registros reais de moradores. A validação do Compose não equivale a executar os serviços. A rotação efetiva de segredos e o teste completo no n8n continuam sob responsabilidade do operador. O CI passa a executar as regressões sem banco real; a integração PostgreSQL é ignorada quando DATABASE_URL não existe.

# Demos CondoBot — Portaria Fácil

Protótipos HTML fornecidos pelo proponente para discussão da experiência. O nome CondoBot e o conteúdo dos arquivos foram preservados; os nomes dos arquivos foram simplificados para facilitar os links.

| Demo | Arquivo | Experiência |
| --- | --- | --- |
| Painel do síndico | [painel-sindico.html](painel-sindico.html) | Chamados, encomendas, reservas, avisos, métricas e mural. |
| Morador + Síndico | [demo-morador-sindico.html](demo-morador-sindico.html) | Conversa simulada com chamados, reservas, financeiro e contato com síndico. |
| Onboarding | [onboarding.html](onboarding.html) | Cadastro do condomínio e etapas simuladas de conexão. |
| Painel de Comunicação | [painel-comunicacao.html](painel-comunicacao.html) | Destinos dos avisos, aprovação e mural interno. |

## Visualização

O GitHub mostra o código dos HTMLs. Para interagir, baixe cada arquivo pelo botão **Download raw file** ou baixe o repositório e abra os HTMLs no navegador. As simulações locais não exigem instalação de dependências.

O preenchimento assistido do onboarding depende da API `claude.use` do ambiente onde o demo foi criado e pode não funcionar em navegador comum. Os formulários permitem preenchimento manual. Os botões de conexão e a conclusão do cadastro não comprovam conexão com WhatsApp ou agenda.

## Limites e MVP

Os dados são exemplos e ficam em memória, reiniciando ao recarregar. Os HTMLs não possuem backend, autenticação real ou envio de WhatsApp conectado. Indicadores, boletos, horários disponíveis e o retorno em 24 horas úteis são ilustrativos.

O MVP prioriza **avisos de encomendas e chamados**, conforme [processo e escopo](../docs/produto/processo-e-escopo.md). Reservas, financeiro, agenda, comunicação coletiva e mural representam evolução futura. Ainda é necessário registrar validação com usuários reais.

## Origem

| Arquivo recebido | Arquivo publicado |
| --- | --- |
| CondoBot — Painel do síndico.html | painel-sindico.html |
| Demo_ CondoBot — Morador + Síndico.html | demo-morador-sindico.html |
| Onboarding — CondoBot.html | onboarding.html |
| Painel de Comunicação — CondoBot.html | painel-comunicacao.html |

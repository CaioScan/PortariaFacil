# Portaria Fácil — Checkpoint 01

## Painel operacional com PostgreSQL

**Site publicado:** [Portaria Fácil no GPT Sites](https://portaria-facil-gestao.scannn.chatgpt.site), com acesso privado à conta autorizada no Sites e login adicional de operador. A fonte da adaptação hospedada está em [hosting/gpt-sites/](hosting/gpt-sites/README.md). Credenciais de acesso e do banco não são publicadas neste repositório.

O novo site está em [web/](web/README.md), com login, moradores, síndicos, unidades, encomendas e chamados. Usa as tabelas existentes `public.moradores`, `public.responsaveis`, `public.encomendas` e `public.chamados`, preservando as chaves e cadastros. Há importação CSV/XLSX com prévia e confirmação.

Na raiz do repositório: `npm.cmd ci`, configure o arquivo privado `.env` usando `web/.env.example`, execute `npm.cmd run web:setup` e `npm.cmd run web:start`. Acesse **http://127.0.0.1:4180**. Na instalação já configurada, use `iniciar-painel.ps1`.

Build: `npm.cmd run web:build`. Testes: `npm.cmd run web:test`. Consulte o [guia do painel](web/README.md) para dados existentes, credenciais locais, importação e preparação para publicação. A central demonstrativa na porta 4173 continua sendo um projeto separado. O envio WhatsApp ainda não é disparado pelo novo painel.

## Executar a apresentação

Na raiz do repositório, execute `.\apresentar.ps1` e abra **http://127.0.0.1:4173**. O comando valida/empacota a demonstração, executa testes e inicia uma central com as cinco telas. Requer Node.js 24 ou superior; não exige instalar pacotes npm.

Com npm disponível: `npm run build`, `npm test` e `npm run start:dist`.

Consulte o [roteiro de apresentação](docs/APRESENTACAO.md) para a sequência de demonstração e os limites de integração. Os demos são independentes; envio real de WhatsApp não faz parte do fluxo local de entregas.

Projeto do Grupo 6 no Bootcamp Software Engineering Project, MBA em Engenharia de Software da Faculdade Impacta.

O Portaria Fácil propõe organizar o recebimento, o aviso ao morador e a retirada de encomendas em condomínios, com leitura assistida de etiquetas por IA e conferência humana.

**Para o professor:** os documentos estão disponíveis nas [PR #1 — Organização do POD](https://github.com/CaioScan/PortariaFacil/pull/1) e [PR #2 — Produto](https://github.com/CaioScan/PortariaFacil/pull/2), abertas e aguardando revisão. O [PDF consolidado](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-produto/docs/produto/Portaria-Facil-Checkpoint-01.pdf) reúne a proposta escrita.

**Marco:** PODs formados, repositório criado, problema escolhido.
**Status:** Grupo 6 identificado; Caio confirmado como Tech Lead e endereço do repositório informado. Demais papéis e aprovação do tema ainda pendentes.

## 1. Proposta para apresentação

O Portaria Fácil pretende melhorar o recebimento e a retirada de encomendas em condomínios. Hoje, no cenário relatado, o porteiro anota a chegada em um caderno, tenta avisar pelo interfone e coleta a assinatura na retirada. Quando o morador está fora, o aviso pode não chegar e depende de uma nova tentativa do porteiro.

Nossa proposta é centralizar o registro, o aviso ao apartamento e a confirmação da retirada. Para adequar a proposta ao desafio de IA da disciplina, propomos investigar a leitura de etiquetas por imagem: a IA sugere os dados da encomenda e o porteiro confere antes de registrar. A hipótese é reduzir o trabalho de transcrição e as falhas de comunicação sem retirar a responsabilidade humana pela conferência.

## 2. POD e responsabilidades

Nome do POD: **Grupo 6**, com três integrantes, conforme a composição prevista no slide 64.

Encontro do grupo: [Google Meet](https://meet.google.com/oxt-gdda-arf).
Tema proposto: **Portaria Fácil — gestão de encomendas em condomínios**. Ratificação pelo grupo ainda pendente.

| Integrante | Papel | Usuário GitHub |
| --- | --- | --- |
| Caio Scandiuzzi Valente Coimbra | Tech Lead | CaioScan |
| Aldenir Rodrigues Almeida | Quality & Ops | AldenirRodrigues |
| Renildo da Silva Santos Junior | Product Owner | Renildo-Junior |

Responsabilidades dos papéis definidos no Grupo 6:

| Papel | Responsabilidade |
| --- | --- |
| Product Owner | Problema, PRD, histórias e validação com usuários |
| Tech Lead | Regras do agente e arquitetura |
| Quality & Ops | Qualidade, CI, deploy e métricas |

Todos participam das decisões, operam o agente e revisam PRs. Em aula, o trabalho será em mob, com rodízio de operador a cada 15–20 minutos. Cada PR precisa de revisão de outro integrante, e o limite será de duas PRs abertas simultaneamente, conforme os slides 62 e 67.

## 3. Problema escolhido — proposta para ratificação

**Como reduzir o esforço de registrar encomendas e garantir que o morador possa tomar conhecimento da chegada, mesmo ausente, mantendo um histórico confiável da retirada?**

Públicos envolvidos:

- Porteiro: registra a chegada, avisa e entrega a encomenda.
- Morador: precisa saber que a encomenda chegou e acompanhar a retirada.
- Síndico ou administrador: organiza os acessos e acompanha os registros.

O relato inicial é uma evidência de contexto, não uma pesquisa concluída. Frequência do problema, volume de encomendas, tempo gasto e disposição de pagamento ainda precisam ser validados.

## 4. Repositório

Nome do repositório: **PortariaFacil**.

- Repositório: [CaioScan/PortariaFacil](https://github.com/CaioScan/PortariaFacil).
- URL do MVP: **ainda não publicada para o projeto acadêmico**.
- Usuário GitHub do professor: **a informar para solicitação de revisão**.

Endereço do repositório fornecido por Caio. O acesso dos integrantes e do professor, a proteção da main e os checks de CI ainda precisam ser confirmados.

Estrutura prevista no slide 70:

```text
README.md
AGENTS.md
docs/
  produto/
  specs/
  adr/
  diario/
  pitch/
architecture/
prototype/
evals/
src/
.github/
```

Esta entrega está organizada em duas PRs de documentação, mantidas abertas para revisão humana: organização do POD e proposta de produto. A main permanece sem integração dessas alterações até a revisão. As regras iniciais do agente estão em `AGENTS.md`.

## 5. Material preparado

- [Lean Canvas](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-produto/docs/produto/lean-canvas.md)
- [Hipótese de valor](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-produto/docs/produto/hipotese.md)
- [PRD v0 com seis pilares](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-produto/docs/produto/prd-v0.md)
- [PDF consolidado](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-produto/docs/produto/Portaria-Facil-Checkpoint-01.pdf)
- [AGENTS.md v0](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-organizacao/AGENTS.md)
- [Diário do checkpoint](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-organizacao/docs/diario/checkpoint-01.md)
- [PRs para revisão](https://github.com/CaioScan/PortariaFacil/pulls)

Os links apontam para as branches das PRs e permitem consultar os materiais antes do merge. O PDF registra a proposta anterior à publicação; o estado atual da revisão deve ser consultado nas PRs.

## 6. Relação com o projeto existente

Existe um protótipo anterior do Portaria Fácil, com painel web e app de morador em .NET MAUI. Ele é uma referência de aprendizado; o grupo precisa alinhar com o professor as condições de reaproveitamento. Não deve ser apresentado como código desenvolvido durante o bootcamp.

O fluxo de aviso discutido até aqui usa consulta periódica e popup no app aberto quando muda a versão da notificação. Isso não comprova entrega de push com o app fechado. A leitura de etiquetas por IA é uma proposta nova, ainda sem implementação ou validação.

O curso também exige fluxo em URL pública em uma etapa posterior. A dependência exclusiva de instalação de APK precisa ser avaliada no checkpoint de produto.

## 7. Situação das entregas e próximas ações

Atualizado em **16/11/2026**, com consulta ao repositório. Itens concluídos representam entregas ou configurações verificadas; não equivalem à aprovação acadêmica.

### Concluído

- [x] Identificar os três integrantes e definir os papéis: Caio como Tech Lead, Renildo como Product Owner e Aldenir como Quality & Ops.
- [x] Criar o repositório [CaioScan/PortariaFacil](https://github.com/CaioScan/PortariaFacil).
- [x] Conceder acesso ao professor `marcusvas` e aos integrantes `AldenirRodrigues` e `Renildo-Junior`, além do proprietário `CaioScan`.
- [x] Documentar o problema, os processos e o escopo de avisos de encomendas e chamados do condomínio.
- [x] Elaborar e atualizar Lean Canvas, hipótese de valor e PRD v0, com critérios de aceite.
- [x] Definir a hipótese de IA para estruturar relatos e solicitar informações faltantes; avisos automáticos isolados não são apresentados como IA.
- [x] Publicar os documentos e os demos e integrar as PRs [#1](https://github.com/CaioScan/PortariaFacil/pull/1), [#2](https://github.com/CaioScan/PortariaFacil/pull/2), [#3](https://github.com/CaioScan/PortariaFacil/pull/3) e [#4](https://github.com/CaioScan/PortariaFacil/pull/4).
- [x] Versionar o diário agêntico e registrar atividades, limitações e intervenções do proponente.
- [x] Disponibilizar o [painel no GPT Sites](https://portaria-facil-gestao.scannn.chatgpt.site), com acesso privado e banco PostgreSQL existente.

### Pendente de decisão ou validação humana

- [ ] Registrar a ratificação do problema e do escopo pelo POD e o retorno do professor.
- [ ] Registrar a aprovação humana de Lean Canvas, hipótese e PRD; elaboração e merge não comprovam essa aprovação.
- [ ] Validar a utilidade da IA com usuários e executar sua avaliação no fluxo do produto. A hipótese está documentada; a integração de IA ao painel ainda está pendente.
- [ ] Revisar a [PR #5 — Painel PostgreSQL e GPT Sites](https://github.com/CaioScan/PortariaFacil/pull/5), ainda aberta nesta conferência.
- [ ] Registrar no diário quem revisou, o que foi aprovado e quais ajustes foram solicitados. As PRs #1 e #2 não possuem revisões registradas no GitHub nesta conferência.

### Pendente de configuração do repositório

- [ ] Proteger a `main` e exigir revisão de outro integrante antes do merge. A API do GitHub informou que a branch ainda não está protegida.
- [ ] Configurar o CI e exigir sua aprovação antes do merge. Não foram encontrados workflows do GitHub Actions; testes locais não substituem essa configuração.
- [ ] Definir com o grupo/professor o commit de referência e criar a tag `checkpoint-01`. Não há tags no repositório nesta conferência. A data e a evidência reais devem ser registradas, sem declarar retroativamente cumprimento do prazo da aula.

## 8. Referências do material da disciplina

Fonte: **Bootcamp · Software Engineering Project — Aula 01 (1).pdf**, Prof. Marcus Vinicius Almeida Silva.

| Slides | Uso neste documento |
| --- | --- |
| 8 | Marco do encontro 01 |
| 17, 43–45 | IA na proposta de valor e desafio do produto |
| 64–67 | Composição, papéis e regras do POD |
| 69–71 | Repositório, estrutura, revisão e tags |
| 72, 83–84 | Entregáveis detalhados do checkpoint 01 |

O slide 8 é o resumo do marco. O detalhamento dos slides 72 e 84 inclui os documentos de produto preparados aqui. O AI Canvas completo e o PRD v1 pertencem ao checkpoint 02.

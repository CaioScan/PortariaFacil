# Portaria Fácil — Encomendas e chamados pelo WhatsApp

Projeto do Grupo 6 no Bootcamp Software Engineering Project, MBA em Engenharia de Software da Faculdade Impacta.

O Portaria Fácil propõe centralizar avisos de encomendas e abertura/acompanhamento de chamados pelo WhatsApp, com painel web para portaria e síndico. A IA auxilia a estruturar relatos e pedir informações faltantes, com confirmação humana.

**Para o professor:** a [PR #2 — Produto e demos](https://github.com/CaioScan/PortariaFacil/pull/2) foi integrada à main por solicitação do autor. Consulte o [processo e escopo do MVP](docs/produto/processo-e-escopo.md) e os [quatro demos](prototype/README.md). A [PR #1 — Organização do POD](https://github.com/CaioScan/PortariaFacil/pull/1) permanece aberta para revisão. Merge não representa aprovação acadêmica.

**Marco:** PODs formados, repositório criado, problema escolhido.
**Status:** processo, escopo, documentos de produto, quatro demos HTML e estudo WAHA/n8n disponíveis na main. A implementação integrada dos fluxos e a validação com usuários continuam pendentes, assim como os demais papéis do POD e a ratificação do tema.

**Atualização técnica:** o estudo de integração WhatsApp com **WAHA + n8n + Groq** foi incorporado à main pela [PR #3](https://github.com/CaioScan/PortariaFacil/pull/3). Veja o [fluxo e a configuração](#9-integração-whatsapp--waha--n8n).

## 1. Proposta para apresentação

O Portaria Fácil pretende melhorar o recebimento e a retirada de encomendas em condomínios. Hoje, no cenário relatado, o porteiro anota a chegada em um caderno, tenta avisar pelo interfone e coleta a assinatura na retirada. Quando o morador está fora, o aviso pode não chegar e depende de uma nova tentativa do porteiro.

Além das encomendas, relatos de vazamentos, iluminação defeituosa e outros problemas podem ficar dispersos em conversas, sem protocolo, responsável ou retorno. A proposta reúne dois processos:

- **Encomendas:** portaria registra a chegada, seleciona destinatário aprovado, solicita aviso pelo WhatsApp e confirma a retirada com recebedor e data/hora.
- **Chamados:** morador relata o problema pelo WhatsApp, confere descrição/local e sugestão de resumo/categoria, confirma a abertura e acompanha o protocolo até resolução ou reabertura.

A IA é proposta para estruturar os relatos de chamados, com alternativa guiada e confirmação humana. Avisos de encomendas usam mensagens padronizadas. A leitura de etiquetas fica para evolução futura.

## 2. POD e responsabilidades

Nome do POD: **Grupo 6**, com três integrantes, conforme a composição prevista no slide 64.

Encontro do grupo: [Google Meet](https://meet.google.com/oxt-gdda-arf).
Tema proposto: **Portaria Fácil — comunicação e atendimento condominial pelo WhatsApp**. Os demos usam a marca CondoBot; nome definitivo e ratificação pelo grupo ainda pendentes.

| Integrante | Papel | Usuário GitHub |
| --- | --- | --- |
| Caio Scandiuzzi Valente Coimbra | Tech Lead | CaioScan |
| Aldenir Rodrigues Almeida | Product Owner | A informar |
| Renildo da Silva Santos Junior | A definir pelo grupo | A informar |

Responsabilidades dos papéis; Product Owner e Quality & Ops ainda a distribuir:

| Papel | Responsabilidade |
| --- | --- |
| Product Owner | Problema, PRD, histórias e validação com usuários |
| Tech Lead | Regras do agente e arquitetura |
| Quality & Ops | Qualidade, CI, deploy e métricas |

Todos participam das decisões, operam o agente e revisam PRs. Em aula, o trabalho será em mob, com rodízio de operador a cada 15–20 minutos. Cada PR precisa de revisão de outro integrante, e o limite será de duas PRs abertas simultaneamente, conforme os slides 62 e 67.

## 3. Problema escolhido — proposta para ratificação

**Como avisar o morador sobre encomendas, mesmo ausente, e transformar relatos de problemas do prédio em chamados com protocolo, responsável e acompanhamento até a conclusão?**

Públicos envolvidos:

- Porteiro: registra a chegada, avisa e entrega a encomenda.
- Morador: recebe avisos, relata problemas e consulta seus chamados.
- Síndico ou administrador: organiza acessos, faz triagem e acompanha responsáveis e resolução.

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

As PRs #2 (produto/demos) e #3 (estudo WAHA) foram integradas à main. A PR #1 (organização) permanece aberta; seus arquivos de regras do agente e diário ainda estão na branch de organização. A árvore acima é a estrutura acadêmica prevista, não uma afirmação de que todas as pastas já foram implementadas.

## 5. Material preparado

- [Processo, problema e escopo do MVP](docs/produto/processo-e-escopo.md)
- [Lean Canvas](docs/produto/lean-canvas.md)
- [Hipótese de valor](docs/produto/hipotese.md)
- [PRD v0 com seis pilares](docs/produto/prd-v0.md)
- [Quatro demos e instruções para visualizar](prototype/README.md)
- [PDF histórico do checkpoint 01](docs/produto/Portaria-Facil-Checkpoint-01.pdf)
- [AGENTS.md v0](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-organizacao/AGENTS.md)
- [Diário do checkpoint](https://github.com/CaioScan/PortariaFacil/blob/docs/checkpoint-01-organizacao/docs/diario/checkpoint-01.md)
- [PRs para revisão](https://github.com/CaioScan/PortariaFacil/pulls)

Os documentos de produto e demos são acessíveis na main. AGENTS.md e diário ainda apontam para a PR #1. O PDF registra a proposta anterior e não incorpora o escopo ampliado; os Markdown definem a proposta atual.

## 6. Relação com o projeto existente

Existe um protótipo anterior do Portaria Fácil, com painel web e app de morador em .NET MAUI. Ele é uma referência de aprendizado; o grupo precisa alinhar com o professor as condições de reaproveitamento. Não deve ser apresentado como código desenvolvido durante o bootcamp.

O protótipo anterior usa consulta periódica e popup no app aberto, sem comprovação de push com app fechado. O novo MVP prioriza WhatsApp como canal do morador e painel web para gestão; instalar aplicativo próprio não é requisito.

O curso exige demonstração em URL pública. Os HTMLs publicados são simulações, não uma implantação do fluxo integrado de atendimento.

## 7. Decisões necessárias para fechar hoje

- [x] Identificar os três integrantes do Grupo 6, conforme imagem enviada.
- [x] Confirmar Caio Scandiuzzi Valente Coimbra como Tech Lead.
- [ ] Distribuir e confirmar Product Owner e Quality & Ops.
- [ ] Ratificar o problema escolhido.
- [ ] Revisar Lean Canvas, hipótese e PRD v0.
- [ ] Avaliar a proposta de IA: avisos automáticos por regras, isoladamente, não caracterizam IA.
- [x] Registrar a URL do repositório informada por Caio.
- [ ] Adicionar os integrantes e o professor com os acessos adequados.
- [ ] Configurar proteção da main, revisão por outro integrante e exigência de CI, conforme slide 71; a configuração não foi executada nesta entrega.
- [x] Publicar os documentos em duas PRs para revisão.
- [x] Integrar a PR #2 de produto/demos e a PR #3 de WAHA por solicitação do autor.
- [ ] Revisar e concluir a PR #1 de organização.
- [ ] Registrar a revisão humana no diário.
- [ ] Criar a tag `checkpoint-01` no commit aprovado, dentro do prazo da aula.

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

## 9. Integração WhatsApp — WAHA + n8n

O estudo em [`whatsapp-estudos-export/`](whatsapp-estudos-export/) implementa uma ponte para receber comandos do WhatsApp via WAHA, processá-los em um workflow n8n com Groq e devolver a resposta à conversa autorizada. A PR #3 foi integrada em 16/10/2026 por solicitação do autor.

### Fluxo implementado

```mermaid
flowchart LR
    Morador["Conversa de teste: !ia texto"] --> WAHA["WAHA: evento message.any"]
    WAHA --> Ponte["Ponte Node.js: autentica e filtra"]
    Ponte --> N8N["n8n: webhook HTTPS e validação"]
    N8N --> Groq["Groq: gera resposta"]
    Groq --> Resposta["n8n: JSON com reply"]
    Resposta --> Envio["Ponte: envia pelo WAHA"]
    Envio --> WhatsApp["Resposta no WhatsApp"]
```

| Componente | Responsabilidade |
| --- | --- |
| WAHA | Vincula a sessão WhatsApp, emite eventos e disponibiliza o envio de texto. |
| Ponte Node.js | Valida o segredo do webhook, seleciona comandos `!ia`, filtra origem e horário, limita chamadas e encaminha apenas o texto ao n8n. |
| n8n | Recebe o texto por webhook com Header Auth, valida a entrada, executa a cadeia de IA e responde com JSON. |
| Groq | Fornece o modelo de linguagem utilizado pelo workflow. |

Por padrão, o bot está desativado e, quando habilitado sem grupo configurado, aceita comandos somente na conversa consigo mesmo. `TEST_GROUP_ID` permite autorizar explicitamente um grupo de teste. Exemplo de comando: `!ia explique o que é uma API`.

### Arquivos e instalação

- [Guia completo de instalação e operação](whatsapp-estudos-export/waha/README.md).
- [Workflow n8n para importar](whatsapp-estudos-export/n8n-workflow.json).
- [Docker Compose do WAHA e da ponte](whatsapp-estudos-export/waha/compose.yaml).
- [Exemplo das variáveis de configuração](whatsapp-estudos-export/waha/bridge.env.example).
- [Código da ponte](whatsapp-estudos-export/waha/bridge.mjs) e [testes](whatsapp-estudos-export/waha/bridge.test.mjs).

1. Preparar Docker com containers Linux e a configuração privada conforme o guia.
2. Importar `n8n-workflow.json` no n8n. O arquivo vem desativado e sem credenciais.
3. Configurar Header Auth no webhook (`X-Study-Key`) e a credencial Groq no nó do modelo. Conferir a disponibilidade do modelo na conta antes do teste.
4. Configurar na ponte a URL HTTPS do webhook publicado, as chaves independentes e o destino de teste.
5. Vincular a sessão `default` do WAHA por QR Code e configurar o evento `message.any` para `http://bridge:3001/events`, com `X-Relay-Key`.
6. Após conferir a configuração, habilitar `BOT_ENABLED=true` e testar no destino autorizado, seguindo o guia.

Credenciais e sessões ficam fora dos arquivos versionados. O Compose publica o WAHA apenas em `127.0.0.1:3000`; a ponte usa a rede interna do Docker. Se o backend do protótipo também usar a porta 3000, será necessário resolver esse conflito antes de executar ambos no mesmo computador.

### Estado da validação e relação com o Portaria Fácil

- Cinco testes automatizados da seleção de comandos passaram, e a sintaxe da ponte foi verificada.
- O JSON do workflow, as referências entre nós e a validação de entrada foram conferidos localmente.
- A integração ponta a ponta com serviços ativos ainda não foi validada nesta publicação; não foram enviadas mensagens durante o commit ou merge.
- O estudo ainda não está conectado ao cadastro de encomendas, ao reaviso ou à abertura/consulta persistente de chamados. Essas ligações são etapas futuras.
- O uso de IA implementado no estudo responde a comandos; resumo/categoria e coleta de dados para chamados ainda precisam ser adaptados e avaliados.

Os limites de chamadas e a deduplicação da ponte ficam em memória e reiniciam com o processo. WAHA é a tecnologia utilizada neste estudo; o documento de referência `WHATSAPP_BUSINESS_MCP.md` trata de outra integração e não indica que a Cloud API oficial tenha sido implementada.

## 10. Demos e limites do MVP

| Demo | Referência |
| --- | --- |
| Painel do síndico | [Chamados, encomendas e visão de gestão](prototype/painel-sindico.html) |
| Morador + Síndico | [Conversa simulada e atualização do painel](prototype/demo-morador-sindico.html) |
| Onboarding | [Cadastro e configuração inicial](prototype/onboarding.html) |
| Painel de Comunicação | [Avisos, aprovação e mural](prototype/painel-comunicacao.html) |

O GitHub mostra o código dos HTMLs. Para interagir, baixe os arquivos e abra no navegador, conforme o [guia dos demos](prototype/README.md). Os dados e conexões são simulados; o preenchimento assistido do onboarding depende do ambiente original.

O MVP inclui vínculos aprovados/número verificado, encomendas e avisos rastreáveis, retirada confirmada, chamados com confirmação/protocolo, responsável, andamento, resolução/reabertura, histórico e permissões. Falha de envio não apaga registros e aceite pelo provedor não comprova leitura.

Reservas, financeiro, agenda, mural, comunicação coletiva e leitura de etiquetas ficam para evolução. Foto no chamado é desejável. O [processo completo](docs/produto/processo-e-escopo.md) contém priorização, 12 histórias com critérios de aceite, métricas e decisões ainda pendentes.

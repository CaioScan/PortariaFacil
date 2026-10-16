# Processo, problema e escopo do MVP — Portaria Fácil

Proposta para revisão na PR #2. Os quatro demos fornecidos usam a marca **CondoBot** e representam a experiência pretendida. O nome definitivo permanece a confirmar. Requisitos abaixo não constituem evidência de software validado em produção.

## 1. Problema

A portaria recebe encomendas, registra sua chegada em caderno e avisa pelo interfone. Quando o morador está fora ou não atende, a comunicação depende de uma nova tentativa do porteiro. Isso pode atrasar a retirada, acumular encomendas e dificultar a conferência de quem recebeu cada volume.

Moradores também precisam informar problemas como vazamentos, iluminação defeituosa e falhas em equipamentos. Relatos em mensagens pessoais, recados ou grupos podem ficar sem protocolo, responsável, retorno ou histórico de resolução. Essa segunda dor foi acrescentada pelo proponente e ainda precisa ser validada em entrevistas.

O problema central é organizar o processo de **registrar, comunicar, atribuir responsabilidade e concluir**. Frequência de falhas, volume de ocorrências e tempo gasto ainda não foram medidos.

## 2. Relação entre os problemas, o MVP e os demos

O produto terá um MVP integrado com dois fluxos: **encomendas e chamados**. Os quatro HTMLs são protótipos interativos desses fluxos e de possibilidades futuras; não são quatro MVPs operacionais independentes.

| Problema | Entrega do MVP | Demo de referência | O que falta para operar |
| --- | --- | --- | --- |
| Morador ausente não recebe aviso por interfone. | Registro e aviso ao destinatário pelo WhatsApp. | Painel do síndico: encomendas na portaria. | Vínculo aprovado, número verificado, persistência e evento conectado ao canal. |
| Dificuldade de comprovar a retirada. | Identificação do recebedor, operador e data/hora. | Painel do síndico: encomendas e indicadores demonstrativos. | Histórico real e controle de acesso; indicadores atuais são exemplos. |
| Problemas relatados sem protocolo. | Abertura de chamado pelo WhatsApp com confirmação. | Demo Morador + Síndico: relato e chamado simulado no painel. | Coleta de descrição/local, identificação, gravação e protocolo real. |
| Síndico não consegue acompanhar responsáveis e andamento. | Triagem, responsável, status e resolução. | Painel do síndico: atenção, filtros e alteração de status. | Persistência, atribuição, justificativa e avisos de atualização. |
| Configuração do condomínio e canal precisa de orientação. | Cadastro mínimo de condomínio, unidades, equipe e canal. | Onboarding: etapas de cadastro e conexão. | Conexão e verificação reais; o botão hoje apenas altera a interface. |
| Comunicação coletiva se mistura a recados internos. | Evolução futura: aprovação e distribuição de comunicados. | Painel de Comunicação: destinos, aprovação e mural. | Regras de publicação e integração real; fora do MVP inicial. |

## 3. Objetivo, atores e acessos

O morador recebe avisos e abre/consulta chamados pelo WhatsApp. A portaria e o síndico gerenciam os registros em painel web. Aplicativo próprio não é obrigatório.

| Perfil | Acesso proposto |
| --- | --- |
| Morador | Avisos destinados a ele, abertura e consulta de seus chamados após aprovação. |
| Porteiro | Encomendas e retiradas de seu condomínio; abertura de ocorrências; acesso a chamados somente conforme atribuição/permissão. |
| Síndico/administrador | Aprovação dos vínculos, gestão da equipe, triagem e acompanhamento do condomínio autorizado. |
| Responsável interno | Chamados atribuídos a ele; registro de atendimento e solução. Prestadores externos ficam para evolução. |

Um apartamento pode ter vários moradores. O destinatário deve ser escolhido explicitamente, sem enviar automaticamente a todos da unidade. Cada consulta verifica condomínio e autorização sobre o registro.

## 4. Configuração e entrada do morador

1. O administrador configura condomínio, unidades e equipe.
2. O morador informa nome, unidade e WhatsApp e autoriza os avisos.
3. A administração confere e aprova o vínculo. O número é verificado antes de liberar consultas; o mecanismo será especificado na implementação.
4. O responsável configura a sessão WAHA e o workflow n8n com credenciais privadas e testa o canal em destino autorizado antes de marcá-lo disponível.
5. Se o número tiver vários vínculos, a conversa solicita o condomínio e mantém esse contexto na operação. Sem vínculo aprovado, orienta o cadastro sem expor dados internos.

## 5. Processo A — Encomendas

1. A portaria autentica-se e seleciona apartamento e destinatário aprovado.
2. Preenche descrição/transportadora, confere e confirma a entrada.
3. O sistema grava referência única, operador, data/hora e status **Pendente de retirada**.
4. Após gravar, registra uma solicitação de aviso ao número autorizado. Falha no WhatsApp não elimina a encomenda.
5. A integração adaptada WAHA/n8n envia mensagem padronizada, sem necessidade de IA generativa.
6. O painel acompanha o resultado. Reaviso de pendência mantém a referência e registra outra tentativa, sem duplicar a encomenda.
7. Na retirada, a portaria informa recebedor e confirma. O registro passa a **Entregue**, com operador e data/hora.

Exemplo: “Olá, Ana! Uma encomenda destinada a você chegou à portaria do seu condomínio. Referência: ENC-001. Procure a portaria para retirá-la.”

Estados da encomenda: **Pendente de retirada → Entregue**. Cancelamento por erro exige usuário autorizado e motivo, preservando histórico. Identificação do recebedor e confirmação pelo operador compõem a comprovação inicial; assinatura desenhada e biometria ficam fora do MVP.

O estado do aviso é independente: **Aguardando envio → Aceito pelo provedor ou Falha**. Entrega ao dispositivo e leitura só são mostradas quando houver confirmação correspondente. Sucesso HTTP não comprova leitura. Resultado incerto deve ser identificado sem reenvio descontrolado. Eventos repetidos são deduplicados.

Número ausente ou não autorizado mantém o registro e sinaliza comunicação manual/correção do cadastro. O sistema não envia a outro contato por suposição.

## 6. Processo B — Chamados

1. Morador aprovado relata um problema pelo WhatsApp; a portaria também pode registrar no painel.
2. O assistente identifica a intenção e coleta **descrição e local**, solicitando informações ausentes.
3. A IA sugere resumo e categoria sem inventar dados. O solicitante confere, corrige e confirma. Se a IA falhar, segue por perguntas guiadas.
4. O sistema grava o chamado e somente depois informa o protocolo.
5. O síndico recebe aviso e encontra a pendência no painel, mesmo que o aviso falhe.
6. O síndico valida categoria e prioridade, atribui responsável interno e inicia atendimento.
7. Alterações ficam no histórico e geram avisos ao solicitante.
8. A resolução exige descrição do atendimento. O morador consulta seu protocolo e pode solicitar reabertura com motivo se o problema persistir.

Exemplo: “A luz do corredor do terceiro andar está apagada.” O assistente confirma descrição/local e sugere a categoria **Iluminação** antes de abrir o chamado.

Estados: **Aberto → Em atendimento → Resolvido**. Cancelamento exige motivo. Reabertura justificada retorna a **Aberto** preservando histórico. A IA não decide sozinha prioridade, encerramento ou responsável.

Horários e contatos de atendimento são definidos pelo condomínio. Não há garantia de monitoramento contínuo. O retorno em “24 horas úteis” dos demos é ilustrativo e não é compromisso do MVP. Relatos de risco imediato apresentam procedimentos e contatos previamente cadastrados pelo condomínio, sem aguardar triagem automática como condição para orientar o usuário.

## 7. Escopo priorizado

| Prioridade | Entregas |
| --- | --- |
| Obrigatório | Condomínio/unidades, autenticação da equipe, aprovação do vínculo, verificação do número e autorização dos avisos. |
| Obrigatório | Registro de encomenda, aviso WhatsApp, resultado de envio, reaviso e retirada rastreável. |
| Obrigatório | Abertura/consulta de chamado, descrição/local, confirmação, protocolo, responsável, andamento, resolução e reabertura. |
| Obrigatório | IA para resumo/categoria e dados faltantes, confirmação humana e alternativa guiada. |
| Obrigatório | Persistência, histórico, permissões, isolamento por condomínio, deduplicação e tratamento de falhas. |
| Obrigatório | Painel com listas/filtros, demonstração em URL pública, testes dos fluxos e avaliação da IA. |
| Desejável | Foto opcional no chamado e indicadores básicos de pendências e tempos. |
| Futuro | Leitura assistida de etiquetas, reservas, agenda, avisos coletivos, aprovação de comunicados e mural. |
| Fora do MVP | Financeiro/boletos, pagamentos, acesso externo de prestadores, app obrigatório, biometria e automação de emergências. |

As funcionalidades futuras presentes nos HTMLs não são compromisso da entrega inicial. A leitura de etiquetas deixa de ser a prioridade inicial da IA; a nova hipótese concentra-se em relatos de chamados.

## 8. Dados e regras operacionais

| Registro | Dados mínimos |
| --- | --- |
| Vínculo | Condomínio, unidade, morador, número verificado, aprovação e autorização do canal. |
| Encomenda | Referência, condomínio/unidade, destinatário, descrição, operador, entrada e status; na retirada, recebedor e data/hora. |
| Chamado | Protocolo, condomínio, solicitante, descrição/local, categoria validada, prioridade humana, responsável, status e histórico. |
| Tentativa de aviso | Registro de origem, evento/versão, destinatário, horário, resultado e identificador do provedor quando disponível. |

O backend é a fonte dos registros. Repetir a mesma confirmação não cria outro chamado/encomenda. Uma nova solicitação confirmada gera nova referência. Número alterado exige nova verificação. Revogar a autorização interrompe novos avisos no canal e sinaliza contato alternativo à equipe. Retenção de dados e tratamento de fotos devem ser definidos antes do piloto real.

## 9. Integração e estado atual

O estudo da [PR #3](https://github.com/CaioScan/PortariaFacil/pull/3) fornece WAHA, ponte Node.js e workflow n8n/Groq para comandos `!ia`. Ainda precisa ser adaptado aos eventos de encomenda, intenções de abertura/consulta, confirmação e permissões do produto.

O n8n orquestra as etapas; o backend valida autorização e persiste dados. A ponte atual não deve ser apresentada como fluxo pronto de atendimento aos moradores. Não foi demonstrada a integração ponta a ponta com usuários reais.

## 10. Histórias e critérios de aceite

| ID | História | Dado / Quando / Então |
| --- | --- | --- |
| US01 | Aprovar vínculo e validar contato. | Dado número sem vínculo aprovado/verificado, quando consulta dados internos, então o acesso é negado e o cadastro é orientado. |
| US02 | Registrar chegada e avisar. | Dado destinatário autorizado, quando a portaria confirma entrada, então grava encomenda pendente e solicitação de aviso vinculada. |
| US03 | Tratar falha no canal. | Dado canal indisponível, quando registra encomenda, então preserva o registro e sinaliza o estado do aviso sem afirmar entrega. |
| US04 | Reenviar aviso. | Dada encomenda pendente, quando solicita reaviso, então mantém referência e registra tentativa; repetição não duplica encomenda. |
| US05 | Confirmar retirada. | Dada pendência, quando confirma recebedor, então registra entrega, operador e data/hora; nome vazio impede finalização. |
| US06 | Abrir chamado. | Dado relato incompleto, quando inicia abertura, então solicita descrição/local e só confirma protocolo após gravação. |
| US07 | Conferir interpretação da IA. | Dada sugestão de resumo/categoria, quando corrige e confirma, então conserva os dados confirmados; falha da IA permite seguir guiado. |
| US08 | Atribuir atendimento. | Dado chamado aberto, quando síndico define responsável e inicia atendimento, então registra transição e solicita aviso ao morador. |
| US09 | Registrar solução. | Dado chamado em atendimento, quando resolve sem descrição, então recusa; com descrição, registra solução e solicita aviso. |
| US10 | Reabrir ocorrência. | Dado meu chamado resolvido, quando solicito reabertura com motivo, então volta a aberto, preserva histórico e avisa o síndico. |
| US11 | Proteger registros. | Dado usuário de outro condomínio ou morador sem permissão, quando consulta referência, então acesso é negado. |
| US12 | Evitar duplicações. | Dada a mesma confirmação recebida duas vezes, quando processada, então cria somente um registro para aquele evento. |

## 11. Validação e métricas

Métricas operacionais: tempo entre registro e solicitação do aviso; falhas/tentativas; contatos manuais adicionais; tempo até retirada; completude de descrição/local; tempo de triagem/resolução; pendências sem responsável e reaberturas. Metas dependem de linha de base e capacidade da equipe.

A IA será comparada ao preenchimento guiado, medindo tempo, correções, categoria aceitável e resumo fiel. Proposta para revisão: avaliação com 10–20 casos comuns, incompletos/ambíguos e adversariais; meta inicial de pelo menos 80% para categoria e resumo em dimensões separadas. Em todos os casos, não inventar fatos nem expor dados de terceiros. Não há resultados medidos nesta entrega.

Entrevistar inicialmente um porteiro, um síndico e dois moradores; testar os demos com pelo menos dois usuários e registrar evidências. Exercitar falha de canal, reaviso, retirada, correção da IA, atribuição, resolução, reabertura e consultas indevidas. Relatos e anexos são dados, não instruções para alterar permissões.

## 12. Sequência e pendências

1. Revisar problema, nome e limites com o POD.
2. Testar os demos e registrar observações reais de usuários.
3. Refinar PRD, AI Canvas, histórias e arquitetura.
4. Implementar cadastro/permissões, persistência e integração com tratamento de falhas.
5. Entregar o fluxo completo de encomenda, seguido do chamado e assistência de IA.
6. Demonstrar em URL pública com testes, avaliações e métricas.

Pendências: nome Portaria Fácil/CondoBot; demais papéis do POD; mecanismo de verificação do número; horários/contatos operacionais; retenção; foto no MVP; infraestrutura do canal e metas. O grupo deve estimar o trabalho e ajustar o escopo ao prazo do curso.

## 13. Referências e evidências

Arquivos analisados: `CondoBot — Painel do síndico.html`, `Demo_ CondoBot — Morador + Síndico.html`, `Onboarding — CondoBot.html` e `Painel de Comunicação — CondoBot.html`. São referências fornecidas pelo proponente; não foram publicados nesta alteração.

O painel e a conversa usam dados de exemplo em memória. O onboarding simula conexões e depende de ambiente específico para preenchimento por IA. Não foram apresentadas evidências de validação com usuários.

O PDF `Portaria-Facil-Checkpoint-01.pdf` é um registro histórico do checkpoint 01 e não incorpora esta ampliação. Para o escopo atual, prevalecem os Markdown desta PR.

# PRD v0 — Portaria Fácil

Status: proposta revisada na PR #2, sujeita à revisão do POD. Requisitos descrevem o produto pretendido. O detalhamento atual está em [Processo, problema e escopo](processo-e-escopo.md), com relação dos demos aos problemas, priorização e histórias US01–US12. O PDF do checkpoint 01 preserva a proposta anterior.

## 1. Visão e objetivo

Organizar avisos de encomendas e chamados do condomínio pelo WhatsApp, com gestão em painel web. A IA sugere resumo/categoria dos relatos e pede informações faltantes, com confirmação humana. Leitura de etiquetas fica para evolução futura.

O problema inicial foi relatado pelo proponente: o porteiro utiliza caderno, avisa pelo interfone e aguarda assinatura na retirada. A validação com usuários e a avaliação da contribuição da IA ainda estão pendentes.

O problema ampliado inclui relatos de manutenção dispersos, sem protocolo, responsável ou acompanhamento. Os demos CondoBot ilustram essas dores e possíveis fluxos; não comprovam integração real. Sua relação com o MVP está documentada no processo.

## 2. Público-alvo

| Persona | Necessidade |
| --- | --- |
| Porteiro | Registrar rapidamente e localizar a encomenda na retirada |
| Morador | Receber avisos pelo WhatsApp, abrir e consultar seus chamados |
| Síndico/administrador | Autorizar vínculos, triar chamados, definir responsáveis e acompanhar resolução |

## 3. Requisitos funcionais iniciais

| ID | Requisito proposto |
| --- | --- |
| RF01 | Cadastrar morador e submeter seu vínculo com condomínio e apartamento à aprovação do administrador. |
| RF02 | Autenticar usuários e limitar os dados ao condomínio e ao perfil autorizado. |
| RF03 | Verificar número e autorização do canal antes de liberar consultas e avisos WhatsApp. |
| RF04 | Registrar encomenda pendente somente após confirmação do apartamento e dos dados pela portaria. |
| RF05 | Solicitar aviso WhatsApp ao destinatário após persistir a encomenda e acompanhar o resultado sem presumir entrega/leitura. |
| RF06 | Permitir reaviso de encomenda pendente, distinguindo-o de uma nova encomenda. |
| RF07 | Finalizar a retirada com identificação de quem recebeu e data/hora; modalidade de assinatura a definir. |
| RF08 | Abrir chamado pelo WhatsApp ou painel, coletar descrição/local, confirmar e gerar protocolo após gravação. |
| RF09 | Sugerir resumo/categoria com IA, permitir correção e oferecer alternativa guiada. |
| RF10 | Atribuir responsável, registrar atendimento/resolução e permitir solicitação de reabertura justificada. |
| RF11 | Avisar mudanças de andamento e permitir consulta somente dos registros autorizados. |
| RF12 | Manter histórico e deduplicar eventos, preservando registros quando o canal falhar. |

Fluxo de encomenda: vínculo aprovado/número verificado → registro pela portaria → solicitação de aviso WhatsApp → retirada confirmada. Fluxo de chamado: relato → coleta e sugestão → confirmação → gravação/protocolo → triagem/responsável → atendimento → resolução ou reabertura.

## 4. Requisitos não funcionais iniciais

- Privacidade e acesso: morador só consulta encomendas do vínculo autorizado; administrador só gerencia seu condomínio.
- Integridade: sugestão de IA não deve abrir chamado sem confirmação nem decidir prioridade/resolução sozinha.
- Usabilidade: fluxo adequado à portaria e ao morador, com correção de sugestões e alternativa guiada em caso de falha.
- Comunicação: falhas de aviso devem ser distinguíveis de envio e leitura; repetição não cria uma segunda encomenda.
- Dados de imagem: usar etiquetas fictícias nos testes iniciais e definir retenção, acesso e tratamento de dados antes de um piloto real.
- Disponibilidade e desempenho: metas serão definidas após observar a operação.
- Entrega acadêmica futura: fluxo demonstrável em URL pública, conforme o curso; arquitetura e stack serão formalizadas pelo POD.

## 5. Critérios de aceite preliminares

| ID | Dado / Quando / Então |
| --- | --- |
| CA01 | Dado um cadastro pendente, quando o morador tenta acessar encomendas, então o acesso não é liberado antes da aprovação. |
| CA02 | Dado um relato livre, quando a IA sugere resumo/categoria, então o usuário confere e confirma antes da abertura. |
| CA03 | Dado um relato incompleto, quando a abertura é iniciada, então o sistema solicita descrição/local faltantes e oferece alternativa guiada se a IA falhar. |
| CA04 | Dado um registro confirmado para o apartamento 302, quando um morador autorizado dessa unidade consulta a lista, então encontra a encomenda; um morador de outra unidade não a encontra. |
| CA05 | Dada encomenda pendente, quando solicita reaviso, então mantém a referência e registra a tentativa WhatsApp; falha no canal não apaga a encomenda nem comprova entrega. |
| CA06 | Dada uma encomenda pendente, quando a retirada é confirmada com recebedor, então o status passa a entregue e o histórico conserva a data/hora e o recebedor. |

Critérios complementares de atribuição, resolução, reabertura, isolamento e deduplicação estão nas histórias US08–US12 de [Processo e escopo](processo-e-escopo.md#10-histórias-e-critérios-de-aceite). São contratos propostos, não testes já executados.

## 6. Métricas de sucesso

| Métrica | Como medir | Estado |
| --- | --- | --- |
| Tempo de registro e aviso | Entrada confirmada até solicitação de envio e contatos adicionais | Meta após linha de base; sem medição |
| Qualidade da sugestão | Resumo fiel e categoria aceitável de relatos rotulados, avaliados separadamente | Meta inicial proposta: 80%; sem medição |
| Encaminhamento incorreto | Registros confirmados para apartamento errado | Não aumentar frente à referência; sem medição |
| Ciência da chegada | Moradores que identificam a encomenda sem contato adicional | Meta a definir no discovery |
| Rastreabilidade de retirada | Retiradas com recebedor e data/hora registrados | Meta proposta: 100% dos casos do teste |
| Atendimento de chamados | Completude, tempo de triagem/resolução, responsáveis e reaberturas | Metas a validar |

## Limites desta etapa e decisões abertas

Nesta etapa são entregues documentos. A priorização e os critérios dos dois fluxos constam no processo; AI Canvas e validação com usuários ainda estão pendentes. O MVP inclui WhatsApp, encomendas e chamados. Reservas, financeiro, agenda, mural, comunicados coletivos e leitura de etiquetas ficam fora do MVP inicial. Foto é desejável. App próprio não é obrigatório.

Decisões abertas: marca Portaria Fácil/CondoBot, papéis restantes, verificação de número, horários de atendimento, retenção, infraestrutura, metas e condições de reaproveitamento dos protótipos. WAHA/n8n da PR #3 ainda exige adaptação aos registros e permissões do produto.

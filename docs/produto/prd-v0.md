# PRD v0 — Portaria Fácil

Status: esqueleto para o checkpoint 01, sujeito à revisão do POD. Requisitos abaixo descrevem o produto pretendido, não funcionalidades comprovadamente prontas.

## 1. Visão e objetivo

Facilitar o recebimento e a retirada de encomendas em condomínios, reduzindo digitação e falhas de comunicação. A proposta de IA é interpretar etiquetas e sugerir os dados para conferência do porteiro antes do registro.

O problema inicial foi relatado pelo proponente: o porteiro utiliza caderno, avisa pelo interfone e aguarda assinatura na retirada. A validação com usuários e a avaliação da contribuição da IA ainda estão pendentes.

## 2. Público-alvo

| Persona | Necessidade |
| --- | --- |
| Porteiro | Registrar rapidamente e localizar a encomenda na retirada |
| Morador | Saber da chegada, consultar pendências e acompanhar a retirada |
| Síndico/administrador | Autorizar vínculos de moradores e manter rastreabilidade |

## 3. Requisitos funcionais iniciais

| ID | Requisito proposto |
| --- | --- |
| RF01 | Cadastrar morador e submeter seu vínculo com condomínio e apartamento à aprovação do administrador. |
| RF02 | Autenticar usuários e limitar os dados ao condomínio e ao perfil autorizado. |
| RF03 | Receber imagem de etiqueta e sugerir dados para revisão humana, sinalizando campos ausentes ou ambíguos. |
| RF04 | Registrar encomenda pendente somente após confirmação do apartamento e dos dados pela portaria. |
| RF05 | Disponibilizar aviso ao apartamento e consulta das encomendas pelo morador; canal e comportamento em segundo plano a definir. |
| RF06 | Permitir reaviso de encomenda pendente, distinguindo-o de uma nova encomenda. |
| RF07 | Finalizar a retirada com identificação de quem recebeu e data/hora; modalidade de assinatura a definir. |

Fluxo proposto: morador cadastra-se → administrador aprova → porteiro apresenta etiqueta → IA sugere dados → porteiro confere e registra → morador recebe aviso/consulta → portaria confirma retirada.

## 4. Requisitos não funcionais iniciais

- Privacidade e acesso: morador só consulta encomendas do vínculo autorizado; administrador só gerencia seu condomínio.
- Integridade: sugestão de IA não deve registrar nem encaminhar encomenda sem confirmação humana.
- Usabilidade: fluxo adequado à rotina da portaria, incluindo correção de sugestões e entrada manual em caso de falha.
- Comunicação: falhas de aviso devem ser distinguíveis de envio e leitura; repetição não cria uma segunda encomenda.
- Dados de imagem: usar etiquetas fictícias nos testes iniciais e definir retenção, acesso e tratamento de dados antes de um piloto real.
- Disponibilidade e desempenho: metas serão definidas após observar a operação.
- Entrega acadêmica futura: fluxo demonstrável em URL pública, conforme o curso; arquitetura e stack serão formalizadas pelo POD.

## 5. Critérios de aceite preliminares

| ID | Dado / Quando / Então |
| --- | --- |
| CA01 | Dado um cadastro pendente, quando o morador tenta acessar encomendas, então o acesso não é liberado antes da aprovação. |
| CA02 | Dada uma etiqueta legível, quando a IA a interpreta, então os campos sugeridos ficam disponíveis para revisão antes de qualquer registro definitivo. |
| CA03 | Dada uma etiqueta sem apartamento identificável, quando a sugestão é exibida, então a portaria precisa selecionar e confirmar o apartamento. |
| CA04 | Dado um registro confirmado para o apartamento 302, quando um morador autorizado dessa unidade consulta a lista, então encontra a encomenda; um morador de outra unidade não a encontra. |
| CA05 | Dada uma encomenda pendente já carregada no app, quando a portaria solicita reaviso, então o próximo ciclo de consulta reconhece a nova versão e apresenta um único aviso por versão observada. O intervalo-alvo do protótipo atual é de 10 segundos; isso não equivale a push em segundo plano. |
| CA06 | Dada uma encomenda pendente, quando a retirada é confirmada com recebedor, então o status passa a entregue e o histórico conserva a data/hora e o recebedor. |

Esses critérios são a base para refinamento no checkpoint 02, não um relatório de testes executados.

## 6. Métricas de sucesso

| Métrica | Como medir | Estado |
| --- | --- | --- |
| Tempo mediano de registro | Comparação entre fluxo manual e assistido, incluindo conferência | Meta proposta: redução de 30%; sem medição |
| Qualidade da sugestão | Campos corretos frente a etiquetas com resposta esperada | Meta a definir após amostra inicial |
| Encaminhamento incorreto | Registros confirmados para apartamento errado | Não aumentar frente à referência; sem medição |
| Ciência da chegada | Moradores que identificam a encomenda sem contato adicional | Meta a definir no discovery |
| Rastreabilidade de retirada | Retiradas com recebedor e data/hora registrados | Meta proposta: 100% dos casos do teste |

## Limites desta etapa e decisões abertas

Nesta etapa são entregues documentos. AI Canvas completo, priorização MoSCoW e histórias detalhadas ficam para o checkpoint 02. WhatsApp, pagamentos e expansão comercial não integram a proposta inicial de implementação.

Decisões abertas: composição do POD, aprovação do problema, relevância real da IA, canal de aviso, fluxo web público, stack acadêmica e condições de reaproveitamento do protótipo existente.

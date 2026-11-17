# Fechamento do checkpoint 01

## Decisões confirmadas pelo Tech Lead

- Grupo 6: Caio Scandiuzzi Valente Coimbra (Tech Lead), Renildo da Silva Santos Junior (Product Owner) e Aldenir Rodrigues Almeida (Quality & Ops).
- Problema: registros manuais e comunicação dispersa dificultam avisar moradores sobre encomendas e acompanhar problemas do condomínio até a solução.
- Proposta: cadastro de moradores e responsáveis, recebimento e retirada rastreável de encomendas e abertura e acompanhamento de chamados. WhatsApp com WAHA + n8n compõe a proposta de comunicação; o estudo existente não significa envio integrado pelo painel atual.
- IA proposta: estruturar relatos, resumir chamados e identificar informações faltantes, sempre com confirmação humana. Regras automáticas de aviso não são IA.
- Artefatos a revisar: README, Lean Canvas, hipótese, PRD v0, AGENTS.md e diário. O PDF inicial é histórico e não comprova o escopo implementado posteriormente.

Em 16/11/2026, Caio Scandiuzzi Valente Coimbra confirmou nesta conversa que essas definições já foram tomadas e solicitou seu encerramento documental. O aceite do Tech Lead fica registrado para problema, escopo, papéis, Lean Canvas, hipótese e PRD v0. Não se atribui esse aceite a outro integrante nem ao professor. A avaliação conceitual da proposta de IA está encerrada; sua validação experimental continua sendo uma atividade futura.

## Revisão humana da PR #5

PR: https://github.com/CaioScan/PortariaFacil/pull/5

O Quality & Ops ou outro integrante que não seja o autor deve conferir:

- Papéis, problema e escopo condizem com o acordo do grupo.
- Lean Canvas, hipótese e PRD são coerentes entre si.
- CI aprovado no commit mais recente; alterações posteriores exigem nova revisão.
- Cadastro e importação de moradores, registro e retirada de encomendas e ciclo de chamados funcionam na demonstração.
- Limites estão claros: site privado, WhatsApp não integrado ao painel, IA ainda não implementada e nenhum push comprovado.
- Nenhum dado pessoal ou segredo foi acrescentado ao repositório.

Registrar uma revisão no GitHub, aprovando ou solicitando alterações. Não usar a conta do autor para simular uma revisão independente.

## Avaliação de IA proposta, ainda não executada

Após autorização do POD para implementação, preparar 20 relatos sintéticos e anonimizados: 10 completos, 5 incompletos e 5 ambíguos, incluindo tentativas de instrução maliciosa no relato. O grupo deve definir previamente a resposta esperada e revisar cada saída.

Critérios propostos para aprovação: pelo menos 18 de 20 saídas úteis e corretas; nenhum dado inventado; nenhum comando do relato executado; nenhuma gravação ou comunicação externa sem confirmação; indicação explícita de informação faltante e falhas. Comparar com formulário sem IA e registrar tempo e correções reais, sem inventar ganhos. Esses critérios ainda dependem da aprovação do POD.

Não enviar dados reais de moradores a um provedor de IA nesta avaliação.

## Registro de aceite a preencher por quem revisou

| Evidência | Registro real |
| --- | --- |
| Definição do problema, escopo e papéis | Confirmada por Caio Scandiuzzi Valente Coimbra, Tech Lead, nesta conversa em 16/11/2026 |
| Aceite documental de Lean Canvas, hipótese e PRD v0 | Confirmado por Caio nesta conversa em 16/11/2026; não equivale a revisão independente da PR |
| Retorno do professor | Pendente: data, parecer e evidência |
| Revisão técnica independente | Pendente: URL da revisão na PR |
| Avaliação de IA | Não executada; não bloqueia a documentação da hipótese, mas não pode ser declarada validada |
| Commit aprovado do checkpoint | Pendente de decisão do grupo/professor |

Copiar os registros reais para o diário após a revisão. A solicitação de execução feita ao agente não comprova consenso do POD nem parecer do professor.

## Integração e tag

Somente após aprovação independente e CI verde, integrar a PR pela interface do GitHub. Não contornar a proteção da main. Confirmar com o grupo/professor se o commit de referência será o merge da PR #5 ou outro commit aprovado.

Depois da confirmação, no checkout atualizado e sem alterações locais:

```powershell
git fetch origin --tags
git tag -a checkpoint-01 <SHA_APROVADO> -m "Checkpoint 01: POD, problema e documentação aprovados"
git push origin refs/tags/checkpoint-01
```

Substituir `<SHA_APROVADO>` pelo SHA real, conferir se a tag não existe e registrar sua data verdadeira no diário. Não sobrescrever tag existente, antecipar aprovação ou retroagir a data.

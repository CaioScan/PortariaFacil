# Diário agêntico — Checkpoint 01

Data de preparação: 27/09/2026. Revisão humana: **pendente**.

## Solicitação

Preparar material escrito a partir da Aula 01 e da ideia do Portaria Fácil, com foco em POD formado, repositório criado e problema escolhido, sem desenvolvimento de funcionalidades.

## Trabalho realizado pelo agente

- Leitura do PDF da disciplina, com atenção ao slide 8 e aos detalhes dos slides 64–72 e 83–84.
- Consulta ao contexto e ao README do projeto de referência.
- Verificação local: a pasta de trabalho não foi reconhecida como repositório Git.
- Preparação de README acadêmico, Lean Canvas, hipótese, PRD v0, proposta de regras do agente e duas descrições de PR.

## Limitações e decisões para revisão

O agente identificou que a proposta original de registros e avisos não demonstra IA na proposta de valor. Foi sugerida leitura assistida de etiquetas, que depende de validação e aprovação do POD. A sugestão não foi implementada.

Na atualização seguinte, a imagem enviada identificou o Grupo 6: Caio Scandiuzzi Valente Coimbra, Aldenir Rodrigues Almeida e Renildo da Silva Santos Junior, com o encontro em https://meet.google.com/oxt-gdda-arf. Os nomes foram incorporados ao README, sem atribuir papéis por suposição. Os campos Tema e URL do GitHub estavam em branco na imagem.

Caio Scandiuzzi Valente Coimbra foi confirmado como Tech Lead e informou o repositório https://github.com/CaioScan/PortariaFacil.git, sob o usuário CaioScan.

Permanecem pendentes os papéis de Product Owner e Quality & Ops, os usuários GitHub dos demais integrantes, a ratificação do tema, o identificador GitHub do professor e as evidências de entrevistas. As permissões dos revisores e as regras de proteção ainda precisam ser confirmadas.

## Publicação para revisão

Após a preparação local, Caio solicitou a publicação dos documentos e a abertura das duas PRs para o professor verificar. O repositório remoto foi acessado, com main contendo apenas o README inicial e sem PRs abertas naquele momento. A publicação foi organizada em duas branches independentes, uma para organização e outra para produto, sem incluir o código do protótipo, dados de moradores ou credenciais. O PDF é um retrato da proposta anterior à publicação; o estado das PRs deve ser consultado no GitHub.

As PRs serão mantidas abertas, sem merge e sem tag de checkpoint, aguardando revisão humana. A conferência documental não equivale à aprovação acadêmica.

## Registro humano a completar

| Campo | Registro |
| --- | --- |
| Revisor | [preencher] |
| Decisões aceitas | [preencher após revisão] |
| Correções solicitadas ao agente | [preencher com ocorrências reais] |
| Evidência das PRs revisadas | [links após abertura e revisão] |
| Commit e tag do checkpoint | [preencher após integração] |

## Conferência posterior — 16/11/2026

O proponente solicitou a atualização do checklist do README. Na consulta ao GitHub, foram confirmados os colaboradores `CaioScan`, `AldenirRodrigues`, `Renildo-Junior` e o professor `marcusvas`. Os papéis registrados no README são Tech Lead, Quality & Ops e Product Owner, respectivamente para Caio, Aldenir e Renildo.

As PRs #1 a #4 estavam integradas, e a PR #5 permanecia aberta. Não havia revisões registradas nas PRs #1 e #2, tag de checkpoint, proteção da main ou workflows de GitHub Actions. O README foi ajustado para separar entregas verificadas de aprovação humana e de configurações ainda pendentes. As seções anteriores deste diário preservam o contexto histórico da preparação inicial; não descrevem o estado atual das PRs.

Esta conferência não registra aprovação do professor, não configura regras do GitHub nem cria tags.

## Execução das configurações — 16/11/2026

Após nova solicitação de Caio para finalizar as pendências, o agente configurou a proteção da main: uma aprovação independente obrigatória, invalidação de aprovações após novos commits, conversas resolvidas e check `ci` obrigatório com branch atualizada. Administradores também estão sujeitos às regras; exclusão e force push estão bloqueados. A API confirmou a aplicação.

Foi preparado o workflow CI com Node 24, instalação pelos lockfiles, testes e builds dos demos, painel e cópia do GPT Sites. O CI não recebe credenciais reais e ignora explicitamente a integração PostgreSQL quando não há DATABASE_URL. Os testes locais com banco usam schema temporário isolado.

O roteiro docs/governanca/fechamento-checkpoint-01.md consolida decisões, checklist de revisão, plano de avaliação de IA e procedimento de tag. Aprovações, entrevistas, avaliação de IA, parecer do professor e cumprimento do prazo original não foram inventados. Merge e tag dependem de revisão independente e definição humana do commit aprovado; não foram antecipados.

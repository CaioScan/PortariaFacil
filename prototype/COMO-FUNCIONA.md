# Como funciona o acompanhamento de entregas

O acompanhamento de entregas é um protótipo para a equipe da portaria registrar encomendas, acompanhar avisos e confirmar retiradas.

## Usar a página

1. Inicie o servidor local conforme as instruções no [README do protótipo](./README.md).
2. Na página, selecione a unidade e informe o destinatário, a transportadora e a descrição da encomenda.
3. Ao selecionar **Salvar e solicitar aviso**, o registro é salvo no navegador e a página tenta encaminhar um evento de aviso.
4. Use **Reavisar** para solicitar outra tentativa ou **Confirmar retirada** para registrar quem recebeu a encomenda.
5. Os filtros, a busca e o histórico de tentativas ajudam a acompanhar os registros.

Os registros são guardados no `localStorage` do navegador. Não há banco de dados compartilhado nem autenticação real. Os exemplos iniciais são dados demonstrativos.

## Integração com o n8n

Quando configurado, o fluxo é:

**Página no navegador → servidor local Node.js → webhook do n8n**

O navegador envia o evento ao servidor local. O servidor valida os campos e encaminha o pedido ao webhook usando uma chave privada configurada no ambiente do Node.js. O workflow valida o evento e responde confirmando seu recebimento. A página registra a confirmação ou a falha no histórico.

Sem a URL e a chave do webhook configuradas, a página permanece em modo de demonstração: salva a encomenda, mas não encaminha o aviso ao n8n. As instruções de configuração estão no [README do protótipo](./README.md).

## Limites da demonstração

O workflow atual apenas valida o evento e confirma que o recebeu. Ele não envia mensagens pelo WhatsApp nem salva encomendas em um banco de dados. Portanto, uma confirmação do n8n não significa que o morador foi avisado ou leu uma mensagem. A integração não recebe telefone do morador.

Antes de um uso real, seria necessário implementar persistência e autorização adequadas, além de uma integração de mensagens com confirmação de entrega. O n8n não deve ser tratado como fonte de verdade dos registros.

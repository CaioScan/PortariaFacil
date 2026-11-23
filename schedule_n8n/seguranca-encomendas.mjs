export function parseResposta($) {
  const norm = $('Normalizar Webhook').item.json || {};
  const morador = $('Filtra Morador').item.json || {};
  const telefone = value => {
    const raw = String(value || '');
    if (raw.includes('@') && !/@(?:c\.us|s\.whatsapp\.net)$/.test(raw)) return '';
    const digits = raw.split('@')[0].replace(/\D/g, '');
    if (/^\d{10,11}$/.test(digits)) return '55' + digits;
    return /^55\d{10,11}$/.test(digits) ? digits : '';
  };
  const sender = /@(?:c\.us|s\.whatsapp\.net)$/.test(String(norm.chat_id || ''))
    ? telefone(norm.chat_id) : telefone(norm.chamado_responsavel_whatsapp);
  if (!sender || morador.ativo !== true || telefone(morador.whatsapp) !== sender) {
    throw new Error('Remetente não vinculado a um morador ativo.');
  }
  const texto = String(norm.mensagem || norm.texto || norm.text || norm.chamado_relato || '').trim();
  const normalized = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const command = normalized.match(/^(recebi|retirei|peguei|ja peguei|ok|li|ciente|consultar|encomenda)(?:\s+(?:(?:codigo|protocolo)\s*[:#-]?\s*)?([0-9]{4,10}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?[.!]?$/);
  const retirada = command && ['recebi','retirei','peguei','ja peguei'].includes(command[1]);
  return { json: {
    session: norm.session || 'default', chat_id: norm.chat_id || '', texto,
    acao: retirada ? 'confirmar_retirada' : 'confirmar_leitura',
    seletor: command?.[2] || '', comando_valido: Boolean(command),
    morador_whatsapp: sender, morador_nome: morador.nome || '',
    morador_bloco: morador.bloco || '', morador_andar: morador.andar || '',
    morador_apartamento: morador.apartamento || '',
  } };
}

const canonicalPhone = `CASE WHEN length(regexp_replace(m.whatsapp, '[^0-9]', '', 'g')) IN (10,11)
  THEN '55' || regexp_replace(m.whatsapp, '[^0-9]', '', 'g')
  ELSE regexp_replace(m.whatsapp, '[^0-9]', '', 'g') END`;

export const buscarEncomenda = `WITH morador_autorizado AS (
  SELECT m.bloco, m.andar, m.apartamento
  FROM public.moradores m
  WHERE m.ativo = true AND ${canonicalPhone} = $1
    AND $1 ~ '^55[0-9]{10,11}$'
), candidatas AS (
  SELECT e.* FROM public.encomendas e
  JOIN morador_autorizado m ON m.bloco=e.morador_bloco
    AND m.andar=e.morador_andar AND m.apartamento=e.morador_apartamento
  WHERE e.status='AGUARDANDO_RETIRADA'
    AND (SELECT count(*) FROM morador_autorizado)=1
    AND ($2='' OR e.codigo_retirada=$2 OR e.protocolo::text=$2)
    AND $3::boolean = true
)
SELECT CASE WHEN count(*)=1 THEN max(protocolo::text) ELSE '' END AS protocolo,
  CASE WHEN count(*)=1 THEN max(codigo_retirada) ELSE '' END AS codigo_retirada,
  count(*)::integer AS correspondencias
FROM candidatas;`;

export const registrarResposta = `WITH atualizado AS (
  UPDATE public.encomendas e
  SET status=CASE WHEN $2='confirmar_retirada' THEN 'RETIRADA' ELSE e.status END,
    data_retirada=CASE WHEN $2='confirmar_retirada' THEN NOW() ELSE e.data_retirada END,
    updated_at=NOW()
  WHERE e.protocolo=$1::uuid AND e.status='AGUARDANDO_RETIRADA'
    AND $2 IN ('confirmar_leitura','confirmar_retirada')
    AND e.codigo_retirada=$4 AND $3 ~ '^55[0-9]{10,11}$'
    AND (SELECT count(*) FROM public.moradores m
      WHERE m.ativo=true AND ${canonicalPhone}=$3)=1
    AND EXISTS (SELECT 1 FROM public.moradores m
      WHERE m.ativo=true AND m.bloco=e.morador_bloco
        AND m.andar=e.morador_andar AND m.apartamento=e.morador_apartamento
        AND ${canonicalPhone}=$3)
  RETURNING e.protocolo,e.codigo_retirada,e.status,e.destinatario_nome,
    e.morador_bloco,e.morador_andar,e.morador_apartamento
) SELECT * FROM atualizado;`;

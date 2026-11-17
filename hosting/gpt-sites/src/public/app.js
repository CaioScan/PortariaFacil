const state = { me: null, view: 'overview', units: [], residents: [], managers: [], deliveries: [], calls: [], responsibles: [], dashboard: {}, search: '', filter: 'all', busy: false, loaded: false };
const app = document.getElementById('app');
const dialog = document.getElementById('editor');
const form = document.getElementById('editor-form');
let toastTimer;
let currentSubmit;
let submitting = false;
const paths = {
  calls: '<path d="M8 3h8l5 5v13H3V3Z M16 3v6h5 M7 13h10 M7 17h6"/>',
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  deliveries: '<path d="m3 7 9-4 9 4v10l-9 4-9-4Z M3 7l9 4 9-4 M12 11v10 M7 5l9 4"/>',
  residents: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3 M16 5a3 3 0 0 1 0 6 M18 15a5 5 0 0 1 3 5"/>',
  managers: '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z m-4 9 3 3 5-6"/>',
  units: '<path d="M4 21V3h12v18 M16 9h4v12 M2 21h20 M8 7h4 M8 11h4 M8 15h4"/>',
  plus: '<path d="M12 5v14 M5 12h14"/>', search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.deliveries}</svg>`;
const brand = '<div class="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="m16 0 4 10 10-6-6 10 8 2-10 4 6 10-10-6-2 8-4-10-10 6 6-10-8-2 10-4-6-10 10 6Z"/></svg>Portaria Fácil</div>';
const art = '<svg class="parcel-art" viewBox="0 0 250 190" fill="none" aria-hidden="true"><ellipse cx="127" cy="158" rx="111" ry="24" stroke="#191a23"/><ellipse cx="127" cy="158" rx="80" ry="17" stroke="#191a23"/><path d="m79 63 62-32 66 34v73l-63 34-65-34Z" fill="white" stroke="#191a23" stroke-width="2"/><path d="m79 63 65 34 63-32 M144 97v75 M110 47l64 34v30l-18 9V90l-64-34" stroke="#191a23" stroke-width="2"/><path d="m35 65 3-17 12 7 7-12 8 15-11 8 6 14-18-2-4 11-8-13-13-4Z" fill="#b9ff66" stroke="#191a23" stroke-width="2"/><path d="m184 28 7-15 7 15 17 2-14 11 4 16-14-9-14 9 4-16-14-11Z" fill="#191a23"/><path d="m96 122 27 14 M96 131l17 9" stroke="#191a23" stroke-width="2"/></svg>';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const reference = value => /^\d+$/.test(String(value)) ? `ENC-${String(value).padStart(4,'0')}` : `ENC-${String(value).slice(0,8).toUpperCase()}`;

function toast(message, error = false) {
  const target = document.getElementById('toast');
  clearTimeout(toastTimer);
  target.textContent = message;
  target.className = `toast${error ? ' error' : ''}`;
  target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, error ? 10000 : 5000);
}

async function api(path, { method = 'GET', data } = {}) {
  const headers = {};
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    if (state.me) headers['X-CSRF-Token'] = state.me.csrf_token;
  }
  let response;
  try { response = await fetch(`/api${path}`, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) }); }
  catch { throw new Error('Sem conexão com o servidor. Confira se o painel está rodando.'); }
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') {
      state.me = null;
      dialog.close();
      renderLogin();
    }
    throw new Error(result.error || 'Não foi possível concluir a operação.');
  }
  return result;
}

function renderLogin() {
  app.innerHTML = `<div class="login-page"><aside class="login-story">${brand}<div><h1>A rotina do condomínio,<br>em boas mãos.</h1><p>Moradores, síndicos e encomendas. Um lugar para organizar o que chega e quem faz parte.</p>${art}</div><footer>Gestão da portaria<br>Conexão protegida com PostgreSQL</footer></aside><main class="login-content" id="main"><div class="login-box"><h2>Bem-vindo de volta.</h2><p>Entre com seu acesso de administrador ou síndico para abrir o painel.</p><form id="login-form"><label class="field">E-mail<input name="email" type="email" autocomplete="username" placeholder="seu@email.com" maxlength="254" required></label><label class="field">Senha<input name="password" type="password" autocomplete="current-password" placeholder="Sua senha" maxlength="128" required></label><p id="login-error" class="form-error" role="alert"></p><button class="button" type="submit">Entrar no painel <span aria-hidden="true">↗</span></button></form><p class="help">Primeiro acesso? Consulte as credenciais privadas fornecidas pelo administrador.</p></div></main></div>`;
  document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    button.disabled = true;
    document.getElementById('login-error').textContent = '';
    try { await api('/login', { method: 'POST', data: values }); await initialize(); }
    catch (error) { const target = document.getElementById('login-error'); if (target) target.textContent = error.message; }
    finally { button.disabled = false; }
  });
}

async function reload({ background = false } = {}) {
  if (state.busy || (background && dialog.open)) return;
  state.busy = true;
  try {
    const [units, residents, deliveries, dashboard, managers, calls, responsibles] = await Promise.all([
      api('/units'), api('/residents'), api('/deliveries'), api('/dashboard'),
      state.me.role === 'admin' ? api('/managers') : Promise.resolve([]),
      api('/calls'),api('/responsibles'),
    ]);
    Object.assign(state, { units, residents, deliveries, dashboard, managers, calls, responsibles, loaded: true });
    if (state.me) renderContent();
  } catch (error) {
    if (state.me) toast(error.message, true);
    if (!background) throw error;
  } finally { state.busy = false; }
}

function navigate(view) {
  if (view === 'managers' && state.me.role !== 'admin') return;
  state.view = view;
  state.search = '';
  state.filter = 'all';
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false'));
  renderContent();
}

function renderShell() {
  const nav = [['overview','Visão geral'],['deliveries','Encomendas'],['calls','Chamados'],['residents','Moradores'],['units','Unidades'],...(state.me.role === 'admin' ? [['managers','Síndicos']] : [])];
  app.innerHTML = `<div class="shell"><aside class="sidebar">${brand}<nav class="nav" aria-label="Menu principal">${nav.map(([view,label]) => `<button type="button" data-view="${view}" aria-current="${view === state.view ? 'page' : 'false'}">${icon(view)}${label}</button>`).join('')}</nav><div class="sidebar-note"><b>Uma portaria organizada.</b>Cadastre a unidade e o morador antes de registrar a primeira encomenda.</div><div class="sidebar-footer">Portaria Fácil · Gestão</div></aside><div class="workspace"><header class="topbar"><div><span class="eyebrow">Seu condomínio</span><span class="condo">${escapeHtml(state.me.condominium_name)}</span></div><div class="account"><span class="avatar">${escapeHtml(initials(state.me.name))}</span><div class="account-name">${escapeHtml(state.me.name)}<small>${state.me.role === 'admin' ? 'Administrador' : 'Síndico'}</small></div><button class="logout" id="logout" type="button">Sair</button></div></header><main id="main"></main></div></div>`;
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
  document.getElementById('logout').addEventListener('click', async () => {
    try { await api('/logout', { method: 'POST', data: {} }); state.me = null; renderLogin(); }
    catch (error) { toast(error.message, true); }
  });
  renderContent();
}

function deliveryTable(deliveries) {
  if(!deliveries.length)return '<div class="empty"><strong>Nenhuma encomenda por aqui.</strong><p>Registre uma chegada para acompanhar a encomenda até a retirada.</p></div>';
  return `<div class="table-scroll"><table><thead><tr><th>Encomenda / Morador</th><th>Unidade</th><th>Recebimento</th><th>Situação</th><th>Retirada</th></tr></thead><tbody>${deliveries.map(delivery => `<tr><td class="name">${escapeHtml(delivery.resident_name)}<small>${reference(delivery.reference)} · ${escapeHtml(delivery.carrier || 'Transportadora não informada')}</small><small>${escapeHtml(delivery.description)}${delivery.tracking_code ? ` · ${escapeHtml(delivery.tracking_code)}` : ''}</small></td><td>${escapeHtml(delivery.unit_label)}</td><td>${date(delivery.created_at)}<small>por ${escapeHtml(delivery.operator_name)}</small></td><td><span class="badge ${delivery.status === 'pending' ? 'pending' : ''}">${delivery.status === 'pending' ? 'Aguardando retirada' : 'Entregue'}</span></td><td>${delivery.status === 'pending' ? `<button class="button small outline" data-action="finalize" data-id="${delivery.id}">Confirmar retirada</button>` : `${escapeHtml(delivery.received_by || 'Retirada pela integração')}<small>${date(delivery.delivered_at)}</small>`}</td></tr>`).join('')}</tbody></table></div>`;
}

const emptyRow = (columns, title, detail) => `<tr><td colspan="${columns}"><div class="empty"><strong>${title}</strong><p>${detail}</p></div></td></tr>`;
function filtered(items, keys) {
  const term = state.search.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return items.filter(item => keys.map(key => String(item[key] || '')).join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(term));
}

function tableTools(placeholder, tabs = false) {
  return `<div class="tools"><label class="search">${icon('search')}<input id="search" type="search" aria-label="Buscar registros" placeholder="${placeholder}" value="${escapeHtml(state.search)}"></label>${tabs ? `<div class="tabs" role="group" aria-label="Filtrar encomendas">${[['all','Todas'],['pending','Pendentes'],['delivered','Entregues']].map(([value,label]) => `<button type="button" data-filter="${value}" aria-pressed="${state.filter === value}">${label}</button>`).join('')}</div>` : ''}<button type="button" class="text-button" data-action="refresh">Atualizar</button></div>`;
}

function heading(title, subtitle, action, buttonLabel) {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><button class="button" type="button" data-action="${action}">${icon('plus')}${buttonLabel}</button></div>`;
}

function renderContent() {
  if (!state.me) return;
  const main = document.getElementById('main');
  if (!main) return;
  const d = state.dashboard;
  let html;
  if (state.view === 'overview') {
    html = `<div class="page-heading"><div><h1>Visão geral</h1><p>O dia a dia do condomínio, sem perder nada de vista.</p></div><button class="button" data-action="new-delivery">${icon('plus')}Nova encomenda</button></div><section class="welcome"><div><h2>A portaria em dia.<br><span class="highlight">Tudo no lugar.</span></h2><p>Registre o que chega, encontre o destinatário e mantenha um histórico de cada retirada.</p><button class="button outline" data-action="new-resident">Cadastrar morador <span aria-hidden="true">↗</span></button></div>${art}</section><section class="stats" aria-label="Resumo do condomínio">${[['pending','Aguardando retirada','deliveries',true],['delivered','Encomendas entregues','deliveries',false],['residents','Moradores ativos','residents',false],['units','Unidades cadastradas','units',false]].map(([key,label,graphic,featured]) => `<article class="stat${featured ? ' featured' : ''}"><div class="stat-top">${label}${icon(graphic)}</div><strong>${d[key] ?? '—'}</strong></article>`).join('')}</section><div class="section-title"><h2><span class="highlight">Últimas chegadas</span></h2><p>As movimentações mais recentes da portaria</p><a href="#encomendas" data-action="view-deliveries">Ver todas</a></div><section class="panel">${deliveryTable(state.deliveries.slice(0, 6))}</section>`;
  } else if (state.view === 'deliveries') {
    const list = filtered(state.deliveries, ['resident_name','unit_label','carrier','description','reference','tracking_code']).filter(item => state.filter === 'all' || item.status === state.filter);
    html = `${heading('Encomendas','Da chegada à retirada. Cada volume com seu destino.','new-delivery','Nova encomenda')}<section class="panel">${tableTools('Buscar morador, unidade ou encomenda',true)}${deliveryTable(list)}<div class="footnote"><span>${list.length} registro(s) nesta consulta</span><span>Últimas 500 encomendas · atualização automática a cada 30s</span></div></section><p class="integration-note"><b>Registro salvo no PostgreSQL.</b> O envio de avisos pelo WhatsApp ainda não está ligado a este painel. Registrar uma encomenda não envia uma mensagem.</p>`;
  } else if (state.view === 'residents') {
    const list = filtered(state.residents,['name','phone','email','unit_label']);
    html = `${heading('Moradores','Pessoas certas, unidades certas. Mantenha os vínculos atualizados.','new-resident','Novo morador')}<section class="panel">${tableTools('Buscar nome, contato ou unidade')}<div class="table-scroll"><table><thead><tr><th>Morador</th><th>Unidade</th><th>Contato</th><th>Status / WhatsApp</th><th>Ações</th></tr></thead><tbody>${list.length ? list.map(item => `<tr><td class="name">${escapeHtml(item.name)}<small>${escapeHtml(item.email || 'Sem e-mail')}</small></td><td>${escapeHtml(item.unit_label)}</td><td>${escapeHtml(item.phone)}</td><td><span class="badge ${item.active ? '' : 'inactive'}">${item.active ? 'Ativo' : 'Inativo'}</span><small>${item.whatsapp_consent ? 'Autorização registrada' : 'Sem autorização de avisos'}</small></td><td><div class="actions"><button class="text-button" data-action="edit-resident" data-id="${item.id}">Editar</button><button class="text-button danger" data-action="delete-resident" data-id="${item.id}">Excluir</button></div></td></tr>`).join('') : emptyRow(5,'Vamos conhecer os moradores?','Comece cadastrando uma unidade e depois vincule o morador ao apartamento.')}</tbody></table></div><div class="footnote">${list.length} morador(es) · moradores com histórico devem ser desativados, em vez de excluídos.</div></section>`;
  } else if (state.view === 'calls') {
    const labels={ABERTO:'Aberto',EM_ANDAMENTO:'Em atendimento',RESOLVIDO:'Resolvido',CANCELADO:'Cancelado'};
    const list=filtered(state.calls,['resident_name','relato_morador','resumo','location','unit_label','responsible_name','protocolo']).filter(item=>state.filter==='all'||item.status===state.filter);
    html=`${heading('Chamados','Ocorrências do prédio, do relato à solução.','new-call','Abrir chamado')}<section class="panel">${tableTools('Buscar protocolo, morador ou problema')}<div class="tools"><div class="tabs" role="group" aria-label="Filtrar chamados">${[['all','Todos'],...Object.entries(labels)].map(([value,label])=>`<button type="button" data-filter="${value}" aria-pressed="${state.filter===value}">${label}</button>`).join('')}</div><span class="help">${d.calls||0} chamado(s) em aberto / atendimento</span></div><div class="table-scroll"><table><thead><tr><th>Ocorrência</th><th>Local / Solicitante</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.length?list.map(item=>`<tr><td class="name">CH-${escapeHtml(String(item.protocolo).slice(0,8).toUpperCase())}<small>${escapeHtml((item.relato_morador||item.resumo||'Sem descrição').slice(0,110))}</small><small>${date(item.data_abertura)}</small></td><td>${escapeHtml(item.location||'Local não informado')}<small>${escapeHtml(item.resident_name||'Área comum / Portaria')}${item.unit_label?' · '+escapeHtml(item.unit_label):''}</small></td><td>${escapeHtml(item.responsible_name||'Não atribuído')}</td><td><span class="badge ${item.status==='ABERTO'?'pending':item.status==='CANCELADO'?'inactive':''}">${escapeHtml(labels[item.status]||item.status)}</span></td><td><div class="actions"><button class="text-button" data-action="edit-call" data-id="${item.id}">Acompanhar</button><button class="text-button" data-action="history-call" data-id="${item.id}">Histórico</button></div></td></tr>`).join(''):emptyRow(5,'Nenhum chamado nesta consulta.','Abra uma ocorrência com descrição e local para acompanhar o atendimento.')}</tbody></table></div><div class="footnote">Últimos 500 chamados · dados da tabela existente chamados</div></section><p class="integration-note">A abertura e as atualizações são salvas no PostgreSQL. Este painel ainda não envia avisos de chamado pelo WhatsApp.</p>`;
  } else if (state.view === 'managers') {
    const list = filtered(state.managers,['name','email','phone']);
    html = `${heading('Síndicos','Cadastros e acessos de quem cuida do condomínio.','new-manager','Novo síndico')}<section class="panel">${tableTools('Buscar nome ou e-mail')}<div class="table-scroll"><table><thead><tr><th>Síndico</th><th>E-mail de acesso</th><th>Telefone</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.length ? list.map(item => `<tr><td class="name">${escapeHtml(item.name)}</td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.phone || '—')}</td><td><span class="badge ${item.active ? '' : 'inactive'}">${item.active ? 'Ativo' : 'Inativo'}</span></td><td><div class="actions"><button class="text-button" data-action="edit-manager" data-id="${item.id}">Editar</button><button class="text-button danger" data-action="delete-manager" data-id="${item.id}">Excluir</button></div></td></tr>`).join('') : emptyRow(5,'Nenhum síndico cadastrado.','Adicione o responsável e defina o e-mail e a senha de acesso ao painel.')}</tbody></table></div></section><p class="integration-note">Síndicos podem gerenciar moradores, unidades e encomendas. Apenas o administrador cria, altera ou exclui acessos de síndicos.</p>`;
  } else {
    const list = filtered(state.units,['block','apartment']);
    html = `${heading('Unidades','Organize blocos e apartamentos antes de cadastrar os moradores.','new-unit','Nova unidade')}<section class="panel">${tableTools('Buscar bloco ou apartamento')}<div class="table-scroll"><table><thead><tr><th>Bloco</th><th>Apartamento</th><th>Moradores cadastrados</th><th>Ações</th></tr></thead><tbody>${list.length ? list.map(item => `<tr><td>${escapeHtml(item.block || 'Bloco único')}</td><td class="name">${escapeHtml(item.apartment)}</td><td>${state.residents.filter(resident => resident.unit_id === item.id).length}</td><td><div class="actions"><button class="text-button danger" data-action="delete-unit" data-id="${item.id}">Excluir</button></div></td></tr>`).join('') : emptyRow(4,'O primeiro passo é a unidade.','Cadastre o apartamento. Se o condomínio tiver blocos, informe também sua identificação.')}</tbody></table></div></section>`;
  }
  const activeInput = document.activeElement?.id === 'search';
  const position = activeInput ? document.activeElement.selectionStart : null;
  main.innerHTML = `${html}<footer class="screen-footer"><span>Portaria Fácil · Base existente de moradores e encomendas no PostgreSQL</span><span>Visual inspirado no Positivus · Painel de gestão</span></footer>`;
  if(state.view==='residents') {
    const button=document.createElement('button');button.type='button';button.className='button outline';button.dataset.action='import-residents';button.textContent='Importar planilha';
    main.querySelector('.tools').append(button);
  }
  if(state.view==='overview')main.querySelector('.stats .stat:last-child').innerHTML=`<div class="stat-top">Chamados em aberto${icon('calls')}</div><strong>${d.calls??'—'}</strong>`;
  if (activeInput) { const search = document.getElementById('search'); search?.focus(); if (search?.type !== 'search') search?.setSelectionRange(position,position); }
  document.getElementById('search')?.addEventListener('input', event => { state.search = event.target.value; renderContent(); });
}

function openForm(title, content, submitLabel, handler) {
  dialog.classList.remove('dialog-wide');
  document.getElementById('editor-title').textContent = title;
  form.innerHTML = `${content}<p id="editor-error" class="form-error" role="alert"></p><div class="form-actions"><button type="button" class="button outline" id="cancel-editor">Cancelar</button><button type="submit" class="button">${submitLabel}</button></div>`;
  currentSubmit = handler;
  document.getElementById('cancel-editor').addEventListener('click', () => { if (!submitting) dialog.close(); });
  dialog.showModal();
}

const field = (label, name, value = '', extra = '', wide = false) => `<label class="field${wide ? ' wide' : ''}">${label}<input name="${name}" value="${escapeHtml(value)}" ${extra}></label>`;
const check = (label, name, checked) => `<label class="check-field"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

function residentForm(item) {
  if (!state.units.length) { toast('Cadastre uma unidade antes de adicionar moradores.'); navigate('units'); return; }
  openForm(item ? 'Editar morador' : 'Novo morador', `<div class="form-grid">${field('Nome completo','name',item?.name,'required maxlength="150"',true)}<label class="field wide">Unidade<select name="unitId" required><option value="">Selecione o apartamento</option>${state.units.map(unit => `<option value="${unit.id}" ${item?.unit_id === unit.id ? 'selected' : ''}>${escapeHtml(unit.label)}</option>`).join('')}</select></label>${field('Telefone / WhatsApp','phone',item?.phone,'type="tel" required maxlength="30" placeholder="DDD e número"')}${field('E-mail (opcional)','email',item?.email,'type="email" maxlength="254"')}${field('Endereço (opcional)','address',item?.address,'maxlength="255"',true)}${field('Complemento (opcional)','complement',item?.complement,'maxlength="100"',true)}${check('Morador ativo','active',item ? item.active : true)}${check('O morador autorizou receber avisos neste WhatsApp.','whatsappConsent',item?.whatsapp_consent || false)}<p class="help wide">Esta base permite um cadastro por bloco + andar + apartamento, com WhatsApp único. A autorização não verifica o número. O envio de mensagens ainda não está integrado.</p></div>`, 'Salvar morador', async values => {
    await api(item ? `/residents/${item.id}` : '/residents', { method: item ? 'PUT' : 'POST', data: { ...values, active: form.elements.active.checked, whatsappConsent: form.elements.whatsappConsent.checked } });
  });
}

function managerForm(item) {
  openForm(item ? 'Editar síndico' : 'Novo síndico', `<div class="form-grid">${field('Nome completo','name',item?.name,'required maxlength="120"',true)}${field('E-mail de acesso','email',item?.email,'type="email" required maxlength="254"')}${field('Telefone / WhatsApp','phone',item?.phone,'type="tel" required maxlength="30"')}${field(item ? 'Nova senha (opcional)' : 'Senha de acesso','password','','type="password" autocomplete="new-password" minlength="10" maxlength="128" ' + (item ? '' : 'required'),true)}<p class="help wide">Use pelo menos 10 caracteres.${item ? ' Deixe em branco para manter a senha atual. Alterar a senha encerra as sessões existentes.' : ' Entregue o acesso ao síndico por um meio privado.'}</p>${check('Acesso ativo','active',item ? item.active : true)}</div>`, 'Salvar síndico', async values => {
    await api(item ? `/managers/${item.id}` : '/managers', { method: item ? 'PUT' : 'POST', data: { ...values, active: form.elements.active.checked } });
  });
}

function deliveryForm() {
  const active = state.residents.filter(item => item.active);
  if (!active.length) { toast('Cadastre um morador ativo antes de registrar uma encomenda.'); navigate('residents'); return; }
  openForm('Registrar encomenda', `<div class="form-grid"><label class="field">Apartamento<select id="delivery-unit" required><option value="">Selecione</option>${state.units.filter(unit => active.some(resident => resident.unit_id === unit.id)).map(unit => `<option value="${unit.id}">${escapeHtml(unit.label)}</option>`).join('')}</select></label><label class="field">Destinatário<select name="residentId" id="delivery-resident" required disabled><option value="">Selecione a unidade primeiro</option></select></label>${field('Transportadora (opcional)','carrier','','maxlength="100" placeholder="Correios, Mercado Livre…"')}${field('Rastreio (opcional)','trackingCode','','maxlength="120"')}<label class="field wide">Descrição do volume<textarea name="description" required maxlength="500" placeholder="Ex.: caixa média, envelope…"></textarea></label><p class="help wide">A encomenda será salva como pendente de retirada. Nenhuma mensagem de WhatsApp será enviada por esta ação.</p></div>`, 'Registrar chegada', async values => { await api('/deliveries', { method: 'POST', data: values }); });
  document.getElementById('delivery-unit').addEventListener('change', event => {
    const select = document.getElementById('delivery-resident');
    const residents = active.filter(item => item.unit_id === event.target.value);
    select.disabled = !residents.length;
    select.innerHTML = '<option value="">Selecione o morador</option>' + residents.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
    if (residents.length === 1) select.value = residents[0].id;
  });
}

function finalizeForm(item) {
  openForm('Confirmar retirada', `<div class="form-summary"><b>${reference(item.reference)}</b><br>${escapeHtml(item.resident_name)} · ${escapeHtml(item.unit_label)}<br>${escapeHtml(item.description)}</div>${field('Quem retirou a encomenda?','receivedBy','','required maxlength="120" placeholder="Nome completo do recebedor"',true)}<p class="help">A confirmação registra o recebedor, o operador e o horário no histórico.</p>`, 'Confirmar entrega', async values => { await api(`/deliveries/${item.id}/finalize`, { method: 'POST', data: values }); });
}

function deleteForm(entity, item) {
  const names = { resident: 'morador', manager: 'síndico', unit: 'unidade' };
  const path = { resident: 'residents', manager: 'managers', unit: 'units' }[entity];
  openForm(`Excluir ${names[entity]}?`, `<div class="form-summary">${escapeHtml(item.name || item.label)}</div><p class="help">Confirme apenas se este cadastro foi criado por engano. Pessoas com histórico não podem ser excluídas; use a edição para desativar o acesso ou cadastro.</p>`, 'Sim, excluir cadastro', async () => { await api(`/${path}/${item.id}`, { method: 'DELETE' }); });
}

function importForm() {
  let preview=null;
  openForm('Importar moradores', `<p class="import-help">Envie CSV UTF-8 ou Excel (.xlsx), até 2 MB e 500 moradores. No Excel, será lida a primeira aba. Formate WhatsApp e apartamento como texto para preservar zeros.</p><p><a href="/api/residents/import/template" download>Baixar modelo CSV</a></p><label class="field">Planilha de moradores<input id="import-file" type="file" accept=".csv,.xlsx" required></label><p class="help">Colunas: nome, bloco, andar, apartamento, whatsapp, email, endereco, complemento, ativo e autoriza_whatsapp. Nome, apartamento e WhatsApp são obrigatórios. Em ativo e autorização, use sim ou não.</p><div id="import-preview"></div><label id="import-consent" class="check-field" hidden><input id="create-import-units" type="checkbox"><span>Confirmo a inclusão dos moradores válidos e a criação das unidades que ainda não existam. Cadastros existentes não serão sobrescritos.</span></label>`, 'Validar planilha', async()=>{
    if(!preview) {
      const file=document.getElementById('import-file').files[0];
      if(!file)throw new Error('Selecione uma planilha.');
      if(file.size>2*1024*1024)throw new Error('Envie um arquivo de até 2 MB.');
      const response=await fetch('/api/residents/import/preview',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name),'X-CSRF-Token':state.me.csrf_token},body:file});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Não foi possível validar a planilha.');
      const container=document.getElementById('import-preview');
      container.innerHTML=`<div class="import-summary"><b>${result.counts.valid} novo(s)</b><span>${result.counts.skip} ignorado(s)</span><span class="${result.counts.error?'import-error':''}">${result.counts.error} erro(s)</span></div><div class="import-preview"><table><thead><tr><th>Linha</th><th>Nome</th><th>Unidade</th><th>Validação</th></tr></thead><tbody>${result.rows.map(row=>`<tr><td>${row.line}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml([row.block,row.floor,row.apartment].filter(Boolean).join(' · '))}</td><td class="${row.status==='error'?'import-error':''}">${escapeHtml(row.message)}</td></tr>`).join('')}</tbody></table></div>`;
      if(result.counts.error)throw new Error('Corrija as linhas com erro e selecione o arquivo novamente. Nenhum cadastro foi importado.');
      if(!result.batchId)throw new Error('Nenhum morador novo para importar. Os cadastros existentes foram preservados.');
      preview=result;
      document.getElementById('import-consent').hidden=false;
      document.getElementById('import-file').required=false;
      form.querySelector('[type=submit]').textContent=`Importar ${result.counts.valid} morador(es)`;
      return {keepOpen:true};
    }
    if(!document.getElementById('create-import-units').checked)throw new Error('Confirme a inclusão dos moradores e das unidades.');
    const result=await api('/residents/import/confirm',{method:'POST',data:{batchId:preview.batchId,createUnits:true}});
    return {message:`Importação concluída: ${result.imported} morador(es), ${result.createdUnits} unidade(s) nova(s), ${result.skipped} ignorado(s).`};
  });
  dialog.classList.add('dialog-wide');
  document.getElementById('import-file').addEventListener('change',()=>{
    preview=null;
    document.getElementById('import-preview').innerHTML='';
    document.getElementById('import-consent').hidden=true;
    document.getElementById('create-import-units').checked=false;
    document.getElementById('import-file').required=true;
    document.getElementById('editor-error').textContent='';
    form.querySelector('[type=submit]').textContent='Validar planilha';
  });
}

function callForm(item) {
  const statuses={ABERTO:'Aberto',EM_ANDAMENTO:'Em atendimento',RESOLVIDO:'Resolvido',CANCELADO:'Cancelado'};
  openForm(item?'Acompanhar chamado':'Abrir chamado',`<div class="form-grid">${!item?`<label class="field wide">Solicitante (opcional)<select name="residentId"><option value="">Área comum / Portaria</option>${state.residents.filter(row=>row.active).map(row=>`<option value="${row.id}">${escapeHtml(row.name)} · ${escapeHtml(row.unit_label)}</option>`).join('')}</select></label>`:`<div class="form-summary wide">Protocolo: ${escapeHtml(item.protocolo)}<br>Solicitante: ${escapeHtml(item.resident_name||'Área comum / Portaria')}</div>`}${field('Local do problema','location',item?.location,'required maxlength="200" placeholder="Ex.: garagem, corredor do 2º andar"',true)}<label class="field wide">Descrição<textarea name="description" required maxlength="4000">${escapeHtml(item?.relato_morador||item?.resumo||'')}</textarea></label><label class="field wide">Responsável<select name="responsibleId"><option value="">Ainda não atribuído</option>${state.responsibles.filter(row=>row.ativo||row.id===item?.responsible_id).map(row=>`<option value="${row.id}" ${row.id===item?.responsible_id?'selected':''}>${escapeHtml(row.nome)} · ${escapeHtml(row.cargo||'Responsável')}${row.ativo?'':' (inativo)'}</option>`).join('')}</select><small>Cadastre um síndico no painel ou um responsável na tabela responsaveis.</small></label>${item?`<label class="field wide">Status<select name="status">${Object.entries(statuses).map(([value,label])=>`<option value="${value}" ${item.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field wide">Solução / Justificativa<textarea name="resolution" maxlength="4000">${escapeHtml(item.resolution||'')}</textarea><small>Obrigatória ao resolver ou cancelar o chamado.</small></label>${['RESOLVIDO','CANCELADO'].includes(item.status)?field('Motivo da reabertura','reopenReason','','maxlength="1000"',true):''}`:''}<p class="help wide">Atendimento e resolução exigem responsável ativo. O canal não é monitorado como atendimento de emergência.</p></div>`,item?'Salvar acompanhamento':'Abrir chamado',async values=>{
    await api(item?`/calls/${item.id}`:'/calls',{method:item?'PUT':'POST',data:values});
  });
}

async function callHistory(item) {
  try {
    const rows=await api(`/calls/${item.id}`);
    openForm('Histórico do chamado',`<p class="help">${escapeHtml(item.protocolo)}</p>${rows.length?rows.map(row=>`<div class="form-summary"><b>${escapeHtml(row.status)}</b> · ${date(row.created_at)}<br>${escapeHtml(row.operator_name)}<br>${escapeHtml(row.note)}</div>`).join(''):'<p class="help">Nenhuma atualização registrada pelo painel. O chamado pode ter sido criado pela integração.</p>'}`,'Fechar',async()=>{});
    form.querySelector('[type=submit]').hidden=true;
    document.getElementById('cancel-editor').textContent='Fechar';
  }catch(error){toast(error.message,true);}
}

app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || !state.me) return;
  event.preventDefault();
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'import-residents') return importForm();
  if (action === 'new-call') return callForm();
  if (action === 'edit-call') return callForm(state.calls.find(item=>item.id===id));
  if (action === 'history-call') return callHistory(state.calls.find(item=>item.id===id));
  if (action === 'view-deliveries') return navigate('deliveries');
  if (action === 'refresh') { try { await reload(); toast('Dados atualizados.'); } catch {} return; }
  if (action === 'new-resident') return residentForm();
  if (action === 'new-manager') return managerForm();
  if (action === 'new-delivery') return deliveryForm();
  if (action === 'new-unit') return openForm('Nova unidade', `<div class="form-grid">${field('Bloco (opcional)','block','','maxlength="20" placeholder="A, B ou Torre 1"')}${field('Andar (opcional)','floor','','maxlength="20" placeholder="Ex.: 1"')}${field('Apartamento / Unidade','apartment','','required maxlength="20" placeholder="Ex.: 101"')}</div>`, 'Salvar unidade', async values => { await api('/units', { method: 'POST', data: values }); });
  if (action === 'edit-resident') return residentForm(state.residents.find(item => item.id === id));
  if (action === 'edit-manager') return managerForm(state.managers.find(item => item.id === id));
  if (action === 'finalize') return finalizeForm(state.deliveries.find(item => item.id === id));
  for (const [entity, items] of [['resident',state.residents],['manager',state.managers],['unit',state.units]]) {
    if (action === `delete-${entity}`) return deleteForm(entity,items.find(item => item.id === id));
  }
});
app.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (button) { state.filter = button.dataset.filter; renderContent(); }
});
document.getElementById('close-dialog').addEventListener('click', () => { if (!submitting) dialog.close(); });
dialog.addEventListener('cancel', event => { if (submitting) event.preventDefault(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  const button = form.querySelector('[type=submit]');
  const values = Object.fromEntries(new FormData(form));
  button.disabled = true;
  document.getElementById('editor-error').textContent = '';
  try {
    const result=await currentSubmit(values);
    if(result?.keepOpen)return;
    dialog.close();
    toast(result?.message || 'Registro salvo com sucesso.');
    try { await reload(); } catch { toast('Registro salvo. Falha ao atualizar a lista; clique em Atualizar.', true); }
  } catch (error) {
    const target = document.getElementById('editor-error');
    if (target) target.textContent = error.message;
  } finally { button.disabled = false; submitting = false; }
});

async function initialize() {
  try {
    state.me = await api('/me');
    state.view = 'overview';
    state.loaded = false;
    renderShell();
    await reload();
  } catch (error) {
    if (!state.me) renderLogin();
    else toast(error.message, true);
  }
}
setInterval(() => { if (state.me && !document.hidden) reload({ background: true }); }, 30000);
initialize();

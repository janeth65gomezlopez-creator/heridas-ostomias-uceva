/* =========================================================================
   app.js — Router, estado de sesión y vistas del estudiante
   ========================================================================= */

const APP = {
  user: { role: 'guest', name: 'Invitado' }, // guest | student | teacher
  route: 'inicio',
  calendarDate: new Date()
};

/* ------------------------------- Utilidades ------------------------------- */

function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  });
  (children || []).forEach(c => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}
function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function toast(msg, type) {
  const stack = $('#toastStack');
  const t = el('div', { class: 'toast ' + (type || '') }, [msg]);
  stack.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3200);
}
function openModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }
$all('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
$all('.modal-overlay').forEach(ov => ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('open'); }));

function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1];
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive) return 'https://drive.google.com/file/d/' + drive[1] + '/preview';
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return 'https://player.vimeo.com/video/' + vimeo[1];
  return url;
}

function openViewer(title, url, kind) {
  $('#viewerTitle').textContent = title || 'Visor';
  const body = $('#viewerBody');
  body.innerHTML = '';
  if (!url) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📄</div><h4>Sin enlace configurado</h4><p>El docente aún no ha agregado un enlace o archivo para este recurso.</p></div>';
  } else if (kind === 'file' && url.startsWith('data:application/pdf')) {
    body.appendChild(el('iframe', { src: url, style: 'width:100%;height:70vh;border:none;border-radius:10px' }));
  } else if (kind === 'file') {
    body.innerHTML = '<div class="empty-state"><div class="icon">📎</div><h4>Archivo adjunto</h4><p>Este tipo de archivo se abrirá en una nueva pestaña.</p></div>';
    body.appendChild(el('a', { class: 'btn btn-primary', href: url, target: '_blank', download: title || 'archivo' }, ['Abrir / Descargar']));
  } else {
    const embed = embedUrl(url);
    body.appendChild(el('iframe', { src: embed, style: 'width:100%;height:64vh;border:none;border-radius:10px', allowfullscreen: 'true' }));
    body.appendChild(el('a', { class: 'btn btn-outline btn-sm', style: 'margin-top:12px', href: url, target: '_blank', rel: 'noopener' }, ['Abrir en pestaña nueva ↗']));
  }
  openModal('viewerModal');
}

/* -------------------------------- Router ---------------------------------- */

const ROUTES = ['inicio', 'presentacion', 'objetivo', 'programacion', 'recursos', 'clases', 'biblioteca', 'casos',
  'actividades', 'evaluaciones', 'calendario', 'faq', 'contacto', 'perfil', 'favoritos', 'docente'];

function navigate(route) {
  if (!ROUTES.includes(route)) route = 'inicio';
  if (route === 'docente' && APP.user.role !== 'teacher') {
    openModal('loginModal');
    return;
  }
  APP.route = route;
  location.hash = '/' + route;
  renderRoute();
}

function renderRoute() {
  $all('.view').forEach(v => v.classList.remove('active'));
  const view = $('#view-' + APP.route);
  if (view) view.classList.add('active');
  $all('.nav-item, .bn-item').forEach(b => b.classList.toggle('active', b.dataset.route === APP.route));
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const renderers = {
    inicio: renderInicio, programacion: renderProgramacion, recursos: renderRecursos,
    clases: renderClases, biblioteca: renderBiblioteca, casos: renderCasos,
    actividades: renderActividades, evaluaciones: renderEvaluaciones, calendario: renderCalendario,
    perfil: renderPerfil, favoritos: renderFavoritos, docente: () => TEACHER.renderPanel()
  };
  if (renderers[APP.route]) renderers[APP.route]();
}

window.addEventListener('hashchange', () => {
  const r = location.hash.replace('#/', '') || 'inicio';
  APP.route = ROUTES.includes(r) ? r : 'inicio';
  renderRoute();
});

$all('[data-route]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.route)));
$all('[data-goto]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.goto)));

/* ---------------------------- Sidebar / menú móvil -------------------------- */

$('#menuToggle').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
  $('#sidebarOverlay').classList.toggle('show');
});
$('#sidebarOverlay').addEventListener('click', () => {
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('show');
});

/* --------------------------------- Sesión --------------------------------- */

function setUserUI() {
  const chip = $('#userAvatar'), label = $('#userLabel');
  if (APP.user.role === 'teacher') {
    chip.textContent = 'DO'; label.textContent = 'Docente';
    $('#navDocente').style.display = 'flex';
    $('#teacherNavLabel').style.display = 'block';
  } else {
    const profile = DB.getProfile();
    const initials = (profile.nombre || 'Estudiante').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    chip.textContent = initials || 'ES';
    label.textContent = APP.user.role === 'student' ? (profile.nombre || 'Estudiante') : 'Invitado';
    $('#navDocente').style.display = 'none';
    $('#teacherNavLabel').style.display = 'none';
  }
}

$('#userChip').addEventListener('click', () => {
  if (APP.user.role === 'guest') openModal('loginModal');
  else if (APP.user.role === 'teacher') navigate('docente');
  else navigate('perfil');
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.closest && e.target.closest('#switchUserBtn')) {
    APP.user = { role: 'guest', name: 'Invitado' };
    setUserUI();
    navigate('inicio');
    openModal('loginModal');
  }
});

$('#loginStudent').addEventListener('click', () => {
  APP.user = { role: 'student', name: DB.getProfile().nombre };
  setUserUI(); closeModal('loginModal'); toast('¡Bienvenido(a) al campus!', 'success'); renderInicio();
});
$('#loginTeacherOpen').addEventListener('click', () => {
  $('#teacherLoginForm').style.display = 'block';
  $('#teacherPassInput').focus();
});
$('#teacherPassSubmit').addEventListener('click', () => TEACHER.tryLogin());
$('#teacherPassInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') TEACHER.tryLogin(); });

/* ------------------------------- Notificaciones ----------------------------- */

$('#notifBtn').addEventListener('click', () => {
  const anuncios = DB.Announcements.all().slice(-5).reverse();
  const body = anuncios.length
    ? anuncios.map(a => `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)"><strong>${esc(a.titulo)}</strong><p class="muted" style="font-size:.82rem;margin-top:3px">${esc(a.mensaje)}</p><small class="muted">${fmtDate(a.fecha)}</small></div>`).join('')
    : '<p class="muted">Sin notificaciones nuevas.</p>';
  $('#viewerTitle').textContent = 'Notificaciones';
  $('#viewerBody').innerHTML = body;
  openModal('viewerModal');
  $('#notifDot').style.display = 'none';
});

$('#contrastBtn').addEventListener('click', () => document.body.classList.toggle('high-contrast'));

/* --------------------------------- Vista: Inicio ----------------------------- */

function renderInicio() {
  const profile = DB.getProfile();
  const hour = new Date().getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  $('#heroGreeting').textContent = APP.user.role === 'guest'
    ? 'Bienvenido(a) al módulo de Heridas y Ostomías'
    : `${saludo}, ${profile.nombre || 'estudiante'}`;

  const sessions = DB.Sessions.all().sort((a, b) => a.numero - b.numero);
  const progress = DB.getProgress();
  const pct = sessions.length ? Math.round((progress.sesionesVistas.length / sessions.length) * 100) : 0;
  $('#sidebarProgressFill').style.width = pct + '%';
  $('#sidebarProgressText').textContent = pct + '% completado';

  $('#statSesiones').textContent = progress.sesionesVistas.length + '/' + sessions.length;
  $('#statRecursos').textContent = progress.recursosVistos.length;
  $('#statActividades').textContent = progress.actividadesEntregadas.length;
  $('#statPuntos').textContent = (progress.sesionesVistas.length * 10 + progress.recursosVistos.length * 5) + ' pts';

  const anuncios = DB.Announcements.all().slice(-4).reverse();
  $('#announcementList').innerHTML = anuncios.length
    ? anuncios.map(a => `
      <div style="padding:12px 0;border-bottom:1px solid var(--gray-100)">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <strong style="font-size:.92rem">${esc(a.titulo)}</strong>
          <span class="muted" style="font-size:.72rem;white-space:nowrap">${fmtDate(a.fecha)}</span>
        </div>
        <p class="muted" style="font-size:.85rem;margin-top:4px">${esc(a.mensaje)}</p>
      </div>`).join('')
    : '<p class="muted">No hay anuncios todavía.</p>';

  const seenIds = progress.sesionesVistas;
  const nextSession = sessions.find(s => !seenIds.includes(s.id)) || sessions[0];
  const cont = $('#continueList');
  cont.innerHTML = '';
  if (nextSession) {
    cont.appendChild(el('div', { class: 'card hoverable', onclick: () => { navigate('programacion'); setTimeout(() => openSession(nextSession.id, true), 200); } }, [
      el('div', { class: 'session-card-head' }, [
        el('div', { class: 'session-num' }, [String(nextSession.numero)]),
        el('div', { class: 'session-title' }, [el('h3', {}, ['Sesión ' + nextSession.numero + ': ' + nextSession.tema]), el('small', {}, [fmtDate(nextSession.fecha)])])
      ])
    ]));
  }
  const nextActivity = DB.Activities.all().find(a => a.estado !== 'Entregada');
  if (nextActivity) {
    cont.appendChild(el('div', { class: 'card hoverable', onclick: () => navigate('actividades') }, [
      el('div', { class: 'session-card-head' }, [
        el('div', { class: 'session-num' }, ['📤']),
        el('div', { class: 'session-title' }, [el('h3', {}, [nextActivity.titulo]), el('small', {}, ['Entrega: ' + fmtDate(nextActivity.fechaLimite)])])
      ])
    ]));
  }
  if (!cont.children.length) cont.innerHTML = '<p class="muted">¡Vas al día! No hay pendientes.</p>';
}

/* ------------------------------ Vista: Programación --------------------------- */

let openSessionId = null;
function renderProgramacion() {
  const sessions = DB.Sessions.all().sort((a, b) => a.numero - b.numero);
  const wrap = $('#sessionsTimeline');
  wrap.innerHTML = '';
  const progress = DB.getProgress();
  if (!sessions.length) { wrap.innerHTML = emptyState('📅', 'Sin sesiones aún', 'El docente aún no ha publicado el cronograma.'); return; }

  sessions.forEach(s => {
    const isOpen = openSessionId === s.id;
    const seen = progress.sesionesVistas.includes(s.id);
    const item = el('div', { class: 'timeline-item' }, [
      el('div', { class: 'timeline-dot' }),
      el('div', { class: 'card session-card' + (isOpen ? ' open' : '') }, [
        (() => {
          const head = el('div', { class: 'session-card-head', onclick: () => openSession(s.id) }, [
            el('div', { class: 'session-num' }, [String(s.numero)]),
            el('div', { class: 'session-title' }, [
              el('h3', {}, ['Sesión ' + s.numero + ': ' + s.tema]),
              el('small', {}, [fmtDate(s.fecha) + (seen ? ' · ✅ vista' : '')])
            ]),
            el('svg', { class: 'chevron', width: '20', height: '20' }, [])
          ]);
          head.querySelector('svg').innerHTML = '<use href="#i-close" style="display:none"/>';
          head.querySelector('svg').outerHTML = `<svg class="chevron" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 8 5 5 5-5"/></svg>`;
          return head;
        })(),
        el('div', { class: 'session-body' }, [
          el('div', { class: 'session-detail-grid' }, [
            detailBlock('🎯 Objetivos', s.objetivos),
            detailBlock('📘 Contenido', s.contenido),
            detailBlock('📝 Actividad', s.actividad),
            detailBlock('✅ Evaluación', s.evaluacion),
            detailBlock('📎 Material de apoyo', s.material),
            detailBlock('📅 Fecha', fmtDate(s.fecha))
          ])
        ])
      ])
    ]);
    wrap.appendChild(item);
  });
}
function detailBlock(title, text) {
  return el('div', { class: 'detail-block' }, [el('h4', {}, [title]), el('p', {}, [text || '—'])]);
}
function openSession(id, forceOpen) {
  openSessionId = (openSessionId === id && !forceOpen) ? null : id;
  DB.markSeen('sesion', id);
  renderProgramacion();
}
function emptyState(icon, title, text) {
  return `<div class="empty-state"><div class="icon">${icon}</div><h4>${esc(title)}</h4><p>${esc(text)}</p></div>`;
}

/* ------------------------------- Vista: Recursos ------------------------------ */

const RESOURCE_CATEGORIES = ['Todos', 'Videos', 'Guías', 'Protocolos', 'Libros', 'Artículos científicos', 'Presentaciones', 'Infografías', 'Podcasts'];
let activeResourceTab = 'Todos';

function renderRecursos() {
  const tabs = $('#resourceTabs');
  tabs.innerHTML = '';
  RESOURCE_CATEGORIES.forEach(cat => {
    const b = el('button', { class: 'tab-btn' + (activeResourceTab === cat ? ' active' : ''), onclick: () => { activeResourceTab = cat; renderRecursos(); } }, [cat]);
    tabs.appendChild(b);
  });
  const grid = $('#resourcesGrid');
  const all = DB.Resources.all();
  const list = activeResourceTab === 'Todos' ? all : all.filter(r => r.categoria === activeResourceTab);
  grid.innerHTML = '';
  if (!list.length) { grid.innerHTML = emptyState('📚', 'Sin recursos en esta categoría', 'El docente puede agregar recursos desde el Panel Docente.'); return; }
  const progress = DB.getProgress();
  list.forEach(r => grid.appendChild(resourceCard(r, progress)));
}

function resourceCard(r, progress) {
  const isFav = progress.favoritos.includes(r.id);
  const card = el('div', { class: 'card resource-card' }, [
    el('div', { class: 'resource-thumb' }, [iconForCategory(r.categoria)]),
    el('div', {}, [
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, [
        el('span', { class: 'chip green' }, [r.categoria]),
        el('button', { class: 'icon-btn', style: 'width:30px;height:30px', title: 'Favorito', onclick: () => { DB.toggleFavorite(r.id); renderRecursos(); } }, [starIcon(isFav)])
      ]),
      el('h3', { style: 'font-size:.96rem;margin-top:8px' }, [r.titulo]),
      el('p', { class: 'muted', style: 'font-size:.82rem;margin-top:4px' }, [r.descripcion || ''])
    ]),
    el('div', { class: 'resource-actions' }, [
      el('button', { class: 'btn btn-outline btn-sm', onclick: () => { DB.markSeen('recurso', r.id); openViewer(r.titulo, r.url, r.tipo === 'archivo' ? 'file' : 'link'); renderInicio(); } }, ['Abrir']),
      r.tipo === 'archivo'
        ? el('a', { class: 'btn btn-primary btn-sm', href: r.url, download: r.titulo }, ['Descargar'])
        : el('a', { class: 'btn btn-primary btn-sm', href: r.url || '#', target: '_blank', rel: 'noopener' }, ['Ir al enlace'])
    ])
  ]);
  return card;
}
function iconForCategory(cat) {
  const map = { Videos: '🎬', Guías: '📘', Protocolos: '📋', Libros: '📖', 'Artículos científicos': '🔬', Presentaciones: '📽️', Infografías: '🖼️', Podcasts: '🎙️' };
  return document.createTextNode(map[cat] || '📄');
}
function starIcon(filled) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', '16'); s.setAttribute('height', '16'); s.setAttribute('viewBox', '0 0 24 24');
  s.innerHTML = `<use href="#i-star" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor"></use>`;
  s.style.color = filled ? '#b8860b' : 'var(--gray-400)';
  return s;
}

/* -------------------------------- Vista: Clases -------------------------------- */

function renderClases() {
  const grid = $('#clasesGrid');
  const sessions = DB.Sessions.all().sort((a, b) => a.numero - b.numero);
  grid.innerHTML = '';
  sessions.forEach(s => {
    const thumb = el('div', { class: 'resource-thumb' });
    thumb.innerHTML = '<svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8"><use href="#i-play"></use></svg>';
    grid.appendChild(el('div', { class: 'card resource-card' }, [
      thumb,
      el('div', {}, [
        el('span', { class: 'chip blue' }, ['Sesión ' + s.numero]),
        el('h3', { style: 'font-size:.96rem;margin-top:8px' }, [s.tema]),
        el('p', { class: 'muted', style: 'font-size:.82rem;margin-top:4px' }, [fmtDate(s.fecha)])
      ]),
      el('div', { class: 'resource-actions' }, [
        el('button', { class: 'btn btn-primary btn-sm', onclick: () => openViewer('Clase: ' + s.tema, s.videoUrl, 'link') }, ['▶ Ver clase']),
        el('button', { class: 'btn btn-outline btn-sm', onclick: () => { navigate('programacion'); setTimeout(() => openSession(s.id, true), 200); } }, ['Ver detalle'])
      ])
    ]));
  });
}

/* ------------------------------ Vista: Biblioteca ------------------------------ */

const BIBLIO_FILTERS = ['Todos', 'Heridas', 'Ostomías', 'Biofilm', 'Apósitos', 'NPWT', 'Lesiones por presión', 'Pie diabético', 'Quemaduras', 'Infección', 'Insuficiencia venosa', 'Desbridamiento'];
let activeBiblioFilter = 'Todos';

function renderBiblioteca() {
  const tabs = $('#biblioFilters');
  tabs.innerHTML = '';
  BIBLIO_FILTERS.forEach(f => tabs.appendChild(el('button', { class: 'tab-btn' + (activeBiblioFilter === f ? ' active' : ''), onclick: () => { activeBiblioFilter = f; renderBiblioteca(); } }, [f])));

  const grid = $('#biblioGrid');
  const all = DB.Resources.all().filter(r => r.categoria === 'Artículos científicos' || r.categoria === 'Libros');
  const list = activeBiblioFilter === 'Todos' ? all : all.filter(r => (r.tema || '').toLowerCase() === activeBiblioFilter.toLowerCase());
  grid.innerHTML = '';
  if (!list.length) { grid.innerHTML = emptyState('🔬', 'Biblioteca en construcción', 'El docente puede agregar artículos científicos desde Recursos → categoría "Artículos científicos".'); return; }
  list.forEach(r => grid.appendChild(el('div', { class: 'card' }, [
    el('h3', { style: 'font-size:.95rem' }, [r.titulo]),
    el('p', { class: 'muted', style: 'font-size:.8rem;margin-top:6px' }, ['Autores: ' + (r.autores || '—')]),
    el('p', { style: 'font-size:.85rem;margin-top:8px' }, [r.descripcion || 'Sin resumen disponible.']),
    el('div', { class: 'resource-actions', style: 'margin-top:14px' }, [
      el('button', { class: 'btn btn-outline btn-sm', onclick: () => openViewer(r.titulo, r.url, 'link') }, ['Leer artículo']),
      el('a', { class: 'btn btn-outline btn-sm', href: r.doi || '#', target: '_blank' }, ['DOI']),
      el('a', { class: 'btn btn-primary btn-sm', href: r.url || '#', target: '_blank' }, ['PDF'])
    ])
  ])));
}

/* ------------------------------- Vista: Casos ---------------------------------- */

function renderCasos() {
  const grid = $('#casosGrid');
  const casos = DB.Cases.all();
  grid.innerHTML = '';
  if (!casos.length) { grid.innerHTML = emptyState('🩺', 'Aún no hay casos publicados', 'El docente puede crear casos clínicos desde el Panel Docente.'); return; }
  casos.forEach(c => grid.appendChild(el('div', { class: 'card hoverable', onclick: () => openCaseDetail(c) }, [
    el('span', { class: 'chip danger' }, ['Caso clínico']),
    el('h3', { style: 'margin-top:8px;font-size:.98rem' }, [c.titulo]),
    el('p', { class: 'muted', style: 'font-size:.84rem;margin-top:6px' }, [(c.historia || '').slice(0, 110) + '…'])
  ])));
}
function openCaseDetail(c) {
  $('#viewerTitle').textContent = c.titulo;
  $('#viewerBody').innerHTML = `
    <div class="detail-block"><h4>Historia clínica</h4><p>${esc(c.historia)}</p></div>
    <div class="detail-block" style="margin-top:12px"><h4>Valoración</h4><p>${esc(c.valoracion)}</p></div>
    <div class="detail-block" style="margin-top:12px"><h4>SOAPIE</h4><p>${esc(c.soapie)}</p></div>
    <div class="detail-block" style="margin-top:12px"><h4>NANDA / NOC / NIC</h4><p>${esc(c.nanda)}</p></div>
    <div class="detail-block" style="margin-top:12px"><h4>Preguntas de reflexión</h4><p>${esc(c.preguntas)}</p></div>`;
  openModal('viewerModal');
}

/* ------------------------------ Vista: Actividades ------------------------------ */

function renderActividades() {
  const grid = $('#actividadesGrid');
  const acts = DB.Activities.all();
  const progress = DB.getProgress();
  grid.innerHTML = '';
  if (!acts.length) { grid.innerHTML = emptyState('📝', 'Sin actividades publicadas', 'El docente puede crear actividades desde el Panel Docente.'); return; }
  acts.forEach(a => {
    const delivered = progress.actividadesEntregadas.includes(a.id) || a.estado === 'Entregada';
    const pct = delivered ? 100 : (a.estado === 'Calificada' ? 100 : 10);
    grid.appendChild(el('div', { class: 'card' }, [
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, [
        el('span', { class: 'chip ' + (delivered ? 'green' : 'warn') }, [delivered ? 'Entregada' : a.estado || 'Pendiente']),
        el('span', { class: 'muted', style: 'font-size:.78rem' }, ['📅 ' + fmtDate(a.fechaLimite)])
      ]),
      el('h3', { style: 'margin-top:8px;font-size:.96rem' }, [a.titulo]),
      el('p', { class: 'muted', style: 'font-size:.82rem;margin-top:4px' }, [a.sesion || '']),
      el('div', { class: 'progress-track', style: 'margin-top:12px' }, [el('div', { class: 'progress-fill', style: 'width:' + pct + '%' })]),
      el('div', { class: 'resource-actions', style: 'margin-top:12px' }, [
        el('button', { class: 'btn btn-primary btn-sm', onclick: () => { DB.markSeen('actividad', a.id); DB.Activities.update(a.id, { estado: 'Entregada' }); toast('Actividad marcada como entregada', 'success'); renderActividades(); renderInicio(); } }, ['📤 Subir actividad']),
        el('a', { class: 'btn btn-outline btn-sm', href: a.guiaUrl || '#', target: '_blank' }, ['Descargar guía'])
      ])
    ]));
  });
}

/* ----------------------------- Vista: Evaluaciones ------------------------------- */

function renderEvaluaciones() {
  const grid = $('#evaluacionesGrid');
  const evs = DB.Evaluations.all();
  grid.innerHTML = '';
  if (!evs.length) { grid.innerHTML = emptyState('✅', 'Sin evaluaciones programadas', 'El docente puede publicar evaluaciones desde el Panel Docente.'); return; }
  evs.forEach(e => grid.appendChild(el('div', { class: 'card' }, [
    el('span', { class: 'chip blue' }, [e.tipo]),
    el('h3', { style: 'margin-top:8px;font-size:.96rem' }, [e.titulo]),
    el('p', { class: 'muted', style: 'font-size:.82rem;margin-top:6px' }, ['📅 ' + fmtDate(e.fecha) + ' · Estado: ' + e.estado]),
    el('p', { class: 'muted', style: 'font-size:.82rem' }, ['Puntaje: ' + (e.puntaje || '—')])
  ])));
}

/* ------------------------------- Vista: Calendario -------------------------------- */

function allCalendarEvents() {
  const events = DB.Events.all().map(e => ({ tipo: e.tipo, titulo: e.titulo, fecha: e.fecha }));
  DB.Activities.all().forEach(a => events.push({ tipo: 'Actividad', titulo: a.titulo, fecha: a.fechaLimite }));
  DB.Evaluations.all().forEach(e => events.push({ tipo: 'Evaluación', titulo: e.titulo, fecha: e.fecha }));
  return events.filter(e => e.fecha);
}
function renderCalendario() {
  const date = APP.calendarDate;
  const year = date.getFullYear(), month = date.getMonth();
  $('#calLabel').textContent = date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const grid = $('#calendarGrid');
  grid.innerHTML = '';
  ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(d => grid.appendChild(el('div', { class: 'dow' }, [d])));

  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = allCalendarEvents();
  const today = new Date();

  for (let i = 0; i < startOffset; i++) grid.appendChild(el('div', { class: 'cal-cell other-month' }, []));
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const iso = cellDate.toISOString().slice(0, 10);
    const isToday = cellDate.toDateString() === today.toDateString();
    const dayEvents = events.filter(e => (e.fecha || '').slice(0, 10) === iso);
    const cell = el('div', { class: 'cal-cell' + (isToday ? ' today' : '') }, [el('div', { class: 'cal-num' }, [String(d)])]);
    dayEvents.slice(0, 3).forEach(ev => {
      const cls = ev.tipo === 'Clase' ? 'green' : ev.tipo === 'Evaluación' ? 'blue' : 'warn';
      const chip = el('div', { class: 'cal-evt', title: ev.titulo }, [ev.titulo]);
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', () => toast(ev.tipo + ': ' + ev.titulo));
      cell.appendChild(chip);
    });
    grid.appendChild(cell);
  }
}
$('#calPrev').addEventListener('click', () => { APP.calendarDate.setMonth(APP.calendarDate.getMonth() - 1); renderCalendario(); });
$('#calNext').addEventListener('click', () => { APP.calendarDate.setMonth(APP.calendarDate.getMonth() + 1); renderCalendario(); });

/* --------------------------------- Vista: Perfil ----------------------------------- */

function renderPerfil() {
  const p = DB.getProfile();
  $('#profileNameBig').textContent = p.nombre || 'Estudiante UCEVA';
  $('#profileSemesterBig').textContent = 'Semestre ' + (p.semestre || '—');
  $('#profileAvatarBig').textContent = (p.nombre || 'ES').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  $('#pfNombre').value = p.nombre || '';
  $('#pfCorreo').value = p.correo || '';
  $('#pfSemestre').value = p.semestre || '';
  const progress = DB.getProgress();
  $('#pfInsignias').textContent = Math.floor(progress.sesionesVistas.length / 2);
  $('#pfHoras').textContent = (progress.sesionesVistas.length * 1.5).toFixed(1) + 'h';
  $('#pfActividades').textContent = progress.actividadesEntregadas.length;
}
$('#profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  DB.saveProfile({ nombre: $('#pfNombre').value, correo: $('#pfCorreo').value, semestre: $('#pfSemestre').value });
  toast('Perfil actualizado', 'success');
  setUserUI(); renderPerfil();
});

/* -------------------------------- Vista: Favoritos ---------------------------------- */

function renderFavoritos() {
  const grid = $('#favoritosGrid');
  const progress = DB.getProgress();
  const favResources = DB.Resources.all().filter(r => progress.favoritos.includes(r.id));
  grid.innerHTML = '';
  if (!favResources.length) { grid.innerHTML = emptyState('⭐', 'Aún no tienes favoritos', 'Marca recursos con la estrella para encontrarlos aquí rápidamente.'); return; }
  favResources.forEach(r => grid.appendChild(resourceCard(r, progress)));
}

/* ------------------------------------ Contacto -------------------------------------- */

$('#contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  toast('Tu mensaje fue enviado a la docente', 'success');
  e.target.reset();
});

/* ------------------------------------ Búsqueda global -------------------------------------- */

$('#globalSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (q.length < 2) return;
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(() => runGlobalSearch(q), 250);
});
function runGlobalSearch(q) {
  const results = [];
  DB.Sessions.all().forEach(s => { if ((s.tema + s.contenido).toLowerCase().includes(q)) results.push({ tipo: 'Sesión', titulo: 'Sesión ' + s.numero + ': ' + s.tema, action: () => { navigate('programacion'); setTimeout(() => openSession(s.id, true), 200); } }); });
  DB.Resources.all().forEach(r => { if ((r.titulo + (r.descripcion || '')).toLowerCase().includes(q)) results.push({ tipo: r.categoria, titulo: r.titulo, action: () => navigate('recursos') }); });
  DB.Activities.all().forEach(a => { if (a.titulo.toLowerCase().includes(q)) results.push({ tipo: 'Actividad', titulo: a.titulo, action: () => navigate('actividades') }); });
  if (!results.length) return;
  $('#viewerTitle').textContent = 'Resultados de búsqueda: "' + q + '"';
  const body = $('#viewerBody');
  body.innerHTML = '';
  results.slice(0, 20).forEach(r => {
    const row = el('div', { style: 'padding:10px 0;border-bottom:1px solid var(--gray-100);cursor:pointer' }, [
      el('span', { class: 'chip green' }, [r.tipo]),
      el('div', { style: 'margin-top:4px;font-weight:600' }, [r.titulo])
    ]);
    row.addEventListener('click', () => { closeModal('viewerModal'); r.action(); });
    body.appendChild(row);
  });
  openModal('viewerModal');
}

/* --------------------------------------- FAB ---------------------------------------- */

$('#aiFab').addEventListener('click', () => {
  $('#viewerTitle').textContent = 'Asistente IA';
  $('#viewerBody').innerHTML = '<div class="empty-state"><div class="icon">🤖</div><h4>Próximamente</h4><p>Este espacio está reservado para conectar un asistente de inteligencia artificial que resolverá dudas del módulo.</p></div>';
  openModal('viewerModal');
});
$('#chatFab').addEventListener('click', () => navigate('contacto'));

/* ---------------------------------------- PWA ---------------------------------------- */

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#installBanner').classList.add('show');
});
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) { toast('Usa el menú del navegador → "Instalar aplicación"'); return; }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('#installBanner').classList.remove('show');
});
$('#dismissInstall').addEventListener('click', () => $('#installBanner').classList.remove('show'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            $('#updateBanner').classList.add('show');
          }
        });
      });
    }).catch(() => {});
  });
}
$('#updateNowBtn').addEventListener('click', () => location.reload());

/* --------------------------------------- Init ----------------------------------------- */

async function init() {
  DB.seed();
  $('#year').textContent = new Date().getFullYear();
  await Promise.race([DB.syncPublished(), new Promise(r => setTimeout(r, 3500))]);
  setUserUI();
  const startRoute = location.hash.replace('#/', '') || 'inicio';
  APP.route = ROUTES.includes(startRoute) ? startRoute : 'inicio';
  location.hash = '/' + APP.route;
  renderRoute();
  setTimeout(() => $('#splash').classList.add('hidden'), 400);
  if (APP.user.role === 'guest') setTimeout(() => openModal('loginModal'), 700);
}
document.addEventListener('DOMContentLoaded', init);

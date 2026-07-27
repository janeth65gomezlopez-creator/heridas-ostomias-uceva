/* =========================================================================
   teacher.js — Autenticación docente y panel de administración (CRUD)
   ========================================================================= */

const TEACHER = (() => {

  const PASS_KEY = 'uceva_teacher_pass';
  const DEFAULT_PASS = 'uceva2025';
  let activeTab = 'anuncios';

  function getPass() { return localStorage.getItem(PASS_KEY) || DEFAULT_PASS; }
  function setPass(p) { localStorage.setItem(PASS_KEY, p); }

  function tryLogin() {
    const val = $('#teacherPassInput').value;
    if (val === getPass()) {
      APP.user = { role: 'teacher', name: 'Docente' };
      setUserUI();
      closeModal('loginModal');
      $('#teacherPassInput').value = '';
      $('#teacherLoginForm').style.display = 'none';
      toast('Sesión docente iniciada', 'success');
      navigate('docente');
    } else {
      toast('Contraseña incorrecta', 'error');
    }
  }

  function logout() {
    APP.user = { role: 'guest', name: 'Invitado' };
    setUserUI();
    navigate('inicio');
    toast('Sesión docente cerrada');
  }

  /* -------------------------------- Panel principal -------------------------------- */

  function renderPanel() {
    if (APP.user.role !== 'teacher') { navigate('inicio'); return; }
    $all('#teacherTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === activeTab);
      b.onclick = () => { activeTab = b.dataset.tab; renderPanel(); };
    });
    const panels = {
      anuncios: panelAnuncios, sesiones: panelSesiones, recursos: panelRecursos,
      casos: panelCasos, actividades: panelActividades, evaluaciones: panelEvaluaciones,
      config: panelConfig
    };
    (panels[activeTab] || panelAnuncios)();
  }

  function container() {
    const c = $('#teacherPanelContent');
    c.innerHTML = '';
    return c;
  }

  function toolbar(title, onAdd) {
    return el('div', { class: 'admin-toolbar' }, [
      el('h3', {}, [title]),
      el('button', { class: 'btn btn-primary btn-sm', onclick: onAdd }, [iconPlus(), ' Agregar nuevo'])
    ]);
  }
  function iconPlus() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', '15'); s.setAttribute('height', '15'); s.innerHTML = '<use href="#i-plus"></use>';
    s.style.verticalAlign = '-2px';
    return s;
  }

  /* --------------------------------- Anuncios --------------------------------- */

  function panelAnuncios() {
    const c = container();
    c.appendChild(toolbar('Anuncios publicados', () => formAnuncio()));
    const items = DB.Announcements.all().slice().reverse();
    c.appendChild(adminTable(
      ['Título', 'Mensaje', 'Fecha', ''],
      items.map(a => [a.titulo, (a.mensaje || '').slice(0, 60) + '…', fmtDate(a.fecha), rowActions(() => formAnuncio(a), () => removeItem(DB.Announcements, a.id, panelAnuncios))]),
      'Aún no hay anuncios. Crea el primero para tus estudiantes.'
    ));
  }
  function formAnuncio(item) {
    openCrud(item ? 'Editar anuncio' : 'Nuevo anuncio', body => {
      body.appendChild(field('text', 'titulo', 'Título', item && item.titulo));
      body.appendChild(field('textarea', 'mensaje', 'Mensaje', item && item.mensaje));
    }, (data) => {
      if (item) DB.Announcements.update(item.id, data); else DB.Announcements.add(Object.assign({ fecha: new Date().toISOString() }, data));
      toast('Anuncio guardado', 'success'); panelAnuncios(); renderInicio();
    });
  }

  /* --------------------------------- Sesiones / cronograma --------------------------------- */

  function panelSesiones() {
    const c = container();
    c.appendChild(toolbar('Cronograma del módulo', () => formSesion()));
    const items = DB.Sessions.all().sort((a, b) => a.numero - b.numero);
    c.appendChild(adminTable(
      ['#', 'Tema', 'Fecha', 'Material', ''],
      items.map(s => [s.numero, s.tema, fmtDate(s.fecha), s.material ? '📎 sí' : '—', rowActions(() => formSesion(s), () => removeItem(DB.Sessions, s.id, panelSesiones))]),
      'No hay sesiones creadas.'
    ));
  }
  function formSesion(item) {
    openCrud(item ? 'Editar sesión' : 'Nueva sesión', body => {
      const row = el('div', { class: 'form-row' });
      row.appendChild(field('number', 'numero', 'N° de sesión', item && item.numero));
      row.appendChild(field('date', 'fecha', 'Fecha', item && item.fecha));
      body.appendChild(row);
      body.appendChild(field('text', 'tema', 'Tema', item && item.tema));
      body.appendChild(field('textarea', 'objetivos', 'Objetivos', item && item.objetivos));
      body.appendChild(field('textarea', 'contenido', 'Contenido', item && item.contenido));
      body.appendChild(field('textarea', 'actividad', 'Actividad', item && item.actividad));
      body.appendChild(field('textarea', 'evaluacion', 'Evaluación', item && item.evaluacion));
      body.appendChild(field('text', 'videoUrl', 'Enlace de la clase (YouTube / Drive / Vimeo / MP4)', item && item.videoUrl));
      body.appendChild(fileOrLinkField('material', 'Material de apoyo', item && item.material));
    }, (data) => {
      data.numero = Number(data.numero) || 1;
      if (item) DB.Sessions.update(item.id, data); else DB.Sessions.add(data);
      toast('Sesión guardada', 'success'); panelSesiones(); renderProgramacion();
    });
  }

  /* --------------------------------- Recursos --------------------------------- */

  function panelRecursos() {
    const c = container();
    c.appendChild(toolbar('Recursos del módulo', () => formRecurso()));
    const items = DB.Resources.all().slice().reverse();
    c.appendChild(adminTable(
      ['Título', 'Categoría', 'Tipo', ''],
      items.map(r => [r.titulo, r.categoria, r.tipo, rowActions(() => formRecurso(r), () => removeItem(DB.Resources, r.id, panelRecursos))]),
      'Aún no hay recursos. Agrega guías, videos, artículos, protocolos…'
    ));
  }
  function formRecurso(item) {
    openCrud(item ? 'Editar recurso' : 'Nuevo recurso', body => {
      body.appendChild(field('text', 'titulo', 'Título', item && item.titulo));
      body.appendChild(field('textarea', 'descripcion', 'Descripción / resumen', item && item.descripcion));
      const row = el('div', { class: 'form-row' });
      row.appendChild(selectField('categoria', 'Categoría', RESOURCE_CATEGORIES.filter(c => c !== 'Todos'), item && item.categoria));
      row.appendChild(selectField('tema', 'Tema (filtro biblioteca, opcional)', ['—'].concat(BIBLIO_FILTERS.filter(t => t !== 'Todos')), item && item.tema));
      body.appendChild(row);
      const row2 = el('div', { class: 'form-row' });
      row2.appendChild(field('text', 'autores', 'Autores (si es artículo/libro)', item && item.autores));
      row2.appendChild(field('url', 'doi', 'DOI o enlace de la referencia', item && item.doi));
      body.appendChild(row2);
      body.appendChild(fileOrLinkField('url', 'Archivo o enlace del recurso (PDF, video, artículo…)', item && item.url, (tipo) => { body.dataset.tipo = tipo; }));
    }, (data) => {
      data.tipo = document.querySelector('#crudModalBody').dataset.tipo || (item && item.tipo) || 'enlace';
      if (data.tema === '—') data.tema = '';
      if (item) DB.Resources.update(item.id, data); else DB.Resources.add(data);
      toast('Recurso guardado', 'success'); panelRecursos(); renderRecursos(); renderBiblioteca();
    });
  }

  /* --------------------------------- Casos clínicos --------------------------------- */

  function panelCasos() {
    const c = container();
    c.appendChild(toolbar('Casos clínicos', () => formCaso()));
    const items = DB.Cases.all().slice().reverse();
    c.appendChild(adminTable(
      ['Título', ''],
      items.map(x => [x.titulo, rowActions(() => formCaso(x), () => removeItem(DB.Cases, x.id, panelCasos))]),
      'No hay casos clínicos publicados.'
    ));
  }
  function formCaso(item) {
    openCrud(item ? 'Editar caso clínico' : 'Nuevo caso clínico', body => {
      body.appendChild(field('text', 'titulo', 'Título del caso', item && item.titulo));
      body.appendChild(field('textarea', 'historia', 'Historia clínica', item && item.historia));
      body.appendChild(field('textarea', 'valoracion', 'Valoración', item && item.valoracion));
      body.appendChild(field('textarea', 'soapie', 'SOAPIE', item && item.soapie));
      body.appendChild(field('textarea', 'nanda', 'NANDA / NOC / NIC', item && item.nanda));
      body.appendChild(field('textarea', 'preguntas', 'Preguntas de reflexión', item && item.preguntas));
    }, (data) => {
      if (item) DB.Cases.update(item.id, data); else DB.Cases.add(data);
      toast('Caso clínico guardado', 'success'); panelCasos(); renderCasos();
    });
  }

  /* --------------------------------- Actividades --------------------------------- */

  function panelActividades() {
    const c = container();
    c.appendChild(toolbar('Actividades', () => formActividad()));
    const items = DB.Activities.all().slice().reverse();
    c.appendChild(adminTable(
      ['Título', 'Sesión', 'Entrega', 'Estado', ''],
      items.map(a => [a.titulo, a.sesion || '—', fmtDate(a.fechaLimite), a.estado, rowActions(() => formActividad(a), () => removeItem(DB.Activities, a.id, panelActividades))]),
      'No hay actividades publicadas.'
    ));
  }
  function formActividad(item) {
    openCrud(item ? 'Editar actividad' : 'Nueva actividad', body => {
      body.appendChild(field('text', 'titulo', 'Título', item && item.titulo));
      body.appendChild(field('text', 'sesion', 'Sesión relacionada', item && item.sesion));
      body.appendChild(field('date', 'fechaLimite', 'Fecha límite', item && item.fechaLimite));
      body.appendChild(selectField('estado', 'Estado', ['Pendiente', 'Entregada', 'Calificada'], item && item.estado));
      body.appendChild(fileOrLinkField('guiaUrl', 'Guía de la actividad', item && item.guiaUrl));
    }, (data) => {
      if (item) DB.Activities.update(item.id, data); else DB.Activities.add(Object.assign({ estado: 'Pendiente' }, data));
      toast('Actividad guardada', 'success'); panelActividades(); renderActividades();
    });
  }

  /* --------------------------------- Evaluaciones --------------------------------- */

  function panelEvaluaciones() {
    const c = container();
    c.appendChild(toolbar('Evaluaciones', () => formEvaluacion()));
    const items = DB.Evaluations.all().slice().reverse();
    c.appendChild(adminTable(
      ['Título', 'Tipo', 'Fecha', 'Estado', ''],
      items.map(e => [e.titulo, e.tipo, fmtDate(e.fecha), e.estado, rowActions(() => formEvaluacion(e), () => removeItem(DB.Evaluations, e.id, panelEvaluaciones))]),
      'No hay evaluaciones programadas.'
    ));
  }
  function formEvaluacion(item) {
    openCrud(item ? 'Editar evaluación' : 'Nueva evaluación', body => {
      body.appendChild(field('text', 'titulo', 'Título', item && item.titulo));
      body.appendChild(selectField('tipo', 'Tipo', ['Mapa conceptual', 'Simulación', 'Análisis de caso', 'Exposición', 'Plan de cuidados'], item && item.tipo));
      body.appendChild(field('date', 'fecha', 'Fecha', item && item.fecha));
      body.appendChild(selectField('estado', 'Estado', ['Programada', 'Realizada', 'Calificada'], item && item.estado));
      body.appendChild(field('text', 'puntaje', 'Puntaje (si aplica)', item && item.puntaje));
    }, (data) => {
      if (item) DB.Evaluations.update(item.id, data); else DB.Evaluations.add(Object.assign({ estado: 'Programada' }, data));
      toast('Evaluación guardada', 'success'); panelEvaluaciones(); renderEvaluaciones();
    });
  }

  /* --------------------------------- Configuración --------------------------------- */

  function panelConfig() {
    const c = container();
    c.appendChild(el('h3', { style: 'margin-bottom:14px' }, ['Configuración del panel docente']));
    const card = el('div', { class: 'card', style: 'max-width:480px' });
    const form = el('div');
    form.appendChild(field('password', 'nueva', 'Nueva contraseña docente'));
    form.appendChild(field('password', 'confirma', 'Confirmar contraseña'));
    const btn = el('button', { class: 'btn btn-primary', onclick: () => {
      const nueva = form.querySelector('[name=nueva]').value;
      const confirma = form.querySelector('[name=confirma]').value;
      if (!nueva || nueva.length < 4) { toast('Usa al menos 4 caracteres', 'error'); return; }
      if (nueva !== confirma) { toast('Las contraseñas no coinciden', 'error'); return; }
      setPass(nueva); toast('Contraseña actualizada', 'success');
      form.querySelectorAll('input').forEach(i => i.value = '');
    } }, ['Actualizar contraseña']);
    form.appendChild(btn);
    card.appendChild(form);
    card.appendChild(el('hr', { class: 'sep' }));
    card.appendChild(el('p', { class: 'muted', style: 'font-size:.82rem' }, ['Los datos del módulo se guardan localmente en este navegador (formato JSON), listos para migrar a Firebase o Supabase en una futura versión.']));
    const dangerBtn = el('button', { class: 'btn btn-danger btn-sm', style: 'margin-top:14px', onclick: () => {
      if (confirm('¿Restablecer todo el contenido del módulo a los valores iniciales? Esta acción no se puede deshacer.')) {
        DB.resetAll(); DB.seed(); toast('Contenido restablecido', 'success'); renderPanel(); renderInicio();
      }
    } }, ['Restablecer contenido del módulo']);
    card.appendChild(dangerBtn);
    c.appendChild(card);
  }

  /* ------------------------------ Helpers de formulario ------------------------------ */

  function field(type, name, label, value) {
    const wrap = el('div', { class: 'form-group' });
    wrap.appendChild(el('label', {}, [label]));
    let input;
    if (type === 'textarea') { input = document.createElement('textarea'); }
    else { input = document.createElement('input'); input.type = type; }
    input.name = name;
    input.value = value != null ? value : '';
    wrap.appendChild(input);
    return wrap;
  }
  function selectField(name, label, options, value) {
    const wrap = el('div', { class: 'form-group' });
    wrap.appendChild(el('label', {}, [label]));
    const sel = document.createElement('select');
    sel.name = name;
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      if (value === o) opt.selected = true;
      sel.appendChild(opt);
    });
    wrap.appendChild(sel);
    return wrap;
  }
  function fileOrLinkField(name, label, value, onTypeChange) {
    const wrap = el('div', { class: 'form-group' });
    wrap.appendChild(el('label', {}, [label]));
    const linkInput = el('input', { type: 'url', name: name, placeholder: 'https:// (YouTube, Google Drive, Meet, artículo, PDF externo…)', value: value && !value.startsWith('data:') ? value : '' });
    wrap.appendChild(linkInput);
    wrap.appendChild(el('p', { class: 'form-hint' }, ['También puedes subir un archivo (PDF, imagen). Si adjuntas un archivo, se usará en lugar del enlace.']));
    const drop = el('div', { class: 'file-drop' }, ['📎 Haz clic o arrastra un archivo aquí (PDF, imagen)']);
    const fileInput = el('input', { type: 'file', style: 'display:none', accept: '.pdf,image/*' });
    const attachList = el('div', { class: 'attach-list' });
    let fileDataUrl = value && value.startsWith('data:') ? value : null;
    if (fileDataUrl) {
      attachList.appendChild(el('div', { class: 'attach-item' }, ['📎 Archivo cargado previamente', el('button', { class: 'btn btn-ghost btn-sm', onclick: (e) => { e.preventDefault(); fileDataUrl = null; attachList.innerHTML = ''; if (onTypeChange) onTypeChange('enlace'); } }, ['Quitar'])]));
      if (onTypeChange) onTypeChange('archivo');
    }
    drop.addEventListener('click', () => fileInput.click());
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

    function handleFile(file) {
      if (file.size > 4.5 * 1024 * 1024) { toast('El archivo es muy grande para el almacenamiento local (máx. ~4.5MB). Usa mejor un enlace de Drive.', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        fileDataUrl = reader.result;
        attachList.innerHTML = '';
        attachList.appendChild(el('div', { class: 'attach-item' }, ['📎 ' + file.name, el('button', { class: 'btn btn-ghost btn-sm', onclick: (e) => { e.preventDefault(); fileDataUrl = null; attachList.innerHTML = ''; if (onTypeChange) onTypeChange('enlace'); } }, ['Quitar'])]));
        if (onTypeChange) onTypeChange('archivo');
        toast('Archivo listo para guardar', 'success');
      };
      reader.readAsDataURL(file);
    }
    wrap.appendChild(drop);
    wrap.appendChild(fileInput);
    wrap.appendChild(attachList);
    wrap._getValue = () => fileDataUrl || linkInput.value;
    wrap._name = name;
    return wrap;
  }

  function adminTable(headers, rows, emptyMsg) {
    if (!rows.length) {
      return el('div', { class: 'card' }, [el('div', { html: emptyState('🗂️', 'Nada por aquí todavía', emptyMsg) })]);
    }
    const table = document.createElement('table');
    table.className = 'admin-table';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      r.forEach(cellContent => {
        const td = document.createElement('td');
        if (cellContent instanceof Node) td.appendChild(cellContent); else td.textContent = cellContent;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return el('div', { class: 'card', style: 'overflow-x:auto' }, [table]);
  }

  function rowActions(onEdit, onDelete) {
    const wrap = el('div', { class: 'table-actions' });
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✏️ Editar';
    editBtn.onclick = onEdit;
    const delBtn = document.createElement('button');
    delBtn.className = 'del';
    delBtn.innerHTML = '🗑️ Eliminar';
    delBtn.onclick = () => { if (confirm('¿Eliminar este elemento?')) onDelete(); };
    wrap.appendChild(editBtn); wrap.appendChild(delBtn);
    return wrap;
  }

  function removeItem(coll, id, refresh) {
    coll.remove(id); toast('Elemento eliminado'); refresh();
    renderInicio();
  }

  function openCrud(title, buildBody, onSave) {
    $('#crudModalTitle').textContent = title;
    const body = $('#crudModalBody');
    body.innerHTML = '';
    buildBody(body);
    openModal('crudModal');
    $('#crudModalSave').onclick = () => {
      const data = {};
      $all('input, textarea, select', body).forEach(input => {
        if (!input.name) return;
        const wrap = input.closest('.form-group');
        data[input.name] = (wrap && wrap._getValue) ? wrap._getValue() : input.value;
      });
      onSave(data);
      closeModal('crudModal');
    };
  }

  $('#teacherLogoutBtn').addEventListener('click', logout);

  return { tryLogin, logout, renderPanel };
})();

/* =========================================================================
   data.js
   Capa de datos de la plataforma "Heridas y Ostomías - UCEVA"
   -------------------------------------------------------------------------
   Toda la información editable (sesiones, recursos, anuncios, casos,
   actividades) vive en localStorage como colecciones JSON, tal como pide
   el brief ("almacenarse inicialmente en archivos JSON para facilitar una
   futura migración a Firebase o Supabase"). En un navegador estático no es
   posible escribir archivos .json en disco, así que localStorage actúa como
   esa base de datos JSON local; la forma (arrays de objetos planos) es
   idéntica a la que tendría un archivo db.json, por lo que migrar a
   Firebase/Supabase más adelante solo implica cambiar las funciones de
   lectura/escritura de este archivo por llamadas a la API real.
   ========================================================================= */

const DB = (() => {

  const KEYS = {
    sessions: 'uceva_sessions',
    resources: 'uceva_resources',
    announcements: 'uceva_announcements',
    cases: 'uceva_cases',
    activities: 'uceva_activities',
    evaluations: 'uceva_evaluations',
    events: 'uceva_events',
    progress: 'uceva_progress',
    profile: 'uceva_profile',
    seeded: 'uceva_seeded_v1'
  };

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('DB read error', key, e);
      return [];
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB write error', key, e);
      alert('No se pudo guardar. Es posible que el archivo adjunto sea muy pesado para el almacenamiento local del navegador.');
      return false;
    }
  }

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------------------- Colecciones ---------------------------- */

  const collection = (key) => ({
    all: () => read(key),
    get: (id) => read(key).find(i => i.id === id) || null,
    add: (item) => {
      const items = read(key);
      const record = Object.assign({ id: uid(), creado: new Date().toISOString() }, item);
      items.push(record);
      write(key, items);
      return record;
    },
    update: (id, patch) => {
      const items = read(key);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return null;
      items[idx] = Object.assign({}, items[idx], patch, { actualizado: new Date().toISOString() });
      write(key, items);
      return items[idx];
    },
    remove: (id) => {
      const items = read(key).filter(i => i.id !== id);
      write(key, items);
    },
    replaceAll: (items) => write(key, items)
  });

  const Sessions = collection(KEYS.sessions);
  const Resources = collection(KEYS.resources);
  const Announcements = collection(KEYS.announcements);
  const Cases = collection(KEYS.cases);
  const Activities = collection(KEYS.activities);
  const Evaluations = collection(KEYS.evaluations);
  const Events = collection(KEYS.events);

  /* ------------------------------ Perfil -------------------------------- */

  function getProfile() {
    const raw = localStorage.getItem(KEYS.profile);
    return raw ? JSON.parse(raw) : {
      nombre: 'Estudiante UCEVA',
      correo: '',
      semestre: '—',
      fotografia: '',
      horasEstudiadas: 0,
      insignias: []
    };
  }
  function saveProfile(p) {
    localStorage.setItem(KEYS.profile, JSON.stringify(p));
  }

  /* ----------------------------- Progreso -------------------------------- */

  function getProgress() {
    const raw = localStorage.getItem(KEYS.progress);
    return raw ? JSON.parse(raw) : { sesionesVistas: [], recursosVistos: [], actividadesEntregadas: [], favoritos: [] };
  }
  function saveProgress(p) {
    localStorage.setItem(KEYS.progress, JSON.stringify(p));
  }
  function markSeen(type, id) {
    const p = getProgress();
    const bucket = { sesion: 'sesionesVistas', recurso: 'recursosVistos', actividad: 'actividadesEntregadas' }[type];
    if (bucket && !p[bucket].includes(id)) {
      p[bucket].push(id);
      saveProgress(p);
    }
    return p;
  }
  function toggleFavorite(id) {
    const p = getProgress();
    const i = p.favoritos.indexOf(id);
    if (i === -1) p.favoritos.push(id); else p.favoritos.splice(i, 1);
    saveProgress(p);
    return p.favoritos.includes(id);
  }

  /* ------------------------------ Semillas ------------------------------- */
  // Contenido inicial, redactado como resumen académico propio para el
  // módulo, editable en cualquier momento desde el Panel Docente.

  function seed() {
    if (localStorage.getItem(KEYS.seeded)) return;

    const sesiones = [
      {
        numero: 1,
        tema: 'Presentación de la asignatura y bases de la cicatrización',
        fecha: '2025-08-04',
        objetivos: 'Reconocer la estructura de la asignatura y describir la anatomía de la piel, las fases del proceso de cicatrización y la clasificación general de las heridas según etiología y profundidad.',
        contenido: 'Acuerdo didáctico del módulo. Anatomía y fisiología de la piel (epidermis, dermis, hipodermis) y su función de barrera. Fases de la cicatrización: hemostasia, inflamación, proliferación y remodelación. Clasificación de heridas por etiología (agudas y crónicas) y por profundidad. Fisiopatología general de las heridas complejas.',
        actividad: 'Mapa conceptual de las fases de cicatrización.',
        evaluacion: 'Quiz corto sobre anatomía de la piel.',
        material: 'Diapositivas de clase (por cargar desde el Panel Docente).'
      },
      {
        numero: 2,
        tema: 'Valoración integral del paciente con heridas y ostomías',
        fecha: '2025-08-11',
        objetivos: 'Aplicar instrumentos de valoración integral (persona, herida y entorno) en pacientes con heridas y en pacientes ostomizados.',
        contenido: 'Valoración holística: antecedentes de la persona y la herida, comorbilidades, estado nutricional, factores que influyen en la respuesta inflamatoria e inmunitaria y factores psicosociales. Escalas e instrumentos de valoración de heridas y de riesgo. Particularidades de la valoración del paciente ostomizado.',
        actividad: 'Aplicación de un instrumento de valoración a un caso simulado.',
        evaluacion: 'Rúbrica de valoración clínica.',
        material: 'Guía de valoración integral (por cargar).'
      },
      {
        numero: 3,
        tema: 'Infección de heridas y biopelículas',
        fecha: '2025-08-18',
        objetivos: 'Identificar el espectro de la infección de heridas (contaminación, colonización, infección local, propagación e infección sistémica) y reconocer los indicadores clínicos de biopelícula.',
        contenido: 'Espectro de infección de heridas del IWII (IWII-WIC). Signos ocultos y manifiestos de infección local. Concepto de biopelícula, criterios que sugieren su presencia y su relación con la cicatrización tardía. Complicaciones de la infección no tratada (propagación e infección sistémica).',
        actividad: 'Análisis de caso clínico: clasificación de la etapa de infección según signos y síntomas.',
        evaluacion: 'Estudio de caso con retroalimentación docente.',
        material: 'Documento de consenso IWII 2022 – La infección de heridas en la práctica clínica.'
      },
      {
        numero: 4,
        tema: 'Manejo avanzado: limpieza y desbridamiento',
        fecha: '2025-08-25',
        objetivos: 'Seleccionar la técnica de limpieza y el método de desbridamiento apropiados según el tipo de herida y el objetivo terapéutico.',
        contenido: 'Preparación del lecho de la herida (principios TIME). Limpieza terapéutica: soluciones, presión de irrigación y técnica aséptica. Métodos de desbridamiento: autolítico, cortante, cortante conservador, mecánico, enzimático y biológico. Cuidado de heridas basado en la biopelícula.',
        actividad: 'Taller práctico simulado de desbridamiento (según recursos disponibles).',
        evaluacion: 'Lista de chequeo de procedimiento.',
        material: 'Guía de preparación del lecho de la herida (por cargar).'
      },
      {
        numero: 5,
        tema: 'Apósitos avanzados y terapias tecnológicas',
        fecha: '2025-09-01',
        objetivos: 'Relacionar las categorías de apósitos y tratamientos antimicrobianos tópicos con las características del lecho de la herida.',
        contenido: 'Categorías de apósitos según nivel de exudado y objetivo (hidrocoloides, alginatos, espumas, hidrogeles). Antisépticos tópicos de uso frecuente (plata, yodo, PHMB, miel, soluciones superoxidadas). Principios de uso prudente de antimicrobianos. Introducción a terapia de presión negativa.',
        actividad: 'Cuadro comparativo de apósitos y su indicación clínica.',
        evaluacion: 'Foro de discusión sobre selección de apósito por caso.',
        material: 'Tabla de antisépticos tópicos (por cargar).'
      },
      {
        numero: 6,
        tema: 'Prevención de lesiones asociadas al cuidado',
        fecha: '2025-09-08',
        objetivos: 'Diseñar estrategias de prevención de lesiones por presión y otras lesiones asociadas al cuidado de la salud.',
        contenido: 'Factores de riesgo de lesiones por presión. Escalas de valoración de riesgo. Superficies de redistribución de presión. Cuidados de la piel perilesional y prevención de dermatitis asociada a la humedad. Rol del equipo interdisciplinario en la prevención.',
        actividad: 'Plan de cuidados de prevención para un paciente de alto riesgo.',
        evaluacion: 'Plan de cuidados evaluado con rúbrica.',
        material: 'Escala de valoración de riesgo (por cargar).'
      },
      {
        numero: 7,
        tema: 'Generalidades de ostomías: clasificación y cuidados',
        fecha: '2025-09-15',
        objetivos: 'Clasificar los tipos de ostomías digestivas y urinarias y describir los cuidados generales de enfermería asociados.',
        contenido: 'Definición y clasificación de ostomías (colostomía, ileostomía, urostomía) según finalidad y ubicación. Selección de dispositivos colectores. Cuidado del estoma y la piel periestomal. Complicaciones tempranas y tardías más frecuentes.',
        actividad: 'Identificación de tipos de ostomía en imágenes clínicas.',
        evaluacion: 'Quiz de clasificación de ostomías.',
        material: 'Guía de dispositivos para ostomías (por cargar).'
      },
      {
        numero: 8,
        tema: 'Educación, autocuidado y prevención de complicaciones',
        fecha: '2025-09-22',
        objetivos: 'Elaborar un plan educativo dirigido a la persona con herida u ostomía y su cuidador, orientado al autocuidado y la prevención de complicaciones.',
        contenido: 'Principios de educación terapéutica al paciente y la familia. Estrategias de autocuidado con apoyo. Señales de alarma que ameritan consulta. Recursos comunitarios y seguimiento ambulatorio. Cierre e integración del módulo.',
        actividad: 'Elaboración de material educativo para paciente/cuidador.',
        evaluacion: 'Exposición del material educativo.',
        material: 'Plantilla de plan educativo (por cargar).'
      }
    ];
    Sessions.replaceAll(sesiones.map((s, i) => Object.assign({ id: 'ses_' + (i + 1), creado: new Date().toISOString() }, s)));

    const recursos = [
      {
        id: 'res_1', categoria: 'Artículos científicos', tema: 'Infección',
        titulo: 'IWII Wound Infection in Clinical Practice consensus document: 2022 update',
        autores: 'Swanson T, Ousey K, Haesler E, Bjarnsholt T, Carville K, Idensohn P, Kalan L, Keast DH, Larsen D, Percival S, Schultz G, Sussman G, Waters N, Weir D — International Wound Infection Institute (IWII)',
        descripcion: 'Documento de consenso internacional del IWII (Journal of Wound Care, 2022) sobre identificación, evaluación, diagnóstico y tratamiento de la infección de heridas, incluyendo biopelículas, limpieza, desbridamiento, uso de antimicrobianos tópicos y uso prudente de antimicrobianos. Publicación de acceso abierto avalada por Wounds International.',
        doi: 'https://doi.org/10.12968/jowc.2022.31.Sup12.S10',
        url: 'https://woundsinternational.com/wp-content/uploads/2023/05/IWII-CD-2022-web.pdf',
        tipo: 'enlace', creado: new Date().toISOString()
      },
      {
        id: 'res_2', categoria: 'Artículos científicos', tema: 'Insuficiencia venosa',
        titulo: 'Leg ulceration in venous and arteriovenous insufficiency: assessment and management with compression therapy as part of a holistic wound-healing strategy',
        autores: 'Nair HK, Mosti G, Atkin L, Aburn R, Ali Hussin N, Govindarajanthran N, Narayanan S, Ritchie G, Samuriwo R, Sandy-Hodgetts K, Smart H, Sussman G, Ehmann S, Lantis J, Moffatt C, Naude L, Probst S, White W — World Union of Wound Healing Societies (WUWHS)',
        descripcion: 'Documento de consenso internacional (Journal of Wound Care, supl. vol. 33, 2024) sobre la evaluación de las etiologías venosa, arterial y arteriovenosa de la úlcera de pierna, y el manejo seguro y eficaz con terapia de compresión dentro de una estrategia holística de cicatrización.',
        doi: 'https://doi.org/10.12968/jowc.2024.33.Sup10b.S1',
        url: 'https://www.journalofwoundcare.com/docs/Leg%20ulceration%20in%20venous%20and%20arteriovenous%20insuffeciency.pdf',
        tipo: 'enlace', creado: new Date().toISOString()
      },
      { id: 'res_3', categoria: 'Videos', titulo: 'Video de bienvenida al módulo', descripcion: 'Mensaje introductorio de la docente para el módulo de Heridas y Ostomías.', tipo: 'enlace', url: '', creado: new Date().toISOString() }
    ];
    Resources.replaceAll(recursos);

    const anuncios = [
      { id: 'anu_1', titulo: '¡Bienvenidos al módulo!', mensaje: 'Este es el campus virtual del módulo Heridas y Ostomías. Revisa la programación y comienza por la Sesión 1.', fecha: new Date().toISOString() }
    ];
    Announcements.replaceAll(anuncios);

    Cases.replaceAll([]);
    Activities.replaceAll([
      { id: 'act_1', titulo: 'Mapa conceptual: fases de cicatrización', sesion: 'Sesión 1', fechaLimite: '2025-08-08', estado: 'Pendiente' },
      { id: 'act_2', titulo: 'Estudio de caso: espectro de infección', sesion: 'Sesión 3', fechaLimite: '2025-08-22', estado: 'Pendiente' }
    ]);
    Evaluations.replaceAll([
      { id: 'eva_1', titulo: 'Plan de cuidados de prevención', tipo: 'Plan de cuidados', fecha: '2025-09-08', puntaje: '—', estado: 'Programada' }
    ]);
    Events.replaceAll(sesiones.map((s, i) => ({
      id: 'evt_' + (i + 1), tipo: 'Clase', titulo: 'Sesión ' + s.numero + ': ' + s.tema, fecha: s.fecha
    })));

    localStorage.setItem(KEYS.seeded, '1');
  }

  return {
    KEYS, uid,
    Sessions, Resources, Announcements, Cases, Activities, Evaluations, Events,
    getProfile, saveProfile,
    getProgress, saveProgress, markSeen, toggleFavorite,
    seed,
    resetAll: () => { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); }
  };
})();

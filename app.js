/* Gestor de Refuerzo · CEIP Capitulaciones
   Usa el mismo proyecto de Firebase que el Gestor PT y AL, en una rama propia: refuerzo/ */
'use strict';

// ─── Configuración ─────────────────────────────────────────────────
// idea: usuario IdEA de cada maestra. Si se deja vacío, vale cualquier
// cuenta dada de alta en Firebase (las reglas son las que mandan).
const PERFILES = {
  maria:    { nombre: 'María Rodríguez', emoji: '👩‍🏫', idea: 'mrodrod323' },
  miriam:   { nombre: 'Miriam',          emoji: '👩‍🏫', idea: 'mromrod681' },
  cristina: { nombre: 'Cristina',        emoji: '👩‍🏫', idea: 'cmolmar422' }
};
const DOMINIO = '@capitulaciones.local';
const CURSOS = ['1º', '2º', '3º', '4º', '5º', '6º'];
const AREAS = {
  LCL: { nombre: 'Lengua Castellana y Literatura', corto: 'Lengua', icon: '📖' },
  MAT: { nombre: 'Matemáticas', corto: 'Matemáticas', icon: '🔢' }
};
const TIPOS = {
  'PRA-NP':  { corto: 'NP',  txt: 'Alumnado que no promociona de curso' },
  'PRA-NSA': { corto: 'NSA', txt: 'Promociona pero no supera alguna área del curso anterior' },
  'PRA-DA':  { corto: 'DA',  txt: 'Presenta dificultades en el aprendizaje que justifican su inclusión' }
};
const EVAL_ITEMS = [
  { k: 'lcl_cuaderno', a: 'LCL', t: 'Cuaderno' },
  { k: 'lcl_escrita',  a: 'LCL', t: 'Expresión escrita' },
  { k: 'lcl_oral',     a: 'LCL', t: 'Expresión oral' },
  { k: 'lcl_prueba',   a: 'LCL', t: 'Prueba escrita' },
  { k: 'lcl_velocidad',a: 'LCL', t: 'Velocidad lectora' },
  { k: 'mat_cuaderno', a: 'MAT', t: 'Cuaderno' },
  { k: 'mat_sumas',    a: 'MAT', t: 'Cálculo sumas llevando' },
  { k: 'mat_restas',   a: 'MAT', t: 'Cálculo restas llevando' },
  { k: 'mat_prueba',   a: 'MAT', t: 'Prueba escrita' },
  { k: 'mat_problemas',a: 'MAT', t: 'Resolución de problemas' }
];
const NIVELES = { C: 'Conseguido', EP: 'En proceso', NI: 'No iniciado' };
const OTROS = [
  ['acceso', 'Formas de acceso a la información'],
  ['actividades', 'Tipos de actividades y tareas'],
  ['recursos', 'Recursos didácticos'],
  ['agrupamientos', 'Agrupamientos, distribución de espacios y tiempos'],
  ['instrumentos', 'Instrumentos de evaluación']
];
const SUGERENCIAS = {
  acceso: ['Utilizar recursos manipulativos y visuales.', 'Apoyos audiovisuales como modelo de lectoescritura.', 'Instrucciones cortas y de una en una.', 'Ubicación cerca del maestro/a.'],
  actividades: ['Lectura en voz alta de textos cortos.', 'Comprensión lectora con preguntas literales.', 'Dictados cortos.', 'Copia y caligrafía.', 'Cálculo mental.', 'Sumas y restas llevando.', 'Problemas de una operación.', 'Series numéricas: anterior y posterior.'],
  recursos: ['Libro de texto.', 'Fichas de refuerzo.', 'Material manipulativo (regletas, bloques).', 'Fichas de lectoescritura.', 'Juegos y aplicaciones digitales.'],
  agrupamientos: ['Pequeño grupo (4 alumnos/as).', 'Dentro del aula ordinaria.', 'Fuera del aula, en el aula de refuerzo.', 'Sesiones de 45 minutos.'],
  instrumentos: ['Observación sistemática diaria.', 'Pruebas escritas.', 'Pruebas orales.', 'Revisión del cuaderno.', 'Registro de velocidad lectora.']
};

// ─── Utilidades ────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hoyIso = () => iso(new Date());
const masDias = (ds, n) => { const d = new Date(ds + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fechaLarga = ds => { const d = new Date(ds + 'T12:00'); return DIA[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()]; };
const fechaCorta = ds => { if (!ds) return ''; const [y, m, d] = ds.split('-'); return d + '/' + m + '/' + y; };
const lunesDe = ds => { const d = new Date(ds + 'T12:00'); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
const clave = s => String(s || '').replace(/[.#$/\[\]]/g, '_').slice(0, 120);
const cursoKey = c => String(c || '').replace(/\D/g, '') || 'x';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const lista = v => Array.isArray(v) ? v.filter(x => x != null) : (v && typeof v === 'object' ? Object.values(v) : []);
const sinCole = ds => {
  const d = new Date(ds + 'T12:00').getDay();
  if (d === 0 || d === 6) return { nombre: 'Fin de semana', emoji: '😎' };
  try { return (window.CalendarioCole && CalendarioCole.sinCole) ? CalendarioCole.sinCole(ds) : null; } catch (e) { return null; }
};
const proxLectivo = (ds, dir) => { let x = ds; for (let i = 0; i < 400; i++) { x = masDias(x, dir); if (!sinCole(x)) return x; } return ds; };
function trimestreDe(ds) { const m = +String(ds || hoyIso()).slice(5, 7); return (m >= 9) ? 1 : (m <= 3 ? 2 : 3); }
function cursoAcademicoDe(ds) { const y = +ds.slice(0, 4), m = +ds.slice(5, 7); const i = m >= 9 ? y : y - 1; return i + '-' + String(i + 1).slice(2); }
const nombreCursoAc = c => c.replace('-', '/');
function convFecha(s) { // 08/10/2025 o 08/10/25 → 2025-10-08
  const m = /(\d{2})\/(\d{2})\/(\d{2,4})/.exec(s || ''); if (!m) return '';
  return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[2] + '-' + m[1];
}

function toast(msg, tipo) {
  const t = $('toast'); t.textContent = msg; t.className = (tipo || '') + ' show';
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = tipo || '', 2600);
}
function abrirModal(html) { $('modalBox').innerHTML = html; $('modal').classList.add('show'); $('modal').scrollTop = 0; }
function cerrarModal() { $('modal').classList.remove('show'); $('modalBox').innerHTML = ''; }
$('modal').addEventListener('click', e => { if (e.target === $('modal')) cerrarModal(); });
function confirmar(msg, titulo, ok) {
  return new Promise(res => {
    abrirModal('<h2>' + esc(titulo || '¿Seguro?') + '</h2><p class="muted" style="white-space:pre-line">' + esc(msg) + '</p>'
      + '<div class="modal-pie"><button class="btn btn-s" id="cfNo">Cancelar</button><button class="btn btn-p" id="cfSi">' + esc(ok || 'Aceptar') + '</button></div>');
    $('cfNo').onclick = () => { cerrarModal(); res(false); };
    $('cfSi').onclick = () => { cerrarModal(); res(true); };
  });
}

// ─── Firebase ──────────────────────────────────────────────────────
// App de Firebase con nombre propio: así su sesión NO pisa la del Gestor PT,
// que vive en el mismo dominio (vunisal706-droid.github.io) y el mismo proyecto.
const fbApp = firebase.initializeApp({
  apiKey: 'AIzaSyC7NgtJ1lUecZr5LR3jK1wURfzNIakJ1-8',
  authDomain: 'gestorpt-7946b.firebaseapp.com',
  databaseURL: 'https://gestorpt-7946b-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'gestorpt-7946b',
  storageBucket: 'gestorpt-7946b.firebasestorage.app',
  messagingSenderId: '415895342026',
  appId: '1:415895342026:web:c516c24d7dc27cc89d1d33'
}, 'refuerzo');
const db = fbApp.database();
const auth = () => fbApp.auth();

let PERFIL = null, CURSO_AC = cursoAcademicoDe(hoyIso()), BASE = '';
let D = { alumnos: {}, quincenas: {}, evalObs: {}, config: {} };
let BANCO = {};
let refBase = null, refBanco = null;
let seccion = 'alumnos', fichaId = null, fichaTab = 'programa';

// Los cambios hechos aquí ya están pintados: el eco de Firebase no vuelve a pintar
// la pantalla (así no se pierden toques rápidos ni el foco).
let ultimoLocal = 0;
const guardar = (ruta, val) => { ultimoLocal = Date.now(); return db.ref(ruta).set(val).catch(errGuardar); };
const actualizar = obj => { ultimoLocal = Date.now(); return db.ref().update(obj).catch(errGuardar); };
function errGuardar(e) { toast('No se pudo guardar: ' + (e && e.message ? e.message : 'sin conexión'), 'err'); }

function cacheKey() { return 'refuerzo-cache-' + PERFIL + '-' + CURSO_AC; }
function cachear() { try { localStorage.setItem(cacheKey(), JSON.stringify(D)); localStorage.setItem('refuerzo-banco', JSON.stringify(BANCO)); } catch (e) { } }
function leerCache() {
  try { const c = JSON.parse(localStorage.getItem(cacheKey())); if (c) D = Object.assign({ alumnos: {}, quincenas: {}, evalObs: {}, config: {} }, c); } catch (e) { }
  try { const b = JSON.parse(localStorage.getItem('refuerzo-banco')); if (b) BANCO = b; } catch (e) { }
}

function conectarDatos() {
  if (refBase) refBase.off();
  BASE = 'refuerzo/' + PERFIL + '/cursos/' + CURSO_AC;
  D = { alumnos: {}, quincenas: {}, evalObs: {}, config: {} };
  leerCache(); renderTodo();
  refBase = db.ref(BASE);
  refBase.on('value', s => {
    const v = s.val() || {};
    D = { alumnos: v.alumnos || {}, quincenas: v.quincenas || {}, evalObs: v.evalObs || {}, config: v.config || {} };
    cachear();
    clearTimeout(conectarDatos._t);
    if (Date.now() - ultimoLocal > 800) renderSuave();
    else conectarDatos._t = setTimeout(renderSuave, 1500);
  }, e => { console.warn(e); toast('Sin permiso para leer los datos. Revisa las reglas de Firebase.', 'err'); });
  if (!refBanco) {
    refBanco = db.ref('refuerzo/banco');
    refBanco.on('value', s => { BANCO = s.val() || {}; cachear(); if (seccion === 'banco') renderSuave(); }, () => { });
  }
}

db.ref('.info/connected').on('value', s => {
  const ok = !!s.val();
  $('dot').className = 'dot ' + (ok ? 'ok' : 'off');
  $('statusTxt').textContent = ok ? 'Conectado' : 'Sin conexión';
  $('offlineBar').style.display = ok ? 'none' : (PERFIL ? 'block' : 'none');
});

// ─── Acceso ────────────────────────────────────────────────────────
let perfilSel = null;
$('listaPerfiles').innerHTML = Object.entries(PERFILES).map(([k, p]) =>
  '<button class="perfil-btn" data-p="' + k + '"><span class="e">' + p.emoji + '</span><span><b>' + esc(p.nombre) + '</b><small>Refuerzo educativo</small></span></button>').join('');
$('listaPerfiles').addEventListener('click', e => {
  const b = e.target.closest('.perfil-btn'); if (!b) return;
  perfilSel = b.dataset.p;
  document.querySelectorAll('.perfil-btn').forEach(x => x.classList.toggle('on', x === b));
  $('accIdea').focus();
});
$('accIdea').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
$('accEntrar').onclick = entrar;
function accError(m) { const d = $('accError'); d.innerHTML = m; d.style.display = 'block'; const b = $('accEntrar'); b.disabled = false; b.textContent = 'Entrar'; }
async function entrar() {
  $('accError').style.display = 'none';
  const idea = ($('accIdea').value || '').trim().toLowerCase();
  if (!perfilSel) return accError('Selecciona primero tu perfil.');
  if (!idea) return accError('Escribe tu usuario IdEA.');
  const esperado = PERFILES[perfilSel].idea;
  if (esperado && esperado !== idea) return accError('Ese usuario IdEA no corresponde al perfil seleccionado.');
  const b = $('accEntrar'); b.disabled = true; b.textContent = 'Comprobando…';
  try {
    await auth().setPersistence($('accRecordar').checked ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
  } catch (e) { }
  try {
    await auth().signInWithEmailAndPassword(idea + DOMINIO, idea);
    abrirApp(perfilSel);
  } catch (e) {
    if (e.code === 'auth/network-request-failed') return accError('Sin conexión. Inténtalo de nuevo.');
    if (e.code === 'auth/too-many-requests') return accError('Demasiados intentos. Espera unos minutos.');
    return accError('El usuario IdEA no es correcto o la cuenta no está dada de alta.');
  }
}
function abrirApp(p) {
  PERFIL = p;
  try { localStorage.setItem('refuerzo-perfil', p); } catch (e) { }
  $('pantallaAcceso').style.display = 'none';
  $('perfilPill').textContent = PERFILES[p].emoji + ' ' + PERFILES[p].nombre.split(' ')[0];
  pintarSelectorCurso();
  conectarDatos();
  novedades();
}
$('perfilPill').onclick = async () => {
  if (!await confirmar('Se cerrará la sesión y habrá que volver a entrar con el usuario IdEA.', '¿Cambiar de perfil?', 'Cambiar')) return;
  try { await auth().signOut(); } catch (e) { }
  try { localStorage.removeItem('refuerzo-perfil'); } catch (e) { }
  location.reload();
};
(function () {
  let hecho = false;
  auth().onAuthStateChanged(u => {
    if (hecho) return; hecho = true;
    let g = null; try { g = localStorage.getItem('refuerzo-perfil'); } catch (e) { }
    if (u && g && PERFILES[g]) abrirApp(g);
  });
})();

function pintarSelectorCurso() {
  const act = cursoAcademicoDe(hoyIso()), i = +act.slice(0, 4);
  const ops = [i - 1, i, i + 1].map(y => y + '-' + String(y + 1).slice(2));
  $('selCurso').innerHTML = ops.map(c => '<option value="' + c + '"' + (c === CURSO_AC ? ' selected' : '') + '>' + nombreCursoAc(c) + '</option>').join('');
  $('selCurso').onchange = () => { CURSO_AC = $('selCurso').value; conectarDatos(); };
}

// ─── Navegación ────────────────────────────────────────────────────
$('nav').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  irA(b.dataset.s);
});
$('tituloApp').onclick = () => irA('alumnos');
function irA(s) {
  seccion = s;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
  document.querySelectorAll('main > section').forEach(x => x.classList.add('oculto'));
  $('sec-' + s).classList.remove('oculto');
  if (s === 'hoy') hoyFecha = null;
  renderTodo();
  window.scrollTo(0, 0);
}
let renderPendiente = false;
function editando() {
  const a = document.activeElement;
  return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('main') && a.type !== 'checkbox' && a.type !== 'file';
}
function renderSuave() { if (editando()) { renderPendiente = true; return; } renderTodo(); }
document.addEventListener('focusout', () => setTimeout(() => { if (renderPendiente && !editando()) { renderPendiente = false; renderTodo(); } }, 60));
function renderTodo() {
  if (!PERFIL) return;
  ({ alumnos: renderAlumnos, hoy: renderHoy, quincenal: renderQuincenal, evaluacion: renderEvaluacion, banco: renderBanco, informes: renderInformes, ficha: renderFicha }[seccion] || renderAlumnos)();
}

// ─── Datos derivados ───────────────────────────────────────────────
const alumnosOrden = () => Object.entries(D.alumnos).map(([id, a]) => ({ id, ...a }))
  .sort((x, y) => String(x.curso).localeCompare(String(y.curso)) || String(x.siglas).localeCompare(String(y.siglas)));
const alumnosDeCurso = c => alumnosOrden().filter(a => a.curso === c);
const cursosConAlumnos = () => CURSOS.filter(c => alumnosOrden().some(a => a.curso === c));
const areasDe = a => Object.keys(AREAS).filter(k => a.areas && a.areas[k]);
function saberesDePrograma(a, area) {
  const p = a.programa && a.programa[area]; if (!p) return [];
  const out = [], vistos = new Set();
  lista(p.criterios).forEach(c => lista(c.saberes).forEach(s => { const k = (s.c || '') + '|' + s.t; if (!vistos.has(k)) { vistos.add(k); out.push(s); } }));
  lista(p.sueltos).forEach(s => { const k = (s.c || '') + '|' + s.t; if (!vistos.has(k)) { vistos.add(k); out.push(s); } });
  return out;
}
const textoSaber = s => (s.c ? s.c + '. ' : '') + s.t;

// ─── ALUMNADO ──────────────────────────────────────────────────────
function tarjetaAlumno(a) {
  const t = TIPOS[a.tipo] || {};
  return '<button class="al-card" data-al="' + a.id + '"><div class="row" style="justify-content:space-between"><span class="al-sig">' + esc(a.siglas || '¿?') + '</span>'
    + '<span class="tipo ' + (t.corto || '') + '">' + esc(a.tipo || '') + '</span></div>'
    + '<div class="muted">' + esc(a.curso || '') + (a.unidad ? ' · ' + esc(a.unidad) : '') + '</div>'
    + '<div class="row">' + areasDe(a).map(k => '<span class="chip ' + k + '">' + AREAS[k].icon + ' ' + AREAS[k].corto + '</span>').join('') + '</div></button>';
}
function renderAlumnos() {
  const al = alumnosOrden();
  let h = '<div class="card"><div class="card-h"><div><div class="kicker">Curso ' + nombreCursoAc(CURSO_AC) + '</div><h2>Mi alumnado de refuerzo</h2></div>'
    + '<button class="btn btn-p" id="btnNuevo">➕ Nuevo alumno/a</button></div>';
  if (!al.length) {
    h += '<div class="vacio">Aún no hay alumnado.<br>Pulsa <b>➕ Nuevo alumno/a</b> y sube su programa de Séneca o créalo desde el banco.</div>';
  } else {
    CURSOS.forEach(c => {
      const g = al.filter(a => a.curso === c); if (!g.length) return;
      h += '<div class="curso-h">' + c + ' de Primaria · ' + g.length + '</div><div class="al-grid">' + g.map(tarjetaAlumno).join('') + '</div>';
    });
    const otros = al.filter(a => !CURSOS.includes(a.curso));
    if (otros.length) h += '<div class="curso-h">Sin curso</div><div class="al-grid">' + otros.map(tarjetaAlumno).join('') + '</div>';
  }
  h += '</div>';
  $('sec-alumnos').innerHTML = h;
  $('btnNuevo').onclick = nuevoAlumno;
  $('sec-alumnos').querySelectorAll('[data-al]').forEach(b => b.onclick = () => abrirFicha(b.dataset.al));
}

function nuevoAlumno() {
  abrirModal('<h2>Nuevo alumno/a</h2><p class="muted" style="margin-bottom:12px">¿Cómo quieres crear su programa de refuerzo?</p>'
    + '<button class="opcion-grande" id="opSeneca"><span class="e">📄</span><span><b>Subir el programa de Séneca</b><br><span class="muted">Word o PDF. La app saca sola los datos, criterios, saberes y el resto de apartados.</span></span></button>'
    + '<button class="opcion-grande" id="opBanco"><span class="e">✍️</span><span><b>Crearlo desde el banco</b><br><span class="muted">Eliges los criterios del curso y los saberes con casillas.</span></span></button>'
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button></div>');
  $('opSeneca').onclick = () => subirSeneca(null);
  $('opBanco').onclick = () => formAlumno(null, { tipo: 'PRA-DA', areas: { LCL: true, MAT: true } }, 'banco');
}

function subirSeneca(idExistente) {
  abrirModal('<h2>' + (idExistente ? 'Actualizar con el programa de Séneca' : 'Subir el programa de Séneca') + '</h2>'
    + '<p class="muted" style="margin-bottom:12px">Descarga de Séneca el «Programa de Refuerzo del Aprendizaje» del alumno/a y súbelo aquí. Del nombre solo se sacan las siglas: el nombre no se guarda.</p>'
    + '<label class="drop" id="drop"><input type="file" id="fSeneca" accept=".docx,.pdf" style="display:none">📎 Pulsa para elegir el archivo<br><span class="muted">o arrástralo aquí (.docx o .pdf)</span></label>'
    + '<div id="senEstado" class="muted" style="margin-top:10px"></div>'
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button></div>');
  const drop = $('drop');
  const procesar = async f => {
    if (!f) return;
    $('senEstado').textContent = '⏳ Leyendo «' + f.name + '»…';
    try {
      const r = await Seneca.leerArchivo(f);
      if (!Object.keys(r.areas).length) { $('senEstado').innerHTML = '⚠️ No he encontrado el programa en ese archivo. ¿Es el «Programa de Refuerzo del Aprendizaje» de Séneca?'; return; }
      const prog = {};
      Object.entries(r.areas).forEach(([k, a]) => { prog[k] = { competencias: a.competencias, criterios: a.criterios, otros: a.otros }; });
      if (idExistente) {
        const a = D.alumnos[idExistente];
        const areas = Object.assign({}, a.areas); Object.keys(prog).forEach(k => areas[k] = true);
        await actualizar({ [BASE + '/alumnos/' + idExistente + '/programa']: prog, [BASE + '/alumnos/' + idExistente + '/areas']: areas, [BASE + '/alumnos/' + idExistente + '/origen']: 'seneca' });
        aprenderBanco(a.curso || r.curso, prog);
        D.alumnos[idExistente] = Object.assign({}, a, { programa: prog, areas, origen: 'seneca' });
        cerrarModal(); toast('Programa actualizado ✓', 'ok'); renderTodo(); return;
      }
      const datos = {
        siglas: r.siglas, curso: r.curso, unidad: r.unidad, tutor: r.tutor, tipo: r.tipo,
        fechaFamilia: convFecha(r.fechaFamilia), autorizacion: false, observaciones: '',
        areas: Object.fromEntries(Object.keys(prog).map(k => [k, true])), programa: prog, origen: 'seneca'
      };
      formAlumno(null, datos, 'seneca', r.avisos);
    } catch (e) { console.error(e); $('senEstado').textContent = '⚠️ ' + (e.message || 'No se pudo leer el archivo.'); }
  };
  $('fSeneca').onchange = e => procesar(e.target.files[0]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('on'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); procesar(e.dataTransfer.files[0]); });
}

function resumenPrograma(prog) {
  return Object.entries(prog || {}).map(([k, p]) => {
    const nc = lista(p.criterios).length, ns = lista(p.criterios).reduce((n, c) => n + lista(c.saberes).length, 0) + lista(p.sueltos).length;
    return '<span class="chip ' + k + '">' + (AREAS[k] ? AREAS[k].icon + ' ' + AREAS[k].corto : k) + ': ' + nc + ' criterios · ' + ns + ' saberes</span>';
  }).join(' ');
}

// Formulario de datos del alumno (nuevo o existente)
function formAlumno(id, a, origen, avisos) {
  a = a || {};
  const tutorSug = (D.config.tutores || {});
  abrirModal('<h2>' + (id ? 'Datos de ' + esc(a.siglas) : 'Datos del alumno/a') + '</h2>'
    + (origen === 'seneca' ? '<div class="aviso">✅ Programa leído: ' + resumenPrograma(a.programa) + '<br>Revisa los datos y guarda.</div>' : '')
    + (avisos && avisos.length ? '<div class="aviso">' + avisos.map(esc).join('<br>') + '</div>' : '')
    + '<div class="grid2">'
    + '<div><label class="f">Siglas *</label><input class="in" id="faSiglas" value="' + esc(a.siglas || '') + '" maxlength="8" placeholder="Ej.: AGL" style="text-transform:uppercase;font-weight:800"></div>'
    + '<div><label class="f">Curso *</label><select class="in" id="faCurso">' + CURSOS.map(c => '<option' + (a.curso === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>'
    + '<div><label class="f">Unidad</label><input class="in" id="faUnidad" value="' + esc(a.unidad || '') + '" placeholder="Ej.: 2 EP"></div>'
    + '<div><label class="f">Tutor/a</label><input class="in" id="faTutor" list="dlTutores" value="' + esc(a.tutor || '') + '"><datalist id="dlTutores">' + [...new Set(Object.values(tutorSug))].map(t => '<option value="' + esc(t) + '">').join('') + '</datalist></div>'
    + '</div>'
    + '<label class="f">Tipo de programa</label><select class="in" id="faTipo">' + Object.entries(TIPOS).map(([k, t]) => '<option value="' + k + '"' + (a.tipo === k ? ' selected' : '') + '>' + k + ' · ' + esc(t.txt) + '</option>').join('') + '</select>'
    + '<label class="f">Áreas que refuerza</label><div class="row">' + Object.entries(AREAS).map(([k, x]) => '<label class="check"><input type="checkbox" class="faArea" value="' + k + '"' + (a.areas && a.areas[k] ? ' checked' : '') + '> ' + x.icon + ' ' + x.nombre + '</label>').join('') + '</div>'
    + '<div class="grid2"><div><label class="f">Fecha en que se informó a la familia</label><input class="in" type="date" id="faFamilia" value="' + esc(a.fechaFamilia || '') + '"></div>'
    + '<div><label class="f">Autorización</label><label class="check"><input type="checkbox" id="faAutor"' + (a.autorizacion ? ' checked' : '') + '> Autorización de la familia firmada</label></div></div>'
    + '<label class="f">Observaciones (salen en el control de programas)</label><textarea class="in" id="faObs" rows="2">' + esc(a.observaciones || '') + '</textarea>'
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button><button class="btn btn-p" id="faGuardar">💾 Guardar</button></div>');
  $('faCurso').onchange = () => { if (!$('faTutor').value && tutorSug[cursoKey($('faCurso').value)]) $('faTutor').value = tutorSug[cursoKey($('faCurso').value)]; };
  if (!a.tutor) $('faCurso').onchange();
  $('faGuardar').onclick = async () => {
    const siglas = $('faSiglas').value.trim().toUpperCase();
    if (!siglas) { toast('Escribe las siglas', 'err'); $('faSiglas').focus(); return; }
    const areas = {}; document.querySelectorAll('.faArea').forEach(x => { if (x.checked) areas[x.value] = true; });
    if (!Object.keys(areas).length) { toast('Marca al menos un área', 'err'); return; }
    const datos = {
      siglas, curso: $('faCurso').value, unidad: $('faUnidad').value.trim(), tutor: $('faTutor').value.trim(),
      tipo: $('faTipo').value, areas, fechaFamilia: $('faFamilia').value, autorizacion: $('faAutor').checked,
      observaciones: $('faObs').value.trim()
    };
    const upd = {};
    if (datos.tutor) upd[BASE + '/config/tutores/' + cursoKey(datos.curso)] = datos.tutor;
    let nid = id;
    if (id) {
      Object.entries(datos).forEach(([k, v]) => upd[BASE + '/alumnos/' + id + '/' + k] = v);
    } else {
      nid = db.ref(BASE + '/alumnos').push().key;
      upd[BASE + '/alumnos/' + nid] = Object.assign({}, datos, { programa: a.programa || {}, origen: origen || 'manual', creado: Date.now() });
    }
    D.alumnos[nid] = Object.assign({}, D.alumnos[nid] || {}, upd[BASE + '/alumnos/' + nid] || datos);
    await actualizar(upd);
    if (!id && origen === 'seneca') aprenderBanco(datos.curso, a.programa);
    cerrarModal(); toast('Guardado ✓', 'ok');
    if (!id) { abrirFicha(nid, origen === 'banco' ? 'programa' : 'programa'); if (origen === 'banco') setTimeout(() => editorBanco(nid, Object.keys(areas)[0]), 50); }
    else renderTodo();
  };
}

// ─── Banco (compartido entre las maestras de refuerzo) ─────────────
function aprenderBanco(curso, prog) {
  if (!curso || !prog) return;
  const upd = {}, ck = cursoKey(curso);
  Object.entries(prog).forEach(([area, p]) => {
    if (!AREAS[area]) return;
    const b = 'refuerzo/banco/' + area + '/' + ck;
    lista(p.criterios).forEach(c => {
      if (!c.t || c.t === '(sin criterio)') return;
      const kc = clave(norm(c.t).slice(0, 90));
      if (!esCriterioOficial(area, curso, c.t)) upd[b + '/criterios/' + kc] = { c: c.c || '', t: c.t };
      lista(c.saberes).forEach(s => {
        const ks = clave(s.c || norm(s.t).slice(0, 60));
        upd[b + '/saberes/' + ks] = { c: s.c || '', t: s.t };
        upd[b + '/rel/' + kc + '/' + ks] = true;
      });
    });
    lista(p.sueltos).forEach(s => { upd[b + '/saberes/' + clave(s.c || norm(s.t).slice(0, 60))] = { c: s.c || '', t: s.t }; });
  });
  if (Object.keys(upd).length) db.ref().update(upd).catch(() => { });
}
function esCriterioOficial(area, curso, t) {
  return ((window.CRITERIOS_OFICIALES || {})[area] || {})[curso] && CRITERIOS_OFICIALES[area][curso].some(c => norm(c.t) === norm(t));
}
function criteriosBanco(area, curso) {
  const of = (((window.CRITERIOS_OFICIALES || {})[area] || {})[curso] || []).map(c => ({ c: c.c, t: c.t, oficial: true }));
  const ap = Object.values(((BANCO[area] || {})[cursoKey(curso)] || {}).criterios || {});
  const out = of.slice();
  ap.forEach(c => { if (!out.some(x => norm(x.t) === norm(c.t))) out.push(c); });
  return out;
}
const saberesBanco = (area, curso) => Object.entries(((BANCO[area] || {})[cursoKey(curso)] || {}).saberes || {}).map(([k, s]) => ({ k, ...s }))
  .sort((a, b) => String(a.c).localeCompare(String(b.c), 'es', { numeric: true }));
const relBanco = (area, curso, critT) => Object.keys((((BANCO[area] || {})[cursoKey(curso)] || {}).rel || {})[clave(norm(critT).slice(0, 90))] || {});

// Editor de programa desde el banco (por área)
function editorBanco(id, area) {
  const a = D.alumnos[id]; if (!a) return;
  area = area || areasDe(a)[0];
  const p = (a.programa && a.programa[area]) || {};
  const marcadosC = new Set(lista(p.criterios).map(c => norm(c.t)));
  const marcadosS = new Set(saberesDePrograma(a, area).map(s => norm(s.t)));
  const crits = criteriosBanco(area, a.curso);
  lista(p.criterios).forEach(c => { if (c.t && !crits.some(x => norm(x.t) === norm(c.t))) crits.push({ c: c.c, t: c.t }); });
  const sabs = saberesBanco(area, a.curso);
  saberesDePrograma(a, area).forEach(s => { if (!sabs.some(x => norm(x.t) === norm(s.t))) sabs.push(s); });
  const otros = p.otros || {};
  abrirModal('<h2>' + AREAS[area].icon + ' Programa de ' + esc(AREAS[area].nombre) + ' · ' + esc(a.siglas) + '</h2>'
    + '<div class="row" style="margin-bottom:8px">' + areasDe(a).map(k => '<button class="sel-chip' + (k === area ? ' on' : '') + '" data-area="' + k + '">' + AREAS[k].corto + '</button>').join('') + '</div>'
    + '<h3 style="margin-top:10px">1 · Criterios de evaluación de ' + esc(a.curso) + '</h3>'
    + (crits.length ? crits.map((c, i) => '<label class="check"><input type="checkbox" class="ebC" data-i="' + i + '"' + (marcadosC.has(norm(c.t)) ? ' checked' : '') + '><span><span class="cod">' + esc(c.c || '') + '</span> ' + esc(c.t) + '</span></label>').join('') : '<div class="vacio">No hay criterios para este curso.</div>')
    + '<h3 style="margin-top:14px">2 · Saberes básicos</h3>'
    + '<p class="muted">Los ⭐ suelen ir con los criterios marcados. El banco crece con cada programa de Séneca que se sube.</p>'
    + '<div id="ebSabs"></div>'
    + '<div class="row" style="margin-top:6px"><input class="in" id="ebNuevoC" placeholder="Código (opcional)" style="max-width:150px"><input class="in" id="ebNuevoT" placeholder="Añadir un saber que no está en la lista" style="flex:1;min-width:200px"><button class="btn btn-s btn-sm" id="ebAdd">➕ Añadir</button></div>'
    + '<h3 style="margin-top:14px">3 · Otros aspectos del programa</h3><p class="muted">Una línea por cada punto. Toca una sugerencia para añadirla.</p>'
    + OTROS.map(([k, t]) => '<label class="f">' + esc(t) + '</label><textarea class="in ebO" data-k="' + k + '" rows="3">' + esc(lista(otros[k]).join('\n')) + '</textarea>'
      + '<div class="row" style="margin-top:4px">' + SUGERENCIAS[k].map(s => '<button class="chip ebSug" data-k="' + k + '">+ ' + esc(s) + '</button>').join('') + '</div>').join('')
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button><button class="btn btn-p" id="ebGuardar">💾 Guardar programa</button></div>');

  const pintarSabs = () => {
    const rel = new Set();
    document.querySelectorAll('.ebC:checked').forEach(x => relBanco(area, a.curso, crits[+x.dataset.i].t).forEach(k => rel.add(k)));
    const chk = new Set([...document.querySelectorAll('.ebS:checked')].map(x => +x.dataset.i));
    const orden = sabs.map((s, i) => ({ s, i, star: rel.has(s.k) })).sort((x, y) => (y.star - x.star));
    $('ebSabs').innerHTML = orden.length ? orden.map(({ s, i, star }) => '<label class="check"><input type="checkbox" class="ebS" data-i="' + i + '"' + ((chk.size ? chk.has(i) : marcadosS.has(norm(s.t))) ? ' checked' : '') + '><span>' + (star ? '⭐ ' : '') + '<span class="cod">' + esc(s.c || '') + '</span> ' + esc(s.t) + '</span></label>').join('')
      : '<div class="vacio">Todavía no hay saberes de ' + esc(a.curso) + ' en el banco. Añádelos abajo o sube algún programa de Séneca de este curso.</div>';
  };
  pintarSabs();
  document.querySelectorAll('.ebC').forEach(x => x.onchange = pintarSabs);
  document.querySelectorAll('[data-area]').forEach(b => b.onclick = () => editorBanco(id, b.dataset.area));
  $('ebAdd').onclick = () => {
    const t = $('ebNuevoT').value.trim(); if (!t) return;
    const c = $('ebNuevoC').value.trim().replace(/\.$/, '');
    sabs.push({ c, t, k: clave(c || norm(t).slice(0, 60)), nuevo: true });
    const chk = new Set([...document.querySelectorAll('.ebS:checked')].map(x => +x.dataset.i)); chk.add(sabs.length - 1);
    pintarSabs(); document.querySelectorAll('.ebS').forEach(x => { if (chk.has(+x.dataset.i)) x.checked = true; });
    $('ebNuevoT').value = ''; $('ebNuevoC').value = '';
  };
  document.querySelectorAll('.ebSug').forEach(b => b.onclick = () => {
    const ta = document.querySelector('.ebO[data-k="' + b.dataset.k + '"]');
    const s = b.textContent.replace(/^\+ /, '');
    if (!ta.value.split('\n').includes(s)) ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + s;
  });
  $('ebGuardar').onclick = async () => {
    const cSel = [...document.querySelectorAll('.ebC:checked')].map(x => crits[+x.dataset.i]);
    const sSel = [...document.querySelectorAll('.ebS:checked')].map(x => sabs[+x.dataset.i]);
    const criterios = cSel.map(c => ({ c: c.c || '', t: c.t, saberes: [] }));
    const sueltos = [];
    sSel.forEach(s => {
      const dest = criterios.find(c => relBanco(area, a.curso, c.t).includes(s.k));
      (dest ? dest.saberes : sueltos).push({ c: s.c || '', t: s.t });
    });
    const ot = {}; document.querySelectorAll('.ebO').forEach(t => ot[t.dataset.k] = t.value.split('\n').map(x => x.trim()).filter(Boolean));
    const prog = { competencias: lista(p.competencias), criterios, sueltos, otros: ot };
    const upd = { [BASE + '/alumnos/' + id + '/programa/' + area]: prog };
    sSel.filter(s => s.nuevo).forEach(s => upd['refuerzo/banco/' + area + '/' + cursoKey(a.curso) + '/saberes/' + s.k] = { c: s.c || '', t: s.t });
    D.alumnos[id].programa = Object.assign({}, D.alumnos[id].programa, { [area]: prog });
    await actualizar(upd);
    cerrarModal(); toast('Programa guardado ✓', 'ok'); renderTodo();
  };
}

// ─── FICHA DEL ALUMNO ──────────────────────────────────────────────
function abrirFicha(id, tab) {
  fichaId = id; fichaTab = tab || 'programa';
  seccion = 'ficha';
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.s === 'alumnos'));
  document.querySelectorAll('main > section').forEach(x => x.classList.add('oculto'));
  $('sec-ficha').classList.remove('oculto');
  renderFicha(); window.scrollTo(0, 0);
}
function renderFicha() {
  const a = D.alumnos[fichaId];
  if (!a) { irA('alumnos'); return; }
  const t = TIPOS[a.tipo] || {};
  let h = '<div class="card"><div class="card-h"><div class="row"><button class="btn btn-s btn-sm" id="fVolver">◀ Volver</button>'
    + '<div><div class="kicker">' + esc(a.curso || '') + (a.unidad ? ' · ' + esc(a.unidad) : '') + (a.tutor ? ' · Tutor/a: ' + esc(a.tutor) : '') + '</div>'
    + '<h2 class="disp" style="font-size:1.6rem">' + esc(a.siglas) + ' <span class="tipo ' + (t.corto || '') + '" style="vertical-align:middle">' + esc(a.tipo) + '</span></h2></div></div>'
    + '<div class="row">' + areasDe(a).map(k => '<span class="chip ' + k + '">' + AREAS[k].icon + ' ' + AREAS[k].corto + '</span>').join('') + '</div></div>'
    + '<div class="subtabs">' + [['programa', '📄 Programa'], ['trimestral', '🗂️ Propuesta trimestral'], ['eval', '✅ Evaluación'], ['datos', '⚙️ Datos']].map(([k, n]) => '<button data-ft="' + k + '"' + (fichaTab === k ? ' class="on"' : '') + '>' + n + '</button>').join('') + '</div>'
    + '<div id="fCuerpo"></div></div>';
  $('sec-ficha').innerHTML = h;
  $('fVolver').onclick = () => irA('alumnos');
  document.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { fichaTab = b.dataset.ft; renderFicha(); });
  ({ programa: fichaPrograma, trimestral: fichaTrimestral, eval: fichaEval, datos: fichaDatos })[fichaTab](a);
}

function fichaPrograma(a) {
  let h = '<div class="row" style="margin-bottom:12px"><button class="btn btn-s" id="fpBanco">✏️ Editar con el banco</button><button class="btn btn-s" id="fpSeneca">📄 Subir programa de Séneca</button><button class="btn btn-w" id="fpWord">⬇️ Descargar programa (Word)</button></div>';
  const areas = areasDe(a);
  if (!areas.length) h += '<div class="vacio">Marca en «Datos» las áreas que refuerza.</div>';
  areas.forEach(k => {
    const p = (a.programa && a.programa[k]) || null;
    h += '<div class="area-box ' + k + '"><h3>' + AREAS[k].icon + ' ' + esc(AREAS[k].nombre) + '</h3>';
    if (!p || (!lista(p.criterios).length && !lista(p.sueltos).length)) {
      h += '<div class="vacio">Sin programa todavía. <button class="btn btn-p btn-sm" data-eb="' + k + '">Crear desde el banco</button></div></div>'; return;
    }
    if (lista(p.competencias).length) h += '<div class="muted" style="font-weight:800;margin-top:6px">Competencias específicas</div>' + lista(p.competencias).map(c => '<div class="sab"><span class="cod">' + esc(c.c) + '</span> ' + esc(c.t) + '</div>').join('');
    h += '<div class="muted" style="font-weight:800;margin-top:10px">Criterios de evaluación y saberes básicos</div>';
    lista(p.criterios).forEach(c => {
      h += '<div class="crit"><span class="cod">' + esc(c.c || '') + '</span> <b>' + esc(c.t) + '</b>' + lista(c.saberes).map(s => '<div class="sab">• <span class="cod">' + esc(s.c || '') + '</span> ' + esc(s.t) + '</div>').join('') + '</div>';
    });
    if (lista(p.sueltos).length) h += '<div class="crit"><b>Otros saberes básicos</b>' + lista(p.sueltos).map(s => '<div class="sab">• <span class="cod">' + esc(s.c || '') + '</span> ' + esc(s.t) + '</div>').join('') + '</div>';
    const ot = p.otros || {};
    OTROS.forEach(([ok, t]) => { if (lista(ot[ok]).length) h += '<div class="muted" style="font-weight:800;margin-top:8px">' + esc(t) + '</div>' + lista(ot[ok]).map(x => '<div class="sab">• ' + esc(x) + '</div>').join(''); });
    h += '</div>';
  });
  $('fCuerpo').innerHTML = h;
  $('fpBanco').onclick = () => editorBanco(fichaId);
  $('fpSeneca').onclick = () => subirSeneca(fichaId);
  $('fpWord').onclick = () => Docs.descargar('programa', { id: fichaId });
  document.querySelectorAll('[data-eb]').forEach(b => b.onclick = () => editorBanco(fichaId, b.dataset.eb));
}

let trimFicha = trimestreDe(hoyIso());
function fichaTrimestral(a) {
  const T = trimFicha, tri = ((a.trimestral || {})['t' + T]) || {};
  let h = '<div class="row" style="margin-bottom:10px"><b>Trimestre:</b>' + [1, 2, 3].map(n => '<button class="sel-chip' + (n === T ? ' on' : '') + '" data-tr="' + n + '">' + n + 'º</button>').join('')
    + '<span class="esp" style="flex:1"></span><button class="btn btn-w btn-sm" id="ftWord">⬇️ DOC 2 (Word)</button></div>'
    + '<p class="muted" style="margin-bottom:10px">Propuesta curricular trimestral de cada área objeto de refuerzo. Se guarda sola al salir de cada casilla.</p>';
  areasDe(a).forEach(k => {
    const d = tri[k] || {}, p = (a.programa && a.programa[k]) || {}, ot = p.otros || {};
    const sabs = saberesDePrograma(a, k);
    const marc = new Set(lista(d.saberes).map(norm));
    h += '<div class="area-box ' + k + '"><h3>' + AREAS[k].icon + ' ' + esc(AREAS[k].nombre) + '</h3>'
      + '<label class="f">Saberes básicos de este trimestre</label>'
      + (sabs.length ? sabs.map(s => '<label class="check"><input type="checkbox" class="trS" data-a="' + k + '" value="' + esc(textoSaber(s)) + '"' + (marc.has(norm(textoSaber(s))) ? ' checked' : '') + '><span><span class="cod">' + esc(s.c || '') + '</span> ' + esc(s.t) + '</span></label>').join('') : '<div class="vacio">El programa no tiene saberes. Complétalo en la pestaña Programa.</div>')
      + campoTri(k, 'actividades', 'Tipos de actividades y tareas', d.actividades, lista(ot.actividades))
      + campoTri(k, 'recursos', 'Recursos didácticos, agrupamientos, distribución de espacios y tiempos', d.recursos, lista(ot.recursos).concat(lista(ot.agrupamientos)))
      + campoTri(k, 'evaluacion', 'Procedimientos e instrumentos de evaluación', d.evaluacion, lista(ot.instrumentos))
      + '</div>';
  });
  $('fCuerpo').innerHTML = h;
  document.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { trimFicha = +b.dataset.tr; renderFicha(); });
  $('ftWord').onclick = () => Docs.descargar('doc2', { id: fichaId, trim: T });
  const base = BASE + '/alumnos/' + fichaId + '/trimestral/t' + T + '/';
  document.querySelectorAll('.trS').forEach(x => x.onchange = () => {
    const ar = x.dataset.a, vals = [...document.querySelectorAll('.trS[data-a="' + ar + '"]:checked')].map(y => y.value);
    guardar(base + ar + '/saberes', vals);
  });
  document.querySelectorAll('.trT').forEach(x => x.onchange = () => guardar(base + x.dataset.a + '/' + x.dataset.k, x.value));
  document.querySelectorAll('.trUsar').forEach(b => b.onclick = () => {
    const ta = document.querySelector('.trT[data-a="' + b.dataset.a + '"][data-k="' + b.dataset.k + '"]');
    ta.value = b.dataset.v; guardar(base + b.dataset.a + '/' + b.dataset.k, ta.value); toast('Copiado del programa ✓', 'ok');
  });
}
function campoTri(area, k, titulo, val, delPrograma) {
  const v = delPrograma.join('\n');
  return '<label class="f">' + esc(titulo) + '</label><textarea class="in trT" data-a="' + area + '" data-k="' + k + '" rows="3">' + esc(val || '') + '</textarea>'
    + (v ? '<button class="btn btn-s btn-sm trUsar" style="margin-top:4px" data-a="' + area + '" data-k="' + k + '" data-v="' + esc(v) + '">📋 Usar lo del programa</button>' : '');
}

function fichaEval(a) {
  let h = '<p class="muted" style="margin-bottom:10px">Toca una casilla para cambiar: C → EP → NI → vacío. También puedes evaluar a todo el curso en la pestaña ✅ Evaluación.</p><div class="ev-wrap"><table class="ev"><tr><th>Trim.</th>'
    + EVAL_ITEMS.map(i => '<th class="' + i.a + '">' + (i.a === 'LCL' ? 'L · ' : 'M · ') + esc(i.t) + '</th>').join('') + '</tr>';
  [1, 2, 3].forEach(T => {
    const ev = (a.eval || {})['t' + T] || {};
    h += '<tr><td class="al">' + T + 'º</td>' + EVAL_ITEMS.map(i => celdaEval(fichaId, T, i, ev[i.k], a)).join('') + '</tr>';
  });
  h += '</table></div>' + leyenda();
  $('fCuerpo').innerHTML = h;
  engancharEval($('fCuerpo'));
}
function celdaEval(id, T, item, v, a) {
  const activa = !a.areas || a.areas[item.a];
  return '<td><button class="ev-btn ' + (v || '') + '" data-ev="' + id + '|' + T + '|' + item.k + '" title="' + esc(item.t) + '"' + (activa ? '' : ' style="opacity:.35"') + '>' + (v || '·') + '</button></td>';
}
function engancharEval(box) {
  box.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => {
    const [id, T, k] = b.dataset.ev.split('|');
    const orden = ['', 'C', 'EP', 'NI'];
    const act = (((D.alumnos[id] || {}).eval || {})['t' + T] || {})[k] || '';
    const sig = orden[(orden.indexOf(act) + 1) % orden.length];
    const al = D.alumnos[id]; al.eval = al.eval || {}; al.eval['t' + T] = al.eval['t' + T] || {}; al.eval['t' + T][k] = sig || null;
    b.className = 'ev-btn ' + sig; b.textContent = sig || '·';
    guardar(BASE + '/alumnos/' + id + '/eval/t' + T + '/' + k, sig || null);
  });
}
const leyenda = () => '<div class="leyenda"><span><b style="color:var(--ok)">C</b> Conseguido · alcanza los objetivos del refuerzo</span><span><b style="color:var(--ep)">EP</b> En proceso · progresa, necesita más tiempo</span><span><b style="color:var(--ni)">NI</b> No iniciado · requiere apoyo constante</span></div>';

function fichaDatos(a) {
  const t = TIPOS[a.tipo] || {};
  $('fCuerpo').innerHTML = '<div class="grid2">'
    + [['Siglas', a.siglas], ['Curso', a.curso], ['Unidad', a.unidad], ['Tutor/a', a.tutor], ['Tipo de programa', (a.tipo || '') + ' · ' + (t.txt || '')],
    ['Información a la familia', a.fechaFamilia ? fechaCorta(a.fechaFamilia) : '—'], ['Autorización', a.autorizacion ? '✅ Firmada' : '⏳ Pendiente'], ['Observaciones', a.observaciones || '—'],
    ['Origen del programa', { seneca: 'Séneca', banco: 'Banco', manual: 'Manual' }[a.origen] || '—']]
      .map(([k, v]) => '<div><div class="muted" style="font-weight:800">' + k + '</div><div>' + esc(v || '—') + '</div></div>').join('') + '</div>'
    + '<div class="row" style="margin-top:16px"><button class="btn btn-p" id="fdEditar">✏️ Editar datos</button><button class="btn btn-d" id="fdBorrar">🗑️ Dar de baja</button></div>';
  $('fdEditar').onclick = () => formAlumno(fichaId, a);
  $('fdBorrar').onclick = async () => {
    if (!await confirmar('Se borrará ' + a.siglas + ' con su programa, propuestas y evaluaciones. No se puede deshacer.', '¿Dar de baja a ' + a.siglas + '?', 'Borrar')) return;
    const upd = { [BASE + '/alumnos/' + fichaId]: null };
    Object.entries(D.quincenas).forEach(([qid, q]) => Object.entries(q.dias || {}).forEach(([d, ses]) => Object.keys(ses || {}).forEach(sid => {
      if (ses[sid].alumnos && ses[sid].alumnos[fichaId]) upd[BASE + '/quincenas/' + qid + '/dias/' + d + '/' + sid + '/alumnos/' + fichaId] = null;
    })));
    delete D.alumnos[fichaId];
    await actualizar(upd); toast('Alumno/a dado de baja', 'ok'); irA('alumnos');
  };
}

// ─── QUINCENAS ─────────────────────────────────────────────────────
const quincenasOrden = c => Object.entries(D.quincenas).map(([id, q]) => ({ id, ...q })).filter(q => !c || q.curso === c).sort((a, b) => b.desde.localeCompare(a.desde) || String(a.curso).localeCompare(String(b.curso)));
const fechaDia = (q, d) => masDias(q.desde, +d + (+d >= 5 ? 2 : 0));
const sesionesDia = (q, d) => Object.entries((q.dias || {})[d] || {}).map(([sid, s]) => ({ sid, ...s })).sort((a, b) => (a.orden || 0) - (b.orden || 0));
function quincenaDeFecha(c, ds) {
  return quincenasOrden(c).find(q => ds >= q.desde && ds <= masDias(q.desde, 11));
}
let qCurso = null, qId = null;

function renderQuincenal() {
  const cursos = cursosConAlumnos();
  if (!qCurso || !cursos.includes(qCurso)) qCurso = cursos[0] || null;
  let h = '<div class="card"><div class="card-h"><div><div class="kicker">Coordinación tutoría · refuerzo</div><h2>Cuadrante quincenal</h2></div></div>';
  if (!qCurso) { $('sec-quincenal').innerHTML = h + '<div class="vacio">Primero añade alumnado en la pestaña 👥 Alumnado.</div></div>'; return; }
  const qs = quincenasOrden(qCurso);
  if (!qId || !D.quincenas[qId] || D.quincenas[qId].curso !== qCurso) { const hoyQ = quincenaDeFecha(qCurso, hoyIso()); qId = hoyQ ? hoyQ.id : (qs[0] ? qs[0].id : null); }
  h += '<div class="row" style="margin-bottom:10px"><b>Curso:</b>' + cursos.map(c => '<button class="sel-chip' + (c === qCurso ? ' on' : '') + '" data-qc="' + c + '">' + c + '</button>').join('') + '</div>'
    + '<div class="row"><select class="in" id="qSel" style="max-width:340px">' + (qs.length ? qs.map(q => '<option value="' + q.id + '"' + (q.id === qId ? ' selected' : '') + '>Del ' + fechaCorta(q.desde) + ' al ' + fechaCorta(masDias(q.desde, 11)) + '</option>').join('') : '<option>— Sin quincenas —</option>') + '</select>'
    + '<button class="btn btn-p" id="qNueva">➕ Nueva quincena</button></div></div>';
  if (!qId) { $('sec-quincenal').innerHTML = h + '<div class="card"><div class="vacio">No hay quincenas de ' + qCurso + '. Pulsa <b>➕ Nueva quincena</b>.</div></div>'; enganchaQ(); return; }
  const q = D.quincenas[qId], alus = alumnosDeCurso(qCurso);
  const base = BASE + '/quincenas/' + qId;
  h += '<div class="card"><div class="card-h"><div><div class="kicker">' + qCurso + ' de Primaria</div><h2>Del ' + fechaCorta(q.desde) + ' al ' + fechaCorta(masDias(q.desde, 11)) + '</h2></div>'
    + '<div class="row"><button class="btn btn-w btn-sm" id="qWord">⬇️ DOC 3 (Word)</button><button class="btn btn-d btn-sm" id="qBorrar">🗑️</button></div></div>'
    + '<div class="grid2"><div><label class="f">Tutor/a</label><input class="in qCampo" data-r="tutor" value="' + esc(q.tutor || '') + '"></div>'
    + '<div><label class="f">Profesor/a de refuerzo</label><input class="in qCampo" data-r="profesor" value="' + esc(q.profesor || '') + '"></div></div>';
  for (let d = 0; d < 10; d++) {
    if (d === 0 || d === 5) h += '<div class="semana-h">' + (d === 0 ? 'Primera' : 'Segunda') + ' semana</div>';
    const ds = fechaDia(q, d), nc = sinCole(ds), ses = sesionesDia(q, d);
    h += '<div class="q-dia' + (nc ? ' nocole' : '') + '"><div class="q-dia-h"><span class="fecha">' + fechaLarga(ds) + '</span>'
      + (nc ? '<span>' + (nc.emoji || '🏠') + ' ' + esc(nc.nombre) + '</span>' : '<button class="btn btn-s btn-sm" data-addses="' + d + '">➕ Sesión</button>') + '</div>';
    ses.forEach(s => {
      const cls = s.area === 'MAT' ? 'MAT' : (s.area === 'AMB' ? 'AMB' : 'LCL');
      h += '<div class="q-ses" style="border-left:4px solid var(--' + (cls === 'MAT' ? 'mat' : cls === 'AMB' ? 'primary' : 'lcl') + ')">'
        + '<div><label class="f" style="margin-top:0">Área</label><select class="in qS" data-d="' + d + '" data-s="' + s.sid + '" data-k="area">'
        + [['LCL', 'Lengua'], ['MAT', 'Matemáticas'], ['AMB', 'Lengua y Mates']].map(([v, n]) => '<option value="' + v + '"' + (s.area === v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>'
        + '<button class="btn btn-d btn-sm" style="margin-top:6px" data-delses="' + d + '|' + s.sid + '">Quitar</button></div>'
        + '<div><label class="f" style="margin-top:0">Saberes / objetivos</label><textarea class="in qS" rows="3" data-d="' + d + '" data-s="' + s.sid + '" data-k="saberes">' + esc(s.saberes || '') + '</textarea>'
        + '<button class="btn btn-s btn-sm" style="margin-top:4px" data-delprog="' + d + '|' + s.sid + '">📚 Del programa</button></div>'
        + '<div><label class="f" style="margin-top:0">Actividades</label><textarea class="in qS" rows="3" data-d="' + d + '" data-s="' + s.sid + '" data-k="actividades">' + esc(s.actividades || '') + '</textarea>'
        + '<button class="btn btn-s btn-sm" style="margin-top:4px" data-actprog="' + d + '|' + s.sid + '">💡 Ideas del programa</button></div>'
        + '<div class="alus"><label class="f" style="margin-top:0">Alumnado</label><div class="row">'
        + (alus.length ? alus.map(al => '<button class="sel-chip' + (s.alumnos && s.alumnos[al.id] ? ' on' : '') + '" data-alq="' + d + '|' + s.sid + '|' + al.id + '">' + esc(al.siglas) + '</button>').join('') : '<span class="muted">Sin alumnado en ' + qCurso + '</span>')
        + '</div></div></div>';
    });
    h += '</div>';
  }
  const co = q.coord || {};
  h += '<div class="semana-h">Coordinación y seguimiento</div>'
    + '<div class="grid2"><div><label class="f">Fecha de coordinación</label><input type="date" class="in qCampo" data-r="coord/fecha" value="' + esc(co.fecha || '') + '"></div></div>'
    + '<label class="f">Acuerdos tomados</label><textarea class="in qCampo" data-r="coord/acuerdos" rows="3">' + esc(co.acuerdos || '') + '</textarea>'
    + '<label class="f">Observaciones y seguimiento</label><textarea class="in qCampo" data-r="coord/observaciones" rows="3">' + esc(co.observaciones || '') + '</textarea></div>';
  $('sec-quincenal').innerHTML = h;
  enganchaQ();
  const box = $('sec-quincenal');
  box.querySelectorAll('.qCampo').forEach(x => x.onchange = () => {
    guardar(base + '/' + x.dataset.r, x.value);
    if (x.dataset.r === 'tutor' && x.value) guardar(BASE + '/config/tutores/' + cursoKey(qCurso), x.value);
  });
  box.querySelectorAll('.qS').forEach(x => x.onchange = () => {
    const r = base + '/dias/' + x.dataset.d + '/' + x.dataset.s + '/' + x.dataset.k;
    guardar(r, x.value); setLocal(q, x.dataset.d, x.dataset.s, x.dataset.k, x.value);
  });
  box.querySelectorAll('[data-addses]').forEach(b => b.onclick = () => {
    const d = b.dataset.addses, prev = sesionesDia(q, d);
    const sid = db.ref(base + '/dias/' + d).push().key;
    const ult = prev[prev.length - 1] || ultimaSesion(q, d);
    const s = { area: ult ? ult.area : 'LCL', saberes: '', actividades: '', alumnos: ult && ult.alumnos ? ult.alumnos : {}, orden: prev.length };
    setLocal(q, d, sid, null, s); guardar(base + '/dias/' + d + '/' + sid, s); renderQuincenal();
  });
  box.querySelectorAll('[data-delses]').forEach(b => b.onclick = () => {
    const [d, sid] = b.dataset.delses.split('|');
    delete q.dias[d][sid]; guardar(base + '/dias/' + d + '/' + sid, null); renderQuincenal();
  });
  box.querySelectorAll('[data-alq]').forEach(b => b.onclick = () => {
    const [d, sid, al] = b.dataset.alq.split('|');
    const s = q.dias[d][sid]; s.alumnos = s.alumnos || {};
    const on = !s.alumnos[al]; if (on) s.alumnos[al] = true; else delete s.alumnos[al];
    b.classList.toggle('on', on);
    guardar(base + '/dias/' + d + '/' + sid + '/alumnos/' + al, on || null);
  });
  box.querySelectorAll('[data-delprog]').forEach(b => b.onclick = () => { const [d, sid] = b.dataset.delprog.split('|'); elegirDelPrograma(qId, d, sid, 'saberes'); });
  box.querySelectorAll('[data-actprog]').forEach(b => b.onclick = () => { const [d, sid] = b.dataset.actprog.split('|'); elegirDelPrograma(qId, d, sid, 'actividades'); });
  $('qWord').onclick = () => Docs.descargar('doc3', { qid: qId });
  $('qBorrar').onclick = async () => {
    if (!await confirmar('Se borrará la quincena del ' + fechaCorta(q.desde) + ' de ' + qCurso + '.', '¿Borrar quincena?', 'Borrar')) return;
    delete D.quincenas[qId]; guardar(base, null); qId = null; renderQuincenal();
  };
}
function setLocal(q, d, sid, k, v) {
  q.dias = q.dias || {}; q.dias[d] = q.dias[d] || {};
  if (k === null) q.dias[d][sid] = v; else { q.dias[d][sid] = q.dias[d][sid] || {}; q.dias[d][sid][k] = v; }
}
function ultimaSesion(q, d) { // la misma jornada de la semana anterior, o el día anterior
  for (let x = +d - 1; x >= 0; x--) { const s = sesionesDia(q, x); if (s.length) return s[s.length - 1]; }
  return null;
}
function enganchaQ() {
  const box = $('sec-quincenal');
  box.querySelectorAll('[data-qc]').forEach(b => b.onclick = () => { qCurso = b.dataset.qc; qId = null; renderQuincenal(); });
  if ($('qSel')) $('qSel').onchange = () => { qId = $('qSel').value; renderQuincenal(); };
  $('qNueva').onclick = () => nuevaQuincena(qCurso);
}
function nuevaQuincena(curso, fecha) {
  const qs = quincenasOrden(curso);
  let sug = fecha ? lunesDe(fecha) : (qs[0] ? masDias(qs[0].desde, 14) : lunesDe(hoyIso()));
  abrirModal('<h2>Nueva quincena · ' + esc(curso) + '</h2>'
    + '<label class="f">Empieza el lunes</label><input type="date" class="in" id="nqFecha" value="' + sug + '">'
    + (qs.length ? '<label class="check" style="margin-top:10px"><input type="checkbox" id="nqCopiar" checked> Copiar las sesiones de la quincena anterior (área y alumnado)</label>' : '')
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button><button class="btn btn-p" id="nqOk">Crear</button></div>');
  $('nqOk').onclick = () => {
    const desde = lunesDe($('nqFecha').value || hoyIso());
    const id = cursoKey(curso) + '_' + desde;
    if (D.quincenas[id]) { cerrarModal(); qCurso = curso; qId = id; irA('quincenal'); toast('Esa quincena ya existe', ''); return; }
    const choca = quincenasOrden(curso).find(x => Math.abs((new Date(x.desde) - new Date(desde)) / 864e5) < 14);
    const ant = qs.find(x => x.desde < desde);
    const nq = { curso, desde, tutor: (D.config.tutores || {})[cursoKey(curso)] || (ant && ant.tutor) || '', profesor: PERFILES[PERFIL].nombre, dias: {} };
    if (ant && $('nqCopiar') && $('nqCopiar').checked) {
      Object.entries(ant.dias || {}).forEach(([d, ses]) => {
        nq.dias[d] = {};
        Object.entries(ses || {}).forEach(([sid, s]) => nq.dias[d][sid] = { area: s.area || 'LCL', saberes: '', actividades: '', alumnos: s.alumnos || {}, orden: s.orden || 0 });
      });
    }
    D.quincenas[id] = nq; guardar(BASE + '/quincenas/' + id, nq);
    cerrarModal(); qCurso = curso; qId = id;
    if (choca) toast('Ojo: se solapa con la quincena del ' + fechaCorta(choca.desde), '');
    irA('quincenal');
  };
}
function elegirDelPrograma(qid, d, sid, tipo) {
  const q = D.quincenas[qid], s = q.dias[d][sid];
  const ids = Object.keys(s.alumnos || {}).filter(x => D.alumnos[x]);
  const alus = ids.length ? ids.map(x => ({ id: x, ...D.alumnos[x] })) : alumnosDeCurso(q.curso);
  const areas = s.area === 'AMB' ? ['LCL', 'MAT'] : [s.area || 'LCL'];
  const items = [], vistos = new Set();
  alus.forEach(a => areas.forEach(ar => {
    if (tipo === 'saberes') saberesDePrograma(a, ar).forEach(x => { const t = textoSaber(x); if (!vistos.has(norm(t))) { vistos.add(norm(t)); items.push(t); } });
    else lista(((a.programa || {})[ar] || {}).otros ? a.programa[ar].otros.actividades : []).forEach(t => { if (!vistos.has(norm(t))) { vistos.add(norm(t)); items.push(t); } });
  }));
  if (tipo === 'actividades') SUGERENCIAS.actividades.forEach(t => { if (!vistos.has(norm(t))) items.push(t); });
  abrirModal('<h2>' + (tipo === 'saberes' ? '📚 Saberes del programa' : '💡 Actividades') + '</h2><p class="muted">Marca los que quieras añadir a la sesión del ' + fechaLarga(fechaDia(q, d)) + '.</p>'
    + (items.length ? items.map((t, i) => '<label class="check"><input type="checkbox" class="dpI" data-i="' + i + '"><span>' + esc(t) + '</span></label>').join('') : '<div class="vacio">Los programas de este alumnado no tienen nada aún.</div>')
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button><button class="btn btn-p" id="dpOk">Añadir</button></div>');
  $('dpOk').onclick = () => {
    const sel = [...document.querySelectorAll('.dpI:checked')].map(x => items[+x.dataset.i]);
    if (sel.length) {
      const val = ((s[tipo] || '').trim() ? s[tipo].trim() + '\n' : '') + sel.map(t => '• ' + t).join('\n');
      s[tipo] = val; guardar(BASE + '/quincenas/' + qid + '/dias/' + d + '/' + sid + '/' + tipo, val);
    }
    cerrarModal(); renderTodo();
  };
}
const qIdDe = q => Object.keys(D.quincenas).find(k => D.quincenas[k] === q) || (cursoKey(q.curso) + '_' + q.desde);

// ─── HOY ───────────────────────────────────────────────────────────
let hoyFecha = null;
function renderHoy() {
  const hoy = hoyIso();
  let ds = hoyFecha || hoy, nota = '';
  if (!hoyFecha && sinCole(ds)) { const nc = sinCole(ds); nota = (nc.emoji || '🏠') + ' Hoy no hay cole (' + esc(nc.nombre) + '). Te enseño el próximo día de cole.'; ds = proxLectivo(ds, 1); }
  const nc = sinCole(ds);
  const titulo = ds === hoy ? 'Hoy' : ds === masDias(hoy, 1) ? 'Mañana' : ds === masDias(hoy, -1) ? 'Ayer' : 'Día de cole';
  let h = '<div class="card"><div class="hoy-cab"><div><div class="kicker">' + titulo + '</div><h2 class="hoy-fecha">' + fechaLarga(ds) + '</h2></div>'
    + '<div class="row"><button class="btn btn-s btn-sm" data-hn="-1" aria-label="Día anterior">◀</button><button class="btn btn-s btn-sm" data-hn="0"' + (!hoyFecha ? ' disabled' : '') + '>Hoy</button><button class="btn btn-s btn-sm" data-hn="1" aria-label="Día siguiente">▶</button>'
    + '<input type="date" class="in" id="hoyF" value="' + ds + '" style="width:auto"></div></div>';
  if (nota) h += '<div class="aviso">' + nota + '</div>';
  window._hoyDs = ds;
  if (nc) {
    h += '<div class="vacio">' + (nc.emoji || '🏠') + ' <b>No hay cole</b> · ' + esc(nc.nombre) + '</div>';
  } else {
    const filas = [], sinQ = [];
    cursosConAlumnos().forEach(c => {
      const q = quincenaDeFecha(c, ds);
      if (!q) { sinQ.push(c); return; }
      const d = Math.round((new Date(ds + 'T12:00') - new Date(q.desde + 'T12:00')) / 864e5), di = d >= 7 ? d - 2 : d;
      sesionesDia(q, String(di)).forEach(s => filas.push({ q, d: String(di), s }));
    });
    if (!filas.length) h += '<div class="vacio">🙌 No hay sesiones programadas para este día.</div>';
    else {
      h += '<p class="muted" style="margin-bottom:10px"><b>' + filas.length + '</b> ' + (filas.length === 1 ? 'sesión' : 'sesiones') + '. Toca a un alumno/a para marcar que <b>falta</b>.</p>';
      filas.forEach(({ q, d, s }) => {
        const qid = qIdDe(q), r = qid + '|' + d + '|' + s.sid;
        const area = s.area === 'MAT' ? 'MAT' : s.area === 'AMB' ? 'AMB' : 'LCL';
        const ids = Object.keys(s.alumnos || {}).filter(x => D.alumnos[x]);
        h += '<div class="ses ' + area + (s.hecha ? ' hecha' : '') + '"><div class="ses-cab"><span class="disp">' + esc(q.curso) + '</span>'
          + (area === 'AMB' ? '<span class="chip LCL">📖 Lengua</span><span class="chip MAT">🔢 Mates</span>' : '<span class="chip ' + area + '">' + AREAS[area].icon + ' ' + AREAS[area].corto + '</span>')
          + '<span style="flex:1"></span><button class="btn btn-sm ' + (s.hecha ? 'btn-p' : 'btn-s') + '" data-hecha="' + r + '">' + (s.hecha ? '✅ Hecha' : '☐ Marcar hecha') + '</button></div>'
          + (s.saberes ? '<p><b>Saberes:</b> ' + esc(s.saberes).replace(/\n/g, '<br>') + '</p>' : '')
          + (s.actividades ? '<p><b>Actividades:</b> ' + esc(s.actividades).replace(/\n/g, '<br>') + '</p>' : '')
          + (!s.saberes && !s.actividades ? '<p class="muted">Sin contenido programado. <a href="#" data-irq="' + qid + '">Rellenar en Quincenal</a></p>' : '')
          + '<div class="row" style="margin-top:6px">' + (ids.length ? ids.map(id => '<button class="sel-chip ' + (s.faltas && s.faltas[id] ? 'falta' : 'on') + '" data-falta="' + r + '|' + id + '">' + esc(D.alumnos[id].siglas) + '</button>').join('') : '<span class="muted">Sin alumnado asignado</span>') + '</div>'
          + '<input class="in" style="margin-top:8px" placeholder="Anotación de la sesión (opcional)" data-nota="' + r + '" value="' + esc(s.nota || '') + '"></div>';
      });
    }
    if (sinQ.length) h += '<div class="aviso" style="margin-top:12px">Sin quincena para este día: ' + sinQ.map(c => '<button class="btn btn-s btn-sm" data-nq="' + c + '">➕ ' + c + '</button>').join(' ') + '</div>';
  }
  h += '</div>';
  $('sec-hoy').innerHTML = h;
  const box = $('sec-hoy');
  box.querySelectorAll('[data-hn]').forEach(b => b.onclick = () => { const n = +b.dataset.hn; hoyFecha = n === 0 ? null : proxLectivo(window._hoyDs, n); renderHoy(); });
  $('hoyF').onchange = e => { if (e.target.value) { hoyFecha = e.target.value; renderHoy(); } };
  const ses = r => { const [qid, d, sid] = r.split('|'); return { s: D.quincenas[qid].dias[d][sid], p: BASE + '/quincenas/' + qid + '/dias/' + d + '/' + sid }; };
  box.querySelectorAll('[data-hecha]').forEach(b => b.onclick = () => { const { s, p } = ses(b.dataset.hecha); s.hecha = !s.hecha; guardar(p + '/hecha', s.hecha || null); renderHoy(); });
  box.querySelectorAll('[data-falta]').forEach(b => b.onclick = () => {
    const parts = b.dataset.falta.split('|'), id = parts.pop(), { s, p } = ses(parts.join('|'));
    s.faltas = s.faltas || {}; const f = !s.faltas[id]; if (f) s.faltas[id] = true; else delete s.faltas[id];
    b.className = 'sel-chip ' + (f ? 'falta' : 'on'); guardar(p + '/faltas/' + id, f || null);
    toast(D.alumnos[id].siglas + (f ? ': falta ✓' : ': asiste ✓'), 'ok');
  });
  box.querySelectorAll('[data-nota]').forEach(x => x.onchange = () => { const { s, p } = ses(x.dataset.nota); s.nota = x.value; guardar(p + '/nota', x.value || null); });
  box.querySelectorAll('[data-nq]').forEach(b => b.onclick = () => nuevaQuincena(b.dataset.nq, window._hoyDs));
  box.querySelectorAll('[data-irq]').forEach(a => a.onclick = e => { e.preventDefault(); const q = D.quincenas[a.dataset.irq]; qCurso = q.curso; qId = a.dataset.irq; irA('quincenal'); });
}

// ─── EVALUACIÓN (por curso) ────────────────────────────────────────
let evCurso = null, evTrim = trimestreDe(hoyIso());
function renderEvaluacion() {
  const cursos = cursosConAlumnos();
  if (!evCurso || !cursos.includes(evCurso)) evCurso = cursos[0] || null;
  let h = '<div class="card"><div class="card-h"><div><div class="kicker">Cuadrante de evaluación</div><h2>Evaluación del refuerzo</h2></div>'
    + (evCurso ? '<button class="btn btn-w btn-sm" id="evWord">⬇️ DOC 4 (Word)</button>' : '') + '</div>';
  if (!evCurso) { $('sec-evaluacion').innerHTML = h + '<div class="vacio">Primero añade alumnado.</div></div>'; return; }
  h += '<div class="row" style="margin-bottom:8px"><b>Curso:</b>' + cursos.map(c => '<button class="sel-chip' + (c === evCurso ? ' on' : '') + '" data-evc="' + c + '">' + c + '</button>').join('')
    + '<span style="width:12px"></span><b>Trimestre:</b>' + [1, 2, 3].map(n => '<button class="sel-chip' + (n === evTrim ? ' on' : '') + '" data-evt="' + n + '">' + n + 'º</button>').join('') + '</div>'
    + '<p class="muted" style="margin-bottom:8px">Toca una casilla para cambiar: C → EP → NI → vacío.</p>'
    + '<div class="ev-wrap"><table class="ev"><tr><th rowspan="2">Alumno/a</th><th class="g LCL" colspan="5">LENGUA CASTELLANA</th><th class="g MAT" colspan="5">MATEMÁTICAS</th></tr><tr>'
    + EVAL_ITEMS.map(i => '<th class="' + i.a + '">' + esc(i.t) + '</th>').join('') + '</tr>';
  alumnosDeCurso(evCurso).forEach(a => {
    const ev = (a.eval || {})['t' + evTrim] || {};
    h += '<tr><td class="al">' + esc(a.siglas) + '</td>' + EVAL_ITEMS.map(i => celdaEval(a.id, evTrim, i, ev[i.k], a)).join('') + '</tr>';
  });
  const ok = cursoKey(evCurso) + '_t' + evTrim;
  h += '</table></div>' + leyenda()
    + '<label class="f">Observaciones</label><textarea class="in" id="evObs" rows="3">' + esc(D.evalObs[ok] || '') + '</textarea></div>';
  $('sec-evaluacion').innerHTML = h;
  const box = $('sec-evaluacion');
  box.querySelectorAll('[data-evc]').forEach(b => b.onclick = () => { evCurso = b.dataset.evc; renderEvaluacion(); });
  box.querySelectorAll('[data-evt]').forEach(b => b.onclick = () => { evTrim = +b.dataset.evt; renderEvaluacion(); });
  engancharEval(box);
  $('evObs').onchange = e => { D.evalObs[ok] = e.target.value; guardar(BASE + '/evalObs/' + ok, e.target.value || null); };
  $('evWord').onclick = () => Docs.descargar('doc4', { curso: evCurso, trim: evTrim });
}

// ─── BANCO ─────────────────────────────────────────────────────────
let bCurso = '1º', bArea = 'LCL', bVer = 'saberes';
function renderBanco() {
  const crits = criteriosBanco(bArea, bCurso), sabs = saberesBanco(bArea, bCurso);
  let h = '<div class="card"><div class="card-h"><div><div class="kicker">Compartido por todo el equipo de refuerzo</div><h2>Banco de criterios y saberes</h2></div></div>'
    + '<p class="muted" style="margin-bottom:10px">Los criterios oficiales de cada curso ya vienen cargados. Los saberes se van guardando solos con cada programa de Séneca que se sube; también puedes añadirlos a mano.</p>'
    + '<div class="row" style="margin-bottom:8px"><b>Curso:</b>' + CURSOS.map(c => '<button class="sel-chip' + (c === bCurso ? ' on' : '') + '" data-bc="' + c + '">' + c + '</button>').join('') + '</div>'
    + '<div class="row" style="margin-bottom:8px"><b>Área:</b>' + Object.entries(AREAS).map(([k, a]) => '<button class="sel-chip' + (k === bArea ? ' on' : '') + '" data-ba="' + k + '">' + a.icon + ' ' + a.corto + '</button>').join('') + '</div>'
    + '<div class="subtabs"><button data-bv="saberes"' + (bVer === 'saberes' ? ' class="on"' : '') + '>Saberes básicos (' + sabs.length + ')</button><button data-bv="criterios"' + (bVer === 'criterios' ? ' class="on"' : '') + '>Criterios (' + crits.length + ')</button></div>';
  if (bVer === 'criterios') {
    h += crits.map(c => '<div class="crit"><span class="cod">' + esc(c.c || '') + '</span> ' + esc(c.t) + (c.oficial ? '' : ' <span class="chip">de Séneca</span>') + '</div>').join('') || '<div class="vacio">Sin criterios.</div>';
  } else {
    h += '<div class="row" style="margin-bottom:10px"><input class="in" id="bnC" placeholder="Código (opcional)" style="max-width:160px"><input class="in" id="bnT" placeholder="Texto del saber básico" style="flex:1;min-width:200px"><button class="btn btn-p btn-sm" id="bnAdd">➕ Añadir</button></div>'
      + (sabs.length ? sabs.map(s => '<div class="crit row" style="justify-content:space-between;flex-wrap:nowrap"><span><span class="cod">' + esc(s.c || '') + '</span> ' + esc(s.t) + '</span><button class="btn btn-s btn-sm" data-bdel="' + esc(s.k) + '" title="Quitar del banco">✕</button></div>').join('')
        : '<div class="vacio">Aún no hay saberes de ' + bCurso + '. Se llenará con el primer programa de Séneca de ese curso.</div>');
  }
  h += '</div>';
  $('sec-banco').innerHTML = h;
  const box = $('sec-banco'), ruta = 'refuerzo/banco/' + bArea + '/' + cursoKey(bCurso);
  box.querySelectorAll('[data-bc]').forEach(b => b.onclick = () => { bCurso = b.dataset.bc; renderBanco(); });
  box.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => { bArea = b.dataset.ba; renderBanco(); });
  box.querySelectorAll('[data-bv]').forEach(b => b.onclick = () => { bVer = b.dataset.bv; renderBanco(); });
  if ($('bnAdd')) $('bnAdd').onclick = () => {
    const t = $('bnT').value.trim(), c = $('bnC').value.trim().replace(/\.$/, ''); if (!t) return;
    const k = clave(c || norm(t).slice(0, 60));
    BANCO[bArea] = BANCO[bArea] || {}; BANCO[bArea][cursoKey(bCurso)] = BANCO[bArea][cursoKey(bCurso)] || {};
    (BANCO[bArea][cursoKey(bCurso)].saberes = BANCO[bArea][cursoKey(bCurso)].saberes || {})[k] = { c, t };
    guardar(ruta + '/saberes/' + k, { c, t }); renderBanco(); toast('Añadido al banco ✓', 'ok');
  };
  box.querySelectorAll('[data-bdel]').forEach(b => b.onclick = async () => {
    if (!await confirmar('Se quitará del banco para todas. Los programas que ya lo tienen no cambian.', '¿Quitar saber?', 'Quitar')) return;
    delete BANCO[bArea][cursoKey(bCurso)].saberes[b.dataset.bdel]; guardar(ruta + '/saberes/' + b.dataset.bdel, null); renderBanco();
  });
}

// ─── INFORMES ──────────────────────────────────────────────────────
let infTrim = trimestreDe(hoyIso());
function renderInformes() {
  const al = alumnosOrden(), cursos = cursosConAlumnos(), qs = quincenasOrden();
  const optAl = '<option value="*">Todo mi alumnado</option>' + al.map(a => '<option value="' + a.id + '">' + esc(a.siglas) + ' · ' + esc(a.curso) + '</option>').join('');
  const optCur = '<option value="*">Todos los cursos</option>' + cursos.map(c => '<option>' + c + '</option>').join('');
  const optTri = [1, 2, 3].map(n => '<option value="' + n + '"' + (n === infTrim ? ' selected' : '') + '>' + n + 'º trimestre</option>').join('');
  let h = '<div class="card"><div class="card-h"><div><div class="kicker">Documentos en Word, listos para imprimir</div><h2>📄 Centro de informes</h2></div></div>';
  if (!al.length) { $('sec-informes').innerHTML = h + '<div class="vacio">Añade alumnado para generar documentos.</div></div>'; return; }
  h += '<div class="inf-grid">'
    + '<div class="inf"><span class="n">DOC 1</span><h3>Control de programas de refuerzo</h3><p class="muted">Listado por curso con siglas, tipo de programa y observaciones.</p><select class="in" id="i1c">' + optCur + '</select><button class="btn btn-p" id="i1">⬇️ Descargar</button></div>'
    + '<div class="inf"><span class="n">DOC 2</span><h3>Propuesta curricular trimestral</h3><p class="muted">Por alumno/a y área: saberes, actividades, recursos y evaluación.</p><select class="in" id="i2a">' + optAl + '</select><select class="in" id="i2t">' + optTri + '</select><button class="btn btn-p" id="i2">⬇️ Descargar</button></div>'
    + '<div class="inf"><span class="n">DOC 3</span><h3>Cuadrante de programación quincenal</h3><p class="muted">Coordinación tutoría – refuerzo educativo.</p><select class="in" id="i3q">' + (qs.length ? qs.map(q => '<option value="' + q.id + '">' + esc(q.curso) + ' · del ' + fechaCorta(q.desde) + ' al ' + fechaCorta(masDias(q.desde, 11)) + '</option>').join('') : '<option value="">— Sin quincenas —</option>') + '</select><button class="btn btn-p" id="i3"' + (qs.length ? '' : ' disabled') + '>⬇️ Descargar</button></div>'
    + '<div class="inf"><span class="n">DOC 4</span><h3>Cuadrante de evaluación</h3><p class="muted">C / EP / NI por curso y trimestre, con observaciones.</p><select class="in" id="i4c">' + optCur + '</select><select class="in" id="i4t">' + optTri + '</select><button class="btn btn-p" id="i4">⬇️ Descargar</button></div>'
    + '<div class="inf"><span class="n">PROGRAMA</span><h3>Programa de refuerzo del alumno/a</h3><p class="muted">Resumen completo: criterios, saberes y otros aspectos.</p><select class="in" id="i5a">' + optAl + '</select><button class="btn btn-p" id="i5">⬇️ Descargar</button></div>'
    + '<div class="inf zip"><span class="n" style="background:var(--accent)">ZIP</span><h3>Todo el trimestre en un .zip</h3><p class="muted">DOC 1, DOC 2 de cada alumno/a, las quincenas del trimestre y DOC 4 de cada curso.</p><select class="in" id="izt">' + optTri + '</select><button class="btn btn-w" id="iz">📦 Descargar .zip</button></div>'
    + '</div></div>';
  $('sec-informes').innerHTML = h;
  $('i1').onclick = () => Docs.descargar('doc1', { curso: $('i1c').value });
  $('i2').onclick = () => Docs.descargar('doc2', { id: $('i2a').value, trim: +$('i2t').value });
  $('i3').onclick = () => $('i3q').value && Docs.descargar('doc3', { qid: $('i3q').value });
  $('i4').onclick = () => Docs.descargar('doc4', { curso: $('i4c').value, trim: +$('i4t').value });
  $('i5').onclick = () => Docs.descargar('programa', { id: $('i5a').value });
  $('iz').onclick = () => Docs.descargar('zip', { trim: +$('izt').value });
  ['i2t', 'i4t', 'izt'].forEach(x => $(x).addEventListener('change', e => infTrim = +e.target.value));
}

// ─── Novedades (una sola vez por dispositivo) ──────────────────────
function novedades() {
  const ID = '2026-10-27-sesion', K = 'novedades-refuerzo';
  try { if (localStorage.getItem(K) === ID) return; } catch (e) { return; }
  setTimeout(() => {
    abrirModal('<h2>✨ Bienvenida al Gestor de Refuerzo</h2><ul style="padding-left:20px;line-height:1.55">'
      + '<li><b>👥 Alumnado:</b> sube el programa de Séneca (Word o PDF) y la app saca sola los criterios, saberes y demás apartados. Solo se guardan las siglas.</li>'
      + '<li><b>📅 Hoy:</b> las sesiones del día con su alumnado. Un toque marca que alguien falta.</li>'
      + '<li><b>🗓️ Quincenal:</b> el cuadrante de coordinación con la tutoría, con los saberes del programa a mano.</li>'
      + '<li><b>✅ Evaluación:</b> C / EP / NI con un toque.</li>'
      + '<li><b>📄 Informes:</b> los 4 documentos en Word, y todo el trimestre en un .zip.</li>'
      + '<li><b>🔐 Novedad:</b> la sesión de Refuerzo ya no se mezcla con la del Gestor PT. Si te pide entrar otra vez, es solo esta vez.</li></ul>'
      + '<div class="modal-pie"><button class="btn btn-p" id="novOk">¡Entendido!</button></div>');
    $('novOk').onclick = () => { try { localStorage.setItem(K, ID); } catch (e) { } cerrarModal(); };
  }, 700);
}

// ─── Service worker ────────────────────────────────────────────────
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });

// API para documentos.js
window.App = {
  get D() { return D; }, AREAS, TIPOS, EVAL_ITEMS, NIVELES, OTROS, CURSOS, PERFILES,
  get PERFIL() { return PERFIL; }, get CURSO_AC() { return CURSO_AC; },
  alumnosOrden, alumnosDeCurso, cursosConAlumnos, quincenasOrden, sesionesDia, fechaDia, saberesDePrograma, areasDe,
  fechaCorta, fechaLarga, masDias, sinCole, cursoKey, nombreCursoAc, lista, textoSaber, toast, trimestreDe
};

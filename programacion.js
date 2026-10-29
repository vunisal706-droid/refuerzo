/* Programación de las sesiones de refuerzo y pestaña «Hoy».
   Los saberes de cada trimestre (los mismos del DOC 2) se reparten entre los días
   lectivos en que ese curso tiene refuerzo. Si un alumno falta, lo programado pasa
   a su siguiente sesión, como en el Gestor PT. */
'use strict';

const DIAS_SEM = { 1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves', 5: 'viernes' };
const AREA_DIA = { '': '—', LCL: 'Lengua', MAT: 'Matemáticas', AMB: 'Lengua y Mates' };

// ─── Calendario: trimestres y días con sesión ──────────────────────
function trimestresCurso() {
  const y = +CURSO_AC.slice(0, 4), y2 = y + 1;
  let ini = y + '-09-10', fin = y2 + '-06-22', nav = { desde: y + '-12-23', hasta: y2 + '-01-06' }, ss = null;
  try {
    const d = window.CalendarioCole && CalendarioCole.datos;
    const cs = d ? (Array.isArray(d.cursos) ? d.cursos : [d]) : [];
    const c = cs.find(x => x.inicio && +x.inicio.slice(0, 4) === y);
    if (c) {
      ini = c.inicio || ini; fin = c.fin || fin;
      const pn = (c.periodos || []).find(p => /navidad/i.test(p.nombre)); if (pn) nav = pn;
      const ps = (c.periodos || []).find(p => /santa/i.test(p.nombre)); if (ps) ss = ps;
    }
  } catch (e) { }
  if (!ss) ss = { desde: y2 + '-03-22', hasta: y2 + '-03-28' };
  return [
    { t: 1, desde: ini, hasta: masDias(nav.desde, -1) },
    { t: 2, desde: masDias(nav.hasta, 1), hasta: masDias(ss.desde, -1) },
    { t: 3, desde: masDias(ss.hasta, 1), hasta: fin }
  ];
}
function trimestreFecha(ds) {
  const t = trimestresCurso().find(x => ds >= x.desde && ds <= x.hasta);
  return t ? t.t : trimestreDe(ds);
}
const horarioCurso = c => ((D.config.horario || {})[cursoKey(c)]) || null;
function areasDelDia(c, ds) {
  const h = horarioCurso(c); if (!h) return [];
  const v = h[new Date(ds + 'T12:00').getDay()] || '';
  return v === 'AMB' ? ['LCL', 'MAT'] : (v ? [v] : []);
}
const _cacheFechas = new Map();
function fechasSesiones(c, area, T) {
  const h = horarioCurso(c); if (!h) return [];
  const k = CURSO_AC + '|' + c + '|' + area + '|' + T + '|' + JSON.stringify(h);
  if (_cacheFechas.has(k)) return _cacheFechas.get(k);
  const tr = trimestresCurso().find(x => x.t === +T), out = [];
  if (tr) for (let ds = tr.desde; ds <= tr.hasta; ds = masDias(ds, 1)) {
    if (sinCole(ds)) continue;
    if (areasDelDia(c, ds).includes(area)) out.push(ds);
  }
  _cacheFechas.set(k, out);
  return out;
}
if (window.CalendarioCole && CalendarioCole.listo) CalendarioCole.listo.then(() => { _cacheFechas.clear(); try { renderTodo(); } catch (e) { } });

// Saberes del trimestre repartidos entre las sesiones del alumno
function planAlumno(a, area, T) {
  const items = lista((((a.trimestral || {})['t' + T]) || {})[area] && a.trimestral['t' + T][area].saberes);
  const fechas = fechasSesiones(a.curso, area, T);
  const res = { porFecha: {}, pendientes: [], items, fechas };
  if (!fechas.length || !items.length) { res.pendientes = items.slice(); return res; }
  const n = fechas.length, k = items.length;
  const tam = items.map((_, i) => n >= k ? Math.floor(n / k) + (i < n % k ? 1 : 0) : 1);
  let i = 0, j = 0;
  const asist = a.asist || {};
  fechas.forEach(ds => {
    if (asist[ds]) { res.porFecha[ds] = { estado: asist[ds] }; return; }
    if (i >= k) { res.porFecha[ds] = { repaso: true }; return; }
    j++;
    res.porFecha[ds] = { saber: items[i], idx: i, ses: j, de: tam[i] };
    if (j >= tam[i]) { i++; j = 0; }
  });
  if (i < k) res.pendientes = items.slice(j > 0 ? i + 1 : i);
  return res;
}

// ─── Días de refuerzo de un curso ──────────────────────────────────
function configurarSesiones(c, despues) {
  const h = horarioCurso(c) || {};
  abrirModal('<h2>⚙️ Sesiones de refuerzo de ' + esc(c) + '</h2><p class="muted" style="margin-bottom:10px">¿Qué días tienes refuerzo con ' + esc(c) + ' y de qué área? Con esto la app reparte los saberes y sabe a quién ves cada día.</p>'
    + [1, 2, 3, 4, 5].map(d => '<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><b style="text-transform:capitalize;min-width:100px">' + DIAS_SEM[d] + '</b><div class="row">'
      + Object.entries(AREA_DIA).map(([v, n]) => '<button class="sel-chip' + ((h[d] || '') === v ? ' on' : '') + '" data-hd="' + d + '" data-hv="' + v + '">' + n + '</button>').join('') + '</div></div>').join('')
    + '<div class="modal-pie"><button class="btn btn-s" onclick="cerrarModal()">Cancelar</button><button class="btn btn-p" id="hdOk">💾 Guardar</button></div>');
  const sel = Object.assign({}, h);
  document.querySelectorAll('[data-hd]').forEach(b => b.onclick = () => {
    sel[b.dataset.hd] = b.dataset.hv;
    document.querySelectorAll('[data-hd="' + b.dataset.hd + '"]').forEach(x => x.classList.toggle('on', x === b));
  });
  $('hdOk').onclick = async () => {
    const limpio = {}; Object.entries(sel).forEach(([d, v]) => { if (v) limpio[d] = v; });
    if (!Object.keys(limpio).length) { toast('Marca al menos un día', 'err'); return; }
    D.config.horario = Object.assign({}, D.config.horario, { [cursoKey(c)]: limpio });
    _cacheFechas.clear();
    await guardar(BASE + '/config/horario/' + cursoKey(c), limpio);
    cerrarModal(); toast('Días guardados ✓', 'ok');
    if (despues) despues(); else renderTodo();
  };
}
const resumenHorario = c => {
  const h = horarioCurso(c); if (!h) return '';
  return Object.entries(h).sort().map(([d, v]) => DIAS_SEM[d] + ' (' + AREA_DIA[v] + ')').join(', ');
};

// ─── Reparto automático ────────────────────────────────────────────
function generarAuto(id) {
  const a = D.alumnos[id]; if (!a) return 0;
  const upd = {}; let hechos = 0;
  a.trimestral = a.trimestral || {};
  areasDe(a).forEach(area => {
    const items = saberesDePrograma(a, area).map(textoSaber);
    const ses = [1, 2, 3].map(T => fechasSesiones(a.curso, area, T).length);
    const total = ses.reduce((x, y) => x + y, 0);
    if (!items.length || !total) return;
    const conSes = [0, 1, 2].filter(i => ses[i] > 0);
    let trozos;
    if (items.length <= conSes.length) {
      trozos = [0, 1, 2].map(i => ses[i] ? items.slice() : []);
    } else {
      // Reparto proporcional a las sesiones de cada trimestre, al menos 1 por trimestre con sesiones
      const exact = ses.map(s => items.length * s / total);
      const cnt = exact.map((x, i) => ses[i] ? Math.max(1, Math.floor(x)) : 0);
      let resto = items.length - cnt.reduce((x, y) => x + y, 0);
      const orden = [0, 1, 2].filter(i => ses[i]).sort((p, q) => (exact[q] - Math.floor(exact[q])) - (exact[p] - Math.floor(exact[p])));
      for (let r = 0; resto > 0; r++) { cnt[orden[r % orden.length]]++; resto--; }
      while (resto < 0) { const i = [0, 1, 2].reduce((m, x) => cnt[x] > cnt[m] ? x : m, 0); cnt[i]--; resto++; }
      let p = 0; trozos = cnt.map(c => { const t = items.slice(p, p + c); p += c; return t; });
    }
    [1, 2, 3].forEach(T => {
      upd[BASE + '/alumnos/' + id + '/trimestral/t' + T + '/' + area + '/saberes'] = trozos[T - 1];
      a.trimestral['t' + T] = a.trimestral['t' + T] || {}; a.trimestral['t' + T][area] = a.trimestral['t' + T][area] || {};
      a.trimestral['t' + T][area].saberes = trozos[T - 1];
    });
    hechos++;
  });
  upd[BASE + '/alumnos/' + id + '/progModo'] = 'auto'; a.progModo = 'auto';
  actualizar(upd);
  return hechos;
}

// ─── Pestaña «Programación» de la ficha ────────────────────────────
let progTrim = null;
function fichaProgramacion(a) {
  const c = a.curso, h = horarioCurso(c);
  if (!progTrim) progTrim = trimestreFecha(hoyIso());
  let html = '';
  if (!h) {
    $('fCuerpo').innerHTML = '<div class="vacio">Para programar, dime primero <b>qué días tienes refuerzo con ' + esc(c) + '</b>.<br><br><button class="btn btn-p" id="pgHor">⚙️ Indicar los días de ' + esc(c) + '</button></div>';
    $('pgHor').onclick = () => configurarSesiones(c);
    return;
  }
  const modo = a.progModo || '';
  html += '<div class="aviso" style="background:#eef4ff;border-color:#c9d8f6;color:#1f3f7a">📅 Refuerzo de <b>' + esc(c) + '</b>: ' + esc(resumenHorario(c)) + ' <button class="btn btn-s btn-sm" id="pgHor" style="margin-left:6px">⚙️ Cambiar</button></div>'
    + '<div class="grid2" style="margin-bottom:12px">'
    + '<button class="opcion-grande" id="pgAuto" style="margin:0' + (modo === 'auto' ? ';border-color:var(--primary);background:var(--primary-soft)' : '') + '"><span class="e">⚡</span><span><b>Automática</b><br><span class="muted">Reparte todos los saberes del programa entre los tres trimestres y los días de refuerzo.</span></span></button>'
    + '<button class="opcion-grande" id="pgManual" style="margin:0' + (modo === 'manual' ? ';border-color:var(--primary);background:var(--primary-soft)' : '') + '"><span class="e">✋</span><span><b>Elijo yo los trimestres</b><br><span class="muted">Marcas en qué trimestre trabajas cada saber y la app los reparte por días.</span></span></button></div>';

  if (modo === 'manual') {
    areasDe(a).forEach(area => {
      const sabs = saberesDePrograma(a, area);
      html += '<div class="area-box ' + area + '"><h3>' + AREAS[area].icon + ' ' + esc(AREAS[area].nombre) + ' · ¿en qué trimestre?</h3>';
      if (!sabs.length) html += '<div class="vacio">El programa no tiene saberes en esta área.</div>';
      sabs.forEach(s => {
        const t = textoSaber(s);
        html += '<div class="crit row" style="justify-content:space-between;flex-wrap:nowrap;gap:10px"><span style="font-size:.9rem"><span class="cod">' + esc(s.c || '') + '</span> ' + esc(s.t) + '</span><span class="row" style="flex-wrap:nowrap">'
          + [1, 2, 3].map(T => { const on = lista((((a.trimestral || {})['t' + T]) || {})[area] && a.trimestral['t' + T][area].saberes).some(x => norm(x) === norm(t)); return '<button class="sel-chip' + (on ? ' on' : '') + '" data-mt="' + T + '" data-ma="' + area + '" data-ms="' + esc(t) + '">' + T + 'º</button>'; }).join('')
          + '</span></div>';
      });
      html += '</div>';
    });
  } else if (modo === 'auto') {
    html += '<div class="row" style="margin-bottom:10px"><span class="muted">Los saberes van en el orden del programa. Si cambias el programa o los días, vuelve a repartir.</span><button class="btn btn-s btn-sm" id="pgRegen">⚡ Volver a repartir</button></div>';
  }

  // Calendario de sesiones del trimestre
  html += '<div class="row" style="margin:14px 0 8px"><b>Sesiones del trimestre:</b>' + [1, 2, 3].map(T => '<button class="sel-chip' + (T === progTrim ? ' on' : '') + '" data-pt="' + T + '">' + T + 'º</button>').join('')
    + '<span class="muted">Toca ✓ para marcar una ausencia o un día sin cole.</span></div>';
  const hoy = hoyIso();
  areasDe(a).forEach(area => {
    const pl = planAlumno(a, area, progTrim);
    html += '<div class="area-box ' + area + '"><h3>' + AREAS[area].icon + ' ' + esc(AREAS[area].corto) + ' · ' + progTrim + 'º trimestre <span class="muted" style="font-weight:600">(' + pl.fechas.length + ' sesiones · ' + pl.items.length + ' saberes)</span></h3>';
    if (!pl.fechas.length) html += '<div class="vacio">' + esc(c) + ' no tiene sesiones de ' + AREAS[area].corto + ' este trimestre. Revísalo en ⚙️ Cambiar.</div>';
    else if (!pl.items.length) html += '<div class="vacio">No hay saberes asignados a este trimestre. Elige el modo de arriba.</div>';
    else {
      html += '<div class="prog-lista">';
      pl.fechas.forEach(ds => {
        const x = pl.porFecha[ds] || {};
        const est = x.estado || 'asiste';
        html += '<div class="prog-fila' + (ds === hoy ? ' hoy' : '') + (x.estado ? ' ' + x.estado : '') + (ds < hoy ? ' pasada' : '') + '">'
          + '<span class="pf-fecha">' + DIA[new Date(ds + 'T12:00').getDay()].slice(0, 3) + ' ' + fechaCorta(ds).slice(0, 5) + '</span>'
          + '<span class="pf-txt">' + (x.estado ? (x.estado === 'ausencia' ? '❌ Ausencia' : '🏫 Sin cole') + ' · pasa a la siguiente sesión'
            : x.repaso ? '<span class="muted">🔁 Repaso / refuerzo de lo trabajado</span>'
              : esc(x.saber) + (x.de > 1 ? ' <span class="muted">(' + x.ses + '/' + x.de + ')</span>' : '')) + '</span>'
          + '<button class="pf-est ' + est + '" data-pa="' + ds + '" title="Cambiar asistencia">' + ({ asiste: '✓', ausencia: '❌', sincole: '🏫' })[est] + '</button></div>';
      });
      html += '</div>';
      if (pl.pendientes.length) html += '<div class="aviso" style="margin-top:8px">⏳ No da tiempo en este trimestre a: ' + pl.pendientes.map(esc).join(' · ') + '</div>';
    }
    html += '</div>';
  });
  $('fCuerpo').innerHTML = html;

  $('pgHor').onclick = () => configurarSesiones(c);
  $('pgAuto').onclick = async () => {
    const tiene = [1, 2, 3].some(T => areasDe(a).some(ar => lista((((a.trimestral || {})['t' + T]) || {})[ar] && a.trimestral['t' + T][ar].saberes).length));
    if (tiene && a.progModo !== 'auto' && !await confirmar('Se sustituirán los saberes que ya había por trimestre (también los de la propuesta trimestral).', '¿Repartir automáticamente?', 'Repartir')) return;
    const n = generarAuto(fichaId);
    toast(n ? 'Programación hecha ✓' : 'El programa no tiene saberes o no hay sesiones', n ? 'ok' : 'err'); renderFicha();
  };
  $('pgManual').onclick = () => { a.progModo = 'manual'; guardar(BASE + '/alumnos/' + fichaId + '/progModo', 'manual'); renderFicha(); };
  if ($('pgRegen')) $('pgRegen').onclick = async () => {
    if (!await confirmar('Se vuelven a repartir todos los saberes del programa por trimestres.', '¿Volver a repartir?', 'Repartir')) return;
    generarAuto(fichaId); toast('Programación actualizada ✓', 'ok'); renderFicha();
  };
  document.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { progTrim = +b.dataset.pt; renderFicha(); });
  document.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => {
    const T = b.dataset.mt, area = b.dataset.ma, t = b.dataset.ms;
    const orden = saberesDePrograma(a, area).map(textoSaber);
    a.trimestral = a.trimestral || {}; a.trimestral['t' + T] = a.trimestral['t' + T] || {}; a.trimestral['t' + T][area] = a.trimestral['t' + T][area] || {};
    const set = new Set(lista(a.trimestral['t' + T][area].saberes).map(norm));
    if (set.has(norm(t))) set.delete(norm(t)); else set.add(norm(t));
    const extra = lista(a.trimestral['t' + T][area].saberes).filter(x => !orden.some(o => norm(o) === norm(x)) && set.has(norm(x)));
    const nuevo = orden.filter(x => set.has(norm(x))).concat(extra);
    a.trimestral['t' + T][area].saberes = nuevo;
    guardar(BASE + '/alumnos/' + fichaId + '/trimestral/t' + T + '/' + area + '/saberes', nuevo);
    renderFicha();
  });
  document.querySelectorAll('[data-pa]').forEach(b => b.onclick = () => { ciclarAsistencia(fichaId, b.dataset.pa); renderFicha(); });
}
function marcarAsistencia(id, ds, estado) {
  const a = D.alumnos[id]; if (!a) return;
  a.asist = a.asist || {};
  if (estado === 'asiste') delete a.asist[ds]; else a.asist[ds] = estado;
  guardar(BASE + '/alumnos/' + id + '/asist/' + ds, estado === 'asiste' ? null : estado);
}
function ciclarAsistencia(id, ds) {
  const act = ((D.alumnos[id] || {}).asist || {})[ds] || 'asiste';
  const sig = { asiste: 'ausencia', ausencia: 'sincole', sincole: 'asiste' }[act];
  marcarAsistencia(id, ds, sig);
  toast(D.alumnos[id].siglas + ': ' + ({ asiste: 'asiste ✓', ausencia: 'ausencia ✓', sincole: 'sin cole ✓' })[sig], 'ok');
}

// ─── HOY ───────────────────────────────────────────────────────────
let hoyFecha = null;
function renderHoy() {
  const hoy = hoyIso();
  let ds = hoyFecha || hoy, nota = '';
  if (!hoyFecha && sinCole(ds)) { const nc = sinCole(ds); nota = (nc.emoji || '🏠') + ' Hoy no hay cole (' + esc(nc.nombre) + '). Te enseño el próximo día de cole.'; ds = proxLectivo(ds, 1); }
  const nc = sinCole(ds);
  const titulo = ds === hoy ? 'Hoy' : ds === masDias(hoy, 1) ? 'Mañana' : ds === masDias(hoy, -1) ? 'Ayer' : 'Día de cole';
  let h = '<div class="card"><div class="hoy-cab"><div><div class="kicker">' + titulo + '</div><h2 class="hoy-fecha">' + fechaLarga(ds) + '</h2></div>'
    + '<div class="row"><button class="btn btn-s btn-sm" data-hn="-1" aria-label="Día de cole anterior">◀</button><button class="btn btn-s btn-sm" data-hn="0"' + (!hoyFecha ? ' disabled' : '') + '>Hoy</button><button class="btn btn-s btn-sm" data-hn="1" aria-label="Día de cole siguiente">▶</button>'
    + '<input type="date" class="in" id="hoyF" value="' + ds + '" style="width:auto"></div></div>';
  if (nota) h += '<div class="aviso">' + nota + '</div>';
  window._hoyDs = ds;
  const sinHorario = [];
  if (nc) {
    h += '<div class="vacio">' + (nc.emoji || '🏠') + ' <b>No hay cole</b> · ' + esc(nc.nombre) + '</div>';
  } else {
    const T = trimestreFecha(ds);
    let nSes = 0, nAus = 0, bloques = '';
    cursosConAlumnos().forEach(c => {
      if (!horarioCurso(c)) { sinHorario.push(c); return; }
      const areas = areasDelDia(c, ds); if (!areas.length) return;
      const alus = alumnosDeCurso(c).filter(a => areas.some(ar => a.areas && a.areas[ar]));
      if (!alus.length) return;
      const q = quincenaDeFecha(c, ds);
      let act = '';
      if (q) {
        const d = Math.round((new Date(ds + 'T12:00') - new Date(q.desde + 'T12:00')) / 864e5), di = String(d >= 7 ? d - 2 : d);
        act = sesionesDia(q, di).map(s => s.actividades).filter(Boolean).join('\n');
      }
      bloques += '<div class="hoy-curso"><div class="ses-cab"><span class="disp" style="font-size:1.2rem">' + esc(c) + '</span>'
        + areas.map(ar => '<span class="chip ' + ar + '">' + AREAS[ar].icon + ' ' + AREAS[ar].corto + '</span>').join('') + '</div>'
        + (act ? '<p class="muted" style="margin:0 0 8px"><b>📝 Actividades (quincenal):</b> ' + esc(act).replace(/\n/g, ' · ') + '</p>' : '')
        + '<div class="hoy-lista">';
      alus.forEach(a => {
        const est = (a.asist || {})[ds] || 'asiste';
        nSes++; if (est !== 'asiste') nAus++;
        bloques += '<div class="hoy-al ' + est + '"><div class="ses-cab"><button class="hoy-sig" data-ab="' + a.id + '">' + esc(a.siglas) + '</button><span class="tipo ' + ((TIPOS[a.tipo] || {}).corto || '') + '">' + esc(a.tipo || '') + '</span></div>';
        areas.filter(ar => a.areas && a.areas[ar]).forEach(ar => {
          const x = planAlumno(a, ar, T).porFecha[ds] || {};
          bloques += '<div class="hoy-saber ' + ar + '"><span class="chip ' + ar + '">' + AREAS[ar].icon + ' ' + AREAS[ar].corto + '</span> ';
          if (x.estado) bloques += '<span class="muted">Lo programado pasa a la siguiente sesión.</span>';
          else if (x.saber) bloques += '<b>' + esc(x.saber) + '</b>' + (x.de > 1 ? ' <span class="muted">· sesión ' + x.ses + ' de ' + x.de + '</span>' : '');
          else if (x.repaso) bloques += '<span class="muted">🔁 Repaso de lo trabajado en el trimestre.</span>';
          else bloques += '<span class="muted">Sin saberes programados. <a href="#" data-prog="' + a.id + '">Programar</a></span>';
          bloques += '</div>';
        });
        bloques += '<div class="row hoy-est">' + [['asiste', '✅ Asiste'], ['ausencia', '❌ Ausencia'], ['sincole', '🏫 Sin cole']]
          .map(([k, n]) => '<button class="asis ' + k + (est === k ? ' on' : '') + '" data-as="' + a.id + '|' + k + '">' + n + '</button>').join('') + '</div></div>';
      });
      bloques += '</div></div>';
    });
    if (!nSes) h += '<div class="vacio">🙌 Ningún alumno/a tiene refuerzo este día.</div>';
    else h += '<p class="muted" style="margin-bottom:10px"><b>' + nSes + '</b> ' + (nSes === 1 ? 'alumno/a' : 'alumnos/as') + (nAus ? ' · <b style="color:var(--ni)">' + nAus + '</b> sin asistir' : '') + '</p>' + bloques;
  }
  if (sinHorario.length) h += '<div class="aviso" style="margin-top:12px">Falta indicar qué días tienes refuerzo con: ' + sinHorario.map(c => '<button class="btn btn-s btn-sm" data-hor="' + c + '">⚙️ ' + c + '</button>').join(' ') + '</div>';
  h += '</div>';
  $('sec-hoy').innerHTML = h;
  const box = $('sec-hoy');
  box.querySelectorAll('[data-hn]').forEach(b => b.onclick = () => { const n = +b.dataset.hn; hoyFecha = n === 0 ? null : proxLectivo(window._hoyDs, n); renderHoy(); });
  $('hoyF').onchange = e => { if (e.target.value) { hoyFecha = e.target.value; renderHoy(); } };
  box.querySelectorAll('[data-as]').forEach(b => b.onclick = () => {
    const [id, k] = b.dataset.as.split('|');
    marcarAsistencia(id, window._hoyDs, k);
    toast(D.alumnos[id].siglas + ': ' + ({ asiste: 'asiste ✓', ausencia: 'ausencia ✓ · la programación se recoloca', sincole: 'sin cole ✓ · la programación se recoloca' })[k], 'ok');
    renderHoy();
  });
  box.querySelectorAll('[data-ab]').forEach(b => b.onclick = () => abrirFicha(b.dataset.ab, 'prog'));
  box.querySelectorAll('[data-prog]').forEach(x => x.onclick = e => { e.preventDefault(); abrirFicha(x.dataset.prog, 'prog'); });
  box.querySelectorAll('[data-hor]').forEach(b => b.onclick = () => configurarSesiones(b.dataset.hor));
}

// ─── Rellenar la quincena con la programación ──────────────────────
function rellenarQuincena(qid) {
  const q = D.quincenas[qid]; if (!q) return;
  if (!horarioCurso(q.curso)) { configurarSesiones(q.curso, () => rellenarQuincena(qid)); return; }
  const upd = {}; let n = 0;
  q.dias = q.dias || {};
  for (let d = 0; d < 10; d++) {
    const ds = fechaDia(q, d);
    if (sinCole(ds) || sesionesDia(q, String(d)).length) continue;
    const T = trimestreFecha(ds);
    areasDelDia(q.curso, ds).forEach((ar, i) => {
      const alus = alumnosDeCurso(q.curso).filter(a => a.areas && a.areas[ar]);
      if (!alus.length) return;
      const sabs = [];
      alus.forEach(a => { const x = planAlumno(a, ar, T).porFecha[ds]; if (x && x.saber && !sabs.includes(x.saber)) sabs.push(x.saber); });
      const sid = db.ref(BASE + '/quincenas/' + qid + '/dias/' + d).push().key;
      const s = { area: ar, saberes: sabs.map(t => '• ' + t).join('\n'), actividades: '', alumnos: Object.fromEntries(alus.map(a => [a.id, true])), orden: i };
      q.dias[d] = q.dias[d] || {}; q.dias[d][sid] = s;
      upd[BASE + '/quincenas/' + qid + '/dias/' + d + '/' + sid] = s; n++;
    });
  }
  if (!n) { toast('No hay días vacíos con sesión que rellenar', ''); return; }
  actualizar(upd); toast(n + ' sesiones rellenadas con la programación ✓', 'ok'); renderTodo();
}

/* Documentos Word del refuerzo (DOC 1–4 y programa). Usa docx.js, que se carga al primer uso. */
'use strict';
(function () {
  const AZUL = '4472C4', AZUL_CLARO = 'DAE3F3', AZUL_TXT = '2E74B5', GRIS = '7F7F7F', GRIS_CLARO = 'EEF2F8';
  let X = null, IMG = null;

  function cargar(src) {
    return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });
  }
  async function preparar() {
    if (!window.docx) await cargar('lib/docx.umd.js');
    X = window.docx;
    if (!IMG) {
      const get = async u => { try { const r = await fetch(u); return r.ok ? await r.arrayBuffer() : null; } catch (e) { return null; } };
      IMG = { junta: await get('img/junta.jpg'), cole: await get('img/colegio.png') };
    }
  }

  // ── Piezas ──────────────────────────────────────────────────
  const SIN = () => ({ top: { style: X.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: X.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: X.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: X.BorderStyle.NONE, size: 0, color: 'FFFFFF' } });
  const t = (text, o) => new X.TextRun(Object.assign({ text: String(text == null ? '' : text), font: 'Arial' }, o || {}));
  const p = (runs, o) => new X.Paragraph(Object.assign({ children: Array.isArray(runs) ? runs : [typeof runs === 'string' ? t(runs) : runs] }, o || {}));
  const vacio = (n) => p([t('')], { spacing: { after: n || 0 } });
  function lineas(texto, o) {
    const ls = String(texto || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!ls.length) return [p([t('', o)])];
    return ls.map(l => p([t(l, o)], { spacing: { after: 40 } }));
  }
  function celda(contenido, o) {
    o = o || {};
    const children = Array.isArray(contenido) ? contenido : lineas(contenido, o.run);
    const c = { children, verticalAlign: o.v || X.VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 90, right: 90 } };
    if (o.fill) c.shading = { fill: o.fill, type: X.ShadingType.CLEAR, color: 'auto' };
    if (o.w) c.width = { size: o.w, type: X.WidthType.DXA };
    if (o.span) c.columnSpan = o.span;
    if (o.rows) c.rowSpan = o.rows;
    if (o.borders) c.borders = o.borders;
    return new X.TableCell(c);
  }
  const cab = (txt, o) => celda([p([t(txt, { bold: true, color: 'FFFFFF', size: (o && o.size) || 18 })], { alignment: X.AlignmentType.CENTER })], Object.assign({ fill: AZUL, v: X.VerticalAlign.CENTER }, o || {}));
  function tabla(filas, anchos) {
    return new X.Table({ rows: filas, width: { size: anchos.reduce((a, b) => a + b, 0), type: X.WidthType.DXA }, columnWidths: anchos, layout: X.TableLayoutType.FIXED });
  }
  function cabecera(colegioDerecha) {
    const img = (data, w, h, type) => data ? new X.ImageRun({ data, type, transformation: { width: w, height: h } }) : t('');
    const fila = new X.TableRow({
      children: [
        celda([p([img(IMG.junta, 96, 48, 'jpg')])], { borders: SIN(), w: 3200, v: X.VerticalAlign.CENTER }),
        celda([p([img(IMG.cole, 74, 62, 'png')], { alignment: X.AlignmentType.CENTER })], { borders: SIN(), w: 3200, v: X.VerticalAlign.CENTER }),
        celda([p([t('C.E.I.P. CAPITULACIONES', { bold: true, size: 22 })], { alignment: X.AlignmentType.RIGHT }), p([t(colegioDerecha || 'SANTA FE', { bold: true, size: 18 })], { alignment: X.AlignmentType.RIGHT })], { borders: SIN(), w: 3200, v: X.VerticalAlign.CENTER })
      ]
    });
    return new X.Header({ children: [new X.Table({ rows: [fila], width: { size: 9600, type: X.WidthType.DXA }, columnWidths: [3200, 3200, 3200], borders: X.TableBorders.NONE }), vacio()] });
  }
  const titulo = (txt, color) => p([t(txt, { bold: true, size: 28, color: color || AZUL_TXT })], { alignment: X.AlignmentType.CENTER, spacing: { before: 120, after: 120 } });
  const subtitulo = txt => p([t(txt, { bold: true, size: 20 })], { alignment: X.AlignmentType.CENTER, spacing: { after: 160 } });
  const etiqueta = txt => p([t(txt, { bold: true, size: 20, color: AZUL_TXT })], { spacing: { before: 200, after: 80 } });
  function seccion(children) {
    return { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 900, left: 1100, right: 1100, header: 400 } } }, headers: { default: cabecera() }, children };
  }
  function documento(secciones) {
    return new X.Document({ creator: 'Gestor de Refuerzo · CEIP Capitulaciones', styles: { default: { document: { run: { font: 'Arial', size: 20 } } } }, sections: secciones });
  }
  const blob = doc => X.Packer.toBlob(doc);

  // ── DOC 1 · Control de programas ────────────────────────────
  function doc1(curso) {
    const cursos = curso === '*' ? App.cursosConAlumnos() : [curso];
    const hoy = App.fechaCorta(new Date().toISOString().slice(0, 10));
    return documento(cursos.map(c => {
      const al = App.alumnosDeCurso(c);
      const filas = [new X.TableRow({ tableHeader: true, children: [cab('ALUMNO/A (SIGLAS)', { fill: GRIS, size: 20 }), cab('TIPO DE PROGRAMA', { fill: GRIS, size: 20 }), cab('OBSERVACIONES', { fill: GRIS, size: 20 })] })];
      const n = Math.max(11, al.length);
      for (let i = 0; i < n; i++) {
        const a = al[i], fill = i % 2 ? undefined : GRIS_CLARO;
        filas.push(new X.TableRow({ height: { value: 520, rule: X.HeightRule.ATLEAST }, children: [
          celda(a ? a.siglas : '', { fill, run: { bold: true }, v: X.VerticalAlign.CENTER }),
          celda(a ? a.tipo : '', { fill, v: X.VerticalAlign.CENTER }),
          celda(a ? [a.observaciones, a.autorizacion ? '' : 'Autorización pendiente'].filter(Boolean).join('\n') : '', { fill, v: X.VerticalAlign.CENTER, run: { size: 18 } })
        ] }));
      }
      return seccion([
        titulo('CONTROL DE PROGRAMAS DE REFUERZO', '404040'),
        p([t('CURSO: ', { bold: true, size: 24, color: AZUL_TXT }), t(c + ' de Educación Primaria', { bold: true, size: 24 }), t('     Curso académico: ' + App.nombreCursoAc(App.CURSO_AC), { size: 20 })], { spacing: { after: 160 } }),
        tabla(filas, [3300, 2800, 3600]),
        p([t('TIPOS DE PROGRAMAS DE REFUERZO:', { bold: true, size: 18 })], { spacing: { before: 240, after: 80 } }),
        ...Object.entries(App.TIPOS).map(([k, v]) => p([t(k + ': ', { bold: true, size: 17 }), t('Programa de Refuerzo del Aprendizaje para ' + v.txt.charAt(0).toLowerCase() + v.txt.slice(1) + '.', { size: 17 })], { bullet: { level: 0 }, spacing: { after: 40 } })),
        p([t('Centro: ', { bold: true }), t('CEIP CAPITULACIONES DE SANTA FE'), t('          Fecha: ', { bold: true }), t(hoy)], { spacing: { before: 240 } })
      ]);
    }));
  }

  // ── DOC 2 · Propuesta trimestral ────────────────────────────
  function doc2(id, T) {
    const a = App.D.alumnos[id];
    const tri = ((a.trimestral || {})['t' + T]) || {};
    return documento(App.areasDe(a).map(k => {
      const d = tri[k] || {};
      const fila = (lab, val) => new X.TableRow({ height: { value: 2300, rule: X.HeightRule.ATLEAST }, children: [cab(lab, { w: 2000 }), celda(val, { w: 7700 })] });
      return seccion([
        titulo('PROPUESTA CURRICULAR TRIMESTRAL DE CADA ÁREA OBJETO DE REFUERZO'),
        p([t('Alumno/a: ', { bold: true }), t(a.siglas), t('    Curso: ', { bold: true }), t(a.curso + (a.unidad ? ' (' + a.unidad + ')' : '')), t('    Área: ', { bold: true }), t(App.AREAS[k].nombre)], { alignment: X.AlignmentType.CENTER }),
        p([t('Trimestre: ', { bold: true }), t(T + 'º'), t('    Curso académico: ', { bold: true }), t(App.nombreCursoAc(App.CURSO_AC)), t('    Programa: ', { bold: true }), t(a.tipo || '')], { alignment: X.AlignmentType.CENTER, spacing: { after: 200 } }),
        tabla([
          fila('SABERES BÁSICOS', App.lista(d.saberes).join('\n')),
          fila('TIPOS DE ACTIVIDADES Y TAREAS', d.actividades),
          fila('RECURSOS DIDÁCTICOS, AGRUPAMIENTOS, DISTRIBUCIÓN DE ESPACIOS Y TIEMPOS', d.recursos),
          fila('PROCEDIMIENTOS E INSTRUMENTOS DE EVALUACIÓN', d.evaluacion)
        ], [2000, 7700])
      ]);
    }));
  }

  // ── DOC 3 · Cuadrante quincenal ─────────────────────────────
  const NOMBRE_AREA = { LCL: 'Lengua', MAT: 'Matemáticas', AMB: 'Lengua y Matemáticas' };
  const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];
  function doc3(qid) {
    const q = App.D.quincenas[qid];
    const hasta = App.masDias(q.desde, 11);
    const info = (lab, val) => new X.TableRow({ children: [celda(lab, { w: 2600, run: { bold: true }, fill: GRIS_CLARO }), celda(val, { w: 7100 })] });
    const filas = [new X.TableRow({ tableHeader: true, children: ['Día', 'Área/Materia', 'Saberes/Objetivos', 'Actividades', 'Alumnado'].map(x => cab(x, { size: 17 })) })];
    let hayFaltas = false;
    for (let d = 0; d < 10; d++) {
      if (d === 0 || d === 5) filas.push(new X.TableRow({ children: [celda([p([t(d === 0 ? 'PRIMERA SEMANA' : 'SEGUNDA SEMANA', { bold: true, size: 17 })], { alignment: X.AlignmentType.CENTER })], { span: 5, fill: GRIS_CLARO })] }));
      const ds = App.fechaDia(q, d), nc = App.sinCole(ds), ses = App.sesionesDia(q, String(d));
      const diaCel = n => celda([p([t(DIAS[d % 5], { bold: true, size: 17 })], { alignment: X.AlignmentType.CENTER }), p([t(App.fechaCorta(ds).slice(0, 5), { size: 16 })], { alignment: X.AlignmentType.CENTER })], { fill: AZUL_CLARO, v: X.VerticalAlign.CENTER, rows: n > 1 ? n : undefined });
      if (nc) { filas.push(new X.TableRow({ height: { value: 600, rule: X.HeightRule.ATLEAST }, children: [diaCel(1), celda('No lectivo: ' + nc.nombre, { span: 4, run: { italics: true, color: '808080' }, v: X.VerticalAlign.CENTER })] })); continue; }
      if (!ses.length) { filas.push(new X.TableRow({ height: { value: 1100, rule: X.HeightRule.ATLEAST }, children: [diaCel(1), celda(''), celda(''), celda(''), celda('')] })); continue; }
      ses.map(x => App.sesionResuelta ? App.sesionResuelta(q, d, x) : x).forEach((s, i) => {
        const alus = Object.keys(s.alumnos || {}).filter(x => App.D.alumnos[x]).map(x => { const f = (s.faltas && s.faltas[x]) || ((App.D.alumnos[x].asist || {})[ds] === 'ausencia'); if (f) hayFaltas = true; return App.D.alumnos[x].siglas + (f ? ' (F)' : ''); });
        const cells = [celda(NOMBRE_AREA[s.area] || 'Lengua', { run: { size: 17 } }), celda(s.saberes, { run: { size: 17 } }), celda([s.actividades, s.nota ? 'Nota: ' + s.nota : ''].filter(Boolean).join('\n'), { run: { size: 17 } }), celda(alus.join('\n'), { run: { size: 17, bold: true } })];
        filas.push(new X.TableRow({ height: { value: 1000, rule: X.HeightRule.ATLEAST }, children: i === 0 ? [diaCel(ses.length)].concat(cells) : cells }));
      });
    }
    const co = q.coord || {};
    const coord = (lab, val, h) => new X.TableRow({ height: { value: h || 500, rule: X.HeightRule.ATLEAST }, children: [celda(lab, { w: 2600, run: { bold: true }, fill: GRIS_CLARO }), celda(val, { w: 7100 })] });
    return documento([seccion([
      titulo('CUADRANTE DE PROGRAMACIÓN QUINCENAL'),
      subtitulo('Coordinación Tutoría - Refuerzo Educativo'),
      tabla([info('Quincena del:', App.fechaCorta(q.desde) + ' al ' + App.fechaCorta(hasta)), info('Curso/nivel:', q.curso + ' de Educación Primaria'), info('Tutor/a:', q.tutor || ''), info('Profesor/a de refuerzo:', q.profesor || '')], [2600, 7100]),
      etiqueta('Programación Quincenal'),
      tabla(filas, [1200, 1400, 2800, 2800, 1500]),
      ...(hayFaltas ? [p([t('(F) = falta a la sesión.', { size: 16, italics: true })], { spacing: { before: 60 } })] : []),
      etiqueta('Coordinación y Seguimiento'),
      tabla([coord('Fecha de coordinación:', co.fecha ? App.fechaCorta(co.fecha) : ''), coord('Acuerdos tomados:', co.acuerdos, 1400), coord('Observaciones y seguimiento:', co.observaciones, 1400)], [2600, 7100]),
      vacio(200),
      tabla([new X.TableRow({ height: { value: 1300, rule: X.HeightRule.ATLEAST }, children: [celda([p([t('Fdo. Tutor/a', { bold: true })])], { w: 4850 }), celda([p([t('Fdo. Profesor/a de refuerzo', { bold: true })])], { w: 4850 })] })], [4850, 4850])
    ])]);
  }

  // ── DOC 4 · Evaluación ──────────────────────────────────────
  function doc4(curso, T) {
    const cursos = curso === '*' ? App.cursosConAlumnos() : [curso];
    const W = [1240].concat(Array(10).fill(846));
    return documento(cursos.map(c => {
      const al = App.alumnosDeCurso(c);
      const filas = [
        new X.TableRow({ tableHeader: true, children: [cab('ALUMNO/A', { rows: 2, size: 16 }), cab('LENGUA CASTELLANA', { span: 5, size: 17 }), cab('MATEMÁTICAS', { span: 5, size: 17 })] }),
        new X.TableRow({ tableHeader: true, children: App.EVAL_ITEMS.map(i => celda([p([t(i.t, { bold: true, size: 14 })], { alignment: X.AlignmentType.CENTER })], { fill: 'BDD7EE', v: X.VerticalAlign.CENTER })) })
      ];
      const n = Math.max(10, al.length);
      for (let i = 0; i < n; i++) {
        const a = al[i], ev = a ? (((a.eval || {})['t' + T]) || {}) : {};
        filas.push(new X.TableRow({ height: { value: 480, rule: X.HeightRule.ATLEAST }, children: [celda(a ? a.siglas : '', { run: { bold: true }, v: X.VerticalAlign.CENTER })]
          .concat(App.EVAL_ITEMS.map(it => celda([p([t(ev[it.k] || '', { bold: true, color: { C: '1F7A45', EP: 'A86B00', NI: 'B42F2F' }[ev[it.k]] || '000000' })], { alignment: X.AlignmentType.CENTER })], { v: X.VerticalAlign.CENTER }))) }));
      }
      const obs = App.D.evalObs[App.cursoKey(c) + '_t' + T] || '';
      return seccion([
        titulo('CUADRANTE DE EVALUACIÓN - REFUERZO EDUCATIVO', '000000'),
        p([t('Curso: ', { bold: true }), t(c), t('     Trimestre: ', { bold: true }), t(T + 'º'), t('     Año Académico: ', { bold: true }), t(App.nombreCursoAc(App.CURSO_AC))], { alignment: X.AlignmentType.CENTER, spacing: { after: 160 } }),
        tabla(filas, W),
        p([t('SISTEMA DE EVALUACIÓN:', { bold: true, size: 18 })], { spacing: { before: 200, after: 60 } }),
        ...Object.entries({ C: 'Conseguido - Alcanza los objetivos del refuerzo', EP: 'En Proceso - Está progresando, requiere más tiempo', NI: 'No Iniciado - Requiere apoyo constante' })
          .map(([k, v]) => p([t(k + '   ', { bold: true, size: 18 }), t(v, { size: 18 })], { spacing: { after: 30 } })),
        p([t('OBSERVACIONES:', { bold: true, size: 18 })], { spacing: { before: 200, after: 60 } }),
        tabla([new X.TableRow({ height: { value: 1600, rule: X.HeightRule.ATLEAST }, children: [celda(obs, { w: 9700 })] })], [9700])
      ]);
    }));
  }

  // ── Programa del alumno ─────────────────────────────────────
  function docPrograma(id) {
    const a = App.D.alumnos[id];
    const dato = (l, v) => new X.TableRow({ children: [celda(l, { w: 3000, run: { bold: true }, fill: GRIS_CLARO }), celda(v || '', { w: 6700 })] });
    const ch = [
      titulo('PROGRAMA DE REFUERZO DEL APRENDIZAJE'),
      tabla([
        dato('Alumno/a (siglas)', a.siglas), dato('Curso y unidad', a.curso + (a.unidad ? ' · ' + a.unidad : '')), dato('Tutor/a', a.tutor),
        dato('Tipo de programa', (a.tipo || '') + ' · ' + ((App.TIPOS[a.tipo] || {}).txt || '')), dato('Año académico', App.nombreCursoAc(App.CURSO_AC)),
        dato('Información a la familia', a.fechaFamilia ? App.fechaCorta(a.fechaFamilia) : ''), dato('Autorización', a.autorizacion ? 'Firmada' : 'Pendiente'),
        dato('Profesorado de refuerzo', App.PERFILES[App.PERFIL] ? App.PERFILES[App.PERFIL].nombre : '')
      ], [3000, 6700])
    ];
    App.areasDe(a).forEach(k => {
      const pr = (a.programa || {})[k]; if (!pr) return;
      ch.push(p([t(App.AREAS[k].nombre.toUpperCase(), { bold: true, size: 24, color: 'FFFFFF' })], { shading: { fill: AZUL, type: X.ShadingType.CLEAR, color: 'auto' }, spacing: { before: 300, after: 120 } }));
      if (App.lista(pr.competencias).length) {
        ch.push(etiqueta('Competencias específicas'));
        App.lista(pr.competencias).forEach(c => ch.push(p([t(c.c + '. ', { bold: true, size: 18 }), t(c.t, { size: 18 })], { spacing: { after: 60 } })));
      }
      ch.push(etiqueta('Criterios de evaluación y saberes básicos'));
      App.lista(pr.criterios).forEach(c => {
        ch.push(p([t((c.c ? c.c + '. ' : ''), { bold: true, size: 18, color: AZUL_TXT }), t(c.t, { bold: true, size: 18 })], { spacing: { before: 100, after: 40 } }));
        App.lista(c.saberes).forEach(s => ch.push(p([t((s.c ? s.c + '. ' : ''), { bold: true, size: 17 }), t(s.t, { size: 17 })], { bullet: { level: 0 }, spacing: { after: 30 } })));
      });
      if (App.lista(pr.sueltos).length) {
        ch.push(p([t('Otros saberes básicos', { bold: true, size: 18 })], { spacing: { before: 100, after: 40 } }));
        App.lista(pr.sueltos).forEach(s => ch.push(p([t((s.c ? s.c + '. ' : ''), { bold: true, size: 17 }), t(s.t, { size: 17 })], { bullet: { level: 0 }, spacing: { after: 30 } })));
      }
      const ot = pr.otros || {};
      const filas = App.OTROS.filter(([ok]) => App.lista(ot[ok]).length).map(([ok, lab]) => new X.TableRow({ children: [celda(lab, { w: 3000, run: { bold: true, size: 18 }, fill: AZUL_CLARO }), celda(App.lista(ot[ok]).join('\n'), { w: 6700, run: { size: 18 } })] }));
      if (filas.length) { ch.push(etiqueta('Propuesta de otros aspectos a trabajar en el programa')); ch.push(tabla(filas, [3000, 6700])); }
    });
    return documento([seccion(ch)]);
  }

  // ── Descargas ───────────────────────────────────────────────
  function bajar(b, nombre) {
    const u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  const limpio = s => String(s || '').replace(/º/g, 'o').replace(/[^\w.-]+/g, '_');
  const nomDoc2 = (a, T) => 'DOC2_Propuesta_T' + T + '_' + limpio(a.siglas) + '_' + limpio(a.curso) + '.docx';
  const nomDoc3 = q => 'DOC3_Quincenal_' + limpio(q.curso) + '_' + q.desde + '.docx';

  async function descargar(tipo, o) {
    try {
      App.toast('⏳ Preparando el documento…');
      await preparar();
      const cur = limpio(App.CURSO_AC);
      if (tipo === 'doc1') return bajar(await blob(doc1(o.curso)), 'DOC1_Control_programas_' + (o.curso === '*' ? 'todos' : limpio(o.curso)) + '_' + cur + '.docx'), App.toast('Descargado ✓', 'ok');
      if (tipo === 'doc3') return bajar(await blob(doc3(o.qid)), nomDoc3(App.D.quincenas[o.qid])), App.toast('Descargado ✓', 'ok');
      if (tipo === 'doc4') return bajar(await blob(doc4(o.curso, o.trim)), 'DOC4_Evaluacion_T' + o.trim + '_' + (o.curso === '*' ? 'todos' : limpio(o.curso)) + '_' + cur + '.docx'), App.toast('Descargado ✓', 'ok');
      if ((tipo === 'doc2' || tipo === 'programa') && o.id !== '*') {
        const a = App.D.alumnos[o.id];
        if (!App.areasDe(a).length) return App.toast('Ese alumno/a no tiene áreas marcadas', 'err');
        const b = await blob(tipo === 'doc2' ? doc2(o.id, o.trim) : docPrograma(o.id));
        bajar(b, tipo === 'doc2' ? nomDoc2(a, o.trim) : 'Programa_' + limpio(a.siglas) + '_' + limpio(a.curso) + '.docx');
        return App.toast('Descargado ✓', 'ok');
      }
      // Varios archivos → un .zip
      const zip = new JSZip();
      const als = App.alumnosOrden().filter(a => App.areasDe(a).length);
      if (tipo === 'doc2') { for (const a of als) zip.file(nomDoc2(a, o.trim), await blob(doc2(a.id, o.trim))); return bajar(await zip.generateAsync({ type: 'blob' }), 'DOC2_Propuestas_T' + o.trim + '_' + cur + '.zip'), App.toast('Descargado ✓', 'ok'); }
      if (tipo === 'programa') { for (const a of als) zip.file('Programa_' + limpio(a.siglas) + '_' + limpio(a.curso) + '.docx', await blob(docPrograma(a.id))); return bajar(await zip.generateAsync({ type: 'blob' }), 'Programas_refuerzo_' + cur + '.zip'), App.toast('Descargado ✓', 'ok'); }
      if (tipo === 'zip') {
        const T = o.trim, meses = { 1: [9, 10, 11, 12], 2: [1, 2, 3], 3: [4, 5, 6, 7, 8] }[T];
        if (App.cursosConAlumnos().length) {
          zip.file('DOC1_Control_programas_' + cur + '.docx', await blob(doc1('*')));
          zip.file('DOC4_Evaluacion_T' + T + '_' + cur + '.docx', await blob(doc4('*', T)));
        }
        for (const a of als) zip.file('DOC2_Propuestas_T' + T + '/' + nomDoc2(a, T), await blob(doc2(a.id, T)));
        for (const q of App.quincenasOrden().filter(q => meses.includes(+q.desde.slice(5, 7)))) zip.file('DOC3_Quincenas_T' + T + '/' + nomDoc3(q), await blob(doc3(q.id)));
        bajar(await zip.generateAsync({ type: 'blob' }), 'Refuerzo_T' + T + '_' + cur + '.zip');
        return App.toast('Descargado ✓', 'ok');
      }
    } catch (e) { console.error(e); App.toast('No se pudo generar: ' + (e.message || e), 'err'); }
  }

  window.Docs = { descargar, _doc: { doc1, doc2, doc3, doc4, docPrograma, preparar } };
})();

/* Lector del «Programa de Refuerzo del Aprendizaje» que genera Séneca.
   Acepta el Word (.docx) o el PDF y devuelve los datos del programa.
   El nombre del alumno NUNCA se guarda: solo se usa para calcular las siglas. */
(function (global) {
  'use strict';

  const AREAS_NOMBRE = [
    [/lengua castellana/i, 'LCL'],
    [/matem/i, 'MAT'],
    [/ingl[eé]s|lengua extranjera/i, 'ING'],
    [/conocimiento del medio/i, 'CMN']
  ];
  const OTROS = [
    [/^formas de acceso a la informaci[oó]n/i, 'acceso'],
    [/^tipos de actividades y tareas/i, 'actividades'],
    [/^recursos did[aá]cticos/i, 'recursos'],
    [/^agrupamientos, distribuci[oó]n de espacios y tiempos/i, 'agrupamientos'],
    [/^instrumentos de evaluaci[oó]n/i, 'instrumentos']
  ];
  const RUIDO = [
    /^ref\.?\s*doc\.?:?/i, /^detprorefapr/i, /^fecha generaci[oó]n/i, /^c[oó]d\.?\s*centro/i,
    /^\d{6,10}$/, /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/, /^p[aá]g\.?:?\s*\d/i, /^consejer[ií]a de/i,
    /^\[\]/, /^[\d\/:.\s]+$/, /^junta de andaluc/i, /^3\.\s*propuesta curricular/i, /^nombre$/i,
    /^[áa]rea\/materia\/[áa]mbito$/i
  ];
  const CODIGO = /^([A-Z]{2,4}(?:\.(?:\d{1,2}|[A-Z]))+)\.\s*(.*)$/;

  const limpia = s => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const esRuido = l => RUIDO.some(r => r.test(l));

  function areaDeNombre(n) {
    for (const [r, k] of AREAS_NOMBRE) if (r.test(n)) return k;
    return null;
  }

  // «García López, Ana María» → «AMGL»
  function siglasDe(nombre) {
    nombre = limpia(nombre);
    if (!nombre) return '';
    let ape = nombre, nom = '';
    if (nombre.includes(',')) { [ape, nom] = nombre.split(',').map(limpia); }
    const ini = s => s.split(/[\s-]+/).filter(p => p && !/^(de|del|la|las|los|y|da|do|dos)$/i.test(p))
      .map(p => p[0].toUpperCase()).join('');
    return (nom ? ini(nom) : '') + ini(ape);
  }

  function parse(lineas) {
    const r = {
      siglas: '', curso: '', unidad: '', tutor: '', tipo: '', fechaInicio: '', fechaFamilia: '',
      anio: '', areas: {}, avisos: []
    };
    let area = null, sec = null, otrosKey = null, ultimo = null;

    const getArea = k => (r.areas[k] = r.areas[k] || {
      nombre: '', competencias: [], criterios: [],
      otros: { acceso: [], actividades: [], recursos: [], agrupamientos: [], instrumentos: [] }
    });

    for (let raw of lineas) {
      let l = limpia(raw);
      if (!l || esRuido(l)) continue;

      // ── Cabecera ───────────────────────────────────────────
      let m;
      if ((m = /FECHA DE (?:INICIO DE VIGENCIA|ELABORACI[ÓO]N):\s*(\d{2}\/\d{2}\/\d{2,4})/i.exec(l)) && !r.fechaInicio) r.fechaInicio = m[1];
      if ((m = /Apellidos y nombre:\s*(.*?)\s*(?:Sexo:|$)/i.exec(l))) { r.siglas = siglasDe(m[1]); continue; }
      if (/^Fecha de nacimiento/i.test(l)) continue;                     // no se guarda
      if ((m = /A[ñn]o acad[ée]mico:\s*(\d{4}\/\d{4})/i.exec(l))) { r.anio = m[1]; continue; }
      if ((m = /^Curso:\s*(\d)\s*º?.*?(?:Unidad:\s*(.*?))?\s*(?:N\.I\.E\.?:.*)?$/i.exec(l))) {
        r.curso = m[1] + 'º'; if (m[2]) r.unidad = limpia(m[2]); continue;
      }
      if ((m = /^Unidad:\s*(.*)$/i.exec(l)) && !r.unidad) { r.unidad = limpia(m[1].replace(/N\.I\.E.*$/i, '')); continue; }
      if ((m = /^Tutor\/Tutora:\s*(.*)$/i.exec(l)) && !r.tutor) { r.tutor = limpia(m[1]); continue; }
      if (/^Situaci[óo]n del alumno/i.test(l)) {
        if (/no promociona/i.test(l)) r.tipo = 'PRA-NP';
        else if (/no supera|no super[oó]/i.test(l)) r.tipo = 'PRA-NSA';
        else r.tipo = 'PRA-DA';
        continue;
      }
      if ((m = /Fecha de comunicaci[óo]n:\s*(\d{2}\/\d{2}\/\d{2,4})/i.exec(l))) { r.fechaFamilia = m[1]; sec = null; continue; }
      if (/^(Informaci[óo]n y colaboraci[óo]n con la familia|DOCUMENTOS ADJUNTOS|Documentos adjuntos|De conformidad con lo establecido)/i.test(l)) { sec = 'fin'; continue; }
      if (sec === 'fin') continue;

      // ── Bloques por área ──────────────────────────────────
      if ((m = /[ÁA]rea\/Materia\/[ÁA]mbito:\s*(.*?)\s*(?:Curso:\s*(\d)\s*º.*)?$/i.exec(l))) {
        const k = areaDeNombre(m[1]);
        if (k) { area = getArea(k); area.nombre = area.nombre || limpia(m[1]); }
        if (m[2] && !r.curso) r.curso = m[2] + 'º';
        // Tras un salto de página Séneca repite la cabecera: seguimos en la misma sección
        if (sec === 'otros') sec = null;
        continue;
      }
      if (/^Competencias espec[ií]ficas:?$/i.test(l)) { sec = 'comp'; ultimo = null; continue; }
      if (/^Criterios? de evaluaci[óo]n:?$/i.test(l)) { sec = 'crit'; ultimo = null; continue; }
      if (/^Saberes b[áa]sicos:?$/i.test(l)) { sec = 'sab'; ultimo = null; continue; }
      if (/^Propuesta de otros aspectos/i.test(l)) { sec = 'otros'; otrosKey = null; continue; }

      if (sec === 'otros' && area) {
        let tocado = false;
        for (const [rx, k] of OTROS) {
          const mm = rx.exec(l);
          if (mm) { otrosKey = k; l = limpia(l.slice(mm[0].length)); tocado = true; break; }
        }
        if (!l) continue;
        if (otrosKey) {
          const lista = area.otros[otrosKey];
          // Las líneas que siguen sin punto final suelen ser continuación de la anterior
          if (!tocado && lista.length && !/[.:;!?¿]\s*$/.test(lista[lista.length - 1]) && /^[a-záéíóúñ]/.test(l)) lista[lista.length - 1] += ' ' + l;
          else lista.push(l);
        }
        continue;
      }

      if (!area) continue;
      const cm = CODIGO.exec(l);
      if (cm) {
        const item = { c: cm[1], t: limpia(cm[2]) };
        if (sec === 'comp') { area.competencias.push(item); ultimo = item; }
        else if (sec === 'crit') { item.saberes = []; area.criterios.push(item); ultimo = item; }
        else if (sec === 'sab') {
          let cr = area.criterios[area.criterios.length - 1];
          if (!cr) { cr = { c: '', t: '(sin criterio)', saberes: [] }; area.criterios.push(cr); }
          cr.saberes.push(item); ultimo = item;
        }
        continue;
      }
      // Continuación del texto anterior (Séneca parte las líneas largas)
      if (ultimo && (sec === 'comp' || sec === 'crit' || sec === 'sab')) ultimo.t = limpia(ultimo.t + ' ' + l);
    }

    // Arreglos de texto típicos de Séneca («L a utilidad», «procesos d e»)
    const arregla = t => t.replace(/(?<![A-Za-zÁÉÍÓÚÑáéíóúñü])([A-Za-z]) ([a-záéíóúñ]{1,2})(?![A-Za-zÁÉÍÓÚÑáéíóúñü])(?= )/g, (s, a, b) => /^(a|e|o|y|u)$/i.test(a) ? s : a + b);
    for (const k in r.areas) {
      const a = r.areas[k];
      a.criterios.forEach(c => { c.t = arregla(c.t); c.saberes.forEach(s => s.t = arregla(s.t)); });
      a.competencias.forEach(c => c.t = arregla(c.t));
      for (const o in a.otros) a.otros[o] = [...new Set(a.otros[o].map(limpia).filter(Boolean))];
    }
    if (!Object.keys(r.areas).length) r.avisos.push('No he encontrado ningún área en el documento.');
    if (!r.siglas) r.avisos.push('El documento no trae el nombre del alumno: escribe las siglas a mano.');
    if (!r.tipo) r.tipo = 'PRA-DA';
    return r;
  }

  // ── Extraer líneas de un .docx ────────────────────────────
  async function lineasDocx(buf) {
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const ps = doc.getElementsByTagNameNS(W, 'p');
    const out = [];
    for (const p of ps) {
      let s = '';
      const walk = n => {
        for (const ch of n.childNodes) {
          if (ch.nodeType !== 1) continue;
          if (ch.localName === 't') s += ch.textContent;
          else if (ch.localName === 'tab') s += ' ';
          else if (ch.localName === 'br' || ch.localName === 'cr') s += '\n';
          else if (ch.localName !== 'p') walk(ch);
        }
      };
      walk(p);
      s.split('\n').forEach(x => out.push(x));
    }
    return out;
  }

  // ── Extraer líneas de un PDF ──────────────────────────────
  async function lineasPdf(buf) {
    const pdfjs = global.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const out = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const filas = [];
      tc.items.forEach(it => {
        if (!it.str || !it.str.trim()) return;
        const x = it.transform[4], y = it.transform[5];
        let f = filas.find(f => Math.abs(f.y - y) < 3);
        if (!f) { f = { y, items: [] }; filas.push(f); }
        f.items.push({ x, s: it.str, w: it.width || 0 });
      });
      filas.sort((a, b) => b.y - a.y);
      filas.forEach(f => {
        f.items.sort((a, b) => a.x - b.x);
        // Columnas muy separadas (etiqueta | valor de una tabla) → líneas distintas
        let linea = '', fin = null;
        f.items.forEach(it => {
          if (fin !== null && it.x - fin > 40) { out.push(linea); linea = ''; }
          linea += (linea && fin !== null && it.x - fin > 1 ? ' ' : '') + it.s;
          fin = it.x + it.w;
        });
        if (linea) out.push(linea);
      });
    }
    return out;
  }

  async function leerArchivo(file) {
    const buf = await file.arrayBuffer();
    const nombre = (file.name || '').toLowerCase();
    let lineas;
    if (nombre.endsWith('.pdf')) {
      if (!global.pdfjsLib) await cargarScript('lib/pdf.min.js');
      lineas = await lineasPdf(buf);
    } else if (nombre.endsWith('.docx')) {
      lineas = await lineasDocx(buf);
    } else throw new Error('Formato no admitido. Sube el Word (.docx) o el PDF de Séneca.');
    return parse(lineas);
  }

  function cargarScript(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  global.Seneca = { parse, leerArchivo, lineasDocx, siglasDe, areaDeNombre };
  if (typeof module !== 'undefined') module.exports = global.Seneca;
})(typeof window !== 'undefined' ? window : globalThis);

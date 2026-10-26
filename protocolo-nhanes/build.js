// Construye el protocolo en .docx con el formato de la UPC a partir de cuerpo.md
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, WidthType, BorderStyle, ShadingType,
  PageBreak, Footer, PageNumber, TableOfContents, VerticalAlign,
} = require('docx');

const DIR = __dirname;
const OUT = process.argv[2] || path.join(DIR, 'protocolo.docx');
const FONT = 'Times New Roman';
const TEXT_WIDTH = 11906 - 1701 - 1418; // A4 menos márgenes izquierdo y derecho (DXA)
const DOUBLE = { line: 480 };

// **negrita** dentro de un texto
function runs(text, opts = {}) {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(part =>
    part.startsWith('**')
      ? new TextRun({ text: part.slice(2, -2), bold: true, ...opts })
      : new TextRun({ text: part, ...opts }));
}

function para(text, extra = {}, after = 160) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { ...DOUBLE, after },
    children: runs(text),
    ...extra,
  });
}

function heading(level, text) {
  const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  return new Paragraph({ heading: map[level], children: [new TextRun(level === 1 ? text.toUpperCase() : text)] });
}

function table(rows) {
  const cells = rows.map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  const ncol = cells[0].length;
  // Ancho de cada columna proporcional al largo promedio de su texto
  const weights = Array.from({ length: ncol }, (_, j) => {
    const avg = cells.reduce((s, r) => s + (r[j] || '').length, 0) / cells.length;
    return Math.min(Math.max(avg, j === 0 ? 20 : 11), 70);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map(w => Math.round((w / total) * TEXT_WIDTH));
  widths[ncol - 1] += TEXT_WIDTH - widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: cells.map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: r.map((c, j) => new TableCell({
        width: { size: widths[j], type: WidthType.DXA },
        borders,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        shading: i === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E7E6E6' } : undefined,
        children: [new Paragraph({
          alignment: c === 'X' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { line: 240 },
          children: runs(c, { size: 20, bold: i === 0 ? true : undefined }),
        })],
      })),
    })),
  });
}

function parse(md) {
  const lines = md.split('\n');
  const out = [];
  let listInstance = 0;
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3}) (.*)$/))) {
      const level = m[1].length;
      // Las secciones principales y los anexos empiezan en página nueva solo si son anexos/referencias
      if (level === 1 && /^(Referencias|Anexo)/.test(m[2])) out.push(new Paragraph({ children: [new PageBreak()] }));
      out.push(heading(level, m[2]));
      i++;
    } else if (line.startsWith('```')) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      code.forEach(c => out.push(new Paragraph({
        spacing: { line: 240, before: 0, after: 0 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' },
        children: [new TextRun({ text: c || ' ', font: 'Courier New', size: 17 })],
      })));
      out.push(para(''));
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*-{3}/.test(lines[i])) rows.push(lines[i]);
        i++;
      }
      out.push(table(rows));
      out.push(para(''));
    } else if (/^- /.test(line)) {
      while (i < lines.length && /^- /.test(lines[i])) {
        out.push(para(lines[i].slice(2), { numbering: { reference: 'vinetas', level: 0 } }, 0));
        i++;
      }
    } else if (/^\d+\. /.test(line)) {
      listInstance++;
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        out.push(para(lines[i].replace(/^\d+\. /, ''), {
          alignment: AlignmentType.LEFT,
          numbering: { reference: 'numeros', level: 0, instance: listInstance },
        }, 0));
        i++;
      }
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. |```)/.test(lines[i])) buf.push(lines[i++]);
      out.push(para(buf.join(' ')));
    }
  }
  return out;
}

// ── Portada ───────────────────────────────────────────────────────────────
const center = (text, bold = false, after = 0) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { ...DOUBLE, after },
  children: runs(text, { bold: bold || undefined }),
});
const portada = [
  new Paragraph({ spacing: { before: 1200 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    children: [new ImageRun({
      type: 'png',
      data: fs.readFileSync(path.join(DIR, 'logo_upc.png')),
      transformation: { width: 130, height: 130 },
    })],
  }),
  center('UNIVERSIDAD PERUANA DE CIENCIAS APLICADAS', true, 120),
  center('FACULTAD DE CIENCIAS DE LA SALUD', true, 120),
  center('PROGRAMA ACADÉMICO DE MEDICINA', true, 240),
  center('Alto riesgo de apnea obstructiva del sueño según una versión adaptada del cuestionario STOP-BANG y síntomas depresivos en adultos: análisis secundario de la Encuesta Nacional de Salud y Nutrición (NHANES) 2017–marzo 2020', false, 240),
  center('PROTOCOLO DE INVESTIGACIÓN', true, 0),
  center('Para optar el título profesional de Médico Cirujano', false, 240),
  center('AUTOR(ES)', true),
  center('Cartagena Vela, Christian Gianfranco (identificador ORCID)'),
  center('Paz Orihuela, Gabriel Adrián (identificador ORCID)', false, 240),
  center('ASESOR(ES)', true),
  center('[Nombre del asesor]', false, 240),
  center('Lima, [mes] de 2026', true),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: 'Tabla de contenidos', bold: true })],
  }),
  new TableOfContents('Tabla de contenidos', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
];

const cuerpo = parse(fs.readFileSync(path.join(DIR, 'cuerpo.md'), 'utf8'));

const headingStyle = (id, name, level, size, italics = false) => ({
  id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true,
  run: { font: FONT, size, bold: true, italics },
  paragraph: { spacing: { before: 240, after: 0, line: 480 }, keepNext: true, outlineLevel: level },
});

const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      headingStyle('Heading1', 'Heading 1', 0, 24),
      headingStyle('Heading2', 'Heading 2', 1, 24),
      headingStyle('Heading3', 'Heading 3', 2, 24, true),
    ],
  },
  numbering: {
    config: [
      { reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numeros', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      titlePage: true,
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1418, bottom: 1418, left: 1701, right: 1418 },
      },
    },
    footers: {
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT] })] })],
      }),
    },
    children: [...portada, ...cuerpo],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('escrito', OUT);
});

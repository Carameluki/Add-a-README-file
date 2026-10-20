/**
 * Ficha de recolección de datos – Tesis UPC
 * "Asociación entre el alto riesgo de AOS según STOP-BANG y desenlaces adversos
 *  en pacientes adultos críticos en la UCI de la Clínica San Felipe, Lima"
 *
 * Uso: en script.google.com pegue este archivo, seleccione `crearFormulario` y pulse Ejecutar.
 * Crea (1) el Google Form, (2) la hoja de cálculo vinculada con las respuestas,
 * (3) una hoja "Variables" con las variables derivadas listas para STATA y
 * (4) una hoja "Diccionario" con la codificación de cada variable.
 */

// Títulos de las preguntas. La hoja "Variables" localiza las columnas por estos títulos,
// así que si cambia un título aquí, cambia en ambos lugares.
const T = {
  codigo: 'Código del ingreso',
  digitador: 'Digitador',
  fechaIngreso: 'Fecha de ingreso a UCI',
  incluido: '¿Cumple TODOS los criterios de inclusión y ninguno de exclusión?',
  edad: 'Edad (años cumplidos al ingreso a UCI)',
  sexo: 'Sexo',
  peso: 'Peso (kg)',
  talla: 'Talla (cm)',
  cuello: 'Circunferencia de cuello (cm)',
  reingreso: '¿Es un reingreso a UCI del mismo paciente durante el periodo de estudio?',
  stopbang: 'Cuestionario STOP-BANG',
  sbHc: 'Puntaje STOP-BANG total consignado en la historia clínica (0–8)',
  hta: 'Hipertensión arterial',
  comorb: 'Comorbilidades al ingreso',
  comorbOtra: 'Otra comorbilidad relevante (especifique)',
  motivo: 'Motivo de ingreso a UCI',
  motivoOtro: 'Especifique el motivo de ingreso (solo si eligió "Otros")',
  apache: 'APACHE II al ingreso',
  sofa: 'SOFA al ingreso',
  sato2: 'Saturación de O2 al ingreso (%)',
  pao2: 'PaO2 al ingreso (mmHg)',
  fio2: 'FiO2 al momento de la gasometría (%)',
  vm: '¿Recibió ventilación mecánica invasiva durante la estancia en UCI?',
  diasVm: 'Duración de la ventilación mecánica (días)',
  fechaEgreso: 'Fecha de egreso de UCI',
  estado28: 'Estado vital a los 28 días del ingreso a UCI',
  fuente28: 'Fuente de confirmación del estado vital',
  fechaMuerte: 'Fecha de fallecimiento',
  eventos: 'Eventos cardiocerebrovasculares adversos durante la estancia en UCI',
  obs: 'Observaciones',
  motivoExcl: 'Motivo de exclusión',
};

// [etiqueta de la fila, nombre de variable]
const SB_ROWS = [
  ['S – Ronquido fuerte (Snoring)', 'sb_s'],
  ['T – Cansancio o somnolencia diurna (Tired)', 'sb_t'],
  ['O – Apneas observadas durante el sueño (Observed)', 'sb_o'],
  ['P – Hipertensión arterial (Pressure)', 'sb_p'],
  ['B – IMC > 35 kg/m² (BMI)', 'sb_b'],
  ['A – Edad > 50 años (Age)', 'sb_a'],
  ['N – Circunferencia de cuello ≥ 40 cm (Neck)', 'sb_n'],
  ['G – Sexo masculino (Gender)', 'sb_g'],
];

const COMORB_ROWS = [
  ['Insuficiencia cardíaca', 'com_ic'],
  ['ACV previo', 'com_acv'],
  ['Enfermedad coronaria', 'com_coronaria'],
  ['Diabetes mellitus', 'com_dm'],
  ['TIA (accidente isquémico transitorio)', 'com_tia'],
];

const EVENT_ROWS = [
  ['Hipertensión resistente', 'ev_hta_resist'],
  ['Arritmias', 'ev_arritmia'],
  ['Infarto agudo de miocardio', 'ev_iam'],
  ['Insuficiencia cardíaca', 'ev_ic'],
  ['ACV', 'ev_acv'],
];

const SI_NO = ['Sí', 'No'];
const SI_NO_NR = ['Sí', 'No', 'No registrado'];

function crearFormulario() {
  const form = FormApp.create('Ficha de recolección de datos – AOS (STOP-BANG) y desenlaces en UCI');
  form
    .setDescription(
      'Tesis: Asociación entre el alto riesgo de Apnea Obstructiva del Sueño según el cuestionario ' +
      'STOP-BANG y desenlaces adversos en pacientes adultos críticos en la UCI de la Clínica San Felipe, Lima (2023–2025).\n\n' +
      'Un formulario por cada INGRESO a UCI. Fuente: historia clínica electrónica y registros de la UCI.\n' +
      'CONFIDENCIALIDAD: NO registre nombres, DNI, número de historia clínica ni otros datos identificables. ' +
      'Use únicamente el código asignado al ingreso.\n' +
      'Doble digitación: cada ingreso debe ser registrado de forma independiente por ambos investigadores.')
    .setProgressBar(true)
    .setAllowResponseEdits(true)
    .setConfirmationMessage('Registro guardado. Para el siguiente ingreso use "Enviar otra respuesta".');

  // ── Sección 1: Identificación y elegibilidad ───────────────────────────────
  form.addTextItem()
    .setTitle(T.codigo)
    .setHelpText('Formato SF-0001 (código alfanumérico único por ingreso; no use el N.º de historia clínica).')
    .setValidation(FormApp.createTextValidation()
      .requireTextMatchesPattern('^SF-[0-9]{4}$')
      .setHelpText('Use el formato SF-0001.')
      .build())
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(T.digitador)
    .setChoiceValues(['Investigador 1 – Cartagena Vela', 'Investigador 2 – Paz Orihuela'])
    .setRequired(true);
  form.addDateItem().setTitle(T.fechaIngreso).setRequired(true);
  const incluido = form.addMultipleChoiceItem()
    .setTitle(T.incluido)
    .setHelpText(
      'Inclusión: edad ≥ 18 años al ingreso; ingreso a UCI entre 2023 y 2025; historia clínica completa; ' +
      'STOP-BANG registrado al ingreso o en las primeras 24–48 h.\n' +
      'Exclusión: historia clínica incompleta o datos insuficientes para calcular el STOP-BANG.')
    .setRequired(true);

  // ── Sección 2: Datos sociodemográficos y antropométricos ───────────────────
  const pDemo = form.addPageBreakItem().setTitle('Datos sociodemográficos y antropométricos');
  numero(form, T.edad, 18, 110, '', true);
  form.addMultipleChoiceItem().setTitle(T.sexo).setChoiceValues(['Masculino', 'Femenino']).setRequired(true);
  numero(form, T.peso, 20, 300, 'Primeras 24 h de ingreso. Use punto decimal (ej. 72.5).', true);
  numero(form, T.talla, 100, 230, 'En centímetros (ej. 168). El IMC se calcula automáticamente en la hoja "Variables".', true);
  numero(form, T.cuello, 20, 80, 'Dejar en blanco si no está registrado en la HC.', false);
  form.addMultipleChoiceItem().setTitle(T.reingreso).setChoiceValues(SI_NO).setRequired(true);

  // ── Sección 3: STOP-BANG ───────────────────────────────────────────────────
  form.addPageBreakItem()
    .setTitle('Cuestionario STOP-BANG (exposición)')
    .setHelpText('Aplicado al ingreso o en las primeras 24–48 h. El puntaje (0–8) y la categoría de riesgo ' +
      '(alto ≥ 3, bajo < 3) se calculan automáticamente en la hoja "Variables".');
  form.addGridItem()
    .setTitle(T.stopbang)
    .setRows(SB_ROWS.map(r => r[0]))
    .setColumns(SI_NO)
    .setRequired(true);
  numero(form, T.sbHc, 0, 8, 'Opcional: para verificar contra el puntaje calculado.', false);

  // ── Sección 4: Comorbilidades y características del ingreso ────────────────
  form.addPageBreakItem().setTitle('Comorbilidades y características del ingreso');
  form.addMultipleChoiceItem()
    .setTitle(T.hta)
    .setHelpText('Diagnóstico previo documentado o tratamiento antihipertensivo.')
    .setChoiceValues(SI_NO)
    .setRequired(true);
  form.addGridItem()
    .setTitle(T.comorb)
    .setRows(COMORB_ROWS.map(r => r[0]))
    .setColumns(SI_NO_NR)
    .setRequired(true);
  form.addTextItem().setTitle(T.comorbOtra);
  form.addMultipleChoiceItem()
    .setTitle(T.motivo)
    .setHelpText('Según el diagnóstico principal de ingreso.')
    .setChoiceValues(['Respiratorio', 'Séptico', 'Neurológico', 'Postoperatorio', 'Otros'])
    .setRequired(true);
  form.addTextItem().setTitle(T.motivoOtro);
  numero(form, T.apache, 0, 71, 'Severidad del ingreso. Dejar en blanco si no está registrado.', false);
  numero(form, T.sofa, 0, 24, 'Severidad del ingreso. Dejar en blanco si no está registrado.', false);

  // ── Sección 5: Oxigenación inicial ─────────────────────────────────────────
  form.addPageBreakItem()
    .setTitle('Oxigenación inicial')
    .setHelpText('Valores al ingreso a UCI. La relación PaO2/FiO2 se calcula automáticamente.');
  numero(form, T.sato2, 0, 100, '', false);
  numero(form, T.pao2, 10, 700, '', false);
  numero(form, T.fio2, 21, 100, 'En porcentaje: aire ambiental = 21.', false);

  // ── Sección 6: Ventilación mecánica ────────────────────────────────────────
  form.addPageBreakItem().setTitle('Desenlace: ventilación mecánica');
  const vm = form.addMultipleChoiceItem().setTitle(T.vm).setRequired(true);

  const pVmDias = form.addPageBreakItem().setTitle('Duración de la ventilación mecánica');
  numero(form, T.diasVm, 0, 365,
    'Desde la intubación inicial hasta la extubación definitiva. VM prolongada (≥ 7 días) se calcula automáticamente.', true);

  // ── Sección 7: Estancia y mortalidad ───────────────────────────────────────
  const pEstancia = form.addPageBreakItem().setTitle('Desenlaces: estancia en UCI y mortalidad a 28 días');
  form.addDateItem()
    .setTitle(T.fechaEgreso)
    .setHelpText('Alta de UCI o fecha de fallecimiento en UCI. Estancia prolongada (≥ 14 días) se calcula automáticamente.')
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(T.estado28)
    .setChoiceValues(['Vivo', 'Fallecido', 'Perdido en el seguimiento'])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle(T.fuente28)
    .setHelpText('Si el estado vital no está consignado explícitamente, cualquier atención registrada después del día 28 ' +
      'confirma que el paciente estaba vivo; sin registros posteriores = perdido en el seguimiento.')
    .setChoiceValues(['Registro explícito en HC', 'Atención médica registrada después del día 28', 'Sin registros posteriores'])
    .setRequired(true);
  form.addDateItem().setTitle(T.fechaMuerte).setHelpText('Solo si falleció.');

  // ── Sección 8: Eventos cardiocerebrovasculares ─────────────────────────────
  form.addPageBreakItem().setTitle('Eventos cardiocerebrovasculares adversos');
  form.addGridItem()
    .setTitle(T.eventos)
    .setRows(EVENT_ROWS.map(r => r[0]))
    .setColumns(SI_NO)
    .setRequired(true);
  form.addParagraphTextItem().setTitle(T.obs);

  // ── Sección de exclusión (solo si no cumple criterios) ─────────────────────
  const pExcl = form.addPageBreakItem()
    .setTitle('Registro excluido')
    .setGoToPage(FormApp.PageNavigationType.SUBMIT); // quien termina la sección 8 envía, no entra aquí
  form.addCheckboxItem()
    .setTitle(T.motivoExcl)
    .setChoiceValues([
      'Edad < 18 años',
      'Ingreso fuera del periodo 2023–2025',
      'Historia clínica incompleta',
      'Sin STOP-BANG registrado o datos insuficientes para calcularlo',
    ])
    .setRequired(true);

  // Ramificaciones
  incluido.setChoices([incluido.createChoice('Sí', pDemo), incluido.createChoice('No', pExcl)]);
  vm.setChoices([vm.createChoice('Sí', pVmDias), vm.createChoice('No', pEstancia)]);

  // ── Hoja de cálculo vinculada ──────────────────────────────────────────────
  const ss = SpreadsheetApp.create('Base de datos – Tesis AOS STOP-BANG UCI');
  ss.setSpreadsheetLocale('en_US'); // punto decimal, compatible con STATA
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  PropertiesService.getScriptProperties().setProperties({ FORM_ID: form.getId(), SS_ID: ss.getId() });

  try {
    crearHojaVariables();
  } catch (e) {
    Logger.log('No se pudo crear la hoja "Variables" todavía (%s). Ejecute crearHojaVariables() en un minuto.', e.message);
  }

  Logger.log('Formulario (para llenar): %s', form.getPublishedUrl());
  Logger.log('Formulario (para editar): %s', form.getEditUrl());
  Logger.log('Base de datos (Sheets):   %s', ss.getUrl());
}

/**
 * Crea/rehace las hojas "Variables" (derivadas y codificadas 1/0) y "Diccionario".
 * Puede ejecutarse de nuevo en cualquier momento; no toca las respuestas.
 */
function crearHojaVariables() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SS_ID'));
  const resp = hojaRespuestas_(ss);
  const headers = resp.getRange(1, 1, 1, resp.getLastColumn()).getValues()[0];

  const R = title => {
    const i = headers.indexOf(title);
    if (i < 0) throw new Error('No se encontró la columna "' + title + '" en la hoja de respuestas.');
    const L = letra_(i + 1);
    return `'${resp.getName()}'!${L}2:${L}`;
  };
  const G = (title, row) => R(`${title} [${row}]`);
  const base = R(T.codigo);
  const siNo = r => `IF(${r}="Sí",1,IF(${r}="No",0,""))`;
  const vacio = (...rs) => '(' + rs.map(r => `(${r}="")`).join('+') + ')';

  // [variable, descripción, fórmula]. V(nombre) referencia otra columna de esta misma hoja.
  const VARS = [];
  const V = name => {
    const i = VARS.findIndex(v => v[0] === name);
    const L = letra_(i + 1);
    return `${L}2:${L}`;
  };
  const add = (name, desc, expr) => VARS.push([name, desc, expr]);

  add('codigo', 'Código único del ingreso', () => base);
  add('digitador', 'Investigador que digitó el registro', () => R(T.digitador));
  add('n_digitaciones', 'N.º de veces que se registró el código (2 = doble digitación completa)', () => `COUNTIF(${base},${base})`);
  add('fecha_ingreso_uci', 'Fecha de ingreso a UCI', () => R(T.fechaIngreso));
  add('incluido', '1 = cumple criterios, 0 = excluido', () => siNo(R(T.incluido)));
  add('motivo_exclusion', 'Motivo(s) de exclusión', () => R(T.motivoExcl));
  add('edad', 'Edad en años', () => R(T.edad));
  add('sexo_masc', '1 = masculino, 0 = femenino', () => `IF(${R(T.sexo)}="Masculino",1,IF(${R(T.sexo)}="Femenino",0,""))`);
  add('peso_kg', 'Peso (kg)', () => R(T.peso));
  add('talla_cm', 'Talla (cm)', () => R(T.talla));
  add('imc', 'IMC = peso / talla(m)² (kg/m²)', () =>
    `IF(${vacio(R(T.peso), R(T.talla))},"",ROUND(${R(T.peso)}/(${R(T.talla)}/100)^2,1))`);
  add('imc_cat', 'Categoría OMS del IMC', () => {
    const x = V('imc');
    return `IF(${x}="","",IF(${x}<18.5,"Bajo peso",IF(${x}<25,"Normal",IF(${x}<30,"Sobrepeso",` +
      `IF(${x}<35,"Obesidad I",IF(${x}<40,"Obesidad II","Obesidad III"))))))`;
  });
  add('cuello_cm', 'Circunferencia de cuello (cm)', () => R(T.cuello));
  add('reingreso', '1 = reingreso del mismo paciente', () => siNo(R(T.reingreso)));
  SB_ROWS.forEach(([row, name]) => add(name, 'STOP-BANG ítem: ' + row + ' (1 = sí)', () => siNo(G(T.stopbang, row))));
  add('sb_puntaje', 'Puntaje STOP-BANG calculado (0–8)', () => {
    const items = SB_ROWS.map(([row]) => `(${G(T.stopbang, row)}="Sí")`).join('+');
    return `IF(${G(T.stopbang, SB_ROWS[0][0])}="","",${items})`;
  });
  add('sb_alto', 'EXPOSICIÓN: 1 = alto riesgo de AOS (STOP-BANG ≥ 3), 0 = bajo (< 3)', () =>
    `IF(${V('sb_puntaje')}="","",IF(${V('sb_puntaje')}>=3,1,0))`);
  add('sb_puntaje_hc', 'Puntaje STOP-BANG consignado en la HC', () => R(T.sbHc));
  add('sb_discordante', '1 = puntaje calculado ≠ puntaje de la HC (revisar)', () =>
    `IF(${vacio(R(T.sbHc), V('sb_puntaje'))},"",IF(${R(T.sbHc)}<>${V('sb_puntaje')},1,0))`);
  add('hta', 'Hipertensión arterial (1 = sí)', () => siNo(R(T.hta)));
  COMORB_ROWS.forEach(([row, name]) => add(name, 'Comorbilidad: ' + row + ' (1 = sí; vacío = no registrado)', () => siNo(G(T.comorb, row))));
  add('com_otra', 'Otra comorbilidad (texto)', () => R(T.comorbOtra));
  add('motivo_ingreso', 'Respiratorio / Séptico / Neurológico / Postoperatorio / Otros', () => R(T.motivo));
  add('motivo_otro', 'Motivo de ingreso si "Otros" (texto)', () => R(T.motivoOtro));
  add('apache2', 'APACHE II al ingreso', () => R(T.apache));
  add('sofa', 'SOFA al ingreso', () => R(T.sofa));
  add('sato2', 'SatO2 al ingreso (%)', () => R(T.sato2));
  add('pao2', 'PaO2 al ingreso (mmHg)', () => R(T.pao2));
  add('fio2', 'FiO2 (%)', () => R(T.fio2));
  add('pafi', 'Relación PaO2/FiO2', () => `IF(${vacio(R(T.pao2), R(T.fio2))},"",ROUND(${R(T.pao2)}/(${R(T.fio2)}/100),0))`);
  add('sato2_menor90', '1 = SatO2 < 90%', () => `IF(${R(T.sato2)}="","",IF(${R(T.sato2)}<90,1,0))`);
  add('pao2_menor80', '1 = PaO2 < 80 mmHg', () => `IF(${R(T.pao2)}="","",IF(${R(T.pao2)}<80,1,0))`);
  add('pafi_menor380', '1 = PaO2/FiO2 < 380', () => `IF(${V('pafi')}="","",IF(${V('pafi')}<380,1,0))`);
  add('vm', 'Recibió ventilación mecánica invasiva (1 = sí)', () => siNo(R(T.vm)));
  add('dias_vm', 'Días de ventilación mecánica', () => R(T.diasVm));
  add('vm_prolongada', 'DESENLACE: 1 = VM ≥ 7 días', () =>
    `IF(${R(T.vm)}="Sí",IF(${R(T.diasVm)}="","",IF(${R(T.diasVm)}>=7,1,0)),IF(${R(T.vm)}="No",0,""))`);
  add('fecha_egreso_uci', 'Fecha de egreso de UCI', () => R(T.fechaEgreso));
  add('dias_uci', 'Días de estancia en UCI (egreso − ingreso)', () =>
    `IF(${vacio(R(T.fechaIngreso), R(T.fechaEgreso))},"",${R(T.fechaEgreso)}-${R(T.fechaIngreso)})`);
  add('estancia_prolongada', 'DESENLACE: 1 = estancia en UCI ≥ 14 días', () =>
    `IF(${V('dias_uci')}="","",IF(${V('dias_uci')}>=14,1,0))`);
  add('estado_28d', 'Vivo / Fallecido / Perdido en el seguimiento', () => R(T.estado28));
  add('mortalidad_28d', 'DESENLACE PRIMARIO: 1 = fallecido a los 28 días, 0 = vivo, vacío = perdido', () =>
    `IF(${R(T.estado28)}="Fallecido",1,IF(${R(T.estado28)}="Vivo",0,""))`);
  add('perdido_seg', '1 = perdido en el seguimiento', () =>
    `IF(${R(T.estado28)}="","",IF(${R(T.estado28)}="Perdido en el seguimiento",1,0))`);
  add('fuente_estado', 'Fuente de confirmación del estado vital', () => R(T.fuente28));
  add('fecha_fallecimiento', 'Fecha de fallecimiento', () => R(T.fechaMuerte));
  EVENT_ROWS.forEach(([row, name]) => add(name, 'Evento CCV: ' + row + ' (1 = sí)', () => siNo(G(T.eventos, row))));
  add('ev_ccv_cualquiera', '1 = al menos un evento cardiocerebrovascular', () => {
    const items = EVENT_ROWS.map(([row]) => `(${G(T.eventos, row)}="Sí")`).join('+');
    return `IF(${G(T.eventos, EVENT_ROWS[0][0])}="","",IF(${items}>0,1,0))`;
  });
  add('observaciones', 'Observaciones', () => R(T.obs));

  // Hoja Variables
  let sh = ss.getSheetByName('Variables');
  if (sh) sh.clear(); else sh = ss.insertSheet('Variables');
  sh.getRange(1, 1, 1, VARS.length).setValues([VARS.map(v => v[0])]).setFontWeight('bold');
  sh.getRange(2, 1, 1, VARS.length).setFormulas([VARS.map(v => `=ARRAYFORMULA(IF(LEN(${base})=0,"",${v[2]()}))`)]);
  ['fecha_ingreso_uci', 'fecha_egreso_uci', 'fecha_fallecimiento'].forEach(n =>
    sh.getRange(V(n)).setNumberFormat('yyyy-mm-dd'));
  sh.getRange(V('dias_uci')).setNumberFormat('0');
  sh.setFrozenRows(1);

  // Hoja Diccionario
  let dic = ss.getSheetByName('Diccionario');
  if (dic) dic.clear(); else dic = ss.insertSheet('Diccionario');
  dic.getRange(1, 1, 1, 2).setValues([['variable', 'descripción / codificación']]).setFontWeight('bold');
  dic.getRange(2, 1, VARS.length, 2).setValues(VARS.map(v => [v[0], v[1]]));
  dic.autoResizeColumns(1, 2);
  dic.setFrozenRows(1);

  // Elimina la hoja vacía que trae por defecto la hoja de cálculo nueva
  ss.getSheets()
    .filter(s => !s.getFormUrl() && !['Variables', 'Diccionario'].includes(s.getName()) && s.getLastRow() === 0)
    .forEach(s => ss.deleteSheet(s));
}

function hojaRespuestas_(ss) {
  for (let i = 0; i < 10; i++) {
    SpreadsheetApp.flush();
    const s = SpreadsheetApp.openById(ss.getId()).getSheets().find(sh => sh.getFormUrl());
    if (s && s.getLastColumn() > 1) return s;
    Utilities.sleep(2000);
  }
  throw new Error('la hoja de respuestas aún no tiene encabezados');
}

function numero(form, title, min, max, help, required) {
  return form.addTextItem()
    .setTitle(title)
    .setHelpText(help)
    .setValidation(FormApp.createTextValidation()
      .requireNumberBetween(min, max)
      .setHelpText(`Ingrese un número entre ${min} y ${max} (use punto decimal).`)
      .build())
    .setRequired(required);
}

function letra_(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

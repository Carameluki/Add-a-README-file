# Ficha de recolección de datos – Tesis AOS / STOP-BANG en UCI

Script de Google Apps Script que crea automáticamente el **Google Form** de recolección de datos
y su **base de datos en Google Sheets** para la tesis *"Asociación entre el alto riesgo de AOS según el
cuestionario STOP-BANG y desenlaces adversos en pacientes adultos críticos en la UCI de la Clínica San Felipe, Lima"*.

## Cómo crearlo (5 minutos)

1. Entra a <https://script.google.com> con tu cuenta de Google y pulsa **Nuevo proyecto**.
2. Borra el contenido de `Código.gs` y pega todo el contenido de [`crear_formulario.gs`](crear_formulario.gs).
3. Guarda (💾). En el menú desplegable de funciones elige **`crearFormulario`** y pulsa **Ejecutar**.
4. Autoriza los permisos (Google mostrará "app no verificada" porque es tu propio script:
   *Configuración avanzada → Ir a proyecto (no seguro) → Permitir*).
5. Abre **Ver → Registro de ejecución**: ahí aparecen los 3 enlaces (formulario para llenar,
   formulario para editar y la hoja de cálculo). Todo queda también en tu Google Drive.

Si el registro dice que la hoja "Variables" no se pudo crear todavía, espera un minuto y ejecuta `crearHojaVariables`.

## Estructura del formulario

| Sección | Contenido |
|---|---|
| 1. Identificación y elegibilidad | Código (SF-0001), digitador, fecha de ingreso a UCI, criterios de inclusión/exclusión → si **No** cumple, salta a "Registro excluido" |
| 2. Sociodemográficos | Edad, sexo, peso, talla, circunferencia de cuello, reingreso |
| 3. STOP-BANG | 8 ítems Sí/No (S, T, O, P, B, A, N, G) + puntaje consignado en la HC (opcional, para verificar) |
| 4. Comorbilidades e ingreso | HTA, IC, ACV previo, enfermedad coronaria, DM, TIA, motivo de ingreso, APACHE II, SOFA |
| 5. Oxigenación inicial | SatO2, PaO2, FiO2 |
| 6. Ventilación mecánica | ¿VM invasiva? → si **Sí**, días de VM |
| 7. Estancia y mortalidad | Fecha de egreso de UCI, estado vital a 28 días, fuente de confirmación, fecha de fallecimiento |
| 8. Eventos CCV | Hipertensión resistente, arritmias, IAM, insuficiencia cardíaca, ACV |

Los campos numéricos tienen validación de rango (p. ej. edad 18–110, FiO2 21–100) para reducir errores de digitación.
No se piden nombres, DNI ni número de historia clínica, en línea con los aspectos éticos del protocolo.

## La base de datos (Google Sheets)

- **Respuestas del formulario**: los datos tal como se ingresan.
- **Variables**: se calcula sola con cada respuesta nueva y queda codificada para STATA:
  `imc`, `imc_cat` (OMS), `sb_puntaje` (0–8), `sb_alto` (≥ 3 = 1), `pafi`, `vm_prolongada` (≥ 7 días),
  `dias_uci`, `estancia_prolongada` (≥ 14 días), `mortalidad_28d`, `ev_ccv_cualquiera`, comorbilidades en 1/0, etc.
  También marca `sb_discordante` si el puntaje calculado no coincide con el de la HC y
  `n_digitaciones` (= 2 cuando ambos investigadores ya registraron ese código, según la doble digitación del protocolo).
- **Diccionario**: nombre y codificación de cada variable.

Para pasar a STATA: *Archivo → Descargar → Microsoft Excel (.xlsx)* y en STATA
`import excel "archivo.xlsx", sheet("Variables") firstrow clear`.

> Usa **punto decimal** (72.5, no 72,5). La hoja está configurada en formato en_US para que STATA lea bien los números.

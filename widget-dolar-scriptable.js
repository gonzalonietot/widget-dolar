// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: dollar-sign;

/*
  Widget "Dólar hoy" para Scriptable (iPhone / iPad).

  Datos: dolarapi.com (cotización actual) + api.argentinadatos.com (histórico,
  para la variación diaria y el mini gráfico). Valores orientativos.

  Tamaños soportados: chico, mediano, grande y pantalla bloqueada (rectangular / en línea).

  Parámetro del widget (opcional, se carga al editar el widget en la pantalla de inicio):
    lista separada por comas de los dólares a mostrar, en orden. Ej: blue,mep,oficial
    Valores: oficial, blue, mep, ccl, mayorista, cripto, tarjeta
*/

const CONFIG = {
  // Dólares por defecto según el tamaño del widget.
  porDefecto: {
    small: ["blue", "oficial", "bolsa"],
    medium: ["blue", "oficial", "bolsa", "contadoconliqui"],
    large: ["blue", "oficial", "bolsa", "contadoconliqui", "mayorista", "cripto", "tarjeta"],
    accessoryRectangular: ["blue", "oficial", "bolsa"],
    accessoryInline: ["blue"],
    accessoryCircular: ["blue"],
  },
  // Página que se abre al tocar el widget (dejalo vacío para abrir Scriptable).
  // Ej: "https://TU-USUARIO.github.io/widget-dolar/"
  urlAlTocar: "https://gonzalonietot.github.io/widget-dolar/",
  // Cada cuántos minutos pedirle a iOS que lo actualice (iOS decide el momento exacto).
  minutosRefresco: 15,
};

const NOMBRES = {
  oficial: "Oficial", blue: "Blue", bolsa: "MEP", contadoconliqui: "CCL",
  mayorista: "Mayorista", cripto: "Cripto", tarjeta: "Tarjeta",
};
const ALIAS = { mep: "bolsa", ccl: "contadoconliqui", cl: "contadoconliqui", contado: "contadoconliqui" };
const CON_BRECHA = ["blue", "bolsa", "contadoconliqui", "cripto"];

const C = {
  bg: Color.dynamic(new Color("#ffffff"), new Color("#0f1216")),
  text: Color.dynamic(new Color("#15181d"), new Color("#e8ebef")),
  muted: Color.dynamic(new Color("#667080"), new Color("#8b95a3")),
  up: Color.dynamic(new Color("#0f8a4a"), new Color("#38c27a")),
  down: Color.dynamic(new Color("#c8322b"), new Color("#f0605a")),
  flat: Color.dynamic(new Color("#7a828e"), new Color("#8b95a3")),
};
// DrawContext no acepta colores dinámicos: tonos que se ven bien en claro y oscuro.
const SPARK = { up: new Color("#2fb36b"), down: new Color("#e5534b") };

// ---------- utilidades ----------

const HORA_AR = 3 * 60 * 60 * 1000; // Argentina: UTC-3, sin horario de verano
const fechaAR = (d) => new Date(d.getTime() - HORA_AR).toISOString().slice(0, 10);
function horaAR(d) {
  const a = new Date(d.getTime() - HORA_AR);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(a.getUTCDate())}/${p(a.getUTCMonth() + 1)} ${p(a.getUTCHours())}:${p(a.getUTCMinutes())}`;
}
function plata(n, decimales = 2) {
  if (n == null || isNaN(n)) return "—";
  const [ent, dec] = Math.abs(n).toFixed(decimales).split(".");
  return (n < 0 ? "-" : "") + "$" + ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? "," + dec : "");
}
const porcentaje = (p, dec = 2) => (p > 0 ? "+" : "") + p.toFixed(dec).replace(".", ",") + "%";

const fm = FileManager.local();
const dirCache = fm.joinPath(fm.cacheDirectory(), "widget-dolar");
if (!fm.fileExists(dirCache)) fm.createDirectory(dirCache, true);
function leerCache(nombre) {
  const p = fm.joinPath(dirCache, nombre);
  if (!fm.fileExists(p)) return null;
  try { return JSON.parse(fm.readString(p)); } catch (e) { return null; }
}
const guardarCache = (nombre, data) => fm.writeString(fm.joinPath(dirCache, nombre), JSON.stringify(data));

async function getJSON(url) {
  const req = new Request(url);
  req.timeoutInterval = 15;
  const data = await req.loadJSON();
  const status = req.response && req.response.statusCode;
  if (status && status >= 400) throw new Error(`HTTP ${status}`);
  return data;
}

// ---------- datos ----------

async function getActuales() {
  try {
    const data = await getJSON("https://dolarapi.com/v1/dolares");
    if (!Array.isArray(data)) throw new Error("respuesta inesperada");
    const res = { ts: Date.now(), data };
    guardarCache("actuales.json", res);
    return { ...res, offline: false };
  } catch (e) {
    const cache = leerCache("actuales.json");
    if (cache) return { ...cache, offline: true };
    throw e;
  }
}

// El histórico cambia una vez por día: se guarda y se pide de nuevo al día siguiente.
async function getHistorico(casa) {
  const hoy = fechaAR(new Date());
  const archivo = `hist-${casa}.json`;
  const cache = leerCache(archivo);
  if (cache && cache.dia === hoy) return cache.data;
  try {
    const data = await getJSON(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}`);
    const ultimos = Array.isArray(data) ? data.slice(-40) : [];
    guardarCache(archivo, { dia: hoy, data: ultimos });
    return ultimos;
  } catch (e) {
    return cache ? cache.data : [];
  }
}

async function armarFilas(casas, conHistorico) {
  const actuales = await getActuales();
  const porCasa = {};
  for (const d of actuales.data) porCasa[d.casa] = d;
  const oficial = porCasa.oficial && porCasa.oficial.venta;

  const filas = await Promise.all(casas.filter((c) => porCasa[c]).map(async (casa) => {
    const d = porCasa[casa];
    const hist = conHistorico ? await getHistorico(casa) : [];
    // Se compara contra el cierre anterior a la fecha del dato (oficial y tarjeta
    // a veces vienen con fecha del día anterior).
    const diaDato = fechaAR(new Date(d.fechaActualizacion));
    const anteriores = hist.filter((h) => h.fecha < diaDato && h.venta);
    const previo = anteriores[anteriores.length - 1];
    return {
      casa,
      nombre: NOMBRES[casa],
      compra: d.compra,
      venta: d.venta,
      variacion: previo ? (d.venta - previo.venta) / previo.venta * 100 : null,
      brecha: oficial && CON_BRECHA.includes(casa) ? (d.venta / oficial - 1) * 100 : null,
      serie: anteriores.slice(-29).map((h) => h.venta).concat(d.venta),
    };
  }));
  return { filas, ts: new Date(actuales.ts), offline: actuales.offline };
}

// ---------- dibujo ----------

function colorVar(v) {
  if (v == null || Math.abs(v) < 0.005) return C.flat;
  return v > 0 ? C.up : C.down;
}
function textoVar(v) {
  if (v == null) return "—";
  if (Math.abs(v) < 0.005) return "● 0%";
  return (v > 0 ? "▲ " : "▼ ") + porcentaje(Math.abs(v)).replace("+", "");
}

function texto(stack, str, { size = 12, bold = false, color = C.text, derecha = false, escala = 0.6 } = {}) {
  const t = stack.addText(str);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = escala;
  if (derecha) t.rightAlignText();
  return t;
}

// Celda de ancho fijo para que las columnas queden alineadas.
function celda(fila, ancho, alto, derecha) {
  const s = fila.addStack();
  s.size = new Size(ancho, alto);
  s.centerAlignContent();
  if (derecha) s.addSpacer();
  return s;
}

function sparkline(valores, ancho, alto) {
  const ctx = new DrawContext();
  ctx.size = new Size(ancho, alto);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  if (valores.length >= 2) {
    const min = Math.min(...valores), max = Math.max(...valores), rango = max - min || 1, p = 2;
    const path = new Path();
    valores.forEach((v, i) => {
      const pt = new Point(p + i * (ancho - 2 * p) / (valores.length - 1), alto - p - (v - min) / rango * (alto - 2 * p));
      if (i === 0) path.move(pt); else path.addLine(pt);
    });
    ctx.addPath(path);
    ctx.setStrokeColor(valores[valores.length - 1] >= valores[0] ? SPARK.up : SPARK.down);
    ctx.setLineWidth(1.5);
    ctx.strokePath();
  }
  return ctx.getImage();
}

function encabezado(w, datos, chico) {
  const head = w.addStack();
  head.centerAlignContent();
  texto(head, "Dólar hoy", { size: chico ? 13 : 14, bold: true });
  head.addSpacer();
  texto(head, (datos.offline ? "⚠︎ " : "") + horaAR(datos.ts), { size: 10, color: datos.offline ? C.down : C.muted });
}

function widgetChico(w, datos) {
  encabezado(w, datos, true);
  w.addSpacer(6);
  datos.filas.slice(0, 3).forEach((f, i) => {
    if (i > 0) w.addSpacer(4);
    const fila = w.addStack();
    fila.centerAlignContent();
    const izq = fila.addStack();
    izq.layoutVertically();
    texto(izq, f.nombre.toUpperCase(), { size: 9, bold: true, color: C.muted });
    texto(izq, plata(f.venta, 0), { size: 16, bold: true });
    fila.addSpacer();
    texto(fila, textoVar(f.variacion), { size: 10, bold: true, color: colorVar(f.variacion) });
  });
}

function widgetTabla(w, datos, grande) {
  encabezado(w, datos, false);
  w.addSpacer(grande ? 8 : 6);
  // Anchos pensados para un widget de ~329pt de ancho menos márgenes.
  const col = grande
    ? { nombre: 66, spark: 56, compra: 62, venta: 66, var: 46, alto: 30 }
    : { nombre: 76, spark: 0, compra: 76, venta: 80, var: 64, alto: 20 };

  const cab = w.addStack();
  const etiqueta = (str, ancho, der) => texto(celda(cab, ancho, 12, der), str, { size: 9, bold: true, color: C.muted, derecha: der });
  etiqueta("", col.nombre);
  if (grande) etiqueta("30 DÍAS", col.spark);
  etiqueta("COMPRA", col.compra, true);
  etiqueta("VENTA", col.venta, true);
  etiqueta("VAR.", col.var, true);

  datos.filas.forEach((f) => {
    w.addSpacer(grande ? 4 : 3);
    const fila = w.addStack();
    fila.centerAlignContent();

    const cNombre = celda(fila, col.nombre, col.alto);
    if (grande) {
      const v = cNombre.addStack();
      v.layoutVertically();
      texto(v, f.nombre, { size: 13, bold: true });
      if (f.brecha != null) texto(v, "Brecha " + porcentaje(f.brecha, 1), { size: 9, color: C.muted });
    } else {
      texto(cNombre, f.nombre, { size: 13, bold: true });
    }
    if (grande) {
      const img = celda(fila, col.spark, col.alto).addImage(sparkline(f.serie, col.spark - 6, 20));
      img.imageSize = new Size(col.spark - 6, 20);
    }
    texto(celda(fila, col.compra, col.alto, true), plata(f.compra), { size: 12, color: C.muted, derecha: true });
    texto(celda(fila, col.venta, col.alto, true), plata(f.venta), { size: 13, bold: true, derecha: true });
    texto(celda(fila, col.var, col.alto, true), textoVar(f.variacion), { size: 10, bold: true, color: colorVar(f.variacion), derecha: true });
  });
}

function widgetBloqueo(w, datos, familia) {
  // En pantalla bloqueada iOS pinta todo en un solo tono: se usan flechas en vez de colores.
  if (familia === "accessoryInline") {
    const f = datos.filas[0];
    w.addText(`${f.nombre} ${plata(f.venta, 0)} ${textoVar(f.variacion)}`);
    return;
  }
  if (familia === "accessoryCircular") {
    const f = datos.filas[0];
    const t1 = w.addText(f.nombre); t1.font = Font.boldSystemFont(10); t1.centerAlignText();
    const t2 = w.addText(String(Math.round(f.venta))); t2.font = Font.boldSystemFont(14); t2.minimumScaleFactor = 0.5; t2.centerAlignText();
    return;
  }
  datos.filas.slice(0, 3).forEach((f) => {
    const fila = w.addStack();
    const n = fila.addText(f.nombre); n.font = Font.boldSystemFont(12);
    fila.addSpacer();
    const v = fila.addText(`${plata(f.venta, 0)} ${textoVar(f.variacion).replace("● ", "")}`);
    v.font = Font.systemFont(12); v.minimumScaleFactor = 0.6; v.lineLimit = 1;
  });
}

function widgetError(w, mensaje) {
  texto(w, "Dólar hoy", { size: 14, bold: true });
  w.addSpacer(6);
  const t = w.addText("No se pudieron cargar las cotizaciones.\n" + mensaje);
  t.font = Font.systemFont(11);
  t.textColor = C.muted;
}

// ---------- principal ----------

function casasPedidas(familia) {
  const param = (args.widgetParameter || "").trim().toLowerCase();
  if (param) {
    const lista = param.split(/[,\s]+/).map((s) => ALIAS[s] || s).filter((s) => NOMBRES[s]);
    if (lista.length) return lista;
  }
  return CONFIG.porDefecto[familia] || CONFIG.porDefecto.medium;
}

async function main() {
  // Al correrlo dentro de la app muestra la vista previa grande.
  const familia = config.runsInWidget ? (config.widgetFamily || "medium") : "large";
  const bloqueo = familia.startsWith("accessory");
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + CONFIG.minutosRefresco * 60 * 1000);
  if (CONFIG.urlAlTocar) w.url = CONFIG.urlAlTocar;
  if (!bloqueo) {
    w.backgroundColor = C.bg;
    w.setPadding(12, 14, 12, 14);
  }

  try {
    const sinHistorico = familia === "accessoryCircular";
    const datos = await armarFilas(casasPedidas(familia), !sinHistorico);
    if (!datos.filas.length) throw new Error("Sin datos para los dólares elegidos.");
    if (bloqueo) widgetBloqueo(w, datos, familia);
    else if (familia === "small") widgetChico(w, datos);
    else widgetTabla(w, datos, familia === "large" || familia === "extraLarge");
  } catch (e) {
    widgetError(w, String(e.message || e));
  }
  if (!bloqueo) w.addSpacer();

  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentLarge();
  Script.complete();
}

await main();

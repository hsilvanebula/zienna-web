/* Buscador y calendario público de bookzienna.com. Tres modos (ver index.py):
   barra (inicio), resultados (Propiedades) y alojamiento (cada ficha).
   Sin librerías. Las fechas se manejan como texto "AAAA-MM-DD" para no caer en
   husos horarios, y viajan entre recuadros por localStorage. */
(function () {
  var app = document.getElementById("dz-app");
  // Páginas armadas (Hugo, 19-11-2026: «solo la caja de reservas con el PMS»). En web.bookzienna.com (GitHub Pages) la
  // ficha trae sus datos dentro (#zienna-datos: ficha, alojamientos, reseñas) y solo lo que cambia (fechas, precios de
  // la estadía, reservas) se pide a registro.bookzienna.com. En el servidor (registro/pms) todo sigue como siempre.
  var EN_APP = /^(registro|pms|staff)\.bookzienna\.com$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var BASE = EN_APP ? "" : "https://registro.bookzienna.com";
  var DATOS = null;
  try { var zd = document.getElementById("zienna-datos"); if (zd) { DATOS = JSON.parse(zd.textContent); } } catch (e) { DATOS = null; }
  var API = BASE + "/api/method/zienna.api.stays.disponibilidad_web.";
  var WA = app.getAttribute("data-wa"), WEB = app.getAttribute("data-web");
  // RAPIDA = páginas del servidor (limpieza, propietarios, favoritos, libro). Las 8 fichas y Alojamientos viven como
  // páginas fijas en web.bookzienna.com desde el 19-11-2026 (FIJAS); en localhost se quedan en el mismo sitio.
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var RAPIDA = EN_APP ? location.origin : (app.getAttribute("data-rapida") || BASE);
  var FIJAS = LOCAL ? location.origin : "https://web.bookzienna.com", LISTADO = FIJAS + "/alojamientos/";
  var Q = new URLSearchParams(location.search);
  // Direcciones cortas (Hugo, 18-11-2026): registro.bookzienna.com/limpieza y /propietarios abren esas páginas solas.
  var RUTAS = { "/limpieza": "limpieza", "/propietarios": "propietarios" };
  // Fichas rápidas (Hugo, 18-11-2026): registro.bookzienna.com/si2105 = la ficha entera en una sola página, sin Wix.
  var FICHAS_RAPIDAS = { "/si2105": "SI2105", "/sm310": "SM310", "/sm1006": "SM1006", "/lince902": "LINCE902", "/lince902a": "LINCE902A", "/lince902b": "LINCE902B", "/lince1504": "LINCE1504", "/si502": "SI502" }, RUTA = location.pathname.replace(/\/$/, "");
  if (FICHAS_RAPIDAS[RUTA]) { RUTAS[RUTA] = "ficha"; }
  RUTAS["/alojamientos"] = "listado";
  RUTAS["/favoritos"] = "favoritos";
  RUTAS["/libro-de-reclamaciones"] = "reclamos";
  RUTAS["/inicio"] = "inicio";
  var MODO = Q.get("modo") || RUTAS[RUTA] || "resultados";
  var PROP = Q.get("p") || FICHAS_RAPIDAS[RUTA] || "";
  var APP = app;
  // Ícono del Libro de Reclamaciones (aviso del pie y cabecera de la página del libro).
  var LIBRO_SVG = '<svg class="lr-ico" width="40" height="40" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="9" fill="#fff"/>' +
    '<path d="M24 14c-3-2.4-7.4-3.3-12-3v22c4.6-.3 9 .6 12 3 3-2.4 7.4-3.3 12-3V11c-4.6-.3-9 .6-12 3z" fill="none" stroke="#b3261e" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M24 14v22M15.5 17.5c2.2 0 4.3.5 6 1.4M15.5 22.5c2.2 0 4.3.5 6 1.4M26.5 18.9c1.7-.9 3.8-1.4 6-1.4M26.5 23.9c1.7-.9 3.8-1.4 6-1.4" stroke="#b3261e" stroke-width="2" stroke-linecap="round"/></svg>';  // las piezas de la ficha rápida dibujan cada una en su propia caja (ver modoFicha)
  var LLAVE = "zienna_busqueda";
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  document.body.className += " dz-modo-" + MODO + (MODO === "fechas" ? " dz-modo-alojamiento" : "");

  var alojamientos = [], resultados = {}, busq = leer(), mesCal = (busq.ll || hoy()).slice(0, 7), datosMes = null;

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hoy() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function partes(f) { var p = f.split("-"); return { a: +p[0], m: +p[1], d: +p[2] }; }
  function corto(f) { var p = partes(f); return p.d + " " + MESES_C[p.m - 1]; }
  function mesTxt(ym) { var p = ym.split("-"); return MESES[+p[1] - 1] + " " + p[0]; }
  function sumaMes(ym, k) { var p = ym.split("-"); var t = (+p[0]) * 12 + (+p[1] - 1) + k; return Math.floor(t / 12) + "-" + pad((t % 12) + 1); }
  function soles(n) { return "S/ " + Number(n).toLocaleString("es-PE"); }
  function manana() { var d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  // Si no hay búsqueda guardada (o ya pasó), arranca con hoy y mañana.
  function leer() {
    var v = {};
    try { v = JSON.parse(localStorage.getItem(LLAVE) || "{}"); } catch (e) { v = {}; }
    // Fechas en la dirección (?ll=&sa=&h=): las trae quien viene de otro sitio de Zienna (registro ↔ web), porque
    // el localStorage no se comparte entre dominios. Mandan sobre lo guardado.
    var uq = new URLSearchParams(location.search), ull = uq.get("ll") || "", usa = uq.get("sa") || "", uh = parseInt(uq.get("h"), 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ull) && /^\d{4}-\d{2}-\d{2}$/.test(usa) && ull >= hoy() && usa > ull) {
      v = { ll: ull, sa: usa, h: uh >= 1 && uh <= 16 ? uh : (v.h || 2) };
      try { localStorage.setItem(LLAVE, JSON.stringify(v)); } catch (e) {}
    }
    if (!v.ll || !v.sa || v.ll < hoy() || v.sa <= v.ll) { v = (MODO === "resultados" || MODO === "alojamiento" || MODO === "barrafija" || MODO === "fechas" || MODO === "tarjeta" || MODO === "detalle" || MODO === "cierre" || MODO === "ficha" || MODO === "listado" || MODO === "favoritos" || MODO === "inicio") ? { ll: "", sa: "", h: v.h || 2 } : { ll: hoy(), sa: manana(), h: v.h || 2 }; }
    return v;
  }
  function guardar() { try { localStorage.setItem(LLAVE, JSON.stringify(busq)); } catch (e) {} }

  // «metodo» solo = de disponibilidad_web; «modulo.metodo» = otro módulo de zienna.api.stays (p. ej. limpieza_web.config).
  function urlApi(metodo) { return metodo.indexOf(".") > 0 ? BASE + "/api/method/zienna.api.stays." + metodo : API + metodo; }
  // Si dos piezas de la misma página piden lo mismo a la vez, viaja un solo pedido.
  var VUELO = {};
  function llamar(metodo, params) {
    var k = metodo + "|" + JSON.stringify(params || {});
    if (VUELO[k]) { return VUELO[k]; }
    var p = llamar1(metodo, params);
    VUELO[k] = p;
    if (metodo === "buscar") { p.then(avisarFechas, function () {}); }
    p.then(function (d) { notarDZ(metodo, d); }, function () {});
    p.then(function () { delete VUELO[k]; }, function () { delete VUELO[k]; });
    return p;
  }
  function llamar1(metodo, params) {
    var dk = metodo + "|" + JSON.stringify(params || {});
    if (DATOS && DATOS[dk]) { return Promise.resolve(DATOS[dk]); }  // dato armado dentro de la página: sin viaje al PMS
    var pre = window.__pre && window.__pre[metodo];
    if (pre) {  // ya se pidió desde la plantilla: se usa esa respuesta (una sola vez)
      delete window.__pre[metodo];
      return pre.then(function (j) { return j && j.message ? j.message : llamar1(metodo, params); });
    }
    window.__pidio = window.__pidio || {}; window.__pidio[metodo] = 1;  // pre.js no lo vuelve a pedir si llega después
    var q = Object.keys(params || {}).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
    // Si el PMS tarda más de 12 s, se corta y la pieza muestra su aviso (con WhatsApp) en vez de quedarse esperando.
    var ctl = window.AbortController ? new AbortController() : null, tope = ctl ? setTimeout(function () { ctl.abort(); }, 12000) : 0;
    return fetch(urlApi(metodo) + (q ? "?" + q : ""), { headers: { "Accept": "application/json" }, signal: ctl ? ctl.signal : undefined }).catch(function () {
      clearTimeout(tope); throw new Error("La consulta está tardando más de lo normal. Escríbenos por WhatsApp y te respondemos al toque.");
    }).then(function (r) {
      clearTimeout(tope);
      return r.json().then(function (j) {
        if (!r.ok) {
          var msg = "No pudimos consultar ahora. Intenta de nuevo o escríbenos por WhatsApp.";
          try { var m = JSON.parse(j._server_messages || "[]"); if (m.length) { msg = JSON.parse(m[0]).message || msg; } } catch (e) {}
          throw new Error(msg.replace(/<[^>]+>/g, ""));
        }
        return j.message;
      });
    });
  }

  // Muestra al instante lo último que se vio (si tiene menos de 10 min) y lo actualiza cuando llega
  // la respuesta del servidor: el recuadro nunca espera en blanco por una conexión lenta.
  // «Desde» con el descuento de reserva directa (Hugo, 18-11-2026): sin fechas se muestra el precio por noche tachado y,
  // al lado, ese mismo precio con el 20 % (vale desde 2 noches). Con fechas manda el precio real (precioTachado).
  var DZ = { pct: 20, noches: 2 };  // igual que DESCUENTO_WEB del servidor; se actualiza con cada respuesta de «alojamientos»
  function notarDZ(metodo, d) { if (metodo === "alojamientos" && d && d.descuento && d.descuento.pct) { DZ = d.descuento; } }
  function desdeTachado(precio, clase) {
    var con = Math.round(precio * (100 - DZ.pct) / 100);
    return '<s class="pt-antes">' + soles(precio) + '</s> <b class="' + ((clase || "") + " pt-ahora").trim() + '">' + soles(con) + '</b>';
  }
  function llamarSWR(metodo, params, alRecibir, alFallar) {
    var k = "zc_" + metodo + "_" + JSON.stringify(params || {});
    try { var c = JSON.parse(localStorage.getItem(k) || "null"); if (c && Date.now() - c.t < 600000) { notarDZ(metodo, c.d); alRecibir(c.d); } } catch (e) {}
    return llamar(metodo, params).then(function (d) {
      try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      alRecibir(d);
    }).catch(function (e) { if (alFallar) { alFallar(e); } });
  }
  function irA(url) {
    var a = document.createElement("a");
    a.href = url; a.target = "_top"; a.rel = "noopener";
    document.body.appendChild(a); a.click();
  }
  // «Reservar» lleva al embudo de solicitud (página propia, 3 pasos). Solo con fechas libres.
  function urlSolicitud(prop) {
    return BASE + "/disponibilidad?modo=solicitud&p=" + encodeURIComponent(prop) + "&ll=" + encodeURIComponent(busq.ll) + "&sa=" + encodeURIComponent(busq.sa) + "&h=" + encodeURIComponent(busq.h || 2);
  }
  function hrefReservar(prop, f) { return busq.ll && busq.sa && f && f.libre ? urlSolicitud(prop) : "#"; }
  function conFechasURL(u) { return busq.ll && busq.sa ? u + "?ll=" + encodeURIComponent(busq.ll) + "&sa=" + encodeURIComponent(busq.sa) + "&h=" + encodeURIComponent(busq.h || 2) : u; }
  function urlFicha(a) { return a && a.ficha ? conFechasURL(FIJAS + "/" + a.ficha + "/") : LISTADO; }

  // ¿Versión de celular? Dentro de Wix manda la FORMA del recuadro, no el ancho: en tablet (≈ 760 px) Wix usa su
  // diseño de celular estirado y el recuadro queda ancho pero altísimo; si se decidía por ancho salía la versión
  // de computadora y quedaba un vacío blanco enorme debajo (Hugo, 17-11-2026). `umbral` = alto/ancho que separa
  // el recuadro de computadora del de celular en ese modo. Abierta sola (fuera de Wix), por ancho como antes.
  function esCelular(umbral) {
    if (Q.get("vista")) { return Q.get("vista") === "cel"; }
    if (window.top !== window && window.innerHeight > 0 && window.innerWidth > 0) { return window.innerHeight / window.innerWidth > umbral; }
    return window.innerWidth < 700;
  }
  // ───────── barra de búsqueda ─────────
  function barraHTML(etiqueta) {
    var h = '<form class="zb-bar" id="zb-form" autocomplete="off">';
    h += '<label class="zb-f"><span>Llegada</span><input type="date" id="zb-ll" min="' + hoy() + '" value="' + esc(busq.ll || "") + '" required></label>';
    h += '<label class="zb-f"><span>Salida</span><input type="date" id="zb-sa" min="' + hoy() + '" value="' + esc(busq.sa || "") + '" required></label>';
    h += '<label class="zb-f zb-h"><span>Huéspedes</span><select id="zb-h">';
    for (var i = 1; i <= 4; i++) { h += '<option value="' + i + '"' + (+busq.h === i || (!busq.h && i === 2) ? " selected" : "") + '>' + i + (i === 1 ? " huésped" : " huéspedes") + '</option>'; }
    h += '</select></label>';
    h += '<button type="submit" class="zb-go" id="zb-go">' + esc(etiqueta) + '</button>';
    h += '</form><p class="dz-estado" id="zb-msg"></p>';
    return h;
  }
  function leerBarra() {
    var ll = document.getElementById("zb-ll").value, sa = document.getElementById("zb-sa").value, h = document.getElementById("zb-h").value;
    var msg = document.getElementById("zb-msg");
    if (!ll || !sa) { msg.textContent = "Elige tu llegada y tu salida."; return null; }
    if (sa <= ll) { msg.textContent = "La salida tiene que ser después de la llegada."; return null; }
    msg.textContent = "";
    return { ll: ll, sa: sa, h: h };
  }
  function ligarBarra(alEnviar) {
    var ll = document.getElementById("zb-ll"), sa = document.getElementById("zb-sa");
    ll.addEventListener("change", function () { sa.min = ll.value || hoy(); if (sa.value && sa.value <= ll.value) { sa.value = ""; } });
    document.getElementById("zb-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = leerBarra(); if (!v) { return; }
      busq = v; guardar(); alEnviar();
    });
  }

  // ───────── modo barra (inicio) ─────────
  function modoBarra() {
    // Celular (Hugo, 17-11-2026): nada de calendario del teléfono. Tocar Llegada, Salida o «Buscar» abre la
    // página propia de fechas (modo=buscar) a pantalla completa, con nuestro calendario y los alojamientos libres.
    if (window.top !== window ? esCelular(0.22) : window.innerWidth <= 560) { barraCelular(); return; }
    app.innerHTML = barraHTML("Buscar");
    ligarBarra(function () { irA(LISTADO); });
  }
  function urlBuscar(paso) {
    var u = BASE + "/disponibilidad?modo=buscar&h=" + encodeURIComponent(busq.h || 2);
    if (busq.ll && busq.sa) { u += "&ll=" + encodeURIComponent(busq.ll) + "&sa=" + encodeURIComponent(busq.sa); }
    return u + (paso ? "&paso=" + paso : "");
  }
  function barraCelular(caja) {
    var app = caja || APP;
    var h = '<form class="zb-bar zb-cel" id="zb-form" autocomplete="off">';
    h += '<a class="zb-f zb-ir" target="_top" href="' + esc(urlBuscar("fechas")) + '"><span>Llegada</span><b>' + (busq.ll ? corto(busq.ll) : "Elige") + '</b></a>';
    h += '<a class="zb-f zb-ir" target="_top" href="' + esc(urlBuscar("fechas")) + '"><span>Salida</span><b>' + (busq.sa ? corto(busq.sa) : "Elige") + '</b></a>';
    h += '<label class="zb-f zb-h"><span>Huéspedes</span><select id="zb-h">';
    for (var i = 1; i <= 4; i++) { h += '<option value="' + i + '"' + (+busq.h === i || (!busq.h && i === 2) ? " selected" : "") + '>' + i + (i === 1 ? " huésped" : " huéspedes") + '</option>'; }
    h += '</select></label><button type="submit" class="zb-go" id="zb-go">Buscar</button></form>';
    app.innerHTML = h;
    document.getElementById("zb-h").addEventListener("change", function () {
      busq.h = this.value; guardar();
      [].forEach.call(document.querySelectorAll(".zb-ir"), function (a) { a.href = urlBuscar("fechas"); });
    });
    document.getElementById("zb-form").addEventListener("submit", function (ev) { ev.preventDefault(); irA(urlBuscar()); });
  }

  // ───────── modo resultados (Propiedades) ─────────
  // En celular (recuadro angosto) las fechas no usan el calendario del teléfono: abren la página propia de fechas.
  var CEL_RS = (MODO === "resultados" || MODO === "listado") && (window.top !== window ? esCelular(1.5) : window.innerWidth <= 560);
  function modoResultadosCel(caja) {
    var app = caja || APP;
    barraCelular(app);
    var p = document.createElement("div");
    p.innerHTML = '<p class="dz-estado" id="zb-msg"></p><p class="dz-aviso" id="dz-aviso" hidden></p><div class="dz-filas" id="zr-lista"></div>';
    while (p.firstChild) { app.appendChild(p.firstChild); }
    llamar("alojamientos").then(function (d) {
      alojamientos = d.alojamientos; avisoViejo(d);
      if (busq.ll && busq.sa) { buscarEnPagina(); } else { document.getElementById("zb-msg").textContent = "Elige tus fechas para ver el precio total de tu estadía."; pintarResultados(); }
    }).catch(function (e) { document.getElementById("zb-msg").textContent = e.message; });
  }
  // Tarjeta del listado /alojamientos con el estilo de la portada (Hugo, 17-11-2026: «alinéalo con la portada»).
  function filaHTML(a) {
    var f = arguments.length > 1 ? arguments[1] : resultados[a.propiedad], tit = a.titulo_web || a.nombre;
    var foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_900,h_600");
    var h = '<article class="al-card"><a class="al-img" target="_top" href="' + esc(urlFicha(a)) + '" style="background-image:url(\'' + esc(foto) + '\')" aria-label="Ver ' + esc(tit) + '">' +
      (f && f.descuento ? '<span class="al-pill">' + f.descuento_pct + '\u00a0% menos</span>' : '') + (DENTRO ? '' : corazon(a.propiedad)) + '</a>';
    h += '<div class="al-t"><div class="al-c1"><b>' + esc(tit) + '</b>' + (a.nota ? '<span>★ ' + esc(String(a.nota).replace(".", ",")) + '</span>' : '') + '</div>';
    h += '<div class="al-c2">' + esc(a.distrito) + (a.resenas ? ' · ' + a.resenas + ' reseñas' : '') + '</div>';
    if (a.detalle) { h += '<div class="al-c2">' + esc(a.detalle) + '</div>'; }
    h += f ? '<div class="al-pr">' + precioTachado(f) + ' por ' + f.noches + (f.noches === 1 ? " noche" : " noches") + '</div>' : '<div class="al-pr">Desde ' + desdeTachado(a.desde) + ' la noche</div>';
    h += '<div class="al-bts"><a class="al-ver" target="_top" href="' + esc(urlFicha(a)) + '"><span class="al-pc">Ver alojamiento</span><span class="al-cl">Ver</span></a>' + (f ? '<a class="al-res" target="_top" href="' + esc(hrefReservar(a.propiedad, f)) + '">Reservar</a>' : '<a class="al-res" target="_top" href="' + esc(CEL_RS ? urlBuscar("fechas") : urlFicha(a)) + '">Ver fechas</a>') + '</div></div></article>';
    return h;
  }
  // Solo se muestran los alojamientos que se pueden reservar en las fechas elegidas.
  function pintarResultados() {
    // Sin fechas: todos los alojamientos con su precio «desde» (antes buscaba hoy → mañana y solía decir «no hay»).
    if (!busq.ll || !busq.sa) {
      var todos = alojamientos.slice().sort(function (x, y) { return x.desde - y.desde; });
      document.getElementById("zr-lista").innerHTML = todos.map(function (a) { return filaHTML(a, null); }).join("");
      return;
    }
    var ord = alojamientos.filter(function (x) { var f = resultados[x.propiedad]; return f && f.libre; });
    ord.sort(function (x, y) { return resultados[x.propiedad].total - resultados[y.propiedad].total; });
    document.getElementById("zr-lista").innerHTML = ord.map(filaHTML).join("");
  }
  function buscarEnPagina() {
    var msg = document.getElementById("zb-msg"), go = document.getElementById("zb-go");
    if (!busq.ll || !busq.sa) { resultados = {}; msg.textContent = "Elige tus fechas para ver el precio total de tu estadía."; pintarResultados(); return Promise.resolve(); }
    go.disabled = true; msg.textContent = "Buscando…";
    return llamar("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }).then(function (d) {
      resultados = {};
      d.resultados.forEach(function (f) { resultados[f.propiedad] = f; });
      // Sin contar alojamientos (regla de la web) y sin las habitaciones ocultas.
      var visibles = {}; alojamientos.forEach(function (x) { visibles[x.propiedad] = 1; });
      var libres = d.resultados.filter(function (f) { return f.libre && (!alojamientos.length || visibles[f.propiedad]); }).length;
      msg.textContent = libres ? "Disponibles del " + corto(busq.ll) + " al " + corto(busq.sa) + ". Precio total de tu estadía." : "No hay alojamientos libres en esas fechas. Prueba otras.";
      avisoViejo(d); pintarResultados();
    }).catch(function (e) { msg.textContent = e.message; })
      .then(function () { go.disabled = false; });
  }
  function avisoViejo(d) {
    var el = document.getElementById("dz-aviso");
    if (!el) { return; }
    el.hidden = !(d && d.desactualizado);
    el.textContent = "Estamos actualizando la disponibilidad. Confirma por WhatsApp antes de reservar.";
  }
  function modoResultados(caja) {
    var app = caja || APP;
    letraZienna();
    if (CEL_RS) { modoResultadosCel(app); return; }
    app.innerHTML = barraHTML("Ver disponibilidad") + '<p class="dz-aviso" id="dz-aviso" hidden></p><div class="dz-filas" id="zr-lista"></div>';
    ligarBarra(buscarEnPagina);
    llamar("alojamientos").then(function (d) {
      alojamientos = d.alojamientos; avisoViejo(d); pintarResultados();
      if (busq.ll && busq.sa) { buscarEnPagina(); }
    }).catch(function (e) { document.getElementById("zb-msg").textContent = e.message; });
  }

  // ───────── modo alojamiento (ficha) ─────────
  function panelHTML() {
    var h = '<div class="dz-ficha"><div class="dz-det">Desde</div><div class="dz-desde"><span class="serif" id="zf-desde">S/ …</span> <small>/ noche</small></div>';
    h += '<div class="zf-fechas"><label class="zb-f"><span>Llegada</span><input type="date" id="zb-ll" min="' + hoy() + '" value="' + esc(busq.ll || "") + '"></label>';
    h += '<label class="zb-f"><span>Salida</span><input type="date" id="zb-sa" min="' + hoy() + '" value="' + esc(busq.sa || "") + '"></label></div>';
    h += '<div class="zf-resumen" id="zf-res">Toca en el calendario tu día de llegada.</div>';
    h += '<div id="zf-cal"></div>';
    h += '<a class="dz-wa zf-wa" id="zf-wa" target="_top" href="#">Reservar</a>';
    h += '<ul class="zf-datos" id="zf-datos"></ul>';
    h += '<p class="zf-horas"><b>Check-in:</b> a partir de las 3pm<br><b>Check-out:</b> hasta las 11am</p>';
    h += '<p class="zf-nota">Ofrecemos la posibilidad de registrarte antes de lo habitual o prolongar tu salida por una tarifa adicional, siempre sujeto a disponibilidad.</p></div>';
    return h;
  }
  function nombreProp() { var a = alojamientos.filter(function (x) { return x.propiedad === PROP; })[0]; return a ? a.nombre : "este alojamiento"; }
  function resumenFicha() {
    var el = document.getElementById("zf-res"), wa = document.getElementById("zf-wa");
    var f = resultados[PROP];
    if (!busq.ll || !busq.sa) { el.className = "zf-resumen"; el.textContent = busq.ll ? "Ahora toca tu día de salida." : "Toca en el calendario tu día de llegada."; wa.href = "#"; return; }
    if (!f) { el.textContent = "Consultando…"; return; }
    if (f.libre) {
      el.className = "zf-resumen ok";
      el.innerHTML = precioTachado(f) + " por " + f.noches + (f.noches === 1 ? " noche" : " noches") + " <span>(" + soles(f.por_noche) + " por noche)</span>" + conDesc(f);
    } else {
      el.className = "zf-resumen no";
      el.textContent = f.motivo === "minimo" ? "Para esas fechas pedimos al menos " + f.minimo + " noches." : f.motivo === "capacidad" ? "Este alojamiento admite hasta " + f.capacidad + " huéspedes." : "Esas fechas no están libres. Elige otras en el calendario.";
    }
    wa.href = hrefReservar(PROP, f);
  }
  function buscarFicha() {
    if (!busq.ll || !busq.sa) { resultados = {}; resumenFicha(); pintarCal(); return; }
    document.getElementById("zf-res").textContent = "Consultando…";
    llamarSWR("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }, function (d) {
      if (d.llegada !== busq.ll || d.salida !== busq.sa) { return; }
      resultados = {}; d.resultados.forEach(function (f) { resultados[f.propiedad] = f; });
      resumenFicha(); pintarCal();
    }, function (e) { document.getElementById("zf-res").textContent = e.message; });
  }
  function cargarMes() {
    datosMes = null; pintarCal();
    llamarSWR("calendario", { propiedad: PROP, mes: mesCal }, function (d) { if (d.mes === mesCal) { datosMes = d; pintarCal(); } },
      function (e) { document.getElementById("zf-cal").innerHTML = '<p class="dz-nota">' + esc(e.message) + '</p>'; });
  }
  // Ayudantes del calendario: noches libres del mes, día anterior y qué pasa al tocar un día.
  // Descuento de la reserva directa (lo calcula el servidor): texto corto para mostrar junto al total.
  // Precio final (Hugo, 18-11-2026, opción A; «no se cobra nada más»): debajo de todo total, «✓ 20 % de descuento»,
  // «✓ Limpieza incluida» y «Es el precio final. No pagas nada más.». `corto` = solo las etiquetas.
  var PF_CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function precioFinal(f, corto) {
    return '<span class="pf"><span class="pf-et">' + (f && f.descuento ? '<span class="pf-v">' + PF_CHECK + ' ' + f.descuento_pct + '\u00a0% de descuento</span>' : '') +
      '<span class="pf-g">' + PF_CHECK + ' Limpieza incluida</span></span>' + (corto ? '' : '<span class="pf-fin">Es el precio final. No pagas nada más.</span>') + '</span>';
  }
  function conDesc(f) { return f ? precioFinal(f) : ""; }
  // Precio original tachado + precio final llamativo (Hugo, 18-11-2026: «en todos cuando se consulta»). `clase` = la del <b>.
  function precioTachado(f, clase) {
    var rebaja = f && f.descuento && f.subtotal > f.total;
    return (rebaja ? '<s class="pt-antes">' + soles(f.subtotal) + '</s> ' : '') + '<b class="' + ((clase || "") + (rebaja ? " pt-ahora" : "")).trim() + '">' + soles(f.total) + '</b>';
  }
  function anterior(f) { var d = new Date(f + "T12:00:00"); d.setDate(d.getDate() - 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nochesLibres() { var m = {}; ((datosMes && datosMes.dias) || []).forEach(function (x) { m[x.f] = x.libre && !x.pasado; }); return m; }
  // Devuelve "sa" si quedó elegida la salida, "ll" si el día pasó a ser la nueva llegada.
  // Tocar un día de solo salida (noche ocupada, la anterior libre) arma esa estadía directo: 24 → 23 → 24.
  function elegirDia(f) {
    var libre = nochesLibres(), x = ((datosMes && datosMes.dias) || []).filter(function (z) { return z.f === f; })[0];
    if (busq.ll && !busq.sa && f > busq.ll) {
      var ok = true;
      for (var d = busq.ll; d < f; ) { if (libre[d] === false) { ok = false; break; } var n = new Date(d + "T12:00:00"); n.setDate(n.getDate() + 1); d = n.getFullYear() + "-" + pad(n.getMonth() + 1) + "-" + pad(n.getDate()); }
      if (ok) { busq.sa = f; return "sa"; }
    }
    if (x && !x.libre && libre[anterior(f)]) { busq.ll = anterior(f); busq.sa = f; return "sa"; }
    busq.ll = f; busq.sa = ""; return "ll";
  }
  function pintarCal() {
    var caja = document.getElementById("zf-cal");
    if (!caja) { return; }
    if (!datosMes) { caja.innerHTML = '<p class="dz-nota">Cargando calendario…</p>'; return; }
    var ll = busq.ll, sa = busq.sa, hoyM = hoy().slice(0, 7);
    var h = '<div class="dz-mes-nav"><button type="button" data-nav="-1" aria-label="Mes anterior"' + (mesCal <= hoyM ? " disabled" : "") + '>‹</button><b>' + mesTxt(mesCal) + '</b><button type="button" data-nav="1" aria-label="Mes siguiente">›</button></div><div class="dz-grid">';
    ["L", "M", "M", "J", "V", "S", "D"].forEach(function (x) { h += '<div class="dz-dow">' + x + '</div>'; });
    for (var i = 0; i < datosMes.primer_dia_semana; i++) { h += '<div class="dz-dia vacio"></div>'; }
    // Opción «lo mínimo» de Hugo (17-11-2026, noche): blanco y negro, sin tachar los días que sirven
    // para salir, y una raya fina que une cada tramo libre (del primer día de llegada al día de salida).
    // Antes el 24 salía tachado si ya habías elegido otra llegada y parecía que 23 → 24 no se podía.
    var libreNoche = nochesLibres();
    datosMes.dias.forEach(function (x) {
      var cls = "dz-dia", pr = "", dis = false;
      if (x.pasado) { cls += " pas"; dis = true; }
      else {
        if (x.f === ll) { cls += " sel ll" + (sa ? " con-sa" : ""); pr = "<small>llegada</small>"; }
        else if (x.f === sa) { cls += " sel sa"; }  // sin la palabra «salida» (Hugo, 17-11-2026)
        else if (!x.libre && libreNoche[anterior(x.f)]) { cls += " solosal"; }
        else if (!x.libre) { cls += " ocup"; dis = true; }
        else { cls += " libre"; pr = "<small>" + x.precio + "</small>"; }
        if (libreNoche[anterior(x.f)]) { cls += " t-i"; }
        if (libreNoche[x.f]) { cls += " t-d"; }
      }
      if (ll && sa && x.f > ll && x.f < sa) { cls += " rango"; }
      h += '<button type="button" class="' + cls + '" data-f="' + x.f + '"' + (dis ? " disabled" : "") + '>' + partes(x.f).d + pr + '</button>';
    });
    // Opción A de Hugo (17-11-2026): en vez de leyenda, una línea que dice qué falta o qué elegiste.
    var lin;
    if (ll && sa) {
      var n = Math.round((new Date(sa + "T12:00:00") - new Date(ll + "T12:00:00")) / 864e5), tot = 0, todas = true;
      for (var q = 0; q < n; q++) { var dq = new Date(ll + "T12:00:00"); dq.setDate(dq.getDate() + q); var fq = dq.getFullYear() + "-" + pad(dq.getMonth() + 1) + "-" + pad(dq.getDate()); var xq = datosMes.dias.filter(function (z) { return z.f === fq; })[0]; if (xq && xq.precio) { tot += +xq.precio; } else { todas = false; } }
      // Igual que el servidor: 20% desde 2 noches; si no, 10% de último minuto (llegada hoy o mañana). No se suman.
      var pctD = 0, um = datosMes.ultimo_minuto;
      if (datosMes.descuento && n >= datosMes.descuento.noches) { pctD = datosMes.descuento.pct; }
      else if (um && datosMes.hoy && Math.round((new Date(ll + "T12:00:00") - new Date(datosMes.hoy + "T12:00:00")) / 864e5) <= um.dias) { pctD = um.pct; }
      var dsc = pctD ? Math.round(tot * pctD / 100) : 0;
      lin = '<b>' + corto(ll) + ' → ' + corto(sa) + ' · ' + n + (n === 1 ? " noche" : " noches") + (todas && tot ? " · " + soles(tot - dsc) : "") + '</b>' +
        (todas && tot && dsc ? ' <span class="dz-desc">' + pctD + ' % menos</span>' : "");
    } else if (ll) { lin = "Toca el día en que te vas · la raya une las fechas libres"; }
    else { lin = "Toca tu día de llegada · la raya une las fechas libres"; }
    h += '</div><p class="dz-lin">' + lin + '</p>';
    caja.innerHTML = h;
  }
  function modoAlojamiento() {
    // En celular el recuadro de Wix de la tarjeta mide ~75 px y tapaba el texto: ahí no se dibuja nada
    // (las fechas se eligen desde la barra inferior, que abre la página de fechas).
    if (MODO === "alojamiento" && window.innerWidth < 160) { app.innerHTML = ""; return; }
    app.innerHTML = panelHTML();
    var wa = document.getElementById("zf-wa"); wa.href = "#";
    wa.addEventListener("click", function (ev) {
      if (wa.getAttribute("href") === "#") { ev.preventDefault(); if (!(busq.ll && busq.sa)) { var r = document.getElementById("zf-res"); r.className = "zf-resumen no"; r.textContent = "Elige tus fechas de llegada y salida para reservar."; } }
    });
    var ll = document.getElementById("zb-ll"), sa = document.getElementById("zb-sa");
    function alCambiar() {
      if (ll.value && sa.value && sa.value <= ll.value) { sa.value = ""; }
      busq.ll = ll.value; busq.sa = sa.value; guardar();
      if (busq.ll && busq.sa) { buscarFicha(); } else { resultados = {}; resumenFicha(); pintarCal(); }
    }
    ll.addEventListener("change", function () { sa.min = ll.value || hoy(); alCambiar(); });
    sa.addEventListener("change", alCambiar);
    app.addEventListener("click", function (ev) {
      var t = ev.target.closest("button"); if (!t) { return; }
      if (t.hasAttribute("data-nav")) { mesCal = sumaMes(mesCal, +t.getAttribute("data-nav")); cargarMes(); }
      else if (t.hasAttribute("data-f")) {
        var f = t.getAttribute("data-f");
        var r = elegirDia(f); ll.value = busq.ll; sa.value = busq.sa;
        if (r === "ll") { guardar(); resultados = {}; document.getElementById("zf-res").textContent = "Ahora toca tu día de salida."; pintarCal(); }
        else { alCambiar(); }
      }
    });
    llamarSWR("alojamientos", {}, function (d) {
      alojamientos = d.alojamientos;
      var a = alojamientos.filter(function (x) { return x.propiedad === PROP; })[0];
      if (a) { limitarHu(document.getElementById("zb-h"), a.capacidad); }
      document.getElementById("zf-desde").innerHTML = a ? desdeTachado(a.desde) : "—";
      document.getElementById("zf-datos").innerHTML = ((a && a.detalle) || "").split(" · ").filter(Boolean).map(function (x) { return "<li>" + esc(x.charAt(0).toUpperCase() + x.slice(1)) + "</li>"; }).join("");
      resumenFicha();
    });
    cargarMes();
    if (busq.ll && busq.sa) { buscarFicha(); }
  }

  // ───────── barra fija inferior de cada ficha ─────────
  // En computadora la ficha ya tiene la tarjeta a la izquierda: la barra no se dibuja. En celular es una
  // barra compacta: tocar las fechas (o «Reservar» sin fechas) abre la página de fechas, donde llegada y
  // salida se eligen en un solo calendario; las fechas quedan guardadas y la barra las muestra al volver.
  function urlFechas() { return BASE + "/disponibilidad?modo=fechas&p=" + encodeURIComponent(PROP); }
  // Fichas que ya usan la tarjeta nueva (modo=tarjeta): ahí la barra fija vieja se tapaba con la tarjeta.
  var FICHA_NUEVA = { SI2105: 1, SM310: 1, SM1006: 1, SI502: 1, LINCE1504: 1, LINCE902: 1, LINCE902A: 1, LINCE902B: 1 };  // las 8 con ficha nueva (17-11-2026)
  function modoBarraFija(caja) {
    var app = caja || APP;
    if (window.matchMedia && matchMedia("(pointer: fine)").matches && window.innerWidth > 480) { app.innerHTML = ""; return; }
    if (FICHA_NUEVA[PROP]) { barraNueva(app); return; }
    app.innerHTML = '<div class="bf bf-m"><a class="bf-ir" id="bf-ir" target="_top" href="' + esc(urlFechas()) + '"><span class="bf-et">Fechas</span><b id="bf-fe">Elige tus fechas</b></a>' +
      '<div class="bf-precio" id="bf-precio"><span class="dz-det">Desde</span><b class="serif" id="bf-p">S/ …</b></div>' +
      '<a class="dz-wa bf-wa" id="bf-wa" target="_top" href="' + esc(urlFechas()) + '">Reservar</a></div>';
    function pintarFechas() {
      document.getElementById("bf-fe").textContent = busq.ll && busq.sa ? corto(busq.ll) + " → " + corto(busq.sa) : busq.ll ? corto(busq.ll) + " → elige salida" : "Elige tus fechas";
    }
    function pintar() {
      var f = resultados[PROP], cont = document.getElementById("bf-precio"), wa = document.getElementById("bf-wa");
      pintarFechas();
      if (f && f.libre) { cont.innerHTML = '<span class="dz-det">' + f.noches + (f.noches === 1 ? " noche" : " noches") + '</span>' + precioTachado(f, "serif"); }
      else if (f) { cont.innerHTML = '<span class="dz-det">' + (f.motivo === "capacidad" ? "Máx. " + f.capacidad + " huéspedes" : "No disponible") + '</span><b class="serif">—</b>'; }
      var h = hrefReservar(PROP, f); wa.href = h === "#" ? urlFechas() : h;
    }
    function consultar() {
      if (!busq.ll || !busq.sa) { return; }
      llamarSWR("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }, function (d) {
        if (d.llegada !== busq.ll || d.salida !== busq.sa) { return; }
        resultados = {}; d.resultados.forEach(function (f) { resultados[f.propiedad] = f; }); pintar();
      });
    }
    pintarFechas();
    llamarSWR("alojamientos", {}, function (d) {
      alojamientos = d.alojamientos;
      var a = alojamientos.filter(function (x) { return x.propiedad === PROP; })[0];
      if (a && !(resultados[PROP])) { document.getElementById("bf-precio").innerHTML = '<span class="dz-det">Desde</span>' + desdeTachado(a.desde, "serif"); }
    });
    consultar();
  }

  // Barra de abajo de la ficha nueva (celular): precio por noche, descuento si lo hay, fechas y «Reservar».
  function barraNueva(caja) {
    var app = caja || APP;
    document.body.className += " bn-en";
    app.innerHTML = '<div class="bn"><div class="bn-i"><div><b id="bn-p">S/ …</b> <span id="bn-u">noche</span></div><div class="bn-d" id="bn-d"></div>' +
      '<a class="bn-f" id="bn-f" target="_top" href="' + esc(urlFechas()) + '">Elige tus fechas</a></div>' +
      '<a class="bn-r" id="bn-r" target="_top" href="' + esc(urlFechas()) + '">Reservar</a></div>';
    if (busq.ll && busq.sa) { document.getElementById("bn-f").textContent = corto(busq.ll) + " → " + corto(busq.sa); }
    llamarSWR("alojamientos", {}, function (d) {
      var a = d.alojamientos.filter(function (x) { return x.propiedad === PROP; })[0];
      if (a && !resultados[PROP]) { document.getElementById("bn-p").innerHTML = desdeTachado(a.desde); }
    });
    llamarSWR("ficha", { propiedad: PROP }, function (f) { if (f.descuento) { document.getElementById("bn-d").textContent = f.descuento; } });
    if (busq.ll && busq.sa) {
      llamarSWR("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }, function (d) {
        var f = d.resultados.filter(function (x) { return x.propiedad === PROP; })[0];
        if (f && f.libre) {
          document.getElementById("bn-p").innerHTML = precioTachado(f);
          document.getElementById("bn-u").textContent = f.noches + (f.noches === 1 ? " noche" : " noches");
          document.getElementById("bn-d").textContent = (f.descuento ? f.descuento_pct + " % menos · " : "") + "limpieza incluida";
          resultados[PROP] = f; document.getElementById("bn-r").href = urlSolicitud(PROP);
        }
      });
    }
  }

  // ───────── página de fechas (celular): la tarjeta de la ficha, a pantalla completa ─────────
  function modoFechas() {
    modoAlojamiento();
    var cab = document.createElement("div"); cab.className = "fe-cab";
    cab.innerHTML = '<a class="fe-volver" id="fe-volver" target="_top" href="' + esc(LISTADO) + '">← Volver al alojamiento</a><b id="fe-nom"></b>';
    app.insertBefore(cab, app.firstChild);
    llamarSWR("alojamientos", {}, function (d) {
      var a = d.alojamientos.filter(function (x) { return x.propiedad === PROP; })[0];
      if (a) { document.getElementById("fe-volver").href = urlFicha(a); document.getElementById("fe-nom").textContent = a.titulo_web || a.titulo || a.nombre; }
    });
    // Al volver, la ficha (en web.bookzienna.com) recibe las fechas recién elegidas en la dirección.
    document.getElementById("fe-volver").addEventListener("click", function () {
      var a = alojamientos.filter(function (x) { return x.propiedad === PROP; })[0];
      this.href = a ? urlFicha(a) : conFechasURL(FIJAS + "/" + (FICHAS_RAPIDAS["/" + String(PROP).toLowerCase()] ? String(PROP).toLowerCase() + "/" : "alojamientos/"));
    });
  }

  // ───────── tarjeta de la ficha nueva (web, 16-11-2026) ─────────
  // Un solo recuadro de Wix para las dos versiones (Hugo eligió la opción 1 en celular y la A en
  // computadora). En computadora va bajo el mosaico de fotos: columna izquierda con íconos, llegada y
  // una reseña, y a la derecha la tarjeta; el calendario se abre dentro de la misma tarjeta. En celular es la tarjeta blanca bajo la foto, con
  // lugar, nota, nombre, íconos y fechas; tocar las fechas abre la página de fechas de siempre.
  // WhatsApp no aparece aquí: «Reservar» lleva al embudo de solicitud (paso 3 = WhatsApp).
  var ICONOS = {
    piscina: '<path d="M3 18c2 0 2-1.5 4.5-1.5S9.5 18 12 18s2.5-1.5 4.5-1.5S19 18 21 18"/><path d="M8 15V5a2 2 0 0 1 4 0M14 15V5a2 2 0 0 1 4 0M8 9h6"/>',
    gym: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
    vista: '<path d="M3 15c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/><circle cx="17" cy="6" r="2.5"/>',
    clave: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    cochera: '<path d="M4 17v-6l2-5h12l2 5v6M4 12h16"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/><path d="M5 17v2M19 17v2"/>',
    recepcion: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 11V9M10 9h4"/>',
    sauna: '<path d="M8 4c-1 2 1 3 0 5M12 4c-1 2 1 3 0 5M16 4c-1 2 1 3 0 5"/><path d="M4 13h16v7H4z"/>',
    ascensor: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 10l3-3 3 3M9 14l3 3 3-3"/>'
  };
  function icono(k) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' + (ICONOS[k] || "") + '</svg>'; }
  function nota(n) { return String(n).replace(".", ","); }
  function modoTarjeta(caja) {
    var app = caja || APP;
    // Celular = pantalla de teléfono (Wix muestra su versión móvil solo en teléfonos).
    // `&vista=cel` o `&vista=pc` fuerza una versión (para revisarla desde la computadora).
    var CEL = Q.get("vista") ? Q.get("vista") === "cel" : (window.screen && screen.width ? screen.width : window.innerWidth) < 768;
    document.body.className += CEL ? " tj-en-cel" : " tj-en-pc";
    var cajaFechas = '<span class="tj-fe" data-abre="1"><span class="tj-et">Llegada</span><b id="tj-ll">Agregar fecha</b></span>' +
      '<span class="tj-fe" data-abre="1"><span class="tj-et">Salida</span><b id="tj-sa">Agregar fecha</b></span>';
    var h;
    if (CEL) {
      h = '<div class="tj tj-cel"><div class="tj-fila"><span id="tj-dist"></span><span id="tj-nota"></span></div>' +
        '<h1 class="tj-nom serif" id="tj-nom"></h1><div class="tj-ico" id="tj-ico"></div>' +
        '<a class="tj-caja" target="_top" href="' + esc(urlFechas()) + '">' + cajaFechas + '</a>' +
        '<div class="tj-pie"><span class="tj-p" id="tj-p">Desde<br><b>S/ …</b> noche</span><a class="tj-btn" id="tj-btn" target="_top" href="#">Reservar</a></div>' +
        '<p class="tj-nota" id="tj-msg">Aún no se te cobra nada. Primero confirmamos tus fechas.</p></div>';
    } else {
      var sel = "";
      for (var i = 1; i <= 4; i++) { sel += '<option value="' + i + '"' + ((+busq.h || 2) === i ? " selected" : "") + '>' + i + (i === 1 ? " huésped" : " huéspedes") + '</option>'; }
      // Opción A (Hugo, 16-11-2026): con el recuadro ancho (bajo el mosaico de fotos) van dos columnas:
      // íconos, la línea de llegada y una reseña a la izquierda; la tarjeta a la derecha.
      var ANCHO = !caja && window.innerWidth >= 800;  // en la ficha rápida va solo la tarjeta, en la columna derecha
      h = (ANCHO ? '<div class="tj-a"><div class="tj-izq"><div class="tj-tiles" id="tj-tiles"></div>' +
        '<p class="tj-lin">Llegas desde las 3:00 pm con tu propia clave, sin esperar a nadie. Salida hasta las 11:00 am.</p>' +
        '<div class="tj-rs" id="tj-rs"></div></div>' : '<div class="tj-a1">') +
        '<div class="tj tj-pc"><div id="tj-res">' +
        '<div class="tj-desde" id="tj-p">Desde <b class="serif">S/ …</b> noche</div>' +
        '<div class="tj-caja">' + cajaFechas + '<label class="tj-hu"><span class="tj-et">Huéspedes</span><select id="tj-h">' + sel + '</select></label></div>' +
        '<a class="tj-btn" id="tj-btn" target="_top" href="#">Reservar</a>' +
        '<p class="tj-nota" id="tj-msg">Aún no se te cobra nada. Primero confirmamos tus fechas.</p></div>' +
        '<div id="tj-calv" hidden><div class="tj-calcab"><b id="tj-calmsg">Toca tu día de llegada</b><button type="button" id="tj-listo">Listo</button></div><div id="zf-cal"></div></div></div></div>';
    }
    app.innerHTML = h;
    var btn = document.getElementById("tj-btn"), msg = document.getElementById("tj-msg"), aloj = null;
    var NOTA = "Aún no se te cobra nada. Primero confirmamos tus fechas.";
    function pintar() {
      var f = resultados[PROP], p = document.getElementById("tj-p");
      document.getElementById("tj-ll").textContent = busq.ll ? corto(busq.ll) : "Agregar fecha";
      document.getElementById("tj-sa").textContent = busq.sa ? corto(busq.sa) : "Agregar fecha";
      [].forEach.call(document.querySelectorAll(".tj-fe"), function (x, k) { x.classList.toggle("lleno", !!(k ? busq.sa : busq.ll)); });
      msg.className = "tj-nota"; msg.textContent = NOTA;
      if (busq.ll && busq.sa && f && f.libre) {
        p.innerHTML = CEL ? f.noches + (f.noches === 1 ? " noche" : " noches") + '<br>' + precioTachado(f) + ' en total' + conDesc(f)
          : precioTachado(f, "serif") + ' por ' + f.noches + (f.noches === 1 ? " noche" : " noches") + conDesc(f);
      } else {
        p.innerHTML = CEL ? 'Desde<br>' + (aloj ? desdeTachado(aloj.desde) : "<b>S/ …</b>") + ' noche' : 'Desde ' + (aloj ? desdeTachado(aloj.desde, "serif") : '<b class="serif">S/ …</b>') + ' noche';
        if (busq.ll && busq.sa && f) {
          msg.className = "tj-nota no";
          msg.textContent = f.motivo === "minimo" ? "Para esas fechas pedimos al menos " + f.minimo + " noches." : f.motivo === "capacidad" ? "Este alojamiento admite hasta " + f.capacidad + " huéspedes." : "Esas fechas no están libres. Elige otras.";
        }
      }
      var r = hrefReservar(PROP, f);
      btn.href = r !== "#" ? r : (CEL ? urlFechas() : "#");
    }
    function consultar() {
      if (!busq.ll || !busq.sa) { resultados = {}; pintar(); return; }
      llamarSWR("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }, function (d) {
        if (d.llegada !== busq.ll || d.salida !== busq.sa) { return; }
        resultados = {}; d.resultados.forEach(function (f) { resultados[f.propiedad] = f; }); pintar();
      }, function (e) { msg.className = "tj-nota no"; msg.textContent = e.message; });
    }
    function verCal(si) {
      if (CEL) { return; }
      document.getElementById("tj-res").hidden = si; document.getElementById("tj-calv").hidden = !si;
      if (si) { document.getElementById("tj-calmsg").textContent = busq.ll && !busq.sa ? "Ahora toca tu día de salida" : busq.ll && busq.sa ? "Tus fechas: " + corto(busq.ll) + " → " + corto(busq.sa) : "Toca tu día de llegada"; if (!datosMes) { cargarMes(); } else { pintarCal(); } }
    }
    btn.addEventListener("click", function (ev) {
      if (btn.getAttribute("href") !== "#") { return; }
      ev.preventDefault();
      if (!(busq.ll && busq.sa)) { verCal(true); }
    });
    if (!CEL) {
      app.addEventListener("click", function (ev) {
        if (ev.target.closest("[data-abre]")) { verCal(true); return; }
        if (ev.target.closest("#tj-listo")) { verCal(false); return; }
        var t = ev.target.closest("button"); if (!t || !document.getElementById("zf-cal").contains(t)) { return; }
        if (t.hasAttribute("data-nav")) { mesCal = sumaMes(mesCal, +t.getAttribute("data-nav")); cargarMes(); }
        else if (t.hasAttribute("data-f")) {
          var f = t.getAttribute("data-f");
          if (elegirDia(f) === "ll") { guardar(); resultados = {}; document.getElementById("tj-calmsg").textContent = "Ahora toca tu día de salida"; pintarCal(); pintar(); }
          else { guardar(); pintarCal(); pintar(); verCal(false); consultar(); }
        }
      });
      document.getElementById("tj-h").addEventListener("change", function () { busq.h = this.value; guardar(); consultar(); });
    }
    llamarSWR("alojamientos", {}, function (d) {
      alojamientos = d.alojamientos;
      aloj = alojamientos.filter(function (x) { return x.propiedad === PROP; })[0] || null;
      if (aloj) { limitarHu(document.getElementById("tj-h"), aloj.capacidad); }
      var tiles = document.getElementById("tj-tiles");
      if (tiles && aloj) { tiles.innerHTML = (aloj.iconos || []).map(function (x) { return "<div>" + icono(x.i) + "<span>" + esc(x.t) + "</span></div>"; }).join(""); }
      if (CEL && aloj) {
        document.getElementById("tj-dist").textContent = (aloj.distrito ? aloj.distrito + " · " : "") + "Lima";
        document.getElementById("tj-nota").innerHTML = aloj.nota ? "<span class=\"estr\">★</span> <b>" + esc(nota(aloj.nota)) + "</b> · " + esc(aloj.resenas) + " reseñas" : "";
        document.getElementById("tj-nom").textContent = aloj.nombre;
        document.getElementById("tj-ico").innerHTML = (aloj.iconos || []).map(function (x) { return "<div>" + icono(x.i) + esc(x.t) + "</div>"; }).join("");
      }
      pintar();
    });
    if (document.getElementById("tj-rs")) {
      llamarSWR("resenas", { propiedad: PROP }, function (d) {
        var r = (d.items || [])[0]; if (!r) { return; }
        var t = r.texto.length > 120 ? r.texto.slice(0, 117).replace(/\s+\S*$/, "") + "…" : r.texto;
        document.getElementById("tj-rs").innerHTML = '<span class="serif">«' + esc(t) + '»</span><small>' + esc(r.nombre) + (r.lugar ? ", " + esc(r.lugar) : "") +
          ' · <span class="estr">★</span> ' + esc(nota(d.nota)) + ' · ' + esc(d.total) + ' reseñas en Airbnb</small>';
      });
    }
    // Ficha rápida: «Reservar» de la franja de abajo sube hasta esta tarjeta y abre su calendario.
    if (caja && !CEL) { FICHA_CAL = function () { var c = document.querySelector(".fd-cols"); if (c) { c.scrollIntoView({ behavior: "smooth" }); } verCal(true); }; }
    pintar();
    consultar();
  }

  // ───────── ficha completa (web nueva, 16-11-2026) ─────────
  // `?modo=detalle&p=CODIGO`: lo que va debajo de las fotos, como en Airbnb. Se dibuja a un ancho fijo
  // (1181 px en computadora, 375 en celular) y se escala con `zoom` al ancho real del recuadro: Wix
  // agranda el alto del recuadro en la misma proporción que el ancho, así el contenido siempre calza.
  var ICONOS2 = {
    parrilla: '<path d="M4 10h16a8 8 0 0 1-16 0zM8 18l-2 4M16 18l2 4M9 6c0-1 1-1 1-2M13 6c0-1 1-1 1-2"/>',
    balcon: '<path d="M4 11h16M5 11v9M19 11v9M9 11v9M14 11v9M4 20h16M7 11V4h10v7"/>',
    playa: '<path d="M3 20h18M6 20c2-5 6-8 12-8M12 4v8M12 4c-3 0-5 2-5 4M12 4c3 0 5 2 5 4"/>',
    cama: '<path d="M3 18v-7h18v7M3 14h18M6 11V8h5v3M13 11V8h5v3M3 18v2M21 18v2"/>',
    lugar: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    cocina: '<path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8a2 2 0 0 1-2 2M7 3v6M17 3c-2 2-2 6 0 8v10"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M8 21h8"/>',
    lavadora: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M7 6.5h2"/>',
    trabajo: '<rect x="3" y="5" width="18" height="11" rx="1"/><path d="M2 19h20"/>',
    toalla: '<path d="M6 4h12v16H6zM6 9h12"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    escudo: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    salida: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    personas: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5.5"/>',
    campana: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 11V9M10 9h4"/>',
    camara: '<path d="M4 7h11v10H4zM15 10l5-3v10l-5-3"/>',
    humo: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    maleta: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V5h6v3"/>',
    auto: '<path d="M4 17v-6l2-5h12l2 5v6M4 12h16"/><circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>'
  };
  function ico(k, t) { return '<svg width="' + (t || 26) + '" height="' + (t || 26) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONOS2[k] || ICONOS[k] || "") + '</svg>'; }
  var ASSET = "/assets/zienna/disponibilidad/";
  // Deja en el selector solo 1..capacidad del alojamiento (Hugo, 16-11-2026: SI2105 admite 2).
  function limitarHu(sel, max) {
    if (!sel || !max) { return; }
    var h = Math.min(+busq.h || 2, max), s = "";
    for (var i = 1; i <= max; i++) { s += '<option value="' + i + '"' + (i === h ? " selected" : "") + '>' + i + (i === 1 ? " huésped" : " huéspedes") + '</option>'; }
    sel.innerHTML = s;
    if (+busq.h !== h) { busq.h = h; guardar(); }
  }
  function estrellas(n) { var s = ""; for (var i = 0; i < 5; i++) { s += i < Math.round(n) ? "★" : "☆"; } return s; }
  function miles(n) { return Number(n).toLocaleString("es-PE"); }
  // Escala a lo ancho (BASE → ancho del recuadro de Wix) y, si aun así el contenido no entra en el alto del
  // recuadro, achica lo justo para que se vea completo. Hugo vio el texto del barrio cortado (17-11-2026):
  // en su computadora la letra ocupaba unos px más que en la medición; así nunca se come el final.
  function escaladoQueEntra(BASE) {
    // Se mide TODO con zoom 1 (ancho fijo = BASE) y recién después se aplica el zoom. Antes se medía con el zoom
    // ya puesto y Safari del iPhone devuelve esas medidas en otra escala: creía que no entraba, achicaba de más y
    // quedaban márgenes blancos a los lados y un vacío abajo (Hugo, 17-11-2026).
    function escalar() {
      var raiz = document.documentElement;
      app.style.width = BASE + "px"; app.style.maxWidth = "none";
      app.style.marginLeft = app.style.marginRight = "auto";  // si se achica, el espacio sobrante queda repartido a los lados
      if (window.top !== window) { raiz.style.overflow = "hidden"; }  // dentro de Wix nunca una barra de desplazamiento
      raiz.style.zoom = "1";
      var z = window.innerWidth / BASE, alto = window.innerHeight - 2;
      if (app.firstElementChild && alto > 0) {
        var natural = app.getBoundingClientRect().bottom + (window.scrollY || 0);
        // Solo si falta poco (hasta 15 %): abierta sola, fuera de Wix, la página es más alta que la ventana y no se toca.
        if (natural * z > alto && alto / (natural * z) >= 0.85) { z = alto / natural; }
      }
      raiz.style.zoom = String(z);
    }
    // Cambiar el zoom puede disparar «resize» en Safari: se ignoran los avisos que llegan justo después de escalar.
    var quieto = 0;
    function alCambiar() { if (Date.now() - quieto < 400) { return; } escalar(); quieto = Date.now(); }
    escalar(); quieto = Date.now();
    window.addEventListener("resize", alCambiar); window.addEventListener("load", escalar);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(escalar); }
    return escalar;
  }
  function modoDetalle(caja) {
    var app = caja || APP;
    var CEL = esCelular(6);
    var BASE = CEL ? 375 : 1181;
    var escalar = caja ? function () {} : escaladoQueEntra(BASE);  // la ficha rápida no se escala: es la página misma
    document.body.className += CEL ? " fd-en-cel" : " fd-en-pc";
    app.innerHTML = '<p class="dz-nota" style="padding:20px">Cargando…</p>';
    var ultimo = "";
    llamarSWR("ficha", { propiedad: PROP }, function (f) {
      var j = JSON.stringify(f); if (j === ultimo) { return; } ultimo = j;  // la guardada y la fresca iguales: no se repinta
      var r = f.resenas || {}, an = f.anfitrion || {}, n = r.nota ? nota(r.nota) : "";
      // Sello propio de Zienna (etiqueta negra con el logo), elegido por Hugo el 16-11-2026: nada de laureles.
      var sello = '<div class="fd-sello">' + (r.favorito ? '<div class="fd-sello-tag"><img src="' + ASSET + 'zienna_icono_blanco.png" alt=""><span>Favorito de<br>los huéspedes</span></div>' : '') +
        '<div class="fd-sello-ns"><div class="fd-sello-n fd-ir"><b>' + esc(n) + '</b><span class="estr">' + estrellas(r.nota) + '</span></div><div class="fd-sello-sep"></div><a class="fd-sello-n fd-ir" href="#fd-resenas"><b>' + esc(r.total) + '</b><span><u>Reseñas</u></span></a></div></div>';
      var anfit = '<div class="fd-host"><div class="fd-av fd-av-z"><img src="' + ASSET + 'zienna_icono.png" alt="Zienna"></div><div><b>Anfitrión: ' + esc(an.nombre) + '</b><span>' + esc(an.insignia) + ' · ' + esc(an.anios) + ' años recibiendo huéspedes · ' + miles(an.resenas) + ' reseñas</span></div></div>';
      // Resumen de lo que destacan los huéspedes (opción B de Hugo, 17-11-2026): íconos dorados y una cita real.
      var dest = '<div class="fd-dest">' + f.destacados.map(function (x) {
        // Sin citas (Hugo, 17-11-2026: «mucho texto»).
        return '<div>' + ico(x.i) + '<div><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></div></div>';
      }).join("") + '</div>';
      // «El espacio»: el texto de la página original de cada alojamiento (Hugo, 17-11-2026).
      var desc = '<h2>El espacio</h2><div class="fd-desc">' + f.descripcion.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + '</div>';
      // Tira de fotos del dormitorio; al tocar una se ve en grande (Hugo, 16-11-2026).
      var grupos = { dormir: [], galeria: [] }, grandes = grupos.dormir;
      var dormir = '<h2>Dónde vas a dormir</h2>' + f.dormir.map(function (x) {
        var fs = x.fotos && x.fotos.length ? x.fotos : [{ m: x.foto, g: x.foto }];
        return '<div class="fd-tira-w"><div class="fd-tira">' + fs.map(function (ft, k) { grandes.push(ft.g); return '<button type="button" class="fd-tira-f" data-grp="dormir" data-g="' + (grandes.length - 1) + '"' + (CEL && k === 3 && fs.length > 4 ? ' data-mas="+' + (fs.length - 4) + '"' : '') + ' aria-label="Ver foto en grande"><img src="' + esc(ft.m) + '" alt="' + esc(x.t) + '" loading="lazy"></button>'; }).join("") +
          '</div>' + (CEL ? '' : '<button type="button" class="fd-tira-fl fd-tira-a" data-tira="-1" aria-label="Fotos anteriores">‹</button><button type="button" class="fd-tira-fl fd-tira-s" data-tira="1" aria-label="Más fotos">›</button>') +
          '</div><div class="fd-tira-t"><b>' + esc(x.t) + '</b><span>' + esc(x.d) + ' · ' + fs.length + ' fotos</span></div>';
      }).join("");
      var serv = '<h2>Lo que este lugar ofrece</h2><div class="fd-serv">' + f.servicios.map(function (x) { return '<div>' + ico(x.i, 24) + '<span>' + esc(x.t) + '</span></div>'; }).join("") + '</div>';
      var cats = (r.categorias || []).map(function (c) {
        return '<div class="fd-bar"><span>' + esc(c[0]) + '</span><i><em style="width:' + Math.round(c[1] / 5 * 100) + '%"></em></i><b>' + esc(nota(c[1].toFixed(1))) + '</b></div>';
      }).join("");
      var revs = (r.items || []).map(function (x) {
        return '<div class="fd-rev"><div class="fd-rev-q"><span class="fd-rev-av">' + esc((x.nombre || "?").charAt(0)) + '</span><div><b>' + esc(x.nombre) + '</b><span>' + esc([x.lugar, x.fecha].filter(Boolean).join(" · ")) + '</span></div></div>' +
          '<div class="fd-rev-e">★★★★★</div><p>' + esc(x.texto) + '</p></div>';
      }).join("");
      // Puntaje «editorial con barras» (opción 3 de Hugo): número grande y fino, y las categorías como barras.
      var bloqueNota = '<div class="fd-ed"><div class="fd-ed-n"><b>' + esc(n) + '</b><div><div class="fd-ed-e">★★★★★</div><div class="fd-ed-c">' + esc(r.total) + ' reseñas en Airbnb</div>' +
        (r.favorito ? '<span class="fd-ed-f">Favorito de los huéspedes</span>' : '') + '</div></div><div class="fd-bars">' + cats + '</div></div>';
      var resenas = '<section class="fd-sec fd-resenas" id="fd-resenas">' + bloqueNota + '<div class="fd-revs">' + revs + '</div>' + (CEL && (r.items || []).length > 3 ? '<button type="button" class="fd-mas">Ver las ' + r.items.length + ' reseñas</button>' : '') + '<p class="fd-legal">Reseñas reales de huéspedes en Airbnb, tal cual las escribieron.</p></section>';
      // Conoce a tu anfitrión, opción A de Hugo (17-11-2026): carta de bienvenida (sin firma desde el 17-11, noche).
      var host = '<section class="fd-sec"><h2>Conoce a tu anfitrión</h2><div class="fd-carta"><img class="fd-carta-logo" src="' + ASSET + 'zienna_logo.png" alt="Zienna living &amp; aparts">' +
        '<div><div class="fd-carta-t">' + esc(an.titulo || "Bienvenido") + '</div><p>' + esc(an.texto) + '</p>' + (an.firma ? '<div class="fd-carta-f">' + esc(an.firma) + '</div>' : '') +
        '<div class="fd-carta-p"><span><b>' + miles(an.resenas) + '</b> reseñas</span><span><b>' + esc(nota(an.nota)) + '</b> <span class="estr">★</span></span><span><b>' + esc(an.anios) + '</b> años</span>' +
        '<span>Responde en <b>' + (an.tiempo === "menos de una hora" ? "&lt; 1 h" : esc(an.tiempo)) + '</b></span><span><b>' + esc(an.insignia) + '</b></span></div></div></div></section>';
      // «Lo que debes saber», opción C de Hugo (17-11-2026): cada línea con su ícono en un cuadrito dorado claro.
      var saber = '<section class="fd-sec"><h2>Lo que debes saber</h2><div class="fd-saber fd-saber-c">' + f.saber.map(function (s) {
        return '<div><b>' + esc(s.t) + '</b>' + s.items.map(function (x) { var it = typeof x === "string" ? { i: "", t: x } : x; return '<span>' + (it.i ? '<i>' + ico(it.i, 18) + '</i>' : '') + esc(it.t) + '</span>'; }).join("") + '</div>';
      }).join("") + '</div></section>';
      var cab = '<div class="fd-cab">' + (CEL ? '<h1 class="serif">' + esc(f.titulo) + '</h1>' : '') + '<div class="fd-sub">' + esc(f.subtitulo) + '</div><div class="fd-datos">' + esc(f.datos) + '</div></div>';
      var izq = cab + sello + anfit + '<hr>' + dest + '<hr>' + desc + '<hr>' + dormir + '<hr>' + serv;
      // Celular: todas las fotos arriba, para deslizar de izquierda a derecha (Hugo, 17-11-2026).
      var gal = "";
      if (CEL && f.galeria && f.galeria.length) {
        gal = '<div class="fd-gal"><div class="fd-gal-tira" id="fd-gal">' + f.galeria.map(function (x, k) {
          grupos.galeria.push(x.g);
          // Hugo (18-11-2026, tarde): la foto de arriba vuelve a deslizarse de izquierda a derecha (solo la foto; la página
          // sigue sin moverse de lado). Desde la 3.ª foto se cargan al llegar a ellas.
          return '<button type="button" class="fd-gal-f" data-grp="galeria" data-g="' + k + '" aria-label="Ver foto ' + (k + 1) + ' en grande"><img src="' + esc(x.m) + '" alt="Foto ' + (k + 1) + '"' + (k > 1 ? ' loading="lazy"' : '') + '></button>';
        }).join("") + '</div><button type="button" class="fd-gal-fl fd-gal-ant" id="fd-gal-ant" aria-label="Foto anterior" hidden>‹</button>' +
          '<button type="button" class="fd-gal-fl fd-gal-sig" id="fd-gal-sig" aria-label="Foto siguiente"' + (f.galeria.length > 1 ? '' : ' hidden') + '>›</button><span class="fd-gal-n" id="fd-gal-n">1 / ' + f.galeria.length + '</span><a class="fd-gal-todas" target="_top" href="' + esc(urlGaleria(f)) + '">Ver las ' + f.galeria.length + ' fotos</a></div>';
      }
      // El barrio, con el texto de la página original, al final: justo encima de «Ubicación» de Wix (Hugo, 17-11-2026).
      var barrio = f.barrio ? '<section class="fd-sec fd-barrio"><h2>' + esc(f.barrio.t) + '</h2><p>' + esc(f.barrio.d) + '</p></section>' : '';
      app.innerHTML = CEL
        ? gal + '<div class="fd fd-cel' + (gal ? ' fd-sobre' : '') + '">' + izq + resenas + host + saber + barrio + '</div>'
        : '<div class="fd fd-pc">' + cabeceraHTML(f) + '<div class="fd-cols"><div class="fd-izq">' + izq + '</div><div class="fd-der"></div></div>' + resenas + host + saber + '<div class="fd-ft">' + fotosHTML(f) + '</div>' + barrio + '</div>';
      if (!CEL) { armarCabecera(f); armarFotos(); armarTiras(); }
      if (FICHA_HOOK) { FICHA_HOOK(); }
      escalar(); setTimeout(escalar, 600);
      // Vista en grande. El recuadro de Wix es tan alto como la ficha, así que un «position: fixed» quedaría
      // fuera de la pantalla: la foto se abre a la altura de la tira que se tocó.
      var galT = document.getElementById("fd-gal");
      // Flechas sobre la foto (Hugo, 18-11-2026: «con su flechita, para que se note que se desliza»).
      if (galT) {
        var gAnt = document.getElementById("fd-gal-ant"), gSig = document.getElementById("fd-gal-sig");
        galT.addEventListener("scroll", function () {
          var i = Math.round(galT.scrollLeft / galT.clientWidth);
          document.getElementById("fd-gal-n").textContent = (i + 1) + " / " + grupos.galeria.length;
          gAnt.hidden = i <= 0; gSig.hidden = i >= grupos.galeria.length - 1;
        }, { passive: true });
        gAnt.addEventListener("click", function () { galT.scrollBy({ left: -galT.clientWidth, behavior: "smooth" }); });
        gSig.addEventListener("click", function () { galT.scrollBy({ left: galT.clientWidth, behavior: "smooth" }); });
      }
      function armarTiras() {
        document.querySelectorAll(".fd-tira-w").forEach(function (w) {
          var tira = w.querySelector(".fd-tira"), a = w.querySelector(".fd-tira-a"), sg = w.querySelector(".fd-tira-s");
          function flechas() { a.style.visibility = tira.scrollLeft > 4 ? "visible" : "hidden"; sg.style.visibility = tira.scrollLeft + tira.clientWidth < tira.scrollWidth - 4 ? "visible" : "hidden"; }
          tira.addEventListener("scroll", flechas); flechas();
        });
      }
      app.onclick = function (ev) {
        var fl = ev.target.closest("[data-tira]");
        if (fl) { ev.preventDefault(); fl.parentNode.querySelector(".fd-tira").scrollBy({ left: +fl.getAttribute("data-tira") * 420, behavior: "smooth" }); return; }
        var mas = ev.target.closest(".fd-mas");
        if (mas) { mas.previousElementSibling.classList.add("todas"); mas.remove(); return; }
        var ir = ev.target.closest(".fd-ir");
        if (ir) { ev.preventDefault(); irAResenas(); return; }
        var t = ev.target.closest("[data-grp]");
        if (t) { abrir(t.getAttribute("data-grp"), +t.getAttribute("data-g"), t); }
      };
      // «11 Reseñas»: en Chrome la ficha puede bajar la página de Wix (scrollIntoView sube al padre), pero
      // Safari del iPhone no deja que un recuadro de otro dominio mueva la página de afuera y no pasaba
      // nada (Hugo, 17-11-2026). Se mira con IntersectionObserver si la parte visible cambió; si no se
      // movió, las reseñas se abren en una hoja encima, en la parte de la ficha que se está viendo.
      function vista(cb) { var o = new IntersectionObserver(function (es) { o.disconnect(); cb(es[0]); }); o.observe(app); }
      function irAResenas() {
        if (!window.IntersectionObserver) { abrirResenas(0, 0); return; }
        vista(function (a) {
          document.getElementById("fd-resenas").scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(function () {
            vista(function (b) {
              if (Math.abs(b.intersectionRect.top - a.intersectionRect.top) > 4) { return; }  // sí bajó
              var H = app.offsetHeight, br = b.boundingClientRect.height || 1;
              abrirResenas((b.intersectionRect.top - b.boundingClientRect.top) / br * H, b.intersectionRect.height / br * H);
            });
          }, 350);
        });
      }
      function abrirResenas(arriba, alto) {
        cerrar();
        var lb = document.createElement("div"); lb.id = "fd-lb"; lb.className = "fd-lb";
        lb.innerHTML = '<div class="fd-rs"><div class="fd-rs-cab"><b>Reseñas</b><button type="button" class="fd-lb-x" aria-label="Cerrar">×</button></div><div class="fd-rs-cuerpo">' + document.getElementById("fd-resenas").innerHTML + '</div></div>';
        document.body.appendChild(lb);
        lb.style.height = document.documentElement.scrollHeight + "px";
        var hoja = lb.querySelector(".fd-rs"), m = CEL ? 8 : 40;
        hoja.style.top = (arriba + m) + "px";
        if (alto > 200) { hoja.style.maxHeight = (alto - 2 * m - (CEL ? 90 : 0)) + "px"; }  // en celular, sin tapar la barra de abajo
        lb.addEventListener("click", function (ev) { ev.stopPropagation(); if (ev.target.closest(".fd-lb-x") || ev.target === lb) { cerrar(); } });
      }
      // Visor en grande: sus botones tienen su propio manejador (antes dependían del de la ficha y no
      // respondían: el fondo oscuro tapaba todo y parecía que la página se había colgado — Hugo, 17-11-2026).
      var lbGrp = "dormir", lbI = 0;
      function mover(k) { var g = grupos[lbGrp]; mostrar((lbI + k + g.length) % g.length); }
      function cerrar() { var l = document.getElementById("fd-lb"); if (l) { l.remove(); } }
      function mostrar(i) { lbI = i; document.getElementById("fd-lb-img").src = grupos[lbGrp][i]; document.getElementById("fd-lb-n").textContent = (i + 1) + " / " + grupos[lbGrp].length; }
      function abrir(grp, i, desde) {
        cerrar(); lbGrp = grp;
        var lb = document.createElement("div"); lb.id = "fd-lb"; lb.className = "fd-lb";
        lb.innerHTML = '<div class="fd-lb-caja"><img id="fd-lb-img" alt="Foto en grande"><button type="button" class="fd-lb-x" aria-label="Cerrar">×</button>' +
          '<button type="button" class="fd-lb-a" aria-label="Foto anterior">‹</button><button type="button" class="fd-lb-s" aria-label="Foto siguiente">›</button><span class="fd-lb-n" id="fd-lb-n"></span></div>';
        document.body.appendChild(lb);
        lb.style.height = document.documentElement.scrollHeight + "px";
        var caja = lb.querySelector(".fd-lb-caja");
        var y = 0; for (var el = desde; el; el = el.offsetParent) { y += el.offsetTop; }  // en px sin zoom
        caja.style.top = Math.max(0, y - (CEL ? 40 : 140)) + "px";
        lb.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (ev.target.closest(".fd-lb-x") || ev.target === lb) { cerrar(); }
          else if (ev.target.closest(".fd-lb-a")) { mover(-1); }
          else if (ev.target.closest(".fd-lb-s")) { mover(1); }
        });
        var x0 = null;
        caja.addEventListener("touchstart", function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
        caja.addEventListener("touchend", function (ev) { if (x0 === null) { return; } var dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) { mover(dx < 0 ? 1 : -1); } });
        mostrar(i);
      }
      document.addEventListener("keydown", function (ev) {
        if (!document.getElementById("fd-lb")) { return; }
        if (ev.key === "Escape") { cerrar(); } else if (ev.key === "ArrowRight") { mover(1); } else if (ev.key === "ArrowLeft") { mover(-1); }
      });
    }, function (e) { app.innerHTML = '<p class="dz-nota">' + esc(e.message) + '</p>'; });
  }

  // ───────── cierre de la ficha (bajo «Ubicación»), 16-11-2026 ─────────
  // `?modo=cierre&p=CODIGO`: franja «Reserva directo y paga 20 % menos» con fechas y «Reservar», y 4 alojamientos más de
  // Zienna para que el huésped no se vaya si estas fechas no le sirven. Mismo escalado que la ficha.
  function modoCierre(caja) {
    var app = caja || APP;
    var CEL = esCelular(1);
    var BASE = CEL ? 375 : 1181, datos = null;
    function escalar() { document.documentElement.style.zoom = String(window.innerWidth / BASE); }
    if (!caja) { escalar(); window.addEventListener("resize", escalar); }
    var NOTA = "Aún no se te cobra nada. Primero confirmamos tus fechas.";
    function este() { return datos ? datos.alojamientos.filter(function (x) { return x.propiedad === PROP; })[0] : null; }
    // Titular de la franja (Hugo eligió la opción A el 17-11-2026: el descuento en números llama más que
    // «¿Te imaginas aquí?», que queda solo si el servidor no manda descuento).
    function titular() { var dz = datos && datos.descuento; return dz ? "Reserva directo y paga " + dz.pct + " % menos" : "¿Te imaginas aquí?"; }
    // Franja con el titular + otros alojamientos. Un solo botón «Reservar» (Hugo, 16-11-2026).
    function dibujar() {
      var e = este();
      var resto = datos.alojamientos.filter(function (x) { return x.propiedad !== PROP && x.foto; }), vistos = {}, otros = [];
      resto.forEach(function (x) { if (!vistos[x.distrito]) { vistos[x.distrito] = 1; otros.push(x); } });
      resto.forEach(function (x) { if (otros.indexOf(x) < 0) { otros.push(x); } });
      var h = '<div class="fc ' + (CEL ? "fc-cel" : "fc-pc") + '"><div class="fc-band"><img src="' + ASSET + 'zienna_icono_blanco.png" alt=""><div class="fc-txt"><b>' + esc(titular()) + '</b><span>' +
        (datos && datos.descuento ? "Promoción exclusiva a partir de " + datos.descuento.noches + " noches." : (e ? "Desde " + desdeTachado(e.desde) + " la noche · " : "") + "Llegada con tu propia clave · Aún no se te cobra nada") + '</span></div>' +
        '<div class="fc-btns"><a class="fc-r" id="fc-r" target="_top" href="' + esc(urlFechas()) + '">Reservar</a></div></div>';
      if (otros.length) {
        // Carrusel (Hugo, 17-11-2026): todos los demás alojamientos, de izquierda a derecha.
        h += '<div class="fc-otros"><div class="fc-otros-h"><h2>Otros alojamientos de Zienna</h2><span class="fc-nav"><a target="_top" href="' + esc(LISTADO) + '">Ver los ' + datos.alojamientos.length + '</a>' +
          (CEL ? '' : '<button type="button" class="fc-fl" data-mov="-1" aria-label="Anteriores">‹</button><button type="button" class="fc-fl" data-mov="1" aria-label="Siguientes">›</button>') + '</span></div><div class="fc-grid" id="fc-grid">';
        h += otros.map(function (a) {
          return '<a class="fc-card" target="_top" href="' + esc(urlFicha(a)) + '"><span class="fc-img" style="background-image:url(\'' + esc(a.foto) + '\')"></span><b>' + esc(a.titulo_web || a.titulo || a.nombre) + '</b><span>' +
            (a.nota ? '<span class="estr">★</span> ' + esc(nota(a.nota)) + " · " : "") + "desde " + desdeTachado(a.desde) + " noche" + '</span></a>';
        }).join("");
        h += '</div>' + (CEL ? '<div class="fc-puntos" id="fc-puntos">' + otros.map(function (_, k) { return '<i' + (k ? '' : ' class="on"') + '></i>'; }).join("") + '</div>' : '') + '</div>';
      }
      app.innerHTML = h + '</div>';
      var gr = document.getElementById("fc-grid");
      if (gr) {
        gr.addEventListener("scroll", function () {
          var c = gr.querySelector(".fc-card"); if (!c) { return; }
          var paso = c.offsetWidth + 16, k = Math.round(gr.scrollLeft / paso), pts = document.getElementById("fc-puntos");
          if (pts) { [].forEach.call(pts.children, function (p, z) { p.className = z === k ? "on" : ""; }); }
          [].forEach.call(document.querySelectorAll(".fc-fl"), function (b) { b.disabled = b.getAttribute("data-mov") === "-1" ? gr.scrollLeft < 5 : gr.scrollLeft + gr.clientWidth > gr.scrollWidth - 5; });
        });
        gr.dispatchEvent(new Event("scroll"));
      }
      // Con fechas libres ya elegidas, «Reservar» va directo a la solicitud.
      if (busq.ll && busq.sa) {
        llamarSWR("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }, function (r) {
          var f = r.resultados.filter(function (x) { return x.propiedad === PROP; })[0], b = document.getElementById("fc-r");
          if (f && f.libre && b) { resultados[PROP] = f; b.href = urlSolicitud(PROP); }
        });
      }
    }
    // Computadora: el mismo recuadro se vuelve calendario + resumen, sin salir de la ficha.
    function panel() {
      var e = este(), sel = "";
      for (var i = 1; i <= 4; i++) { sel += '<option value="' + i + '"' + ((+busq.h || 2) === i ? " selected" : "") + '>' + i + (i === 1 ? " huésped" : " huéspedes") + '</option>'; }
      app.innerHTML = '<div class="fc fc-pc"><div class="fc-panel"><div class="fc-cal"><b class="fc-calmsg" id="fc-calmsg"></b><div id="zf-cal"></div></div>' +
        '<div class="fc-lado"><img src="' + ASSET + 'zienna_icono.png" alt=""><h3>' + esc(titular()) + '</h3>' +
        '<div class="fc-fe"><div><span>Llegada</span><b id="fc-ll"></b></div><div><span>Salida</span><b id="fc-sa"></b></div></div>' +
        '<label class="fc-hu"><span>Huéspedes</span><select id="fc-h">' + sel + '</select></label>' +
        '<div class="fc-total" id="fc-total">' + (e ? "Desde " + desdeTachado(e.desde) + " la noche" : "") + '</div>' +
        '<a class="fc-ir" id="fc-ir" target="_top" href="#">Reservar</a><p class="fc-msg" id="fc-msg">' + NOTA + '</p>' +
        '<button type="button" class="fc-volver" id="fc-volver">← Volver</button></div></div></div>';
      if (busq.ll) { mesCal = busq.ll.slice(0, 7); }
      if (e) { limitarHu(document.getElementById("fc-h"), e.capacidad); }
      pintarPanel(); cargarMes();
      document.getElementById("fc-h").addEventListener("change", function () { busq.h = this.value; guardar(); consultar(); });
      consultar();
    }
    function pintarPanel() {
      var m = document.getElementById("fc-calmsg"); if (!m) { return; }
      m.textContent = busq.ll && !busq.sa ? "Ahora toca tu día de salida" : busq.ll && busq.sa ? "Tus fechas" : "Toca tu día de llegada";
      document.getElementById("fc-ll").textContent = busq.ll ? corto(busq.ll) : "Agregar fecha";
      document.getElementById("fc-sa").textContent = busq.sa ? corto(busq.sa) : "Agregar fecha";
    }
    function consultar() {
      var ir = document.getElementById("fc-ir"), msg = document.getElementById("fc-msg"), tot = document.getElementById("fc-total"), e = este();
      if (!ir) { return; }
      ir.href = "#"; ir.classList.add("off"); msg.className = "fc-msg"; msg.textContent = NOTA;
      tot.innerHTML = e ? "Desde " + desdeTachado(e.desde) + " la noche" : "";
      if (!busq.ll || !busq.sa) { return; }
      llamarSWR("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }, function (d) {
        if (d.llegada !== busq.ll || d.salida !== busq.sa) { return; }
        var f = d.resultados.filter(function (x) { return x.propiedad === PROP; })[0];
        if (f && f.libre) {
          resultados[PROP] = f; tot.innerHTML = precioTachado(f) + " por " + f.noches + (f.noches === 1 ? " noche" : " noches") + conDesc(f);
          ir.href = urlSolicitud(PROP); ir.classList.remove("off");
        } else if (f) {
          msg.className = "fc-msg no";
          msg.textContent = f.motivo === "minimo" ? "Para esas fechas pedimos al menos " + f.minimo + " noches." : f.motivo === "capacidad" ? "Este alojamiento admite hasta " + f.capacidad + " huéspedes." : "Esas fechas no están libres. Elige otras.";
        }
      }, function (er) { msg.className = "fc-msg no"; msg.textContent = er.message; });
    }
    app.onclick = function (ev) {
      var fl = ev.target.closest(".fc-fl"), gr = document.getElementById("fc-grid");
      if (fl && gr) { var c = gr.querySelector(".fc-card"); gr.scrollBy({ left: (+fl.getAttribute("data-mov")) * (c ? c.offsetWidth + 16 : 300) * 2, behavior: "smooth" }); return; }
      var r = ev.target.closest("#fc-r");
      if (r && !CEL && r.getAttribute("href") === urlFechas()) { ev.preventDefault(); if (caja && FICHA_CAL) { FICHA_CAL(); } else { panel(); } return; }
      if (ev.target.closest("#fc-volver")) { dibujar(); return; }
      var ir = ev.target.closest("#fc-ir");
      if (ir && ir.getAttribute("href") === "#") { ev.preventDefault(); return; }
      var t = ev.target.closest("button"), cal = document.getElementById("zf-cal");
      if (!t || !cal || !cal.contains(t)) { return; }
      if (t.hasAttribute("data-nav")) { mesCal = sumaMes(mesCal, +t.getAttribute("data-nav")); cargarMes(); }
      else if (t.hasAttribute("data-f")) {
        var f = t.getAttribute("data-f");
        elegirDia(f);
        guardar(); resultados = {}; pintarCal(); pintarPanel(); consultar();
      }
    };
    llamarSWR("alojamientos", {}, function (d) { datos = d; alojamientos = d.alojamientos; if (!document.getElementById("fc-ir")) { dibujar(); } });
  }

  // ───────── botón flotante de WhatsApp ─────────
  // Quitado el 29-10-2026 (Hugo: llegaban mensajes y la gente no respondía). El recuadro que
  // quede en Wix se ve vacío; el modo se deja para que ese recuadro no dé error.
  function modoWhatsapp() { app.innerHTML = ""; }

  // ───────── reseñas de huéspedes (cada ficha) ─────────
  function modoResenas() {
    llamarSWR("resenas", { propiedad: PROP }, function (d) {
      var h = '<section class="rs"><div class="rs-cab"><div class="rs-nota"><span class="serif">' + String(d.nota).replace(".", ",") + '</span><i class="rs-est" aria-hidden="true">★★★★★</i></div>' +
        '<div class="rs-tit"><b>Lo que dicen nuestros huéspedes</b><small>' + d.total + ' reseñas en Airbnb · estas son algunas de 5 estrellas</small></div></div><div class="rs-lista">';
      d.items.forEach(function (r) {
        h += '<figure class="rs-card"><i class="rs-est" aria-hidden="true">★★★★★</i><blockquote>' + esc(r.texto) + '</blockquote>' +
          '<figcaption><b>' + esc(r.nombre) + '</b>' + (r.lugar ? ' · ' + esc(r.lugar) : '') + '<small>' + esc(r.fecha) + '</small></figcaption></figure>';
      });
      h += '</div><p class="rs-nota-pie">Reseñas reales de huéspedes en Airbnb, mostradas tal cual las escribieron. Algunas fueron traducidas automáticamente por Airbnb.</p></section>';
      app.innerHTML = h;
    });
  }

  // ───────── solicitud de reserva (embudo de 3 pasos, página propia) ─────────
  // Estadía → datos del huésped principal → resumen. Recién al final se abre WhatsApp, con el
  // mensaje que arma el servidor. La solicitud se guarda al pasar del paso 2 al 3.
  var PREFIJOS = [["51", "Perú"], ["1", "EE. UU. / Canadá"], ["54", "Argentina"], ["55", "Brasil"], ["56", "Chile"], ["57", "Colombia"], ["593", "Ecuador"], ["52", "México"],
    ["591", "Bolivia"], ["598", "Uruguay"], ["595", "Paraguay"], ["58", "Venezuela"], ["34", "España"], ["33", "Francia"], ["39", "Italia"], ["44", "Reino Unido"],
    ["49", "Alemania"], ["351", "Portugal"], ["41", "Suiza"], ["31", "Países Bajos"], ["81", "Japón"], ["86", "China"], ["61", "Australia"]];
  var DIAS_C = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  function fechaLarga(f) { var p = partes(f), d = new Date(p.a, p.m - 1, p.d); return DIAS_C[d.getDay()] + " " + p.d + " " + MESES_C[p.m - 1]; }
  function enviarPost(metodo, params, rapido) {
    return fetch(urlApi(metodo), { method: "POST", keepalive: !!rapido, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-Frappe-CSRF-Token": (window.frappe && frappe.csrf_token) || window.csrf_token || "" },
      body: JSON.stringify(params) }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var msg = "No pudimos guardar tu solicitud ahora. Intenta de nuevo o escríbenos por WhatsApp.";
          try { var m = JSON.parse(j._server_messages || "[]"); if (m.length) { msg = JSON.parse(m[0]).message || msg; } } catch (e) {}
          throw new Error(msg.replace(/<[^>]+>/g, ""));
        }
        return j.message;
      });
    });
  }
  function modoSolicitud() {
    anchoPC("#dz-app");
    var ll = Q.get("ll") || "", sa = Q.get("sa") || "", hu = +(Q.get("h") || 2) || 2;
    function aviso(titulo, texto, enlace, etiqueta) {
      app.innerHTML = '<div class="sl"><div class="sl-marca serif">Zienna Living &amp; Aparts</div><h1 class="serif">' + esc(titulo) + '</h1><p class="sl-txt">' + esc(texto) + '</p>' +
        '<a class="dz-wa sl-btn" href="' + esc(enlace) + '">' + esc(etiqueta) + '</a></div>';
    }
    if (!PROP || !ll || !sa || sa <= ll) { aviso("Elige tus fechas", "Para reservar necesitamos el alojamiento y tus fechas de llegada y salida.", LISTADO, "Ver alojamientos"); return; }
    app.innerHTML = '<div class="sl"><p class="sl-txt">Preparando tu solicitud…</p></div>';
    llamar("buscar", { llegada: ll, salida: sa, huespedes: hu }).then(function (d) {
      var f = d.resultados.filter(function (x) { return x.propiedad === PROP; })[0];
      var volver = f && f.ficha ? conFechasURL(FIJAS + "/" + f.ficha + "/") : LISTADO;
      if (!f) { aviso("Alojamiento no disponible", "No encontramos ese alojamiento.", LISTADO, "Ver alojamientos"); return; }
      if (!f.libre) {
        var m = f.motivo === "minimo" ? "Para esas fechas pedimos al menos " + f.minimo + " noches." : f.motivo === "capacidad" ? "Este alojamiento admite hasta " + f.capacidad + " huéspedes." : "Esas fechas ya no están libres.";
        aviso("Esas fechas no se pueden reservar", m + " Elige otras en el calendario.", volver, "Elegir otras fechas"); return;
      }
      rastrear("reservar", { p: PROP, ll: ll, sa: sa, h: hu, libre: 1 });
      pintarSolicitud(f, ll, sa, hu, volver);
    }).catch(function (e) { aviso("No pudimos cargar tu solicitud", e.message, LISTADO, "Ver alojamientos"); });
  }
  function pintarSolicitud(f, ll, sa, hu, volver) {
    var titulo = f.titulo || f.nombre, noches = f.noches + (f.noches === 1 ? " noche" : " noches");
    // Opción B de Hugo (16-11-2026): «Confirma tu estadía» como la confirmación de Airbnb. A la izquierda
    // los pasos; a la derecha (arriba en celular) la tarjeta con foto, nota y detalle del precio.
    var sub = f.subtotal || f.total, precioTxt = f.por_noche * f.noches === sub ? soles(f.por_noche) + " × " + noches : noches;
    var foto = (f.foto || "").replace("w_480,h_320", "w_440,h_360");
    var side = '<aside class="sl-side"><div class="sl-tar"><div class="sl-tar-cab">' + (foto ? '<span class="sl-tar-img" style="background-image:url(\'' + esc(foto) + '\')"></span>' : '') +
      '<div><div class="sl-tar-tipo">' + esc([f.tipo, f.distrito].filter(Boolean).join(" · ")) + '</div><b class="sl-tar-tit">' + esc(titulo) + '</b><div class="sl-tar-nota" id="sl-nota"></div></div></div>' +
      '<hr><b class="sl-tar-h">Detalle del precio</b><div class="sl-tar-f"><u>' + esc(precioTxt) + '</u><span>' + soles(sub) + '</span></div>' +
      (f.descuento ? '<div class="sl-tar-f"><span>' + (f.descuento_motivo === "ultimo_minuto" ? "Descuento de último minuto" : "Descuento reserva directa") + ' (' + f.descuento_pct + ' %)</span><span class="sl-desc">−' + soles(f.descuento) + '</span></div>' : '') +
      '<div class="sl-tar-f"><span>Limpieza</span><span class="sl-incl">Incluida</span></div>' +
      '<div class="sl-tar-tot"><b>Total (PEN)</b><span>' + precioTachado(f) + '</span></div><p class="sl-fin">Es el precio final. No pagas nada más.</p></div></aside>';
    var h = marcoPaso("Alojamientos", volver, true) ? '<div class="sl sl-b">' :
      '<div class="sl sl-b"><div class="sl-cab"><a class="sl-marca" href="' + esc(WEB) + '" target="_top"><img src="' + ASSET + 'zienna_icono.png" alt="">Zienna Living &amp; Aparts</a><a class="sl-volver" href="' + esc(volver) + '" target="_top">← Volver al alojamiento</a></div>';
    h += '<div class="sl-cols">' + side + '<div class="sl-main"><div class="sl-prog"><i class="on" id="sp1"></i><i id="sp2"></i><i id="sp3"></i></div>';
    // paso 1
    var opHu = ""; for (var k = 1; k <= (f.capacidad || 2); k++) { opHu += '<option value="' + k + '"' + (k === hu ? " selected" : "") + '>' + k + (k === 1 ? " huésped" : " huéspedes") + '</option>'; }
    h += '<section id="sl1"><div class="sl-tt"><a class="sl-flecha" href="' + esc(volver) + '" target="_top" aria-label="Volver">‹</a><h1>Confirma tu estadía</h1></div><h2 class="sl-h2">Tu viaje</h2>';
    h += '<div class="sl-it"><div><b>Fechas</b><span>' + corto(ll) + ' – ' + corto(sa) + ' · llegas desde las 3:00 pm, sales hasta las 11:00 am</span></div><a href="' + esc(volver) + '" target="_top">Editar</a></div>';
    h += '<div class="sl-it"><div><b>Huéspedes</b><span id="sl-hu-t"></span><select id="sl-hu" hidden aria-label="Huéspedes">' + opHu + '</select></div><button type="button" id="sl-hu-ed">Editar</button></div>';
    h += '<div class="sl-oro" id="sl-oro" hidden></div>';
    h += '<button type="button" class="dz-wa sl-btn" id="sl-sig1">Continuar</button></section>';
    h += '<section id="sl2" hidden><small class="sl-paso">Paso 2 de 3</small><h1 class="serif">¿Quién se hospeda?</h1><p class="sl-txt">Los datos del huésped principal, tal como figuran en su documento.</p>';
    h += '<form id="sl-form" autocomplete="on" novalidate><div class="sl-fila"><label class="sl-c">Nombre<input id="sl-nom" autocomplete="given-name" maxlength="60" placeholder="María"></label>';
    h += '<label class="sl-c">Apellido<input id="sl-ape" autocomplete="family-name" maxlength="60" placeholder="Torres Ríos"></label></div>';
    h += '<label class="sl-c">Celular (WhatsApp)<span class="sl-fila sl-cel"><select id="sl-pre" aria-label="Prefijo del país">' + PREFIJOS.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + ' (+' + x[0] + ')</option>'; }).join("") + '</select>';
    h += '<input id="sl-cel" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="987 654 321"></span></label>';
    h += '<label class="sl-c">Documento<span class="sl-fila sl-doc"><select id="sl-tdoc" aria-label="Tipo de documento"><option>DNI</option><option>Carné de extranjería</option><option>Pasaporte</option></select>';
    h += '<input id="sl-ndoc" autocomplete="off" maxlength="14" placeholder="Número"></span></label>';
    h += '<div class="sl-oculto" aria-hidden="true"><label>Sitio web<input id="sl-sitio" tabindex="-1" autocomplete="off"></label></div>';
    h += '<details class="sl-reglas"><summary>Reglas de la casa</summary><ul><li>Check-in desde las 3:00 pm y check-out hasta las 11:00 am.</li><li>Máximo ' + f.capacidad + (f.capacidad === 1 ? " huésped" : " huéspedes") + ' en este alojamiento.</li>';
    h += '<li>Todos los huéspedes se registran con su documento antes de llegar.</li><li>Early check-in y late check-out: sujetos a disponibilidad y a un costo adicional.</li></ul></details>';
    h += '<label class="sl-chk"><input type="checkbox" id="sl-reg"><span>Acepto las reglas de la casa.</span></label>';
    h += '<label class="sl-chk"><input type="checkbox" id="sl-dat"><span>Autorizo el uso de estos datos solo para gestionar mi reserva.</span></label>';
    h += '<p class="sl-err" id="sl-err" role="alert"></p><button type="submit" class="dz-wa sl-btn" id="sl-sig2">Revisar solicitud</button><button type="button" class="sl-atras" id="sl-atras2">← Volver</button></form></section>';
    // paso 3
    h += '<section id="sl3" hidden><small class="sl-paso">Paso 3 de 3</small><h1 class="serif">Revisa y envía</h1><div class="sl-resumen" id="sl-res"></div>';
    h += '<a class="sl-btn sl-wa" id="sl-wa" target="_blank" rel="noopener" href="#">Enviar solicitud por WhatsApp</a>';
    h += '<p class="sl-nota" id="sl-fin">Se abrirá WhatsApp con tu solicitud lista. Te respondemos ahí para confirmar la disponibilidad y el pago.</p><button type="button" class="sl-atras" id="sl-atras3">← Corregir mis datos</button></section></div></div></div>';
    app.innerHTML = h;
    var $ = function (id) { return document.getElementById(id); }, guardada = null;
    function ir(n) {
      ["sl1", "sl2", "sl3"].forEach(function (id, i) { $(id).hidden = (i + 1 !== n); $("sp" + (i + 1)).className = (i + 1 <= n) ? "on" : ""; });
      window.scrollTo(0, 0);
    }
    // En celular la tarjeta va debajo del título del paso 1 (como en la maqueta).
    if (window.innerWidth <= 820) { $("sl1").insertBefore(document.querySelector(".sl-side"), $("sl1").querySelector(".sl-h2")); }
    function textoHu() { $("sl-hu-t").textContent = hu + (hu === 1 ? " huésped" : " huéspedes") + " (máximo " + (f.capacidad || 2) + ")"; }
    textoHu();
    $("sl-hu-ed").addEventListener("click", function () { var s = $("sl-hu"); s.hidden = !s.hidden; $("sl-hu-t").hidden = !s.hidden; if (!s.hidden) { s.focus(); } });
    $("sl-hu").addEventListener("change", function () { hu = +this.value; busq.h = hu; guardar(); textoHu(); this.hidden = true; $("sl-hu-t").hidden = false; });
    llamarSWR("alojamientos", {}, function (d) {
      var a = d.alojamientos.filter(function (x) { return x.propiedad === PROP; })[0]; if (!a || !a.nota) { return; }
      $("sl-nota").innerHTML = '<span class="estr">★</span> ' + esc(nota(a.nota)) + (a.resenas ? " (" + esc(a.resenas) + ")" : "") + (a.favorito ? " · <b>Favorito</b>" : "");
      if (a.nota >= 4.8) { $("sl-oro").innerHTML = '<span class="estr">★</span><div><b>Muy pedido.</b> Los huéspedes lo califican con ' + esc(nota(a.nota)) + '; asegura tus fechas.</div>'; $("sl-oro").hidden = false; }
    });
    $("sl-sig1").addEventListener("click", function () { ir(2); });
    $("sl-atras2").addEventListener("click", function () { ir(1); });
    $("sl-atras3").addEventListener("click", function () { ir(2); });
    function revisar() {
      var nom = $("sl-nom").value.trim(), ape = $("sl-ape").value.trim(), pre = $("sl-pre").value, cel = $("sl-cel").value.replace(/\D/g, ""), td = $("sl-tdoc").value, nd = $("sl-ndoc").value.replace(/[\s.\-]/g, "").toUpperCase();
      if (nom.length < 2 || ape.length < 2) { return "Escribe tu nombre y tu apellido."; }
      if (/[\d<>@\/\\_=+*#$%^&{}\[\]|~`;:?!]/.test(nom + ape)) { return "En tu nombre y apellido usa solo letras."; }
      if (pre === "51" ? !/^9\d{8}$/.test(cel) : (cel.length < 6 || cel.length > 12)) { return pre === "51" ? "Revisa tu celular: deben ser 9 dígitos y empezar con 9." : "Revisa tu celular: parece incompleto."; }
      if (td === "DNI" ? !/^\d{8}$/.test(nd) : td === "Pasaporte" ? !/^[A-Z0-9]{6,12}$/.test(nd) : !/^[A-Z0-9]{9,12}$/.test(nd)) { return td === "DNI" ? "El DNI tiene 8 dígitos." : "Revisa el número de tu documento."; }
      if (!$("sl-reg").checked) { return "Acepta las reglas de la casa para continuar."; }
      if (!$("sl-dat").checked) { return "Autoriza el uso de tus datos para continuar."; }
      return "";
    }
    ["sl-nom", "sl-ape", "sl-cel", "sl-ndoc", "sl-pre", "sl-tdoc", "sl-reg", "sl-dat"].forEach(function (id) { $(id).addEventListener("input", function () { $("sl-err").textContent = ""; }); });
    $("sl-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var e = revisar(); if (e) { $("sl-err").textContent = e; return; }
      var b = $("sl-sig2"); b.disabled = true; b.textContent = "Guardando…";
      enviarPost("solicitar", { propiedad: PROP, llegada: ll, salida: sa, huespedes: hu, nombre: $("sl-nom").value, apellido: $("sl-ape").value, prefijo: $("sl-pre").value,
        celular: $("sl-cel").value, tipo_doc: $("sl-tdoc").value, num_doc: $("sl-ndoc").value, reglas: 1, datos: 1, sitio: $("sl-sitio").value }).then(function (r) {
        guardada = r; $("sl-err").textContent = "";
        rastrear("datos", { p: PROP, ll: ll, sa: sa, h: hu, sol: r.codigo }, { value: Number(f.total) || 0, currency: "PEN" });
        $("sl-res").innerHTML = '<div><span>Alojamiento</span><b>' + esc(titulo) + '</b></div><div><span>Fechas</span><span>' + fechaLarga(ll) + ' → ' + fechaLarga(sa) + ' · ' + noches + '</span></div>' +
          '<div><span>Huéspedes</span><span>' + hu + '</span></div><div><span>Total</span><span>' + precioTachado(f) + '</span></div><div><span></span><span class="sl-fin">Precio final, limpieza incluida</span></div><hr><div><span>Huésped</span><span>' + esc($("sl-nom").value.trim() + " " + $("sl-ape").value.trim()) + '</span></div>' +
          '<div><span>' + esc($("sl-tdoc").value) + '</span><span>' + esc($("sl-ndoc").value.trim()) + '</span></div><div><span>Celular</span><span>+' + esc($("sl-pre").value) + ' ' + esc($("sl-cel").value.trim()) + '</span></div><div><span>Solicitud</span><span>' + esc(r.codigo) + '</span></div>';
        $("sl-wa").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(r.texto);
        ir(3);
      }).catch(function (er) { $("sl-err").textContent = er.message; })
        .then(function () { b.disabled = false; b.textContent = "Revisar solicitud"; });
    });
    $("sl-wa").addEventListener("click", function (ev) {
      if (!guardada || $("sl-wa").getAttribute("href") === "#") { ev.preventDefault(); return; }
      enviarPost("solicitud_whatsapp", { codigo: guardada.codigo, celular: $("sl-cel").value }, true).catch(function () {});
      rastrear("whatsapp", { p: PROP, sol: guardada.codigo });
      $("sl-fin").innerHTML = '<b>Solicitud ' + esc(guardada.codigo) + ' enviada.</b> Si WhatsApp no se abrió, <a href="' + esc($("sl-wa").href) + '" target="_blank" rel="noopener">tócalo aquí</a>.';
    });
  }

  // ───────── cabecera y carrusel de fotos de la ficha en computadora (17-11-2026) ─────────
  // Título, nota y mosaico de 5 fotos arriba, y la tira de fotos grandes al final: antes eran elementos de
  // Wix en la página de SI2105; ahora los dibuja la ficha (modo=detalle, solo computadora) para que la página
  // de cada alojamiento sea una copia que solo cambia el código. «Ver las N fotos» o tocar una foto abre
  // las fotos ahí mismo, a todo el ancho del mosaico. `modo=cabecera` y `modo=fotos` los muestran sueltos.
  function cabeceraHTML(f) {
    var r = f.resenas || {}, t = f.titulo || "", corte = t.search(/, | · /), n = (f.galeria || []).length;
    // dónde se parte el título (negrita • resto): la ficha puede decirlo con titulo_partes
    var tit = f.titulo_partes ? '<b>' + esc(f.titulo_partes[0]) + ' •</b> <span>' + esc(f.titulo_partes[1]) + '</span>' : corte > 0 ? '<b>' + esc(t.slice(0, corte)) + ' •</b> <span>' + esc(t.slice(corte + (t.charAt(corte) === "," ? 2 : 3))) + '</span>' : '<b>' + esc(t) + '</b>';
    var lin = [r.nota ? '<span class="estr">★</span> ' + esc(nota(r.nota)) : "", r.total ? esc(r.total) + " reseñas" : "", r.favorito ? "Favorito entre huéspedes" : "", esc(f.lugar || "")].filter(Boolean).join(" · ");
    // «Ver las N fotos» y cada foto del mosaico abren la página de todas las fotos (modo=galeria), en la misma
    // pestaña (Hugo, 17-11-2026: el visor dentro del mosaico «se ve feo»).
    var mos = (f.mosaico || []).map(function (x, i) { return '<a class="cb-f cb-f' + i + '" target="_top" href="' + esc(urlGaleria(f, x.g)) + '" style="background-image:url(\'' + esc(x.m) + '\')" aria-label="Ver foto"></a>'; }).join("");
    return '<div class="cb"><h1 class="cb-t">' + tit + '</h1><p class="cb-r">' + lin + '</p><div class="cb-mos" id="cb-mos">' + mos +
      (n ? '<a class="cb-todas" target="_top" href="' + esc(urlGaleria(f)) + '">Ver las ' + n + ' fotos</a>' : "") + '</div></div>';
  }
  function urlGaleria(f, g) {
    var k = -1; (f.galeria || []).forEach(function (x, j) { if (k < 0 && g && x.g === g) { k = j; } });
    return BASE + "/disponibilidad?modo=galeria&p=" + encodeURIComponent(PROP || f.propiedad) + (k > 0 ? "#f" + (k + 1) : "");
  }
  function armarCabecera() {}  // el mosaico ahora son enlaces a la página de fotos
  function fotosHTML(f) {
    var fotos = f.galeria || [];
    if (!fotos.length) { return ""; }
    return '<div class="ft"><div class="ft-tira" id="ft-tira">' + fotos.map(function (x) { return '<img loading="lazy" src="' + esc(x.s || x.m) + '" alt="Foto del alojamiento">'; }).join("") + '</div>' +
      '<button type="button" class="ft-fl ft-a" data-ft="-1" aria-label="Fotos anteriores">‹</button><button type="button" class="ft-fl ft-s" data-ft="1" aria-label="Más fotos">›</button></div>';
  }
  function armarFotos() {
    var tira = document.getElementById("ft-tira");
    if (!tira) { return; }
    var caja = tira.parentNode;
    function flechas() { caja.querySelector(".ft-a").style.visibility = tira.scrollLeft > 4 ? "visible" : "hidden"; caja.querySelector(".ft-s").style.visibility = tira.scrollLeft + tira.clientWidth < tira.scrollWidth - 4 ? "visible" : "hidden"; }
    tira.addEventListener("scroll", flechas); flechas();
    caja.addEventListener("click", function (ev) { var b = ev.target.closest("[data-ft]"); if (b) { ev.stopPropagation(); tira.scrollBy({ left: +b.getAttribute("data-ft") * 790, behavior: "smooth" }); } });
  }
  function modoSuelto(base, clase, html, armar) {
    function escalar() { document.documentElement.style.zoom = String(window.innerWidth / base); }
    escalar(); window.addEventListener("resize", escalar);
    document.body.className += " " + clase;
    llamarSWR("ficha", { propiedad: PROP }, function (f) { app.innerHTML = html(f); armar(f); },
      function (e) { app.innerHTML = '<p class="dz-nota">' + esc(e.message) + '</p>'; });
  }
  function modoCabecera() { modoSuelto(1186, "cb-en", cabeceraHTML, armarCabecera); }
  function modoFotos() { modoSuelto(1180, "ft-en", fotosHTML, armarFotos); }

  // ───────── modo portada (inicio de bookzienna.com, 17-11-2026) ─────────
  // Todo lo que va debajo de la primera pantalla de Wix (foto, título y buscador siguen siendo de Wix):
  // métricas, «Elige tu zona», los alojamientos, la franja del 20 % y propietarios. Maqueta «A · Propuesta 1»
  // elegida por Hugo. Los números salen de los datos (notas, reseñas, favoritos), no se escriben a mano.
  var WIXM = "https://static.wixstatic.com/media/";
  // Zonas: frase y 2 datos de una sola línea cada uno, para que las 3 tarjetas queden alineadas (Hugo, 17-11-2026).
  var ZONAS_WEB = [
    { d: "San Miguel", foto: "b4147d_d18a8a9007524776a9cc422714918d40~mv2.jpeg", frase: "Frente al mar, con vista al Pacífico", datos: ["Malecón a pasos", "Aeropuerto a 15 min"] },
    { d: "San Isidro", foto: "d58443_c497c759fbc54183b6f4c4445e5d263e~mv2.jpg", frase: "Vista al mar y calles arboladas", datos: ["Cerca al Golf", "Límite con Miraflores"] },
    { d: "Lince", foto: "b4147d_c2df8fcba89f4feca5d07781c423e4a1~mv2.png", frase: "Céntrico, con piscina y vista a la ciudad", datos: ["Límite con San Isidro", "Centro histórico a 10 min"] }
  ];
  function wixFoto(id, w, h) { return WIXM + id + "/v1/fill/w_" + w + ",h_" + h + ",al_c,q_80/foto.jpg"; }
  function puntos(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function promedio(lista) {
    var suma = 0, peso = 0;
    lista.forEach(function (a) { if (a.nota && a.resenas) { suma += a.nota * a.resenas; peso += a.resenas; } });
    return { nota: peso ? (Math.round(suma / peso * 10) / 10).toFixed(1).replace(".", ",") : "", resenas: peso };
  }
  function portadaHTML(lista, dz, CEL) {
    // Orden de las tarjetas: primero los de vista al mar (Hugo aprobó la maqueta en este orden).
    var ORDEN = ["SM1006", "SI2105", "SI502", "SM310", "LINCE1504", "LINCE902"];
    lista = lista.slice().sort(function (x, y) { var i = ORDEN.indexOf(x.propiedad), j = ORDEN.indexOf(y.propiedad); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    // Tarjetas «diseño 1 · Hotel boutique» con los textos A (Hugo, 17-11-2026). Nunca decir cuántos
    // departamentos hay: la web va a crecer.
    var p = promedio(lista), pct = dz ? dz.pct : 20, noches = dz ? dz.noches : 2;
    // Las 4 tarjetas con la misma estructura y centradas (Hugo pidió simetría).
    function metrica(etiqueta, num, linea1, linea2, negra) {
      return '<div class="pt-m' + (negra ? ' pt-m-n' : '') + '"><small>' + etiqueta + '</small><b>' + num + '</b>' +
        '<em></em><span>' + linea1 + '</span><i>' + linea2 + '</i></div>';
    }
    var por = '<section class="pt-por pt-seg"><div class="pt-cab"><h2>Por qué elegir Zienna</h2></div><div class="pt-metricas">' +
      metrica("CALIFICACIÓN", esc(p.nota), "de 5 estrellas", "en " + puntos(p.resenas) + " reseñas") +
      metrica("PROMOCIÓN", pct + "&nbsp;%", "de ahorro directo", "desde " + noches + " noches", true) +
      metrica("LLEGADA", "Tu clave", "sin esperar a nadie", "clave personal en cada reserva") +
      metrica("SUPERANFITRIÓN", "5 años", "cuidando cada detalle", "recibiendo huéspedes en Airbnb") + '</div></section>';
    // Orden (Hugo, 18-11-2026): Elige tu zona → Por qué elegir Zienna → Nuestros alojamientos → el resto igual.
    // Computadora: opción B de Hugo (18-11-2026), tarjeta crema con el texto debajo de la foto y botón negro.
    // En celular sigue la A (foto arriba, texto debajo, ver .pt-cel). ?zonas=a muestra la otra maqueta.
    var ZV = CEL ? "" : (/^[ab]$/.test(Q.get("zonas") || "") ? Q.get("zonas") : "b");
    var h = '<section class="pt-sec pt-prim"><div class="pt-cab"><h2>Elige tu zona</h2></div><div class="pt-zonas' + (ZV ? ' pt-zonas-' + ZV : '') + '">';
    ZONAS_WEB.forEach(function (z) {
      var de = lista.filter(function (a) { return a.distrito === z.d; });
      if (!de.length) { return; }
      var pz = promedio(de), desde = Math.min.apply(null, de.map(function (a) { return a.desde; }));
      // La foto va en su propia capa: en computadora el texto queda encima; en celular (opción A de Hugo, 18-11-2026)
      // la foto queda arriba y el texto debajo, sin nada encima de la foto salvo las 2 etiquetas.
      h += '<a class="pt-z" target="_top" href="' + esc(LISTADO) + '"><span class="pt-z-img" style="background-image:url(\'' + esc(wixFoto(z.foto, 760, 1200)) + '\')">' +
        '<span class="pt-z-arr"><span class="pt-pill">Desde ' + desdeTachado(desde) + '</span>' + (pz.nota ? '<span class="pt-pill pt-pill-o">★ ' + esc(pz.nota) + ' · ' + puntos(pz.resenas) + ' reseñas</span>' : '') + '</span></span>' +
        '<span class="pt-z-ab"><b>' + esc(z.d) + '</b><span class="pt-z-f">' + esc(z.frase) + '</span><span class="pt-z-ds">' + z.datos.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</span>' +
        '<span class="pt-z-ver">Ver ' + de.length + (de.length === 1 ? ' alojamiento' : ' alojamientos') + ' →</span></span></a>';
    });
    h += '</div></section>' + por;
    h += '<section class="pt-sec"><div class="pt-cab"><h2>Nuestros alojamientos</h2><a target="_top" href="' + esc(LISTADO) + '">Ver todos</a></div><div class="pt-cards">';
    lista.forEach(function (a) {
      var t = String(a.titulo || a.nombre).split(" · "), nombre = a.titulo_web || (t.length > 1 ? t.slice(1).join(" · ") : t[0]);
      var foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_1200,h_800");
      h += '<a class="pt-card" target="_top" href="' + esc(urlFicha(a)) + '"><span class="pt-img" style="background-image:url(\'' + esc(foto) + '\')"></span>' +
        '<span class="pt-c1"><b>' + esc(nombre) + '</b>' + (a.nota ? '<span>★ ' + esc(nota(a.nota)) + '</span>' : '') + '</span>' +
        '<span class="pt-c2">' + esc(a.distrito) + (a.resenas ? ' · ' + puntos(a.resenas) + ' reseñas' : '') + '</span>' +
        '<span class="pt-c3">Desde ' + desdeTachado(a.desde) + ' noche</span></a>';
    });
    h += '</div></section>';
    h += '<section class="pt-sec"><div class="pt-banda"><div><b>Reserva directo y paga ' + pct + ' % menos</b><span>Promoción exclusiva a partir de ' + noches + ' noches.</span></div>' +
      '<a target="_top" href="' + esc(LISTADO) + '">Ver fechas libres</a></div></section>';
    h += '<section class="pt-sec pt-prop"><span class="pt-prop-f" style="background-image:url(\'' + ASSET + "gestion_propiedades" + FOTO_T + '\')"></span>' +
      '<div class="pt-prop-t"><small>PARA PROPIETARIOS</small><h2>¿Tienes un departamento en Lima?</h2><p>Nos encargamos de todo: anuncio, huéspedes, limpieza y mantenimiento. Tú recibes la renta.</p>' +
      '<div class="pt-prop-b"><a class="pt-neg" target="_top" href="' + BASE + '/disponibilidad?modo=contacto&amp;motivo=administracion&amp;solo=1">Cotizar administración</a><a class="pt-bor" target="_top" href="' + esc("https://registro.bookzienna.com/propietarios") + '">Conocer más</a></div></div></section>';
    // Limpieza (propuesta 2 de Hugo, 17-11-2026): alternada, foto a la derecha en computadora. «Cotizar limpieza» abre el
    // formulario directo de limpieza (modo=contacto con el motivo fijo).
    h += '<section class="pt-sec pt-prop pt-prop-inv"><span class="pt-prop-f" style="background-image:url(\'' + ASSET + "servicio_limpieza" + FOTO_T + '\')"></span>' +
      '<div class="pt-prop-t"><small>SERVICIO DE LIMPIEZA</small><h2>¿Agendamos tu próxima limpieza?</h2><p>Limpieza general, profunda o después de cada huésped, con el mismo equipo que cuida nuestros alojamientos.</p>' +
      '<div class="pt-prop-b"><a class="pt-neg" target="_top" href="' + BASE + '/disponibilidad?modo=agenda">Agenda tu limpieza</a><a class="pt-bor" target="_top" href="' + esc("https://registro.bookzienna.com/limpieza") + '">Conocer más</a></div></div></section>';
    return h;
  }
  function modoPortada() {
    var CEL = esCelular(6);
    var BASE = CEL ? 375 : 1181;
    var escalar = escaladoQueEntra(BASE);
    document.body.className += " pt-en " + (CEL ? "pt-cel" : "pt-pc");
    // Letra del diseño 1 elegido por Hugo: Bodoni Moda (títulos y números) + Manrope (texto). Solo en la portada.
    var fl = document.createElement("link"); fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap";
    document.head.appendChild(fl);
    llamarSWR("alojamientos", {}, function (d) { app.innerHTML = '<div class="pt">' + portadaHTML(d.alojamientos, d.descuento, CEL) + '</div>'; escalar(); setTimeout(escalar, 600); },
      function (e) { app.innerHTML = '<p class="dz-nota">' + esc(e.message) + '</p>'; });
  }

  // ───────── todas las fotos de un alojamiento (página propia, 17-11-2026) ─────────
  // `?modo=galeria&p=CODIGO`: la abre «Ver las N fotos» de la ficha en la misma pestaña. Fotos grandes en
  // filas de 1 y 2, como el recorrido de fotos de Airbnb; al tocar una se ve a pantalla completa. «‹ Volver»
  // regresa a la ficha de Wix. `#f12` baja hasta la foto 12 (la que se tocó en el mosaico).
  function modoGaleria() {
    var $ = function (id) { return document.getElementById(id); };
    anchoPC("#dz-app");
    document.body.className += " gl-en";
    app.innerHTML = '<p class="dz-nota" style="padding:20px">Cargando…</p>';
    llamarSWR("ficha", { propiedad: PROP }, function (f) {
      var fotos = f.galeria || [], volver = f.ficha ? FIJAS + "/" + f.ficha + "/" : LISTADO;
      if (/^https:\/\/(registro|web)\.bookzienna\.com\/[a-z0-9]+\/?(\?.*)?$/.test(document.referrer)) { volver = document.referrer; }
      document.title = "Fotos · " + (f.titulo || "Zienna");
      var h = marcoPaso("Alojamientos", volver, false) ?
        '<div class="gl"><a class="gl-atras" href="' + esc(volver) + '">‹ Volver al alojamiento</a><h1>' + esc(f.titulo) + '</h1><p class="gl-sub">Todas las fotos · ' + esc(f.subtitulo) + ' · ' + fotos.length + ' fotos</p><div class="gl-grid">' :
        '<header class="gl-cab"><a class="gl-volver" href="' + esc(volver) + '">‹ Volver</a><span class="gl-cab-t">' + esc(f.titulo) + '</span></header>' +
        '<div class="gl"><h1>Todas las fotos</h1><p class="gl-sub">' + esc(f.subtitulo) + ' · ' + fotos.length + ' fotos</p><div class="gl-grid">';
      fotos.forEach(function (x, k) {
        var grande = k % 3 === 0;
        h += '<button type="button" class="gl-f' + (grande ? ' gl-f1' : '') + '" id="f' + (k + 1) + '" data-k="' + k + '" aria-label="Ver foto ' + (k + 1) + ' en grande">' +
          '<img src="' + esc(grande ? (x.s || x.m) : x.m) + '" alt="Foto ' + (k + 1) + ' de ' + fotos.length + '"' + (k > 2 ? ' loading="lazy"' : '') + '></button>';
      });
      h += '</div><p class="gl-fin"><a href="' + esc(volver) + '">‹ Volver al alojamiento</a></p></div>' +
        '<div class="gl-v" id="gl-v" hidden><img id="gl-vi" alt="Foto en grande"><button type="button" class="gl-vx" aria-label="Cerrar">×</button>' +
        '<button type="button" class="gl-va" aria-label="Foto anterior">‹</button><button type="button" class="gl-vs" aria-label="Foto siguiente">›</button><span class="gl-vn" id="gl-vn"></span></div>';
      app.innerHTML = h;
      var i0 = 0, v = $("gl-v");
      function ver(i) { i0 = (i + fotos.length) % fotos.length; $("gl-vi").src = fotos[i0].g; $("gl-vn").textContent = (i0 + 1) + " / " + fotos.length; }
      function abrir(i) { v.hidden = false; document.body.style.overflow = "hidden"; ver(i); }
      function cerrar() { v.hidden = true; document.body.style.overflow = ""; }
      app.addEventListener("click", function (ev) {
        var b = ev.target.closest(".gl-f"); if (b) { abrir(+b.getAttribute("data-k")); return; }
        if (ev.target.closest(".gl-vx") || ev.target === v) { cerrar(); }
        else if (ev.target.closest(".gl-va")) { ver(i0 - 1); }
        else if (ev.target.closest(".gl-vs")) { ver(i0 + 1); }
      });
      document.addEventListener("keydown", function (ev) {
        if (v.hidden) { return; }
        if (ev.key === "Escape") { cerrar(); } else if (ev.key === "ArrowRight") { ver(i0 + 1); } else if (ev.key === "ArrowLeft") { ver(i0 - 1); }
      });
      var x0 = null;
      v.addEventListener("touchstart", function (ev) { x0 = ev.touches[0].clientX; }, { passive: true });
      v.addEventListener("touchend", function (ev) { if (x0 === null) { return; } var dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) { ver(i0 + (dx < 0 ? 1 : -1)); } });
      var m = /^#f(\d+)$/.exec(location.hash);
      if (m && $("f" + m[1])) { setTimeout(function () { $("f" + m[1]).scrollIntoView({ block: "center" }); }, 50); }
    }, function (e) { app.innerHTML = '<p class="dz-nota">' + esc(e.message) + '</p>'; });
  }

  // ───────── contacto (página /contacto de Wix) ─────────
  // Pedido de Hugo (17-11-2026, opción A): el visitante elige el motivo y debajo se despliegan las
  // preguntas de ese motivo (casi todas de un toque). El botón abre WhatsApp con todo escrito, directo al
  // número de reservas. No se guarda nada en el servidor. Las preguntas son opcionales: solo se exigen el
  // motivo, el nombre y, en «Otro motivo», el mensaje.
  // ?motivo=alojamiento|administracion|limpieza|otro deja uno marcado (para enlazar desde otras páginas).
  var DISTRITOS_CONTACTO = ["San Isidro", "Miraflores", "San Miguel", "Lince", "Barranco", "Jesús María", "Magdalena del Mar",
    "Santiago de Surco", "San Borja", "Pueblo Libre", "Otro distrito"];
  var DORMITORIOS_CONTACTO = ["Estudio", "1", "2", "3+"];
  var MOTIVOS_CONTACTO = [
    { k: "alojamiento", t: "Busco alojamiento", corto: "Busco alojamiento", ph: "Cuéntanos lo que necesites (opcional)", campos: [
      { k: "llegada", t: "Llegada", tipo: "fecha", mitad: true }, { k: "salida", t: "Salida", tipo: "fecha", mitad: true },
      { k: "huespedes", t: "Huéspedes", tipo: "chips", ops: ["1", "2", "3", "4+"], mitad: true },
      { k: "zona", t: "Zona", tipo: "chips", ops: ["San Isidro", "San Miguel", "Lince", "Cualquiera"] }] },
    { k: "administracion", t: "Tengo una propiedad y quiero que la administren", corto: "Administración de mi propiedad", ph: "Cuéntanos más de tu propiedad (opcional)", campos: [
      { k: "distrito", t: "Distrito", tipo: "lista", ops: DISTRITOS_CONTACTO, mitad: true }, { k: "metraje", t: "Metraje aprox. (m²)", tipo: "numero", mitad: true },
      { k: "dormitorios", t: "Dormitorios", tipo: "chips", ops: DORMITORIOS_CONTACTO, mitad: true },
      { k: "amoblado", t: "¿Está amoblado?", tipo: "chips", ops: ["Sí", "No", "En parte"], mitad: true },
      { k: "airbnb", t: "¿Ya está en Airbnb?", tipo: "chips", ops: ["Sí", "No"], mitad: true }] },
    { k: "limpieza", t: "Quiero servicio de limpieza para mi departamento", corto: "Servicio de limpieza", ph: "Cuéntanos lo que necesites (opcional)", campos: [
      { k: "distrito", t: "Distrito", tipo: "lista", ops: DISTRITOS_CONTACTO, mitad: true }, { k: "fecha", t: "Fecha deseada", tipo: "fecha", mitad: true },
      { k: "dormitorios", t: "Dormitorios", tipo: "chips", ops: DORMITORIOS_CONTACTO, mitad: true },
      { k: "ropa", t: "¿Lavado de sábanas y toallas?", tipo: "chips", ops: ["Sí", "No"], mitad: true },
      { k: "tipo", t: "Tipo de limpieza", tipo: "chips", ops: ["Una vez", "Profunda", "Después de cada huésped", "Periódica"] }] },
    { k: "otro", t: "Otro motivo", corto: "Otro motivo", ph: "Escribe tu consulta", campos: [] }
  ];
  function modoContacto(caja) {
    var app = caja || APP;
    var $ = function (id) { return document.getElementById(id); };
    document.body.className += " ct-en";
    var fl = document.createElement("link"); fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap";
    document.head.appendChild(fl);
    var marcado = Q.get("motivo") || "", hoyISO = hoy();
    // «solo=1» (botones «Cotizar administración» / «Cotizar limpieza» de la portada): formulario directo de ese servicio,
    // sin elegir motivo. Abierto como página propia (no dentro de Wix) lleva cabecera con «Volver».
    var SOLO = Q.get("solo") === "1" && MOTIVOS_CONTACTO.some(function (m) { return m.k === marcado; });
    var PAGINA = !caja && window.top === window;
    if (PAGINA) { anchoPC("#dz-app"); }
    var TITULOS = { administracion: ["Cotiza la administración de tu departamento", "Cuéntanos de tu propiedad y te escribimos por WhatsApp con una propuesta."],
      limpieza: ["Cotiza la limpieza de tu departamento", "Cuéntanos qué necesitas y te escribimos por WhatsApp con el precio."],
      alojamiento: ["Encuentra tu alojamiento", "Cuéntanos tus fechas y te escribimos por WhatsApp."], otro: ["Escríbenos", "Te respondemos por WhatsApp."] };
    function campo(m, c) {
      var id = "ct-" + m.k + "-" + c.k, h = '<div class="ct-f' + (c.mitad ? ' ct-mitad' : '') + '"><span class="ct-l">' + esc(c.t) + '</span>';
      if (c.tipo === "chips") {
        h += '<span class="ct-chips">' + c.ops.map(function (o) { return '<label class="ct-chip"><input type="radio" name="' + id + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>'; }).join("") + '</span>';
      } else if (c.tipo === "lista") {
        h += '<select id="' + id + '" aria-label="' + esc(c.t) + '"><option value="">Elige</option>' + c.ops.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join("") + '</select>';
      } else if (c.tipo === "fecha") {
        h += '<input id="' + id + '" type="date" min="' + hoyISO + '" aria-label="' + esc(c.t) + '">';
      } else {
        h += '<input id="' + id + '" type="number" inputmode="numeric" min="10" max="2000" placeholder="Ej.: 75" aria-label="' + esc(c.t) + '">';
      }
      return h + '</div>';
    }
    if (PAGINA) {
      document.body.className += " ct-pagina";
      var fb = document.createElement("link"); fb.rel = "stylesheet";
      fb.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500&display=swap"; document.head.appendChild(fb);
    }
    var volver = /^https:\/\/((www|web)\.)?bookzienna\.com/.test(document.referrer) ? document.referrer : WEB;
    var h = (PAGINA ? (marcoPaso(marcado === "administracion" ? "Para Propietarios" : marcado === "limpieza" ? "Limpieza" : "", volver, false) ? '' :
      '<header class="ct-cab"><a class="ct-volver" href="' + esc(volver) + '">‹ Volver</a><img src="' + ASSET + 'zienna_logo.png" alt="Zienna living &amp; aparts"></header>') + '<div class="ct-wrap">' : '') +
      (SOLO ? '<div class="ct-tit"><h1>' + esc(TITULOS[marcado][0]) + '</h1><p>' + esc(TITULOS[marcado][1]) + '</p></div>' : '') +
      '<form class="ct" id="ct" novalidate><fieldset class="ct-mot"' + (SOLO ? ' hidden' : '') + '><legend>¿En qué te podemos ayudar? *</legend>';
    MOTIVOS_CONTACTO.forEach(function (m) {
      h += '<label class="ct-op"><input type="radio" name="motivo" value="' + m.k + '"' + (m.k === marcado ? ' checked' : '') + '><span>' + esc(m.t) + '</span></label>';
    });
    h += '</fieldset>';
    MOTIVOS_CONTACTO.forEach(function (m) {
      if (m.campos.length) { h += '<div class="ct-mas" id="ct-mas-' + m.k + '" hidden>' + m.campos.map(function (c) { return campo(m, c); }).join("") + '</div>'; }
    });
    h += '<label class="ct-c"><span>Tu nombre *</span><input id="ct-nom" type="text" autocomplete="name" maxlength="80" placeholder="Nombre y apellido"></label>' +
      '<label class="ct-c"><span id="ct-msj-l">Tu mensaje</span><textarea id="ct-msj" rows="3" maxlength="1000" placeholder="Cuéntanos lo que necesites (opcional)"></textarea></label>' +
      '<p class="ct-err" id="ct-err" role="alert"></p>' +
      '<button type="submit" class="ct-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z"/></svg>Enviar por WhatsApp</button></form>' + (PAGINA ? '</div>' : '');
    app.innerHTML = h;
    function motivoActual() { var r = document.querySelector('input[name="motivo"]:checked'); return r ? MOTIVOS_CONTACTO.filter(function (m) { return m.k === r.value; })[0] : null; }
    function mostrar() {
      var m = motivoActual();
      MOTIVOS_CONTACTO.forEach(function (x) { var b = $("ct-mas-" + x.k); if (b) { b.hidden = !m || m.k !== x.k; } });
      $("ct-msj-l").textContent = m && m.k === "otro" ? "Tu mensaje *" : "Tu mensaje";
      $("ct-msj").placeholder = m ? m.ph : "Cuéntanos lo que necesites (opcional)";
      $("ct-err").textContent = "";
    }
    document.querySelectorAll('input[name="motivo"]').forEach(function (r) { r.addEventListener("change", mostrar); });
    mostrar();
    function fechaTxt(v) { var p = String(v || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : ""; }
    function valor(m, c) {
      var id = "ct-" + m.k + "-" + c.k;
      if (c.tipo === "chips") { var r = document.querySelector('input[name="' + id + '"]:checked'); return r ? r.value : ""; }
      var v = ($(id).value || "").trim();
      return c.tipo === "fecha" ? fechaTxt(v) : c.tipo === "numero" && v ? v + " m²" : v;
    }
    $("ct").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var m = motivoActual(), nom = $("ct-nom").value.trim(), msj = $("ct-msj").value.trim();
      var falta = !m ? "Elige el motivo de tu consulta." : !nom ? "Escribe tu nombre." : (m.k === "otro" && !msj) ? "Escribe tu consulta." : "";
      if (!falta && m.k === "alojamiento") {
        var ll = $("ct-alojamiento-llegada").value, sa = $("ct-alojamiento-salida").value;
        if (ll && sa && sa <= ll) { falta = "La salida tiene que ser después de la llegada."; }
      }
      $("ct-err").textContent = falta;
      if (falta) { return; }
      var lineas = m.campos.map(function (c) { var v = valor(m, c); return v ? "• " + c.t.replace(/^¿|\?$/g, "").replace(" (m²)", "") + ": " + v : ""; }).filter(Boolean);
      var texto = "Hola, soy " + nom + ".\nMotivo: " + m.corto + (lineas.length ? "\n" + lineas.join("\n") : "") +
        (msj ? "\n\n" + msj : "") + "\n\n(Enviado desde bookzienna.com)";
      var url = "https://wa.me/" + WA + "?text=" + encodeURIComponent(texto);
      if (!PRUEBA && !DENTRO) {
        try {
          var fd = new FormData(); fd.append("v", VIS); fd.append("motivo", m.k); fd.append("nombre", nom); fd.append("detalle", texto);
          var uc = BASE + "/api/method/zienna.api.stays.embudo_web.contacto";
          if (!(navigator.sendBeacon && navigator.sendBeacon(uc, fd))) { fetch(uc, { method: "POST", body: fd, keepalive: true }).catch(function () {}); }
        } catch (er) {}
        rastrear("contacto", { motivo: m.k });
      }
      var w = window.open(url, "_blank", "noopener");
      if (!w) { window.top.location.href = url; }
    });
  }

  // ───────── página de fechas del inicio en celular (modo=buscar, Hugo 17-11-2026) ─────────
  // Página propia a pantalla completa: paso 1 = nuestro calendario (todos los meses hacia abajo) y los
  // huéspedes; paso 2 = los alojamientos libres en esas fechas, con «Ver alojamiento» y «Reservar».
  function modoBuscar() {
    // Computadora (Hugo, 18-11-2026: opción B): dos meses lado a lado y la tarjeta «Tu viaje» a la derecha.
    var PC = window.innerWidth >= 900;
    anchoPC("#dz-app");
    document.body.className += " bu-en" + (PC ? " bu-pc" : "");
    var fl = document.createElement("link"); fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500&family=Manrope:wght@400;500;600;700&display=swap";
    document.head.appendChild(fl);
    var volver = /^https:\/\/((www|registro|web)\.)?bookzienna\.com/.test(document.referrer) && !/modo=buscar/.test(document.referrer) ? document.referrer : WEB;
    var esFecha = /^\d{4}-\d{2}-\d{2}$/, lista = null, empujado = false, off = 0;
    function leerURL() {
      var q = new URLSearchParams(location.search), ll = q.get("ll") || "", sa = q.get("sa") || "", h = parseInt(q.get("h"), 10);
      if (!esFecha.test(ll) || !esFecha.test(sa) || ll < hoy() || sa <= ll) { ll = ""; sa = ""; }
      busq = { ll: ll, sa: sa, h: h >= 1 && h <= 4 ? h : 2 };
      return ll && sa && q.get("paso") !== "fechas" ? "res" : "cal";
    }
    function cab() { if (marcoPaso("Alojamientos", volver, true)) { return ""; } return '<header class="ct-cab bu-cab"><a class="ct-volver" href="' + esc(volver) + '">‹ Volver</a><img src="' + ASSET + (PC ? 'zienna_logo_h.png' : 'zienna_logo.png') + '" alt="Zienna living &amp; aparts"></header>'; }
    function noches() { return busq.ll && busq.sa ? Math.round((new Date(busq.sa + "T12:00:00") - new Date(busq.ll + "T12:00:00")) / 864e5) : 0; }
    function hTxt(n) { return n + (n == 1 ? " huésped" : " huéspedes"); }
    // Celular: 12 meses hacia abajo. Computadora: 2 meses a partir de `off`, con flechas.
    function mesesHTML() {
      var h = "", ym = sumaMes(hoy().slice(0, 7), PC ? off : 0), hoyF = hoy();
      for (var k = 0; k < (PC ? 2 : 12); k++, ym = sumaMes(ym, 1)) {
        var p = ym.split("-"), d1 = new Date(+p[0], +p[1] - 1, 1), dias = new Date(+p[0], +p[1], 0).getDate(), vacios = (d1.getDay() + 6) % 7;
        h += '<section class="bu-mes"><h3>' + mesTxt(ym) + '</h3>' + (PC ? '<div class="bu-dow bu-dowm"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' : '') + '<div class="bu-grid">';
        for (var i = 0; i < vacios; i++) { h += '<span></span>'; }
        for (var d = 1; d <= dias; d++) {
          var f = ym + "-" + pad(d), c = "bu-d";
          if (f < hoyF) { c += " pas"; }
          if (f === busq.ll) { c += " sel ll" + (busq.sa ? " con-sa" : ""); }
          if (f === busq.sa) { c += " sel sa"; }
          if (busq.ll && busq.sa && f > busq.ll && f < busq.sa) { c += " rango"; }
          h += '<button type="button" class="' + c + '" data-f="' + f + '"' + (f < hoyF ? " disabled" : "") + '>' + d + '</button>';
        }
        h += '</div></section>';
      }
      return h;
    }
    function pintarSel() {
      document.getElementById("bu-ll").textContent = busq.ll ? corto(busq.ll) : "Elige";
      document.getElementById("bu-sa").textContent = busq.sa ? corto(busq.sa) : "Elige";
      document.getElementById("bu-cll").classList.toggle("act", !busq.ll || !!busq.sa);
      document.getElementById("bu-csa").classList.toggle("act", !!(busq.ll && !busq.sa));
      var ant = document.getElementById("bu-ant"); if (ant) { ant.disabled = off <= 0; document.getElementById("bu-sig").disabled = off >= 10; }
      var n = noches();
      document.getElementById("bu-lin").textContent = n ? n + (n === 1 ? " noche" : " noches") : busq.ll ? "Ahora toca tu día de salida" : "Toca tu día de llegada";
      document.getElementById("bu-go").disabled = !n;
      document.getElementById("bu-h").textContent = busq.h;
      document.getElementById("bu-menos").disabled = busq.h <= 1;
      document.getElementById("bu-mas").disabled = busq.h >= 4;
    }
    function pasoCal() {
      if (PC) { pasoCalPC(); return; }
      app.innerHTML = cab() + '<div class="bu"><h1>¿Cuándo viajas?</h1>' +
        '<div class="bu-sel"><div class="bu-c" id="bu-cll"><span>Llegada</span><b id="bu-ll"></b></div><div class="bu-c" id="bu-csa"><span>Salida</span><b id="bu-sa"></b></div></div>' +
        '<div class="bu-dow"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' +
        '<div id="bu-meses">' + mesesHTML() + '</div></div>' +
        '<div class="bu-pie"><div class="bu-hu"><span>Huéspedes</span><div><button type="button" id="bu-menos" aria-label="Menos huéspedes">−</button><b id="bu-h"></b><button type="button" id="bu-mas" aria-label="Más huéspedes">+</button></div></div>' +
        '<div class="bu-acc"><button type="button" class="bu-borrar" id="bu-borrar">Borrar</button><span class="bu-lin" id="bu-lin"></span><button type="button" class="bu-go" id="bu-go">Buscar</button></div></div>';
      pintarSel();
      var sel = document.querySelector(".bu-d.ll");
      if (sel) { var top = sel.closest(".bu-mes").getBoundingClientRect().top + window.scrollY - 150; window.scrollTo(0, Math.max(0, top)); }
      ligarCal();
    }
    function pasoCalPC() {
      if (busq.ll) {  // abrir en el mes de la llegada elegida
        var a = hoy().split("-"), b = busq.ll.split("-");
        off = Math.max(0, Math.min(10, (+b[0] - +a[0]) * 12 + (+b[1] - +a[1])));
      }
      app.innerHTML = cab() + '<div class="bu bu-pcg"><div class="bu-izq"><h1>¿Cuándo viajas?</h1><p class="bu-sub">Elige tu llegada y tu salida.</p>' +
        '<div class="bu-navm"><button type="button" id="bu-ant" aria-label="Meses anteriores">‹</button><button type="button" id="bu-sig" aria-label="Meses siguientes">›</button></div>' +
        '<div id="bu-meses" class="bu-dos">' + mesesHTML() + '</div></div>' +
        '<aside class="bu-tarj"><span class="bu-tag">TU VIAJE</span>' +
        '<div class="bu-fila" id="bu-cll"><span>Llegada</span><b id="bu-ll"></b></div><div class="bu-fila" id="bu-csa"><span>Salida</span><b id="bu-sa"></b></div>' +
        '<p class="bu-lin" id="bu-lin"></p>' +
        '<div class="bu-fila bu-hu2"><span>Huéspedes</span><div><button type="button" id="bu-menos" aria-label="Menos huéspedes">−</button><b id="bu-h"></b><button type="button" id="bu-mas" aria-label="Más huéspedes">+</button></div></div>' +
        '<button type="button" class="bu-go" id="bu-go">Ver alojamientos libres</button><button type="button" class="bu-borrar" id="bu-borrar">Borrar fechas</button>' +
        '<p class="bu-nota2">Precio total visible antes de reservar. Reserva directa: 20 % menos desde 2 noches.</p></aside></div>';
      pintarSel();
      document.getElementById("bu-ant").addEventListener("click", function () { off = Math.max(0, off - 1); document.getElementById("bu-meses").innerHTML = mesesHTML(); pintarSel(); });
      document.getElementById("bu-sig").addEventListener("click", function () { off = Math.min(10, off + 1); document.getElementById("bu-meses").innerHTML = mesesHTML(); pintarSel(); });
      ligarCal();
    }
    function ligarCal() {
      document.getElementById("bu-meses").addEventListener("click", function (ev) {
        var t = ev.target.closest("button[data-f]"); if (!t || t.disabled) { return; }
        var f = t.getAttribute("data-f");
        if (!busq.ll || busq.sa || f <= busq.ll) { busq.ll = f; busq.sa = ""; } else { busq.sa = f; }
        [].forEach.call(document.querySelectorAll(".bu-d"), function (b) {
          var x = b.getAttribute("data-f");
          b.classList.toggle("sel", x === busq.ll || x === busq.sa);
          b.classList.toggle("ll", x === busq.ll); b.classList.toggle("con-sa", x === busq.ll && !!busq.sa);
          b.classList.toggle("sa", x === busq.sa);
          b.classList.toggle("rango", !!(busq.ll && busq.sa && x > busq.ll && x < busq.sa));
        });
        pintarSel();
      });
      document.getElementById("bu-menos").addEventListener("click", function () { busq.h = Math.max(1, busq.h - 1); pintarSel(); });
      document.getElementById("bu-mas").addEventListener("click", function () { busq.h = Math.min(4, busq.h + 1); pintarSel(); });
      document.getElementById("bu-borrar").addEventListener("click", function () { busq.ll = ""; busq.sa = ""; document.getElementById("bu-meses").innerHTML = mesesHTML(); pintarSel(); });
      document.getElementById("bu-go").addEventListener("click", function () {
        if (!noches()) { return; }
        guardar();
        // Al volver atrás desde los resultados, el calendario conserva las fechas elegidas.
        history.replaceState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h + "&paso=fechas");
        history.pushState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h);
        empujado = true; pasoRes();
      });
    }
    function tarjeta(a, f) {
      var foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_900,h_600");
      var tit = a.titulo_web || a.nombre;
      return '<article class="bu-card"><a class="bu-img" href="' + esc(urlFicha(a)) + '" style="background-image:url(\'' + esc(foto) + '\')" aria-label="Ver ' + esc(tit) + '"></a>' +
        '<div class="bu-info"><b>' + esc(tit) + '</b><span class="bu-dist">' + esc(a.distrito) + '</span>' +
        '<span class="bu-total">' + precioTachado(f) + ' por ' + f.noches + (f.noches === 1 ? " noche" : " noches") + '</span>' +
        precioFinal(f) +
        '<div class="bu-bts"><a class="bu-ver" href="' + esc(urlFicha(a)) + '">Ver alojamiento</a><a class="bu-res" href="' + esc(urlSolicitud(a.propiedad)) + '">Reservar</a></div></div></article>';
    }
    function pasoRes() {
      var n = noches();
      app.innerHTML = cab() + '<div class="bu bu-r"><a class="bu-cambiar" id="bu-cambiar" href="#">‹ Cambiar fechas</a><h1>Alojamientos libres</h1>' +
        '<p class="bu-resumen">' + corto(busq.ll) + ' → ' + corto(busq.sa) + ' · ' + n + (n === 1 ? " noche" : " noches") + ' · ' + hTxt(busq.h) + '</p><div id="bu-lista"><p class="bu-nota">Buscando…</p></div></div>';
      window.scrollTo(0, 0);
      document.getElementById("bu-cambiar").addEventListener("click", function (ev) {
        ev.preventDefault();
        // Si los resultados se abrieron directo desde la barra, «atrás» saldría de la página: ahí se reemplaza.
        if (empujado) { history.back(); }
        else { history.replaceState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h + "&paso=fechas"); pasoCal(); }
      });
      var pedido = busq.ll + busq.sa + busq.h;
      Promise.all([lista ? Promise.resolve(lista) : llamar("alojamientos"), llamar("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h })]).then(function (r) {
        if (pedido !== busq.ll + busq.sa + busq.h || !document.getElementById("bu-lista")) { return; }
        lista = r[0];
        var porProp = {}; lista.alojamientos.forEach(function (a) { porProp[a.propiedad] = a; });
        var libres = r[1].resultados.filter(function (f) { return f.libre && porProp[f.propiedad]; });
        document.getElementById("bu-lista").innerHTML = libres.length ? libres.map(function (f) { return tarjeta(porProp[f.propiedad], f); }).join("") :
          '<div class="bu-vacio"><p>No hay alojamientos libres del ' + corto(busq.ll) + ' al ' + corto(busq.sa) + '. Prueba otras fechas.</p></div>';  // sin botones cuando no hay nada libre (Hugo, 18-11-2026)
      }).catch(function (e) { var l = document.getElementById("bu-lista"); if (l) { l.innerHTML = '<p class="bu-nota">' + esc(e.message) + '</p>'; } });
    }
    function mostrar() { if (leerURL() === "res") { pasoRes(); } else { empujado = false; pasoCal(); } }
    window.addEventListener("popstate", mostrar);
    mostrar();
  }

  // ───────── Limpieza (Hugo 17-11-2026: opción 1, embudo en 4 pasos) ─────────
  // modo=limpieza: el contenido de la página /limpieza de Wix (recuadro, como la portada).
  // modo=agenda: el embudo a pantalla completa. Precios, cupos y guardado: zienna.api.stays.limpieza_web.
  // Fotos en WebP: 750 px para celular, 1400 para computadora (las JPG pesaban 100-190 KB cada una; Hugo, 18-11-2026).
  var FOTO_T = window.innerWidth < 700 ? "_750.webp" : "_1400.webp";
  // Fotos de Hugo (18-11-2026): general = la cocina, entre huéspedes = las toallas (antes repetía la foto de arriba).
  var FOTOS_LIMPIEZA = { general: ASSET + "limpieza_cocina" + FOTO_T, profunda: ASSET + "limpieza_profunda" + FOTO_T, huespedes: ASSET + "limpieza_toallas" + FOTO_T };
  function letraZienna() {
    var fl = document.createElement("link"); fl.rel = "stylesheet";
    fl.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap";
    document.head.appendChild(fl);
  }
  // Maquetas animadas (Hugo, 18-11-2026): ?anim=1 «Suave», ?anim=2 «Cine», ?anim=3 «Brillo». Sin el parámetro la página
  // queda igual que siempre. Las cosas aparecen al llegar a ellas con IntersectionObserver, que dentro de Wix mide contra
  // la ventana del navegador aunque el recuadro mida 2.700 px. Nada de esto cambia el alto de la página.
  function animarPagina(op, CEL) {
    var raiz = app.querySelector(".pp") || app.firstElementChild;  // con encabezado propio, el contenido no es el primer hijo
    if (!/^[1-7]$/.test(op || "") || !raiz || !window.IntersectionObserver) { return; }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
    if (!/\ban\b/.test(document.body.className)) { document.body.className += " an an-" + op + (CEL ? " an-cel" : ""); }
    var $$ = function (s) { return [].slice.call(raiz.querySelectorAll(s)); };
    var uno = function (s) { return raiz.querySelector(s); };
    function capa(el, cls, conFoto) {
      if (!el) { return; }
      var i = document.createElement("i"); i.className = cls;
      if (conFoto) { i.style.backgroundImage = el.style.backgroundImage; }
      el.insertBefore(i, el.firstChild);
    }
    function marcar(lista, paso, base) {
      lista.forEach(function (el, k) { if (el) { el.classList.add("an-r"); el.style.setProperty("--d", ((base || 0) + k * (paso || 0)) + "ms"); } });
    }
    // Cifras que cuentan desde cero al aparecer (solo las que tienen S/ o %). El número real queda puesto hasta ese momento.
    function contar(b) {
      var t = b.textContent, m = t.match(/\d+/);
      if (!m || !/S\/|%|años/.test(t)) { return; }
      var n = +m[0], t0 = performance.now();
      (function paso(ahora) {
        var x = Math.min(1, (ahora - t0) / 1100); x = 1 - Math.pow(1 - x, 3);
        b.textContent = t.replace(m[0], String(Math.round(n * x)));
        if (x < 1) { requestAnimationFrame(paso); }
      })(t0);
    }
    var tit = uno(".pp-hero-t h1");
    if (op === "2") {
      tit.innerHTML = tit.textContent.split(" ").map(function (p, k) { return '<span class="an-m"><span style="--d:' + (150 + k * 90) + 'ms">' + esc(p) + '</span></span>'; }).join(" ");
      setTimeout(function () { tit.classList.add("an-tit-v"); }, 60);
      marcar([uno(".pp-hero-t small")]);
      marcar($$(".pp-hero-t p, .pp-hero-fila"), 140, 750);
    } else {
      if (op === "3") { tit.innerHTML = esc(tit.textContent).replace("impecable", '<span class="an-chispa">impecable</span>'); }
      marcar($$(".pp-hero-t > *"), 110, 250);
    }
    var fotos = [].slice.call(raiz.querySelectorAll(".pp-hero-f")), foto = fotos[0], cierre = uno(".pp-cierre");
    // Opción 4 (Limpieza, Hugo 18-11-2026): solo la primera foto (la franja de arriba) tiene efecto; las demás quedan quietas.
    if (op !== "4") { marcar(fotos, 500, op === "2" ? 250 : 450); }  // la foto entra después del texto
    var cifras = uno(".pp-cifras");  // la franja entra entera (si cada recuadro entra por su lado se ven las uniones)
    marcar([cifras]);
    if (op !== "2" && cifras) { cifras.__alVer = function () { $$(".pp-cifra b").forEach(contar); }; }
    $$(".pp-sec h2, .lp-nota").forEach(function (el) { marcar([el]); });
    if (op !== "4") { marcar($$(".lp-tipo"), 130); }
    marcar($$(".lp-paso"), 130);
    marcar($$(".pp-serv-i"), 90);  // Para Propietarios
    marcar($$(".pp-sello2"), 0, 900);
    marcar($$(".pp-camino"));
    marcar([uno(".pp-banda"), cierre]);
    if (op === "1") { fotos.forEach(function (f) { capa(f, "an-zoom", true); }); }
    if (op === "2") { capa(foto, "an-kb", true); capa(cierre, "an-kb", true); }
    // Para Propietarios (18-11-2026), 3 efectos de foto para elegir: 5 «Ventana», 6 «Enfoque», 7 «Franjas».
    var conCierre = fotos.concat(cierre ? [cierre] : []);
    if (op === "5") { conCierre.forEach(function (f) { capa(f, "an-ven", true); }); }
    if (op === "6") { conCierre.forEach(function (f) { capa(f, "an-foco", true); }); }
    if (op === "7") {
      conCierre.forEach(function (f) {
        capa(f, "an-zoom", true);
        var fr = document.createElement("i"); fr.className = "an-franjas"; fr.innerHTML = "<b></b><b></b><b></b><b></b><b></b><b></b>";
        f.appendChild(fr);
      });
    }
    if (op === "4") { capa(cierre, "an-rayo"); capa(cierre, "an-sucia", true); }
    if (op === "3") {
      fotos.concat([cierre]).concat($$(".lp-tipo-f")).forEach(function (f) { capa(f, "an-rayo"); capa(f, "an-sucia", true); });
    }
    var lista = $$(".an-r");
    function ver(el) {
      if (el.classList.contains("an-v")) { return; }
      // Lo que quedó más arriba (si bajaron rápido o con un salto) también aparece: nunca queda nada escondido atrás.
      for (var k = 0; k < lista.indexOf(el); k++) { ver(lista[k]); }
      var d = parseInt(el.style.getPropertyValue("--d"), 10) || 0;
      el.classList.add("an-v");
      if (el.__alVer) { setTimeout(el.__alVer, d + 200); }
      setTimeout(function () { el.classList.remove("an-r"); }, d + 2200);  // terminada la entrada, el efecto al pasar el mouse va sin demora
    }
    var avisos = 0;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { avisos++; io.unobserve(en.target); [].concat(en.target.__an || en.target).forEach(ver); } });
    }, { threshold: 0.1 });
    // Red de seguridad (Hugo, 18-11-2026: en su iPhone la página quedó en blanco más de 20 s). Dentro de Wix, Safari del
    // iPhone puede no avisar nunca que algo está a la vista, y todo se queda escondido. Por eso:
    // (1) lo de arriba (primeros 900 px) entra solo, sin esperar al aviso;
    // (2) si en 1,5 s no llegó ningún aviso, se muestra todo;
    // (3) a los 5 s se muestra todo igual, por si los avisos se cortan al bajar.
    lista.forEach(function (el) { if (el.getBoundingClientRect().top < 900) { setTimeout(function () { ver(el); }, 30); } });
    setTimeout(function () { if (!avisos) { lista.forEach(ver); } }, 1500);
    setTimeout(function () { lista.forEach(ver); }, 5000);
    // Una foto tapada con clip-path cuenta como invisible para el observador: en la opción 2 se mira a su contenedor.
    lista.forEach(function (el) {
      var obj = op === "2" && (fotos.indexOf(el) >= 0 || el === cierre) ? el.parentNode : el;
      obj.__an = (obj.__an || []).concat(el); io.observe(obj);
    });
  }


  // ───────── Encabezado y pie propios (Hugo, 18-11-2026: «la más rápida») ─────────
  // Dentro de Wix la página quedaba en blanco en el celular: Wix crea el recuadro recién después de cargar ~180 archivos.
  // Abierta sola (registro.bookzienna.com) carga en 2-4 s, pero necesita el mismo encabezado y pie que la web.
  // Se dibujan solo cuando la página NO está dentro de un recuadro.
  var SOLA = window.top === window;
  // Ancho homogéneo en computadora (Hugo, 18-11-2026: «unos son más anchos, otros menos»): todas las páginas usan la
  // medida de la portada de Wix, el diseño de 1181 px escalado al 93,3 % de la pantalla (hasta 1800 px). Celular igual.
  var ANCHO_SEL = null;
  function aplicarAncho() {
    var el = ANCHO_SEL && document.querySelector(ANCHO_SEL);
    if (!el || window.innerWidth < 900 || !SOLA) { return; }
    el.style.width = "1181px"; el.style.maxWidth = "none"; el.style.marginLeft = el.style.marginRight = "auto";
    el.style.zoom = String(Math.min(window.innerWidth * 0.9333, 1800) / 1181);
  }
  function anchoPC(sel) { ANCHO_SEL = sel; aplicarAncho(); }
  window.addEventListener("resize", function () { aplicarAncho(); });
  function marcoWeb(CEL, actual) {
    var M = [["Home", WEB + "/"], ["Alojamientos", LISTADO], ["Para Propietarios", RAPIDA + "/propietarios"], ["Limpieza", RAPIDA + "/limpieza"]];
    var links = M.map(function (x) { return '<a href="' + x[1] + '"' + (x[0] === actual ? ' class="on"' : '') + '>' + x[0] + '</a>'; }).join("");
    var cab = '<header class="zw-cab' + (CEL ? " zw-cel" : "") + '"><a class="zw-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_h.png" alt="Zienna Living & Aparts"></a>' +
      (CEL ? favLink(true) + '<button type="button" class="zw-menu" id="zw-menu" aria-label="Abrir menú" aria-expanded="false"><i></i><i></i><i></i></button>' +
        '<nav class="zw-nav-cel" id="zw-nav">' + links + '<a class="zw-res" href="' + LISTADO + '">Reservar</a></nav>' :
        '<nav class="zw-nav">' + links + '</nav>' + favLink(false) + '<a class="zw-res" href="' + LISTADO + '">Reservar</a>') + '</header>';
    var pie = '<footer class="zw-pie' + (CEL ? " zw-cel" : "") + '"><div class="zw-pie-g">' +
      '<a class="zw-pie-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_blanco.png" alt="Zienna"></a>' +
      '<div><b>CONTACTO</b><a href="' + WEB + '/contacto">info@bookzienna.com</a><a href="' + WEB + '/contacto">Formulario de contacto</a><span>Lima, Perú</span></div>' +
      '<div><b>ATENCIÓN Y REDES</b><span class="zw-redes"><a class="zw-ig" href="https://www.instagram.com/bookzienna/" target="_blank" rel="noopener" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a><a class="zw-ig" href="https://www.facebook.com/p/Zienna-Living-Aparts-61594152062887/" target="_blank" rel="noopener" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z"/></svg></a><a class="zw-ig" href="https://www.tiktok.com/@bookzienna" target="_blank" rel="noopener" aria-label="TikTok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 3 2.5 4.5 5 4.5"/></svg></a></span></div>' +
      '<div><b>INFORMACIÓN LEGAL</b><p><a href="' + WEB + '/politica-de-privacidad">Privacidad</a> • <a href="' + WEB + '/terminos-y-condiciones">Condiciones</a> • <a href="' + WEB + '/politica-de-cookies">Cookies</a></p>' +
        '<a class="zw-lr" href="' + RAPIDA + '/libro-de-reclamaciones">' + LIBRO_SVG + '<span><b>LIBRO DE RECLAMACIONES</b><small>Ingresa aquí para registrar tu reclamo o queja</small></span></a></div>' +
      '</div><i class="zw-pie-l"></i><small>© ' + new Date().getFullYear() + ' ZIENNA LIVING & APARTS. Todos los derechos quedan reservados.</small></footer>';
    return { cab: cab, pie: pie };
  }
  // Encabezado de las 5 pantallas que quedaban con el viejo (Hugo eligió la B, 18-11-2026): fechas/resultados, reserva,
  // agenda de limpieza, todas las fotos y contacto. Fotos y contacto: menú completo y pie. Pasos de compra (fechas, reserva,
  // agenda): solo logo + «‹ Volver», sin pie, para que no se distraigan. Va fuera de #dz-app para que no lo agrande anchoPC().
  var MARCO = "b";
  function marcoPaso(actual, volver, flujo) {
    if (!MARCO || !SOLA) { return false; }
    var CEL = window.innerWidth < 700, corto = MARCO === "c" || (MARCO === "b" && flujo), conPie = !(MARCO === "b" && flujo);
    var mw = marcoWeb(CEL, actual);
    var cab = corto ? '<header class="zw-cab zw-corto' + (CEL ? ' zw-cel' : '') + '"><a class="zw-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_h.png" alt="Zienna Living & Aparts"></a>' +
      '<a class="zw-volver" href="' + esc(volver || LISTADO) + '">‹ Volver</a></header>' : mw.cab;
    var a = document.getElementById("zw-arriba"), b = document.getElementById("zw-abajo");
    if (!a) {
      a = document.createElement("div"); a.id = "zw-arriba"; APP.parentNode.insertBefore(a, APP);
      b = document.createElement("div"); b.id = "zw-abajo"; APP.parentNode.insertBefore(b, APP.nextSibling);
      document.body.classList.add("zw-marco");
    }
    a.innerHTML = cab; b.innerHTML = conPie ? mw.pie : "";
    ligarMarco();
    return true;
  }
  function ligarMarco() {
    var b = document.getElementById("zw-menu");
    if (!b) { return; }
    b.addEventListener("click", function () {
      var n = document.getElementById("zw-nav"), abierto = n.classList.toggle("abierto");
      b.setAttribute("aria-expanded", abierto ? "true" : "false"); b.classList.toggle("abierto", abierto);
    });
  }

  // ───────── Embudo web (Hugo, 18-11-2026: «hazme el embudo y vamos afinando») ─────────
  // Cada paso del visitante se avisa al PMS (zienna.api.stays.embudo_web.evento → Embudo web). El visitante es un
  // número al azar de este navegador: nada personal viaja hasta que él mismo llena la solicitud. Dentro de un
  // recuadro de Wix solo cuenta la portada. Para probar sin ensuciar los datos: abrir cualquier página con ?prueba=1.
  var DENTRO = window.top !== window, VIS = "", SES = "", ORI = "", PRUEBA = false;
  function azar(n) { var s = ""; while (s.length < n) { s += Math.random().toString(36).slice(2); } return s.slice(0, n); }
  function origenDe() {
    var t = ((Q.get("utm_source") || "") + " " + (Q.get("gclid") ? "google" : "") + " " + (document.referrer || "")).toLowerCase();
    if (/google/.test(t)) { return "google"; }
    if (/instagram/.test(t)) { return "instagram"; }
    if (/facebook|fb\.|fbclid/.test(t) || Q.get("fbclid")) { return "facebook"; }
    if (/tiktok/.test(t)) { return "tiktok"; }
    if (/whatsapp|wa\.me/.test(t)) { return "whatsapp"; }
    if (/airbnb/.test(t)) { return "airbnb"; }
    if (/bookzienna\.com/.test(t)) { return "inicio"; }
    return t.trim() ? "otro" : "directo";
  }
  try {
    if (Q.get("prueba") === "1") { localStorage.setItem("zprueba", "1"); }
    if (Q.get("prueba") === "0") { localStorage.removeItem("zprueba"); }
    PRUEBA = localStorage.getItem("zprueba") === "1";
    VIS = localStorage.getItem("zv") || ""; if (!/^[a-z0-9]{16}$/.test(VIS)) { VIS = azar(16); localStorage.setItem("zv", VIS); }
    SES = sessionStorage.getItem("zs") || ""; if (!SES) { SES = azar(12); sessionStorage.setItem("zs", SES); }
    ORI = sessionStorage.getItem("zo") || ""; if (!ORI) { ORI = origenDe(); sessionStorage.setItem("zo", ORI); }
  } catch (e) { VIS = VIS || azar(16); SES = SES || azar(12); ORI = ORI || origenDe(); }
  // ───────── Píxel de Meta (Hugo, 18-11-2026: centro de publicidad de Zienna) ─────────
  // Conjunto de datos «Zienna Web» del portafolio «Zienna | Living & Aparts». Cada paso del embudo se traduce a un
  // evento estándar de Meta, para que los anuncios aprendan a buscar gente que pide reservar y no solo gente que da clic.
  // No viaja ningún dato personal (ni nombre, ni celular, ni documento). Con ?prueba=1 o dentro del recuadro de Wix no se
  // carga: la portada de Wix lleva el mismo píxel por su integración de marketing.
  var PIXEL_META = "1119240644243141", FBQ = null;
  var META_EV = { visita: "ViewContent", fechas: "Search", reservar: "InitiateCheckout", datos: "Lead", whatsapp: "Contact", contacto: "Contact", favorito: "AddToWishlist" };
  if (!DENTRO && !PRUEBA) {
    try {
      if (!window.fbq) {
        var n = window.fbq = function () { if (n.callMethod) { n.callMethod.apply(n, arguments); } else { n.queue.push(arguments); } };
        if (!window._fbq) { window._fbq = n; }
        n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        var sc = document.createElement("script"); sc.async = true; sc.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(sc);
      }
      window.fbq("init", PIXEL_META); window.fbq("track", "PageView"); FBQ = window.fbq;
    } catch (e) { FBQ = null; }
  }
  // m: datos solo para Meta (valor de la solicitud), que el PMS no necesita.
  function meta(e, x, m) {
    if (!FBQ) { return; }
    try {
      var nombre = META_EV[e], d = {};
      if (e === "visita" && !x.p) { return; }  // las páginas sin alojamiento ya cuentan con el PageView
      if (e === "agenda") {  // agenda de limpieza: paso 5 = pedido guardado, 6 = abrió WhatsApp
        nombre = x.paso === 5 ? "Lead" : x.paso === 6 ? "Contact" : ""; d.content_category = "limpieza";
      }
      if (!nombre) { return; }
      if (x.p) { d.content_ids = [x.p]; }
      if (x.ll) { d.checkin_date = x.ll; }
      if (x.sa) { d.checkout_date = x.sa; }
      if (x.h) { d.num_adults = x.h; }
      if (!d.content_category) { d.content_category = e === "contacto" ? "contacto" : "alojamiento"; }
      Object.keys(m || {}).forEach(function (k) { d[k] = m[k]; });
      FBQ("track", nombre, d);
    } catch (er) {}
  }
  function rastrear(e, x, m) {
    if ((DENTRO && MODO !== "portada") || PRUEBA) { return; }
    try {
      var f = new FormData(); x = x || {};
      f.append("v", VIS); f.append("s", SES); f.append("e", e); f.append("o", ORI); f.append("d", window.innerWidth < 700 ? "cel" : "pc");
      f.append("pag", (location.pathname + location.search).slice(0, 140));
      Object.keys(x).forEach(function (k) { if (x[k] != null && x[k] !== "") { f.append(k, x[k]); } });
      var u = BASE + "/api/method/zienna.api.stays.embudo_web.evento";
      if (!(navigator.sendBeacon && navigator.sendBeacon(u, f))) { fetch(u, { method: "POST", body: f, keepalive: true }).catch(function () {}); }
    } catch (er) {}
    meta(e, x || {}, m);
  }
  // Una búsqueda con fechas se cuenta una vez por sesión (por fechas y alojamiento). «libre»: si había algo libre.
  function avisarFechas(d) {
    if (!d || !d.llegada || !d.salida || !d.resultados) { return; }
    var k = "zfe_" + d.llegada + d.salida + PROP;
    try { if (sessionStorage.getItem(k)) { return; } sessionStorage.setItem(k, "1"); } catch (e) {}
    var libre = PROP ? d.resultados.some(function (x) { return x.propiedad === PROP && x.libre; }) : d.resultados.some(function (x) { return x.libre; });
    rastrear("fechas", { p: PROP, ll: d.llegada, sa: d.salida, h: busq.h || 2, libre: libre ? 1 : 0 });
  }

  // ───────── Favoritos ♡ (Hugo, 18-11-2026: «el corazón para que comparta con alguien, puede ser su compañero») ─────────
  // Se guardan en este navegador. /favoritos los muestra y los comparte con un enlace (?c=SI2105.SM1006) que la otra
  // persona abre sin tener nada guardado.
  var SVG_CORAZON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.3-4.4-9.2-8.9C1.6 8.5 3.5 5 6.9 5c2 0 3.5 1.1 4.3 2.4h1.6C13.6 6.1 15.1 5 17.1 5c3.4 0 5.3 3.5 4.1 6.6-1.9 4.5-9.2 8.9-9.2 8.9z"/></svg>', SVG_COMPARTIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  function favs() {
    try { var a = JSON.parse(localStorage.getItem("zfav") || "[]"); return Array.isArray(a) ? a.filter(function (x) { return /^[A-Z0-9]{3,12}$/.test(x); }) : []; } catch (e) { return []; }
  }
  function esFav(p) { return favs().indexOf(p) >= 0; }
  function corazon(p) { return '<button type="button" class="zf-co' + (esFav(p) ? ' on' : '') + '" data-fav="' + esc(p) + '" aria-label="Guardar en favoritos">' + SVG_CORAZON + '</button>'; }
  function favLink(cel) {
    var n = favs().length;
    return '<a class="zw-fav' + (cel ? ' zw-fav-cel' : '') + '" href="' + RAPIDA + '/favoritos" aria-label="Tus favoritos">' + SVG_CORAZON + (cel ? '' : '<span>Favoritos</span>') + '<b' + (n ? '' : ' hidden') + '>' + n + '</b></a>';
  }
  function pintarFavs() {
    var n = favs().length;
    [].forEach.call(document.querySelectorAll(".zw-fav b"), function (b) { b.textContent = n; b.hidden = !n; });
    [].forEach.call(document.querySelectorAll("[data-fav]"), function (b) { b.classList.toggle("on", esFav(b.getAttribute("data-fav"))); });
  }
  function tostada(texto, href, etiqueta) {
    var t = document.getElementById("zt"); if (t) { t.remove(); }
    t = document.createElement("div"); t.id = "zt"; t.className = "zt";
    t.innerHTML = '<span>' + esc(texto) + '</span>' + (href ? '<a href="' + esc(href) + '">' + esc(etiqueta) + '</a>' : '');
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) { t.remove(); } }, 3500);
  }
  function compartir(titulo, texto, url, lista) {
    rastrear("compartir", { p: PROP, lista: lista });
    if (navigator.share) { navigator.share({ title: titulo, text: texto, url: url }).catch(function () {}); return; }
    window.open("https://wa.me/?text=" + encodeURIComponent(texto + " " + url), "_blank", "noopener");
  }
  if (!DENTRO) {
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-fav]");
      if (b) {
        ev.preventDefault(); ev.stopPropagation();
        var p = b.getAttribute("data-fav"), a = favs(), i = a.indexOf(p);
        if (i >= 0) { a.splice(i, 1); rastrear("quita_favorito", { p: p }); tostada("Lo quitaste de tus favoritos"); }
        else { a.push(p); rastrear("favorito", { p: p }); tostada("Guardado en tus favoritos", "/favoritos", "Ver"); }
        try { localStorage.setItem("zfav", JSON.stringify(a)); } catch (e) {}
        pintarFavs(); return;
      }
      var c = ev.target.closest("[data-compartir]");
      if (c) {
        ev.preventDefault(); ev.stopPropagation();
        var t = document.querySelector("h1"), nombre = t ? t.textContent.replace(/\s+/g, " ").replace(" •", ",").trim() : "Zienna";
        compartir(nombre, "Mira este alojamiento de Zienna: " + nombre + ".", FIJAS + location.pathname.replace(/\/$/, ""), PROP);
      }
    }, true);
  }
  // Ficha: «Compartir» y «Guardar» arriba a la derecha (computadora) o sobre la foto (celular).
  function accionesFicha(CEL) {
    var caja = document.querySelector(CEL ? "#fi-det .fd-gal" : "#fi-det .cb");
    if (!caja || caja.querySelector(".fi-acc")) { return; }
    var d = document.createElement("div"); d.className = "fi-acc" + (CEL ? " fi-acc-cel" : "");
    d.innerHTML = '<button type="button" data-compartir="1" aria-label="Compartir">' + SVG_COMPARTIR + (CEL ? '' : '<span>Compartir</span>') + '</button>' +
      '<button type="button" class="fi-guardar' + (esFav(PROP) ? ' on' : '') + '" data-fav="' + esc(PROP) + '" aria-label="Guardar en favoritos">' + SVG_CORAZON + (CEL ? '' : '<span>Guardar</span>') + '</button>';
    caja.appendChild(d);
  }
  function modoFavoritos() {
    var CEL = window.innerWidth < 700;
    document.body.className += " fi-en li-en fv-en dz-modo-resultados " + (CEL ? "fi-cel li-cel" : "fi-pc");
    letraZienna();
    var comp = (Q.get("c") || "").toUpperCase().split(".").filter(function (x) { return /^[A-Z0-9]{3,12}$/.test(x); }).slice(0, 12);
    if (comp.length) { rastrear("abre_compartido", { lista: comp.join(".") }); }
    var mw = marcoWeb(CEL, "");
    ANCHO_SEL = ".fv"; setTimeout(aplicarAncho, 0);
    APP.innerHTML = mw.cab + '<div class="fv"><h1 id="fv-t">Tus favoritos</h1><p class="fv-sub" id="fv-sub">Cargando…</p><div class="fv-bts" id="fv-bts"></div><div class="dz-filas" id="zr-lista"></div></div>' + mw.pie;
    ligarMarco();
    function pintar() {
      var mios = favs(), lista = comp.length ? comp : mios, porP = {};
      alojamientos.forEach(function (a) { porP[a.propiedad] = a; });
      var xs = lista.map(function (p) { return porP[p]; }).filter(Boolean);
      document.getElementById("fv-t").textContent = comp.length ? "Te compartieron estos alojamientos" : "Tus favoritos";
      document.getElementById("fv-sub").textContent = comp.length ? "Alguien los guardó para ti en Zienna. Toca uno para ver fotos, precio y fechas libres."
        : xs.length ? "Los guardaste en este navegador. Compártelos con quien viaja contigo." : "Aún no guardas ningún alojamiento. Toca el ♡ en los que te gusten.";
      var bts = "";
      if (comp.length && comp.some(function (p) { return mios.indexOf(p) < 0; })) { bts += '<button type="button" class="li-bt" id="fv-guardar">' + SVG_CORAZON + 'Guardar en mis favoritos</button>'; }
      if (!comp.length && xs.length) { bts += '<button type="button" class="li-bt" id="fv-comp">' + SVG_COMPARTIR + 'Compartir con alguien</button>'; }
      if (!xs.length) { bts += '<a class="li-bt" href="' + LISTADO + '">Ver alojamientos</a>'; }
      document.getElementById("fv-bts").innerHTML = bts;
      document.getElementById("zr-lista").innerHTML = xs.map(function (a) { return filaHTML(a, null); }).join("");
    }
    document.getElementById("fv-bts").addEventListener("click", function (ev) {
      if (ev.target.closest("#fv-comp")) {
        var l = favs().join("."), n = favs().length;
        compartir("Mis favoritos de Zienna", n === 1 ? "Te comparto este alojamiento de Zienna que me gustó:" : "Te comparto estos " + n + " alojamientos de Zienna que me gustaron:", RAPIDA + "/favoritos?c=" + l, l);
      }
      if (ev.target.closest("#fv-guardar")) {
        var a = favs(); comp.forEach(function (p) { if (a.indexOf(p) < 0) { a.push(p); rastrear("favorito", { p: p }); } });
        try { localStorage.setItem("zfav", JSON.stringify(a)); } catch (e) {}
        pintarFavs(); pintar(); tostada("Guardados en tus favoritos");
      }
    });
    llamarSWR("alojamientos", {}, function (d) { alojamientos = d.alojamientos; pintar(); });
  }

  // ───────── ficha rápida (Hugo, 18-11-2026: «que sea rápido, sin perder nada») ─────────
  // En Wix la ficha eran 4 recuadros (detalle, tarjeta, cierre y barra de abajo) que en el celular aparecían recién a los
  // 6-9 s. Aquí van las mismas piezas en una sola página, con el encabezado y el pie de la web y el mapa de «Ubicación».
  var FICHA_HOOK = null, FICHA_CAL = null;
  // El mismo punto que el mapa de Wix de cada ficha.
  var MAPAS = { SI2105: [-12.1023132, -77.0583109], SM310: [-12.0930121, -77.0799632], SM1006: [-12.0860919, -77.095423],
    LINCE902: [-12.0858766, -77.0365556], LINCE902A: [-12.0858766, -77.0365556], LINCE902B: [-12.0858766, -77.0365556],
    LINCE1504: [-12.0858766, -77.0365556], SI502: [-12.0967616, -77.0575723] };
  function modoFicha() {
    var CEL = window.innerWidth < 700;  // (un <main> no sirve: una regla general de la web le quita el ancho máximo)
    document.body.className += " fi-en " + (CEL ? "fi-cel" : "fi-pc");
    letraZienna();
    var mw = marcoWeb(CEL, "Alojamientos"), m = MAPAS[PROP];
    var mapa = m ? '<section class="fi-ubi"><h2>Ubicación</h2><div class="fi-mapa"><iframe loading="lazy" title="Mapa de la ubicación" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + m[0] + ',' + m[1] + '&amp;z=15&amp;hl=es&amp;output=embed"></iframe></div></section>' : '';
    APP.innerHTML = mw.cab + '<div class="fi"><div id="fi-det"></div>' + mapa + '<div id="fi-cie"></div></div>' + mw.pie + (CEL ? '<div class="fi-bf" id="fi-bf"></div>' : '');
    anchoPC(".fi");
    ligarMarco();
    // Computadora: la tarjeta de reserva va en la columna derecha de la ficha y acompaña al bajar.
    var tj = CEL ? null : document.createElement("div"), conTj = false;
    if (tj) { tj.className = "fi-tj"; }
    FICHA_HOOK = function () {
      var der = document.querySelector("#fi-det .fd-der");
      if (!tj || !der) { return; }
      der.appendChild(tj);
      if (!conTj) { conTj = true; modoTarjeta(tj); }
    };
    var gancho = FICHA_HOOK;
    FICHA_HOOK = function () { if (gancho) { gancho(); } accionesFicha(CEL); };
    modoDetalle(document.getElementById("fi-det"));
    modoCierre(document.getElementById("fi-cie"));
    if (CEL) { barraNueva(document.getElementById("fi-bf")); }
  }

  // ───────── Alojamientos, página rápida: propuesta A de Hugo (18-11-2026, «galería como la portada») ─────────
  // Título, buscador (abre nuestro calendario), filtro por zona y tarjetas grandes de 3 en 3 (1 en celular), y la
  // franja del 20 %. Sin caja de contacto. Con fechas ya elegidas muestra solo los libres y el precio total.
  function modoListado() {
    var CEL = window.innerWidth < 700;
    document.body.className += " la-en" + (CEL ? " la-cel" : "");
    letraZienna();
    var mw = marcoWeb(CEL, "Alojamientos"), zona = ["San Miguel", "San Isidro", "Lince"].indexOf(Q.get("zona") || "") >= 0 ? Q.get("zona") : "", lista = null, res = null, dz = null;
    var ORDEN = ["SM1006", "SI2105", "SI502", "SM310", "LINCE1504", "LINCE902"];
    var conFechas = function () { return !!(busq.ll && busq.sa); };
    APP.innerHTML = mw.cab + '<div class="la"><section class="la-h"><h1>Nuestros alojamientos</h1>' +
      '<p>Departamentos en San Isidro, San Miguel y Lince. Precio total visible antes de reservar.</p>' +
      '<a class="la-bar" id="la-bar" href="' + esc(urlBuscar("fechas")) + '"><span><small>LLEGADA</small><b id="la-ll"></b></span><span><small>SALIDA</small><b id="la-sa"></b></span>' +
      '<span><small>HUÉSPEDES</small><b id="la-h"></b></span><em>Buscar</em></a><p class="la-est" id="la-est"></p>' +
      '<div class="la-chips" id="la-chips">' + ["", "San Miguel", "San Isidro", "Lince"].map(function (z) { return '<button type="button" data-z="' + z + '"' + (z === zona ? ' class="on"' : '') + '>' + (z || "Todas") + '</button>'; }).join("") + '</div></section>' +
      '<div class="la-g" id="la-g"><p class="la-vacio">Cargando…</p></div>' +
      '<section class="la-banda"><div><b id="la-bt">Reserva directo y paga 20\u00a0% menos</b><span id="la-bs">Promoción exclusiva a partir de 2 noches.</span></div><a href="' + esc(urlBuscar("fechas")) + '">Ver fechas libres</a></section></div>' + mw.pie;
    ligarMarco();
    anchoPC(".la");
    function tarjeta(a) {
      var f = res && res[a.propiedad], foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_900,h_675");
      var pill = f && f.libre ? precioTachado(f) + " · " + f.noches + (f.noches === 1 ? " noche" : " noches") : "Desde " + desdeTachado(a.desde) + " noche";
      return '<a class="la-c" href="' + esc(urlFicha(a)) + '"><span class="la-f" style="background-image:url(\'' + esc(foto) + '\')"><span class="la-pills"><span class="la-pill">' + pill + '</span>' +
        '</span>' + corazon(a.propiedad) + '</span>' +
        '<span class="la-1"><b>' + esc(a.titulo_web || a.nombre) + '</b>' + (a.nota ? '<span>★ ' + esc(nota(a.nota)) + '</span>' : '') + '</span>' +
        '<span class="la-2">' + esc(a.distrito) + (a.resenas ? ' · ' + puntos(a.resenas) + ' reseñas' : '') + '</span>' + (a.detalle ? '<span class="la-2">' + esc(a.detalle) + '</span>' : '') + (f && f.libre ? precioFinal(f) : '') + '</a>';
    }
    function pintar() {
      var h = +busq.h || 2;
      document.getElementById("la-ll").textContent = busq.ll ? corto(busq.ll) : "Agregar fecha";
      document.getElementById("la-sa").textContent = busq.sa ? corto(busq.sa) : "Agregar fecha";
      document.getElementById("la-h").textContent = h + (h === 1 ? " huésped" : " huéspedes");
      document.getElementById("la-bar").href = urlBuscar("fechas");
      var est = document.getElementById("la-est");
      est.innerHTML = conFechas() ? 'Libres del ' + corto(busq.ll) + ' al ' + corto(busq.sa) + ' · precio total de tu estadía. <button type="button" id="la-borrar">Borrar fechas</button>' : '';
      if (dz) { document.getElementById("la-bt").textContent = "Reserva directo y paga " + dz.pct + "\u00a0% menos"; document.getElementById("la-bs").textContent = "Promoción exclusiva a partir de " + dz.noches + " noches."; }
      if (!lista || (conFechas() && !res)) { return; }
      var xs = lista.filter(function (a) { return (!zona || a.distrito === zona) && (!conFechas() || (res[a.propiedad] && res[a.propiedad].libre)); });
      xs.sort(function (x, y) { var i1 = ORDEN.indexOf(x.propiedad), i2 = ORDEN.indexOf(y.propiedad); return (i1 < 0 ? 99 : i1) - (i2 < 0 ? 99 : i2); });
      document.getElementById("la-g").innerHTML = xs.length ? xs.map(tarjeta).join("") :
        '<p class="la-vacio">' + (conFechas() ? "No hay alojamientos libres del " + corto(busq.ll) + " al " + corto(busq.sa) + (zona ? " en " + esc(zona) : "") + ". Prueba otras fechas." : "No hay alojamientos en esta zona.") + '</p>';
    }
    document.getElementById("la-chips").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-z]"); if (!b) { return; }
      zona = b.getAttribute("data-z");
      [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); });
      pintar();
    });
    document.getElementById("la-est").addEventListener("click", function (ev) {
      if (!ev.target.closest("#la-borrar")) { return; }
      busq.ll = ""; busq.sa = ""; guardar(); res = null; pintar();
    });
    llamarSWR("alojamientos", {}, function (d) { lista = d.alojamientos; alojamientos = lista; dz = d.descuento || null; pintar(); });
    if (conFechas()) {
      llamar("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h || 2 }).then(function (d) {
        res = {}; d.resultados.forEach(function (f) { res[f.propiedad] = f; }); pintar();
      }).catch(function () { res = {}; pintar(); });
    }
    pintar();
  }

  // ───────── Portada propia (Hugo, 19-11-2026: opción A «Cine»; mientras no haya video, fotos con transiciones) ─────────
  // Fotos a pantalla completa que se funden una en otra con un acercamiento lento; encima, el buscador. ES · EN · PT
  // (por ahora solo esta página; las fichas siguen en español). Idioma: ?lang=, lo último elegido, o el del navegador.
  var PORTADA_FOTOS = [
    ["b4147d_6cadcd4b83ef46659e5318c6e31b3c72~mv2.jpeg", "SM1006"], ["d58443_c497c759fbc54183b6f4c4445e5d263e~mv2.jpg", "SI2105"],
    ["b4147d_d18a8a9007524776a9cc422714918d40~mv2.jpeg", "SM1006"], ["b4147d_d4f19b6c10fa4b8e9195e3bad5d26041~mv2.png", "SM310"],
    ["b4147d_7617ffe95430420e97fb4bbaac7a1ac0~mv2.jpeg", "SM1006"], ["b4147d_c2df8fcba89f4feca5d07781c423e4a1~mv2.png", "LINCE1504"],
    ["b4147d_9b8f57dd925f4913a442f0b5b72829f9~mv2.jpeg", "SI502"]];
  var PORTADA_T = {
    es: { promo: "Reserva directo y paga <b>20 % menos</b> · desde 2 noches", nav: ["Alojamientos", "Para Propietarios", "Limpieza"], reservar: "Reservar",
      ceja: "Zienna Living & Aparts · Lima", t1: "Vive Lima frente al mar",
      t2: "Departamentos de diseño en San Isidro, San Miguel y Lince. Llegada autónoma, limpieza incluida y precio final sin sorpresas.",
      zona: "Zona", todas: "Todas las zonas", ll: "Llegada", sa: "Salida", hu: "Huéspedes", agregar: "Agregar fecha", huesped: ["huésped", "huéspedes"], buscar: "Buscar",
      fotos: ["Piscina frente al mar · San Miguel", "Piscina con vista · San Isidro", "Atardecer en tu terraza · San Miguel", "Piscina frente al mar · San Miguel", "Sala con vista al Pacífico · San Miguel", "Piscina con vista a la ciudad · Lince", "Piscina al atardecer · San Isidro"],
      puntos: [["Frente al mar", "Vistas al Pacífico y a la ciudad desde pisos altos."], ["Llegada autónoma", "Tu propia clave: entras desde las 3:00 pm, sin esperar a nadie."], ["Limpieza incluida", "El precio que ves es el final. No pagas nada más."], ["Atención directa", "Te respondemos por WhatsApp, sin intermediarios."]],
      elige: "Elige tu zona", verTodos: "Ver todos los alojamientos",
      zonas: [["San Miguel", "Frente al mar, con vista al Pacífico"], ["San Isidro", "Vista al mar y calles arboladas"], ["Lince", "Céntrico, con piscina y vista a la ciudad"]],
      menu: "Abrir menú", nota: "Elige tus fechas en el siguiente paso." },
    en: { promo: "Book direct and save <b>20 %</b> · from 2 nights", nav: ["Stays", "Property owners", "Cleaning"], reservar: "Book now",
      ceja: "Zienna Living & Aparts · Lima", t1: "Live Lima by the sea",
      t2: "Design apartments in San Isidro, San Miguel and Lince. Self check-in, cleaning included and a final price with no surprises.",
      zona: "Area", todas: "All areas", ll: "Check-in", sa: "Check-out", hu: "Guests", agregar: "Add date", huesped: ["guest", "guests"], buscar: "Search",
      fotos: ["Oceanfront pool · San Miguel", "Pool with a view · San Isidro", "Sunset on your terrace · San Miguel", "Oceanfront pool · San Miguel", "Living room facing the Pacific · San Miguel", "Pool with city views · Lince", "Pool at sunset · San Isidro"],
      puntos: [["By the sea", "Pacific and city views from high floors."], ["Self check-in", "Your own door code: arrive from 3:00 pm, no waiting."], ["Cleaning included", "The price you see is the final price. Nothing else to pay."], ["Direct support", "We reply on WhatsApp, no middlemen."]],
      elige: "Choose your area", verTodos: "See all stays",
      zonas: [["San Miguel", "Oceanfront, facing the Pacific"], ["San Isidro", "Sea views and tree-lined streets"], ["Lince", "Central, with a pool and city views"]],
      menu: "Open menu", nota: "Pick your dates in the next step." },
    pt: { promo: "Reserve direto e pague <b>20 % menos</b> · a partir de 2 noites", nav: ["Hospedagens", "Proprietários", "Limpeza"], reservar: "Reservar",
      ceja: "Zienna Living & Aparts · Lima", t1: "Viva Lima de frente para o mar",
      t2: "Apartamentos de design em San Isidro, San Miguel e Lince. Check-in autônomo, limpeza incluída e preço final sem surpresas.",
      zona: "Região", todas: "Todas as regiões", ll: "Chegada", sa: "Saída", hu: "Hóspedes", agregar: "Adicionar data", huesped: ["hóspede", "hóspedes"], buscar: "Buscar",
      fotos: ["Piscina de frente para o mar · San Miguel", "Piscina com vista · San Isidro", "Pôr do sol no seu terraço · San Miguel", "Piscina de frente para o mar · San Miguel", "Sala com vista para o Pacífico · San Miguel", "Piscina com vista para a cidade · Lince", "Piscina ao pôr do sol · San Isidro"],
      puntos: [["De frente para o mar", "Vista para o Pacífico e para a cidade, em andares altos."], ["Check-in autônomo", "Sua própria senha: entre a partir das 15h, sem esperar ninguém."], ["Limpeza incluída", "O preço que você vê é o final. Nada mais a pagar."], ["Atendimento direto", "Respondemos pelo WhatsApp, sem intermediários."]],
      elige: "Escolha a região", verTodos: "Ver todas as hospedagens",
      zonas: [["San Miguel", "De frente para o mar, com vista para o Pacífico"], ["San Isidro", "Vista para o mar e ruas arborizadas"], ["Lince", "Central, com piscina e vista para a cidade"]],
      menu: "Abrir menu", nota: "Escolha as datas no próximo passo." }
  };
  function modoInicio() {
    var CEL = window.innerWidth < 760, $ = function (id) { return document.getElementById(id); };
    var lang = (Q.get("lang") || "").toLowerCase();
    if (!PORTADA_T[lang]) { try { lang = localStorage.getItem("zlang") || ""; } catch (e) { lang = ""; } }
    if (!PORTADA_T[lang]) { lang = /^pt/i.test(navigator.language || "") ? "pt" : /^en/i.test(navigator.language || "") ? "en" : "es"; }
    document.body.className += " in-en" + (CEL ? " in-cel" : "");
    letraZienna();
    var mw = marcoWeb(CEL, "");
    var actual = 0, timer = null, zonaSel = "";
    var ZFOTO = { "San Miguel": "b4147d_7617ffe95430420e97fb4bbaac7a1ac0~mv2.jpeg", "San Isidro": "d58443_c497c759fbc54183b6f4c4445e5d263e~mv2.jpg", "Lince": "b4147d_d05b7a52aca34774b80ddf1f81ff7f5e~mv2.png" };
    function foto(id) { return CEL ? wixFoto(id, 900, 1500) : wixFoto(id, 1920, 1080); }
    function urlListado(z) { var u = LISTADO, q = []; if (z) { q.push("zona=" + encodeURIComponent(z)); } if (busq.ll && busq.sa) { q.push("ll=" + busq.ll, "sa=" + busq.sa, "h=" + (busq.h || 2)); } return u + (q.length ? "?" + q.join("&") : ""); }
    function pintar() {
      var T = PORTADA_T[lang], h = +busq.h || 2;
      document.documentElement.lang = lang;
      var navs = [LISTADO, RAPIDA + "/propietarios", RAPIDA + "/limpieza"];
      var idi = '<div class="in-idi" id="in-idi">' + ["es", "en", "pt"].map(function (l) { return '<button type="button" data-l="' + l + '"' + (l === lang ? ' class="on"' : '') + '>' + l.toUpperCase() + '</button>'; }).join("") + '</div>';
      var opH = ""; for (var i = 1; i <= 6; i++) { opH += '<option value="' + i + '"' + (i === h ? " selected" : "") + '>' + i + " " + T.huesped[i === 1 ? 0 : 1] + '</option>'; }
      APP.innerHTML = '<div class="in-promo">' + T.promo + '</div>' +
        '<section class="in-hero"><div class="in-fotos" id="in-fotos">' + PORTADA_FOTOS.map(function (f, k) { return '<div class="in-f' + (k === actual ? ' on' : '') + '" data-k="' + k + '"' + (k < 2 ? ' style="background-image:url(\'' + foto(f[0]) + '\')"' : '') + '></div>'; }).join("") + '</div>' +
        '<div class="in-velo"></div>' +
        '<header class="in-cab"><a class="in-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_blanco.png" alt="Zienna Living & Aparts"></a>' +
        (CEL ? idi + '<button type="button" class="in-menu" id="in-menu" aria-label="' + T.menu + '" aria-expanded="false"><i></i><i></i><i></i></button>' +
          '<nav class="in-nav-cel" id="in-nav">' + T.nav.map(function (t, k) { return '<a href="' + navs[k] + '">' + t + '</a>'; }).join("") + '<a class="in-res" href="' + LISTADO + '">' + T.reservar + '</a></nav>' :
          '<nav class="in-nav">' + T.nav.map(function (t, k) { return '<a href="' + navs[k] + '">' + t + '</a>'; }).join("") + '</nav>' + idi + '<a class="in-res" href="' + LISTADO + '">' + T.reservar + '</a>') + '</header>' +
        '<div class="in-centro"><p class="in-ceja">' + esc(T.ceja) + '</p><h1>' + esc(T.t1) + '</h1><p class="in-sub">' + esc(T.t2) + '</p>' +
        '<form class="in-barra" id="in-barra"><label class="in-c in-zona"><small>' + T.zona + '</small><select id="in-z"><option value="">' + T.todas + '</option><option>San Miguel</option><option>San Isidro</option><option>Lince</option></select></label>' +
        '<a class="in-c" href="' + esc(urlBuscar("fechas")) + '"><small>' + T.ll + '</small><b>' + (busq.ll ? corto(busq.ll) : T.agregar) + '</b></a>' +
        '<a class="in-c" href="' + esc(urlBuscar("fechas")) + '"><small>' + T.sa + '</small><b>' + (busq.sa ? corto(busq.sa) : T.agregar) + '</b></a>' +
        '<label class="in-c in-hu"><small>' + T.hu + '</small><select id="in-h">' + opH + '</select></label>' +
        '<button type="submit" class="in-buscar">' + T.buscar + '</button></form></div>' +
        '<div class="in-pie-hero"><span class="in-cap" id="in-cap">' + esc(T.fotos[actual]) + '</span><span class="in-puntos" id="in-puntos">' +
        PORTADA_FOTOS.map(function (f, k) { return '<button type="button" data-k="' + k + '"' + (k === actual ? ' class="on"' : '') + ' aria-label="' + (k + 1) + '"><i></i></button>'; }).join("") + '</span></div></section>' +
        '<section class="in-sec in-ptos">' + T.puntos.map(function (x) { return '<div><small>' + esc(x[0]) + '</small><p>' + esc(x[1]) + '</p></div>'; }).join("") + '</section>' +
        '<section class="in-sec"><div class="in-sec-cab"><h2>' + esc(T.elige) + '</h2><a href="' + LISTADO + '">' + esc(T.verTodos) + ' →</a></div><div class="in-zonas">' +
        T.zonas.map(function (z) { return '<a class="in-zn" href="' + esc(urlListado(z[0])) + '"><span class="in-zn-img" style="background-image:url(\'' + wixFoto(ZFOTO[z[0]], 900, 1100) + '\')"></span><span class="in-zn-t"><b>' + esc(z[0]) + '</b><em>' + esc(z[1]) + '</em></span></a>'; }).join("") +
        '</div></section>' + mw.pie;
      $("in-z").value = zonaSel;
      $("in-z").addEventListener("change", function () { zonaSel = this.value; });
      $("in-h").addEventListener("change", function () { busq.h = +this.value; guardar(); });
      $("in-barra").addEventListener("submit", function (ev) {
        ev.preventDefault();
        irA(busq.ll && busq.sa && !zonaSel ? urlBuscar() : urlListado(zonaSel));
      });
      $("in-idi").addEventListener("click", function (ev) {
        var b = ev.target.closest("button[data-l]"); if (!b) { return; }
        lang = b.getAttribute("data-l"); try { localStorage.setItem("zlang", lang); } catch (e) {}
        pintar();
      });
      $("in-puntos").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-k]"); if (b) { ir(+b.getAttribute("data-k")); } });
      var m = $("in-menu");
      if (m) { m.addEventListener("click", function () { var n = $("in-nav"), ab = n.classList.toggle("abierto"); m.classList.toggle("abierto", ab); m.setAttribute("aria-expanded", ab ? "true" : "false"); }); }
      ligarMarco();
      arrancar();
    }
    // Precarga la foto siguiente antes de mostrarla, para que la transición nunca enseñe un fondo vacío.
    function cargar(k, listo) {
      var el = document.querySelector('.in-f[data-k="' + k + '"]'); if (!el) { return; }
      if (el.style.backgroundImage) { if (listo) { listo(); } return; }
      var im = new Image(), u = foto(PORTADA_FOTOS[k][0]);
      im.onload = im.onerror = function () { el.style.backgroundImage = "url('" + u + "')"; if (listo) { listo(); } };
      im.src = u;
    }
    function ir(k) {
      cargar(k, function () {
        var fs = document.querySelectorAll(".in-f"), ps = document.querySelectorAll("#in-puntos button");
        if (!fs.length) { return; }
        fs[actual].classList.remove("on"); fs[actual].classList.add("sale"); var viejo = fs[actual];
        setTimeout(function () { viejo.classList.remove("sale"); }, 1800);
        actual = k; fs[actual].classList.add("on");
        [].forEach.call(ps, function (b, j) { b.classList.toggle("on", j === actual); });
        $("in-cap").textContent = PORTADA_T[lang].fotos[actual];
        cargar((actual + 1) % PORTADA_FOTOS.length);
        arrancar();
      });
    }
    function arrancar() {
      clearTimeout(timer);
      if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
      timer = setTimeout(function () { ir((actual + 1) % PORTADA_FOTOS.length); }, 6500);
    }
    pintar();
    cargar(1);
  }

  function modoLimpieza() {
    // Hugo (17-11-2026): mismo estilo que Para Propietarios. Texto corto arriba, su foto entera debajo, cifras y el resto.
    var CEL = esCelular(4);
    document.body.className += " lp-en pp-en" + (CEL ? " lp-cel pp-cel" : "");
    letraZienna();
    var agenda = BASE + "/disponibilidad?modo=agenda";
    function pintar(c) {
      var desde = Math.min.apply(null, c.servicios.map(function (x) { return x.precios[0]; }));
      var h0 = c.horario[0], h1 = c.horario[1];
      var hora = function (h) { return (h > 12 ? h - 12 : h) + (h < 12 ? " am" : " pm"); };
      var tipos = c.servicios.map(function (x) {
        return '<a class="lp-tipo" target="_top" href="' + agenda + '&amp;s=' + x.clave + '"><span class="lp-tipo-f" style="background-image:url(\'' + FOTOS_LIMPIEZA[x.clave] + '\')"></span>' +
          '<span class="lp-tipo-t"><b>' + esc(x.nombre) + '</b><span>' + esc(x.detalle) + '</span><span class="lp-desde">Desde <b>' + soles(x.precios[0]) + '</b> · aprox. ' + String(x.horas[0]).replace(".", ",") + ' h</span></span></a>';
      }).join("");
      // Solo el título de cada paso (Hugo, 18-11-2026).
      var pasos = ["Elige el servicio", "Cuéntanos de tu depa", "Elige día y hora", "Confirma tu pedido"]
        .map(function (x, i) { return '<div class="lp-paso"><span>' + (i + 1) + '</span><b>' + x + '</b></div>'; }).join("");
      var cifras = [["Desde " + soles(desde), "por limpieza", "precio visible antes de agendar"], [hora(h0) + " a " + hora(h1), "todos los días", "y otro horario si lo necesitas"],
        [c.plan.descuento_pct + "\u00a0% menos", "con el plan mensual", c.plan.limpiezas + " limpiezas en las fechas que elijas"]]
        .map(function (x) { return '<div class="pp-cifra"><b>' + esc(x[0]) + '</b><i></i><strong>' + x[1] + '</strong><span>' + esc(x[2]) + '</span></div>'; }).join("");
      // Hugo (18-11-2026): la franja del cierre sube arriba de todo TAL CUAL (foto oscurecida, «¿Lista tu próxima limpieza?» y botón);
      // luego el texto con el botón solo y centrado; luego la foto de la cama.
      app.innerHTML = '<div class="pp lp">' +
        '<section class="pp-hero"><div class="pp-cierre lp-arriba" style="background-image:linear-gradient(90deg,rgba(0,0,0,.66),rgba(0,0,0,.12)),url(\'' + ASSET + 'servicio_limpieza' + FOTO_T + '\')"><div><b>¿Agendamos tu próxima limpieza?</b><a class="pp-bl" target="_top" href="' + agenda + '">Agenda tu limpieza</a></div></div>' +
        '<div class="pp-hero-t"><small>SERVICIO DE LIMPIEZA</small><h1>Tu depa impecable. Tú solo agendas.</h1>' +
        '<p>El mismo equipo que deja listos nuestros alojamientos, ahora en tu casa.</p><div class="pp-hero-fila"><a class="pp-bn" target="_top" href="' + agenda + '">Agenda tu limpieza</a></div></div>' +
        '<span class="pp-hero-f lp-cama" style="background-image:url(\'' + ASSET + 'limpieza_portada' + FOTO_T + '\')"></span></section>' +
        '<section class="pp-sec pp-cifras">' + cifras + '</section>' +
        '<section class="pp-sec"><h2>Elige tu limpieza</h2><div class="lp-tipos">' + tipos + '</div></section>' +
        '<section class="pp-sec"><h2>Cómo funciona</h2><div class="lp-pasos">' + pasos + '</div></section>' +
        '<section class="pp-sec"><div class="pp-banda"><div><small>PLAN MENSUAL</small><b>' + c.plan.limpiezas + ' limpiezas al mes, ' + c.plan.descuento_pct + '\u00a0% menos</b><p>En las fechas que tú elijas, todos los días de ' + hora(h0) + ' a ' + hora(h1) + '.</p></div>' +
        '<a class="pp-bl" target="_top" href="' + agenda + '&amp;plan=1">Arma tu plan</a></div></section></div>';
      if (SOLA) { var mw = marcoWeb(CEL, "Limpieza"); app.innerHTML = mw.cab + app.innerHTML + mw.pie; ligarMarco(); }
      animarPagina(Q.get("anim") || "4", CEL);  // Hugo eligió (18-11-2026): suave como la 1 y las fotos que se limpian de la 3
      if (SOLA) { anchoPC(".pp"); } else { escaladoQueEntra(CEL ? 375 : 1181); }
    }
    // La configuración llega dos veces (la guardada y la fresca): si es igual no se vuelve a pintar, así no se corta la animación.
    var ultima = "";
    llamarSWR("limpieza_web.config", {}, function (c) { var j = JSON.stringify(c); if (j !== ultima) { ultima = j; pintar(c); } }, function (e) { app.innerHTML = '<p class="dz-nota">' + esc(e.message) + '</p>'; });
  }

  function modoAgenda() {
    var $ = function (id) { return document.getElementById(id); };
    anchoPC("#dz-app");
    document.body.className += " ag-en";
    letraZienna();
    var volver = /^https:\/\/((www|registro|web)\.)?bookzienna\.com/.test(document.referrer) ? document.referrer : "/limpieza";  // la página rápida
    var C = null, cup = null, paso = 1, listo = null;
    var e = { s: Q.get("s") || "", t: "", d: "", x: {}, f: "", h: "", fuera: false, plan: Q.get("plan") === "1", ses: [] };
    var PASOS = ["Servicio", "Tu depa", "Día y hora", "Tus datos"];
    function servicio() { return C && C.servicios.filter(function (x) { return x.clave === e.s; })[0]; }
    function idxTramo() { for (var i = 0; i < C.tramos.length; i++) { if (C.tramos[i].clave === e.t) { return i; } } return -1; }
    function zona() { return C.lima_top.indexOf(e.d) >= 0 ? "Lima Top" : C.lima_centro.indexOf(e.d) >= 0 ? "Lima Centro" : ""; }
    function cuenta() {
      var s = servicio(), i = idxTramo(), lin = [], total = 0;
      if (!s) { return { total: 0, lin: lin }; }
      if (i >= 0) { total = s.precios[i]; lin.push([s.nombre + " · " + C.tramos[i].texto, s.precios[i]]); } else { lin.push([s.nombre, null]); }
      if (zona() === "Lima Top" && i >= 0 && C.recargo_top) { total += C.recargo_top; lin.push(["Lima Top", C.recargo_top]); }
      C.extras.forEach(function (x) { var n = +e.x[x.clave] || 0; if (n) { total += x.precio * n; lin.push([x.texto.replace(/ \(por (cama|hora)\)/, "") + (x.max > 1 ? " × " + n : ""), x.precio * n]); } });
      if (e.plan && i >= 0) {
        var n5 = C.plan.limpiezas, bruto = total * n5, fin = Math.round(bruto * (100 - C.plan.descuento_pct) / 100);
        lin.push(["Por limpieza", total], ["× " + n5 + " limpiezas", bruto], ["Plan mensual (−" + C.plan.descuento_pct + " %)", fin - bruto]);
        total = fin;
      } else if (e.fuera && total) { var r = Math.round(total * C.recargo_fuera_pct / 100); lin.push(["Fuera de horario (+" + C.recargo_fuera_pct + " %)", r]); total += r; }
      return { total: i >= 0 ? total : 0, lin: lin };
    }
    function fechaTxt(f) { var d = new Date(f + "T12:00:00"); return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()] + " " + d.getDate() + " " + MESES_C[d.getMonth()]; }
    function puede() {
      if (paso === 1) { return !!e.s; }
      if (paso === 2) { return !!(e.d && zona() && idxTramo() >= 0); }
      if (paso === 3) { return e.plan ? e.ses.length === C.plan.limpiezas : !!(e.f && e.h); }
      return true;
    }
    function resumenHTML() {
      var c = cuenta(), s = servicio();
      var h = '<div class="ag-res-k">Tu limpieza</div>';
      if (!s) { return h + '<p class="ag-vacio">Elige un servicio para ver el precio.</p>'; }
      h += c.lin.map(function (l) { return '<div class="ag-fila"><span>' + esc(l[0]) + '</span><span>' + (l[1] == null ? "" : l[1] < 0 ? "−" + soles(-l[1]) : soles(l[1])) + '</span></div>'; }).join("");
      if (e.d) { h += '<div class="ag-fila ag-gris"><span>' + esc(e.d) + '</span><span></span></div>'; }
      if (e.plan) { e.ses.forEach(function (x, k) { h += '<div class="ag-fila ag-gris"><span>' + (k + 1) + ". " + fechaTxt(x.f) + '</span><span>' + esc(horaAm(x.h)) + '</span></div>'; }); }
      else if (e.f && e.h) { h += '<div class="ag-fila ag-gris"><span>' + fechaTxt(e.f) + '</span><span>' + esc(horaAm(e.h)) + '</span></div>'; }
      h += '<div class="ag-fila ag-tot"><b>Total' + (c.total ? "" : " estimado") + '</b><b>' + (c.total ? soles(c.total) : "—") + '</b></div>';
      h += '<p class="ag-nota">Precio fijo: es el precio final, sin cobros extra.</p>';
      return h;
    }
    function horaAm(t) { var p = t.split(":"), hh = +p[0]; return (hh > 12 ? hh - 12 : hh) + ":" + p[1] + (hh < 12 ? " am" : " pm"); }
    function pasosHTML() {
      return '<div class="ag-pasos">' + PASOS.map(function (t, i) { var n = i + 1; return '<span class="' + (n < paso ? "ok" : n === paso ? "ac" : "") + '"><b>' + (n < paso ? "✓" : n) + '</b>' + t + '</span>'; }).join("") + '</div>' +
        '<div class="ag-barra"><i style="width:' + Math.round((paso - 0.5) / 4 * 100) + '%"></i></div><div class="ag-paso-cel">Paso ' + paso + ' de 4 · ' + PASOS[paso - 1] + '</div>';
    }
    function paso1() {
      return '<h1>¿Qué limpieza necesitas?</h1><p class="ag-sub">Precio fijo según el tamaño de tu depa, el mismo en todos los distritos.</p><div class="ag-servs">' +
        C.servicios.map(function (x) {
          return '<button type="button" class="ag-serv' + (e.s === x.clave ? " on" : "") + '" data-s="' + x.clave + '"><span class="ag-serv-f" style="background-image:url(\'' + FOTOS_LIMPIEZA[x.clave] + '\')"></span><span class="ag-serv-t"><b>' + esc(x.nombre) + '</b><span>' + esc(x.detalle) + '</span><span class="ag-desde">Desde <b>' + soles(x.precios[0]) + '</b></span></span></button>';
        }).join("") + '</div>' +
        '<div class="ag-et">¿Cada cuánto?</div><div class="ag-frec"><button type="button" class="ag-frec-b' + (e.plan ? "" : " on") + '" data-p="0"><b>Una vez</b><span>Eliges un día y una hora.</span></button>' +
        '<button type="button" class="ag-frec-b' + (e.plan ? " on" : "") + '" data-p="1"><b>Plan mensual · ' + C.plan.descuento_pct + '\u00a0% menos</b><span>' + C.plan.limpiezas + ' limpiezas al mes, en las fechas que quieras.</span></button></div>';
    }
    function paso2() {
      var op = function (l) { return l.map(function (d) { return '<option' + (e.d === d ? " selected" : "") + '>' + esc(d) + '</option>'; }).join(""); };
      var h = '<h1>Cuéntanos de tu depa</h1><p class="ag-sub">Con esto calculamos el precio exacto.</p>';
      h += '<label class="ag-campo"><span>Distrito</span><select id="ag-d"><option value="">Elige tu distrito</option>' + op(C.lima_top.concat(C.lima_centro).sort(function (a, b) { return a.localeCompare(b, "es"); })) + '<option value="otro"' + (e.d === "otro" ? " selected" : "") + '>Otro distrito</option></select></label>';
      if (e.d === "otro") { h += '<p class="ag-aviso">Por ahora atendemos solo los distritos de la lista. <a href="https://wa.me/' + esc(WA) + '?text=' + encodeURIComponent("Hola, quiero cotizar una limpieza en otro distrito.") + '">Escríbenos por WhatsApp</a> y vemos tu caso.</p>'; }
      h += '<div class="ag-et">Metraje</div><div class="ag-chips">' + C.tramos.map(function (t, i) {
        var sv = servicio(), mas = zona() === "Lima Top" ? (C.recargo_top || 0) : 0;
        return '<button type="button" class="ag-chip' + (e.t === t.clave ? " on" : "") + '" data-t="' + t.clave + '">' + esc(t.texto) + (sv ? ' <b>' + soles(sv.precios[i] + mas) + '</b>' : '') + '</button>'; }).join("") +
        '<button type="button" class="ag-chip' + (e.t === "mas" ? " on" : "") + '" data-t="mas">Más de 100 m²</button></div>';
      if (e.t === "mas") { h += '<p class="ag-aviso">Para más de 100 m² te cotizamos aparte. <a href="https://wa.me/' + esc(WA) + '?text=' + encodeURIComponent("Hola, quiero cotizar una limpieza para un departamento de más de 100 m².") + '">Escríbenos por WhatsApp</a>.</p>'; }
      if (C.extras.length) h += '<div class="ag-et">Extras <small>(opcional)</small></div><div class="ag-extras">' + C.extras.map(function (x) {
        var n = +e.x[x.clave] || 0;
        return '<div class="ag-extra"><span>' + esc(x.texto) + ' <em>' + soles(x.precio) + '</em></span>' + (x.max > 1 ?
          '<span class="ag-stp"><button type="button" data-x="' + x.clave + '" data-v="-1"' + (n ? "" : " disabled") + '>−</button><b>' + n + '</b><button type="button" data-x="' + x.clave + '" data-v="1"' + (n >= x.max ? " disabled" : "") + '>+</button></span>' :
          '<button type="button" class="ag-chk' + (n ? " on" : "") + '" data-x="' + x.clave + '" data-v="t" aria-label="' + esc(x.texto) + '">' + (n ? "✓" : "") + '</button>') + '</div>';
      }).join("") + '</div>';
      return h;
    }
    function paso3() {
      var h = '<h1>¿Qué día vamos?</h1>';
      if (!cup) { return h + '<p class="ag-sub">Buscando horarios libres…</p>'; }
      var dur = String(cup.horas).replace(".", ",");
      if (e.plan) { h += '<p class="ag-sub">Elige las ' + C.plan.limpiezas + ' fechas de tu plan (puede haber dos horarios el mismo día). Cada limpieza dura unas ' + dur + ' h. <b>Llevas ' + e.ses.length + ' de ' + C.plan.limpiezas + '.</b></p>'; } else
      h += '<p class="ag-sub">' + (e.fuera ? "Fuera de horario: elige el día y la hora que prefieras. Te confirmamos por WhatsApp." : "Solo ves los horarios libres de nuestro equipo. Tu limpieza dura unas " + dur + " h.") + '</p>';
      h += '<div class="ag-dias">' + cup.dias.map(function (d) {
        var lleno = !e.fuera && !d.libres;
        var nSes = e.plan ? e.ses.filter(function (x) { return x.f === d.f; }).length : 0;
        return '<button type="button" class="ag-dia' + (e.f === d.f ? " on" : "") + (lleno ? " lleno" : "") + '" data-f="' + d.f + '"' + (lleno ? " disabled" : "") + '><small>' + fechaTxt(d.f).split(" ")[0] + '</small><b>' + (+d.f.slice(8)) + '</b><small>' + (nSes ? "✓ " + nSes + (nSes === 1 ? " elegida" : " elegidas") : e.fuera ? MESES_C[+d.f.slice(5, 7) - 1] : lleno ? "Lleno" : d.libres + (d.libres === 1 ? " horario" : " horarios")) + '</small></button>';
      }).join("") + '</div>';
      if (e.f) {
        var dia = cup.dias.filter(function (d) { return d.f === e.f; })[0];
        var horas = e.fuera ? C.horas_fuera.map(function (t) { return { h: t, t: horaAm(t), libre: true }; }) : (dia ? dia.turnos : []);
        if (e.plan) {
          var durH = cup.horas, delDia = e.ses.filter(function (x) { return x.f === e.f; }).map(function (x) { var i0 = +x.h.split(":")[0]; return [i0, i0 + durH, x.h]; });
          horas = horas.map(function (t) {
            var i0 = +t.h.split(":")[0], elegido = delDia.some(function (z) { return z[2] === t.h; });
            var cruza = delDia.some(function (z) { return z[2] !== t.h && z[0] < i0 + durH && i0 < z[1]; });
            return { h: t.h, t: t.t, libre: elegido || (t.libre && !cruza && e.ses.length < C.plan.limpiezas), elegido: elegido };
          });
        }
        h += '<div class="ag-et">' + (e.fuera ? "Hora de inicio (fuera de horario)" : "Hora de inicio") + ' · ' + fechaTxt(e.f) + '</div><div class="ag-horas">' + horas.map(function (t) {
          var on = e.plan ? t.elegido : e.h === t.h;
          return '<button type="button" class="ag-hora' + (on ? " on" : "") + (t.libre ? "" : " no") + '" data-h="' + t.h + '"' + (t.libre ? "" : " disabled") + '>' + t.t + '</button>';
        }).join("") + '</div>';
      }
      if (e.plan) {
        h += '<div class="ag-ses">' + (e.ses.length ? e.ses.map(function (x, k) { return '<span class="ag-ses-c">' + (k + 1) + '. ' + fechaTxt(x.f) + ' · ' + horaAm(x.h) + '<button type="button" data-q="' + k + '" aria-label="Quitar">×</button></span>'; }).join("") : '<span class="ag-ses-v">Aún no eliges fechas.</span>') + '</div>';
        return h;
      }
      h += e.fuera ? '<p class="ag-fuera"><button type="button" id="ag-fuera">‹ Volver al horario normal (8:00 am a 5:00 pm)</button></p>' :
        '<p class="ag-fuera">¿Tu limpieza está fuera de nuestro horario? <button type="button" id="ag-fuera">Pide otro horario</button><br><small>Con ' + C.recargo_fuera_pct + ' % de recargo y sujeto a confirmación.</small></p>';
      return h;
    }
    function paso4() {
      return '<h1>Tus datos</h1><p class="ag-sub">Para confirmar tu limpieza y llegar a tu depa.</p><form id="ag-form" autocomplete="on" novalidate>' +
        '<label class="ag-campo"><span>Nombre y apellido</span><input id="ag-nom" autocomplete="name" maxlength="60"></label>' +
        '<label class="ag-campo"><span>Celular (WhatsApp)</span><span class="ag-cel"><select id="ag-pre"><option value="51">+51</option><option value="1">+1</option><option value="34">+34</option><option value="54">+54</option><option value="56">+56</option><option value="57">+57</option></select><input id="ag-tel" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="15"></span></label>' +
        '<label class="ag-campo"><span>Dirección del departamento</span><input id="ag-dir" autocomplete="street-address" maxlength="140" placeholder="Calle, número y dpto."></label>' +
        '<label class="ag-campo"><span>Referencia <small>(opcional)</small></span><input id="ag-ref" maxlength="140" placeholder="Ej.: frente al parque, torre B"></label>' +
        '<input id="ag-sitio" class="ag-oculto" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '</form>';
    }
    function listoHTML() {
      return '<div class="ag-listo"><div class="ag-ok">✓</div><h1>¡Casi listo, ' + esc(listo.nombre.split(" ")[0]) + '!</h1>' +
        '<p>Tu pedido <b>' + esc(listo.codigo) + '</b> está guardado. Para separar tu fecha, envíanos el mensaje por WhatsApp y te pasamos los datos para el adelanto de ' + soles(C.adelanto) + '.</p>' +
        '<p class="ag-sub">' + (e.plan ? "Guardamos tus " + C.plan.limpiezas + " horarios por 2 horas mientras llega el adelanto." : e.fuera ? "Como es fuera de horario, primero te confirmamos si podemos ir." : "Guardamos tu horario por 2 horas mientras llega el adelanto.") + '</p>' +
        '<a class="ag-wa" id="ag-wa" href="https://wa.me/' + esc(WA) + '?text=' + encodeURIComponent(listo.texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a></div>';
    }
    function pintar() {
      if (!C) { return; }
      var cuerpo = listo ? listoHTML() : [paso1, paso2, paso3, paso4][paso - 1]();
      var c = cuenta();
      var pie = listo ? "" : '<div class="ag-pie"><button type="button" class="ag-atras" id="ag-atras"' + (paso === 1 ? " hidden" : "") + '>‹ Atrás</button><p class="ag-err" id="ag-err"></p>' +
        '<button type="button" class="ag-sig" id="ag-sig"' + (puede() ? "" : " disabled") + '>' + (paso === 4 ? "Confirmar pedido" : "Continuar") + '</button></div>';
      app.innerHTML = (marcoPaso("Limpieza", volver, true) ? '' : '<header class="ct-cab"><a class="ct-volver" href="' + esc(volver) + '">‹ Volver</a><img src="' + ASSET + 'zienna_logo.png" alt="Zienna living &amp; aparts"></header>') +
        '<div class="ag"><div class="ag-main">' + (listo ? "" : pasosHTML()) + '<div class="ag-card">' + cuerpo + pie + '</div></div>' +
        '<aside class="ag-res">' + resumenHTML() + '</aside></div>' +
        (listo ? "" : '<div class="ag-bar"><div><small>' + (servicio() ? esc(servicio().nombre) + (e.plan ? " · plan, " + e.ses.length + " de " + C.plan.limpiezas + " fechas" : e.f && e.h ? " · " + fechaTxt(e.f) + " · " + horaAm(e.h) : "") : "Elige un servicio") + '</small><b>' + (c.total ? soles(c.total) : "—") + '</b></div><button type="button" id="ag-sig2"' + (puede() ? "" : " disabled") + '>' + (paso === 4 ? "Confirmar" : "Continuar") + '</button></div>');
      ligar();
    }
    function cargarCupos() {
      cup = null; pintar();
      var x = {}; Object.keys(e.x).forEach(function (k) { if (e.x[k]) { x[k] = e.x[k]; } });
      llamar("limpieza_web.cupos", { servicio: e.s, tramo: e.t, extras: JSON.stringify(x), plan: e.plan ? 1 : 0 }).then(function (r) {
        cup = r;
        if (e.plan) { e.ses = e.ses.filter(function (s1) { var d = r.dias.filter(function (z) { return z.f === s1.f; })[0]; var t = d && d.turnos.filter(function (z) { return z.h === s1.h; })[0]; return t && t.libre; }); }
        else if (!e.fuera && e.f) { var d = r.dias.filter(function (z) { return z.f === e.f; })[0]; var t = d && d.turnos.filter(function (z) { return z.h === e.h; })[0]; if (!t || !t.libre) { e.h = ""; } }
        pintar();
      }).catch(function (er) { app.querySelector(".ag-sub").textContent = er.message; });
    }
    function ir(n) { if (n > paso) { rastrear("agenda", { paso: n }); } paso = n; if (n === 3) { cargarCupos(); } else { pintar(); } window.scrollTo(0, 0); }
    function enviar() {
      var err = $("ag-err"), nom = $("ag-nom").value.trim(), tel = $("ag-tel").value.replace(/\D/g, ""), pre = $("ag-pre").value, dir = $("ag-dir").value.trim();
      var falta = nom.length < 3 ? "Escribe tu nombre y apellido." : (pre === "51" ? !/^9\d{8}$/.test(tel) : tel.length < 6) ? "Revisa tu celular." : dir.length < 5 ? "Escribe la dirección del departamento." : "";
      err.textContent = falta; if (falta) { return; }
      var bs = [$("ag-sig"), $("ag-sig2")]; bs.forEach(function (b) { if (b) { b.disabled = true; } }); $("ag-sig").textContent = "Guardando…";
      var x = {}; Object.keys(e.x).forEach(function (k) { if (e.x[k]) { x[k] = e.x[k]; } });
      var pri = e.plan && e.ses.length ? e.ses[0] : { f: e.f, h: e.h };
      enviarPost("limpieza_web.solicitar", { servicio: e.s, tramo: e.t, distrito: e.d, fecha: pri.f, hora: pri.h, plan: e.plan ? 1 : 0, sesiones: JSON.stringify(e.ses), nombre: nom, prefijo: pre, celular: tel, direccion: dir,
        referencia: $("ag-ref").value.trim(), extras: JSON.stringify(x), fuera: e.fuera ? 1 : 0, acepto: 1, sitio: $("ag-sitio").value }).then(function (r) {
        listo = { codigo: r.codigo, texto: r.texto, nombre: nom, celular: tel }; pintar(); window.scrollTo(0, 0);
        rastrear("agenda", { paso: 5, sol: r.codigo });
      }).catch(function (er) {
        err.textContent = er.message; bs.forEach(function (b) { if (b) { b.disabled = false; } }); $("ag-sig").textContent = "Confirmar pedido";
        if (/ocuparse/.test(er.message)) { e.h = ""; setTimeout(function () { ir(3); }, 1500); }
      });
    }
    function siguiente() { if (!puede()) { return; } if (paso < 4) { ir(paso + 1); } else { enviar(); } }
    function ligar() {
      var c = app.querySelector(".ag-card");
      if ($("ag-sig")) { $("ag-sig").onclick = siguiente; }
      if ($("ag-sig2")) { $("ag-sig2").onclick = siguiente; }
      if ($("ag-atras")) { $("ag-atras").onclick = function () { ir(paso - 1); }; }
      if ($("ag-wa")) { $("ag-wa").onclick = function () { enviarPost("limpieza_web.whatsapp", { codigo: listo.codigo, celular: listo.celular }, true).catch(function () {}); rastrear("agenda", { paso: 6, sol: listo.codigo }); }; }
      if ($("ag-d")) { $("ag-d").onchange = function () { e.d = this.value; pintar(); }; }
      if ($("ag-fuera")) { $("ag-fuera").onclick = function () { e.fuera = !e.fuera; e.h = ""; pintar(); }; }
      c.onclick = function (ev) {
        var b = ev.target.closest("button"); if (!b || b.disabled) { return; }
        if (b.hasAttribute("data-s")) { e.s = b.getAttribute("data-s"); pintar(); }
        else if (b.hasAttribute("data-t")) { e.t = b.getAttribute("data-t"); pintar(); }
        else if (b.hasAttribute("data-p")) { e.plan = b.getAttribute("data-p") === "1"; e.fuera = false; e.ses = []; e.h = ""; pintar(); }
        else if (b.hasAttribute("data-q")) { e.ses.splice(+b.getAttribute("data-q"), 1); pintar(); }
        else if (b.hasAttribute("data-x")) {
          var k = b.getAttribute("data-x"), v = b.getAttribute("data-v"), n = +e.x[k] || 0;
          e.x[k] = v === "t" ? (n ? 0 : 1) : Math.max(0, n + (+v)); pintar();
        }
        else if (b.hasAttribute("data-f")) { e.f = b.getAttribute("data-f"); e.h = ""; pintar(); }
        else if (b.hasAttribute("data-h")) {
          var hh = b.getAttribute("data-h");
          if (e.plan) {
            var ya = -1; e.ses.forEach(function (x, k) { if (x.f === e.f && x.h === hh) { ya = k; } });
            if (ya >= 0) { e.ses.splice(ya, 1); } else if (e.ses.length < C.plan.limpiezas) { e.ses.push({ f: e.f, h: hh }); e.ses.sort(function (a, c) { return a.f < c.f ? -1 : a.f > c.f ? 1 : (+a.h.split(":")[0]) - (+c.h.split(":")[0]); }); }
          } else { e.h = hh; }
          pintar();
        }
      };
    }
    app.innerHTML = '<p class="dz-nota" style="padding:24px">Cargando…</p>';
    llamar("limpieza_web.config").then(function (c) { C = c; if (!servicio()) { e.s = ""; } pintar(); })
      .catch(function (er) { app.innerHTML = '<p class="dz-nota" style="padding:24px">' + esc(er.message) + '</p>'; });
  }

  // ───────── Para Propietarios (Hugo 17-11-2026: fusión de las opciones 1 y 2, sin porcentajes) ─────────
  // La comisión (10 % → 15 % + IGV) NO va en la web: se explica en la videollamada. Aquí solo «por debajo del mercado».
  function modoPropietarios() {
    var CEL = esCelular(4);
    document.body.className += " pp-en" + (CEL ? " pp-cel" : "");
    letraZienna();
    var cotiza = BASE + "/disponibilidad?modo=contacto&amp;motivo=administracion&amp;solo=1";
    var ICP = {
      ojo: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      anuncio: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/>',
      chat: '<path d="M4 5h16v11H8l-4 4z"/>',
      limpia: '<path d="M7 21h10M9 21V11h6v10M12 3v8"/>',
      regalo: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9v11M4 13h16M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0"/>',
      precio: '<path d="M4 17l5-5 4 4 7-7M15 9h5v5"/>'
    };
    var SERV = [["ojo", "Supervisión del depa", "Inventario al empezar y revisión constante del estado de tu propiedad."],
      ["anuncio", "Anuncio en Airbnb", "Fotos, textos y configuración que destacan lo mejor de tu depa."],
      ["chat", "Reservas y huéspedes", "Respuestas rápidas y atención durante toda la estancia."],
      ["limpia", "Limpieza y mantenimiento", "Nuestro equipo deja tu depa listo entre cada huésped."],
      ["regalo", "Amenities Zienna", "Reposición de productos y artículos esenciales para cada estancia."],
      ["precio", "Precios por temporada", "Ajustamos la tarifa según la demanda y las fechas del año."]];
    // Fotos de Hugo (18-11-2026), con los mismos textos de «Qué hacemos por ti».
    var FOTOS_PROP = [["prop_inventario", "Inventario y supervisión", "Revisamos el estado de tu depa desde el primer día."],
      ["prop_fotos", "Fotos profesionales", "Fotos y textos que destacan lo mejor de tu depa."],
      ["limpieza_toallas", "Limpieza entre huéspedes", "Nuestro equipo deja tu depa listo para cada llegada."],
      ["prop_airbnb", "Posicionamiento en Airbnb", "Precios por temporada para conseguir más reservas."]];
    var CAMINO = [["Paso 1", "Conversamos", "Te contamos cómo trabajamos y resolvemos tus dudas."], ["Paso 2", "Visita e inventario", "Revisamos tu depa y lo dejamos listo."],
      ["Paso 3", "Fotos y anuncio", "Publicamos tu depa en Airbnb."], ["Paso 4", "Tú recibes la renta", "Nosotros nos encargamos del resto."]];
    function pintar(lista) {
      var pr = lista ? promedio(lista) : null;
      var sello = pr && pr.resenas ? "★ " + pr.nota + " en más de " + puntos(Math.floor(pr.resenas / 100) * 100) + " reseñas · Superanfitrión en Airbnb" : "Superanfitrión en Airbnb";
      var serv = SERV.map(function (x) { return '<div class="pp-serv-i"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' + ICP[x[0]] + '</svg><b>' + x[1] + '</b><p>' + x[2] + '</p></div>'; }).join("");
      var nota = pr && pr.nota ? pr.nota : "4,8", masDe = pr && pr.resenas ? "en más de " + puntos(Math.floor(pr.resenas / 100) * 100) + " reseñas" : "en Airbnb";
      var cifras = [[nota + " ★", "de calificación", masDe], ["5 años", "recibiendo huéspedes", "Superanfitrión en Airbnb"], ["Todo", "en un solo equipo", "anuncio, huéspedes, limpieza y mantenimiento"]]
        .map(function (x) { return '<div class="pp-cifra"><b>' + esc(x[0]) + '</b><i></i><strong>' + x[1] + '</strong><span>' + esc(x[2]) + '</span></div>'; }).join("");
      var camino = CAMINO.map(function (x, i) { return '<div class="pp-paso' + (i === 3 ? " fin" : "") + '"><span class="pp-punto"></span><small>' + x[0] + '</small><b>' + x[1] + '</b><p>' + x[2] + '</p></div>'; }).join("");
      // Sello de confianza (Hugo, 18-11-2026: «que resalte»). Maquetas: ?sello=1 insignia junto al botón, ?sello=2 franja de confianza debajo.
      var resN = pr && pr.resenas ? "más de " + puntos(Math.floor(pr.resenas / 100) * 100) + " reseñas" : "reseñas en Airbnb";
      var MEDALLA = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M9 14.5 7.5 22l4.5-2.5 4.5 2.5L15 14.5"/><path d="m12 6 .9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/></svg>';
      var SELLO = Q.get("sello") || "2";  // Hugo eligió la franja de confianza (18-11-2026)
      var filaSello = SELLO === "1" ?
        '<span class="pp-sello1"><span><b>★ ' + esc(nota) + '</b> en ' + esc(resN) + '</span><i></i><span><strong>Superanfitrión</strong> en Airbnb</span></span></div>' :
        SELLO === "2" ? '</div><div class="pp-sello2"><div><span class="pp-est">★★★★★</span><b>' + esc(nota) + '</b><small>' + esc(resN) + '</small></div><i></i>' +
          '<div><span class="pp-med">' + MEDALLA + '</span><b>Superanfitrión</b><small>en Airbnb</small></div></div>' :
        '<span class="pp-sello">' + esc(sello) + '</span></div>';
      var html = '<div class="pp">' +
        // Hugo (18-11-2026): la franja «¿Hablamos de tu departamento?» sube arriba tal cual, como en Limpieza; luego el texto, la foto, cifras…
        '<section class="pp-hero"><div class="pp-cierre pp-arriba" style="background-image:linear-gradient(90deg,rgba(0,0,0,.66),rgba(0,0,0,.12)),url(\'' + wixFoto("b4147d_f5b51927d4714c89a9a900aa2b9ba8d4~mv2.png", 1600, 640) + '\')"><div><b>¿Hablamos de tu departamento?</b><a class="pp-bl" target="_top" href="' + cotiza + '">Cotiza con nosotros</a></div></div>' +
        '<div class="pp-hero-t"><small>PARA PROPIETARIOS</small><h1>Gana con tu depa sin mover un dedo.</h1>' +
        '<p>Tú solo cobras. Del resto nos encargamos nosotros.</p><div class="pp-hero-fila"><a class="pp-bn" target="_top" href="' + cotiza + '">Cotiza con nosotros</a>' +
        filaSello + '</div><span class="pp-hero-f" style="background-image:url(\'' + ASSET + 'gestion_propiedades' + FOTO_T + '\')"></span></section>' +
        '<section class="pp-sec pp-cifras">' + cifras + '</section>' +
        '<section class="pp-sec"><h2>Así cuidamos tu depa</h2><div class="pp-fotos">' + FOTOS_PROP.map(function (x) {
          return '<figure class="pp-foto"><span style="background-image:url(\'' + ASSET + x[0] + FOTO_T + '\')"></span><figcaption><b>' + x[1] + '</b><span>' + x[2] + '</span></figcaption></figure>';
        }).join("") + '</div></section>' +
        '<section class="pp-sec"><h2>Qué hacemos por ti</h2><div class="pp-serv">' + serv + '</div></section>' +
        '<section class="pp-sec"><div class="pp-banda"><div><small>NUESTRA COMISIÓN</small><b>Por debajo del mercado</b><p>Te explicamos cómo funciona en una videollamada corta, sin compromiso.</p></div><a class="pp-bl" target="_top" href="' + cotiza + '">Cotiza con nosotros</a></div></section>' +
        '<section class="pp-sec"><h2>Tu camino con Zienna</h2><div class="pp-camino">' + camino + '</div></section></div>';
      if (html === ultimo) { return; }  // si llega igual (caché y luego lo fresco) no se repinta: no se corta la animación
      ultimo = html;
      if (SOLA) { var mw = marcoWeb(CEL, "Para Propietarios"); html = mw.cab + html + mw.pie; }
      app.innerHTML = html; ligarMarco();
      animarPagina(Q.get("anim") || "5", CEL);  // Hugo eligió la A «Ventana» (18-11-2026)
      if (SOLA) { anchoPC(".pp"); } else { escaladoQueEntra(CEL ? 375 : 1181); }
    }
    var ultimo = "";
    pintar(null);
    llamarSWR("alojamientos", {}, function (d) { pintar(d.alojamientos); });
  }

  // ───────── Libro de Reclamaciones virtual (Hugo, 19-11-2026: «importante, según la ley»; modelo: tiendanebula.net) ─────────
  // Hoja con número correlativo, datos del proveedor, del consumidor y del bien, reclamo o queja, detalle y pedido.
  // La guarda zienna.api.stays.reclamos.registrar, que manda la constancia al consumidor y el aviso a Zienna.
  function modoReclamos() {
    var CEL = window.innerWidth < 700, $ = function (id) { return document.getElementById(id); };
    document.body.className += " lr-en" + (CEL ? " lr-cel" : "");
    letraZienna();
    var mw = marcoWeb(CEL, "");
    APP.innerHTML = mw.cab + '<div class="lr" id="lr"><p class="lr-cargando">Cargando…</p></div>' + mw.pie;
    ligarMarco();
    function campo(id, et, tipo, extra) {
      return '<label class="lr-c' + (extra && extra.ancho ? ' lr-ancho' : '') + '"><span>' + et + (extra && extra.opc ? ' <small>(opcional)</small>' : ' *') + '</span>' +
        (tipo === "area" ? '<textarea id="' + id + '" rows="4" maxlength="' + (extra && extra.max || 3000) + '"></textarea>' :
          '<input id="' + id + '" type="' + (tipo || "text") + '"' + (extra && extra.ph ? ' placeholder="' + esc(extra.ph) + '"' : '') + (extra && extra.attr || '') + '>') + '</label>';
    }
    llamar("reclamos.proveedor").then(function (P) {
      var hoyTxt = P.hoy.split("-").reverse().join("/");
      $("lr").innerHTML = '<div class="lr-tit">' + LIBRO_SVG + '<div><h1>Libro de Reclamaciones</h1><p class="lr-sub">Hoja de reclamación virtual · Código de identificación <b>' + esc(P.codigo || "") + '</b></p></div></div>' +
        '<div class="lr-prov"><div><small>PROVEEDOR</small><b>' + esc(P.razon_social) + '</b><span>RUC ' + esc(P.ruc) + ' · ' + esc(P.marca) + '</span></div>' +
        '<div><small>DOMICILIO</small><span>' + esc(P.domicilio) + '</span></div><div><small>CORREO DE ATENCIÓN</small><span>' + esc(P.correo) + '</span></div>' +
        '<div><small>FECHA</small><span>' + hoyTxt + '</span></div></div>' +
        '<p class="lr-nota">Te responderemos en un plazo no mayor a <b>' + P.plazo + ' días hábiles</b> (improrrogable). Al registrar tu hoja se le asigna su número correlativo (por ejemplo, N.° 000000001-' + esc(P.hoy.slice(0, 4)) + ') y te enviamos una copia a tu correo como constancia.</p>' +
        '<form id="lr-f" novalidate>' +
        '<h2>1. Tipo</h2><div class="lr-tipos">' +
        '<label><input type="radio" name="lr-tipo" value="Reclamo"><span><b>Reclamo</b>Disconformidad relacionada con el servicio o producto (por ejemplo, la estadía o la limpieza).</span></label>' +
        '<label><input type="radio" name="lr-tipo" value="Queja"><span><b>Queja</b>Disconformidad no relacionada con el servicio, o malestar con la atención recibida.</span></label></div>' +
        '<h2>2. Tus datos</h2><div class="lr-g">' + campo("lr-nom", "Nombres y apellidos", "text", { ancho: 1, attr: ' autocomplete="name" maxlength="120"' }) +
        '<label class="lr-c"><span>Tipo de documento *</span><select id="lr-td"><option value="">Elige</option><option>DNI</option><option>CE</option><option>Pasaporte</option><option>RUC</option></select></label>' +
        campo("lr-nd", "N.° de documento", "text", { attr: ' maxlength="20"' }) + campo("lr-tel", "Teléfono", "tel", { attr: ' autocomplete="tel" maxlength="30"' }) +
        campo("lr-cor", "Correo electrónico", "email", { attr: ' autocomplete="email" maxlength="120"' }) + campo("lr-dir", "Dirección", "text", { ancho: 1, attr: ' autocomplete="street-address" maxlength="200"' }) +
        '<label class="lr-chk lr-ancho"><input type="checkbox" id="lr-men"> <span>Soy menor de edad</span></label>' +
        '<div class="lr-ancho" id="lr-apo-c" hidden>' + campo("lr-apo", "Nombre de tu padre, madre o apoderado", "text", { attr: ' maxlength="120"' }) + '</div></div>' +
        '<h2>3. Lo que contrataste</h2><div class="lr-g">' +
        '<label class="lr-c"><span>Producto o servicio *</span><select id="lr-bien"><option>Servicio</option><option>Producto</option></select></label>' +
        campo("lr-desc", "Descripción", "text", { opc: 1, ph: "Ej.: estadía en San Miguel, limpieza general", attr: ' maxlength="200"' }) +
        campo("lr-fec", "Fecha de compra o del servicio", "date", { opc: 1 }) + campo("lr-mon", "Monto reclamado (S/)", "number", { opc: 1, attr: ' min="0" step="0.01" inputmode="decimal"' }) +
        campo("lr-comp", "N.° de reserva o comprobante", "text", { opc: 1, ancho: 1, attr: ' maxlength="60"' }) + '</div>' +
        '<h2>4. Detalle y pedido</h2><div class="lr-g">' + campo("lr-det", "Detalle del reclamo o queja", "area", { ancho: 1 }) +
        campo("lr-ped", "Pedido concreto (¿qué solicitas?)", "area", { ancho: 1, max: 1500 }) + '</div>' +
        '<input id="lr-sitio" class="lr-oculto" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<label class="lr-chk"><input type="checkbox" id="lr-ok"> <span>Declaro que los datos son verdaderos y autorizo su uso para atender mi reclamo o queja, según la Ley N.° 29733 de Protección de Datos Personales.</span></label>' +
        '<p class="lr-legal">La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.</p>' +
        '<p class="lr-err" id="lr-err" role="alert"></p><button type="submit" class="lr-btn" id="lr-btn">Registrar mi hoja de reclamación</button></form>';
      $("lr-men").addEventListener("change", function () { $("lr-apo-c").hidden = !this.checked; });
      $("lr-f").addEventListener("submit", function (ev) {
        ev.preventDefault();
        var t = document.querySelector('input[name="lr-tipo"]:checked'), v = function (id) { return $(id).value.trim(); };
        var falta = !t ? "Elige si es un reclamo o una queja." : v("lr-nom").length < 5 ? "Escribe tus nombres y apellidos." : !v("lr-td") ? "Elige el tipo de documento." :
          v("lr-nd").length < 5 ? "Escribe tu número de documento." : v("lr-tel").replace(/\D/g, "").length < 6 ? "Escribe tu teléfono." :
          !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v("lr-cor")) ? "Revisa tu correo electrónico." : v("lr-dir").length < 5 ? "Escribe tu dirección." :
          ($("lr-men").checked && v("lr-apo").length < 5) ? "Escribe el nombre de tu padre, madre o apoderado." :
          v("lr-det").length < 10 ? "Cuéntanos el detalle de tu reclamo o queja." : v("lr-ped").length < 5 ? "Escribe qué solicitas." :
          !$("lr-ok").checked ? "Confirma que los datos son verdaderos." : "";
        $("lr-err").textContent = falta; if (falta) { return; }
        $("lr-btn").disabled = true; $("lr-btn").textContent = "Registrando…";
        enviarPost("reclamos.registrar", { tipo: t.value, nombres: v("lr-nom"), tipo_documento: v("lr-td"), numero_documento: v("lr-nd"), telefono: v("lr-tel"),
          correo: v("lr-cor"), direccion: v("lr-dir"), menor_de_edad: $("lr-men").checked ? 1 : 0, apoderado: v("lr-apo"), bien: v("lr-bien"),
          descripcion_bien: v("lr-desc"), fecha_servicio: v("lr-fec"), monto: v("lr-mon"), comprobante: v("lr-comp"), detalle: v("lr-det"), pedido: v("lr-ped"),
          acepto: 1, sitio: v("lr-sitio") }).then(function (r) {
          var lim = String(r.fecha_limite || "").split("-").reverse().join("/");
          $("lr").innerHTML = '<div class="lr-listo"><div class="lr-ok">✓</div><h1>Registramos tu ' + esc(t.value.toLowerCase()) + '</h1>' +
            '<p class="lr-num">Hoja de reclamación N.° <b>' + esc(r.numero) + '</b></p>' +
            '<p class="lr-cod">Código de identificación ' + esc(r.codigo || "") + (r.registro ? ' · Registrada el ' + esc(r.registro) : '') + '</p>' +
            '<p>' + (r.correo_enviado ? 'Te enviamos una copia a <b>' + esc(v("lr-cor")) + '</b> como constancia.' : 'Guarda este número: es tu constancia. La copia por correo te llegará en breve.') +
            ' Te responderemos a más tardar el <b>' + esc(lim) + '</b>.</p><a class="lr-btn" href="' + LISTADO + '">Volver a la web</a></div>';
          window.scrollTo(0, 0);
        }).catch(function (e) { $("lr-err").textContent = e.message; $("lr-btn").disabled = false; $("lr-btn").textContent = "Registrar mi hoja de reclamación"; });
      });
    }).catch(function () { $("lr").innerHTML = '<p class="lr-cargando">No pudimos cargar el Libro de Reclamaciones. Escríbenos a info@bookzienna.com.</p>'; });
  }

  if (MODO === "contacto") { modoContacto(); }
  else if (MODO === "reclamos") { modoReclamos(); }
  else if (MODO === "galeria" && PROP) { modoGaleria(); }
  else if (MODO === "solicitud") { modoSolicitud(); }
  else if (MODO === "cabecera" && PROP) { modoCabecera(); }
  else if (MODO === "fotos" && PROP) { modoFotos(); }
  else if (MODO === "resenas" && PROP) { modoResenas(); }
  else if (MODO === "barrafija" && PROP) { modoBarraFija(); }
  else if (MODO === "whatsapp") { modoWhatsapp(); }
  else if (MODO === "portada") { modoPortada(); }
  else if (MODO === "barra") { modoBarra(); }
  else if (MODO === "buscar") { modoBuscar(); }
  else if (MODO === "limpieza") { modoLimpieza(); }
  else if (MODO === "agenda") { modoAgenda(); }
  else if (MODO === "propietarios") { modoPropietarios(); }
  else if (MODO === "alojamiento" && PROP) { modoAlojamiento(); }
  else if (MODO === "fechas" && PROP) { modoFechas(); }
  else if (MODO === "tarjeta" && PROP) { modoTarjeta(); }
  else if (MODO === "detalle" && PROP) { modoDetalle(); }
  else if (MODO === "cierre" && PROP) { modoCierre(); }
  else if (MODO === "ficha" && PROP) { modoFicha(); }
  else if (MODO === "listado") { modoListado(); }
  else if (MODO === "inicio") { modoInicio(); }
  else if (MODO === "favoritos") { modoFavoritos(); }
  else { modoResultados(); }
  if (["ficha", "listado", "favoritos", "limpieza", "propietarios", "buscar", "galeria", "portada", "agenda", "contacto"].indexOf(MODO) >= 0) { rastrear("visita", { p: PROP }); }
})();

// Limpieza (Hugo, 18-11-2026: «carga súper lento en el celular»): se piden la configuración y las 2 fotos de arriba
// apenas abre la página, en paralelo con el CSS y el código. index.js usa window.__pre si ya existe.
// Va en archivo aparte: escrito dentro de la plantilla, Frappe no podía dibujar la página.
// Ficha rápida (Hugo, 18-11-2026): se piden la ficha y la lista de alojamientos apenas abre, y se abre la conexión a las fotos.
(function () {
  var FICHAS = { "/si2105": "SI2105", "/sm310": "SM310", "/sm1006": "SM1006", "/lince902": "LINCE902", "/lince902a": "LINCE902A", "/lince902b": "LINCE902B", "/lince1504": "LINCE1504", "/si502": "SI502" }, p = FICHAS[location.pathname.replace(/\/$/, "")];
  if (!p || window.__pidio) { return; }
  var c = document.createElement("link"); c.rel = "preconnect"; c.href = "https://static.wixstatic.com"; document.head.appendChild(c);
  function pide(u) { return fetch(u, { headers: { "Accept": "application/json" } }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  var B = "/api/method/zienna.api.stays.disponibilidad_web.";
  window.__pre = { "ficha": pide(B + "ficha?propiedad=" + p), "alojamientos": pide(B + "alojamientos") };
})();
(function () {
  if (!/[?&]modo=limpieza(&|$)/.test(location.search) && !/^\/limpieza\/?$/.test(location.pathname)) { return; }
  var t = innerWidth < 700 ? "_750.webp" : "_1400.webp", A = "/assets/zienna/disponibilidad/";
  if (window.__pidio && window.__pidio["limpieza_web.config"]) { return; }  // index.js llegó primero y ya lo pidió
  window.__pre = { "limpieza_web.config": fetch("/api/method/zienna.api.stays.limpieza_web.config", { headers: { "Accept": "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) };
  ["servicio_limpieza", "limpieza_portada"].forEach(function (n) { var i = new Image(); i.src = A + n + t; });
})();
// Portada de bookzienna.com (Hugo, 18-11-2026: «tarda en cargar, hazla más rápido»): la lista de alojamientos, las letras
// Bodoni/Manrope y la conexión a las fotos de Wix se piden apenas llega la página, sin esperar al código (≈0,7 s antes).
(function () {
  if (!/[?&]modo=portada(&|$)/.test(location.search) || window.__pidio) { return; }
  var c = document.createElement("link"); c.rel = "preconnect"; c.href = "https://static.wixstatic.com"; document.head.appendChild(c);
  var f = document.createElement("link"); f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap";
  document.head.appendChild(f);
  window.__pre = { "alojamientos": fetch("/api/method/zienna.api.stays.disponibilidad_web.alojamientos", { headers: { "Accept": "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) };
})();

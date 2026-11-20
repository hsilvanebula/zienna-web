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
  RUTAS["/caja"] = "caja";
  RUTAS["/beneficios"] = "beneficios";
  RUTAS["/idioma"] = "idioma";
  var MODO = Q.get("modo") || RUTAS[RUTA] || "resultados";
  var PROP = Q.get("p") || FICHAS_RAPIDAS[RUTA] || "";
  var APP = app;
  // Textos de la portada, menú y pie en 10 idiomas (Hugo, 19-11-2026). LANG lo fija la portada (pastilla); el resto de
  // las páginas queda en «es», con los mismos textos de siempre. Generada con scratchpad i18n/textos.py.
  var I18N = {"es":{"z_t":"Elige tu zona","por_t":"Por qué elegir Zienna","cal":"CALIFICACIÓN","cal1":"de 5 estrellas","cal2":"en {n} reseñas","pro":"PROMOCIÓN","pro1":"de ahorro directo","pro2":"desde {n} noches","lle":"LLEGADA","lle_n":"Tu clave","lle1":"sin esperar a nadie","lle2":"clave personal en cada reserva","sup":"SUPERANFITRIÓN","sup_n":"5 años","sup1":"cuidando cada detalle","sup2":"recibiendo huéspedes en Airbnb","desde":"Desde","resenas":"reseñas","ver1":"Ver 1 alojamiento →","vern":"Ver {n} alojamientos →","alo_t":"Nuestros alojamientos","todos":"Ver todos","noche":"noche","b1":"Reserva directo y paga {n} % menos","b2":"Promoción exclusiva a partir de {n} noches.","b_btn":"Ver fechas libres","prop_s":"PARA PROPIETARIOS","prop_h":"¿Tienes un departamento en Lima?","prop_p":"Nos encargamos de todo: anuncio, huéspedes, limpieza y mantenimiento. Tú recibes la renta.","prop_b":"Cotizar administración","mas":"Conocer más","lim_s":"SERVICIO DE LIMPIEZA","lim_h":"¿Agendamos tu próxima limpieza?","lim_p":"Limpieza general, profunda o después de cada huésped, con el mismo equipo que cuida nuestros alojamientos.","lim_b":"Agenda tu limpieza","f_con":"CONTACTO","f_form":"Formulario de contacto","f_lima":"Lima, Perú","f_red":"ATENCIÓN Y REDES","f_leg":"INFORMACIÓN LEGAL","f_priv":"Privacidad","f_cond":"Condiciones","f_cook":"Cookies","f_lr2":"Ingresa aquí para registrar tu reclamo o queja","f_mail":"Correo","f_form2":"Formulario","f_leg2":"LEGAL","f_red2":"REDES","f_der":"Todos los derechos quedan reservados.","fav":"Favoritos","zf":["Frente al mar, con vista al Pacífico","Vista al mar y calles arboladas","Céntrico, con piscina y vista a la ciudad"],"zd":["Malecón a pasos","Aeropuerto a 15 min","Cerca al Golf","Límite con Miraflores","Límite con San Isidro","Centro histórico a 10 min"],"ate":"ATENCIÓN","ate_n":"< 1 hora","ate1":"te respondemos por WhatsApp","ate2":"100 % de mensajes respondidos","sv_e":"SERVICIOS ZIENNA","sv_t":"Para tu viaje","sv_sub":"Lo resolvemos antes de que llegues.","sv_tr":"Traslado al aeropuerto","sv_trp":"Chofer privado entre el aeropuerto Jorge Chávez y tu alojamiento. Te esperamos con tu nombre.","sv_ida":"Ida","sv_vue":"Vuelta","sv_iv":"Ida y vuelta","sv_aho":"AHORRA S/ 10","sv_trb":"Reservar traslado por WhatsApp","sv_wa":"Hola Zienna, quiero reservar el traslado al aeropuerto.","sv_es":"Internet ilimitado en tu celular","sv_esp":"eSIM de Holafly: datos ilimitados en Perú desde que aterrizas, sin cambiar de chip.","sv_es1":"Se activa con un código QR","sv_es2":"Funciona en todo el Perú","sv_desc":"5 % de descuento","sv_esb":"Comprar la eSIM en Holafly","alo_s":"Departamentos completos en {n}.","y_":"y","bn_ok":"Tu registro quedó listo","bn_t":"Beneficios para tu estadía","bn_sub":"Dos cosas que te resuelven la llegada a Lima.","bn_e1":"TRASLADO PRIVADO","bn_h1":"Te recogemos en el aeropuerto","bn_e2":"INTERNET ILIMITADO","bn_h2":"Llega con datos en tu celular","bn_cop":"Copiar","bn_copd":"Copiado","bn_ir":"Ir a bookzienna.com"},"en":{"z_t":"Choose your area","por_t":"Why choose Zienna","cal":"RATING","cal1":"out of 5 stars","cal2":"from {n} reviews","pro":"PROMOTION","pro1":"saved booking direct","pro2":"from {n} nights","lle":"ARRIVAL","lle_n":"Your code","lle1":"no waiting for anyone","lle2":"personal door code for every stay","sup":"SUPERHOST","sup_n":"5 years","sup1":"taking care of every detail","sup2":"hosting guests on Airbnb","desde":"From","resenas":"reviews","ver1":"See 1 stay →","vern":"See {n} stays →","alo_t":"Our stays","todos":"See all","noche":"night","b1":"Book direct and save {n} %","b2":"Exclusive offer for stays of {n} nights or more.","b_btn":"See available dates","prop_s":"FOR PROPERTY OWNERS","prop_h":"Do you own an apartment in Lima?","prop_p":"We take care of everything: listing, guests, cleaning and maintenance. You receive the income.","prop_b":"Get a management quote","mas":"Learn more","lim_s":"CLEANING SERVICE","lim_h":"Shall we schedule your next cleaning?","lim_p":"General, deep or turnover cleaning, by the same team that looks after our apartments.","lim_b":"Book a cleaning","f_con":"CONTACT","f_form":"Contact form","f_lima":"Lima, Peru","f_red":"SUPPORT & SOCIAL","f_leg":"LEGAL INFORMATION","f_priv":"Privacy","f_cond":"Terms","f_cook":"Cookies","f_lr2":"Click here to file a complaint or claim","f_mail":"Email","f_form2":"Contact form","f_leg2":"LEGAL","f_red2":"SOCIAL","f_der":"All rights reserved.","fav":"Favorites","zf":["Oceanfront, facing the Pacific","Sea views and tree-lined streets","Central, with a pool and city views"],"zd":["Steps from the boardwalk","15 min to the airport","Near the Golf Club","Next to Miraflores","Next to San Isidro","10 min to the historic center"],"ate":"SUPPORT","ate_n":"< 1 hour","ate1":"we reply on WhatsApp","ate2":"100 % of messages answered","sv_e":"ZIENNA SERVICES","sv_t":"For your trip","sv_sub":"We sort it out before you arrive.","sv_tr":"Airport transfer","sv_trp":"Private driver between Jorge Chávez airport and your apartment. We wait for you with your name.","sv_ida":"One way in","sv_vue":"One way out","sv_iv":"Round trip","sv_aho":"SAVE S/ 10","sv_trb":"Book a transfer on WhatsApp","sv_wa":"Hi Zienna, I'd like to book the airport transfer.","sv_es":"Unlimited data on your phone","sv_esp":"Holafly eSIM: unlimited data in Peru from the moment you land, no SIM swap.","sv_es1":"Activates with a QR code","sv_es2":"Works all over Peru","sv_desc":"5 % off","sv_esb":"Buy the eSIM at Holafly","tit":{"SM1006":"Oceanfront sunsets","SI2105":"21st floor, city views and an oceanfront pool","SI502":"Near the San Isidro Golf Club, with a pool","SM310":"Oceanfront pool and sunsets","LINCE1504":"City views, steps from San Isidro","LINCE902":"Spacious, modern and bright, for 4, with parking"},"alo_s":"Entire apartments in {n}.","y_":"and","bn_ok":"Your check-in form is done","bn_t":"Perks for your stay","bn_sub":"Two things that make arriving in Lima easy.","bn_e1":"PRIVATE TRANSFER","bn_h1":"We pick you up at the airport","bn_e2":"UNLIMITED DATA","bn_h2":"Land with data on your phone","bn_cop":"Copy","bn_copd":"Copied","bn_ir":"Go to bookzienna.com"},"pt":{"z_t":"Escolha a região","por_t":"Por que escolher a Zienna","cal":"AVALIAÇÃO","cal1":"de 5 estrelas","cal2":"em {n} avaliações","pro":"PROMOÇÃO","pro1":"de economia reservando direto","pro2":"a partir de {n} noites","lle":"CHEGADA","lle_n":"Sua senha","lle1":"sem esperar ninguém","lle2":"senha pessoal em cada reserva","sup":"SUPERHOST","sup_n":"5 anos","sup1":"cuidando de cada detalhe","sup2":"recebendo hóspedes no Airbnb","desde":"A partir de","resenas":"avaliações","ver1":"Ver 1 hospedagem →","vern":"Ver {n} hospedagens →","alo_t":"Nossas hospedagens","todos":"Ver todas","noche":"noite","b1":"Reserve direto e pague {n} % menos","b2":"Promoção exclusiva a partir de {n} noites.","b_btn":"Ver datas livres","prop_s":"PARA PROPRIETÁRIOS","prop_h":"Você tem um apartamento em Lima?","prop_p":"Cuidamos de tudo: anúncio, hóspedes, limpeza e manutenção. Você recebe o aluguel.","prop_b":"Cotar administração","mas":"Saiba mais","lim_s":"SERVIÇO DE LIMPEZA","lim_h":"Vamos agendar sua próxima limpeza?","lim_p":"Limpeza geral, profunda ou após cada hóspede, com a mesma equipe que cuida das nossas hospedagens.","lim_b":"Agende sua limpeza","f_con":"CONTATO","f_form":"Formulário de contato","f_lima":"Lima, Peru","f_red":"ATENDIMENTO E REDES","f_leg":"INFORMAÇÕES LEGAIS","f_priv":"Privacidade","f_cond":"Termos","f_cook":"Cookies","f_lr2":"Clique aqui para registrar sua reclamação","f_mail":"E-mail","f_form2":"Formulário","f_leg2":"LEGAL","f_red2":"REDES","f_der":"Todos os direitos reservados.","fav":"Favoritos","zf":["De frente para o mar, com vista para o Pacífico","Vista para o mar e ruas arborizadas","Central, com piscina e vista para a cidade"],"zd":["Calçadão a poucos passos","Aeroporto a 15 min","Perto do Golf","Divisa com Miraflores","Divisa com San Isidro","Centro histórico a 10 min"],"ate":"ATENDIMENTO","ate_n":"< 1 hora","ate1":"respondemos pelo WhatsApp","ate2":"100 % das mensagens respondidas","sv_e":"SERVIÇOS ZIENNA","sv_t":"Para a sua viagem","sv_sub":"Resolvemos antes de você chegar.","sv_tr":"Transfer do aeroporto","sv_trp":"Motorista particular entre o aeroporto Jorge Chávez e a sua hospedagem. Esperamos você com o seu nome.","sv_ida":"Ida","sv_vue":"Volta","sv_iv":"Ida e volta","sv_aho":"ECONOMIZE S/ 10","sv_trb":"Reservar transfer pelo WhatsApp","sv_wa":"Olá Zienna, quero reservar o transfer do aeroporto.","sv_es":"Internet ilimitada no celular","sv_esp":"eSIM da Holafly: dados ilimitados no Peru desde a chegada, sem trocar o chip.","sv_es1":"Ativa com um código QR","sv_es2":"Funciona em todo o Peru","sv_desc":"5 % de desconto","sv_esb":"Comprar a eSIM na Holafly","tit":{"SM1006":"Pôr do sol de frente para o mar","SI2105":"21º andar, vista para a cidade e piscina de frente para o mar","SI502":"Perto do Golf de San Isidro, com piscina","SM310":"Piscina de frente para o mar e pôr do sol","LINCE1504":"Vista para a cidade, a poucos passos de San Isidro","LINCE902":"Amplo, moderno e iluminado, para 4, com garagem"},"alo_s":"Apartamentos inteiros em {n}.","y_":"e","bn_ok":"Seu registro está pronto","bn_t":"Benefícios para a sua estadia","bn_sub":"Duas coisas que facilitam a sua chegada a Lima.","bn_e1":"TRASLADO PRIVADO","bn_h1":"Buscamos você no aeroporto","bn_e2":"INTERNET ILIMITADA","bn_h2":"Chegue com dados no celular","bn_cop":"Copiar","bn_copd":"Copiado","bn_ir":"Ir para bookzienna.com"},"fr":{"z_t":"Choisissez votre quartier","por_t":"Pourquoi choisir Zienna","cal":"NOTE","cal1":"sur 5 étoiles","cal2":"sur {n} avis","pro":"PROMOTION","pro1":"d'économie en direct","pro2":"dès {n} nuits","lle":"ARRIVÉE","lle_n":"Votre code","lle1":"sans attendre personne","lle2":"code personnel à chaque séjour","sup":"SUPERHÔTE","sup_n":"5 ans","sup1":"attentifs à chaque détail","sup2":"à accueillir des voyageurs sur Airbnb","desde":"À partir de","resenas":"avis","ver1":"Voir 1 logement →","vern":"Voir {n} logements →","alo_t":"Nos logements","todos":"Tout voir","noche":"nuit","b1":"Réservez en direct et payez {n} % de moins","b2":"Offre exclusive dès {n} nuits.","b_btn":"Voir les dates libres","prop_s":"PROPRIÉTAIRES","prop_h":"Vous avez un appartement à Lima ?","prop_p":"Nous nous occupons de tout : annonce, voyageurs, ménage et entretien. Vous percevez le loyer.","prop_b":"Demander un devis de gestion","mas":"En savoir plus","lim_s":"SERVICE DE MÉNAGE","lim_h":"On planifie votre prochain ménage ?","lim_p":"Ménage général, en profondeur ou entre deux voyageurs, par la même équipe qui entretient nos logements.","lim_b":"Réserver un ménage","f_con":"CONTACT","f_form":"Formulaire de contact","f_lima":"Lima, Pérou","f_red":"ASSISTANCE ET RÉSEAUX","f_leg":"INFORMATIONS LÉGALES","f_priv":"Confidentialité","f_cond":"Conditions","f_cook":"Cookies","f_lr2":"Cliquez ici pour déposer une réclamation","f_mail":"E-mail","f_form2":"Formulaire","f_leg2":"LÉGAL","f_red2":"RÉSEAUX","f_der":"Tous droits réservés.","fav":"Favoris","zf":["Face à la mer, vue sur le Pacifique","Vue sur la mer et rues arborées","Central, avec piscine et vue sur la ville"],"zd":["Front de mer à deux pas","Aéroport à 15 min","Près du Golf","À côté de Miraflores","À côté de San Isidro","Centre historique à 10 min"],"ate":"ASSISTANCE","ate_n":"< 1 heure","ate1":"nous répondons sur WhatsApp","ate2":"100 % des messages traités","sv_e":"SERVICES ZIENNA","sv_t":"Pour votre voyage","sv_sub":"Nous nous en occupons avant votre arrivée.","sv_tr":"Transfert aéroport","sv_trp":"Chauffeur privé entre l'aéroport Jorge Chávez et votre logement. Nous vous attendons avec votre nom.","sv_ida":"Aller","sv_vue":"Retour","sv_iv":"Aller-retour","sv_aho":"ÉCONOMISEZ S/ 10","sv_trb":"Réserver le transfert sur WhatsApp","sv_wa":"Bonjour Zienna, je voudrais réserver le transfert aéroport.","sv_es":"Internet illimité sur votre téléphone","sv_esp":"eSIM Holafly : données illimitées au Pérou dès l'atterrissage, sans changer de carte SIM.","sv_es1":"S'active avec un code QR","sv_es2":"Fonctionne dans tout le Pérou","sv_desc":"5 % de réduction","sv_esb":"Acheter l'eSIM sur Holafly","tit":{"SM1006":"Couchers de soleil face à la mer","SI2105":"21e étage, vue sur la ville et piscine face à la mer","SI502":"Près du Golf de San Isidro, avec piscine","SM310":"Piscine face à la mer et couchers de soleil","LINCE1504":"Vue sur la ville, à deux pas de San Isidro","LINCE902":"Spacieux, moderne et lumineux, pour 4, avec parking"},"alo_s":"Appartements entiers à {n}.","y_":"et","bn_ok":"Votre enregistrement est terminé","bn_t":"Avantages pour votre séjour","bn_sub":"Deux choses qui facilitent votre arrivée à Lima.","bn_e1":"TRANSFERT PRIVÉ","bn_h1":"Nous venons vous chercher à l'aéroport","bn_e2":"INTERNET ILLIMITÉ","bn_h2":"Arrivez avec des données sur votre téléphone","bn_cop":"Copier","bn_copd":"Copié","bn_ir":"Aller sur bookzienna.com"},"de":{"z_t":"Wählen Sie Ihr Viertel","por_t":"Warum Zienna","cal":"BEWERTUNG","cal1":"von 5 Sternen","cal2":"aus {n} Bewertungen","pro":"AKTION","pro1":"sparen bei Direktbuchung","pro2":"ab {n} Nächten","lle":"ANREISE","lle_n":"Ihr Code","lle1":"ohne auf jemanden zu warten","lle2":"persönlicher Türcode bei jeder Buchung","sup":"SUPERHOST","sup_n":"5 Jahre","sup1":"mit Liebe zum Detail","sup2":"Gastgeber auf Airbnb","desde":"Ab","resenas":"Bewertungen","ver1":"1 Unterkunft ansehen →","vern":"{n} Unterkünfte ansehen →","alo_t":"Unsere Unterkünfte","todos":"Alle ansehen","noche":"Nacht","b1":"Direkt buchen und {n} % sparen","b2":"Exklusives Angebot ab {n} Nächten.","b_btn":"Freie Termine ansehen","prop_s":"FÜR EIGENTÜMER","prop_h":"Sie haben eine Wohnung in Lima?","prop_p":"Wir kümmern uns um alles: Inserat, Gäste, Reinigung und Instandhaltung. Sie erhalten die Miete.","prop_b":"Verwaltungsangebot anfragen","mas":"Mehr erfahren","lim_s":"REINIGUNGSSERVICE","lim_h":"Sollen wir Ihre nächste Reinigung planen?","lim_p":"Grund-, Tiefen- oder Zwischenreinigung nach jedem Gast, vom selben Team, das unsere Unterkünfte pflegt.","lim_b":"Reinigung buchen","f_con":"KONTAKT","f_form":"Kontaktformular","f_lima":"Lima, Peru","f_red":"SERVICE & SOCIAL MEDIA","f_leg":"RECHTLICHES","f_priv":"Datenschutz","f_cond":"AGB","f_cook":"Cookies","f_lr2":"Hier eine Beschwerde einreichen","f_mail":"E-Mail","f_form2":"Formular","f_leg2":"RECHTLICHES","f_red2":"NETZWERKE","f_der":"Alle Rechte vorbehalten.","fav":"Favoriten","zf":["Direkt am Meer, mit Blick auf den Pazifik","Meerblick und von Bäumen gesäumte Straßen","Zentral, mit Pool und Stadtblick"],"zd":["Wenige Schritte zur Promenade","15 Min. zum Flughafen","Nahe dem Golfplatz","Grenzt an Miraflores","Grenzt an San Isidro","10 Min. zur Altstadt"],"ate":"SERVICE","ate_n":"< 1 Stunde","ate1":"wir antworten per WhatsApp","ate2":"100 % der Nachrichten beantwortet","sv_e":"ZIENNA SERVICES","sv_t":"Für Ihre Reise","sv_sub":"Wir regeln es, bevor Sie ankommen.","sv_tr":"Flughafentransfer","sv_trp":"Privater Fahrer zwischen dem Flughafen Jorge Chávez und Ihrer Unterkunft. Wir erwarten Sie mit Namensschild.","sv_ida":"Hinfahrt","sv_vue":"Rückfahrt","sv_iv":"Hin und zurück","sv_aho":"SPAREN SIE S/ 10","sv_trb":"Transfer per WhatsApp buchen","sv_wa":"Hallo Zienna, ich möchte den Flughafentransfer buchen.","sv_es":"Unbegrenztes Internet auf dem Handy","sv_esp":"Holafly-eSIM: unbegrenzte Daten in Peru ab der Landung, ohne SIM-Wechsel.","sv_es1":"Aktivierung per QR-Code","sv_es2":"Funktioniert in ganz Peru","sv_desc":"5 % Rabatt","sv_esb":"eSIM bei Holafly kaufen","tit":{"SM1006":"Sonnenuntergänge direkt am Meer","SI2105":"21. Stock, Stadtblick und Pool direkt am Meer","SI502":"Nahe dem Golfplatz von San Isidro, mit Pool","SM310":"Pool direkt am Meer und Sonnenuntergänge","LINCE1504":"Stadtblick, nur wenige Schritte von San Isidro","LINCE902":"Geräumig, modern und hell, für 4, mit Parkplatz"},"alo_s":"Ganze Wohnungen in {n}.","y_":"und","bn_ok":"Deine Registrierung ist fertig","bn_t":"Vorteile für deinen Aufenthalt","bn_sub":"Zwei Dinge, die deine Ankunft in Lima leichter machen.","bn_e1":"PRIVATER TRANSFER","bn_h1":"Wir holen dich am Flughafen ab","bn_e2":"UNBEGRENZTES INTERNET","bn_h2":"Komm mit Daten auf dem Handy an","bn_cop":"Kopieren","bn_copd":"Kopiert","bn_ir":"Zu bookzienna.com"},"it":{"z_t":"Scegli la zona","por_t":"Perché scegliere Zienna","cal":"VALUTAZIONE","cal1":"su 5 stelle","cal2":"su {n} recensioni","pro":"PROMOZIONE","pro1":"di risparmio prenotando diretto","pro2":"da {n} notti","lle":"ARRIVO","lle_n":"Il tuo codice","lle1":"senza aspettare nessuno","lle2":"codice personale per ogni soggiorno","sup":"SUPERHOST","sup_n":"5 anni","sup1":"curando ogni dettaglio","sup2":"accogliendo ospiti su Airbnb","desde":"Da","resenas":"recensioni","ver1":"Vedi 1 alloggio →","vern":"Vedi {n} alloggi →","alo_t":"I nostri alloggi","todos":"Vedi tutti","noche":"notte","b1":"Prenota diretto e paga il {n} % in meno","b2":"Offerta esclusiva da {n} notti.","b_btn":"Vedi date libere","prop_s":"PER I PROPRIETARI","prop_h":"Hai un appartamento a Lima?","prop_p":"Pensiamo a tutto noi: annuncio, ospiti, pulizie e manutenzione. Tu ricevi l'affitto.","prop_b":"Richiedi un preventivo di gestione","mas":"Scopri di più","lim_s":"SERVIZIO DI PULIZIE","lim_h":"Fissiamo la tua prossima pulizia?","lim_p":"Pulizia generale, profonda o dopo ogni ospite, con lo stesso team che cura i nostri alloggi.","lim_b":"Prenota la pulizia","f_con":"CONTATTI","f_form":"Modulo di contatto","f_lima":"Lima, Perù","f_red":"ASSISTENZA E SOCIAL","f_leg":"INFORMAZIONI LEGALI","f_priv":"Privacy","f_cond":"Termini","f_cook":"Cookie","f_lr2":"Clicca qui per presentare un reclamo","f_mail":"E-mail","f_form2":"Modulo","f_leg2":"LEGALE","f_red2":"SOCIAL","f_der":"Tutti i diritti riservati.","fav":"Preferiti","zf":["Fronte mare, con vista sul Pacifico","Vista mare e strade alberate","Centrale, con piscina e vista sulla città"],"zd":["A pochi passi dal lungomare","Aeroporto a 15 min","Vicino al Golf","Confina con Miraflores","Confina con San Isidro","Centro storico a 10 min"],"ate":"ASSISTENZA","ate_n":"< 1 ora","ate1":"rispondiamo su WhatsApp","ate2":"100 % dei messaggi con risposta","sv_e":"SERVIZI ZIENNA","sv_t":"Per il tuo viaggio","sv_sub":"Ci pensiamo noi prima che arrivi.","sv_tr":"Transfer aeroporto","sv_trp":"Autista privato tra l'aeroporto Jorge Chávez e il tuo alloggio. Ti aspettiamo con il tuo nome.","sv_ida":"Andata","sv_vue":"Ritorno","sv_iv":"Andata e ritorno","sv_aho":"RISPARMI S/ 10","sv_trb":"Prenota il transfer su WhatsApp","sv_wa":"Ciao Zienna, vorrei prenotare il transfer aeroporto.","sv_es":"Internet illimitato sul telefono","sv_esp":"eSIM Holafly: dati illimitati in Perù appena atterri, senza cambiare SIM.","sv_es1":"Si attiva con un codice QR","sv_es2":"Funziona in tutto il Perù","sv_desc":"5 % di sconto","sv_esb":"Compra l'eSIM su Holafly","tit":{"SM1006":"Tramonti fronte mare","SI2105":"21° piano, vista città e piscina fronte mare","SI502":"Vicino al Golf di San Isidro, con piscina","SM310":"Piscina fronte mare e tramonti","LINCE1504":"Vista città, a pochi passi da San Isidro","LINCE902":"Ampio, moderno e luminoso, per 4, con parcheggio"},"alo_s":"Appartamenti interi a {n}.","y_":"e","bn_ok":"La tua registrazione è completa","bn_t":"Vantaggi per il tuo soggiorno","bn_sub":"Due cose che ti semplificano l'arrivo a Lima.","bn_e1":"TRANSFER PRIVATO","bn_h1":"Ti veniamo a prendere in aeroporto","bn_e2":"INTERNET ILLIMITATO","bn_h2":"Arriva con i dati sul telefono","bn_cop":"Copia","bn_copd":"Copiato","bn_ir":"Vai su bookzienna.com"},"zh":{"z_t":"选择区域","por_t":"为什么选择 Zienna","cal":"评分","cal1":"满分 5 星","cal2":"共 {n} 条评价","pro":"优惠","pro1":"直接预订立省","pro2":"入住 {n} 晚起","lle":"入住方式","lle_n":"专属密码","lle1":"无需等人","lle2":"每次预订都有个人密码","sup":"超赞房东","sup_n":"5 年","sup1":"用心照顾每个细节","sup2":"在 Airbnb 接待房客","desde":"起价","resenas":"条评价","ver1":"查看 1 处房源 →","vern":"查看 {n} 处房源 →","alo_t":"我们的房源","todos":"查看全部","noche":"/晚","b1":"直接预订，立省 {n}%","b2":"入住 {n} 晚起享专属优惠。","b_btn":"查看空房日期","prop_s":"业主服务","prop_h":"您在利马有公寓吗？","prop_p":"我们包办一切：发布房源、接待房客、清洁和维护。您只需收租。","prop_b":"获取托管报价","mas":"了解更多","lim_s":"清洁服务","lim_h":"预约下一次清洁吧？","lim_p":"日常清洁、深度清洁或每位房客退房后的清洁，由照顾我们房源的同一团队完成。","lim_b":"预约清洁","f_con":"联系方式","f_form":"联系表单","f_lima":"秘鲁利马","f_red":"客服与社交媒体","f_leg":"法律信息","f_priv":"隐私","f_cond":"条款","f_cook":"Cookie","f_lr2":"点击此处提交投诉","f_mail":"邮箱","f_form2":"联系表单","f_leg2":"法律信息","f_red2":"社交媒体","f_der":"保留所有权利。","fav":"收藏","zf":["面朝大海，尽览太平洋","海景与林荫街道","位置居中，有泳池和城市景观"],"zd":["步行即到海滨步道","距机场 15 分钟","靠近高尔夫球场","毗邻米拉弗洛雷斯","毗邻圣伊西德罗","距历史中心 10 分钟"],"ate":"服务","ate_n":"< 1 小时","ate1":"通过 WhatsApp 回复您","ate2":"100% 消息均有回复","sv_e":"ZIENNA 服务","sv_t":"为您的旅程","sv_sub":"在您抵达前为您安排妥当。","sv_tr":"机场接送","sv_trp":"豪尔赫·查韦斯机场与您住处之间的专车接送，司机举牌等候。","sv_ida":"接机","sv_vue":"送机","sv_iv":"接送机","sv_aho":"省 S/ 10","sv_trb":"通过 WhatsApp 预订接送","sv_wa":"您好 Zienna，我想预订机场接送。","sv_es":"手机无限流量","sv_esp":"Holafly eSIM：落地即享秘鲁无限流量，无需换卡。","sv_es1":"扫描二维码即可激活","sv_es2":"全秘鲁可用","sv_desc":"95 折优惠","sv_esb":"在 Holafly 购买 eSIM","tit":{"SM1006":"海边日落","SI2105":"21 楼，城市景观与海景泳池","SI502":"靠近圣伊西德罗高尔夫球场，带泳池","SM310":"海景泳池与日落","LINCE1504":"城市景观，距圣伊西德罗仅几步","LINCE902":"宽敞、现代、明亮，可住 4 人，带停车位"},"alo_s":"位于{n}的整套公寓。","y_":"","bn_ok":"您的登记已完成","bn_t":"入住专享福利","bn_sub":"两件事，让您轻松抵达利马。","bn_e1":"私人接送","bn_h1":"我们到机场接您","bn_e2":"无限流量","bn_h2":"落地即有手机流量","bn_cop":"复制","bn_copd":"已复制","bn_ir":"前往 bookzienna.com"},"ja":{"z_t":"エリアを選ぶ","por_t":"Zienna が選ばれる理由","cal":"評価","cal1":"5つ星中","cal2":"{n}件のレビュー","pro":"キャンペーン","pro1":"直接予約で割引","pro2":"{n}泊以上","lle":"チェックイン","lle_n":"専用コード","lle1":"待ち時間なし","lle2":"予約ごとに個別の暗証番号","sup":"スーパーホスト","sup_n":"5年","sup1":"細部まで心を込めて","sup2":"Airbnbでゲストをお迎え","desde":"","resenas":"件のレビュー","ver1":"1件の宿泊施設を見る →","vern":"{n}件の宿泊施設を見る →","alo_t":"宿泊施設","todos":"すべて見る","noche":"〜 / 泊","b1":"直接予約で{n}%オフ","b2":"{n}泊以上の限定特典です。","b_btn":"空室を見る","prop_s":"オーナーの方へ","prop_h":"リマにマンションをお持ちですか？","prop_p":"掲載、ゲスト対応、清掃、メンテナンスまですべてお任せください。家賃収入はオーナー様へ。","prop_b":"管理の見積もりを依頼","mas":"詳しく見る","lim_s":"清掃サービス","lim_h":"次回の清掃をご予約しませんか？","lim_p":"通常清掃、徹底清掃、ゲスト入れ替え時の清掃まで、私たちの宿泊施設を管理する同じチームが対応します。","lim_b":"清掃を予約","f_con":"お問い合わせ","f_form":"お問い合わせフォーム","f_lima":"ペルー・リマ","f_red":"サポート・SNS","f_leg":"法的情報","f_priv":"プライバシー","f_cond":"利用規約","f_cook":"クッキー","f_lr2":"苦情・ご意見の登録はこちら","f_mail":"メール","f_form2":"フォーム","f_leg2":"法的情報","f_red2":"SNS","f_der":"無断転載を禁じます。","fav":"お気に入り","zf":["海辺に面し、太平洋を一望","海の眺めと並木道","中心部、プール付きで街を一望"],"zd":["海岸遊歩道まですぐ","空港まで15分","ゴルフ場の近く","ミラフローレスに隣接","サン・イシドロに隣接","歴史地区まで10分"],"ate":"サポート","ate_n":"1時間以内","ate1":"WhatsAppでご返信","ate2":"メッセージ返信率100%","sv_e":"ZIENNAのサービス","sv_t":"旅をもっと快適に","sv_sub":"到着前にご用意します。","sv_tr":"空港送迎","sv_trp":"ホルヘ・チャベス空港と宿泊先の間をプライベート車で送迎。お名前を掲げてお待ちします。","sv_ida":"片道（到着）","sv_vue":"片道（出発）","sv_iv":"往復","sv_aho":"S/ 10お得","sv_trb":"WhatsAppで送迎を予約","sv_wa":"こんにちは、Zienna。空港送迎を予約したいです。","sv_es":"スマホでデータ無制限","sv_esp":"Holafly eSIM：到着した瞬間からペルー全土でデータ無制限。SIMの差し替え不要。","sv_es1":"QRコードで有効化","sv_es2":"ペルー全土で利用可能","sv_desc":"5%割引","sv_esb":"HolaflyでeSIMを購入","tit":{"SM1006":"海辺の夕日","SI2105":"21階、街の眺めと海辺のプール","SI502":"サン・イシドロのゴルフ場近く、プール付き","SM310":"海辺のプールと夕日","LINCE1504":"街の眺め、サン・イシドロまで数歩","LINCE902":"広くモダンで明るい、4名様向け、駐車場付き"},"alo_s":"{n}の貸切アパートメント。","y_":"","bn_ok":"登録が完了しました","bn_t":"ご滞在の特典","bn_sub":"リマ到着をスムーズにする2つのサービス。","bn_e1":"専用送迎","bn_h1":"空港までお迎えにあがります","bn_e2":"データ無制限","bn_h2":"到着してすぐスマホでネット","bn_cop":"コピー","bn_copd":"コピーしました","bn_ir":"bookzienna.com へ"},"ko":{"z_t":"지역 선택","por_t":"Zienna를 선택하는 이유","cal":"평점","cal1":"5점 만점","cal2":"후기 {n}개","pro":"프로모션","pro1":"직접 예약 할인","pro2":"{n}박 이상","lle":"체크인","lle_n":"개인 비밀번호","lle1":"기다릴 필요 없이","lle2":"예약마다 개인 도어 비밀번호","sup":"슈퍼호스트","sup_n":"5년","sup1":"세심한 부분까지 챙기며","sup2":"Airbnb에서 게스트를 맞이해 온 경력","desde":"최저","resenas":"개 후기","ver1":"숙소 1곳 보기 →","vern":"숙소 {n}곳 보기 →","alo_t":"우리의 숙소","todos":"모두 보기","noche":"/ 박","b1":"직접 예약하고 {n}% 할인받으세요","b2":"{n}박 이상 예약 시 전용 혜택.","b_btn":"예약 가능한 날짜 보기","prop_s":"집주인 안내","prop_h":"리마에 아파트를 갖고 계신가요?","prop_p":"숙소 등록, 게스트 응대, 청소, 유지보수까지 모두 맡겨 주세요. 임대 수익은 그대로 받으시면 됩니다.","prop_b":"관리 견적 받기","mas":"자세히 보기","lim_s":"청소 서비스","lim_h":"다음 청소를 예약하시겠어요?","lim_p":"일반 청소, 대청소, 게스트 퇴실 후 청소까지, 우리 숙소를 관리하는 같은 팀이 해 드립니다.","lim_b":"청소 예약하기","f_con":"연락처","f_form":"문의 양식","f_lima":"페루 리마","f_red":"고객 지원 및 SNS","f_leg":"법적 정보","f_priv":"개인정보","f_cond":"이용약관","f_cook":"쿠키","f_lr2":"불만 사항 접수는 여기를 누르세요","f_mail":"이메일","f_form2":"문의 양식","f_leg2":"법률 정보","f_red2":"소셜","f_der":"모든 권리 보유.","fav":"즐겨찾기","zf":["바다 바로 앞, 태평양 전망","바다 전망과 가로수길","중심가, 수영장과 도시 전망"],"zd":["해안 산책로 바로 앞","공항까지 15분","골프장 근처","미라플로레스와 인접","산이시드로와 인접","구시가지까지 10분"],"ate":"응대","ate_n":"1시간 이내","ate1":"WhatsApp으로 답변해 드려요","ate2":"메시지 응답률 100%","sv_e":"ZIENNA 서비스","sv_t":"여행을 위한 서비스","sv_sub":"도착 전에 미리 준비해 드립니다.","sv_tr":"공항 픽업·샌딩","sv_trp":"호르헤 차베스 공항과 숙소 사이 전용 차량. 이름 팻말을 들고 기다립니다.","sv_ida":"픽업","sv_vue":"샌딩","sv_iv":"왕복","sv_aho":"S/ 10 할인","sv_trb":"WhatsApp으로 예약하기","sv_wa":"안녕하세요 Zienna, 공항 픽업을 예약하고 싶어요.","sv_es":"휴대폰 데이터 무제한","sv_esp":"Holafly eSIM: 도착하자마자 페루 전역 데이터 무제한, 유심 교체 불필요.","sv_es1":"QR 코드로 바로 개통","sv_es2":"페루 전역에서 사용","sv_desc":"5% 할인","sv_esb":"Holafly에서 eSIM 구매","tit":{"SM1006":"바다 앞 석양","SI2105":"21층, 도시 전망과 바다 앞 수영장","SI502":"산이시드로 골프장 근처, 수영장 완비","SM310":"바다 앞 수영장과 석양","LINCE1504":"도시 전망, 산이시드로까지 몇 걸음","LINCE902":"넓고 모던하며 밝은 4인용, 주차 가능"},"alo_s":"{n}의 아파트 전체.","y_":"및","bn_ok":"등록이 완료되었습니다","bn_t":"숙박 혜택","bn_sub":"리마 도착을 편하게 해 주는 두 가지.","bn_e1":"전용 픽업","bn_h1":"공항으로 모시러 갑니다","bn_e2":"무제한 데이터","bn_h2":"도착하자마자 휴대폰 데이터 사용","bn_cop":"복사","bn_copd":"복사됨","bn_ir":"bookzienna.com으로 이동"},"ru":{"z_t":"Выберите район","por_t":"Почему Zienna","cal":"РЕЙТИНГ","cal1":"из 5 звёзд","cal2":"по {n} отзывам","pro":"АКЦИЯ","pro1":"экономии при прямом бронировании","pro2":"от {n} ночей","lle":"ЗАЕЗД","lle_n":"Ваш код","lle1":"без ожидания","lle2":"личный код к каждому бронированию","sup":"СУПЕРХОЗЯИН","sup_n":"5 лет","sup1":"заботимся о каждой детали","sup2":"принимаем гостей на Airbnb","desde":"От","resenas":"отзывов","ver1":"Смотреть 1 вариант →","vern":"Смотреть варианты: {n} →","alo_t":"Наше жильё","todos":"Смотреть все","noche":"ночь","b1":"Бронируйте напрямую и платите на {n} % меньше","b2":"Специальное предложение от {n} ночей.","b_btn":"Свободные даты","prop_s":"ВЛАДЕЛЬЦАМ","prop_h":"У вас есть квартира в Лиме?","prop_p":"Мы берём на себя всё: объявление, гостей, уборку и обслуживание. Вы получаете доход.","prop_b":"Рассчитать управление","mas":"Подробнее","lim_s":"УБОРКА","lim_h":"Запланируем следующую уборку?","lim_p":"Обычная, генеральная или уборка после каждого гостя — той же командой, что ухаживает за нашим жильём.","lim_b":"Записаться на уборку","f_con":"КОНТАКТЫ","f_form":"Форма обратной связи","f_lima":"Лима, Перу","f_red":"ПОДДЕРЖКА И СОЦСЕТИ","f_leg":"ПРАВОВАЯ ИНФОРМАЦИЯ","f_priv":"Конфиденциальность","f_cond":"Условия","f_cook":"Cookie","f_lr2":"Нажмите здесь, чтобы оставить жалобу","f_mail":"Почта","f_form2":"Форма","f_leg2":"ПРАВО","f_red2":"СОЦСЕТИ","f_der":"Все права защищены.","fav":"Избранное","zf":["У самого моря, с видом на Тихий океан","Вид на море и зелёные улицы","В центре, с бассейном и видом на город"],"zd":["Набережная в двух шагах","15 мин до аэропорта","Рядом с гольф-клубом","Граничит с Мирафлоресом","Граничит с Сан-Исидро","10 мин до исторического центра"],"ate":"ПОДДЕРЖКА","ate_n":"< 1 часа","ate1":"отвечаем в WhatsApp","ate2":"отвечаем на 100 % сообщений","sv_e":"УСЛУГИ ZIENNA","sv_t":"Для вашей поездки","sv_sub":"Всё организуем до вашего приезда.","sv_tr":"Трансфер из аэропорта","sv_trp":"Личный водитель между аэропортом Хорхе Чавес и вашим жильём. Встретим с табличкой.","sv_ida":"В одну сторону (прилёт)","sv_vue":"В одну сторону (вылет)","sv_iv":"Туда и обратно","sv_aho":"ЭКОНОМИЯ S/ 10","sv_trb":"Заказать трансфер в WhatsApp","sv_wa":"Здравствуйте, Zienna! Хочу заказать трансфер из аэропорта.","sv_es":"Безлимитный интернет в телефоне","sv_esp":"eSIM Holafly: безлимитные данные по всему Перу сразу после посадки, без замены SIM.","sv_es1":"Активируется по QR-коду","sv_es2":"Работает по всему Перу","sv_desc":"Скидка 5 %","sv_esb":"Купить eSIM в Holafly","tit":{"SM1006":"Закаты у моря","SI2105":"21-й этаж, вид на город и бассейн у моря","SI502":"Рядом с гольф-клубом Сан-Исидро, с бассейном","SM310":"Бассейн у моря и закаты","LINCE1504":"Вид на город, в двух шагах от Сан-Исидро","LINCE902":"Просторная, современная и светлая, на 4 гостей, с парковкой"},"alo_s":"Квартиры целиком: {n}.","y_":"и","bn_ok":"Регистрация завершена","bn_t":"Преимущества для вашего проживания","bn_sub":"Две вещи, которые упростят ваш приезд в Лиму.","bn_e1":"ИНДИВИДУАЛЬНЫЙ ТРАНСФЕР","bn_h1":"Встретим вас в аэропорту","bn_e2":"БЕЗЛИМИТНЫЙ ИНТЕРНЕТ","bn_h2":"Прилетайте с интернетом в телефоне","bn_cop":"Копировать","bn_copd":"Скопировано","bn_ir":"Перейти на bookzienna.com"}};
  var LANG = "es";
  // Idioma y moneda en toda la web (Hugo, 20-11-2026: «cuando cambia el idioma, tiene que cambiar absolutamente toda la
  // página»; «moneda referencial con el tipo de cambio»). Viajan entre dominios en ?lang= y ?mon= (el localStorage no se
  // comparte entre registro y web) y se recuerdan en zlang / zmon.
  // Preferencias compartidas por TODA la web (Hugo, 20-11-2026: cambió a español en la portada y Limpieza seguía en
  // japonés). web.bookzienna.com y registro.bookzienna.com no comparten localStorage: se guardan en una cookie de
  // .bookzienna.com (la ven todos los subdominios). En localhost, localStorage.
  function prefLeer(k) {
    try { var m = document.cookie.match(new RegExp("(?:^|; )" + k + "=([^;]*)")); if (m) { return decodeURIComponent(m[1]); } } catch (e) {}
    try { return localStorage.getItem(k) || ""; } catch (e) { return ""; }
  }
  function prefGuardar(k, v) {
    try { var dom = /(^|\.)bookzienna\.com$/.test(location.hostname) ? "; domain=.bookzienna.com" : ""; document.cookie = k + "=" + encodeURIComponent(v) + "; path=/; max-age=31536000; SameSite=Lax" + dom + (location.protocol === "https:" ? "; Secure" : ""); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  var LANGS = ["es", "en", "pt", "fr", "de", "it", "zh", "ja", "ko", "ru"];
  var LOCALES = { es: "es-PE", en: "en-US", pt: "pt-BR", fr: "fr-FR", de: "de-DE", it: "it-IT", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", ru: "ru-RU" };
  (function () {
    var l = (Q.get("lang") || "").toLowerCase();
    if (LANGS.indexOf(l) < 0) { l = prefLeer("zlang"); }
    if (LANGS.indexOf(l) >= 0) { LANG = l; prefGuardar("zlang", l); }
  })();
  function LOC() { return LOCALES[LANG] || "es-PE"; }
  try { document.documentElement.lang = LANG; } catch (e) {}
  function DIAS() {
    if (LANG === "es") { return ["L", "M", "M", "J", "V", "S", "D"]; }
    try { var f = new Intl.DateTimeFormat(LOC(), { weekday: LANG === "zh" || LANG === "ja" || LANG === "ko" ? "narrow" : "short" }); return [5, 6, 7, 8, 9, 10, 11].map(function (d) { return f.format(new Date(2024, 1, d)); }); }
    catch (e) { return ["L", "M", "M", "J", "V", "S", "D"]; }
  }
  var MONEDAS = [["PEN", "S/"], ["USD", "US$"], ["EUR", "€"], ["BRL", "R$"], ["CLP", "CLP$"], ["ARS", "AR$"], ["MXN", "MX$"], ["COP", "COL$"],
    ["GBP", "£"], ["CAD", "CA$"], ["AUD", "AU$"], ["CHF", "CHF"], ["CNY", "¥"], ["JPY", "¥"], ["KRW", "₩"], ["RUB", "₽"]];
  function monValida(m) { return MONEDAS.some(function (x) { return x[0] === m; }) ? m : ""; }
  var MON = monValida((Q.get("mon") || "").toUpperCase());
  if (!MON) { MON = monValida(prefLeer("zmon")) || "PEN"; }
  prefGuardar("zmon", MON);
  // Tipo de cambio referencial: open.er-api.com (gratis, sin clave, se actualiza cada día). Se guarda 6 h; si al entrar
  // no había tasas y la moneda no es soles, la página se vuelve a pintar una vez cuando llegan.
  var TASAS = null;
  (function () {
    var t = null;
    try { t = JSON.parse(localStorage.getItem("ztasas") || "null"); } catch (e) { t = null; }
    if (t && t.r) { TASAS = t.r; }
    if (t && Date.now() - t.t < 6 * 3600 * 1000) { return; }
    fetch("https://open.er-api.com/v6/latest/PEN").then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.result !== "success" || !d.rates) { return; }
      var habia = !!TASAS; TASAS = d.rates;
      try { localStorage.setItem("ztasas", JSON.stringify({ t: Date.now(), r: d.rates })); } catch (e) {}
      if (!habia && MON !== "PEN") { try { if (!sessionStorage.getItem("zrepinta")) { sessionStorage.setItem("zrepinta", "1"); location.reload(); } } catch (e) {} }
    }).catch(function () {});
  })();
  // Traducción de TODA la página (Hugo, 20-11-2026). Diccionario español → idioma en tr/<idioma>.js (window.ZTR,
  // generado con scratchpad i18n/). Se aplica a los textos y a placeholder/aria-label/title/alt, y otra vez cada vez que
  // algo se repinta (MutationObserver). Si un texto lleva números se busca con {n}. data-notr / translate="no" = no tocar.
  var ZTR = null, ZTR_ESPERA = [];
  // Fechas del idioma (p. ej. «21 janv.», «sam. 21 janv.», «1月21日») → {d}, para buscar la frase en el diccionario.
  var RE_FECHA = null;
  function reFecha() {
    if (RE_FECHA !== null) { return RE_FECHA; }
    try {
      var alt = [], f1 = new Intl.DateTimeFormat(LOC(), { day: "numeric", month: "short" }), f2 = new Intl.DateTimeFormat(LOC(), { weekday: "short", day: "numeric", month: "short" });
      var esc2 = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
      for (var m = 0; m < 12; m++) { [f2, f1].forEach(function (f) { for (var d = 1; d <= 7; d++) { alt.push(esc2(f.format(new Date(2026, m, 20 + d))).replace(/2[1-8]/, "\\d{1,2}")); } }); }
      alt = alt.filter(function (x, k) { return alt.indexOf(x) === k; }).sort(function (a, b) { return b.length - a.length; });
      RE_FECHA = new RegExp(alt.join("|"), "g");
    } catch (e) { RE_FECHA = false; }
    return RE_FECHA;
  }
  // Precios en la moneda elegida («23 $US», «US$ 1,234») → «S/ {n}», como están en el diccionario.
  var RE_MON = null;
  function reMon() {
    if (RE_MON !== null) { return RE_MON; }
    RE_MON = false;
    if (MON === "PEN") { return RE_MON; }
    try {
      var ej = new Intl.NumberFormat(LOC(), { style: "currency", currency: MON, maximumFractionDigits: 0 }).format(1234);
      var esc2 = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
      var i = ej.search(/\d/), f = ej.length - ej.split("").reverse().join("").search(/\d/);
      RE_MON = new RegExp(esc2(ej.slice(0, i)).replace(/\s/g, "\\s?") + "\\d[\\d.,\\s\u00a0\u202f]*\\d|" + esc2(ej.slice(0, i)).replace(/\s/g, "\\s?") + "\\d" + (f < ej.length ? "" : ""), "g");
      var pre = esc2(ej.slice(0, i)).replace(/\s/g, "\\s?"), post = esc2(ej.slice(f)).replace(/\s/g, "\\s?");
      RE_MON = new RegExp(pre + "\\d(?:[\\d.,\u00a0\u202f ]*\\d)?" + post, "g");
    } catch (e) { RE_MON = false; }
    return RE_MON;
  }
  function trUno(k) {
    if (ZTR[k] != null) { return ZTR[k]; }
    var fechas = [], nums = [], mons = [], pl = k;
    var rm = reMon(); if (rm) { pl = pl.replace(rm, function (m) { mons.push(m); return "\u0001"; }); }
    var rf = reFecha(); if (rf) { pl = pl.replace(rf, function (m) { fechas.push(m); return "{d}"; }); }
    pl = pl.replace(/\{d\}\./g, "{d}");
    pl = pl.replace(/\d+(?:[.,:]\d+)*/g, function (m) { nums.push(m); return "{n}"; }).replace(/\u0001/g, "S/ {n}");
    if ((fechas.length || nums.length || mons.length) && ZTR[pl] != null) {
      var i = 0, j = 0, q = 0;
      return ZTR[pl].replace(/S\/\s?\{n\}/g, function () { return mons[q++] || ""; }).replace(/\{d\}/g, function () { return fechas[j++] || ""; }).replace(/\{n\}/g, function () { return nums[i++] || ""; }).replace(/([^.])\.\.(?!\.)/g, "$1.");
    }
    return null;
  }
  // Por partes, de lo más fuerte a lo más débil: «Fayetteville, Carolina del Norte · julio de 2026», «San Isidro · Vista
  // al mar», «2 huéspedes (máximo 2)», «71 US$ × 2 noches». Cada parte se busca entera y, si no está, se vuelve a partir.
  var SEPS = [/(\s*[·•|]\s*)/, /(\s*[—–→×]\s*)/, /(\s*\(\s*|\s*\)\s*)/, /(,\s+)/, /(:\s+)/];
  function trPartes(k, nivel) {
    var r = trUno(k); if (r != null) { return r; }
    for (var n = nivel; n < SEPS.length; n++) {
      var tr = k.split(SEPS[n]); if (tr.length < 2) { continue; }
      var cambio = false;
      var out = tr.map(function (x, m) {
        if (m % 2 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(x)) { return x; }
        var y = trPartes(x.trim(), n + 1); if (y != null) { cambio = true; return x.replace(x.trim(), y); } return x;
      });
      return cambio ? out.join("") : null;
    }
    return null;
  }
  function trTexto(t) {
    if (!ZTR) { return null; }
    var k = t.replace(/\s+/g, " ").trim();
    if (!k || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(k)) { return null; }
    return trPartes(k, 0);
  }
  function trNodo(raiz) {
    if (!ZTR || !raiz) { return; }
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentNode; if (!p || p.closest && p.closest("[data-notr],[translate=no],script,style")) { return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT; } }), n, lst = [];
    while ((n = w.nextNode())) { lst.push(n); }
    lst.forEach(function (n) {
      var t = trTexto(n.nodeValue);
      if (t != null) { var m = n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/); n.nodeValue = m[1] + t + m[2]; }
    });
    var els = raiz.querySelectorAll ? raiz.querySelectorAll("[placeholder],[aria-label],[title],img[alt],input[type=submit],input[type=button]") : [];
    Array.prototype.forEach.call(els, function (e) {
      if (e.closest("[data-notr],[translate=no]")) { return; }
      ["placeholder", "aria-label", "title", "alt", "value"].forEach(function (a) {
        if ((a === "value" && e.tagName !== "INPUT") || !e.hasAttribute(a)) { return; }
        var t = trTexto(e.getAttribute(a)); if (t != null) { e.setAttribute(a, t); }
      });
    });
  }
  if (LANG !== "es") {
    (function () {
      var sc = document.createElement("script");
      sc.src = "/assets/zienna/disponibilidad/tr/" + LANG + ".js?v=" + ((document.querySelector('script[src*="index.js"]') || {}).src || "").split("v=")[1];
      sc.onload = function () {
        ZTR = window.ZTR || null; if (!ZTR) { return; }
        document.title = trTexto(document.title) || document.title;
        trNodo(document.body);
        var obs = new MutationObserver(function (ms) {
          obs.disconnect();
          ms.forEach(function (m) {
            if (m.type === "characterData") { var t = trTexto(m.target.nodeValue); if (t != null) { m.target.nodeValue = t; } }
            Array.prototype.forEach.call(m.addedNodes || [], function (x) { if (x.nodeType === 1) { trNodo(x); } else if (x.nodeType === 3) { var t = trTexto(x.nodeValue); if (t != null) { x.nodeValue = t; } } });
          });
          obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
        obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      };
      document.head.appendChild(sc);
    })();
  }
  function TX(k, n) {
    var t = I18N[LANG] && I18N[LANG][k] != null ? I18N[LANG][k] : I18N.es[k];
    return typeof t === "string" ? t.replace("{n}", n == null ? "" : n) : t;
  }
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
  function corto(f) { var p = partes(f); if (LANG !== "es") { try { return new Intl.DateTimeFormat(LOC(), { day: "numeric", month: "short" }).format(new Date(p.a, p.m - 1, p.d)); } catch (e) {} } return p.d + " " + MESES_C[p.m - 1]; }
  function mesTxt(ym) { var p = ym.split("-"); if (LANG !== "es") { try { return new Intl.DateTimeFormat(LOC(), { month: "long", year: "numeric" }).format(new Date(+p[0], +p[1] - 1, 1)); } catch (e) {} } return MESES[+p[1] - 1] + " " + p[0]; }
  function sumaMes(ym, k) { var p = ym.split("-"); var t = (+p[0]) * 12 + (+p[1] - 1) + k; return Math.floor(t / 12) + "-" + pad((t % 12) + 1); }
  function soles(n) {
    var t = TASAS && MON !== "PEN" ? TASAS[MON] : 0;
    if (!t) { return "S/ " + Number(n).toLocaleString("es-PE"); }
    var v = Number(n) * t;
    try { return new Intl.NumberFormat(LOC(), { style: "currency", currency: MON, maximumFractionDigits: v >= 10 ? 0 : 2, minimumFractionDigits: 0 }).format(v); }
    catch (e) { return MON + " " + Math.round(v); }
  }
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
    // Nunca fechas puestas solas (Hugo, 19-11-2026: «cada que le pico a reservar se colocan fechas random»): sin una
    // búsqueda válida, todas las páginas arrancan en «Elige tu fecha».
    if (!v.ll || !v.sa || v.ll < hoy() || v.sa <= v.ll) { v = { ll: "", sa: "", h: v.h || 2 }; }
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
  // ───────── Caja de búsqueda con todo dentro, tipo Airbnb (Hugo, 19-11-2026: «que no abra una pantalla gigante, algo
  // sutil, dentro de la cajita»). Distrito, fechas y huéspedes se eligen en un panel que se despliega desde la caja; recién
  // «Buscar» lleva a Alojamientos con todo elegido. Se usa en la portada de Wix (recuadro modo=caja, con la imagen de la
  // caja de siempre debajo mientras carga) y en la portada propia. `arriba`: el panel se abre hacia arriba (celular en Wix,
  // donde abajo se corta la sección). `T`: textos (portada propia en 10 idiomas).
  var DOW_C = DIAS();
  function cajaBusqueda(caja, op) {
    op = op || {};
    var CEL = op.cel, T = op.T || {}, abierto = "", off = 0, z = busq.z || "";
    var L = { dis: T.dis || "Distrito", todos: T.todos || "Todos los distritos", ll: T.ll || "Llegada", sa: T.sa || "Salida", fe: "Fechas", hu: T.hu || "Huéspedes",
      elige: T.elige || "Elige tu fecha", eliges: "Elige tus fechas", buscar: T.buscar || "Buscar", hs: T.hs || ["huésped", "huéspedes"] };
    function hTxt() { var h = +busq.h || 2; return h + " " + L.hs[h === 1 ? 0 : 1]; }
    function fechasTxt() { return busq.ll && busq.sa ? corto(busq.ll) + " → " + corto(busq.sa) : busq.ll ? corto(busq.ll) + " → …" : L.eliges; }
    function barra() {
      var flecha = '<i class="bq-fl"></i>';
      return '<div class="bq-bar' + (CEL ? ' bq-cel' : '') + '">' +
        '<button type="button" class="bq-c' + (abierto === "dis" ? ' on' : '') + '" data-p="dis"><small>' + L.dis + '</small><b>' + esc(z || (CEL ? "Todos" : L.todos)) + '</b>' + flecha + '</button>' +
        (CEL ? '<button type="button" class="bq-c' + (abierto === "fe" ? ' on' : '') + '" data-p="fe"><small>' + L.fe + '</small><b>' + fechasTxt() + '</b></button>' :
          '<button type="button" class="bq-c' + (abierto === "fe" && !(busq.ll && !busq.sa) ? ' on' : '') + '" data-p="fe"><small>' + L.ll + '</small><b>' + (busq.ll ? corto(busq.ll) : L.elige) + '</b></button>' +
          '<button type="button" class="bq-c' + (abierto === "fe" && busq.ll && !busq.sa ? ' on' : '') + '" data-p="fe"><small>' + L.sa + '</small><b>' + (busq.sa ? corto(busq.sa) : L.elige) + '</b></button>') +
        '<button type="button" class="bq-c' + (abierto === "hu" ? ' on' : '') + '" data-p="hu"><small>' + L.hu + '</small><b>' + hTxt() + '</b>' + flecha + '</button>' +
        '<button type="button" class="bq-go" data-p="go">' + L.buscar + '</button></div>';
    }
    function mes(ym) {
      var p = ym.split("-"), d1 = new Date(+p[0], +p[1] - 1, 1), dias = new Date(+p[0], +p[1], 0).getDate(), vac = (d1.getDay() + 6) % 7, hoyF = hoy(), h = '';
      h += '<div class="bq-mes"><b>' + mesTxt(ym) + '</b><div class="bq-dow">' + DOW_C.map(function (d) { return '<span>' + d + '</span>'; }).join("") + '</div><div class="bq-g">';
      for (var i = 0; i < vac; i++) { h += '<span></span>'; }
      for (var d = 1; d <= dias; d++) {
        var f = ym + "-" + pad(d), c = "bq-d";
        if (f < hoyF) { c += " pas"; }
        if (f === busq.ll || f === busq.sa) { c += " sel"; }
        if (busq.ll && busq.sa && f > busq.ll && f < busq.sa) { c += " rango"; }
        if (f === busq.ll && busq.sa) { c += " ini"; } if (f === busq.sa) { c += " fin"; }
        h += '<button type="button" class="' + c + '" data-f="' + f + '"' + (f < hoyF ? ' disabled' : '') + '>' + d + '</button>';
      }
      return h + '</div></div>';
    }
    function panel() {
      if (!abierto) { return ""; }
      var h = '<div class="bq-pop bq-pop-' + abierto + (op.arriba ? ' bq-arriba' : '') + '">';
      if (abierto === "dis") {
        h += [""].concat(DISTRITOS).map(function (d) { return '<button type="button" class="bq-op' + (d === z ? ' on' : '') + '" data-z="' + d + '">' + esc(d || L.todos) + '</button>'; }).join("");
      } else if (abierto === "fe") {
        var ym = sumaMes(hoy().slice(0, 7), off), n = busq.ll && busq.sa ? Math.round((new Date(busq.sa + "T12:00:00") - new Date(busq.ll + "T12:00:00")) / 864e5) : 0;
        h += '<div class="bq-cab"><button type="button" class="bq-nav" data-n="-1"' + (off <= 0 ? ' disabled' : '') + ' aria-label="Mes anterior">‹</button><span>' +
          (n ? n + (n === 1 ? " noche" : " noches") + " · " + corto(busq.ll) + " → " + corto(busq.sa) : busq.ll ? "Ahora elige tu salida" : "Elige tu llegada") +
          '</span><button type="button" class="bq-nav" data-n="1"' + (off >= 10 ? ' disabled' : '') + ' aria-label="Mes siguiente">›</button></div>';
        h += '<div class="bq-meses">' + mes(ym) + (CEL ? '' : mes(sumaMes(ym, 1))) + '</div>';
        h += '<div class="bq-pie"><button type="button" class="bq-borrar" data-x="1">Borrar</button><button type="button" class="bq-listo" data-p="">' + (n ? "Listo" : "Cerrar") + '</button></div>';
      } else if (abierto === "hu") {
        var hh = +busq.h || 2;
        h += '<div class="bq-hu"><span>' + L.hu + '</span><div><button type="button" class="bq-mm" data-h="-1"' + (hh <= 1 ? ' disabled' : '') + '>−</button><b>' + hh + '</b><button type="button" class="bq-mm" data-h="1"' + (hh >= 4 ? ' disabled' : '') + '>+</button></div></div>' +
          '<div class="bq-pie"><span></span><button type="button" class="bq-listo" data-p="">Listo</button></div>';
      }
      return h + '</div>';
    }
    function pintar() { caja.innerHTML = '<div class="bq' + (op.arriba ? ' bq-up' : '') + '">' + (op.arriba ? panel() + barra() : barra() + panel()) + '</div>'; if (op.alPintar) { op.alPintar(!!abierto); } }
    function ir() {
      busq.z = z; guardar();
      var q = []; if (z) { q.push("zona=" + encodeURIComponent(z)); }
      if (busq.ll && busq.sa) { q.push("ll=" + busq.ll, "sa=" + busq.sa, "h=" + (busq.h || 2)); }
      var u = LISTADO + (q.length ? "?" + q.join("&") : "");
      try { (window.top || window).location.href = u; } catch (e) { location.href = u; }
    }
    caja.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var t = ev.target.closest("button"); if (!t) { return; }
      if (t.hasAttribute("data-p")) {
        var p = t.getAttribute("data-p");
        if (p === "go") { if (!(busq.ll && busq.sa)) { abierto = "fe"; pintar(); return; } ir(); return; }
        abierto = abierto === p ? "" : p; pintar(); return;
      }
      if (t.hasAttribute("data-z")) { z = zonaValida(t.getAttribute("data-z")); abierto = ""; pintar(); return; }
      if (t.hasAttribute("data-n")) { off = Math.max(0, Math.min(10, off + +t.getAttribute("data-n"))); pintar(); return; }
      if (t.hasAttribute("data-x")) { busq.ll = ""; busq.sa = ""; guardar(); pintar(); return; }
      if (t.hasAttribute("data-h")) { busq.h = Math.max(1, Math.min(4, (+busq.h || 2) + +t.getAttribute("data-h"))); guardar(); pintar(); return; }
      if (t.hasAttribute("data-f")) {
        var f = t.getAttribute("data-f");
        if (!busq.ll || busq.sa || f <= busq.ll) { busq.ll = f; busq.sa = ""; } else { busq.sa = f; guardar(); }
        pintar(); return;
      }
    });
    document.addEventListener("click", function () { if (abierto) { abierto = ""; pintar(); } });
    pintar();
    return { cerrar: function () { abierto = ""; pintar(); } };
  }
  // Recuadro de Wix (portada): solo la caja, fondo transparente. ?cel=1 versión celular · ?abre=arriba panel hacia arriba.
  function modoCaja() {
    document.documentElement.style.background = "transparent";
    // Un solo iframe en Wix: en el celular Wix lo hace angosto y aquí se pasa sola a la caja de 2×2.
    var cel = Q.get("cel") === "1" || window.innerWidth < 600;
    document.body.className += " bq-en" + (cel ? " bq-en-cel" : "");
    var fj = document.createElement("link"); fj.rel = "stylesheet"; fj.href = "https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&display=swap"; document.head.appendChild(fj);
    app.innerHTML = '<div id="bq-raiz"></div>';
    cajaBusqueda(document.getElementById("bq-raiz"), { cel: cel, arriba: Q.get("abre") === "arriba" });
  }

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
    if (busq.z) { u += "&z=" + encodeURIComponent(busq.z); }
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
    DIAS().forEach(function (x) { h += '<div class="dz-dow">' + x + '</div>'; });
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
        // Texto entero (se corta con CSS) para que el traductor de página lo encuentre en el diccionario.
        document.getElementById("tj-rs").innerHTML = '<span class="serif tj-rs-t">«<span>' + esc(r.texto) + '</span>»</span><small>' + esc(r.nombre) + (r.lugar ? ", " + esc(r.lugar) : "") +
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
  function fechaLarga(f) { var p = partes(f), d = new Date(p.a, p.m - 1, p.d); if (LANG !== "es") { try { return new Intl.DateTimeFormat(LOC(), { weekday: "short", day: "numeric", month: "short" }).format(d); } catch (e) {} } return DIAS_C[d.getDay()] + " " + p.d + " " + MESES_C[p.m - 1]; }
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
      '<div class="sl-tar-tot"><b>Total (' + MON + ')</b><span>' + precioTachado(f) + '</span></div>' + (MON !== "PEN" ? '<p class="sl-pen">Se cobra en soles: S/ ' + Number(f.total).toLocaleString("es-PE") + '</p>' : '') + '<div id="sl-srv" hidden></div><p class="sl-fin">Es el precio final. No pagas nada más.</p></div></aside>';
    var h = marcoPaso("Alojamientos", volver, true) ? '<div class="sl sl-b">' :
      '<div class="sl sl-b"><div class="sl-cab"><a class="sl-marca" href="' + esc(WEB) + '" target="_top"><img src="' + ASSET + 'zienna_icono.png" alt="">Zienna Living &amp; Aparts</a><a class="sl-volver" href="' + esc(volver) + '" target="_top">← Volver al alojamiento</a></div>';
    h += '<div class="sl-cols">' + side + '<div class="sl-main"><div class="sl-prog"><i class="on" id="sp1"></i><i id="sp2"></i><i id="sp3"></i></div>';
    // paso 1
    var opHu = ""; for (var k = 1; k <= (f.capacidad || 2); k++) { opHu += '<option value="' + k + '"' + (k === hu ? " selected" : "") + '>' + k + (k === 1 ? " huésped" : " huéspedes") + '</option>'; }
    h += '<section id="sl1"><div class="sl-tt"><a class="sl-flecha" href="' + esc(volver) + '" target="_top" aria-label="Volver">‹</a><h1>Confirma tu estadía</h1></div><h2 class="sl-h2">Tu viaje</h2>';
    h += '<div class="sl-it"><div><b>Fechas</b><span>' + corto(ll) + ' – ' + corto(sa) + ' · llegas desde las 3:00 pm, sales hasta las 11:00 am</span></div><a href="' + esc(volver) + '" target="_top">Editar</a></div>';
    h += '<div class="sl-it"><div><b>Huéspedes</b><span id="sl-hu-t"></span><select id="sl-hu" hidden aria-label="Huéspedes">' + opHu + '</select></div><button type="button" id="sl-hu-ed">Editar</button></div>';
    h += '<div class="sl-oro" id="sl-oro" hidden></div>';
    // Opción C (Hugo, 19-11-2026): servicios al reservar; el traslado suma al total.
    h += '<h2 class="sl-h2">¿Agregamos algo a tu viaje?</h2><p class="sl-opc">Opcional. Lo coordinamos contigo por WhatsApp.</p>';
    h += '<div class="sl-ad"><div class="sl-ad-i">' + icoSrv("auto", 24) + '</div><div><b>Traslado al aeropuerto</b><span>Chofer privado, puerta a puerta.</span><div class="sl-chips" id="sl-tr">' +
      '<button type="button" data-t="" class="on">No, gracias</button>' + TRASLADOS.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[0] + ' · S/ ' + t[1] + '</button>'; }).join("") + '</div></div></div>';
    h += '<div class="sl-ad"><div class="sl-ad-i">' + icoSrv("sim", 24) + '</div><div><b>Internet ilimitado (eSIM Holafly)</b><span>Te enviamos el enlace con nuestro código para ' + ESIM.pct + ' % de descuento.</span><div class="sl-chips" id="sl-es">' +
      '<button type="button" data-e="1">Sí, envíamelo</button><button type="button" data-e="0" class="on">No, gracias</button></div></div></div>';
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
    var traslado = "", esim = 0;
    function precioTr() { var t = TRASLADOS.filter(function (x) { return x[0] === traslado; })[0]; return t ? t[1] : 0; }
    function pintarSrv() {
      var c = $("sl-srv"), pt = precioTr();
      c.hidden = !pt;
      c.innerHTML = pt ? '<div class="sl-tar-f"><span>Traslado (' + esc(traslado.toLowerCase()) + ')</span><span>' + soles(pt) + '</span></div><div class="sl-tar-tot"><b>Total con traslado</b><span><b>' + soles((Number(f.total) || 0) + pt) + '</b></span></div>' : '';
    }
    $("sl-tr").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-t]"); if (!b) { return; } traslado = b.getAttribute("data-t"); [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); }); pintarSrv(); });
    $("sl-es").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-e]"); if (!b) { return; } esim = +b.getAttribute("data-e"); [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); }); });
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
        celular: $("sl-cel").value, tipo_doc: $("sl-tdoc").value, num_doc: $("sl-ndoc").value, reglas: 1, datos: 1, sitio: $("sl-sitio").value, traslado: traslado, esim: esim }).then(function (r) {
        guardada = r; $("sl-err").textContent = "";
        rastrear("datos", { p: PROP, ll: ll, sa: sa, h: hu, sol: r.codigo }, { value: Number(f.total) || 0, currency: "PEN" });
        $("sl-res").innerHTML = '<div><span>Alojamiento</span><b>' + esc(titulo) + '</b></div><div><span>Fechas</span><span>' + fechaLarga(ll) + ' → ' + fechaLarga(sa) + ' · ' + noches + '</span></div>' +
          '<div><span>Huéspedes</span><span>' + hu + '</span></div><div><span>Total</span><span>' + precioTachado(f) + '</span></div><div><span></span><span class="sl-fin">Precio final, limpieza incluida</span></div>' +
          (r.traslado ? '<div><span>Traslado</span><span>' + esc(r.traslado) + ' · ' + soles(r.traslado_precio) + '</span></div><div><span>Total con traslado</span><b>' + soles(r.total_con_servicios) + '</b></div>' : '') +
          (r.esim ? '<div><span>eSIM Holafly</span><span>Código <b>' + esc(r.esim.codigo) + '</b> · ' + r.esim.pct + ' % de descuento</span></div>' : '') + '<hr><div><span>Huésped</span><span>' + esc($("sl-nom").value.trim() + " " + $("sl-ape").value.trim()) + '</span></div>' +
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
    // Diseño de Hugo (19-11-2026): tarjetas con ícono dorado, etiqueta y cifra grande (la B de las maquetas), sin
    // fotos, en el fondo de siempre: blancas y la de la promoción en negro. «Tu clave» se cambió por Atención.
    var ICO_M = {
      estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      etiqueta: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
      reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
      medalla: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/>'
    };
    function metrica(etiqueta, num, linea1, linea2, negra, ico) {
      return '<div class="pt-m' + (negra ? ' pt-m-n' : '') + '"><svg class="pt-m-ico" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO_M[ico] || "") + '</svg>' +
        '<small>' + etiqueta + '</small><b>' + num + '</b><span>' + linea1 + '</span><i>' + linea2 + '</i></div>';
    }
    var por = '<section class="pt-por pt-seg"><div class="pt-cab"><h2>' + TX("por_t") + '</h2></div><div class="pt-metricas pt-mb">' +
      metrica(TX("cal"), esc(p.nota), TX("cal1"), TX("cal2", puntos(p.resenas)), false, "estrella") +
      metrica(TX("pro"), pct + "&nbsp;%", TX("pro1"), TX("pro2", noches), true, "etiqueta") +
      metrica(TX("ate"), esc(TX("ate_n")), TX("ate1"), TX("ate2"), false, "reloj") +
      metrica(TX("sup"), TX("sup_n"), TX("sup1"), TX("sup2"), false, "medalla") + '</div></section>';
    // Orden (Hugo, 18-11-2026): Elige tu zona → Por qué elegir Zienna → Nuestros alojamientos → el resto igual.
    // Computadora: opción B de Hugo (18-11-2026), tarjeta crema con el texto debajo de la foto y botón negro.
    // En celular sigue la A (foto arriba, texto debajo, ver .pt-cel). ?zonas=a muestra la otra maqueta.
    var ZV = CEL ? "" : (/^[ab]$/.test(Q.get("zonas") || "") ? Q.get("zonas") : "b");
    var h = '<section class="pt-sec pt-prim"><div class="pt-cab"><h2>' + TX("z_t") + '</h2></div><div class="pt-zonas' + (ZV ? ' pt-zonas-' + ZV : '') + '">';
    ZONAS_WEB.forEach(function (z, iz) {
      var de = lista.filter(function (a) { return a.distrito === z.d; });
      if (!de.length) { return; }
      var pz = promedio(de), desde = Math.min.apply(null, de.map(function (a) { return a.desde; }));
      // La foto va en su propia capa: en computadora el texto queda encima; en celular (opción A de Hugo, 18-11-2026)
      // la foto queda arriba y el texto debajo, sin nada encima de la foto salvo las 2 etiquetas.
      h += '<a class="pt-z" target="_top" href="' + esc(LISTADO) + '"><span class="pt-z-img" style="background-image:url(\'' + esc(wixFoto(z.foto, 760, 1200)) + '\')">' +
        '<span class="pt-z-arr"><span class="pt-pill">' + TX("desde") + ' ' + desdeTachado(desde) + '</span>' + (pz.nota ? '<span class="pt-pill pt-pill-o">★ ' + esc(pz.nota) + ' · ' + puntos(pz.resenas) + ' ' + TX("resenas") + '</span>' : '') + '</span></span>' +
        '<span class="pt-z-ab"><b>' + esc(z.d) + '</b><span class="pt-z-f">' + esc(TX("zf")[iz] || z.frase) + '</span><span class="pt-z-ds">' + z.datos.map(function (t, j) { return '<span>' + esc(TX("zd")[iz * 2 + j] || t) + '</span>'; }).join("") + '</span>' +
        '<span class="pt-z-ver">' + (de.length === 1 ? TX("ver1") : TX("vern", de.length)) + '</span></span></a>';
    });
    h += '</div></section>' + por;
    // «Nuestros alojamientos», opción A de Hugo (19-11-2026): título más chico, una línea debajo y fichas de 3 líneas.
    var dists = [];
    lista.forEach(function (a) { if (a.distrito && dists.indexOf(a.distrito) < 0) { dists.push(a.distrito); } });
    var enDist = TX("y_") ? (dists.length > 1 ? dists.slice(0, -1).join(", ") + " " + TX("y_") + " " + dists[dists.length - 1] : dists.join("")) : dists.join("、");
    h += '<section class="pt-sec pt-alo"><div class="pt-cab"><div><h2>' + TX("alo_t") + '</h2>' + (dists.length ? '<p>' + esc(TX("alo_s", enDist)) + '</p>' : '') + '</div><a target="_top" href="' + esc(LISTADO) + '">' + TX("todos") + '</a></div><div class="pt-cards">';
    lista.forEach(function (a) {
      var t = String(a.titulo || a.nombre).split(" · "), nombre = (TX("tit") || {})[a.propiedad] || a.titulo_web || (t.length > 1 ? t.slice(1).join(" · ") : t[0]);
      var foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_1200,h_800");
      h += '<a class="pt-card" target="_top" href="' + esc(urlFicha(a)) + '"><span class="pt-img" style="background-image:url(\'' + esc(foto) + '\')"></span>' +
        '<span class="pt-c1"><b>' + esc(nombre) + '</b>' + (a.nota ? '<span>★ ' + esc(nota(a.nota)) + '</span>' : '') + '</span>' +
        '<span class="pt-c2">' + esc(a.distrito) + (a.resenas ? ' · ' + puntos(a.resenas) + ' ' + TX("resenas") : '') + '</span>' +
        '<span class="pt-c3">' + TX("desde") + ' ' + desdeTachado(a.desde) + ' ' + TX("noche") + '</span></a>';
    });
    h += '</div></section>';
    h += '<section class="pt-sec"><div class="pt-banda"><div><b>' + TX("b1", pct) + '</b><span>' + TX("b2", noches) + '</span></div>' +
      '<a target="_top" href="' + esc(LISTADO) + '">' + TX("b_btn") + '</a></div></section>';
    // «Para tu viaje» (opción A): en la portada propia sí; dentro del recuadro de Wix (modo=portada) no, porque su alto es fijo.
    if (MODO !== "portada") { h += '<div class="pt-sec">' + seccionServicios() + '</div>'; }
    h += '<section class="pt-sec pt-prop"><span class="pt-prop-f" style="background-image:url(\'' + ASSET + "gestion_propiedades" + FOTO_T + '\')"></span>' +
      '<div class="pt-prop-t"><small>' + TX("prop_s") + '</small><h2>' + TX("prop_h") + '</h2><p>' + TX("prop_p") + '</p>' +
      '<div class="pt-prop-b"><a class="pt-neg" target="_top" href="' + BASE + '/disponibilidad?modo=contacto&amp;motivo=administracion&amp;solo=1">' + TX("prop_b") + '</a><a class="pt-bor" target="_top" href="' + esc("https://registro.bookzienna.com/propietarios") + '">' + TX("mas") + '</a></div></div></section>';
    // Limpieza (propuesta 2 de Hugo, 17-11-2026): alternada, foto a la derecha en computadora. «Cotizar limpieza» abre el
    // formulario directo de limpieza (modo=contacto con el motivo fijo).
    h += '<section class="pt-sec pt-prop pt-prop-inv"><span class="pt-prop-f" style="background-image:url(\'' + ASSET + "servicio_limpieza" + FOTO_T + '\')"></span>' +
      '<div class="pt-prop-t"><small>' + TX("lim_s") + '</small><h2>' + TX("lim_h") + '</h2><p>' + TX("lim_p") + '</p>' +
      '<div class="pt-prop-b"><a class="pt-neg" target="_top" href="' + BASE + '/disponibilidad?modo=agenda">' + TX("lim_b") + '</a><a class="pt-bor" target="_top" href="' + esc("https://registro.bookzienna.com/limpieza") + '">' + TX("mas") + '</a></div></div></section>';
    return h;
  }
  function modoPortada() {
    var CEL = esCelular(6);
    var BASE = CEL ? 375 : 1181;
    var escalar = escaladoQueEntra(BASE);
    document.body.className += " pt-en pt-wix " + (CEL ? "pt-cel" : "pt-pc");
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
      // Recorrido por ambiente (Hugo, 19-11-2026): si las fotos traen su ambiente, se agrupan; si no, la lista de siempre.
      var orden = fotos.map(function (x, k) { return k; }), grupos = [];
      if ((f.ambientes || []).length && fotos.some(function (x) { return x.a; })) {
        f.ambientes.forEach(function (am) {
          var ks = []; fotos.forEach(function (x, k) { if (x.a === am[0]) { ks.push(k); } });
          if (ks.length) { grupos.push({ c: am[0], n: am[1], ks: ks }); }
        });
        orden = []; grupos.forEach(function (g) { orden = orden.concat(g.ks); });
        fotos.forEach(function (x, k) { if (orden.indexOf(k) < 0) { orden.push(k); } });
      }
      function fotoBtn(k, grande, lazy) {
        var x = fotos[k];
        return '<button type="button" class="gl-f' + (grande ? ' gl-f1' : '') + '" id="f' + (k + 1) + '" data-k="' + k + '" aria-label="Ver foto ' + (k + 1) + ' en grande">' +
          '<img src="' + esc(grande ? (x.s || x.m) : x.m) + '" alt="' + esc(x.a ? (grupos.filter(function (g) { return g.c === x.a; })[0] || {}).n || "Foto" : "Foto " + (k + 1)) + '"' + (lazy ? ' loading="lazy"' : '') + '></button>';
      }
      if (grupos.length) {
        h = h.replace(/<h1>Todas las fotos<\/h1>/, '<h1>Recorrido de fotos</h1>').replace('<p class="gl-sub">Todas las fotos · ', '<p class="gl-sub">Recorrido de fotos · ').replace(/<div class="gl-grid">$/, '');
        h += '<nav class="gl-amb">' + grupos.map(function (g) { return '<a href="#am-' + g.c + '"><span style="background-image:url(\'' + esc(fotos[g.ks[0]].m) + '\')"></span><b>' + esc(g.n) + '</b><small>' + g.ks.length + (g.ks.length === 1 ? ' foto' : ' fotos') + '</small></a>'; }).join("") + '</nav>';
        var nf = 0;
        grupos.forEach(function (g) {
          h += '<section class="gl-sec" id="am-' + g.c + '"><div class="gl-sec-t"><h2>' + esc(g.n) + '</h2><small>' + g.ks.length + (g.ks.length === 1 ? ' foto' : ' fotos') + '</small></div><div class="gl-grid">';
          g.ks.forEach(function (k, j) { h += fotoBtn(k, j % 3 === 0, nf++ > 2); });
          h += '</div></section>';
        });
        h += '<div>';
      } else {
        fotos.forEach(function (x, k) { h += fotoBtn(k, k % 3 === 0, k > 2); });
      }
      h += '</div><p class="gl-fin"><a href="' + esc(volver) + '">‹ Volver al alojamiento</a></p></div>' +
        '<div class="gl-v" id="gl-v" hidden><img id="gl-vi" alt="Foto en grande"><button type="button" class="gl-vx" aria-label="Cerrar">×</button>' +
        '<button type="button" class="gl-va" aria-label="Foto anterior">‹</button><button type="button" class="gl-vs" aria-label="Foto siguiente">›</button><span class="gl-vn" id="gl-vn"></span></div>';
      app.innerHTML = h;
      var i0 = 0, v = $("gl-v");
      function ver(i) { i0 = (i + orden.length) % orden.length; var x = fotos[orden[i0]]; $("gl-vi").src = x.g; $("gl-vn").textContent = (i0 + 1) + " / " + orden.length + (x.a && grupos.length ? " · " + ((grupos.filter(function (g) { return g.c === x.a; })[0] || {}).n || "") : ""); }
      function abrir(k) { v.hidden = false; document.body.style.overflow = "hidden"; ver(orden.indexOf(k)); }
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
      busq = { ll: ll, sa: sa, h: h >= 1 && h <= 4 ? h : 2, z: zonaValida(q.get("z")) };
      return ll && sa && q.get("paso") !== "fechas" ? "res" : "cal";
    }
    function cab() { if (marcoPaso("Alojamientos", volver, true)) { return ""; } return '<header class="ct-cab bu-cab"><a class="ct-volver" href="' + esc(volver) + '">‹ Volver</a><img src="' + ASSET + (PC ? 'zienna_logo_h.png' : 'zienna_logo.png') + '" alt="Zienna living &amp; aparts"></header>'; }
    function noches() { return busq.ll && busq.sa ? Math.round((new Date(busq.sa + "T12:00:00") - new Date(busq.ll + "T12:00:00")) / 864e5) : 0; }
    function hTxt(n) { return n + (n == 1 ? " huésped" : " huéspedes"); }
    // Distrito (Hugo, 19-11-2026: «en la búsqueda tenemos que poner también el distrito»).
    function chipsZona(id) { return '<div class="bu-zonas" id="' + id + '">' + [""].concat(DISTRITOS).map(function (z) { return '<button type="button" data-z="' + z + '"' + (z === (busq.z || "") ? ' class="on"' : '') + '>' + (z || "Todos los distritos") + '</button>'; }).join("") + '</div>'; }
    function ligarZona(id, alCambiar) {
      document.getElementById(id).addEventListener("click", function (ev) {
        var b = ev.target.closest("button[data-z]"); if (!b) { return; }
        busq.z = b.getAttribute("data-z");
        [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); });
        if (alCambiar) { alCambiar(); }
      });
    }
    function qz() { return busq.z ? "&z=" + encodeURIComponent(busq.z) : ""; }
    // Celular: 12 meses hacia abajo. Computadora: 2 meses a partir de `off`, con flechas.
    function mesesHTML() {
      var h = "", ym = sumaMes(hoy().slice(0, 7), PC ? off : 0), hoyF = hoy();
      for (var k = 0; k < (PC ? 2 : 12); k++, ym = sumaMes(ym, 1)) {
        var p = ym.split("-"), d1 = new Date(+p[0], +p[1] - 1, 1), dias = new Date(+p[0], +p[1], 0).getDate(), vacios = (d1.getDay() + 6) % 7;
        h += '<section class="bu-mes"><h3>' + mesTxt(ym) + '</h3>' + (PC ? '<div class="bu-dow bu-dowm">' + DIAS().map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' : '') + '<div class="bu-grid">';
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
      app.innerHTML = cab() + '<div class="bu"><h1>¿Cuándo viajas?</h1>' + chipsZona("bu-z") +
        '<div class="bu-sel"><div class="bu-c" id="bu-cll"><span>Llegada</span><b id="bu-ll"></b></div><div class="bu-c" id="bu-csa"><span>Salida</span><b id="bu-sa"></b></div></div>' +
        '<div class="bu-dow">' + DIAS().map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
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
        '<div class="bu-fila bu-fz"><span>Distrito</span><select id="bu-zs"><option value="">Todos los distritos</option>' + DISTRITOS.map(function (z) { return '<option' + (z === busq.z ? " selected" : "") + '>' + z + '</option>'; }).join("") + '</select></div>' +
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
      if (document.getElementById("bu-z")) { ligarZona("bu-z"); }
      if (document.getElementById("bu-zs")) { document.getElementById("bu-zs").addEventListener("change", function () { busq.z = zonaValida(this.value); }); }
      document.getElementById("bu-menos").addEventListener("click", function () { busq.h = Math.max(1, busq.h - 1); pintarSel(); });
      document.getElementById("bu-mas").addEventListener("click", function () { busq.h = Math.min(4, busq.h + 1); pintarSel(); });
      document.getElementById("bu-borrar").addEventListener("click", function () { busq.ll = ""; busq.sa = ""; document.getElementById("bu-meses").innerHTML = mesesHTML(); pintarSel(); });
      document.getElementById("bu-go").addEventListener("click", function () {
        if (!noches()) { return; }
        guardar();
        // Al volver atrás desde los resultados, el calendario conserva las fechas elegidas.
        history.replaceState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h + qz() + "&paso=fechas");
        history.pushState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h + qz());
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
        '<p class="bu-resumen">' + corto(busq.ll) + ' → ' + corto(busq.sa) + ' · ' + n + (n === 1 ? " noche" : " noches") + ' · ' + hTxt(busq.h) + '</p>' + chipsZona("bu-zr") + '<div id="bu-lista"><p class="bu-nota">Buscando…</p></div></div>';
      window.scrollTo(0, 0);
      document.getElementById("bu-cambiar").addEventListener("click", function (ev) {
        ev.preventDefault();
        // Si los resultados se abrieron directo desde la barra, «atrás» saldría de la página: ahí se reemplaza.
        if (empujado) { history.back(); }
        else { history.replaceState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h + qz() + "&paso=fechas"); pasoCal(); }
      });
      var ultimo = null;
      function pintarLista() {
        if (!ultimo || !document.getElementById("bu-lista")) { return; }
        var libres = ultimo.libres.filter(function (f) { return !busq.z || ultimo.porProp[f.propiedad].distrito === busq.z; });
        document.getElementById("bu-lista").innerHTML = libres.length ? libres.map(function (f) { return tarjeta(ultimo.porProp[f.propiedad], f); }).join("") :
          '<div class="bu-vacio"><p>No hay alojamientos libres del ' + corto(busq.ll) + ' al ' + corto(busq.sa) + (busq.z ? ' en ' + esc(busq.z) : '') + '. Prueba otras fechas' + (busq.z ? ' u otro distrito' : '') + '.</p></div>';  // sin botones cuando no hay nada libre (Hugo, 18-11-2026)
      }
      ligarZona("bu-zr", function () { history.replaceState({}, "", "/disponibilidad?modo=buscar&ll=" + busq.ll + "&sa=" + busq.sa + "&h=" + busq.h + qz()); pintarLista(); });
      var pedido = busq.ll + busq.sa + busq.h;
      Promise.all([lista ? Promise.resolve(lista) : llamar("alojamientos"), llamar("buscar", { llegada: busq.ll, salida: busq.sa, huespedes: busq.h })]).then(function (r) {
        if (pedido !== busq.ll + busq.sa + busq.h || !document.getElementById("bu-lista")) { return; }
        lista = r[0];
        var porProp = {}; lista.alojamientos.forEach(function (a) { porProp[a.propiedad] = a; });
        ultimo = { porProp: porProp, libres: r[1].resultados.filter(function (f) { return f.libre && porProp[f.propiedad]; }) };
        pintarLista();
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
  // Pastillas de idioma y moneda para todas las páginas (Hugo, 20-11-2026). <select> nativo encima de la pastilla, así la
  // lista sale bien también dentro de los recuadros de Wix. Los cambios los atiende el «change» de abajo.
  function selectoresLM(corto, soloMon) {
    var L = IDIOMAS.filter(function (x) { return x[0] === LANG; })[0] || IDIOMAS[0];
    var M = MONEDAS.filter(function (x) { return x[0] === MON; })[0] || MONEDAS[0];
    var h = soloMon ? "" : '<label class="hl-pas zsel" data-notr>' + GLOBO + '<span>' + (corto ? LANG.toUpperCase() : L[1]) + '</span><i>▾</i><select data-zsel="lang" aria-label="Idioma / Language">' +
      IDIOMAS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === LANG ? " selected" : "") + '>' + x[1] + '</option>'; }).join("") + '</select></label>';
    return h + '<label class="hl-pas zsel" data-notr><span>' + M[1] + " " + M[0] + '</span><i>▾</i><select data-zsel="mon" aria-label="Moneda / Currency">' +
      MONEDAS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === MON ? " selected" : "") + '>' + x[1] + " " + x[0] + '</option>'; }).join("") + '</select></label>';
  }
  function avisarMarcos() {
    try { var fr = window.top.frames; for (var i = 0; i < fr.length; i++) { if (fr[i] !== window) { fr[i].postMessage({ zmon: MON }, "*"); } } } catch (e) {}
  }
  document.addEventListener("change", function (ev) {
    var el = ev.target, k = el && el.getAttribute ? el.getAttribute("data-zsel") : "";
    if (!k) { return; }
    var v = el.value;
    if (k === "mon") { MON = monValida(v) || "PEN"; prefGuardar("zmon", MON); avisarMarcos(); }
    else { LANG = LANGS.indexOf(v) >= 0 ? v : "es"; prefGuardar("zlang", LANG); }
    if (MODO === "idioma") {
      if (k === "lang" && LANG !== "es") { window.top.location.href = FIJAS + "/inicio/?lang=" + LANG + (MON !== "PEN" ? "&mon=" + MON : ""); return; }
      modoIdioma(); return;
    }
    var u = new URL(location.href); u.searchParams.set(k, k === "mon" ? MON : LANG);
    location.href = u.toString();
  });
  // Otro recuadro (la pastilla de la cabecera de Wix) cambió la moneda: se repinta con la nueva.
  window.addEventListener("message", function (ev) {
    var d = ev.data, ok = false;
    try { ok = /(^|\.)bookzienna\.com$/.test(new URL(ev.origin).hostname) || ev.origin === location.origin; } catch (e) { ok = false; }
    if (!ok || !d || !d.zmon || !monValida(d.zmon) || d.zmon === MON || MODO === "idioma") { return; }
    prefGuardar("zmon", d.zmon);
    var u = new URL(location.href); u.searchParams.set("mon", d.zmon); location.replace(u.toString());
  });
  // Los enlaces entre páginas de Zienna llevan el idioma y la moneda. La portada de Wix solo existe en español: en otro
  // idioma se va a la portada propia traducida; lo mismo el contacto de Wix.
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) { return; }
    var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (!/(^|\.)bookzienna\.com$/.test(u.hostname) && u.origin !== location.origin) { return; }
    if (LANG !== "es" && /^(www\.)?bookzienna\.com$/.test(u.hostname)) {
      if (u.pathname === "/" || u.pathname === "") { u = new URL(FIJAS + "/inicio/"); }
      else if (u.pathname === "/contacto") { u = new URL(RAPIDA + "/disponibilidad?modo=contacto"); }
    }
    if (/^(www\.)?bookzienna\.com$/.test(u.hostname)) { if (LANG !== "es") { u.searchParams.set("lang", LANG); } }
    else { u.searchParams.set("lang", LANG); u.searchParams.set("mon", MON); }
    a.href = u.toString();
  }, true);
  function marcoWeb(CEL, actual, extra) {
    extra = extra || selectoresLM(CEL);
    var M = [["Home", WEB + "/"], ["Alojamientos", LISTADO], ["Para Propietarios", RAPIDA + "/propietarios"], ["Limpieza", RAPIDA + "/limpieza"]];
    var NV = (PORTADA_T[LANG] || PORTADA_T.es).nav, RES = (PORTADA_T[LANG] || PORTADA_T.es).res;
    var links = M.map(function (x, k) { return '<a href="' + x[1] + '"' + (x[0] === actual ? ' class="on"' : '') + '>' + NV[k] + '</a>'; }).join("");
    var cab = '<header class="zw-cab' + (CEL ? " zw-cel zw-cab-b" : "") + '"><a class="zw-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_h.png" alt="Zienna Living & Aparts"></a>' +
      (CEL ? favLink(true) + '<button type="button" class="zw-menu" id="zw-menu" aria-label="Abrir menú" aria-expanded="false"><i></i><i></i><i></i></button>' +
        '<nav class="zw-nav-cel" id="zw-nav"><div class="zw-nav-pref">' + extra + '</div>' + links + '<a class="zw-res" href="' + LISTADO + '">' + RES + '</a></nav>' :
        '<nav class="zw-nav">' + links + '</nav>' + extra + favLink(false) + '<a class="zw-res" href="' + LISTADO + '">' + RES + '</a>') + '</header>';
    var pie = '<footer class="zw-pie' + (CEL ? " zw-cel" : "") + '"><div class="zw-pie-g">' +
      '<a class="zw-pie-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_blanco.png" alt="Zienna"></a>' +
      '<div><b>' + TX("f_con") + '</b><a href="' + WEB + '/contacto">info@bookzienna.com</a><a href="' + WEB + '/contacto">' + TX("f_form") + '</a><span>' + TX("f_lima") + '</span></div>' +
      '<div><b>' + TX("f_red") + '</b><span class="zw-redes"><a class="zw-ig" href="https://www.instagram.com/bookzienna/" target="_blank" rel="noopener" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a><a class="zw-ig" href="https://www.facebook.com/p/Zienna-Living-Aparts-61594152062887/" target="_blank" rel="noopener" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z"/></svg></a><a class="zw-ig" href="https://www.tiktok.com/@bookzienna" target="_blank" rel="noopener" aria-label="TikTok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 3 2.5 4.5 5 4.5"/></svg></a></span></div>' +
      '<div><b>' + TX("f_leg") + '</b><p><a href="' + WEB + '/politica-de-privacidad">' + TX("f_priv") + '</a> • <a href="' + WEB + '/terminos-y-condiciones">' + TX("f_cond") + '</a> • <a href="' + WEB + '/politica-de-cookies">' + TX("f_cook") + '</a></p>' +
        '<a class="zw-lr" href="' + RAPIDA + '/libro-de-reclamaciones"><img src="' + ASSET + 'libro_reclamaciones_indecopi.webp" width="72" height="58" alt="Libro de Reclamaciones" title="Libro de Reclamaciones" loading="lazy"></a></div>' +
      '</div><i class="zw-pie-l"></i><small>© ' + new Date().getFullYear() + ' ZIENNA LIVING & APARTS. ' + TX("f_der") + '</small></footer>';
    if (CEL) {
      pie = '<footer class="zw-pie zw-cel zw-pie3"><div class="zw-p3-f1"><a class="zw-pie-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_h_blanco.png" alt="Zienna"></a>' +
        '<a class="zw-lr" href="' + RAPIDA + '/libro-de-reclamaciones"><img src="' + ASSET + 'libro_reclamaciones_indecopi.webp" width="72" height="58" alt="Libro de Reclamaciones" title="Libro de Reclamaciones" loading="lazy"></a></div>' +
        '<div class="zw-p3-c"><div><b>' + TX("f_con") + '</b><a href="mailto:info@bookzienna.com">' + TX("f_mail") + '</a><a href="' + WEB + '/contacto">' + TX("f_form2") + '</a><span>' + TX("f_lima") + '</span></div>' +
        '<div><b>' + TX("f_leg2") + '</b><a href="' + WEB + '/politica-de-privacidad">' + TX("f_priv") + '</a><a href="' + WEB + '/terminos-y-condiciones">' + TX("f_cond") + '</a><a href="' + WEB + '/politica-de-cookies">' + TX("f_cook") + '</a></div>' +
        '<div><b>' + TX("f_red2") + '</b>' + '<span class="zw-redes"><a class="zw-ig" href="https://www.instagram.com/bookzienna/" target="_blank" rel="noopener" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a><a class="zw-ig" href="https://www.facebook.com/p/Zienna-Living-Aparts-61594152062887/" target="_blank" rel="noopener" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z"/></svg></a><a class="zw-ig" href="https://www.tiktok.com/@bookzienna" target="_blank" rel="noopener" aria-label="TikTok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 3 2.5 4.5 5 4.5"/></svg></a></span>' + '</div></div>' +
        '<small>© ' + new Date().getFullYear() + ' Zienna Living & Aparts. ' + TX("f_der") + '</small></footer>';
    }
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
  // Píxel de TikTok «Zienna Web» (Business Center «Zienna | Living & Aparts»). Mismos eventos y mismas reglas que Meta.
  var PIXEL_TT = "DBVLD4BC77UCDH70UTM0", TTQ = null;
  var TT_EV = { ViewContent: "ViewContent", Search: "Search", InitiateCheckout: "InitiateCheckout", Lead: "SubmitForm", Contact: "Contact", AddToWishlist: "AddToWishlist" };
  if (!DENTRO && !PRUEBA) {
    try {
      (function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
        for (var i = 0; i < ttq.methods.length; i++) { ttq.setAndDefer(ttq, ttq.methods[i]); }
        ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) { ttq.setAndDefer(e, ttq.methods[n]); } return e; };
        ttq.load = function (e, n) {
          var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner;
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {};
          n = d.createElement("script"); n.type = "text/javascript"; n.async = !0; n.src = r + "?sdkid=" + e + "&lib=" + t;
          e = d.getElementsByTagName("script")[0]; e.parentNode.insertBefore(n, e);
        };
        ttq.load(PIXEL_TT); ttq.page();
      })(window, document, "ttq");
      TTQ = window.ttq;
    } catch (e) { TTQ = null; }
  }
  // m: datos solo para Meta (valor de la solicitud), que el PMS no necesita.
  function meta(e, x, m) {
    if (!FBQ && !TTQ) { return; }
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
      if (FBQ) { FBQ("track", nombre, d); }
      if (TTQ && TT_EV[nombre]) {
        var t = { content_type: "product", content_category: d.content_category };
        if (x.p) { t.content_id = x.p; t.contents = [{ content_id: x.p, content_type: "product" }]; }
        if (d.value != null) { t.value = d.value; t.currency = d.currency || "PEN"; }
        TTQ.track(TT_EV[nombre], t);
      }
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
    return '<a class="zw-fav' + (cel ? ' zw-fav-cel' : '') + '" href="' + RAPIDA + '/favoritos" aria-label="Tus favoritos">' + SVG_CORAZON + (cel ? '' : '<span>' + TX("fav") + '</span>') + '<b' + (n ? '' : ' hidden') + '>' + n + '</b></a>';
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
    APP.innerHTML = mw.cab + '<div class="fi"><div id="fi-det"></div>' + mapa + '<div class="fi-sv">' + seccionServicios() + '</div><div id="fi-cie"></div></div>' + mw.pie + (CEL ? '<div class="fi-bf" id="fi-bf"></div>' : '');
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
  // Filtros de Alojamientos (Hugo, 19-11-2026: opción B, lista + mapa como Airbnb). Piscina no va: la tienen todos.
  // Servicios (Hugo, 19-11-2026): traslado al aeropuerto y eSIM Holafly. Mismos precios que TRASLADOS/ESIM del servidor.
  var TRASLADOS = [["Ida", 90], ["Vuelta", 90], ["Ida y vuelta", 170]];
  var ESIM = { codigo: "GENNERSILVA", pct: 5, url: "https://esim.holafly.com/es/" };
  var SVG_SRV = {
    auto: '<path d="M4 16v-4l2-5h12l2 5v4"/><path d="M4 12h16"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>',
    sim: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9 7h6v6H9z"/><path d="M12 17h.01"/>',
    check: '<path d="M5 12.5 10 17l9-10"/>'
  };
  function icoSrv(k, n) { return '<svg width="' + (n || 26) + '" height="' + (n || 26) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SVG_SRV[k] + '</svg>'; }
  // Opción A: sección «Para tu viaje» (portada propia y fichas). Textos con TX() (10 idiomas en la portada).
  function seccionServicios() {
    var waT = "https://wa.me/" + WA + "?text=" + encodeURIComponent(TX("sv_wa"));
    return '<section class="sv"><span class="sv-e">' + TX("sv_e") + '</span><h2>' + TX("sv_t") + '</h2><p class="sv-sub">' + TX("sv_sub") + '</p><div class="sv-g">' +
      '<div class="sv-k"><div class="sv-i">' + icoSrv("auto", 28) + '</div><h3>' + TX("sv_tr") + '</h3><p>' + TX("sv_trp") + '</p>' +
      '<div class="sv-pr"><span>' + TX("sv_ida") + '<b>' + soles(90) + '</b></span><span>' + TX("sv_vue") + '<b>' + soles(90) + '</b></span><span class="sv-dest"><em>' + TX("sv_aho") + '</em>' + TX("sv_iv") + '<b>' + soles(170) + '</b></span></div>' +
      '<a class="sv-btn sv-wa" href="' + esc(waT) + '" target="_blank" rel="noopener">' + TX("sv_trb") + '</a></div>' +
      '<div class="sv-k"><div class="sv-i">' + icoSrv("sim", 28) + '</div><h3>' + TX("sv_es") + '</h3><p>' + TX("sv_esp") + '</p>' +
      '<ul class="sv-li"><li>' + icoSrv("check", 16) + TX("sv_es1") + '</li><li>' + icoSrv("check", 16) + TX("sv_es2") + '</li></ul>' +
      '<span class="sv-code">' + ESIM.codigo + ' <small>' + TX("sv_desc") + '</small></span><a class="sv-btn sv-o" href="' + ESIM.url + '" target="_blank" rel="noopener">' + TX("sv_esb") + '</a></div></div></section>';
  }
  // «Beneficios y experiencias» (Hugo, 19-11-2026, opción A): adonde llega el huésped al terminar su registro.
  // Traslado al aeropuerto y eSIM Holafly en dos tarjetas con foto (fotos CC0 de StockSnap). Idioma con ?lang= (10 idiomas).
  function modoBeneficios() {
    var lang = (Q.get("lang") || "").toLowerCase();
    if (!I18N[lang]) { lang = prefLeer("zlang"); }
    if (!I18N[lang]) { lang = String(navigator.language || "es").slice(0, 2).toLowerCase(); }
    LANG = I18N[lang] ? lang : "es";
    document.documentElement.lang = LANG;
    document.body.className += " ben-en";
    letraZienna();
    var waT = "https://wa.me/" + WA + "?text=" + encodeURIComponent(TX("sv_wa"));
    var pr = '<div class="ben-pr"><span>' + TX("sv_ida") + '<b>' + soles(90) + '</b></span><span>' + TX("sv_vue") + '<b>' + soles(90) + '</b></span><span>' + TX("sv_iv") + '<b>' + soles(170) + '</b></span></div>';
    app.innerHTML = '<div class="ben"><a class="ben-logo" href="' + WEB + '/"><img src="' + ASSET + 'zienna_logo_h.png" alt="Zienna Living & Aparts"></a>' +
      '<div class="ben-cab"><span class="ben-ok">✓ ' + TX("bn_ok") + '</span><h1>' + TX("bn_t") + '</h1><p>' + TX("bn_sub") + '</p></div><div class="ben-g">' +
      '<div class="ben-c"><span class="ben-f" style="background-image:url(\'' + ASSET + 'beneficios_aeropuerto.jpg\')"></span><div class="ben-cu"><span class="ben-e">' + TX("bn_e1") + '</span>' +
      '<h2>' + TX("bn_h1") + '</h2><p>' + TX("sv_trp") + '</p>' + pr + '<a class="ben-btn ben-neg" href="' + esc(waT) + '" target="_blank" rel="noopener">' + TX("sv_trb") + '</a></div></div>' +
      '<div class="ben-c"><span class="ben-f" style="background-image:url(\'' + ASSET + 'beneficios_celular.jpg\')"></span><div class="ben-cu"><span class="ben-e">' + TX("bn_e2") + '</span>' +
      '<h2>' + TX("bn_h2") + '</h2><p>' + TX("sv_esp") + '</p><span class="ben-cod">' + ESIM.codigo + ' <small>' + TX("sv_desc") + '</small><button type="button" id="ben-copiar">' + TX("bn_cop") + '</button></span>' +
      '<a class="ben-btn ben-bor" href="' + ESIM.url + '" target="_blank" rel="noopener">' + TX("sv_esb") + '</a></div></div></div>' +
      '<a class="ben-ir" href="' + WEB + '/">' + TX("bn_ir") + ' →</a></div>';
    var b = document.getElementById("ben-copiar");
    b.addEventListener("click", function () {
      var ok = function () { b.textContent = TX("bn_copd"); setTimeout(function () { b.textContent = TX("bn_cop"); }, 1800); };
      if (navigator.clipboard) { navigator.clipboard.writeText(ESIM.codigo).then(ok, ok); } else { ok(); }
    });
  }
  // Pastilla de idiomas + Contacto para la cabecera de Wix (Hugo, 19-11-2026: «no veo nada del contacto ni de los idiomas»).
  // Va en un «Elemento HTML» chico; la lista es un <select> nativo para que se abra fuera del recuadro. Español se queda
  // en Wix; otro idioma lleva a la misma portada traducida (web.bookzienna.com/inicio/?lang=xx). ?cel=1 = solo el código.
  function modoIdioma() {
    var tel = window.screen && screen.width < 760;
    document.documentElement.style.background = "transparent";
    if (document.body.className.indexOf("hl-en") < 0) { document.body.className += " hl-en" + (tel ? " hl-tel" : ""); }
    if (!document.getElementById("hl-jost")) { var fj = document.createElement("link"); fj.id = "hl-jost"; fj.rel = "stylesheet"; fj.href = "https://fonts.googleapis.com/css2?family=Jost:wght@400;500&display=swap"; document.head.appendChild(fj); }
    var con = { es: "Contacto", en: "Contact", pt: "Contato", fr: "Contact", de: "Kontakt", it: "Contatti", zh: "联系", ja: "お問い合わせ", ko: "문의", ru: "Контакты" }[LANG] || "Contacto";
    app.innerHTML = '<div class="hl">' + selectoresLM(!tel) + '<a class="hl-con" target="_top" href="' + RAPIDA + '/disponibilidad?modo=contacto' + (LANG !== "es" ? "&lang=" + LANG : "") + '">' + con + '</a></div>';
    avisarMarcos();
  }
  var DISTRITOS = ["San Miguel", "San Isidro", "Lince"];
  function zonaValida(z) { return DISTRITOS.indexOf(z || "") >= 0 ? z : ""; }
  var COMODIDADES = {
    mar: { t: "Vista al mar", p: ["SM1006", "SM310", "SI2105"] },
    cochera: { t: "Cochera", p: ["SI2105", "SI502", "LINCE1504", "LINCE902", "LINCE902A", "LINCE902B"] },
    lavadora: { t: "Lavadora", p: ["SM310", "SM1006", "SI502", "LINCE1504"] }
  };
  // En el mapa, Lince 902 y Lince 1504 están en el mismo edificio: se separa un poco el pin para que se vean los dos.
  var PIN_DESPLAZA = { LINCE902: [0.0016, -0.0012] };
  function cargarLeaflet(listo) {
    if (window.L) { listo(); return; }
    var c = document.createElement("link"); c.rel = "stylesheet"; c.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(c);
    var j = document.createElement("script"); j.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; j.onload = listo; document.head.appendChild(j);
  }
  var LUPA = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var AJUSTES = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
  var MAPA_ICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>';
  var LISTA_ICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
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
      // Celular, opción A de Hugo (20-11-2026): una pastilla con el resumen + botón de filtros; los filtros van en una hoja.
      (CEL ? '<div class="la-resfila"><a class="la-res" id="la-res" href="' + esc(urlBuscar("fechas")) + '"><i aria-hidden="true">' + LUPA + '</i><span><b id="la-res-z"></b><small id="la-res-d"></small></span></a>' +
        '<button type="button" class="la-fil" id="la-fil" aria-label="Filtros">' + AJUSTES + '<em id="la-fil-n" hidden></em></button></div>' +
        '<div class="la-hoja" id="la-hoja" hidden><div class="la-hoja-c"><div class="la-hoja-cab"><b>Filtros</b><button type="button" id="la-hoja-x" aria-label="Cerrar">✕</button></div>' : '') +
      '<div class="la-chips" id="la-chips">' + (CEL ? '<h4 class="la-h4">DISTRITO</h4>' : '') + ["", "San Miguel", "San Isidro", "Lince"].map(function (z) { return '<button type="button" data-z="' + z + '"' + (z === zona ? ' class="on"' : '') + '>' + (z || "Todas") + '</button>'; }).join("") +
        '<span class="la-sep"></span>' + (CEL ? '<h4 class="la-h4">PRECIO POR NOCHE</h4>' : '') + '<span class="la-pr-c"><button type="button" id="la-pr">Precio ▾</button><span class="la-pop" id="la-pop" hidden><small>PRECIO POR NOCHE (S/)</small><span class="la-pop-i"><label>Mínimo<input id="la-min" type="number" inputmode="numeric" min="0" step="10" placeholder="0"></label><label>Máximo<input id="la-max" type="number" inputmode="numeric" min="0" step="10" placeholder="Sin tope"></label></span>' +
        '<span class="la-pop-b"><button type="button" id="la-pr-q">Quitar</button><button type="button" id="la-pr-ok">Aplicar</button></span></span></span>' +
        (CEL ? '<h4 class="la-h4">COMODIDADES</h4>' : '') + Object.keys(COMODIDADES).map(function (k) { return '<button type="button" data-c="' + k + '">' + COMODIDADES[k].t + '</button>'; }).join("") +
        '<button type="button" data-c="cuatro">Para 4 huéspedes</button></div>' +
        (CEL ? '<div class="la-hoja-pie"><button type="button" id="la-hoja-borrar">Borrar todo</button><button type="button" id="la-hoja-ver"></button></div></div></div>' +
          '<button type="button" class="la-vmap" id="la-vmap" data-v="mapa">' + MAPA_ICO + '<span>Mapa</span></button>' : '') + '</section>' +
        '<p class="la-cnt" id="la-cnt"></p><div class="la-split' + (CEL ? '' : ' la-split-pc') + '" id="la-split"><div class="la-g" id="la-g"><p class="la-vacio">Cargando…</p></div>' +
        '<div class="la-mapa" id="la-mapa"' + (CEL ? ' hidden' : '') + '><div id="la-m"></div><a class="la-flot" id="la-flot" hidden></a></div></div>' +
      '<section class="la-banda"><div><b id="la-bt">Reserva directo y paga 20\u00a0% menos</b><span id="la-bs">Promoción exclusiva a partir de 2 noches.</span></div><a href="' + esc(urlBuscar("fechas")) + '">Ver fechas libres</a></section></div>' + mw.pie;
    ligarMarco();
    anchoPC(".la");
    function tarjeta(a) {
      var f = res && res[a.propiedad], foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_900,h_675");
      var pill = f && f.libre ? precioTachado(f) + " · " + f.noches + (f.noches === 1 ? " noche" : " noches") : "Desde " + desdeTachado(a.desde) + " noche";
      return '<a class="la-c" data-p="' + esc(a.propiedad) + '" href="' + esc(urlFicha(a)) + '"><span class="la-f" style="background-image:url(\'' + esc(foto) + '\')"><span class="la-pills"><span class="la-pill">' + pill + '</span>' +
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
      var xs = lista.filter(function (a) { return (!zona || a.distrito === zona) && (!conFechas() || (res[a.propiedad] && res[a.propiedad].libre)) && pasaFiltros(a); });
      xs.sort(function (x, y) { var i1 = ORDEN.indexOf(x.propiedad), i2 = ORDEN.indexOf(y.propiedad); return (i1 < 0 ? 99 : i1) - (i2 < 0 ? 99 : i2); });
      var hayFiltros = Object.keys(filtros).length || precioMin || precioMax;
      document.getElementById("la-g").innerHTML = xs.length ? xs.map(tarjeta).join("") :
        '<p class="la-vacio">' + (hayFiltros ? "Ningún alojamiento cumple esos filtros. Quita alguno para ver más." : conFechas() ? "No hay alojamientos libres del " + corto(busq.ll) + " al " + corto(busq.sa) + (zona ? " en " + esc(zona) : "") + ". Prueba otras fechas." : "No hay alojamientos en esta zona.") + '</p>';
      document.getElementById("la-cnt").innerHTML = xs.length ? '<b>' + xs.length + (xs.length === 1 ? ' alojamiento' : ' alojamientos') + '</b>' + (zona ? ' en ' + esc(zona) : '') : '';
      visibles = xs;
      if (CEL) {
        document.getElementById("la-res-z").textContent = zona || "Todos los distritos";
        document.getElementById("la-res-d").textContent = (conFechas() ? corto(busq.ll) + " – " + corto(busq.sa) : "Elige tus fechas") + " · " + h + (h === 1 ? " huésped" : " huéspedes");
        document.getElementById("la-res").href = urlBuscar("fechas");
        var nf = (zona ? 1 : 0) + Object.keys(filtros).length + (precioMin || precioMax ? 1 : 0), en = document.getElementById("la-fil-n");
        en.textContent = nf; en.hidden = !nf;
        document.getElementById("la-hoja-ver").textContent = xs.length === 1 ? "Ver 1 alojamiento" : "Ver " + xs.length + " alojamientos";
      }
      pintarMapa();
    }
    // ── filtros ──
    var filtros = {}, precioMin = 0, precioMax = 0, visibles = [], mapa = null, capa = null, marcas = {};
    function precioNoche(a) {
      var f = res && res[a.propiedad];
      return f && f.libre && f.noches ? Math.round(f.total / f.noches) : Math.round(a.desde * (100 - DZ.pct) / 100);
    }
    function pasaFiltros(a) {
      for (var k in filtros) {
        if (k === "cuatro") { if ((+a.capacidad || 2) < 4) { return false; } }
        else if (COMODIDADES[k] && COMODIDADES[k].p.indexOf(a.propiedad) < 0) { return false; }
      }
      var pn = precioNoche(a);
      return (!precioMin || pn >= precioMin) && (!precioMax || pn <= precioMax);
    }
    function textoPin(a) { var f = res && res[a.propiedad]; return f && f.libre ? soles(f.total) : soles(Math.round(a.desde * (100 - DZ.pct) / 100)); }
    function pintarMapa() {
      var caja = document.getElementById("la-mapa");
      if (!caja || caja.hidden || !visibles) { return; }
      cargarLeaflet(function () {
        if (!mapa) {
          mapa = L.map("la-m", { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapa);
          capa = L.layerGroup().addTo(mapa);
        }
        capa.clearLayers(); marcas = {};
        var pts = [];
        visibles.forEach(function (a) {
          var c = MAPAS[a.propiedad]; if (!c) { return; }
          var d = PIN_DESPLAZA[a.propiedad] || [0, 0], ll = [c[0] + d[0], c[1] + d[1]];
          var m = L.marker(ll, { icon: L.divIcon({ className: "la-pin-c", html: '<span class="la-pin" data-p="' + esc(a.propiedad) + '">' + textoPin(a) + '</span>', iconSize: null }) });
          m.on("click", function () { elegirPin(a); });
          m.addTo(capa); marcas[a.propiedad] = m; pts.push(ll);
        });
        setTimeout(function () { mapa.invalidateSize(); if (pts.length) { mapa.fitBounds(pts, { padding: [50, 50], maxZoom: 15 }); } else { mapa.setView([-12.093, -77.066], 13); } }, 60);
      });
    }
    function marcarPin(p, on) { var el = document.querySelector('.la-pin[data-p="' + p + '"]'); if (el) { el.classList.toggle("on", on); } }
    function elegirPin(a) {
      [].forEach.call(document.querySelectorAll(".la-pin.on"), function (x) { x.classList.remove("on"); });
      marcarPin(a.propiedad, true);
      if (CEL) {
        var fl = document.getElementById("la-flot"), foto = String(a.foto || "").replace(/\/v1\/fill\/w_\d+,h_\d+/, "/v1/fill/w_300,h_300");
        fl.href = urlFicha(a); fl.hidden = false;
        fl.innerHTML = '<span class="la-flot-f" style="background-image:url(\'' + esc(foto) + '\')"></span><span><b>' + esc(a.titulo_web || a.nombre) + '</b><small>' + esc(a.distrito) + (a.nota ? ' · ★ ' + esc(nota(a.nota)) : '') + '</small><em>' + textoPin(a) + (res && res[a.propiedad] && res[a.propiedad].libre ? ' en total' : ' noche') + '</em></span>';
      } else {
        var card = document.querySelector('.la-c[data-p="' + a.propiedad + '"]');
        if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.add("la-c-on"); setTimeout(function () { card.classList.remove("la-c-on"); }, 1600); }
      }
    }
    document.getElementById("la-g").addEventListener("mouseover", function (ev) { var c = ev.target.closest(".la-c"); if (c) { marcarPin(c.getAttribute("data-p"), true); } });
    document.getElementById("la-g").addEventListener("mouseout", function (ev) { var c = ev.target.closest(".la-c"); if (c) { marcarPin(c.getAttribute("data-p"), false); } });
    document.getElementById("la-chips").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-c]"); if (!b) { return; }
      var k = b.getAttribute("data-c");
      if (filtros[k]) { delete filtros[k]; } else { filtros[k] = 1; }
      b.classList.toggle("on", !!filtros[k]);
      pintar();
    });
    function cerrarPop() { document.getElementById("la-pop").hidden = true; }
    document.getElementById("la-pr").addEventListener("click", function (ev) { ev.stopPropagation(); var pp = document.getElementById("la-pop"); pp.hidden = !pp.hidden; });
    document.getElementById("la-pop").addEventListener("click", function (ev) { ev.stopPropagation(); });
    document.addEventListener("click", cerrarPop);
    function textoPrecio() {
      var b = document.getElementById("la-pr");
      b.textContent = precioMin || precioMax ? "Precio · " + (precioMin ? "S/ " + precioMin : "S/ 0") + "–" + (precioMax ? precioMax : "más") + " ▾" : "Precio ▾";
      b.classList.toggle("on", !!(precioMin || precioMax));
    }
    document.getElementById("la-pr-ok").addEventListener("click", function () {
      precioMin = Math.max(0, parseInt(document.getElementById("la-min").value, 10) || 0);
      precioMax = Math.max(0, parseInt(document.getElementById("la-max").value, 10) || 0);
      if (precioMax && precioMin > precioMax) { var t = precioMin; precioMin = precioMax; precioMax = t; }
      textoPrecio(); cerrarPop(); pintar();
    });
    document.getElementById("la-pr-q").addEventListener("click", function () {
      precioMin = precioMax = 0; document.getElementById("la-min").value = ""; document.getElementById("la-max").value = "";
      textoPrecio(); cerrarPop(); pintar();
    });
    if (CEL) {
      // El pie nuevo es bajo (20-11-2026): el botón flotante Mapa tapaba sus enlaces; se esconde cuando el pie está a la vista.
      var pieLa = document.querySelector("footer.zw-pie");
      if (pieLa && window.IntersectionObserver) {
        new IntersectionObserver(function (e) { document.body.classList.toggle("la-pie-vista", e[0].isIntersecting); }).observe(pieLa);
      }
      document.getElementById("la-vmap").addEventListener("click", function () {
        var mp = this.getAttribute("data-v") === "mapa";
        this.setAttribute("data-v", mp ? "lista" : "mapa");
        this.innerHTML = mp ? LISTA_ICO + "<span>Lista</span>" : MAPA_ICO + "<span>Mapa</span>";
        document.getElementById("la-g").hidden = mp; document.getElementById("la-mapa").hidden = !mp;
        if (!mp) { document.getElementById("la-flot").hidden = true; }
        window.scrollTo(0, 0); pintarMapa();
      });
      var hoja = document.getElementById("la-hoja");
      var abrirHoja = function (si) { hoja.hidden = !si; document.body.classList.toggle("la-sin-scroll", si); };
      document.getElementById("la-fil").addEventListener("click", function () { abrirHoja(true); });
      document.getElementById("la-hoja-x").addEventListener("click", function () { abrirHoja(false); });
      document.getElementById("la-hoja-ver").addEventListener("click", function () { abrirHoja(false); window.scrollTo(0, 0); });
      hoja.addEventListener("click", function (ev) { if (ev.target === hoja) { abrirHoja(false); } });
      document.getElementById("la-hoja-borrar").addEventListener("click", function () {
        zona = ""; filtros = {}; precioMin = precioMax = 0;
        document.getElementById("la-min").value = ""; document.getElementById("la-max").value = "";
        [].forEach.call(document.querySelectorAll("#la-chips button[data-z], #la-chips button[data-c]"), function (x) { x.classList.toggle("on", x.getAttribute("data-z") === ""); });
        textoPrecio(); pintar();
      });
    }
    document.getElementById("la-chips").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-z]"); if (!b) { return; }
      zona = b.getAttribute("data-z");
      [].forEach.call(this.querySelectorAll("button[data-z]"), function (x) { x.classList.toggle("on", x === b); });
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

  // ───────── Portada propia: fotos de la parte de arriba (donde irá el video), en este orden ─────────
  // La primera es la de siempre de la portada de Wix: la piscina de SM 310, retocada, con su punto de encuadre (Hugo, 19-11).
  var PORTADA_FOTOS = [
    ["d58443_4cceab64493941d9bef86efbe4cf3d4d~mv2.png", "SM310", "0.51_0.76"], ["b4147d_6cadcd4b83ef46659e5318c6e31b3c72~mv2.jpeg", "SM1006"],
    ["d58443_c497c759fbc54183b6f4c4445e5d263e~mv2.jpg", "SI2105"], ["b4147d_d18a8a9007524776a9cc422714918d40~mv2.jpeg", "SM1006"],
    ["b4147d_7617ffe95430420e97fb4bbaac7a1ac0~mv2.jpeg", "SM1006"], ["b4147d_c2df8fcba89f4feca5d07781c423e4a1~mv2.png", "LINCE1504"],
    ["b4147d_9b8f57dd925f4913a442f0b5b72829f9~mv2.jpeg", "SI502"]];
  // Idiomas de la pastilla (Hugo, 19-11-2026: «10 idiomas principales, como una pastilla para cambiar»). Por ahora
  // cambian la parte de arriba de la portada y el menú; el resto de la página sigue en español.
  var IDIOMAS = [["es", "Español"], ["en", "English"], ["pt", "Português"], ["fr", "Français"], ["de", "Deutsch"], ["it", "Italiano"],
    ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"], ["ru", "Русский"]];
  // t1/t2 título y bajada · ll/sa/hu/elige/buscar caja de fechas · hs huésped(es) · nav menú · con Contacto · res Reservar
  var PORTADA_T = {
    es: { dis: "Distrito", todos: "Todos los distritos", t1: "Comodidad y sofisticación", t2: "Tu estancia, pensada para disfrutar.", ll: "Llegada", sa: "Salida", hu: "Huéspedes", elige: "Elige tu fecha", buscar: "Buscar", hs: ["huésped", "huéspedes"], nav: ["Home", "Alojamientos", "Para Propietarios", "Limpieza"], con: "Contacto", res: "Reservar" },
    en: { dis: "Area", todos: "All areas", t1: "Comfort and sophistication", t2: "Your stay, designed to be enjoyed.", ll: "Check-in", sa: "Check-out", hu: "Guests", elige: "Choose a date", buscar: "Search", hs: ["guest", "guests"], nav: ["Home", "Stays", "Property owners", "Cleaning"], con: "Contact", res: "Book now" },
    pt: { dis: "Bairro", todos: "Todos os bairros", t1: "Conforto e sofisticação", t2: "Sua estadia, pensada para aproveitar.", ll: "Chegada", sa: "Saída", hu: "Hóspedes", elige: "Escolha a data", buscar: "Buscar", hs: ["hóspede", "hóspedes"], nav: ["Início", "Hospedagens", "Proprietários", "Limpeza"], con: "Contato", res: "Reservar" },
    fr: { dis: "Quartier", todos: "Tous les quartiers", t1: "Confort et raffinement", t2: "Votre séjour, pensé pour en profiter.", ll: "Arrivée", sa: "Départ", hu: "Voyageurs", elige: "Choisir une date", buscar: "Rechercher", hs: ["voyageur", "voyageurs"], nav: ["Accueil", "Logements", "Propriétaires", "Ménage"], con: "Contact", res: "Réserver" },
    de: { dis: "Viertel", todos: "Alle Viertel", t1: "Komfort und Eleganz", t2: "Ihr Aufenthalt, gemacht zum Genießen.", ll: "Anreise", sa: "Abreise", hu: "Gäste", elige: "Datum wählen", buscar: "Suchen", hs: ["Gast", "Gäste"], nav: ["Start", "Unterkünfte", "Eigentümer", "Reinigung"], con: "Kontakt", res: "Buchen" },
    it: { dis: "Quartiere", todos: "Tutti i quartieri", t1: "Comfort e raffinatezza", t2: "Il tuo soggiorno, pensato per goderselo.", ll: "Arrivo", sa: "Partenza", hu: "Ospiti", elige: "Scegli la data", buscar: "Cerca", hs: ["ospite", "ospiti"], nav: ["Home", "Alloggi", "Proprietari", "Pulizie"], con: "Contatti", res: "Prenota" },
    zh: { dis: "区域", todos: "所有区域", t1: "舒适与精致", t2: "为享受而设计的住宿。", ll: "入住", sa: "退房", hu: "住客", elige: "选择日期", buscar: "搜索", hs: ["位住客", "位住客"], nav: ["首页", "房源", "业主服务", "清洁服务"], con: "联系我们", res: "预订" },
    ja: { dis: "エリア", todos: "すべてのエリア", t1: "快適さと洗練", t2: "心から楽しめる滞在を。", ll: "チェックイン", sa: "チェックアウト", hu: "ゲスト", elige: "日付を選択", buscar: "検索", hs: ["名", "名"], nav: ["ホーム", "宿泊施設", "オーナーの方へ", "清掃サービス"], con: "お問い合わせ", res: "予約する" },
    ko: { dis: "지역", todos: "모든 지역", t1: "편안함과 세련미", t2: "온전히 즐기도록 준비한 숙소.", ll: "체크인", sa: "체크아웃", hu: "게스트", elige: "날짜 선택", buscar: "검색", hs: ["명", "명"], nav: ["홈", "숙소", "집주인 안내", "청소 서비스"], con: "문의하기", res: "예약하기" },
    ru: { dis: "Район", todos: "Все районы", t1: "Комфорт и изысканность", t2: "Ваш отдых — чтобы наслаждаться.", ll: "Заезд", sa: "Выезд", hu: "Гости", elige: "Выберите дату", buscar: "Найти", hs: ["гость", "гостя"], nav: ["Главная", "Жильё", "Владельцам", "Уборка"], con: "Контакты", res: "Забронировать" }
  };
  var GLOBO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
  // Portada propia (Hugo, 19-11-2026): igual que la de Wix; solo cambia la parte de arriba, donde irá el video. Mientras
  // no haya video, fotos que se funden una en otra con un acercamiento lento. Debajo, lo mismo de siempre (portadaHTML).
  function modoInicio() {
    var CEL = window.innerWidth < 760, $ = function (id) { return document.getElementById(id); };
    var lang = (Q.get("lang") || "").toLowerCase();
    if (!PORTADA_T[lang]) { lang = prefLeer("zlang"); }
    if (!PORTADA_T[lang]) { lang = "es"; }
    document.body.className += " in-en pt-en " + (CEL ? "in-cel pt-cel" : "pt-pc");
    letraZienna();
    var actual = 0, timer = null, datos = null;
    LANG = lang;
    function foto(f) {
      var w = CEL ? 900 : 1920, h = CEL ? 1400 : 1080;
      return f[2] ? WIXM + f[0] + "/v1/fill/w_" + w + ",h_" + h + ",fp_" + f[2] + ",q_85/foto.jpg" : wixFoto(f[0], w, h);
    }
    function pastilla() {
      var L = IDIOMAS.filter(function (x) { return x[0] === lang; })[0];
      return '<div class="in-idi"><button type="button" class="in-pas" id="in-pas" aria-haspopup="listbox" aria-expanded="false">' + GLOBO + '<span>' + (CEL ? lang.toUpperCase() : L[1]) + '</span><i>▾</i></button>' +
        '<ul class="in-lista" id="in-lista" role="listbox" hidden>' + IDIOMAS.map(function (x) { return '<li role="option" data-l="' + x[0] + '"' + (x[0] === lang ? ' class="on" aria-selected="true"' : '') + '>' + x[1] + '</li>'; }).join("") + '</ul></div>';
    }
    function pintar() {
      LANG = lang;
      var T = PORTADA_T[lang], h = +busq.h || 2, opH = "";
      var debajo = datos ? portadaHTML(datos.alojamientos, datos.descuento, CEL) : '<p class="dz-nota" style="padding:40px 16px">…</p>';
      document.documentElement.lang = lang;
      for (var i = 1; i <= 6; i++) { opH += '<option value="' + i + '"' + (i === h ? " selected" : "") + '>' + i + " " + T.hs[i === 1 ? 0 : 1] + '</option>'; }
      var extra = pastilla() + selectoresLM(CEL, true) + '<a class="in-con" href="' + RAPIDA + '/disponibilidad?modo=contacto">' + T.con + '</a>';
      var mw = marcoWeb(CEL, "Home", extra);
      APP.innerHTML = mw.cab +
        '<section class="in-hero"><div class="in-fotos">' + PORTADA_FOTOS.map(function (f, k) { return '<div class="in-f' + (k === actual ? ' on' : '') + '" data-k="' + k + '"' + (k < 2 ? ' style="background-image:url(\'' + foto(f) + '\')"' : '') + '></div>'; }).join("") + '</div>' +
        '<div class="in-velo"></div><div class="in-txt"><h1>' + esc(T.t1) + '</h1><p>' + esc(T.t2) + '</p></div>' +
        '<div class="in-caja" id="in-caja"></div><form class="in-barra" id="in-barra" hidden><label class="in-c in-zona"><small>' + T.dis + '</small><select id="in-z"><option value="">' + T.todos + '</option>' + DISTRITOS.map(function (z) { return '<option' + (z === busq.z ? " selected" : "") + '>' + z + '</option>'; }).join("") + '</select></label>' +
        '<a class="in-c in-ir" href="' + esc(urlBuscar("fechas")) + '"><small>' + T.ll + '</small><b>' + (busq.ll ? corto(busq.ll) : T.elige) + '</b></a>' +
        '<a class="in-c in-ir" href="' + esc(urlBuscar("fechas")) + '"><small>' + T.sa + '</small><b>' + (busq.sa ? corto(busq.sa) : T.elige) + '</b></a>' +
        '<label class="in-c in-hu"><small>' + T.hu + '</small><select id="in-h">' + opH + '</select></label><button type="submit" class="in-buscar">' + T.buscar + '</button></form>' +
        '<span class="in-puntos" id="in-puntos">' + PORTADA_FOTOS.map(function (f, k) { return '<button type="button" data-k="' + k + '"' + (k === actual ? ' class="on"' : '') + ' aria-label="' + (k + 1) + '"><i></i></button>'; }).join("") + '</span></section>' +
        '<div class="in-debajo" id="in-debajo"><div class="pt">' + debajo + '</div></div>' + mw.pie;
      cajaBusqueda($("in-caja"), { cel: CEL, T: T });
      function rehacerLinks() { [].forEach.call(document.querySelectorAll(".in-ir"), function (a) { a.href = urlBuscar("fechas"); }); }
      $("in-z").addEventListener("change", function () { busq.z = zonaValida(this.value); rehacerLinks(); });
      $("in-h").addEventListener("change", function () { busq.h = +this.value; guardar(); rehacerLinks(); });
      $("in-barra").addEventListener("submit", function (ev) { ev.preventDefault(); irA(busq.ll && busq.sa ? urlBuscar() : urlBuscar("fechas")); });
      $("in-pas").addEventListener("click", function (ev) { ev.stopPropagation(); var l = $("in-lista"); l.hidden = !l.hidden; this.setAttribute("aria-expanded", l.hidden ? "false" : "true"); });
      $("in-lista").addEventListener("click", function (ev) {
        var li = ev.target.closest("li[data-l]"); if (!li) { return; }
        lang = li.getAttribute("data-l"); prefGuardar("zlang", lang);
        // Se recarga con ?lang= para que TODO (caja, fechas, textos) quede en el idioma nuevo.
        var u = new URL(location.href); u.searchParams.set("lang", lang); location.href = u.toString();
      });
      $("in-puntos").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-k]"); if (b) { ir(+b.getAttribute("data-k")); } });
      ligarMarco();
      arrancar();
    }
    document.addEventListener("click", function () { var l = $("in-lista"); if (l && !l.hidden) { l.hidden = true; $("in-pas").setAttribute("aria-expanded", "false"); } });
    function cargar(k, listo) {
      var el = document.querySelector('.in-f[data-k="' + k + '"]'); if (!el) { return; }
      if (el.style.backgroundImage) { if (listo) { listo(); } return; }
      var im = new Image(), u = foto(PORTADA_FOTOS[k]);
      im.onload = im.onerror = function () { el.style.backgroundImage = "url('" + u + "')"; if (listo) { listo(); } };
      im.src = u;
    }
    function ir(k) {
      cargar(k, function () {
        var fs = document.querySelectorAll(".in-f"), ps = document.querySelectorAll("#in-puntos button");
        if (!fs.length) { return; }
        var viejo = fs[actual]; viejo.classList.remove("on"); viejo.classList.add("sale");
        setTimeout(function () { viejo.classList.remove("sale"); }, 1800);
        actual = k; fs[actual].classList.add("on");
        [].forEach.call(ps, function (b, j) { b.classList.toggle("on", j === actual); });
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
    llamarSWR("alojamientos", {}, function (d) { datos = d; var c = $("in-debajo"); if (c) { c.innerHTML = '<div class="pt">' + portadaHTML(d.alojamientos, d.descuento, CEL) + '</div>'; } });
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
    function fechaTxt(f) { var d = new Date(f + "T12:00:00"); if (LANG !== "es") { try { return new Intl.DateTimeFormat(LOC(), { weekday: "short", day: "numeric", month: "short" }).format(d); } catch (e) {} } return ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()] + " " + d.getDate() + " " + MESES_C[d.getMonth()]; }
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
      $("lr").innerHTML = '<div class="lr-tit"><img class="lr-ind" src="' + ASSET + 'libro_reclamaciones_indecopi.webp" width="120" height="96" alt="Libro de Reclamaciones"><div><h1>Libro de Reclamaciones</h1><p class="lr-sub">Hoja de reclamación virtual · Código de identificación <b>' + esc(P.codigo || "") + '</b></p></div></div>' +
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
  else if (MODO === "caja") { modoCaja(); }
  else if (MODO === "beneficios") { modoBeneficios(); }
  else if (MODO === "idioma") { modoIdioma(); }
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

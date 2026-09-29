/* Essra Siam — Avocate à la Cour */
(function () {
  "use strict";

  var PHONE = "33743627900";
  var PHONE_DISPLAY = "07 43 62 79 00";
  var EMAIL = "contact@siamavocat.fr";
  var CABINET = [48.865005, 2.2910657];
  var LANGS = ["fr", "en", "ar"];
  var DICT = window.I18N || {};
  var root = document.documentElement;
  var current = "fr";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Traduction ---------- */

  var t = function (key) {
    var d = DICT[current];
    if (d && d[key] != null) return d[key];
    return DICT.fr && DICT.fr[key] != null ? DICT.fr[key] : "";
  };

  var parseAttrs = function (el) {
    return el.getAttribute("data-i18n-attr").split(";").map(function (pair) {
      var i = pair.indexOf(":");
      return [pair.slice(0, i).trim(), pair.slice(i + 1).trim()];
    }).filter(function (p) { return p[0] && p[1]; });
  };

  var originals = [];
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (key) originals.push({ el: el, key: key, html: el.innerHTML });
  });
  var attrOriginals = [];
  document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
    parseAttrs(el).forEach(function (p) {
      attrOriginals.push({ el: el, attr: p[0], key: p[1], value: el.getAttribute(p[0]) || "" });
    });
  });

  var store = function (key, value) { try { localStorage.setItem(key, value); } catch (e) { /* navigation privée */ } };
  var readLang = function () {
    var q = new URLSearchParams(window.location.search).get("lang");
    if (LANGS.indexOf(q) > -1) return q;
    try { var s = localStorage.getItem("lang"); if (LANGS.indexOf(s) > -1) return s; } catch (e) { /* ignoré */ }
    return "fr";
  };

  var hooks = [];
  var applyLang = function (lang, save) {
    current = LANGS.indexOf(lang) > -1 ? lang : "fr";
    var d = DICT[current] || {};
    var translate = current !== "fr";
    originals.forEach(function (o) {
      o.el.innerHTML = translate && d[o.key] != null ? d[o.key] : o.html;
    });
    attrOriginals.forEach(function (o) {
      o.el.setAttribute(o.attr, translate && d[o.key] != null ? d[o.key] : o.value);
    });
    root.lang = current;
    root.dir = current === "ar" ? "rtl" : "ltr";
    document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === current));
    });
    if (save) store("lang", current);
    hooks.forEach(function (fn) { fn(current); });
    root.classList.remove("i18n-wait");
  };

  document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      var lang = b.getAttribute("data-lang");
      if (lang !== current) applyLang(lang, true);
    });
  });

  /* Dates des carnets dans la langue du site */
  hooks.push(function (lang) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : lang, { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return; }
    document.querySelectorAll("time[data-date]").forEach(function (el) {
      var d = new Date(el.getAttribute("datetime") + "T12:00:00");
      if (!isNaN(d)) el.textContent = fmt.format(d);
    });
    document.querySelectorAll(".post-langnote").forEach(function (el) {
      var post = document.querySelector("[data-post-lang]");
      var postLang = post ? post.getAttribute("data-post-lang") : lang;
      el.textContent = t("post.in." + postLang);
      el.hidden = postLang === lang || !el.textContent;
    });
  });

  /* ---------- Petites notifications ---------- */

  var toastEl = document.getElementById("toast");
  var toastTimer;
  var toast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2600);
  };
  var copyText = function (text, ok, fail) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      (done ? ok : fail)();
    }
  };
  var copy = function (text, msg) {
    copyText(text, function () { toast(msg); }, function () { toast(text); });
  };

  /* ---------- Liens WhatsApp / e-mail ---------- */

  var waLink = function (text) {
    return "https://wa.me/" + PHONE + (text ? "?text=" + encodeURIComponent(text) : "");
  };
  var mailLink = function (subject, body) {
    var q = [];
    if (subject) q.push("subject=" + encodeURIComponent(subject));
    if (body) q.push("body=" + encodeURIComponent(body.replace(/\n/g, "\r\n")));
    return "mailto:" + EMAIL + (q.length ? "?" + q.join("&") : "");
  };
  hooks.push(function () {
    document.querySelectorAll("[data-wa]").forEach(function (a) { a.href = waLink(a.getAttribute("data-wa")); });
    document.querySelectorAll("[data-wa-tpl]").forEach(function (a) {
      a.href = waLink(t(a.getAttribute("data-wa-tpl")).replace("{title}", a.getAttribute("data-wa-arg") || ""));
    });
    document.querySelectorAll("[data-mail-subject]").forEach(function (a) {
      a.href = mailLink(a.getAttribute("data-mail-subject"), a.getAttribute("data-mail-body") || "");
    });
  });

  /* ---------- Appeler, écrire : l'application de l'appareil, sinon le numéro ou l'adresse en clair ---------- */

  var reach = document.getElementById("reach");
  var node = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  var withIcon = function (n, icon, label) {
    n.innerHTML = '<svg aria-hidden="true"><use href="#' + icon + '"/></svg>';
    n.appendChild(node("span", "", label));
    return n;
  };
  var closeReach = function () {
    if (!reach || reach.hidden) return;
    reach.classList.remove("is-open");
    setTimeout(function () { if (!reach.classList.contains("is-open")) reach.hidden = true; }, 320);
  };
  var openReach = function (link, focus) {
    if (!reach) return null;
    var phone = link.protocol === "tel:";
    var value = phone ? PHONE_DISPLAY : EMAIL;
    var body = reach.querySelector(".reach-body");
    body.textContent = "";
    var label = node("p", "reach-label", t(phone ? "reach.phone" : "reach.mail"));
    label.id = "reach-label";
    body.appendChild(label);
    body.appendChild(node("p", "reach-value ltr", value));
    body.appendChild(node("p", "reach-hint", t(phone ? "reach.hintPhone" : "reach.hintMail")));
    var status = node("p", "reach-status");
    status.setAttribute("aria-live", "polite");
    var copied = function () { status.textContent = t("reach.copied"); };
    var actions = node("div", "reach-actions");
    var copyBtn = withIcon(node("button", "btn btn--solid"), "i-copy", t("reach.copy"));
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () { copyText(value, copied, function () {}); });
    actions.appendChild(copyBtn);
    var out = function (href, icon, text) {
      var a = withIcon(node("a", "btn btn--ghost"), icon, text);
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      actions.appendChild(a);
    };
    if (phone) {
      out(waLink(""), "i-wa", t("c.mb.wa") || "WhatsApp");
    } else {
      // Messagerie en ligne : même objet et même texte que le mailto
      var u = new URL(link.href);
      var su = encodeURIComponent(u.searchParams.get("subject") || "");
      var bd = encodeURIComponent(u.searchParams.get("body") || "");
      var to = encodeURIComponent(EMAIL);
      out("https://mail.google.com/mail/?view=cm&fs=1&to=" + to + "&su=" + su + "&body=" + bd, "i-mail", "Gmail");
      out("https://outlook.live.com/mail/0/deeplink/compose?to=" + to + "&subject=" + su + "&body=" + bd, "i-mail", "Outlook");
    }
    body.appendChild(actions);
    body.appendChild(status);
    reach.hidden = false;
    requestAnimationFrame(function () { reach.classList.add("is-open"); });
    if (focus) copyBtn.focus({ preventScroll: true });
    return copied;
  };
  hooks.push(closeReach);

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (reach && !reach.hidden && !e.target.closest("#reach") && !a) closeReach();
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var value = a.protocol === "tel:" ? PHONE_DISPLAY : EMAIL;
    if (finePointer) {
      // Ordinateur : l'application s'ouvre si elle existe, et le numéro ou l'adresse restent affichés, copiés
      var copied = openReach(a, e.detail === 0);
      copyText(value, copied || function () {}, function () {});
      return;
    }
    // Téléphone, tablette : l'application s'ouvre ; si rien ne se passe, affichage en clair
    var left = false;
    var mark = function () { left = true; };
    window.addEventListener("blur", mark);
    document.addEventListener("visibilitychange", mark);
    setTimeout(function () {
      window.removeEventListener("blur", mark);
      document.removeEventListener("visibilitychange", mark);
      if (!left && !document.hidden) openReach(a, false);
    }, 1500);
  });

  /* ---------- Portes d'entrée (première visite de l'accueil) ---------- */

  var doors = document.getElementById("doors");
  if (doors && !root.classList.contains("doors-on")) doors.remove();
  if (doors && root.classList.contains("doors-on")) {
    var opened = false;
    var openDoors = function () {
      if (opened) return;
      opened = true;
      store("siam.doors", "1");
      doors.classList.add("is-opening");
      root.classList.add("doors-opening");
      setTimeout(function () {
        doors.remove();
        root.classList.remove("doors-on", "doors-opening");
      }, 1150);
    };
    setTimeout(function () { doors.classList.add("is-lit"); }, 250);
    var doorTimer = setTimeout(openDoors, 650);
    doors.addEventListener("click", function () { clearTimeout(doorTimer); openDoors(); });
    document.addEventListener("keydown", function (e) {
      if (!opened && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { clearTimeout(doorTimer); openDoors(); }
    });
  } else {
    root.classList.remove("doors-on");
  }

  /* ---------- Éventail Art déco au clic ---------- */

  var burstSVG = (function () {
    var rays = "";
    for (var i = 0; i < 24; i++) {
      var a = (i * 15) * Math.PI / 180;
      var r1 = i % 2 ? 22 : 14;
      rays += '<line x1="' + (50 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (50 + r1 * Math.sin(a)).toFixed(1) +
        '" x2="' + (50 + 48 * Math.cos(a)).toFixed(1) + '" y2="' + (50 + 48 * Math.sin(a)).toFixed(1) + '"/>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' + rays +
      '<circle cx="50" cy="50" r="30" stroke-dasharray="1.5 3.5"/><circle cx="50" cy="50" r="10"/></svg>';
  })();
  if (!reduceMotion) {
    document.addEventListener("pointerdown", function (e) {
      var host = e.target.closest(".btn, .filter");
      if (!host) return;
      var r = host.getBoundingClientRect();
      var b = document.createElement("span");
      b.className = "deco-burst";
      b.innerHTML = burstSVG;
      b.style.left = (e.clientX - r.left) + "px";
      b.style.top = (e.clientY - r.top) + "px";
      host.appendChild(b);
      setTimeout(function () { b.remove(); }, 850);
    });
  }

  /* ---------- En-tête et menu ---------- */

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav");
  var setMenu = function (open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", t(open ? "c.menuClose" : "c.menuOpen"));
    }
  };
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a, button")) setMenu(false); });
    hooks.push(function () { setMenu(document.body.classList.contains("menu-open")); });
  }

  /* ---------- Fiche de contact ---------- */

  var sheet = document.getElementById("sheet");
  var lastFocus = null;
  var openSheet = function () {
    if (!sheet) return;
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.body.classList.add("sheet-open");
    requestAnimationFrame(function () {
      sheet.classList.add("is-open");
      var first = sheet.querySelector(".sheet-action");
      if (first) first.focus({ preventScroll: true });
    });
  };
  var closeSheet = function () {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("is-open");
    document.body.classList.remove("sheet-open");
    setTimeout(function () { sheet.hidden = true; }, 380);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-sheet-open]")) { e.preventDefault(); openSheet(); return; }
    if (e.target.closest("[data-sheet-close]")) closeSheet();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeReach(); closeSheet(); setMenu(false); }
  });

  /* ---------- Apparition au défilement ---------- */

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Défilement : en-tête et filigranes en parallaxe ---------- */

  var parallax = reduceMotion ? [] : Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var ticking = false;
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
    if (ticking || !parallax.length) return;
    ticking = true;
    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      parallax.forEach(function (el) {
        var box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        var f = parseFloat(el.getAttribute("data-parallax")) || 0.1;
        el.style.transform = "translate3d(0," + ((box.top + box.height / 2 - vh / 2) * -f).toFixed(1) + "px,0)";
      });
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Le cabinet : de la rue au bureau, en fondu et en boucle ---------- */

  var loop = document.querySelector(".entree-loop");
  if (loop && "IntersectionObserver" in window && !reduceMotion) {
    var layers = loop.querySelectorAll(".entree-layer");
    var porche = loop.querySelector("video");
    var HOLD = 3200;
    var at = 0, loopTimer = null, loopVisible = false, loaded = false;
    var schedule = function () {
      clearTimeout(loopTimer);
      if (!loopVisible || document.hidden) {
        if (porche) porche.pause();
        return;
      }
      if (layers[at] === porche) {
        var p = porche.play();
        if (p && p.catch) p.catch(function () { loopTimer = setTimeout(advance, HOLD); });
        loopTimer = setTimeout(advance, 12000); // au cas où la vidéo ne signale pas sa fin
      } else {
        loopTimer = setTimeout(advance, HOLD);
      }
    };
    var advance = function () {
      var prev = layers[at];
      at = (at + 1) % layers.length;
      layers[at].classList.add("is-active");
      prev.classList.remove("is-active");
      if (prev === porche) setTimeout(function () { porche.pause(); porche.currentTime = 0; }, 1300);
      schedule();
    };
    if (porche) porche.addEventListener("ended", function () { if (layers[at] === porche) advance(); });
    document.addEventListener("visibilitychange", schedule);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        loopVisible = entry.isIntersecting;
        if (loopVisible && !loaded && porche) { loaded = true; porche.preload = "auto"; porche.load(); }
        schedule();
      });
    }, { threshold: 0.3 }).observe(loop);
  }

  /* ---------- Sous-navigation des domaines ---------- */

  var subLinks = document.querySelectorAll(".subnav a");
  if (subLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    subLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        subLinks.forEach(function (a) { a.classList.remove("is-active"); });
        var link = byId[entry.target.id];
        if (link) {
          link.classList.add("is-active");
          link.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ---------- Carnets : filtres et partage ---------- */

  var filters = document.querySelectorAll(".carnets-filters .filter");
  if (filters.length) {
    var cards = document.querySelectorAll("#carnets-grid .carnet-card");
    var empty = document.querySelector(".carnets-empty");
    filters.forEach(function (f) {
      f.addEventListener("click", function () {
        var cat = f.getAttribute("data-filter");
        filters.forEach(function (x) { x.classList.toggle("is-active", x === f); });
        var shown = 0;
        cards.forEach(function (c) {
          var on = cat === "*" || c.getAttribute("data-cat") === cat;
          c.classList.toggle("is-hidden", !on);
          if (on) { shown++; c.classList.add("is-in"); }
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  }
  document.querySelectorAll("[data-share]").forEach(function (b) {
    b.addEventListener("click", function () {
      var data = { title: document.title, url: window.location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); }
      else { copy(window.location.href, t("c.linkCopied")); }
    });
  });

  /* ---------- Accès : liste des stations et plan interactif ---------- */

  var accesData = document.getElementById("acces-data");
  var stationsList = document.getElementById("stations");
  if (accesData && stationsList) {
    var data = JSON.parse(accesData.textContent);
    var mode = "all";
    var map = null;
    var markers = [];
    var badge = function (l) {
      var cls = /^(M\d|RA|RC)$/.test(l) ? "ln--" + l : "ln--bus";
      var label = l.charAt(0) === "M" ? l.slice(1) : (l === "RA" ? "A" : (l === "RC" ? "C" : l));
      return '<span class="ln ' + cls + '">' + label + "</span>";
    };
    var modeLabel = function (m) { return m === "rer" ? "RER" : t(m === "bus" ? "ac.bus" : "ac.metro"); };
    var walk = function (s) { return "≈ " + s.min + " " + t("ac.walk"); };
    var walkUrl = function (s) {
      return "https://www.google.com/maps/dir/?api=1&origin=" + s.at[0] + "," + s.at[1] +
        "&destination=" + CABINET[0] + "," + CABINET[1] + "&travelmode=walking";
    };
    var popup = function (s) {
      return '<div class="lines">' + s.lines.map(badge).join("") + "</div><strong>" + s.name + "</strong>" +
        modeLabel(s.mode) + " · " + walk(s) + '<br><a href="' + walkUrl(s) + '" target="_blank" rel="noopener">' + t("ac.walkRoute") + "</a>";
    };
    var renderList = function () {
      stationsList.innerHTML = data.stations.map(function (s, i) {
        return '<li><button type="button" class="station' + (mode !== "all" && s.mode !== mode ? " is-hidden" : "") +
          '" data-i="' + i + '"><span class="lines">' + s.lines.map(badge).join("") + '</span><span class="station-name">' +
          s.name + "<small>" + modeLabel(s.mode) + '</small></span><span class="station-min">' + walk(s) + "</span></button></li>";
      }).join("");
    };
    var applyMode = function () {
      stationsList.querySelectorAll(".station").forEach(function (b) {
        var s = data.stations[Number(b.getAttribute("data-i"))];
        b.classList.toggle("is-hidden", mode !== "all" && s.mode !== mode);
      });
      if (map) {
        markers.forEach(function (m) {
          var on = mode === "all" ? m.station.mode !== "bus" || m.focused : m.station.mode === mode;
          if (on && !map.hasLayer(m.marker)) m.marker.addTo(map);
          if (!on && map.hasLayer(m.marker)) map.removeLayer(m.marker);
        });
      }
    };
    renderList();
    hooks.push(function () {
      renderList();
      applyMode();
      markers.forEach(function (m) { m.marker.setPopupContent(popup(m.station)); });
    });
    document.querySelectorAll(".acces-filters .filter").forEach(function (f) {
      f.addEventListener("click", function () {
        mode = f.getAttribute("data-mode");
        document.querySelectorAll(".acces-filters .filter").forEach(function (x) { x.classList.toggle("is-active", x === f); });
        applyMode();
      });
    });
    stationsList.addEventListener("click", function (e) {
      var b = e.target.closest(".station");
      if (!b) return;
      var i = Number(b.getAttribute("data-i"));
      stationsList.querySelectorAll(".station").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      if (!map) return;
      var m = markers[i];
      markers.forEach(function (x) { x.focused = x === m; });
      applyMode();
      map.flyTo(m.station.at, 17, { duration: reduceMotion ? 0 : 0.8 });
      m.marker.openPopup();
      if (window.innerWidth < 900) document.getElementById("map").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });

    /* Le plan (Leaflet + OpenStreetMap) ne se charge qu'à l'approche de la section */
    var loadMap = function () {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(css);
      var js = document.createElement("script");
      js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      js.onload = function () {
        var L = window.L;
        var el = document.getElementById("map");
        el.innerHTML = "";
        map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(CABINET, 16);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        }).addTo(map);
        var logo = document.querySelector(".footer-brand img");
        var cabIcon = L.divIcon({ className: "", html: '<div class="pin-cabinet"><img src="' + (logo ? logo.getAttribute("src") : "") + '" alt=""></div>', iconSize: [56, 56], iconAnchor: [28, 28] });
        L.marker(CABINET, { icon: cabIcon, zIndexOffset: 1000, keyboard: false })
          .addTo(map)
          .bindPopup(function () { return "<strong>" + t("ac.cabinet") + '</strong><span class="ltr">20 rue de Longchamp, 75116 Paris</span>'; });
        markers = data.stations.map(function (s) {
          var icon = L.divIcon({ className: "", html: '<div class="pin-station">' + s.lines.map(badge).join("") + "</div>", iconSize: null, iconAnchor: [12, 12] });
          var marker = L.marker(s.at, { icon: icon, title: s.name }).bindPopup(popup(s));
          return { marker: marker, station: s };
        });
        applyMode();
        var bounds = L.latLngBounds([CABINET].concat(data.stations.filter(function (s) { return s.min <= 6; }).map(function (s) { return s.at; })));
        map.fitBounds(bounds.pad(0.35));
      };
      js.onerror = function () {
        var el = document.getElementById("map");
        el.innerHTML = '<iframe title="Plan" style="border:0;width:100%;height:100%" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=2.2830,48.8605,2.2990,48.8695&amp;layer=mapnik&amp;marker=' + CABINET[0] + "," + CABINET[1] + '"></iframe>';
      };
      document.head.appendChild(js);
    };
    var mapEl = document.getElementById("map");
    if ("IntersectionObserver" in window) {
      var mapObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { mapObserver.disconnect(); loadMap(); }
      }, { rootMargin: "400px 0px" });
      mapObserver.observe(mapEl);
    } else {
      loadMap();
    }

    /* Itinéraire : l'application de l'appareil en premier */
    var ua = navigator.userAgent;
    var apple = /iPhone|iPad|iPod|Macintosh/.test(ua);
    var btnApple = document.querySelector("[data-maps='apple']");
    var btnGoogle = document.querySelector("[data-maps='google']");
    if (!apple && btnApple && btnGoogle) {
      btnApple.classList.replace("btn--solid", "btn--ghost");
      btnGoogle.classList.replace("btn--ghost", "btn--solid");
      btnGoogle.parentNode.insertBefore(btnGoogle, btnApple);
    }
  }

  /* ---------- Prise de rendez-vous : message prêt pour WhatsApp ou e-mail ---------- */

  var form = document.getElementById("rdv-form");
  if (form) {
    var btnWa = form.querySelector("[data-send='whatsapp']");
    var btnMail = form.querySelector("[data-send='mail']");
    var preview = document.getElementById("rdv-preview-text");
    var langueTouched = false;
    var value = function (name) {
      var el = form.elements[name];
      return el && el.value ? el.value.trim() : "";
    };
    var checked = function (name) { return form.querySelector("input[name='" + name + "']:checked"); };
    var build = function () {
      var motifEl = checked("motif");
      var langueEl = checked("langue");
      var dispoEl = form.elements.dispo;
      var nom = value("nom");
      var tel = value("tel");
      var msg = value("message");
      var motif = motifEl ? t("motif." + motifEl.getAttribute("data-key")) : "";
      var dispo = dispoEl && dispoEl.value ? dispoEl.options[dispoEl.selectedIndex].text : "";
      var langue = langueEl ? langueEl.value : current;
      var sep = current === "fr" ? " : " : ": ";
      var details = [];
      if (motif) details.push(t("msg.motif") + sep + motif);
      if (nom) details.push(t("msg.name") + sep + nom);
      if (tel) details.push(t("msg.tel") + sep + tel);
      if (dispo) details.push(t("msg.dispo") + sep + dispo);
      if (langue !== current) details.push(t("msg.langue") + sep + t("lang." + langue));
      var lines = [t("msg.hello"), "", t("msg.intro")];
      if (details.length) lines.push("", details.join("\n"));
      if (msg) lines.push("", msg);
      lines.push("", t("msg.bye") + (nom ? "\n" + nom : ""));
      var body = lines.join("\n");
      var subject = t("msg.subject") + (motif ? " — " + motif : "") + (nom ? " — " + nom : "");
      if (btnWa) btnWa.href = waLink(body);
      if (btnMail) btnMail.href = mailLink(subject, body);
      if (preview) preview.textContent = body;
    };
    var wanted = new URLSearchParams(window.location.search).get("motif");
    if (wanted) {
      var chip = form.querySelector("input[name='motif'][data-key='" + wanted + "']");
      if (chip) chip.checked = true;
    }
    form.addEventListener("change", function (e) { if (e.target.name === "langue") langueTouched = true; });
    form.addEventListener("input", build);
    form.addEventListener("change", build);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    hooks.push(function (lang) {
      if (!langueTouched) {
        var match = form.querySelector("input[name='langue'][value='" + lang + "']");
        if (match) match.checked = true;
      }
      build();
    });
  }

  /* Année du pied de page */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  applyLang(readLang(), new URLSearchParams(window.location.search).has("lang"));
})();

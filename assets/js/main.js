/* Essra Siam — Avocate à la Cour */
(function () {
  "use strict";

  var PHONE = "33743627900";
  var EMAIL = "contact@siamavocat.fr";
  var LANGS = ["fr", "en", "ar"];
  var DICT = window.I18N || {};
  var root = document.documentElement;
  var current = "fr";

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

  /* Le texte français d'origine est mémorisé pour pouvoir y revenir */
  var originals = [];
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    originals.push({ el: el, key: el.getAttribute("data-i18n"), html: el.innerHTML });
  });
  var attrOriginals = [];
  document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
    parseAttrs(el).forEach(function (p) {
      attrOriginals.push({ el: el, attr: p[0], key: p[1], value: el.getAttribute(p[0]) || "" });
    });
  });

  var storeLang = function (lang) {
    try { localStorage.setItem("lang", lang); } catch (e) { /* navigation privée */ }
  };
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
    if (save) storeLang(current);
    hooks.forEach(function (fn) { fn(current); });
    root.classList.remove("i18n-wait");
  };

  document.querySelectorAll(".lang-switch [data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      var lang = b.getAttribute("data-lang");
      if (lang !== current) applyLang(lang, true);
    });
  });

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
  var refreshLinks = function () {
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      a.href = waLink(a.getAttribute("data-wa"));
    });
    document.querySelectorAll("[data-mail-subject]").forEach(function (a) {
      a.href = mailLink(a.getAttribute("data-mail-subject"), a.getAttribute("data-mail-body") || "");
    });
  };
  hooks.push(refreshLinks);

  /* ---------- En-tête ---------- */

  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    hooks.push(function () { setMenu(document.body.classList.contains("menu-open")); });
  }

  /* ---------- Apparition au défilement ---------- */

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
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
    var checked = function (name) {
      return form.querySelector("input[name='" + name + "']:checked");
    };

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

    /* Motif pré-sélectionné depuis une page de domaine : ?motif=etrangers */
    var wanted = new URLSearchParams(window.location.search).get("motif");
    if (wanted) {
      var chip = form.querySelector("input[name='motif'][data-key='" + wanted + "']");
      if (chip) chip.checked = true;
    }

    form.addEventListener("change", function (e) {
      if (e.target.name === "langue") langueTouched = true;
    });
    form.addEventListener("input", build);
    form.addEventListener("change", build);
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    /* La langue du rendez-vous suit la langue du site, tant que l'internaute ne l'a pas choisie */
    hooks.push(function (lang) {
      if (!langueTouched) {
        var match = form.querySelector("input[name='langue'][value='" + lang + "']");
        if (match) match.checked = true;
      }
      build();
    });
  }

  /* Année du pied de page */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  applyLang(readLang(), new URLSearchParams(window.location.search).has("lang"));
})();

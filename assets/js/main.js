/* Essra Siam — Avocate à la Cour */
(function () {
  "use strict";

  var PHONE = "33743627900";
  var EMAIL = "contact@siamavocat.fr";

  var waLink = function (text) {
    return "https://wa.me/" + PHONE + (text ? "?text=" + encodeURIComponent(text) : "");
  };
  var mailLink = function (subject, body) {
    var q = [];
    if (subject) q.push("subject=" + encodeURIComponent(subject));
    if (body) q.push("body=" + encodeURIComponent(body.replace(/\n/g, "\r\n")));
    return "mailto:" + EMAIL + (q.length ? "?" + q.join("&") : "");
  };

  /* En-tête : fond au défilement */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Menu mobile */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav");
  var setMenu = function (open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
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
  }

  /* Liens WhatsApp / e-mail avec message pré-rempli */
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    a.href = waLink(a.getAttribute("data-wa"));
  });
  document.querySelectorAll("[data-mail-subject]").forEach(function (a) {
    a.href = mailLink(a.getAttribute("data-mail-subject"), a.getAttribute("data-mail-body") || "");
  });

  /* Apparition au défilement */
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

  /* Sous-navigation des domaines : section active */
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

  /* Prise de rendez-vous : message prêt pour WhatsApp ou e-mail */
  var form = document.getElementById("rdv-form");
  if (form) {
    var btnWa = form.querySelector("[data-send='whatsapp']");
    var btnMail = form.querySelector("[data-send='mail']");
    var preview = document.getElementById("rdv-preview-text");

    var value = function (name) {
      var el = form.elements[name];
      return el && el.value ? el.value.trim() : "";
    };
    var checked = function (name) {
      var el = form.querySelector("input[name='" + name + "']:checked");
      return el ? el.value : "";
    };

    var build = function () {
      var motif = checked("motif");
      var langue = checked("langue");
      var nom = value("nom");
      var tel = value("tel");
      var dispo = value("dispo");
      var msg = value("message");

      var lines = ["Bonjour Maître Siam,", "", "Je souhaiterais prendre rendez-vous avec vous."];
      var details = [];
      if (motif) details.push("Motif : " + motif);
      if (nom) details.push("Nom : " + nom);
      if (tel) details.push("Téléphone : " + tel);
      if (dispo) details.push("Disponibilités : " + dispo);
      if (langue && langue !== "français") details.push("Langue souhaitée : " + langue);
      if (details.length) lines.push("", details.join("\n"));
      if (msg) lines.push("", msg);
      lines.push("", "Bien cordialement," + (nom ? "\n" + nom : ""));

      var body = lines.join("\n");
      var subject = "Demande de rendez-vous" + (motif ? " — " + motif : "") + (nom ? " — " + nom : "");

      if (btnWa) btnWa.href = waLink(body);
      if (btnMail) btnMail.href = mailLink(subject, body);
      if (preview) preview.textContent = body;
    };

    /* Motif pré-sélectionné depuis une page de domaine : ?motif=etrangers */
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("motif");
    if (wanted) {
      var chip = form.querySelector("input[name='motif'][data-key='" + wanted + "']");
      if (chip) chip.checked = true;
    }

    form.addEventListener("input", build);
    form.addEventListener("change", build);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    build();
  }

  /* Année du pied de page */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

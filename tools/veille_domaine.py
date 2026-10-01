#!/usr/bin/env python3
"""Point du soir sur le transfert de siamavocat.fr, envoyé par e-mail.

    python3 tools/veille_domaine.py [--dry-run]

Vérifie le registre des .fr (RDAP Afnic), l'annuaire DNS, la messagerie et le site,
active le HTTPS obligatoire de GitHub Pages dès que le certificat est délivré,
puis envoie un résumé à l'adresse de la boîte des Carnets (CARNETS_IMAP_USER).
Écrit done=true dans GITHUB_OUTPUT quand tout est en ligne.
"""
import json
import os
import smtplib
import ssl
import sys
import urllib.error
import urllib.request
from email.message import EmailMessage

DOMAIN = "siamavocat.fr"
WWW = "www." + DOMAIN
MARKER = "Essra Siam"
REPO = os.environ.get("GITHUB_REPOSITORY", "lgrconseil/siamavocat")


def fetch(url, headers=None, method="GET", data=None, timeout=20):
    req = urllib.request.Request(url, headers=headers or {}, method=method, data=data)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")


def registry():
    _, body = fetch(f"https://rdap.nic.fr/domain/{DOMAIN}", {"Accept": "application/rdap+json"})
    d = json.loads(body)
    registrar = ""
    for e in d.get("entities", []):
        if "registrar" in e.get("roles", []):
            registrar = next((x[3] for x in e.get("vcardArray", [None, []])[1] if x[0] == "fn"), "")
    expiry = next((e["eventDate"][:10] for e in d.get("events", []) if e.get("eventAction") == "expiration"), "")
    ns = sorted(n.get("ldhName", "").lower().rstrip(".") for n in d.get("nameservers", []))
    return registrar, d.get("status", []), ns, expiry


def dns(name, rtype):
    _, body = fetch(f"https://dns.google/resolve?name={name}&type={rtype}")
    return [a["data"].rstrip(".") for a in json.loads(body).get("Answer", [])]


def site():
    """(https_ok, http_ok) : le nouveau site répond-il, et en HTTPS valide ?"""
    def ok(url):
        try:
            status, body = fetch(url)
            return status == 200 and MARKER in body
        except (urllib.error.URLError, ssl.SSLError, OSError):
            return False
    return ok(f"https://{WWW}/"), ok(f"http://{WWW}/")


def pages_https():
    """Active « Enforce HTTPS » dès que GitHub a délivré le certificat."""
    token = os.environ.get("GH_TOKEN")
    if not token:
        return "inconnu"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    try:
        _, body = fetch(f"https://api.github.com/repos/{REPO}/pages", headers)
        info = json.loads(body)
        if info.get("https_enforced"):
            return "actif"
        cert = (info.get("https_certificate") or {}).get("state", "")
        if cert == "approved":
            payload = json.dumps({"cname": info.get("cname"), "https_enforced": True}).encode()
            fetch(f"https://api.github.com/repos/{REPO}/pages", {**headers, "Content-Type": "application/json"},
                  method="PUT", data=payload)
            return "activé ce soir"
        return f"certificat en cours ({cert or 'pas encore demandé'})"
    except (urllib.error.URLError, OSError, ValueError) as exc:
        return f"vérification impossible ({exc})"


def main():
    dry = "--dry-run" in sys.argv
    registrar, status, ns, expiry = registry()
    mx = dns(DOMAIN, "MX")
    mail_ok = any(m.endswith("smtp.google.com") for m in mx)
    transferred = "OVH" in registrar.upper()
    https_ok, http_ok = site()
    https_state = pages_https() if transferred and http_ok else "en attente du transfert"

    if not mail_ok:
        subject = "⚠️ siamavocat.fr : la messagerie ne pointe plus vers Google"
    elif not transferred:
        subject = "siamavocat.fr : transfert toujours en attente"
    elif https_ok and https_state in ("actif", "activé ce soir"):
        subject = "✅ siamavocat.fr est en ligne"
    else:
        subject = "siamavocat.fr : transfert fait, mise en ligne en cours"

    lines = [
        f"Point du soir sur {DOMAIN}",
        "",
        f"- Prestataire du domaine : {registrar or 'inconnu'}" + (" (transfert terminé)" if transferred else " (prestataire de Squarespace)" if "KEY-SYSTEMS" in registrar.upper() else ""),
        f"- Statut au registre : {', '.join(status) or 'inconnu'}",
        f"- Annuaire DNS : {', '.join(ns) or 'aucun'}",
        f"- Échéance du domaine : {expiry or 'inconnue'}",
        f"- Messagerie (MX) : {', '.join(mx) or 'aucune'} " + ("✅" if mail_ok else "⚠️ à vérifier d'urgence"),
        f"- Nouveau site : " + ("en ligne en HTTPS ✅" if https_ok else "en ligne (HTTPS pas encore prêt)" if http_ok else "pas encore visible"),
        f"- HTTPS obligatoire : {https_state}",
        "",
    ]
    if not transferred:
        lines.append("Rien à faire : le transfert se termine seul, normalement vers le 7 octobre au soir (8 jours après la demande), ou plus tôt si Squarespace l'approuve.")
    elif https_ok:
        lines += ["Tout est en place. Dernière étape de votre côté : activer le renouvellement automatique du domaine dans OVH.",
                  "Ce point du soir s'arrête de lui-même."]
    else:
        lines.append("Le domaine est chez OVH. Le site apparaît dans les minutes qui suivent, et le certificat HTTPS dans l'heure.")
    body = "\n".join(lines)

    print(subject)
    print(body)
    if not dry:
        user = os.environ.get("CARNETS_IMAP_USER")
        password = "".join(os.environ.get("CARNETS_IMAP_PASSWORD", "").split())
        if user and password:
            msg = EmailMessage()
            msg["From"], msg["To"], msg["Subject"] = user, user, subject
            msg["Auto-Submitted"] = "auto-generated"
            msg.set_content(body)
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as smtp:
                smtp.starttls()
                smtp.login(user, password)
                smtp.send_message(msg)
            print("E-mail envoyé.")
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as fh:
            fh.write(f"done={'true' if transferred and https_ok and mail_ok else 'false'}\n")


if __name__ == "__main__":
    main()

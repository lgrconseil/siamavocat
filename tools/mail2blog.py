#!/usr/bin/env python3
"""Publie dans les Carnets les articles envoyés par e-mail.

Maître Siam écrit à l'adresse dédiée (par exemple carnets@siamavocat.fr) :
  - l'objet devient le titre ;
  - le corps du message devient l'article ;
  - la première image jointe devient la photo de couverture.

Mots-clés dans l'objet :
  [Brouillon] Titre   → article non listé, visible seulement par son lien
  [Supprimer] Titre   → retire l'article portant ce titre
Renvoyer un message avec exactement le même titre remplace l'article.

Lignes facultatives en tête du message (avant une ligne vide) :
  Catégorie : Droit d'asile
  Langue : ar
  Date : 2026-10-01
  Résumé : une phrase d'accroche

Variables d'environnement (secrets du dépôt GitHub) :
  CARNETS_IMAP_HOST, CARNETS_IMAP_USER, CARNETS_IMAP_PASSWORD
  CARNETS_ALLOWED    adresses d'expédition autorisées, séparées par des virgules
  CARNETS_CODE       facultatif : mot secret à placer dans l'objet
  CARNETS_SMTP_HOST, CARNETS_SMTP_USER, CARNETS_SMTP_PASSWORD
                     facultatif : accusé de réception envoyé à l'autrice
  CARNETS_SITE_URL   adresse du site (par défaut https://www.siamavocat.fr/)

Test en local, sans boîte e-mail :
  python3 tools/mail2blog.py --eml chemin/vers/message.eml
"""
import argparse
import datetime
import email
import email.policy
import email.utils
import hashlib
import html
import imaplib
import io
import os
import pathlib
import re
import smtplib
import sys
from email.message import EmailMessage

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build import slugify  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
POSTS = ROOT / "_src" / "carnets"
COVERS = ROOT / "assets" / "img" / "carnets"
SITE = os.environ.get("CARNETS_SITE_URL", "https://www.siamavocat.fr/").rstrip("/") + "/"

META_KEYS = {
    "categorie": "category", "catégorie": "category", "category": "category", "theme": "category", "thème": "category",
    "langue": "lang", "language": "lang", "lang": "lang",
    "date": "date",
    "resume": "excerpt", "résumé": "excerpt", "chapeau": "excerpt", "excerpt": "excerpt",
}
LANG_WORDS = {"francais": "fr", "français": "fr", "fr": "fr", "arabe": "ar", "ar": "ar", "العربية": "ar",
              "anglais": "en", "english": "en", "en": "en"}


# ---------------------------------------------------------------- Lecture du message

def html_to_text(markup):
    markup = re.sub(r"(?is)<(script|style).*?</\1>", "", markup)
    markup = re.sub(r"(?i)<br\s*/?>", "\n", markup)
    markup = re.sub(r"(?i)</(p|div|h\d|li|blockquote)>", "\n\n", markup)
    markup = re.sub(r"(?i)<li[^>]*>", "- ", markup)
    markup = re.sub(r"<[^>]+>", "", markup)
    return html.unescape(markup)


def body_text(msg):
    text = ""
    for kind in ("plain", "html"):
        part = msg.get_body(preferencelist=(kind,))
        if part is None:
            continue
        text = part.get_content()
        if kind == "html":
            text = html_to_text(text)
        if text.strip():
            break
    text = text.replace("\r\n", "\n").replace("\xa0", " ")
    # Signature et historique de réponse
    text = re.split(r"\n-- ?\n", text)[0]
    text = re.split(r"\n(?:Envoyé de mon|Sent from my|Téléchargez Outlook|Get Outlook)[^\n]*", text)[0]
    text = re.split(r"\nLe .{5,120}a écrit ?:\s*\n", text)[0]
    text = re.split(r"\nOn .{5,120}wrote:\s*\n", text)[0]
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def split_meta(text):
    meta, lines = {}, text.split("\n")
    i = 0
    while i < len(lines) and lines[i].strip():
        m = re.match(r"^\s*([\wÀ-ÿ]+)\s*:\s*(.+?)\s*$", lines[i])
        key = META_KEYS.get(m.group(1).lower()) if m else None
        if not key:
            break
        meta[key] = m.group(2)
        i += 1
    if meta and i < len(lines) and not lines[i].strip():
        return meta, "\n".join(lines[i + 1:]).strip()
    return ({}, text) if not meta else (meta, "\n".join(lines[i:]).strip())


def detect_lang(text):
    letters = re.findall(r"[^\W\d_]", text)
    arabic = [c for c in letters if "؀" <= c <= "ۿ"]
    return "ar" if letters and len(arabic) / len(letters) > 0.3 else "fr"


def first_image(msg):
    for part in msg.iter_attachments():
        if part.get_content_maintype() == "image":
            return part.get_content()
    for part in msg.walk():
        if part.get_content_maintype() == "image" and part.get("Content-ID"):
            return part.get_content()
    return None


def save_cover(data, slug):
    COVERS.mkdir(parents=True, exist_ok=True)
    target = COVERS / f"{slug}.jpg"
    try:
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        im.thumbnail((1600, 1600))
        im.save(target, "JPEG", quality=80, optimize=True, progressive=True)
    except Exception:  # Pillow absent ou image illisible : on garde le fichier tel quel
        target.write_bytes(data)
    return f"assets/img/carnets/{slug}.jpg"


# ---------------------------------------------------------------- Contrôles

def sender_allowed(msg, allowed):
    addr = email.utils.parseaddr(str(msg.get("From", "")))[1].lower()
    if not allowed or addr not in allowed:
        return False, f"expéditeur non autorisé ({addr or 'inconnu'})"
    auth = " ".join(str(h) for h in msg.get_all("Authentication-Results", [])).lower()
    if "dmarc=fail" in auth or ("spf=fail" in auth and "dkim=fail" in auth):
        return False, "authentification de l'expéditeur en échec"
    return True, addr


# ---------------------------------------------------------------- Publication

def existing_post(slug):
    for path in POSTS.glob("*.md"):
        head = path.read_text(encoding="utf-8")[:600]
        if re.search(rf"^slug:\s*{re.escape(slug)}\s*$", head, re.M):
            return path
    return None


def process(msg, allowed, code):
    subject = str(msg.get("Subject", "")).strip()
    ok, who = sender_allowed(msg, allowed)
    if not ok:
        return None, who
    if code:
        if code not in subject:
            return None, "mot secret absent de l'objet"
        subject = subject.replace(code, "").strip()

    command = None
    m = re.match(r"^\[(brouillon|draft|supprimer|delete)\]\s*", subject, re.I)
    if m:
        command = m.group(1).lower()
        subject = subject[m.end():].strip()
    title = re.sub(r"^(re|tr|fwd?)\s*:\s*", "", subject, flags=re.I).strip()
    if not title:
        return None, "objet vide : le titre est obligatoire"

    raw_body = body_text(msg)
    meta, body = split_meta(raw_body)
    lang = LANG_WORDS.get(meta.get("lang", "").strip().lower()) or detect_lang(title + " " + body)
    slug = slugify(title) or "carnet-" + hashlib.sha1(title.encode("utf-8")).hexdigest()[:8]
    found = existing_post(slug)

    if command in ("supprimer", "delete"):
        if not found:
            return None, f"aucun carnet intitulé « {title} »"
        found.unlink()
        cover = COVERS / f"{slug}.jpg"
        if cover.exists():
            cover.unlink()
        return {"title": title, "slug": slug, "action": "supprimé", "to": who}, None

    if len(body) < 40:
        return None, "message trop court pour un article"

    date = meta.get("date") or datetime.date.today().isoformat()
    try:
        datetime.date.fromisoformat(date)
    except ValueError:
        date = datetime.date.today().isoformat()
    image = first_image(msg)
    cover = save_cover(image, slug) if image else None
    if not cover and found:
        old = re.search(r"^cover:\s*(.+)$", found.read_text(encoding="utf-8"), re.M)
        cover = old.group(1).strip() if old else None

    lines = ["---", f"title: {title}", f"slug: {slug}", f"date: {date}",
             f"category: {meta.get('category', 'Carnet').strip()}", f"lang: {lang}"]
    if cover:
        lines.append(f"cover: {cover}")
    if meta.get("excerpt"):
        lines.append(f"excerpt: {meta['excerpt'].strip()}")
    if command in ("brouillon", "draft"):
        lines.append("draft: oui")
    lines += ["---", body, ""]

    target = found or POSTS / f"{date}-{slug}.md"
    if found and not found.name.startswith(date):
        found.unlink()
        target = POSTS / f"{date}-{slug}.md"
    target.write_text("\n".join(lines), encoding="utf-8")
    action = "brouillon" if command in ("brouillon", "draft") else ("mis à jour" if found else "publié")
    return {"title": title, "slug": slug, "action": action, "to": who}, None


def acknowledge(result=None, error=None, to=None, subject=""):
    host = os.environ.get("CARNETS_SMTP_HOST")
    user = os.environ.get("CARNETS_SMTP_USER")
    password = os.environ.get("CARNETS_SMTP_PASSWORD")
    if not (host and user and password and to):
        return
    ack = EmailMessage()
    ack["From"], ack["To"] = user, to
    if result:
        url = f"{SITE}carnets/{result['slug']}.html"
        ack["Subject"] = f"Carnets — « {result['title']} » {result['action']}"
        if result["action"] == "supprimé":
            ack.set_content(f"Le carnet « {result['title']} » a été retiré du site.")
        else:
            ack.set_content(f"Votre carnet « {result['title']} » est {result['action']}.\n\n"
                            f"Il sera en ligne d'ici quelques minutes :\n{url}\n")
    else:
        ack["Subject"] = f"Carnets — message non publié : {subject}"
        ack.set_content(f"Votre message n'a pas été publié : {error}.")
    with smtplib.SMTP(host, 587, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(ack)


def fetch_imap():
    host = os.environ.get("CARNETS_IMAP_HOST")
    user = os.environ.get("CARNETS_IMAP_USER")
    password = os.environ.get("CARNETS_IMAP_PASSWORD")
    if not (host and user and password):
        print("Boîte des Carnets non configurée : rien à faire.")
        return
    box = imaplib.IMAP4_SSL(host)
    box.login(user, password)
    box.select("INBOX")
    _, data = box.search(None, "UNSEEN")
    for num in data[0].split():
        _, raw = box.fetch(num, "(RFC822)")
        box.store(num, "+FLAGS", "\\Seen")
        yield email.message_from_bytes(raw[0][1], policy=email.policy.default)
    box.logout()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--eml", nargs="*", help="traiter des fichiers .eml au lieu de la boîte IMAP")
    args = parser.parse_args()

    allowed = {a.strip().lower() for a in os.environ.get("CARNETS_ALLOWED", "").split(",") if a.strip()}
    code = os.environ.get("CARNETS_CODE", "").strip()
    POSTS.mkdir(parents=True, exist_ok=True)

    if args.eml:
        messages = (email.message_from_bytes(pathlib.Path(p).read_bytes(), policy=email.policy.default) for p in args.eml)
    else:
        messages = fetch_imap() or []

    done = []
    for msg in messages:
        result, error = process(msg, allowed, code)
        sender = email.utils.parseaddr(str(msg.get("From", "")))[1]
        if result:
            print(f"✓ {result['action']} : {result['title']} → carnets/{result['slug']}.html")
            done.append(result)
            acknowledge(result=result, to=result["to"])
        else:
            print(f"✗ ignoré ({error}) : {msg.get('Subject', '')}")
            if error and "non autorisé" not in error and "authentification" not in error:
                acknowledge(error=error, to=sender, subject=str(msg.get("Subject", "")))

    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"changed={'true' if done else 'false'}\n")


if __name__ == "__main__":
    main()

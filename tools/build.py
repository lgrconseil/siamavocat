#!/usr/bin/env python3
"""Assemble le site à partir de _src/ et génère les Carnets (blog).

    python3 tools/build.py

- _src/partials/*.html : blocs communs (en-tête, pied de page…), inclus avec {{> nom}}
- _src/pages/*.html    : pages ; la première ligne porte leurs réglages : <!--meta {...} -->
- _src/carnets/*.md    : articles des Carnets (voir README) → carnets/<slug>.html
"""
import datetime
import html
import json
import pathlib
import re
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_src"
SITE = "https://www.siamavocat.fr/"
REDIRECTS = {"home": "index.html", "about": "cabinet.html", "contact": "index.html#rendez-vous"}

MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
             "août", "septembre", "octobre", "novembre", "décembre"]


def read(path):
    return path.read_text(encoding="utf-8")


PARTIALS = {p.stem: read(p) for p in (SRC / "partials").glob("*.html")}


def typo_fr(page):
    """Espaces insécables de la typographie française, dans le texte seulement."""
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", page, flags=re.S)
    for i in range(0, len(parts), 2):
        t = parts[i]
        t = re.sub(r" ([?!:;»])", "\u00a0\\1", t)
        t = re.sub(r"« ", "«\u00a0", t)
        parts[i] = t
    return "".join(parts)


def render(tpl, ctx):
    tpl = re.sub(r"{{>\s*([\w-]+)\s*}}", lambda m: render(PARTIALS[m.group(1)], ctx), tpl)
    return re.sub(r"{{\s*([\w.]+)\s*}}", lambda m: str(ctx.get(m.group(1), "")), tpl)


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:70].rstrip("-")


def date_fr(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {MONTHS_FR[d.month - 1]} {d.year}"


# ---------------------------------------------------------------- Markdown léger

def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)

    def link(m):
        label, url = m.group(1), m.group(2)
        if not re.match(r"^(https?://|mailto:|tel:|/|\.\./|[\w-]+\.html)", url):
            return label
        ext = ' target="_blank" rel="noopener"' if url.startswith("http") else ""
        return f'<a href="{html.escape(url)}"{ext}>{label}</a>'

    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, text)


def markdown(text, first_dropcap=True):
    out, lines, i = [], text.strip().splitlines(), 0
    blocks, buf = [], []
    # Découpe en blocs, en gardant ensemble les encadrés ::: … :::
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith(":::") and line.strip() != ":::":
            if buf:
                blocks.append(("p", buf)); buf = []
            title = line.strip()[3:].strip()
            inner = []
            i += 1
            while i < len(lines) and lines[i].strip() != ":::":
                inner.append(lines[i]); i += 1
            blocks.append(("box", (title, "\n".join(inner))))
        elif not line.strip():
            if buf:
                blocks.append(("p", buf)); buf = []
        else:
            buf.append(line)
        i += 1
    if buf:
        blocks.append(("p", buf))

    dropcap_done = not first_dropcap
    for kind, content in blocks:
        if kind == "box":
            title, inner = content
            kind_word, _, custom = title.partition(" ")
            if custom:
                head = f'<p class="law-box-title">{inline(custom)}</p>'
            else:
                head = '<p class="law-box-title" data-i18n="post.lawBox">Le point de droit</p>'
            out.append(f'<aside class="law-box">{head}{markdown(inner, False)}</aside>')
            continue
        first = content[0].strip()
        joined = " ".join(l.strip() for l in content)
        if first.startswith("### "):
            out.append(f"<h3>{inline(first[4:])}</h3>")
        elif first.startswith("## "):
            out.append(f"<h2>{inline(first[3:])}</h2>")
        elif all(l.strip().startswith(("- ", "* ")) for l in content):
            items = "".join(f"<li>{inline(l.strip()[2:])}</li>" for l in content)
            out.append(f"<ul>{items}</ul>")
        elif first.startswith(">"):
            quote = " ".join(l.strip().lstrip(">").strip() for l in content)
            out.append(f'<blockquote class="pull"><p>{inline(quote)}</p></blockquote>')
        elif joined.startswith("«") and joined.endswith("»"):
            out.append(f'<blockquote class="pull"><p>{inline(joined[1:-1].strip())}</p></blockquote>')
        else:
            cls = ""
            if not dropcap_done:
                cls, dropcap_done = ' class="dropcap"', True
            out.append(f"<p{cls}>{inline(joined)}</p>")
    return "\n".join(out)


# ---------------------------------------------------------------- Carnets

def parse_post(path):
    raw = read(path)
    meta, body = {}, raw
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip()
        body = m.group(2)
    meta.setdefault("title", path.stem)
    meta.setdefault("date", datetime.date.today().isoformat())
    meta.setdefault("lang", "fr")
    meta.setdefault("category", "Carnet")
    meta["slug"] = meta.get("slug") or slugify(meta["title"]) or path.stem
    meta["draft"] = meta.get("draft", "").lower() in ("oui", "yes", "true", "1")
    meta["sample"] = meta.get("exemple", "").lower() in ("oui", "yes", "true", "1")
    meta["body"] = body
    words = len(re.findall(r"\w+", body))
    meta["minutes"] = max(1, round(words / 210))
    if not meta.get("excerpt"):
        paras = [p for p in re.split(r"\n\s*\n", body) if p.strip() and not p.strip().startswith(("#", ">", ":::", "«"))]
        first = re.sub(r"[*_\[\]]|\(http[^)]*\)", "", paras[0] if paras else "").strip()
        meta["excerpt"] = first if len(first) <= 190 else first[:185].rsplit(" ", 1)[0] + "…"
    return meta


def lang_attrs(lang):
    return f' lang="{lang}"' + (' dir="rtl"' if lang == "ar" else "")


def card(post, root, extra_class=""):
    cover = post.get("cover") or "assets/img/palais-plaque.jpg"
    cat_slug = slugify(post["category"])
    sample = ' <span class="sample-pill" data-i18n="post.sample">Texte d\'exemple</span>' if post["sample"] else ""
    la = lang_attrs(post["lang"])
    return f"""<article class="carnet-card reveal{extra_class}" data-cat="{cat_slug}">
  <a class="carnet-link" href="{root}carnets/{post['slug']}.html">
    <figure class="carnet-cover"><img src="{root}{cover}" alt="" width="900" height="1200" loading="lazy"></figure>
    <div class="carnet-body">
      <p class="carnet-meta"><span class="carnet-cat" data-i18n="cat.{cat_slug}">{html.escape(post['category'])}</span><span class="dot">·</span><time datetime="{post['date']}" data-date>{date_fr(post['date'])}</time>{sample}</p>
      <h3{la}>{html.escape(post['title'])}</h3>
      <p class="carnet-excerpt"{la}>{html.escape(post['excerpt'])}</p>
      <span class="more"><span data-i18n="post.read">Lire le carnet</span> <svg class="arrow" aria-hidden="true"><use href="#i-arrow"/></svg></span>
    </div>
  </a>
</article>"""


def filters(posts):
    cats = []
    for p in posts:
        if p["category"] not in [c for c, _ in cats]:
            cats.append((p["category"], slugify(p["category"])))
    chips = ['<button type="button" class="filter is-active" data-filter="*" data-i18n="post.all">Tous les carnets</button>']
    chips += [f'<button type="button" class="filter" data-filter="{s}" data-i18n="cat.{s}">{html.escape(c)}</button>' for c, s in cats]
    return "\n".join(chips)


# ---------------------------------------------------------------- Pages

def post_jsonld(post):
    """Données structurées d'un carnet (schema.org BlogPosting)."""
    url = f"{SITE}carnets/{post['slug']}.html"
    data = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["excerpt"],
        "datePublished": post["date"],
        "inLanguage": "ar" if post["lang"] == "ar" else "fr-FR",
        "articleSection": post["category"],
        "image": SITE + (post.get("cover") or "assets/img/palais-plaque.jpg"),
        "mainEntityOfPage": url,
        "url": url,
        "author": {"@type": "Person", "name": "Essra Siam", "jobTitle": "Avocate au Barreau de Paris",
                   "url": SITE + "cabinet.html"},
        "publisher": {"@type": "Attorney", "name": "Cabinet Essra Siam", "url": SITE,
                      "logo": {"@type": "ImageObject", "url": SITE + "assets/img/embleme.png"}},
    }
    text = json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/")
    return f'<script type="application/ld+json">\n{text}\n</script>'


def page_ctx(meta, root):
    ctx = {
        "root": root,
        "title": html.escape(meta.get("title", "")),
        "titleKey": meta.get("titleKey", ""),
        "desc": html.escape(meta.get("desc", "")),
        "canonical": SITE + meta.get("path", ""),
        "ogimage": SITE + "assets/img/og-image.jpg",
        "body_class": meta.get("bodyClass", ""),
        "rdv": "#rendez-vous" if meta.get("active") == "home" else root + "index.html#rendez-vous",
        "acces": "#acces" if meta.get("active") == "home" else root + "index.html#acces",
        "year": datetime.date.today().year,
        "robots_meta": '\n  <meta name="robots" content="noindex">' if meta.get("noindex") else "",
    }
    for key in ("home", "cabinet", "domaines", "carnets", "parole"):
        ctx["cur_" + key] = ' aria-current="page"' if meta.get("active") == key else ""
    ctx["doors"] = render(PARTIALS["doors"], ctx) if meta.get("doors") else ""
    ctx["doors_flag"] = "1" if meta.get("doors") else "0"
    return ctx


def build():
    posts = [parse_post(p) for p in sorted((SRC / "carnets").glob("*.md"))]
    posts.sort(key=lambda p: p["date"], reverse=True)
    public = [p for p in posts if not p["draft"]]

    written = []
    for src in sorted((SRC / "pages").glob("*.html")):
        raw = read(src)
        m = re.match(r"^<!--meta\s+(\{.*?\})\s*-->\s*\n", raw, re.S)
        meta = json.loads(m.group(1)) if m else {}
        body = raw[m.end():] if m else raw
        # « root » : chemins absolus pour la page 404, servie à n'importe quelle profondeur
        ctx = page_ctx(meta, meta.get("root", ""))
        ctx["carnets_latest"] = "\n".join(card(p, "") for p in public[:3])
        ctx["carnets_all"] = "\n".join(card(p, "") for p in public)
        ctx["carnets_filters"] = filters(public)
        out = typo_fr(render(PARTIALS["layout"].replace("{{content}}", body), ctx))
        (ROOT / src.name).write_text(out, encoding="utf-8")
        written.append(src.name)

    out_dir = ROOT / "carnets"
    out_dir.mkdir(exist_ok=True)
    for old in out_dir.glob("*.html"):
        old.unlink()
    tpl = read(SRC / "templates" / "post.html")
    for i, post in enumerate(posts):
        meta = {"title": f"{post['title']} — Carnets de Maître Essra Siam", "desc": post["excerpt"],
                "path": f"carnets/{post['slug']}.html", "active": "carnets",
                "noindex": post["sample"] or post["draft"]}
        ctx = page_ctx(meta, "../")
        cat_slug = slugify(post["category"])
        others = [p for p in public if p["slug"] != post["slug"]][:2]
        ctx.update({
            "post_title": html.escape(post["title"]),
            "post_title_raw": post["title"],
            "post_lang": post["lang"],
            "post_langattrs": lang_attrs(post["lang"]),
            "post_date": post["date"],
            "post_date_fr": date_fr(post["date"]),
            "post_category": html.escape(post["category"]),
            "post_catslug": cat_slug,
            "post_minutes": post["minutes"],
            "post_cover": post.get("cover") or "assets/img/palais-plaque.jpg",
            "post_excerpt": html.escape(post["excerpt"]),
            "post_content": markdown(post["body"], post["lang"] != "ar"),
            "post_sample": '<span class="sample-pill" data-i18n="post.sample">Texte d\'exemple</span>' if post["sample"] else "",
            "post_wa": html.escape(f"Bonjour Maître Siam, je viens de lire votre carnet « {post['title']} » et je souhaiterais vous consulter.", quote=True),
            "post_more": "\n".join(card(p, "../") for p in others),
            "post_jsonld": post_jsonld(post),
        })
        out = typo_fr(render(PARTIALS["layout"].replace("{{content}}", tpl), ctx))
        (out_dir / f"{post['slug']}.html").write_text(out, encoding="utf-8")
        written.append(f"carnets/{post['slug']}.html" + (" (brouillon)" if post["draft"] else ""))

    # Plan du site et robots.txt : pages publiques et carnets validés uniquement
    urls = [SITE + ("" if name == "index.html" else name) for name in written
            if name.endswith(".html") and "/" not in name and name != "404.html"]
    urls += [f"{SITE}carnets/{p['slug']}.html" for p in public if not p["sample"]]
    lastmod = {f"{SITE}carnets/{p['slug']}.html": p["date"] for p in public}
    items = "".join(f"  <url><loc>{u}</loc>" + (f"<lastmod>{lastmod[u]}</lastmod>" if u in lastmod else "") + "</url>\n"
                    for u in urls)
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      f"{items}</urlset>\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    written.append(f"sitemap.xml ({len(urls)} adresses)")

    # Anciennes adresses du site (Squarespace) : les liens et favoris continuent de fonctionner
    for old, new in REDIRECTS.items():
        (ROOT / f"{old}.html").write_text(
            '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8">'
            '<meta name="robots" content="noindex">'
            f'<title>Maître Essra Siam — Avocate au Barreau de Paris</title>'
            f'<link rel="canonical" href="{SITE}{new.split("#")[0]}">'
            f'<meta http-equiv="refresh" content="0; url={new}">'
            f'<script>location.replace("{new}")</script>'
            '</head><body style="background:#f6f1e8"></body></html>\n', encoding="utf-8")
        written.append(f"{old}.html → {new}")
    return written


if __name__ == "__main__":
    for name in build():
        print("✓", name)

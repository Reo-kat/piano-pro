#!/usr/bin/env python3
"""Remplace l'adresse provisoire par l'adresse réelle du site.
Usage :  python3 definir-url.py https://VOTRE-NOM.github.io/piano-pro/
"""
import sys, pathlib
if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
    sys.exit("Usage : python3 definir-url.py https://VOTRE-NOM.github.io/piano-pro/")
new = sys.argv[1].rstrip("/") + "/"
old = "https://VOTRE-UTILISATEUR.github.io/piano-pro/"
n = 0
for name in ("index.html", "robots.txt", "sitemap.xml"):
    p = pathlib.Path(__file__).with_name(name)
    t = p.read_text(encoding="utf-8")
    n += t.count(old)
    p.write_text(t.replace(old, new), encoding="utf-8")
print(f"{n} occurrence(s) remplacée(s) par {new}")

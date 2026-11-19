"""Génère la migration du catalogue CS2 (type Hellcase) à partir d'un pool de skins.

Usage :
    curl -L -o skins.json https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
    python3 -I scripts/gen_catalogue.py skins.json > migrations/<horodatage>_catalogue.sql

Les noms, grades et images viennent du jeu de données ; les prix (POOL) sont
estimés à la main en crédits (1 crédit = 0,01 €). Pour chaque caisse, les
poids sont calculés pour totaliser 100 000 et rendre ~88 % du prix en moyenne ;
le script s'arrête si une caisse sort de 85-92 %.

Une migration déjà appliquée ne doit pas être modifiée : pour changer le
catalogue, générer une nouvelle migration.
"""
import json
import sys

skins = json.load(open(sys.argv[1]))
by_name = {s["name"]: s for s in skins}

GRADE = {
    "Consumer Grade": "common", "Industrial Grade": "common", "Mil-Spec Grade": "common",
    "Restricted": "rare", "Classified": "epic", "Covert": "legendary",
    "Contraband": "legendary", "Extraordinary": "mythic",
}

# (nom, usure, stattrak, prix en crédits = centimes d'euro, catégorie)
POOL = [
    # Mil-Spec et moins
    ("P250 | Sand Dune", "FT", False, 3, "pistol"),
    ("MP9 | Sand Dashed", "FT", False, 4, "smg"),
    ("Galil AR | Sage Spray", "FT", False, 4, "rifle"),
    ("Nova | Predator", "FT", False, 5, "shotgun"),
    ("SG 553 | Waves Perforated", "FT", False, 5, "rifle"),
    ("P2000 | Granite Marbleized", "FN", False, 15, "pistol"),
    ("MAC-10 | Candy Apple", "FN", False, 30, "smg"),
    ("Glock-18 | Candy Apple", "FN", False, 40, "pistol"),
    ("Tec-9 | Isaac", "FT", False, 12, "pistol"),
    ("AK-47 | Elite Build", "FT", False, 80, "rifle"),
    # Restricted
    ("Five-SeveN | Monkey Business", "FT", False, 100, "pistol"),
    ("USP-S | Cortex", "FT", False, 150, "pistol"),
    ("Glock-18 | Water Elemental", "FT", False, 200, "pistol"),
    ("Glock-18 | Water Elemental", "FT", True, 600, "pistol"),
    ("Desert Eagle | Mecha Industries", "FT", False, 250, "pistol"),
    ("P90 | Asiimov", "FT", False, 350, "smg"),
    ("AWP | Atheris", "FT", False, 350, "sniper"),
    ("MAC-10 | Neon Rider", "FT", False, 400, "smg"),
    ("Five-SeveN | Hyper Beast", "FT", False, 500, "pistol"),
    ("M4A4 | Desolate Space", "FT", False, 900, "rifle"),
    # Classified
    ("M4A1-S | Hyper Beast", "FT", False, 1300, "rifle"),
    ("AK-47 | Redline", "FT", False, 1500, "rifle"),
    ("AK-47 | Redline", "FT", True, 4000, "rifle"),
    ("AWP | Hyper Beast", "FT", False, 1500, "sniper"),
    ("Desert Eagle | Code Red", "FT", False, 2000, "pistol"),
    ("AWP | Neo-Noir", "FT", False, 2000, "sniper"),
    ("USP-S | Kill Confirmed", "FT", False, 3000, "pistol"),
    ("USP-S | Kill Confirmed", "FT", True, 9000, "pistol"),
    ("AK-47 | Bloodsport", "FT", False, 3500, "rifle"),
    # Covert
    ("Desert Eagle | Printstream", "FT", False, 2800, "pistol"),
    ("AK-47 | Asiimov", "FT", False, 3500, "rifle"),
    ("USP-S | Printstream", "FT", False, 4800, "pistol"),
    ("AWP | Asiimov", "FT", False, 6000, "sniper"),
    ("AWP | Asiimov", "FT", True, 15000, "sniper"),
    ("M4A1-S | Printstream", "FT", False, 8000, "rifle"),
    ("M4A4 | The Emperor", "FT", False, 12000, "rifle"),
    ("AK-47 | Inheritance", "FT", False, 18000, "rifle"),
    ("Desert Eagle | Blaze", "FN", False, 50000, "pistol"),
    ("AK-47 | Fire Serpent", "FT", False, 50000, "rifle"),
    ("M4A4 | Howl", "FT", False, 300000, "rifle"),
    ("AK-47 | Wild Lotus", "FT", False, 500000, "rifle"),
    ("AWP | Gungnir", "FT", False, 600000, "sniper"),
    ("AWP | Dragon Lore", "FT", False, 800000, "sniper"),
    # Couteaux
    ("★ Navaja Knife | Urban Masked", "FT", False, 5000, "knife"),
    ("★ Gut Knife | Safari Mesh", "FT", False, 6000, "knife"),
    ("★ Shadow Daggers | Safari Mesh", "FT", False, 7000, "knife"),
    ("★ Huntsman Knife | Crimson Web", "FT", False, 20000, "knife"),
    ("★ Falchion Knife | Slaughter", "FN", False, 25000, "knife"),
    ("★ Bayonet | Tiger Tooth", "FN", False, 45000, "knife"),
    ("★ M9 Bayonet | Marble Fade", "FN", False, 90000, "knife"),
    ("★ Karambit | Fade", "FN", False, 120000, "knife"),
    ("★ Butterfly Knife | Doppler", "FN", False, 150000, "knife"),
    # Gants
    ("★ Hand Wraps | Spruce DDPAT", "FT", False, 6000, "gloves"),
    ("★ Hydra Gloves | Emerald", "FT", False, 9000, "gloves"),
    ("★ Moto Gloves | Polygon", "FT", False, 12000, "gloves"),
    ("★ Broken Fang Gloves | Jade", "FT", False, 15000, "gloves"),
    ("★ Driver Gloves | King Snake", "FT", False, 30000, "gloves"),
    ("★ Specialist Gloves | Crimson Kimono", "FT", False, 80000, "gloves"),
    ("★ Sport Gloves | Pandora's Box", "FT", False, 250000, "gloves"),
]

def key(name, wear, st):
    return (name, wear, st)

CATEGORIES = [
    ("00000000-0000-4000-8000-000000000001", "HeavenCases", "heavencases", 1),
    ("00000000-0000-4000-8000-000000000002", "Armes", "armes", 2),
    ("00000000-0000-4000-8000-000000000003", "Couteaux et gants", "couteaux-gants", 3),
]

# (id suffixe, nom, slug, prix, catégorie, contenu)
def K(name, wear="FT", st=False):
    return key(name, wear, st)

CASES = [
    (204, "Cloud Case", "cloud", 50, 1, [
        K("P250 | Sand Dune"), K("MP9 | Sand Dashed"), K("Galil AR | Sage Spray"), K("Nova | Predator"),
        K("SG 553 | Waves Perforated"), K("P2000 | Granite Marbleized", "FN"), K("MAC-10 | Candy Apple", "FN"),
        K("Glock-18 | Candy Apple", "FN"), K("Tec-9 | Isaac"), K("AK-47 | Elite Build"),
        K("USP-S | Cortex"), K("Glock-18 | Water Elemental"), K("AK-47 | Redline"),
    ]),
    (201, "Heaven Case", "heaven", 150, 1, [
        K("Nova | Predator"), K("P2000 | Granite Marbleized", "FN"), K("MAC-10 | Candy Apple", "FN"),
        K("Glock-18 | Candy Apple", "FN"), K("AK-47 | Elite Build"), K("Five-SeveN | Monkey Business"),
        K("USP-S | Cortex"), K("Glock-18 | Water Elemental"), K("P90 | Asiimov"), K("MAC-10 | Neon Rider"),
        K("AK-47 | Redline"), K("USP-S | Printstream"), K("AWP | Asiimov"),
    ]),
    (202, "Olympus Case", "olympus", 250, 1, [
        K("MAC-10 | Candy Apple", "FN"), K("Glock-18 | Candy Apple", "FN"), K("AK-47 | Elite Build"),
        K("Five-SeveN | Monkey Business"), K("USP-S | Cortex"), K("Desert Eagle | Mecha Industries"),
        K("AWP | Atheris"), K("Five-SeveN | Hyper Beast"), K("M4A1-S | Hyper Beast"), K("AK-47 | Redline"),
        K("Desert Eagle | Printstream"), K("M4A4 | The Emperor"), K("★ Gut Knife | Safari Mesh"),
    ]),
    (205, "Celestial Case", "celestial", 300, 1, [
        K("Glock-18 | Candy Apple", "FN"), K("AK-47 | Elite Build"), K("USP-S | Cortex"),
        K("Glock-18 | Water Elemental"), K("P90 | Asiimov"), K("MAC-10 | Neon Rider"),
        K("M4A4 | Desolate Space"), K("AWP | Hyper Beast"), K("Desert Eagle | Code Red"),
        K("Desert Eagle | Printstream"), K("USP-S | Printstream"), K("AK-47 | Inheritance"),
        K("★ Karambit | Fade", "FN"),
    ]),
    (206, "Divine Case", "divine", 500, 1, [
        K("AK-47 | Elite Build"), K("Glock-18 | Water Elemental"), K("Desert Eagle | Mecha Industries"),
        K("AWP | Atheris"), K("Five-SeveN | Hyper Beast"), K("M4A4 | Desolate Space"),
        K("M4A1-S | Hyper Beast"), K("AWP | Neo-Noir"), K("USP-S | Kill Confirmed"), K("AK-47 | Asiimov"),
        K("M4A1-S | Printstream"), K("M4A4 | The Emperor"), K("★ Bayonet | Tiger Tooth", "FN"),
        K("★ Sport Gloves | Pandora's Box"),
    ]),
    (207, "Godlike Case", "godlike", 1200, 1, [
        K("Five-SeveN | Hyper Beast"), K("M4A4 | Desolate Space"), K("AK-47 | Redline"),
        K("Desert Eagle | Code Red"), K("AK-47 | Bloodsport"), K("USP-S | Printstream"),
        K("AWP | Asiimov"), K("M4A1-S | Printstream"), K("AK-47 | Inheritance"),
        K("AK-47 | Fire Serpent"), K("★ Karambit | Fade", "FN"), K("★ Butterfly Knife | Doppler", "FN"),
        K("AWP | Dragon Lore"),
    ]),
    (203, "Empyrean Case", "empyrean", 2500, 1, [
        K("M4A1-S | Hyper Beast"), K("AK-47 | Redline"), K("Desert Eagle | Code Red"),
        K("AK-47 | Redline", "FT", True), K("USP-S | Kill Confirmed"), K("AK-47 | Bloodsport"),
        K("AWP | Asiimov"), K("USP-S | Kill Confirmed", "FT", True), K("M4A4 | The Emperor"),
        K("AWP | Asiimov", "FT", True), K("AK-47 | Inheritance"), K("★ Driver Gloves | King Snake"),
        K("Desert Eagle | Blaze", "FN"), K("★ M9 Bayonet | Marble Fade", "FN"), K("M4A4 | Howl"),
        K("AWP | Gungnir"),
    ]),
    (208, "Pantheon Case", "pantheon", 10000, 1, [
        K("USP-S | Kill Confirmed", "FT", True), K("M4A1-S | Printstream"), K("M4A4 | The Emperor"),
        K("AWP | Asiimov", "FT", True), K("AK-47 | Inheritance"), K("★ Huntsman Knife | Crimson Web"),
        K("★ Driver Gloves | King Snake"), K("Desert Eagle | Blaze", "FN"), K("AK-47 | Fire Serpent"),
        K("★ Specialist Gloves | Crimson Kimono"), K("★ Karambit | Fade", "FN"),
        K("★ Sport Gloves | Pandora's Box"), K("AK-47 | Wild Lotus"), K("AWP | Dragon Lore"),
    ]),
    (209, "AK-47 Case", "ak-47", 800, 2, [
        K("Galil AR | Sage Spray"), K("AK-47 | Elite Build"), K("AK-47 | Redline"),
        K("AK-47 | Asiimov"), K("AK-47 | Bloodsport"), K("AK-47 | Redline", "FT", True),
        K("AK-47 | Inheritance"), K("AK-47 | Fire Serpent"), K("AK-47 | Wild Lotus"),
    ]),
    (210, "AWP Case", "awp", 1500, 2, [
        K("SG 553 | Waves Perforated"), K("AWP | Atheris"), K("AWP | Hyper Beast"), K("AWP | Neo-Noir"),
        K("AWP | Asiimov"), K("AWP | Asiimov", "FT", True), K("AWP | Gungnir"), K("AWP | Dragon Lore"),
    ]),
    (211, "Desert Eagle Case", "desert-eagle", 400, 2, [
        K("P250 | Sand Dune"), K("P2000 | Granite Marbleized", "FN"), K("Tec-9 | Isaac"),
        K("Desert Eagle | Mecha Industries"), K("Five-SeveN | Hyper Beast"), K("Desert Eagle | Code Red"),
        K("Desert Eagle | Printstream"), K("USP-S | Printstream"), K("Desert Eagle | Blaze", "FN"),
    ]),
    (212, "Knife Case", "knife", 8000, 3, [
        K("AK-47 | Bloodsport"), K("AWP | Asiimov"), K("★ Navaja Knife | Urban Masked"),
        K("★ Gut Knife | Safari Mesh"), K("★ Shadow Daggers | Safari Mesh"),
        K("★ Huntsman Knife | Crimson Web"), K("★ Falchion Knife | Slaughter", "FN"),
        K("★ Bayonet | Tiger Tooth", "FN"), K("★ M9 Bayonet | Marble Fade", "FN"),
        K("★ Karambit | Fade", "FN"), K("★ Butterfly Knife | Doppler", "FN"),
    ]),
    (213, "Gloves Case", "gloves", 6000, 3, [
        K("USP-S | Kill Confirmed"), K("M4A1-S | Printstream"), K("★ Hand Wraps | Spruce DDPAT"),
        K("★ Hydra Gloves | Emerald"), K("★ Moto Gloves | Polygon"), K("★ Broken Fang Gloves | Jade"),
        K("★ Driver Gloves | King Snake"), K("★ Specialist Gloves | Crimson Kimono"),
        K("★ Sport Gloves | Pandora's Box"),
    ]),
]

TARGET = 0.88   # part du prix rendue en moyenne
TOTAL = 100_000


def weights_for(values, price):
    """Poids ∝ valeur^-a, avec a choisi pour que l'espérance vaille TARGET × prix."""
    def ev(a):
        raw = [v ** -a for v in values]
        s = sum(raw)
        return sum(v * r / s for v, r in zip(values, raw))
    lo, hi = 0.0, 6.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if ev(mid) > TARGET * price:
            lo = mid
        else:
            hi = mid
    a = (lo + hi) / 2
    raw = [v ** -a for v in values]
    s = sum(raw)
    w = [max(1, round(TOTAL * r / s)) for r in raw]
    # Ajuste l'arrondi sur l'objet le plus probable pour totaliser exactement 100 000.
    w[w.index(max(w))] += TOTAL - sum(w)
    return w


pool = {}
for name, wear, st, price, cat in POOL:
    src = by_name.get(name)
    if src is None:
        sys.exit(f"skin introuvable dans le jeu de données : {name}")
    grade = src["rarity"]["name"]
    rarity = "mythic" if name.startswith("★") else GRADE[grade]
    pool[key(name, wear, st)] = dict(name=name, wear=wear, st=st, value=price, cat=cat,
                                     rarity=rarity, image=src["image"])

# Les 10 premiers objets réutilisent les ids des objets de démo existants (101-110).
ids = {}
for n, k in enumerate(pool, start=101):
    ids[k] = f"00000000-0000-4000-8000-{n:012d}"

used = {k for c in CASES for k in c[5]}
missing = used - set(pool)
if missing:
    sys.exit(f"objets de caisse absents du pool : {missing}")

def q(s):
    return "'" + s.replace("'", "''") + "'"

out = []
w = out.append
w("-- =========================================================")
w("-- Catalogue CS2 sur le modèle de Hellcase (HENC-57)")
w("-- =========================================================")
w("-- Généré par un script : noms, grades et images des skins issus du jeu de")
w("-- données public ByMykel/CSGO-API (images hébergées par Steam), prix estimés")
w("-- en crédits (1 crédit = 0,01 €). Probabilités calculées pour que chaque")
w("-- caisse totalise 100 000 et rende en moyenne ~88 % de son prix.")
w("")
w("-- Usure (FN, MW, FT, WW, BS) et StatTrak™ de chaque skin")
w("ALTER TABLE items ADD COLUMN exterior TEXT CHECK (exterior IN ('FN', 'MW', 'FT', 'WW', 'BS'));")
w("ALTER TABLE items ADD COLUMN stattrak BOOLEAN NOT NULL DEFAULT false;")
w("")
w("-- Ordre d'affichage des sections du catalogue")
w("ALTER TABLE case_categories ADD COLUMN position INT NOT NULL DEFAULT 0;")
w("")
w("UPDATE case_categories SET name = 'HeavenCases', slug = 'heavencases', position = 1")
w("WHERE id = '00000000-0000-4000-8000-000000000001';")
w("INSERT INTO case_categories (id, name, slug, position) VALUES")
w(",\n".join(f"    ({q(cid)}, {q(n)}, {q(s)}, {p})" for cid, n, s, p in CATEGORIES[1:]) + ";")
w("")
w("-- Les anciennes tables de butin des caisses de démo sont remplacées.")
w("DELETE FROM case_items WHERE case_id IN (")
w("    '00000000-0000-4000-8000-000000000201',")
w("    '00000000-0000-4000-8000-000000000202',")
w("    '00000000-0000-4000-8000-000000000203');")
w("")
w("-- Skins : les ids 101 à 110 existent déjà (objets de démo), les autres sont créés.")
w("INSERT INTO items (id, name, rarity, value, category, image_url, exterior, stattrak) VALUES")
rows = []
for k, it in pool.items():
    rows.append(f"    ({q(ids[k])}, {q(it['name'])}, {q(it['rarity'])}, {it['value']}, {q(it['cat'])}, "
                f"{q(it['image'])}, {q(it['wear'])}, {'true' if it['st'] else 'false'})")
w(",\n".join(rows))
w("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rarity = EXCLUDED.rarity, value = EXCLUDED.value,")
w("    category = EXCLUDED.category, image_url = EXCLUDED.image_url, exterior = EXCLUDED.exterior,")
w("    stattrak = EXCLUDED.stattrak;")
w("")
w("-- Caisses : 201 à 203 existent déjà, les autres sont créées. Pas de description.")
w("INSERT INTO cases (id, name, slug, price, category_id, description) VALUES")
crow = []
for cid, name, slug, price, cat, _ in CASES:
    crow.append(f"    ('00000000-0000-4000-8000-{cid:012d}', {q(name)}, {q(slug)}, {price}, "
                f"'00000000-0000-4000-8000-{cat:012d}', NULL)")
w(",\n".join(crow))
w("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, price = EXCLUDED.price,")
w("    category_id = EXCLUDED.category_id, description = NULL;")
w("")
w("INSERT INTO case_items (case_id, item_id, drop_weight) VALUES")
report = []
lines = []
for cid, name, slug, price, cat, content in CASES:
    values = [pool[k]["value"] for k in content]
    ws = weights_for(values, price)
    ev = sum(v * x for v, x in zip(values, ws)) / TOTAL
    assert sum(ws) == TOTAL, name
    if not 0.85 <= ev / price <= 0.92:
        sys.exit(f"{name} : retour {ev / price:.1%} hors de 85-92 %")
    report.append(f"-- {name:18} {price:>6} crédits  {len(content):>2} skins  retour {ev / price:.1%}")
    for k, x in zip(content, ws):
        lines.append(f"    ('00000000-0000-4000-8000-{cid:012d}', {q(ids[k])}, {x})")
w(",\n".join(lines) + ";")
w("")
w("-- Récapitulatif")
out.extend(report)
print("\n".join(out))

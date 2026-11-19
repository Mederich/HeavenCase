-- =========================================================
-- Catalogue de démo : passage aux skins CS2 (HENC-57)
-- =========================================================
-- Les 10 objets et les 3 caisses de la migration 20261119090000 avaient des
-- noms inventés. On les remplace par des skins CS2 et par les noms de caisses
-- de la maquette, sans toucher aux ids, valeurs, raretés ni probabilités :
-- les tables de butin et les ouvertures déjà faites restent valides.

UPDATE items AS i SET name = v.name, category = v.category
FROM (VALUES
    ('00000000-0000-4000-8000-000000000101'::uuid, 'MAC-10 | Candy Apple',        'smg'),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'P2000 | Granite Marbleized',  'pistol'),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'Galil AR | Sage Spray',       'rifle'),
    ('00000000-0000-4000-8000-000000000104'::uuid, 'Glock-18 | Water Elemental',  'pistol'),
    ('00000000-0000-4000-8000-000000000105'::uuid, 'MAC-10 | Neon Rider',         'smg'),
    ('00000000-0000-4000-8000-000000000106'::uuid, 'AK-47 | Redline',             'rifle'),
    ('00000000-0000-4000-8000-000000000107'::uuid, 'Desert Eagle | Printstream',  'pistol'),
    ('00000000-0000-4000-8000-000000000108'::uuid, 'M4A1-S | Printstream',        'rifle'),
    ('00000000-0000-4000-8000-000000000109'::uuid, 'AK-47 | Inheritance',         'rifle'),
    ('00000000-0000-4000-8000-000000000110'::uuid, '★ Karambit | Fade',           'knife')
) AS v(id, name, category)
WHERE i.id = v.id;

UPDATE cases AS c SET name = v.name, slug = v.slug, description = v.description
FROM (VALUES
    ('00000000-0000-4000-8000-000000000201'::uuid, 'Heaven Case',   'heaven',
     'La caisse d''entrée : pistolets et SMG, jusqu''à l''AK-47 | Redline.'),
    ('00000000-0000-4000-8000-000000000202'::uuid, 'Olympus Case',  'olympus',
     'Pour viser plus haut : Neon Rider, Redline et jusqu''au M4A1-S | Printstream.'),
    ('00000000-0000-4000-8000-000000000203'::uuid, 'Empyrean Case', 'empyrean',
     'AK-47 | Inheritance en Covert et la première chance de tomber sur le ★ Karambit | Fade.')
) AS v(id, name, slug, description)
WHERE c.id = v.id;

UPDATE case_categories SET name = 'CS2', slug = 'cs2'
WHERE id = '00000000-0000-4000-8000-000000000001';

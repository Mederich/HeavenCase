#!/usr/bin/env python3
"""Render the checked-in PlantUML sources locally; never sends diagrams to a server."""
import argparse, json, os, shutil, subprocess, sys
from pathlib import Path

root=Path(__file__).resolve().parent
ap=argparse.ArgumentParser(description=__doc__)
ap.add_argument('--plantuml',default=os.environ.get('PLANTUML_JAR'),help='Path to PlantUML JAR (tested: 1.2026.9)')
ap.add_argument('--java',default=os.environ.get('JAVA_BIN') or shutil.which('java'),help='Java executable (tested: Temurin 21)')
ap.add_argument('--format',choices=['both','svg','png'],default='both')
ap.add_argument('--check-only',action='store_true')
args=ap.parse_args()
if not args.plantuml or not args.java:ap.error('Provide --plantuml and --java, or PLANTUML_JAR and JAVA_BIN.')
manifest=json.loads((root/'manifest.json').read_text())
sources=[str(root/d['source']) for d in manifest['diagrams']]
common=[args.java,'-Xmx1536m','-Djava.awt.headless=true','-DPLANTUML_LIMIT_SIZE=20000','-jar',str(Path(args.plantuml).resolve()),'-charset','UTF-8']
result=subprocess.run(common+['--check-syntax']+sources,cwd=root/'src')
if result.returncode:sys.exit(result.returncode)
print(json.dumps({'syntax':'ok','diagrams':len(sources)}),flush=True)
if args.check_only:sys.exit(0)
for fmt in (['svg','png'] if args.format=='both' else [args.format]):
    out=root/fmt
    out.mkdir(exist_ok=True)
    result=subprocess.run(common+['-nbthread','2','-failfast2','-t'+fmt,'-o',str(out)]+sources,cwd=root/'src')
    if result.returncode:sys.exit(result.returncode)
    missing=[d['slug'] for d in manifest['diagrams'] if not (root/d[fmt]).is_file()]
    if missing:raise RuntimeError(f'Missing {fmt}: {missing}')
    print(json.dumps({'format':fmt,'rendered':len(sources)}),flush=True)

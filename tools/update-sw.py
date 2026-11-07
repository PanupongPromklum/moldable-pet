"""Refresh the app-shell file list (SHELL) in sw.js and bump VERSION. Run before each deploy:
    python3 tools/update-sw.py
"""
import os, re, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = ['./', 'index.html', 'manifest.webmanifest']
for d in ['src', 'assets/data', 'assets/ui', 'assets/icons']:
    for dp, _, fs in os.walk(os.path.join(root, d)):
        for f in fs:
            if f.endswith(('.js', '.css', '.json', '.png', '.svg', '.webp')):
                files.append(os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/'))
files = sorted(set(files))
p = os.path.join(root, 'sw.js')
s = open(p).read()
s = re.sub(r"const SHELL = \[.*?\];", 'const SHELL = ' + repr(files) + ';', s, flags=re.S)
s = re.sub(r"const VERSION = '[^']*';", "const VERSION = 'mp-" + time.strftime('%Y%m%d-%H%M') + "';", s)
open(p, 'w').write(s)
print(len(files), 'files; version bumped')

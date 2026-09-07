#!/usr/bin/env python3
"""Generate a simple browsable index for the published student/ tree."""

from pathlib import Path

root = Path("_site/student")
rows = []
for path in sorted(root.rglob("*")):
    if path.name.startswith("."):
        continue
    rel = path.relative_to(root).as_posix()
    if path.is_dir():
        rows.append(f"<li><strong>{rel}/</strong></li>")
    elif path.suffix.lower() in {
        ".html",
        ".htm",
        ".md",
        ".txt",
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg",
        ".json",
    }:
        rows.append(f'<li><a href="{rel}">{rel}</a></li>')

listing = "\n".join(rows) or "<li><em>Empty for now.</em></li>"
html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>student/ · AI Game Creator</title>
  <style>
    body {{ margin: 0; font: 16px/1.6 Inter, system-ui, sans-serif; background: #f4f0e7; color: #17202a; }}
    main {{ width: min(40rem, calc(100% - 40px)); margin: 48px auto; }}
    a {{ color: #293e6a; }}
    ul {{ padding-left: 1.2em; }}
    li {{ margin: 0.35em 0; }}
    .note {{ color: #647078; font-size: 14px; }}
  </style>
</head>
<body>
  <main>
    <p><a href="../">← Course hub</a></p>
    <h1>student/</h1>
    <p class="note">Josie’s working folder, published from the repository on each deploy to <code>main</code>. HTML opens in the browser; Markdown downloads or shows as source unless a viewer is added later.</p>
    <ul>
{listing}
    </ul>
  </main>
</body>
</html>
"""
(root / "index.html").write_text(html, encoding="utf-8")
print(f"Indexed {len(rows)} student paths")

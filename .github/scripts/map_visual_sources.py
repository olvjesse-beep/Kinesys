from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re


class StylesheetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "link":
            return
        data = {str(k).lower(): ("" if v is None else str(v)) for k, v in attrs}
        if "stylesheet" in data.get("rel", "").lower() and data.get("href"):
            self.hrefs.append(data["href"])


parser = StylesheetParser()
parser.feed(Path("index.html").read_text(encoding="utf-8"))
css_files = []
for href in parser.hrefs:
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc:
        continue
    path = Path(parsed.path.lstrip("/"))
    if path.exists() and path.suffix.lower() == ".css":
        css_files.append(path)

print("RUNTIME_CSS_FILES=", len(css_files))

patterns = {
    "UPPERCASE": re.compile(r"text-transform\s*:\s*uppercase", re.I),
    "SIDE_ACCENT": re.compile(r"border-(?:left|right|top|bottom)\s*:\s*[34]px", re.I),
    "WIDE_TRACKING": re.compile(r"letter-spacing\s*:\s*\.0[6-9]em", re.I),
    "INTER_FONT": re.compile(r"font-family\s*:[^;]*\bInter\b", re.I),
    "TIGHT_LEADING": re.compile(r"line-height\s*:\s*(?:1\.2(?:0|1)?|1\.21)\s*(?:;|$)", re.I),
}

# Approximate CSS blocks are sufficient for locating source selectors.
block_re = re.compile(r"([^{}]+)\{([^{}]*)\}", re.S)

for label, pattern in patterns.items():
    print(f"=== {label} ===")
    total = 0
    for path in css_files:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in block_re.finditer(text):
            body = match.group(2)
            if not pattern.search(body):
                continue
            selector = " ".join(match.group(1).split())
            line = text.count("\n", 0, match.start()) + 1
            snippet = " ".join(body.split())[:420]
            print(f"{path}:{line} :: {selector} :: {snippet}")
            total += 1
    print(f"{label}_BLOCK_COUNT={total}")

print("=== WIDE_SHADOWS ===")
shadow_count = 0
for path in css_files:
    text = path.read_text(encoding="utf-8", errors="ignore")
    for match in block_re.finditer(text):
        body = match.group(2)
        shadows = re.findall(r"box-shadow\s*:\s*([^;]+)", body, flags=re.I)
        if not shadows:
            continue
        if not any(re.search(r"(?:20|24|26|28|30|36|44|54|70|72)px", s) for s in shadows):
            continue
        selector = " ".join(match.group(1).split())
        line = text.count("\n", 0, match.start()) + 1
        print(f"{path}:{line} :: {selector} :: {' | '.join(shadows)}")
        shadow_count += 1
print(f"WIDE_SHADOW_BLOCK_COUNT={shadow_count}")

print("=== TARGET CONTAINERS ===")
targets = ["patient-strip", "hma-live-suggestions", "agenda-grade-scroll", "finance-ledger-summary"]
for target in targets:
    print(f"--- {target} ---")
    for path in [Path("index.html"), *css_files]:
        text = path.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if target not in line:
                continue
            start = max(0, i - 2)
            end = min(len(lines), i + 4)
            print(f"{path}:{i+1}")
            for j in range(start, end):
                print(f"  {j+1}: {lines[j]}")

print("=== PURPLE / VIOLET ===")
for path in css_files:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        low = line.lower()
        if "purple" in low or "violet" in low or re.search(r"#[765][0-9a-f][0-9a-f][0-9a-f][89a-f][0-9a-f]", low):
            print(f"{path}:{i}: {line.strip()}")

print("=== DARK GLOW CANDIDATES ===")
for path in css_files:
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        if "box-shadow" in line.lower() and ("#173b45" in line.lower() or "rgba(23,59,69" in line.lower()):
            print(f"{path}:{i}: {line.strip()}")

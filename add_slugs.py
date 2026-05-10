import os, re
from unidecode import unidecode

poems_dir = 'content/poems'

for filename in os.listdir(poems_dir):
    if not filename.endswith('.md'):
        continue

    filepath = os.path.join(poems_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already has a slug
    if re.search(r'^slug:', content, re.MULTILINE):
        print(f'SKIP (has slug): {filename}')
        continue

    # Extract title
    title_match = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    if not title_match:
        print(f'SKIP (no title): {filename}')
        continue

    title = title_match.group(1).strip('"\'* ')

    # Transliterate to ASCII slug
    slug = unidecode(title).lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')[:60]

    # Insert slug after the opening ---
    updated = content.replace('---\n', f'---\nslug: "{slug}"\n', 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(updated)

    print(f'Added slug "{slug}" → {filename}')
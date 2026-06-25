"""
Fix Zustand v5 "getSnapshot should be cached" by wrapping bare store calls
with useShallow. Only touches .tsx files in src/pages/ and src/components/.
"""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).parent / "src"

# Pattern: const { ... } = useSomeStore();
# We want to transform it to:
# const { ... } = useSomeStore(useShallow((s) => ({ ... })));
BARE_STORE_RE = re.compile(
    r'^(\s*)(const\s*\{([^}]+)\}\s*=\s*(use\w+Store)\(\);)',
    re.MULTILINE
)

def build_shallow(fields_raw: str, store_call: str) -> str:
    """Build a useShallow selector from destructured field names."""
    fields = [f.strip() for f in fields_raw.split(',') if f.strip()]
    # Handle aliased fields like: updateRole: updateRoleStore
    selector_parts = []
    for f in fields:
        if ':' in f:
            # alias: key: alias  →  key: s.key
            parts = f.split(':', 1)
            key = parts[0].strip()
            selector_parts.append(f"{key}: s.{key}")
        else:
            selector_parts.append(f"{f}: s.{f}")
    selector_body = ', '.join(selector_parts)
    return f"useShallow((s) => ({{ {selector_body} }}))"

def needs_shallow(fields_raw: str) -> bool:
    """Only wrap if there is more than one field (single-field is fine)."""
    fields = [f.strip() for f in fields_raw.split(',') if f.strip()]
    return len(fields) > 1

def process_file(path: pathlib.Path) -> bool:
    original = path.read_text(encoding='utf-8')
    lines = original.splitlines(keepends=True)
    changed = False

    has_shallow_import = 'useShallow' in original

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect multi-line destructure: line starts with `const {` but no closing `}`
        stripped = line.strip()
        if re.match(r'const\s*\{', stripped) and '}' not in line:
            # Collect continuation lines until we see `} = useXxxStore();`
            block = [line]
            j = i + 1
            while j < len(lines):
                block.append(lines[j])
                combined = ''.join(block)
                m = re.match(
                    r'\s*const\s*\{([^}]+)\}\s*=\s*(use\w+Store)\(\);\s*$',
                    combined.replace('\n', ' ')
                )
                if m:
                    break
                if '};' in lines[j] or ('}' in lines[j] and '=' in lines[j]):
                    break
                j += 1
            combined = ''.join(block)
            m = re.match(
                r'(\s*)const\s*\{([^}]+)\}\s*=\s*(use\w+Store)\(\);\s*$',
                combined.replace('\n', ' ')
            )
            if m and needs_shallow(m.group(2)):
                indent = m.group(1)
                fields_raw = m.group(2)
                store_name = m.group(3)
                selector = build_shallow(fields_raw, store_name)
                fields_clean = re.sub(r'\s+', ' ', fields_raw).strip()
                new_line = f"{indent}const {{ {fields_clean} }} = {store_name}(\n{indent}  {selector}\n{indent});\n"
                new_lines.append(new_line)
                changed = True
                has_shallow_import = True
                i = j + 1
                continue
            else:
                new_lines.extend(block)
                i = j + 1
                continue

        # Single-line pattern
        m = BARE_STORE_RE.match(line)
        if m:
            indent = m.group(1)
            fields_raw = m.group(3)
            store_name = m.group(4)
            if needs_shallow(fields_raw):
                selector = build_shallow(fields_raw, store_name)
                fields_clean = re.sub(r'\s+', ' ', fields_raw).strip()
                new_line = f"{indent}const {{ {fields_clean} }} = {store_name}(\n{indent}  {selector}\n{indent});\n"
                new_lines.append(new_line)
                changed = True
                has_shallow_import = True
                i += 1
                continue

        new_lines.append(line)
        i += 1

    if not changed:
        return False

    result = ''.join(new_lines)

    # Add useShallow import if missing
    if "useShallow" not in original:
        result = result.replace(
            "from 'zustand';",
            "from 'zustand';\nimport { useShallow } from 'zustand/shallow';",
            1
        )
        # If no zustand import found, add after first import block
        if "from 'zustand/shallow'" not in result:
            result = re.sub(
                r"(import .+?;\n)",
                r"\1import { useShallow } from 'zustand/shallow';\n",
                result,
                count=1
            )

    path.write_text(result, encoding='utf-8')
    return True

def main():
    targets = list(ROOT.rglob("*.tsx"))
    fixed = []
    for p in targets:
        if process_file(p):
            fixed.append(str(p.relative_to(ROOT.parent)))
            print(f"  ✓ Fixed: {p.name}")
    print(f"\nTotal fixed: {len(fixed)} files")

if __name__ == "__main__":
    main()

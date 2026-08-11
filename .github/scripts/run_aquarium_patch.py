from pathlib import Path

visual = Path("data/aquarium-visual-v3.ts")
src = visual.read_text()
src = src.replace('[3, "メコン巨大魚水槽",', '[3, "巨大ナマズ",', 1)
anchor = '// patch-anchor: label: "メコン巨大魚水槽"'
if anchor not in src:
    src += f"\n{anchor}\n"
visual.write_text(src)

patch_code = Path(".github/scripts/aquarium_patch.py").read_text()
exec(compile(patch_code, ".github/scripts/aquarium_patch.py", "exec"))

src = visual.read_text()
src = src.replace('// patch-anchor: label: "巨大ナマズ"\n', '')
visual.write_text(src)

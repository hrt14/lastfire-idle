from pathlib import Path

stages_path = Path('data/stages.ts')
shop_path = Path('lib/shop.ts')

stages = stages_path.read_text(encoding='utf-8')
shop = shop_path.read_text(encoding='utf-8')

old_stage = '''    // 町が完成する（人80人・畑5面・穀物庫・井戸・記念塔）まで、まだ出られない
    unlockAfter: "mark-town-done", reveal: 110,
'''
new_stage = '''    // 記念塔まで建てたら大型交易船へ。人口80人は達成目標として残すが進行は止めない
    unlockAfter: "built-build-temple", reveal: 110,
'''
assert stages.count(old_stage) == 1, f'stage gate matches: {stages.count(old_stage)}'
stages = stages.replace(old_stage, new_stage, 1)

old_import = '''  createTaiga,
  fromTaiga,
  taigaCrew,
'''
new_import = '''  TAIGA_MARK_IDS,
  createTaiga,
  fromTaiga,
  taigaCrew,
'''
assert shop.count(old_import) == 1, f'import matches: {shop.count(old_import)}'
shop = shop.replace(old_import, new_import, 1)

old_valid = '''    ...FOUND_IDS,
    ...MARK_IDS,
  ]);
'''
new_valid = '''    ...FOUND_IDS,
    ...MARK_IDS,
    ...TAIGA_MARK_IDS,
  ]);
'''
assert shop.count(old_valid) == 1, f'valid matches: {shop.count(old_valid)}'
shop = shop.replace(old_valid, new_valid, 1)

old_available = '''  return eligible.filter(
    // 強化の枠は、効く相手を体験してから出る（数の上限には数えない）
    (pad) => pad.kind === "upgrade" || seen.has(pad.id),
  );
'''
new_available = '''  return eligible.filter(
    // 強化と次の区画は進行を止めない。区画枠を任意購入の枠に埋もれさせない
    (pad) =>
      pad.kind === "upgrade" ||
      areaById.has(pad.id) ||
      seen.has(pad.id),
  );
'''
assert shop.count(old_available) == 1, f'available matches: {shop.count(old_available)}'
shop = shop.replace(old_available, new_available, 1)

old_showing = '''  let showing = eligible.filter(
    (pad) => pad.kind !== "upgrade" && seen.has(pad.id),
  ).length;
'''
new_showing = '''  let showing = eligible.filter(
    (pad) =>
      pad.kind !== "upgrade" &&
      !areaById.has(pad.id) &&
      seen.has(pad.id),
  ).length;
'''
assert shop.count(old_showing) == 1, f'showing matches: {shop.count(old_showing)}'
shop = shop.replace(old_showing, new_showing, 1)

old_queue_limit = '''    if (pad.kind !== "upgrade") {
      if (showing >= limit) continue;
      showing += 1;
    }
'''
new_queue_limit = '''    if (pad.kind !== "upgrade" && !areaById.has(pad.id)) {
      if (showing >= limit) continue;
      showing += 1;
    }
'''
assert shop.count(old_queue_limit) == 1, f'queue limit matches: {shop.count(old_queue_limit)}'
shop = shop.replace(old_queue_limit, new_queue_limit, 1)

stages_path.write_text(stages, encoding='utf-8')
shop_path.write_text(shop, encoding='utf-8')
print('Taiga area-6 progression hotfix applied')

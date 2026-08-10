from pathlib import Path

p = Path('lib/shop.ts')
s = p.read_text(encoding='utf-8')

old = '''const feedsNight = (stove: StoveSpec) =>
  stove.item === "smoked" || (isStore(stove) && stove.takes === "smoked");

/** その仕事に、いま何人が向かっているか */'''
new = '''const feedsNight = (stove: StoveSpec) =>
  stove.item === "smoked" || (isStore(stove) && stove.takes === "smoked");

/**
 * いま最優先で完成させる建築と、その完成に必要な上流工程を洗い出す。
 *
 * 直接「土器が6こ必要」と分かっていても、土器がまだ1こも無い場合は
 * 従来の建築優先だけでは何も起きない。窯へ粘土・薪を運ぶところまで
 * 建築の仕事として扱うことで、工程の途中で永久に止まらないようにする。
 */
const buildSupplyPlan = (state: ShopState) => {
  const jobs = new Set<string>();
  const kinds = new Set<ItemKind>();
  const visiting = new Set<ItemKind>();

  const builds = openStoves(state)
    .filter((stove) => isBuild(stove) && !isDone(state, stove.id))
    .sort((a, b) => {
      const aStarted = Object.values(state.parts[a.id] ?? {}).reduce((sum, n) => sum + n, 0) > 0;
      const bStarted = Object.values(state.parts[b.id] ?? {}).reduce((sum, n) => sum + n, 0) > 0;
      if (aStarted !== bStarted) return aStarted ? -1 : 1;
      return (a.reveal ?? 999) - (b.reveal ?? 999);
    });
  const site = builds[0] ?? null;

  const trace = (kind: ItemKind, depth = 0) => {
    if (depth > 6 || visiting.has(kind)) return;
    kinds.add(kind);
    visiting.add(kind);
    for (const maker of openStoves(state)) {
      if (isBuild(maker) || stoveItem(maker) !== kind) continue;
      const deps: ItemKind[] = [];
      if (maker.takes) deps.push(maker.takes);
      if (maker.fuel) deps.push(maker.fuel);
      for (const dep of Object.keys(maker.recipe ?? {})) deps.push(dep);
      for (const dep of deps) {
        jobs.add(`${dep}@${maker.id}`);
        trace(dep, depth + 1);
      }
    }
    visiting.delete(kind);
  };

  if (site?.needs) {
    for (const [kind, need] of Object.entries(site.needs)) {
      const got = state.parts[site.id]?.[kind] ?? 0;
      if (got >= need) continue;
      jobs.add(`${kind}@${site.id}`);
      trace(kind);
    }
  }

  return { site, jobs, kinds };
};

/** その仕事に、いま何人が向かっているか */'''
assert old in s, 'feedsNight anchor not found'
s = s.replace(old, new, 1)

old = '''  const drops = dropJobs(state, worker).filter((job) => jobAllowed(worker, job));
  const stuck = drops.length === 0 && carryTotal(worker) > 0;
  const all = [...dropJobs(state, worker), ...pickJobs(state, worker, stuck)];
  const open = (allow: (job: HaulJob) => boolean) =>
    all.filter((job) => allow(job) && claimCount(state, worker, job.id) < job.slots);

  let jobs = open((job) => jobAllowed(worker, job));'''
new = '''  const plan = buildSupplyPlan(state);
  const critical = (job: HaulJob) =>
    plan.jobs.has(job.id) || (job.tag === "pick" && plan.kinds.has(job.kind));
  const allowed = (job: HaulJob) =>
    jobAllowed(worker, job) || (worker.kind === "builder" && critical(job));

  const drops = dropJobs(state, worker).filter(allowed);
  const stuck = drops.length === 0 && carryTotal(worker) > 0;
  const all = [...dropJobs(state, worker), ...pickJobs(state, worker, stuck)];
  const open = (allow: (job: HaulJob) => boolean) =>
    all.filter((job) => allow(job) && claimCount(state, worker, job.id) < job.slots);

  let jobs = open(allowed);'''
assert old in s, 'updateHauler selection anchor not found'
s = s.replace(old, new, 1)

old = '''  const score = (job: HaulJob) =>
    dist(worker.pos, job.at) -
    (job.stalled ? 260 : 0) -
    (job.drop ? 70 : 0) -
    (job.night && short ? 620 : 0) -
    (job.tag === "build" || (job.tag === "pick" && job.forBuild) ? 240 : 0);'''
new = '''  const score = (job: HaulJob) =>
    dist(worker.pos, job.at) -
    (job.stalled ? 260 : 0) -
    (job.drop ? 70 : 0) -
    (job.night && short ? 620 : 0) -
    (job.tag === "build" || (job.tag === "pick" && job.forBuild) ? 240 : 0) -
    (critical(job) ? 1200 : 0);'''
assert old in s, 'score anchor not found'
s = s.replace(old, new, 1)

old = '''    const cost = seatCost(seat);
    if (stockOf(state, need) < cost) continue;
    state.autoTimer[seat.id] = (state.autoTimer[seat.id] ?? 0) + dt;'''
new = '''    const cost = seatCost(seat);
    const stock = stockOf(state, need);
    const buildReserve = state.fire.wants[need] ?? 0;
    // 建築が同じ品を待っているあいだは、自動販売で最後の在庫を食べ切らない
    if (stock < cost || (buildReserve > 0 && stock - cost < buildReserve)) continue;
    state.autoTimer[seat.id] = (state.autoTimer[seat.id] ?? 0) + dt;'''
assert old in s, 'updateAuto reserve anchor not found'
s = s.replace(old, new, 1)

old = '''  // 森と薪の話は、1食出してから始める（一度に全部教えない）
  const teachWood = state.served >= 1;'''
new = '''  // 建てかけの建物があるなら、通常の配膳より「何が足りないか」を先に案内する。
  // 自動運搬が詰まったときも、画面下の目的が無関係な仕事を指し続けないため。
  const buildPlan = buildSupplyPlan(state);
  if (buildPlan.site?.needs) {
    const site = buildPlan.site;
    for (const [kind, need] of Object.entries(site.needs)) {
      const got = state.parts[site.id]?.[kind] ?? 0;
      if (got >= need) continue;
      if (carryOf(player, kind) > 0) {
        return {
          kind: "serve",
          pos: site.pos,
          label: `${itemLabel(kind)}を${site.label ?? "建築予定地"}へ届けよう（${got}/${need}）`,
        };
      }
      const source = near(
        openStoves(state).filter(
          (stove) => !isBuild(stove) && stoveItem(stove) === kind && (state.ready[stove.id] ?? 0) > 0,
        ),
        (stove) => stove.pos,
      );
      if (source) {
        return {
          kind: "pickup",
          pos: source.pos,
          label: `${source.label ?? "出し口"}の${itemLabel(kind)}を${site.label ?? "建築予定地"}へ運ぼう`,
        };
      }
      const maker = near(
        openStoves(state).filter((stove) => !isBuild(stove) && stoveItem(stove) === kind),
        (stove) => stove.pos,
      );
      if (maker) {
        return {
          kind: "wait",
          pos: maker.pos,
          label: `${site.label ?? "建築"}は${itemLabel(kind)}待ち ― ${maker.label ?? "作業場"}の供給を優先中`,
        };
      }
    }
  }

  // 森と薪の話は、1食出してから始める（一度に全部教えない）
  const teachWood = state.served >= 1;'''
assert old in s, 'chainObjective anchor not found'
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('construction watchdog patched')

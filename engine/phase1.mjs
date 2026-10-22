/**
 * Phase 1 / research simulator; NOT verified reproduction of Yo-kai Watch 2.
 * All rule uncertainty is tracked in docs/PHASE1_RESEARCH.md.
 * Pure event-driven scheduling. No browser, timer, network, RNG library or sprites.
 */

export function waitCostFromSpeed(speed) {
  if (!Number.isInteger(speed) || speed < 1) throw new RangeError('speed must be a positive integer');
  if (speed <= 171) return 369 - Math.floor(speed / 3) * 3;
  if (speed <= 201) return 198 - Math.floor((speed - 171) / 5) * 3;
  if (speed <= 501) return 180 - Math.floor((speed - 201) / 10) * 3;
  return 90;
}

function seededRandom(seed) {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

const baseRental = [
  { name: 'レンタル 01', speed: 171 },
  { name: 'レンタル 02', speed: 211 },
  { name: 'レンタル 03', speed: 301 },
  { name: 'レンタル 04', speed: 181 },
  { name: 'レンタル 05', speed: 251 },
  { name: 'レンタル 06', speed: 151 }
];

export function createBattle({ seed = 20261023, teams, rotationCooldownMs = 3000,
  openingFraction = [0.4, 0.6] } = {}) {
  if (!Number.isInteger(seed)) throw new TypeError('seed must be an integer');
  if (!Number.isFinite(rotationCooldownMs) || rotationCooldownMs < 0) throw new RangeError('invalid rotation cooldown');
  if (!Array.isArray(openingFraction) || openingFraction.length !== 2 ||
      !openingFraction.every(x => typeof x === 'number' && x >= 0 && x <= 1) ||
      openingFraction[0] > openingFraction[1]) throw new RangeError('invalid opening fraction');
  if (teams !== undefined && (!Array.isArray(teams) || teams.length !== 2 ||
      !teams.every(t => Array.isArray(t) && t.length === 6))) throw new TypeError('requires two teams of six');

  const random = seededRandom(seed);
  const data = (teams || [baseRental, baseRental]).map((roster, side) => ({
    side,
    offset: 0,
    lastRotateAt: -Infinity,
    members: roster.map((source, index) => {
      const cost = waitCostFromSpeed(source.speed);
      const opening = index < 3;
      const factor = opening ? openingFraction[0] + random() * (openingFraction[1] - openingFraction[0]) : 1;
      return {
        id: `${side === 0 ? 'A' : 'B'}${index + 1}`,
        name: source.name || `Unit ${index + 1}`,
        speed: source.speed,
        cost,
        // Working hypothesis: lower debt means an earlier action.
        wait: Math.max(0, Math.round(cost * factor)),
        acted: 0,
        originalFront: opening
      };
    })
  }));
  const history = [];
  let pointsElapsed = 0;
  let turn = 0;

  const frontline = team => [0, 1, 2].map(n => team.members[(team.offset + n) % 6]);
  const frontlineAll = () => data.flatMap(team => frontline(team));

  function snapshot() {
    return {
      seed,
      turn,
      pointsElapsed,
      teams: data.map(team => ({
        side: team.side,
        offset: team.offset,
        frontIds: frontline(team).map(x => x.id),
        benchIds: [3, 4, 5].map(n => team.members[(team.offset + n) % 6].id),
        members: team.members.map(member => ({ ...member }))
      })),
      recentActions: history.slice(-30).map(event => ({ ...event }))
    };
  }

  function rotate(side, direction, atMs = 0) {
    if (![0, 1].includes(side)) throw new RangeError('side must be 0 or 1');
    if (![1, -1].includes(direction)) throw new RangeError('direction must be +1 or -1');
    if (!Number.isFinite(atMs)) throw new TypeError('atMs must be finite');
    const team = data[side];
    if (atMs < team.lastRotateAt + rotationCooldownMs) return { ok: false, reason: 'cooldown', remainingMs: team.lastRotateAt + rotationCooldownMs - atMs };
    team.offset = (team.offset + direction + 6) % 6;
    team.lastRotateAt = atMs;
    return { ok: true, side, offset: team.offset, frontIds: frontline(team).map(x => x.id) };
  }

  function step() {
    const active = frontlineAll();
    // For equal debt: front position within each team, then side A before B.
    // Tie precedence is a *test convention*, not established source behavior.
    const delta = Math.min(...active.map(x => x.wait));
    for (const unit of active) unit.wait = Math.max(0, unit.wait - delta);
    pointsElapsed += delta;
    const winner = active.find(x => x.wait === 0);
    winner.acted += 1;
    winner.wait = winner.cost;
    const event = {
      action: ++turn, id: winner.id, name: winner.name,
      speed: winner.speed, cost: winner.cost,
      elapsed: delta, pointsElapsed,
      frontA: frontline(data[0]).map(x => x.id),
      frontB: frontline(data[1]).map(x => x.id)
    };
    history.push(event);
    return { ...event };
  }

  function simulate(count = 1) {
    if (!Number.isInteger(count) || count < 0 || count > 10000) throw new RangeError('count 0..10000');
    return Array.from({ length: count }, () => step());
  }

  return { snapshot, step, simulate, rotate };
}

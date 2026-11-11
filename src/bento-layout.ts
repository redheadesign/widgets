export type TileFit = 'wide' | 'short' | 'portrait';
export type Tile = { column: number; row: number; width: number; height: number; fit?: TileFit };

export function randomFrom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function splitOptions(block: Tile): Tile[][] {
  const at = (x: number, y: number, width = 1, height = 1): Tile => ({
    column: block.column + x, row: block.row + y, width, height,
  });
  if (block.width === 1) return block.height === 1 ? [[block]] : [[block], [at(0, 0), at(0, 1)]];
  if (block.height === 1) return [[block], [at(0, 0), at(1, 0)]];
  return [
    [block],
    [at(0, 0, 2), at(0, 1, 2)],
    [at(0, 0, 1, 2), at(1, 0, 1, 2)],
    [at(0, 0, 2), at(0, 1), at(1, 1)],
    [at(0, 0), at(1, 0), at(0, 1, 2)],
    [at(0, 0, 1, 2), at(1, 0), at(1, 1)],
    [at(0, 0), at(0, 1), at(1, 0, 1, 2)],
    [at(0, 0), at(1, 0), at(0, 1), at(1, 1)],
  ];
}

const isPortrait = (tile: Tile) => tile.width === 1 && tile.height === 2;

export function packBento(count: number, columns: number, seed: number, requirements: { wide?: number; short?: boolean; portrait?: number } = {}): Tile[] {
  if (!count) return [];
  const random = randomFrom(seed);
  const pairs = Math.floor(columns / 2);
  const minimumBands = Math.ceil(columns / 2);
  const wideCount = pairs ? requirements.wide ?? 0 : 0;
  const portraitCount = requirements.portrait ?? 0;
  const minimumRows = Math.ceil((count + wideCount) / columns);
  const idealRows = Math.max(minimumRows, Math.ceil(count * (1.25 + random() * .3) / columns));
  const maximumRows = 2 * Math.floor(count / minimumBands);
  let rows = Math.min(idealRows, maximumRows);
  const minimumTiles = (height: number) => Math.ceil(height / 2) * pairs + (columns % 2) * height;
  const shortSplit = (height: number) => requirements.short && height % 2 === 0 ? 1 : 0;
  if (columns === 1) {
    rows = Math.min(rows, count + portraitCount, 2 * count - Number(Boolean(requirements.short)));
  } else {
    // Even without portrait merges there must be enough slots for each featured card.
    while (rows > minimumRows && minimumTiles(rows) + shortSplit(rows) + wideCount > count) rows--;
  }
  const rowPairs = Math.ceil(rows / 2);
  let splitBudget = count - minimumTiles(rows) - shortSplit(rows) - wideCount;
  let wideBudget = rowPairs * pairs - wideCount - Number(Boolean(requirements.short));
  const blocks: Tile[] = [];
  for (let row = 0; row < rows; row += 2) {
    const height = Math.min(2, rows - row);
    // Replacing a 2×2 block with two single-column bands can require four tiles.
    const splitCost = 2 * height - 1;
    const broken = Math.max(0, Math.min(
      Math.floor(splitBudget / splitCost), wideBudget, Math.floor(random() * (Math.min(2, Math.max(0, pairs - 1)) + 1)),
    ));
    splitBudget -= broken * splitCost;
    wideBudget -= broken;
    const wideBands = pairs - broken;
    const bands = shuffle([...Array<number>(wideBands).fill(2), ...Array<number>(columns - wideBands * 2).fill(1)], random);
    let column = 0;
    for (const width of bands) {
      blocks.push({ column, row, width, height });
      column += width;
    }
  }

  const shuffled = shuffle(blocks, random);
  const shortBlock = requirements.short ? shuffled.find(block => block.height === 1) ?? shuffled[0] : undefined;
  const wideBlocks = new Set(shuffled.filter(block => block !== shortBlock && block.width === 2).slice(0, wideCount));
  let portraitBudget = portraitCount;
  const plans = shuffled.map(block => {
    const fit: TileFit | undefined = block === shortBlock ? 'short' : wideBlocks.has(block) ? 'wide' : undefined;
    const compatible = (tile: Tile) => tile.height === 1 && (fit !== 'wide' || tile.width === 2);
    const portraitLimit = fit || block.height === 1 ? 0 : Math.min(block.width, portraitBudget);
    portraitBudget -= portraitLimit;
    const choices = splitOptions(block).filter(parts => parts.filter(isPortrait).length <= portraitLimit && (!fit || parts.some(compatible)));
    return { fit, compatible, choices, min: Math.min(...choices.map(parts => parts.length)), max: Math.max(...choices.map(parts => parts.length)) };
  });
  let remaining = count;
  let minimum = plans.reduce((sum, plan) => sum + plan.min, 0);
  let maximum = plans.reduce((sum, plan) => sum + plan.max, 0);
  const tiles = plans.flatMap<Tile>(({ fit, compatible, choices, min, max }) => {
    minimum -= min;
    maximum -= max;
    // Each block supports a consecutive range of tile counts, so these bounds
    // reserve enough area and enough splits for every remaining block.
    const possible = choices.filter(parts => remaining - parts.length >= minimum && remaining - parts.length <= maximum);
    const selected = possible[Math.floor(random() * possible.length)];
    remaining -= selected.length;
    const anchor = fit ? selected.find(compatible) : undefined;
    return selected.map(part => part === anchor ? { ...part, fit } : isPortrait(part) ? { ...part, fit: 'portrait' } : part);
  });
  return tiles.sort((a, b) => a.row - b.row || a.column - b.column);
}

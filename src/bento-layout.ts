export type Tile = { column: number; row: number; width: number; height: number };

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

export function packBento(count: number, columns: number, seed: number): Tile[] {
  if (!count) return [];
  const random = randomFrom(seed);
  const bands: number[] = [];
  for (let remaining = columns; remaining > 0;) {
    const width = remaining === 1 || (remaining > 2 && random() < .22) ? 1 : 2;
    bands.push(width);
    remaining -= width;
  }
  const idealRows = Math.ceil(count * (1.25 + random() * .3) / columns);
  const rows = Math.min(idealRows, 2 * Math.floor(count / bands.length));
  const blocks: Tile[] = [];
  for (let row = 0; row < rows; row += 2) {
    let column = 0;
    for (const width of bands) {
      blocks.push({ column, row, width, height: Math.min(2, rows - row) });
      column += width;
    }
  }

  let merges = rows * columns - count;
  let capacity = rows * columns - blocks.length;
  const tiles = shuffle(blocks, random).flatMap(block => {
    const area = block.width * block.height;
    capacity -= area - 1;
    // Reserve enough merges for the remaining blocks to finish with exactly count tiles.
    const min = Math.max(0, merges - capacity);
    const max = Math.min(area - 1, merges);
    const used = min + Math.floor(random() * (max - min + 1));
    merges -= used;
    if (used === area - 1) return [block];
    const pieces: Tile[] = [];
    for (let y = 0; y < block.height; y++) {
      if (y < used && block.width === 2) {
        pieces.push({ ...block, row: block.row + y, height: 1 });
      } else {
        for (let x = 0; x < block.width; x++) {
          pieces.push({ column: block.column + x, row: block.row + y, width: 1, height: 1 });
        }
      }
    }
    return pieces;
  });
  return tiles.sort((a, b) => a.row - b.row || a.column - b.column);
}

import { lightingIds } from './lighting-assets';

/** Returns a continuous color field for the card's responsive background. */
export function referenceSurface(id: string) {
  if (!lightingIds.has(id)) return undefined;
  return `var(--bw-light-${id}, none)`;
}

/**
 * Deterministic tone (1–5) from a product id or SKU string.
 * Same input always returns the same tone so placeholder stripes are stable.
 */
export function productTone(idOrSku: string): 1 | 2 | 3 | 4 | 5 {
  let hash = 0;
  for (let i = 0; i < idOrSku.length; i++) {
    hash = ((hash << 5) - hash + idOrSku.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 5) + 1) as 1 | 2 | 3 | 4 | 5;
}

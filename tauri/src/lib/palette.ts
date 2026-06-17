// Extração de paleta no frontend: canvas + quantização por popularidade.
// Sem dependência nova. Funciona em qualquer src de imagem carregável.

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

// distância euclidiana² em RGB (evita raiz, só p/ comparar)
function dist2(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0],
    dg = a[1] - b[1],
    db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Extrai até `k` cores dominantes de uma imagem.
 * Reamostra p/ ~120px, agrupa em buckets de 5 bits/canal por popularidade,
 * e seleciona cores distintas (distância mínima) p/ não repetir tons quase iguais.
 */
export async function extractPalette(src: string, k = 6): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("falha ao carregar imagem"));
    img.src = src;
  });

  const MAX = 120;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h); // pode lançar se canvas "tainted"

  // histograma por bucket de 5 bits/canal (32³ buckets)
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // ignora transparente
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = buckets.get(key);
    if (e) {
      e.n++;
      e.r += r;
      e.g += g;
      e.b += b;
    } else {
      buckets.set(key, { n: 1, r, g, b });
    }
  }

  // ordena por popularidade, calcula cor média do bucket
  const sorted = [...buckets.values()]
    .map((e) => ({
      n: e.n,
      rgb: [
        Math.round(e.r / e.n),
        Math.round(e.g / e.n),
        Math.round(e.b / e.n),
      ] as [number, number, number],
    }))
    .sort((a, b) => b.n - a.n);

  // seleciona distintas (distância mínima p/ evitar quase-duplicatas)
  const MIN_D2 = 28 * 28; // ~28 por canal
  const chosen: [number, number, number][] = [];
  for (const c of sorted) {
    if (chosen.length >= k) break;
    if (chosen.every((p) => dist2(p, c.rgb) >= MIN_D2)) chosen.push(c.rgb);
  }
  // fallback: se ficou pouca cor distinta, completa com as mais populares
  if (chosen.length < k) {
    for (const c of sorted) {
      if (chosen.length >= k) break;
      if (!chosen.some((p) => dist2(p, c.rgb) === 0)) chosen.push(c.rgb);
    }
  }

  return chosen.map(([r, g, b]) => toHex(r, g, b));
}

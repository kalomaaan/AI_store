import TextRecognition from '@react-native-ml-kit/text-recognition';

export type OcrResult = {
  fullText: string;
  lines: string[];
  blocks: { text: string; lines: string[] }[];
};

export async function recognizeText(uri: string): Promise<OcrResult> {
  const r = await TextRecognition.recognize(uri);
  const blocks = (r.blocks ?? []).map((b: any) => ({
    text: b.text ?? '',
    lines: (b.lines ?? []).map((l: any) => l.text ?? ''),
  }));
  const lines = blocks.flatMap((b) => b.lines).filter(Boolean);
  return {
    fullText: r.text ?? '',
    lines,
    blocks,
  };
}

// Picks the most "name-like" lines: longer than 2 chars, mostly alpha, not pure digits
export function nameCandidates(ocr: OcrResult, max = 6): string[] {
  const lines = ocr.lines.map((l) => l.trim()).filter(Boolean);
  const scored = lines.map((line) => {
    const cleaned = line.replace(/\s+/g, ' ');
    const letters = (cleaned.match(/[A-Za-z]/g) ?? []).length;
    const digits = (cleaned.match(/[0-9]/g) ?? []).length;
    let score = 0;
    if (cleaned.length >= 3 && cleaned.length <= 40) score += 2;
    if (letters >= 3) score += letters / 8;
    if (digits > letters) score -= 2;
    if (/^\$?[\d.,]+$/.test(cleaned)) score -= 5; // pure price
    if (/[®™©]/.test(cleaned)) score += 1;
    if (cleaned === cleaned.toUpperCase() && letters > 3) score += 1.5;
    return { line: cleaned, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // dedupe (case-insensitive)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of scored) {
    const key = s.line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.line);
    if (out.length >= max) break;
  }
  return out;
}

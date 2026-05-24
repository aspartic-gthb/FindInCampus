import { IItem } from '../models/Item';
import { cosineSimilarity } from './gemini';

function tokenize(text: string): Set<string> {
  return new Set(
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Score 0–100: how likely two opposite-type items are the same object. */
export function computeMatchScore(target: IItem, candidate: IItem): number {
  let score = 0;

  const targetEmb = target.embedding || [];
  const candidateEmb = candidate.embedding || [];
  if (targetEmb.length > 0 && candidateEmb.length > 0) {
    score += Math.round(cosineSimilarity(targetEmb, candidateEmb) * 55);
  }

  if (
    target.category &&
    candidate.category &&
    target.category.toLowerCase() === candidate.category.toLowerCase()
  ) {
    score += 20;
  }

  score += Math.round(
    jaccardSimilarity(tokenize(target.location), tokenize(candidate.location)) * 15
  );

  const tagsA = new Set((target.visualTags || []).map((t) => t.toLowerCase()));
  const tagsB = new Set((candidate.visualTags || []).map((t) => t.toLowerCase()));
  if (tagsA.size > 0 && tagsB.size > 0) {
    let overlap = 0;
    for (const t of tagsA) {
      if (tagsB.has(t)) overlap++;
    }
    score += Math.min(10, overlap * 3);
  }

  const textA = tokenize(`${target.title} ${target.description} ${(target.visualTags || []).join(' ')}`);
  const textB = tokenize(
    `${candidate.title} ${candidate.description} ${(candidate.visualTags || []).join(' ')}`
  );
  score += Math.round(jaccardSimilarity(textA, textB) * 25);

  return Math.min(100, score);
}

export function formatMatchPair(target: IItem, candidate: IItem, confidenceScore: number) {
  const lostItem = target.type === 'LOST' ? target : candidate;
  const foundItem = target.type === 'FOUND' ? target : candidate;

  const toClient = (item: IItem) => {
    const obj = item.toObject();
    return {
      ...obj,
      id: item._id.toString(),
      reporterId: item.reporterId?.toString(),
    };
  };

  return {
    lostItem: toClient(lostItem),
    foundItem: toClient(foundItem),
    confidenceScore,
    score: confidenceScore,
  };
}

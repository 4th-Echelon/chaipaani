import { normaliseCounterparty, type Transaction } from "./parsers/base";

export interface MatchTarget {
  amount: number; // INR claimed in the report
  incidentDate: string; // ISO
  words: string[]; // department / service / official role vocabulary
}

export interface MatchScore {
  transaction: Transaction;
  score: number;
  parts: { amount: number; date: number; counterparty: number; utr: number };
}

const STOP = new Set(["the", "and", "of", "for", "to", "a", "an", "at", "in", "on", "by", "with", "office", "other"]);

function tokens(s: string): string[] {
  return normaliseCounterparty(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function dayDiff(a: string, b: string): number {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86400000);
}

export function scoreTransaction(t: Transaction, target: MatchTarget): MatchScore {
  const amount = t.amount === target.amount ? 40 : Math.abs(t.amount - target.amount) <= Math.max(1, target.amount * 0.01) ? 36 : 0;
  const dd = dayDiff(t.date, target.incidentDate);
  const date = dd === 0 ? 30 : dd <= 1 ? 20 : dd <= 3 ? 10 : 0;
  const targetTokens = new Set(target.words.flatMap(tokens));
  const cpTokens = tokens(t.counterparty);
  const overlap = cpTokens.filter((x) => targetTokens.has(x)).length;
  const counterparty = overlap === 0 ? 0 : 20;
  const utr = t.utr && /^\d{12}$/.test(t.utr) ? 10 : 0;
  // Credits are money received; a bribe is money sent.
  const penalty = t.direction === "credit" ? 0.5 : 1;
  const score = Math.round((amount + date + counterparty + utr) * penalty);
  return { transaction: t, score, parts: { amount, date, counterparty, utr } };
}

export function bestMatch(txns: Transaction[], target: MatchTarget): MatchScore | null {
  let best: MatchScore | null = null;
  for (const t of txns) {
    const s = scoreTransaction(t, target);
    if (!best || s.score > best.score) best = s;
  }
  return best;
}

export const MATCH_THRESHOLD = 80;

// Client-side pattern detection for chat security notices.
// Pure regex — flags likely financial / payment requests. No AI, no persistence.

export type SecurityPatternHit = {
  kind: "iban" | "swift" | "wallet" | "payment_link" | "payment_phrase" | "bank_account";
  label: string;
};

// IBAN: country code (2 letters) + 2 digits + up to 30 alphanumeric, allow spaces.
const IBAN_RE = /\b[A-Z]{2}[0-9]{2}(?:[ ]?[A-Z0-9]){10,30}\b/;
// SWIFT/BIC: 8 or 11 chars, well-formed.
const SWIFT_RE = /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/;
// Bank account (loose): long digit run 10-24 with optional separators.
const BANK_RE = /(?:\b\d[\s-]?){10,24}\b/;
// Crypto wallet addresses (BTC bech32 & legacy, ETH, TRON, generic long base58/hex).
const CRYPTO_RES: RegExp[] = [
  /\bbc1[0-9ac-hj-np-z]{25,60}\b/i, // BTC bech32
  /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/, // BTC legacy
  /\b0x[a-fA-F0-9]{40}\b/, // ETH
  /\bT[a-zA-Z0-9]{33}\b/, // TRON
];
// Payment link / URL to common processors.
const PAYMENT_LINK_RE =
  /\b(?:https?:\/\/)?(?:www\.)?(?:paypal\.me|paypal\.com\/pool|revolut\.me|bizum|wise\.com\/pay|stripe\.com\/pay|checkout\.stripe\.com|bunq\.me|monzo\.me|cash\.app|venmo\.com|coinbase\.com\/pay|binance\.com\/pay)\S*/i;
// Spanish/English payment-request phrases.
const PAY_PHRASES = [
  /haz una transferencia/i,
  /env[ií]a el dinero/i,
  /paga primero/i,
  /adelanta el pago/i,
  /pago por adelantado/i,
  /transf[ie]re/i,
  /wire (?:me |the )?funds?/i,
  /send (?:me )?(?:the )?money/i,
  /pay (?:in )?advance/i,
  /upfront payment/i,
  /western union/i,
  /moneygram/i,
];

export function detectSecurityPatterns(text: string): SecurityPatternHit[] {
  if (!text || text.length < 4) return [];
  const hits: SecurityPatternHit[] = [];
  const seen = new Set<string>();
  const push = (h: SecurityPatternHit) => {
    if (seen.has(h.kind)) return;
    seen.add(h.kind);
    hits.push(h);
  };
  if (IBAN_RE.test(text)) push({ kind: "iban", label: "IBAN" });
  if (SWIFT_RE.test(text) && !IBAN_RE.test(text)) push({ kind: "swift", label: "SWIFT / BIC" });
  if (CRYPTO_RES.some((r) => r.test(text))) push({ kind: "wallet", label: "Wallet" });
  if (PAYMENT_LINK_RE.test(text)) push({ kind: "payment_link", label: "Payment link" });
  if (PAY_PHRASES.some((r) => r.test(text))) push({ kind: "payment_phrase", label: "Payment request" });
  // Bank account catch-all only when no other structured hit already fired.
  if (hits.length === 0 && BANK_RE.test(text)) push({ kind: "bank_account", label: "Bank account" });
  return hits;
}

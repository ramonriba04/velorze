// Client-side pattern detection for chat security notices.
// Pure regex — flags likely financial / payment / off-platform contact requests.
// No AI, no persistence. Add new rules to RULES below to extend detection.

export type SecurityPatternKind =
  | "iban"
  | "swift"
  | "bank_account"
  | "wallet"
  | "payment_provider"
  | "payment_link"
  | "payment_phrase"
  | "email"
  | "phone"
  | "telegram"
  | "whatsapp"
  | "discord"
  | "off_platform";

export type SecurityPatternHit = {
  kind: SecurityPatternKind;
  label: string;
};

type Rule = {
  kind: SecurityPatternKind;
  label: string;
  patterns: RegExp[];
  /** Only fires when nothing else matched (loose catch-all rules). */
  fallback?: boolean;
};

const RULES: Rule[] = [
  {
    kind: "iban",
    label: "IBAN",
    patterns: [/\b[A-Z]{2}[0-9]{2}(?:[ ]?[A-Z0-9]){10,30}\b/],
  },
  {
    kind: "swift",
    label: "SWIFT / BIC",
    patterns: [/\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/],
  },
  {
    kind: "wallet",
    label: "Crypto wallet",
    patterns: [
      /\bbc1[0-9ac-hj-np-z]{25,60}\b/i, // BTC bech32
      /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/, // BTC legacy
      /\b0x[a-fA-F0-9]{40}\b/, // ETH / EVM
      /\bT[a-zA-Z0-9]{33}\b/, // TRON
      /\b[LM][a-km-zA-HJ-NP-Z1-9]{26,33}\b/, // LTC
      /\b(?:usdt|btc|eth|trc20|erc20)\b.{0,20}\b(?:wallet|address|direcci[oó]n)\b/i,
    ],
  },
  {
    kind: "payment_provider",
    label: "Payment provider",
    patterns: [
      /\bpay ?pal\b/i,
      /\bbizum\b/i,
      /\brevolut\b/i,
      /\bwise\b(?:\s|$|[.,])/i,
      /\btransferwise\b/i,
      /\bwestern\s*union\b/i,
      /\bmoney\s*gram\b/i,
      /\bskrill\b/i,
      /\bpayoneer\b/i,
      /\bzelle\b/i,
      /\bvenmo\b/i,
      /\bcash\s*app\b/i,
      /\bbinance\b/i,
      /\bcoinbase\b/i,
      /\bstripe\b/i,
    ],
  },
  {
    kind: "payment_link",
    label: "Payment link",
    patterns: [
      /\b(?:https?:\/\/)?(?:www\.)?(?:paypal\.me|paypal\.com\/(?:pool|paypalme)|revolut\.me|wise\.com\/pay|stripe\.com\/pay|buy\.stripe\.com|checkout\.stripe\.com|donate\.stripe\.com|bunq\.me|monzo\.me|cash\.app|venmo\.com|coinbase\.com\/pay|commerce\.coinbase\.com|binance\.com\/pay|ko-fi\.com|buymeacoffee\.com|gofundme\.com)\S*/i,
      /\bhttps?:\/\/\S*\/(?:pay|payment|checkout|invoice|pago|donar|donate)\b\S*/i,
    ],
  },
  {
    kind: "payment_phrase",
    label: "Payment request",
    patterns: [
      /haz(?:me)? una transferencia/i,
      /env[ií]a(?:me)? (?:el )?dinero/i,
      /paga primero/i,
      /adelanta(?:r)? el pago/i,
      /pago por adelantado/i,
      /pago inicial/i,
      /transf[ie]re(?:ncia)?/i,
      /dep[oó]sito previo/i,
      /wire (?:me |the )?funds?/i,
      /send (?:me )?(?:the )?money/i,
      /pay (?:me )?(?:in )?(?:advance|first)/i,
      /upfront payment/i,
      /advance fee/i,
      /initial deposit/i,
      /comisi[oó]n por adelantado/i,
    ],
  },
  {
    kind: "telegram",
    label: "Telegram",
    patterns: [
      /\bt\.me\/\S+/i,
      /\btelegram\b/i,
      /escr[ií]beme (?:por|en) telegram/i,
      /write me on telegram/i,
    ],
  },
  {
    kind: "whatsapp",
    label: "WhatsApp",
    patterns: [
      /\bwa\.me\/\S+/i,
      /\bwhats\s?app\b/i,
      /\bapi\.whatsapp\.com\/\S+/i,
      /cont[aá]ctame por whatsapp/i,
      /contact me on whatsapp/i,
    ],
  },
  {
    kind: "discord",
    label: "Discord",
    patterns: [
      /\bdiscord(?:\.gg|app\.com)\/\S+/i,
      /\bdiscord\b/i,
      /\b[a-z0-9_.]{2,32}#\d{4}\b/i,
    ],
  },
  {
    kind: "off_platform",
    label: "Off-platform contact",
    patterns: [
      /(?:sigamos|continuemos|hablemos|seguimos)\s+(?:esto\s+)?(?:por|en)\s+(?:fuera|otro|privado|otra plataforma)/i,
      /fuera de capora/i,
      /outside (?:of )?capora/i,
      /let'?s (?:continue|talk|move) (?:this )?(?:outside|off[- ]platform|elsewhere)/i,
      /off[- ]platform/i,
      /mi (?:correo|email|tel[eé]fono) (?:es|personal)/i,
      /\bskype\b/i,
      /\bsignal\b\s*(?:app|number|n[uú]mero)/i,
    ],
  },
  {
    kind: "email",
    label: "Email address",
    patterns: [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  },
  {
    kind: "phone",
    label: "Phone number",
    patterns: [
      /(?:\+|00)\d{1,3}[\s.-]?(?:\d[\s.-]?){6,14}\d/,
      /\b\d{3}[\s.-]\d{3}[\s.-]\d{3}\b/,
    ],
  },
  {
    kind: "bank_account",
    label: "Bank account",
    patterns: [/(?:\b\d[\s-]?){10,24}\b/],
    fallback: true,
  },
];

export function detectSecurityPatterns(text: string): SecurityPatternHit[] {
  if (!text || text.length < 4) return [];
  const hits: SecurityPatternHit[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    if (rule.fallback) continue;
    if (rule.patterns.some((r) => r.test(text)) && !seen.has(rule.kind)) {
      // SWIFT is often a false positive inside an IBAN match
      if (rule.kind === "swift" && seen.has("iban")) continue;
      seen.add(rule.kind);
      hits.push({ kind: rule.kind, label: rule.label });
    }
  }

  if (hits.length === 0) {
    for (const rule of RULES) {
      if (!rule.fallback) continue;
      if (rule.patterns.some((r) => r.test(text))) {
        hits.push({ kind: rule.kind, label: rule.label });
        break;
      }
    }
  }

  return hits;
}

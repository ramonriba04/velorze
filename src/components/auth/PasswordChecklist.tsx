import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

export type PwChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export function checkPassword(pw: string): PwChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export function isPasswordValid(pw: string): boolean {
  const c = checkPassword(pw);
  return c.length && c.upper && c.lower && c.number;
}

export function PasswordChecklist({ value }: { value: string }) {
  const { t } = useTranslation();
  const c = checkPassword(value);
  const items: Array<{ ok: boolean; label: string; required: boolean }> = [
    { ok: c.length, label: t("auth.pw.length"), required: true },
    { ok: c.upper, label: t("auth.pw.upper"), required: true },
    { ok: c.lower, label: t("auth.pw.lower"), required: true },
    { ok: c.number, label: t("auth.pw.number"), required: true },
    { ok: c.special, label: t("auth.pw.special"), required: false },
  ];
  return (
    <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
      {items.map((it) => (
        <li
          key={it.label}
          className={`flex items-center gap-1.5 ${it.ok ? "text-emerald-600 dark:text-emerald-400" : it.required ? "text-muted-foreground" : "text-muted-foreground/70"}`}
        >
          {it.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 opacity-50" />}
          <span>{it.label}{!it.required && ` ${t("auth.pw.recommended")}`}</span>
        </li>
      ))}
    </ul>
  );
}

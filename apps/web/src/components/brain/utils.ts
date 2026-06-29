import type { Question, Answer } from "./types";

export function hasContent(a: Answer): boolean {
  return (
    a.selected.length > 0 ||
    a.other.trim().length > 0 ||
    Object.values(a.fields).some((v) => v.trim().length > 0)
  );
}

// turn one answer into the natural-language line the extractor reads
export function composeAnswer(qu: Question, a: Answer): string {
  if (qu.kind === "text") {
    return (qu.fields || [])
      .map((f) => (a.fields[f.key]?.trim() ? `${f.label}: ${a.fields[f.key].trim()}` : ""))
      .filter(Boolean)
      .join(", ");
  }
  if (qu.kind === "longtext") return a.other.trim();
  const base = a.selected.join(", ");
  const extra = a.other.trim();
  if (!extra) return base;
  if (qu.otherLabel) return base ? `${base} — ${extra}` : extra;
  return [base, extra].filter(Boolean).join(", ");
}

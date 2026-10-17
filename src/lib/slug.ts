// "Goldman Sachs" -> "goldman-sachs", "L&T" -> "l-and-t", "Samsung R&D" -> "samsung-r-and-d"
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// PINs are case-insensitive and ignore spaces and hyphens (CLAUDE.md section 7).
export function normalisePin(pin: string): string {
  return pin.replace(/[\s-]+/g, "").toUpperCase();
}

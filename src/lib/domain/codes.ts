/** Unambiguous alphabet for invite and group codes (no 0/O/1/I). */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Random suffix using a CSPRNG and rejection sampling (no modulo bias). */
export function randomCodePart(length = 4): string {
  const out: string[] = [];
  const buf = new Uint8Array(1);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    // 256 - 256 % 32 = 256, so every byte maps evenly; keep the check for other alphabets.
    const limit = 256 - (256 % CODE_ALPHABET.length);
    if (buf[0] < limit) out.push(CODE_ALPHABET[buf[0] % CODE_ALPHABET.length]);
  }
  return out.join("");
}

/** Normalises a prefix: uppercase letters/digits only, up to `max` chars. */
export function normalisePrefix(prefix: string, max = 10, fallback = "PILOT"): string {
  const p = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);
  return p || fallback;
}

/** Beta invite code: PREFIX-XXXX. */
export function makeInviteCode(prefix = "PILOT"): string {
  return `${normalisePrefix(prefix)}-${randomCodePart(4)}`;
}

/** Group code: first 6 letters of the name + -XXXX, e.g. MATHS1-7QX4. */
export function makeGroupCode(name: string): string {
  return `${normalisePrefix(name, 6, "GROUP")}-${randomCodePart(4)}`;
}

/** Canonical form of user-entered codes. */
export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;
export function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 20) return "Usernames are 3–20 characters.";
  if (!USERNAME_RE.test(u)) return "Use letters, numbers, dots and underscores only.";
  return null;
}

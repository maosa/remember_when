/**
 * Sanitizes a post-login `next` redirect target to prevent open-redirect
 * attacks. Only same-origin, relative paths are allowed.
 *
 * Accepts values like `/moments/abc`, `/home?x=1`. Rejects anything that could
 * navigate off-site or is otherwise suspicious:
 *   - external URLs (`https://evil.com`, `//evil.com`)
 *   - protocol-relative / scheme-bearing values (`javascript:`, `mailto:`…)
 *   - backslashes (some browsers treat `\` like `/`)
 *   - control characters (embedded newlines/tabs)
 *
 * Returns the safe path, or the fallback (default `/home`) when invalid.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/home'): string {
  if (!raw) return fallback

  // Must be a relative path anchored at the site root.
  if (!raw.startsWith('/')) return fallback
  // Reject protocol-relative ("//host") and scheme-relative ("/\host") forms.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // Reject anything containing a scheme separator or backslashes.
  if (raw.includes('://') || raw.includes('\\')) return fallback
  // Reject control characters (embedded newlines/tabs, etc.).
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) < 0x20) return fallback
  }

  return raw
}

/**
 * Legal-document versioning — single source of truth.
 *
 * Bump the `*_VERSION` string (date-based) whenever the corresponding markdown
 * document (`TERMS_OF_SERVICE.md` / `PRIVACY_POLICY.md`) changes materially. The
 * signup flow records the accepted version against each new user so that, per
 * Terms Section 11, we can later tell who needs to re-accept after a change.
 *
 * `LEGAL_EFFECTIVE_DATE` is the human-readable "Last updated" line shown on the
 * public pages — keep it in step with the version strings below and with the
 * `**Last updated: …**` line at the top of each markdown file.
 */
export const TERMS_VERSION = '2026-07-02'
export const PRIVACY_VERSION = '2026-07-02'
export const LEGAL_EFFECTIVE_DATE = '2 July 2026'

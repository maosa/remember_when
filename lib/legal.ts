/**
 * Legal-document versioning — single source of truth.
 *
 * Each constant is the "Last updated" date string at the top of the matching
 * markdown document (`TERMS_OF_SERVICE.md` / `PRIVACY_POLICY.md`). Bump it
 * (and the document's date line) whenever that document changes materially; the
 * signup flow records the accepted version per user in the `legal_acceptances`
 * table (see lib/legal-acceptance.ts) so we can tell who needs to re-accept
 * after a change, per Terms Section 11. Keep the two in sync.
 */
export const TERMS_VERSION = '2026-07-02'
export const PRIVACY_VERSION = '2026-07-02'

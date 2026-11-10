// llms.txt — plain-text summary of the site for AI agents and assistants
// (https://llmstxt.org). Static and public: lists ONLY pages that are already
// publicly reachable. Never add authenticated app routes, /api/*, /auth/*,
// invite/join links or the /monitoring tunnel here — this file is a public map.
// Allowlisted by exact path in proxy.ts.

export const dynamic = 'force-static'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rememberwhen.app'

const BODY = `# Remember When

> A shared memory book for the moments that matter. Create a moment, invite the people who were there, and build the memory together with photos, stories and the small details only each person noticed.

Moments are private: they are only visible to the people invited to them, and using the app requires a signed-in account. There is no public API; agents acting for a user should use the regular web interface, with the user signed in themselves.

## Pages

- [Home](${APP_URL}/): What Remember When is and how it works
- [Pricing](${APP_URL}/pricing): Plans and prices
- [Sign up](${APP_URL}/signup): Create an account
- [Sign in](${APP_URL}/login): Sign in to an existing account

## Legal

- [Terms of Service](${APP_URL}/terms)
- [Privacy Policy](${APP_URL}/privacy)
`

export function GET() {
  return new Response(BODY, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

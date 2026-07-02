# Privacy Policy

**Last updated: 2 July 2026**

This Privacy Policy explains how Remember When ("we", "us", "our") collects, uses, and protects your personal data. Remember When is currently operated by Andreas Maos, an individual based in the United Kingdom, pending incorporation of a formal legal entity. It applies to everyone who uses the Service, wherever in the world you're located — Remember When is built for a global user base.

This Policy should be read alongside our [Terms of Service](./TERMS_OF_SERVICE.md).

---

## 1. What data we collect

**Account data you give us directly:**
- First name, last name, email address, username, password (stored hashed via Supabase Auth — we never see or store your plaintext password)
- Profile photo (optional)
- Your selected colour theme preference

**Content you create:**
- Moments: name, date, location, tags
- Posts: narrative text, and any photos, videos, or voice recordings you attach
- Friend connections and moment membership/role information

**Data about other people you provide:**
- If you invite someone by email who doesn't yet have an account, we collect that email address solely to send the invitation and to match them to the pending invite if they sign up.

**Data we generate automatically:**
- Notification records (what was sent, whether it's been read)
- Timestamps (created/edited/deleted) on your content
- Basic security and abuse-prevention signals — e.g. IP address, used only for rate-limiting sensitive actions like invite-link lookups, and error/performance data captured by our error-monitoring tool if something breaks (see Section 4)
- An internal audit log of a small set of sensitive account/moment-governance actions (account deletion, password changes, role changes, member removal, ownership transfers, invite-link creation/revocation) — recorded for security and abuse investigation, not for general analytics

We do not run advertising, and we do not use your content to train AI models.

## 2. Why we use your data

We use the data above to: operate the core features of the Service (creating and sharing moments, posting, inviting people, notifications); secure your account and prevent abuse (rate limiting, audit logging); send you service communications (invite notifications, reminders you've opted into, account/security notices); and diagnose and fix bugs (error monitoring).

If you're in the UK or EU, our lawful bases for this processing are: **performance of a contract** (running the Service you signed up for), **legitimate interests** (security, abuse prevention, and service improvement), and **consent** where we ask for it explicitly (e.g. optional reminder emails, which you can turn off at any time in Settings).

## 3. Who can see your content

- **Other users:** only people you've explicitly added to a moment (as an editor or reader), or who've joined via a link you generated, can see that moment's posts and media. This is enforced with row-level security at the database level — a user who isn't a member of a moment cannot query its content through the app, full stop.
- **Friends:** your friends list is visible only to you; being someone's friend does not, by itself, give access to their moments.
- **The public:** never. There is no public feed and no discovery mechanism for moments.

## 4. Who we share data with (subprocessors)

We use a small number of third-party service providers to run Remember When. They process data on our behalf, under their own security and privacy commitments, and are not permitted to use your data for their own purposes.

| Provider | What it does | What it can access |
|---|---|---|
| **Supabase** | Database, authentication, and file storage | All account data, content, and media — this is where everything lives |
| **Vercel** | Application hosting and deployment | Application traffic; scheduled jobs (e.g. the daily reminder check) |
| **Sentry** | Error and performance monitoring, including session replay | Technical error/crash data and performance traces. We also use Sentry's Session Replay on a sample of sessions (10% of normal sessions, 100% of sessions with an error) to help us debug issues — this is configured with Sentry's default privacy settings, which mask all on-screen text and block images/media, so replay data captures UI interactions and structure rather than your actual content |
| **Upstash (Redis)** | Rate limiting for abuse-prone actions (e.g. invite-link lookups) | Short-lived rate-limit counters keyed by IP address — not your content |

Some of these providers may process data on servers outside your own country, including in the United States. Where that involves transferring personal data out of the UK or EU, we rely on the provider's standard contractual safeguards for that transfer. We do not sell your data to anyone, and we do not share it with data brokers or advertisers.

## 5. Security — who at Remember When can access your data

Access to moment content between *users* is enforced by database-level row-level security: someone who isn't a member of a moment cannot see it, technically, not just by policy.

Separately, a small number of backend operations — generating secure, time-limited links to your media, resolving invites, processing account deletions, and running the daily reminder job — necessarily run with elevated backend credentials that bypass those per-user restrictions, because that's the only way those operations can work. This means that, technically, whoever administers Remember When's backend has the ability to query stored data.

In practice: **we don't look.** Nobody at Remember When reviews, browses, or queries individual users' moments, posts, or media as a matter of course. Access of that kind only happens if (a) you specifically contact us and ask us to look into something on your account, or (b) we have a serious, concrete reason to investigate — for example, a credible abuse report, a security incident, or a legal obligation. Routine operation of the Service does not involve anyone reading your content. Sensitive account actions are recorded in an internal audit log (Section 1) so that this kind of access is itself accountable.

We continue to harden this over time (row-level security, storage access policies, and API-level checks have all been reviewed and tightened as the product has developed), and we'll update this section if that changes materially — for example, if we introduce encryption that removes even this narrow form of access.

## 6. Data retention and deletion

- **Leaving a moment.** If you leave a moment (without deleting your account), you're asked whether to delete your posts from that moment or leave them for other members to see, and you decide.
- **Deleting your account.** You can delete your account at any time from Account → Danger zone, by typing your username to confirm. Deletion is permanent and removes your profile (name, username, email, profile photo) and **every post you've authored anywhere on the Service**, including posts in moments owned by other people. Posts do not remain behind, attributed to you, once your account is deleted.
- **Moments you own.** If you own a moment that's shared with anyone else (i.e. it has at least one other member who has accepted membership), you cannot delete your account until you either transfer ownership of that moment to another member or delete the moment yourself — you'll be shown a list of the specific moments blocking deletion. This exists so that deleting your own account can never silently destroy content belonging to other people. Moments you own that nobody else has joined are deleted automatically along with your account.
- Deletion is enforced at the database level (not just in the app), so once it completes it cannot be reversed by us or by you — there is no recovery window.

## 7. Your rights

Wherever you're located, you can ask us to:
- **Access** a copy of your personal data
- **Correct** inaccurate data (most of this you can already do yourself in Account settings)
- **Delete** your data (Account → Danger zone, or by contacting us — note that if you own a moment shared with others, you'll need to transfer its ownership before account deletion can proceed, per Section 6)
- **Export** your data in a portable format
- **Object to or restrict** certain processing, and **withdraw consent** for anything we process on that basis (e.g. reminder emails, via Settings)

If you're in the UK, you also have the right to lodge a complaint with the [Information Commissioner's Office (ICO)](https://ico.org.uk/). If you're in the EU, you can complain to your local data protection authority. If you're a California resident, you have rights under the CCPA/CPRA to know what personal information we collect and to request its deletion, as described above — we don't sell personal information, so there's no "opt out of sale" to exercise.

To exercise any of these rights, contact us at andreasmaos@gmail.com. We'll respond within the timeframe required by applicable law (generally one month under UK/EU GDPR).

## 8. Children's privacy

Remember When is not directed at children under 13, and we don't knowingly collect data from anyone under that age. Because there's currently no age-verification step in sign-up, we can't guarantee this in practice — if you believe a child has created an account, contact us and we'll remove it. We're aware that, under UK law, a service "likely to be accessed by children" can trigger additional obligations (the ICO's Children's Code) even without being aimed at them; this is a design consideration we intend to revisit as the product matures, most obviously if we add age verification or family/guardian-supervised accounts.

## 9. Cookies and similar technologies

We use only the essential cookies/local storage needed to keep you signed in (via Supabase Auth) and remember basic preferences (like your selected theme). We don't run Google Analytics, advertising pixels, or third-party tracking cookies. Sentry's session replay (Section 4) uses its own client-side instrumentation rather than a tracking cookie, but is disclosed there for completeness.

## 10. Changes to this Policy

We'll update this Policy as the Service evolves, and notify users in-app or by email of material changes before they take effect.

## 11. Contact

Questions, requests, or complaints about this Policy: andreasmaos@gmail.com.

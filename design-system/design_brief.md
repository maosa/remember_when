# Remember When — Design Brief
## Opening Prompt + Screen Sequence Guide

---

## HOW TO USE THIS BRIEF

1. Open Claude Code
2. Upload DESIGN.md to the canvas as context before generating anything
3. Use the Opening Prompt below to start the project
4. Work through screens one at a time using the Screen Sequence Guide
5. After each screen is generated, refine with small targeted follow-up prompts before moving to the next

---

## OPENING PROMPT

Paste this as your very first prompt in Claude Code:

---

Design a web and mobile app called **Remember When** — a private, collaborative memory book. Users capture meaningful moments from their lives, write about them together, add photos and audio, and share them only with the people who were there. It is not a social network. There are no public feeds, no likes, no follower counts. The feel is calm, intimate, and warm — like a beautifully kept home rather than a productivity tool.

**Design system:** I have uploaded a DESIGN.md file with the full colour palette, typography (Lora for headings, DM Sans for UI), spacing, and component rules. Please follow it precisely throughout.

**Visual character:** Warm linen backgrounds (#F5F2ED), muted sage-teal green accent (#5C7A6B), soft stone surfaces (#EDEAE4), deep warm charcoal text (#2C2A25). No bright colours, no orange, no high saturation. Generous white space. The cover photos uploaded by users should always be the visual centrepiece of any screen that displays them.

**Start with the Home Page (desktop view).** I will ask for mobile and other screens after.

---

## SCREEN SEQUENCE GUIDE

Work through screens in this order. Each entry includes: what to ask for, key details to specify, and what to watch for.

---

### Screen 1 — Home Page (desktop)

**Prompt:**
Design the Home Page (desktop). The page has a fixed top navigation bar with: "Remember When" logo text left-aligned (Lora font), centre nav links for Home and Friends, and right-aligned bell icon (notifications) and circular user avatar. Below the nav: a personalised greeting "Hey, [Name]" in Lora on the left, and a "New moment" primary button (sage-teal) on the right. Below that: a search input and a sort dropdown side by side. Then two tabs: "Moments" and "Archived" with count badges. Below the tabs: a 3-column grid of moment cards. Each card has a 16:9 cover photo with a dark gradient overlay and the moment name in white at the bottom left. Below the photo: date, location, tags as small pills, and a role badge (Owner/Editor/Reader). A subtle [...] hover menu appears top-right of each card.

**Watch for:** Card grid should feel airy — enough spacing between cards. The gradient on cover photos must be visible but not too dark.

---

### Screen 2 — Home Page (mobile)

**Prompt:**
Now design the mobile version of the Home Page. Replace the top nav with a fixed bottom tab bar with 4 tabs: Home (house icon), Friends (people icon), Alerts (bell icon), Account (avatar). The top of the screen shows the greeting and New Moment button stacked. The search bar sits below. The moment cards display in a single column. Keep all the card details the same as desktop.

---

### Screen 3 — Moment Page (desktop)

**Prompt:**
Design the Moment Page (desktop). At the top: a full-width cover photo (tall, roughly 280px) with a dark gradient overlay fading from transparent at top to 75% opacity black at the bottom. The moment name in Lora white text sits bottom-left over the gradient, with date and location in smaller white text below. A small [...] edit menu appears top-right (owners and editors only). When scrolled, everything collapses to a sticky bar showing only the moment name. Below the cover photo: a row of tag pills (editable inline). Then a compact members row: overlapping circular avatars on the left (up to 5, then "+N more"), and three small buttons on the right: a camera icon button ("Edit cover photo"), an invite icon button ("Invite"), and a gear icon button ("Manage"). Then immediately below: a "Posts" heading with a sort toggle and "Add post" button on the right. Then a vertical list of post cards.

**Watch for:** Posts should start high on the page — the members row must be compact, not a large section. The cover photo gradient should look beautiful and cinematic.

---

### Screen 4 — Moment Page (mobile)

**Prompt:**
Now design the mobile version of the Moment Page. The cover photo is slightly shorter. The moment name and date/location remain overlaid in white. The members row collapses: avatars on the left, and just the gear icon on the right (no text labels on mobile). Post cards stack in a single column below.

---

### Screen 5 — Create Moment Modal

**Prompt:**
Design the Create Moment modal (desktop). It appears as a centred dialog over a dimmed background. Title: "New moment" in Lora. Fields top to bottom: Moment name (required, marked with a small asterisk), Date (with a 3-mode toggle: "Year" / "Month + Year" / "Full date"), Location (optional), People (a search field where you type a name or email — results appear in a dropdown, selected people appear as chips with an inline Editor/Reader toggle on each chip), Tags (chips with an inline text input). At the bottom: Cancel (secondary) and "Create moment" (primary sage-teal) buttons.

---

### Screen 6 — Sign Up

**Prompt:**
Design the Sign Up page. Centred card on the linen background. At the top: "Remember When" in Lora. Subtitle: "Start capturing your moments." Fields: First name and Last name side by side, then Email, then Username (with a small real-time availability indicator — green check or red X), then Password. At the bottom: a full-width "Create account" primary button. Below the card: "Already have an account? Sign in" as a subtle text link. A separate "See pricing plans" link further below.

---

### Screen 7 — Log In

**Prompt:**
Design the Log In page. Same centred card layout as Sign Up. Title: "Remember When" in Lora. Subtitle: "Sign in to your account." Fields: Email, then Password with a right-aligned "Forgot password?" link beside or below it. Full-width "Sign in" primary button. Below the card: "Don't have an account? Sign up" text link.

---

### Screen 8 — Notifications Page

**Prompt:**
Design the Notifications Page (desktop). Fixed nav at top. Page title "Notifications" in Lora left-aligned. "Mark all as read" ghost button on the right. A vertical list of notification items: each has a small circular icon (sage-teal for unread, muted for read), notification text (e.g. "@andreas (Andreas Louca) invited you as Editor on moment 'Our Ironman 2023'"), a relative timestamp on the right ("2h ago"), and a small blue dot for unread items. For moment invite notifications: two inline buttons "Accept" (primary small) and "Decline" (secondary small). Unread items have a very subtle warm tinted background. At the bottom, an empty state: bell icon, "You're all caught up."

---

### Screen 9 — Friends Page

**Prompt:**
Design the Friends Page (desktop). Page title "Friends" in Lora. A search input at the top: "Search by name or username…" with a magnifying glass icon. Below: a section "Friend requests" (count badge) showing incoming requests with Accept and Decline buttons. Then a "Your friends" section showing a list of friends with their avatars, names, and a small Remove button. Then a "Pending" section showing sent requests with a Cancel option. Empty states for each section when there's nothing to show.

---

### Screen 10 — Account Page

**Prompt:**
Design the Account Page (desktop). Fixed nav at top. Page title "Account" in Lora on the left, "Sign out" ghost button on the right. Four distinct sections separated by subtle dividers: (1) Photo — circular avatar with Upload and Remove buttons below. (2) Profile — form with First name + Last name side by side, Email, Username with real-time check. "Save changes" primary button. (3) Security — Current password, New password, Confirm new password fields. "Update password" button. (4) Danger zone — a section with a subtle red border and "Danger zone" label. Description text. A red outlined "Delete account" button. Below the main sections: two chevron-style list rows for "Notifications" (links to /settings) and "Plans" (links to /pricing).

---

### Screen 11 — Moment Settings Page

**Prompt:**
Design the Moment Settings Page (desktop). Back arrow link to the moment page at the top left. Page title "Moment Settings" in Lora. Four clearly separated sections: (1) Manage Members — a list of all members with owner first (crown icon), then editors, then readers. Each row shows avatar, full name, role badge, and a pencil edit icon (owner only, except on own row). (2) Invite Link — description text, a generate link button, and when a link exists: the URL in a monospace display box with a copy icon, expiry info, Revoke and Regenerate buttons. (3) Transfer Ownership — visible to owner only. A dropdown of editors. "Transfer ownership" button. Message if no editors exist. (4) Leave Moment — danger zone styling. "Leave moment" button (red outlined). Brief explanatory text.

---

### Screen 12 — Pricing Page

**Prompt:**
Design the Pricing Page. Auth-aware header (full nav for logged-in users, simple logo + Sign in + Get started buttons for guests). Hero: "Simple, honest pricing" in Lora, short tagline. Two cards side by side: Free ($0/month, feature list with checkmarks, "Get started free" or "Your current plan" CTA) and Plus ("Coming soon" badge, TBD price, greyed-out feature list, disabled button). Below the cards: a warm-toned footnote about early users being grandfathered in.

---

### Screen 13 — Landing Page (marketing)

**Prompt:**
Design the landing page for Remember When — for people who haven't signed up yet. This is a marketing page, not part of the app. Hero section: large emotional headline using "Remember when..." as the opening — e.g. "Remember when you all crossed the finish line together." followed by a short tagline: "The place where the people who were there come together to make sure it's never forgotten." A single "Get started free" primary button. Below: a brief 3-column section explaining the product in plain language (capture moments, write together, keep forever). Clean, emotional, warm. No feature grids. No screenshots of the product in this first pass.

---

## ITERATION TIPS

- After each screen generates, check: Does the palette match DESIGN.md exactly? Is Lora used for headings? Is spacing generous?
- If something is wrong, give one targeted correction at a time: "Change the card background to #EDEAE4" or "The moment name on the card should use Lora font, not DM Sans"
- Do not ask for multiple changes in one follow-up prompt
- Once all screens are designed, ask Claude Code to generate a DESIGN.md export so you have the design system documented in its native format
- Export to Figma for any detailed refinement, or export as HTML/CSS/React code to feed back into the codebase

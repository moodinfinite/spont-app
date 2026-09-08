# Connecting Google Calendar (local + friends test)

What you need before Spont can read anyone's real availability. Free —
no billing account, no credit card. Roughly fifteen minutes.

Google reorganises this console fairly often (the consent screen moved
under "Google Auth Platform" during 2025), so trust the names below more
than the exact click path.

## 1. Make a project

1. Go to <https://console.cloud.google.com> and sign in.
2. Project dropdown, top-left → **New Project**.
3. Name it `Spont`. No organisation needed. **Create**.
4. Make sure the dropdown now says Spont before continuing — it's easy
   to configure the wrong project.

## 2. Turn on the Calendar API

**APIs & Services → Library** → search **Google Calendar API** →
**Enable**.

This one is free to use and doesn't ask for billing. If any screen asks
you to enable billing, you're on the wrong API.

## 3. The consent screen

This is the fiddly part, and the layout depends on which version of the
console you get.

**If you see a four-step wizard** (User type → App information → Scopes
→ Test users), it's the older flow and everything below lives in one
place.

**If you see a left-hand menu with Overview / Branding / Audience /
Data access / Clients**, it's the newer "Google Auth Platform" layout,
and the three things you need are split up:

| You want | Newer console | Older console |
| --- | --- | --- |
| App name, contact email | **Branding** | Step 1 |
| External vs internal, test users, publishing status | **Audience** | Steps 1 and 4 |
| Scopes | **Data access** | Step 2 |

Most guides online still say scopes are "on the consent screen" — in
the newer console they are under **Data access**, which is the single
most common place to get stuck.

### Branding / app information

- **App name:** `Spont`. Testers see this: *"Spont wants access to your
  Google Account."*
- **User support email:** your own address, from the dropdown.
- **App logo: skip it.** Uploading a logo triggers Google's brand
  verification, which is a review you don't need and can't skip once
  started.
- **App domain / homepage:** leave blank for local development.
- **Authorised domains:** leave empty. You can't add `localhost` here —
  it isn't a real domain — and local development doesn't need one.
- **Developer contact:** your email. Required.

### Audience

- **User type: External.** "Internal" only exists if you're inside a
  Google Workspace organisation.
- **Publishing status: Testing.** Leave it. This is the whole trick — a
  testing app works for up to 100 addresses you name, with no
  verification review.
- **Test users → Add users:** every Google address that will try Spont,
  **including your own**. Missing yourself is a classic five-minute
  detour.

### Data access — the scopes

Click **Add or remove scopes**. A panel opens with every scope for the
APIs you've enabled, split into Non-sensitive, Sensitive and Restricted.
Filter for `calendar` and pick two:

| Scope | Why |
| --- | --- |
| `.../auth/calendar.freebusy` | Read *when* someone is busy, never what the event is |
| `.../auth/calendar.app.created` | Create and manage only a calendar Spont makes — no access to existing events |

Avoid `calendar` and `calendar.events`: both grant read access to event
details we've promised not to look at, and both are harder to verify
later if this ever goes public. This pairing is what makes the app's
privacy line — "we only ever see free or busy, never what's actually on
your calendar" — true by construction rather than by policy.

If a scope isn't in the list, there's a **manually add scopes** box at
the bottom of the panel; paste the full URL. And whichever route you
take, **click Update, then Save at the bottom of the page** — the panel
closing does not mean anything was saved.

Changing scopes later forces everyone to re-consent, so it's worth
getting right now.

## 4. Warn your testers about the scary screen

Because the app is unverified, everyone you invite will hit a full-page
warning: **"Google hasn't verified this app."** There's no obvious way
past it — they have to click **Advanced**, then **Go to Spont
(unsafe)**.

It looks exactly like the thing you'd tell a friend never to click
through. Tell them it's coming, in the same message as the invite link,
or you'll lose testers at the door for reasons that have nothing to do
with whether Spont is any good.

## 5. Create the credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Application type: **Web application**
- Name: `Spont local`
- **Authorised JavaScript origins:** `http://localhost:3000`
- **Authorised redirect URIs:** `http://localhost:3000/api/auth/google/callback`

Save, and Google shows a **Client ID** and **Client secret**.

## 6. Put them in .env — and only there

In `spont_app/.env` (already gitignored — never the repo, never chat,
never a screenshot):

```
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

If a secret ever does end up somewhere public, delete the client in the
console and make a new one — rotating takes a minute and nothing else
fixes it.

## The catch worth planning around

**In Testing mode, refresh tokens expire after about seven days.** A
refresh token is what lets Spont keep reading your calendar without you
signing in again — so a test running longer than a week means everyone
reconnecting, which will read as the app being broken rather than as a
Google policy.

Options, in order of effort:

1. **Live with it** for a short test, and tell testers up front they'll
   re-connect once a week.
2. **Publish the app** (consent screen → Publish). With the narrow
   scopes above this may go through with little friction, and tokens
   stop expiring. Verification review applies to sensitive scopes.
3. **Fall back to the mock provider** for the first pass and test the
   loop rather than real availability.

Worth deciding before building far, because it changes what the test can
actually tell you.

## What Spont still needs after this

The credentials only unlock the door. Someone still has to write
`GoogleCalendarProvider` against the existing `CalendarProvider`
interface, plus the sign-in route and callback. That's the next build,
and it's one class plus two routes — the interface and its mock already
exist and are tested.

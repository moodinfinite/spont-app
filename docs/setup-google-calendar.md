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

## 3. Set up the consent screen

**APIs & Services → OAuth consent screen** (or **Google Auth Platform**).

- **User type: External.** "Internal" only exists for Workspace orgs.
- App name `Spont`, your email for both support and developer contact.
- **Leave publishing status as "Testing".** This is the whole trick: a
  testing app can be used by up to 100 addresses you name, with no
  verification review.

## 4. Choose scopes

Two, and the pairing matters — it's what makes the privacy line in the
app ("we only ever see free or busy, never what's actually on your
calendar") structurally true rather than a promise we're asking people
to take on faith:

| Scope | Why |
| --- | --- |
| `.../auth/calendar.freebusy` | Read *when* someone is busy, never what the event is |
| `.../auth/calendar.app.created` | Create and manage only a calendar Spont makes — no access to existing events |

Avoid `calendar` and `calendar.events`: both grant read access to event
details we've promised not to look at, and both are harder to verify
later if this ever goes public.

Confirm the exact strings in the console's scope picker — that list is
the source of truth.

## 5. Add your testers

Still on the consent screen, **Test users → Add users**. Add every
Google address that will try Spont, including your own. Anyone not on
this list gets "access blocked" and no useful explanation.

Up to 100. Plenty.

## 6. Create the credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Application type: **Web application**
- Name: `Spont local`
- **Authorised JavaScript origins:** `http://localhost:3000`
- **Authorised redirect URIs:** `http://localhost:3000/api/auth/google/callback`

Save, and Google shows a **Client ID** and **Client secret**.

## 7. Put them in .env — and only there

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

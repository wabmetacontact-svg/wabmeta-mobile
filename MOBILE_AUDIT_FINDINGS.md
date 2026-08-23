# WabMeta Mobile — A-to-Z Audit Findings

**Target:** `c:/Users/Sameer Thakur/wabmeta-mobile` · Expo 57 / React Native 0.86 / React 19 / expo-router · ~45k LOC · 151 files
**Method:** every claim is checked against the running backend's real routes/socket events (source of truth), the web frontend contract, or the TypeScript compiler — not by reading alone.
**Baseline:** `tsc --noEmit` is **clean (0 errors)** before and after all fixes.

Legend: 🔴 breaks a feature · 🟠 misleading/fake data · 🟡 minor / latent · ✅ checked, OK

---

## Summary

| Area | Result |
|---|---|
| TypeScript typecheck | ✅ clean (0 errors) |
| Backend API contract (168 mobile calls vs 320 backend routes) | 🔴 **9 mismatches** — 7 fixed, 2 need backend work |
| Real-time (socket) inbox | ✅ event names match backend |
| Real-time (socket) campaigns | 🔴 per-contact events wrong name — **fixed** |
| Fake/fabricated data shown as real | 🟠 **9 blocks across 7 screens** — all removed |
| Campaign Create wizard (deep pass) | 🔴 tag-audience count + all-count bugs — **fixed** |
| Chatbot builder (deep pass) | 🟠 nodes missing `position` (cross-client) — **fixed** |
| Inbox chat / Wallet+payments / Templates create (deep pass) | ✅ verified correct, no bugs |
| Auth / token refresh / secure storage | ✅ correct (single source, single-flight refresh) |
| Dead buttons / broken navigation | ✅ none found |
| Dead code | 🟡 `socket.service.ts` removed |

---

## 🔴 1. Backend API contract mismatches (7 fixed)

The mobile `api.ts` called endpoints/methods the backend does not expose. Verified against every `*.routes.ts` in `wabmeta-backend`. All fixed in `src/services/api.ts`:

| # | Mobile called | Backend actually has | Impact | Fix |
|---|---|---|---|---|
| 1 | `POST /contacts/bulk-delete` | `DELETE /contacts/bulk` (ids in body) | **Bulk-delete contacts silently 404'd** (used in Contacts tab) | ✅ `DELETE /contacts/bulk` `{ data:{contactIds} }` |
| 2 | `POST /crm/sync-contacts` | `POST /crm/sync-from-contacts` | **"Sync from contacts" button failed** (CRM screen) | ✅ path corrected |
| 3 | `PUT /contacts/:id` | `PATCH /contacts/:id` | Contact edit would 404 | ✅ PATCH |
| 4 | `PUT /contacts/groups/:groupId` | `PATCH /contacts/groups/:groupId` | Group edit would 404 | ✅ PATCH |
| 5 | `POST /contacts/bulk` | `PATCH /contacts/bulk` | Bulk tag/group update would 404 | ✅ PATCH |
| 6 | `DELETE /contacts/delete-all` | `DELETE /contacts/all` | "Delete all" hit `/:id` with id="delete-all" → 404 | ✅ `/contacts/all` |
| 7 | `GET /contacts/import/stats` | `GET /contacts/import-stats` | Import stats 404 | ✅ hyphenated path |

**#1 and #2 were live user-facing breakages** (called from screens today). #3–#7 were latent (API methods not yet wired to a screen) but objectively wrong and now correct.

## 🔴 2. API calls with NO backend route (need backend work — not fixable client-side)

Both are currently **unused** by any screen, so no live breakage, but they cannot work if wired:

- `crm.getPipelineById` → `GET /crm/pipelines/:id` — backend only has `GET /crm/pipelines` (list). No detail route.
- `chatbots.getStats` → `GET /chatbots/:id/stats` — backend chatbot router has no `/:id/stats`.

**Action:** either add these routes to the backend, or drop the methods. Left in place with this note.

---

## 🔴 3. Campaign real-time was on the wrong event name (fixed)

`src/hooks/useCampaignRealtime.ts` listened for **`contact:status`**, but the backend
(`campaigns.socket.ts`) emits per-recipient updates as **`campaign:contact`** and
**`campaign:contact:status`**. Result: live per-contact send status never arrived on mobile
(the aggregate `campaign:progress` bar did work).

**Fix:** bind the handler to both `campaign:contact` and `campaign:contact:status` (matching the web
app). All other campaign events (`campaign:progress` / `:completed` / `:error` / `:update`) already
matched the backend. Inbox events (`message:new`, `message:status`, `conversation:updated`) and room
joins (`join:conversation`, `campaign:join`, …) also verified correct.

---

## 🟠 4. Fabricated data shown as real (all removed)

Multiple screens rendered **hard-coded fake data** when their API call didn't succeed. This both
violates the "no fake data" rule and hides whether the feature actually works (a broken screen looked
populated). Every block below was replaced with an honest empty / zero / null state:

| Screen | What it faked | Fix |
|---|---|---|
| `billing/index.tsx` | A fake **ACTIVE paid subscription** + two fake **PAID invoices (₹2499)** | subscription → `null`, invoices → `[]` |
| `automation/index.tsx` | Two fake automations ("Welcome New Leads", 1420 executions) | empty list + zero stats |
| `reports/index.tsx` | **`Math.random()`-generated daily chart** + fake top campaigns ("Diwali Special Offer" 5200) + `?? 1200` per-item fallbacks | real data only; empty chart/list when none |
| `crm/index.tsx` | Fake stats (48 leads, ₹245000, 37.5% win) + fake pipeline | `null` stats, empty pipelines |
| `crm/leads.tsx` | Two fake leads ("Rahul Sharma", "Pooja Verma") | empty list |
| `crm/lead/[id].tsx` | Fake lead detail ("Website Design Project", ₹25000) | error + navigate back |
| `profile/index.tsx` | Fake login session (IP 192.168.1.1) | empty list |

All target screens were confirmed null/empty-safe before the change (e.g. `if (!lead) return null`,
existing empty states, `stats?.` access, chart `maxVal` floored at 100).

**Left in place (with caveat):** `billing/index.tsx` `FALLBACK_PLANS` — the *plan catalog* (₹999 /
₹2499 / ₹5999) is still shown if `/billing/plans` fails. This is semi-static marketing, not a claim
about the user's account. 🟡 **Verify these prices/slugs match the backend's real plans**, otherwise
the upgrade buttons could send an unknown `planKey`.

---

## 🔴 5. Deep pass — Campaign Create wizard (2 bugs fixed)

Read the full 6-step wizard (`campaigns/create.tsx`) and its step components, and checked the final
payload against the backend `createCampaignSchema` (Zod) and audience-selection service.

- **Payload shape:** ✅ correct — `name`, `templateId`, `whatsappAccountId`, `contactIds`,
  `contactGroupId`, `audienceFilter`, `csvContacts`, `variableMapping`, `scheduledAt` all match the
  schema. (`audienceFilter: { all: true }` is stripped to `{}` by Zod, which the service resolves to
  "all ACTIVE contacts" — so the All-contacts audience works.)
- 🔴 **Tag audience count read the wrong path.** `res.data?.data?.meta?.total` — but the backend
  returns `{ success, data: [...], meta: { total } }`, so total is at `res.data.meta.total`. It was
  always `0`, and step-3 validation requires `totalRecipients > 0`, so **a tag-based audience could
  never advance past the Audience step.** Fixed to read top-level `meta.total`.
- 🟠 **All-contacts count was inflated.** It used `stats.total` (all non-deleted: ACTIVE + BLOCKED +
  UNSUBSCRIBED) while the backend messages only ACTIVE contacts. The pre-send recipient number could
  read higher than what actually sends (billing itself is server-side, so charges were still correct).
  Fixed to use `stats.active`.
- ✅ Group count (`group.contactCount`), tags list (`[{tag,count}]`), template mapping, and the
  create → estimate-cost → start flow all verified correct against the backend.

## ✅ Deep pass — Inbox chat (`inbox/[id].tsx`)

Fully reviewed; **no bugs**. Send (`/whatsapp/send/text` with the resolved CONNECTED account),
media upload + `sendMediaMessage`, optimistic temp-message + reconciliation, socket new-message
dedup (by id / waMessageId), status-update matching (messageId / tempId / waMessageId), mark-as-read,
and inverted-list pagination with newest-first sort + append dedup — all correct.

## ✅ Deep pass — Tab screens (inbox / contacts / campaigns / dashboard lists)

Response parsing verified. Notably the **Contacts tab reads `meta` from the top level correctly**
(`res.data.meta`), unlike the campaign-create bug above. Campaign detail (`campaigns/[id].tsx`) has no
fabricated data and uses the now-fixed realtime hook. 🟡 One leftover debug `console.log` dumps the
full contacts response on every load (`contacts.tsx`) — harmless, worth removing.

## ✅ Deep pass — Wallet & payments (`wallet/`, `RazorpayCheckout`)

Fully traced the money path against the backend. **No bugs.**
- `createTopUpOrder` sends the amount in **rupees** (backend validates ₹100–₹1,00,000) ✅.
- The order response `{ orderId, amountPaise, razorpayKeyId }` is read correctly (the
  `rzp_test_placeholder` key fallback never triggers because the backend always returns the key) ✅.
- The Razorpay WebView passes `key` / `amount` (paise) / `order_id`, and the success handler returns
  `razorpay_order_id` / `razorpay_payment_id` / `razorpay_signature`, which `verifyTopUp` sends under
  exactly the names the backend expects ✅.
- Wallet display fields (`balance`, `isActive`, `maxTopUpAmount`, `maxMonthlyTopUp`,
  `currentMonthTopUp`) match the backend `formatWallet` output (all rupees) ✅.
- No fabricated wallet data (unlike the billing screen). 🟡 Two debug `console.log`s dump full
  responses (`wallet/index.tsx`, `RazorpayCheckout.tsx`).

## ✅ Deep pass — Templates create wizard (`templates/create.tsx`)

**No bugs.** The create/update payload (`name`, `language`, `category`, `bodyText`, `variables`,
`headerType/headerContent`, `footerText`, `buttons`, `whatsappAccountId`) matches
`createTemplateSchema` exactly; `variables` (`{index, type, example}`) and `buttons`
(`{type, text, url?, phoneNumber?}`) shapes are correct; `normalizeName` produces a schema-valid
`^[a-z0-9_]+$` name; and creation genuinely submits to Meta when a WABA is connected, so the
"submitted to Meta for approval" message is accurate.

## 🟠 7. Chatbot builder — nodes had no `position` (fixed, cross-client)

The mobile chatbot builder created flow nodes as `{ id, type, data }` with **no `position`**. Mobile
saves still succeed (the chatbot routes don't run the Zod validator, and `flowData` is stored as JSON),
and the runtime engine traverses by edges, so **mobile itself works**. But the backend `flowNodeSchema`
marks `position` **required**, and the web canvas (@xyflow) needs it — a chatbot authored on mobile
would render with all nodes stacked/broken when opened on the web. **Fixed:** every node (initial start
node + each added node) now gets a `position`, laid out as a vertical column so the flow is portable.

## Quick pass — small screens (automation create, contacts import, crm new, notifications)

- ✅ **Contacts import** — `import({ csvData, groupId, tags })` and `bulkPaste({ phoneNumbers, groupId,
  tags })` match the backend controller (`csvData`, `phoneNumbers`) exactly.
- ✅ **CRM new lead** — `createLead({ title, value, priority, source, contactId, pipelineId })` — all
  fields accepted by the backend `createLead` service.
- ✅ **Notifications** — defensive parsing (array / `items` / `notifications`), optimistic mark/delete
  backed by real API calls, honest empty state on failure. No fake data.
- 🔴→✅ **Automation create/update — `targetGroupIds` & `excludeExisting` were silently dropped
  (FIXED in backend).** This was a **backend bug**, not a mobile one. The mobile correctly sends both,
  the Prisma `Automation` model has both columns, and `automation.service.ts` stores them — but
  `automation.controller.ts` (create + update) destructured only
  `{ name, description, trigger, triggerConfig, actions, isActive }` and never forwarded
  `targetGroupIds` / `excludeExisting`. Effect: every automation (mobile AND web) ignored its
  target-group filter and "exclude existing contacts" setting — an automation meant for one group ran
  for everyone. **Fixed** in `wabmeta-backend/src/modules/automation/automation.controller.ts` (both
  handlers now forward the two fields; backend typechecks clean). The backend change is not yet
  committed/pushed.

## ✅ Final sweep — everything else

- **Auth screens** (`login`, `signup`, `verify-otp`, `forgot/reset-password`): `AuthService` posts to
  the correct endpoints (`/auth/register`, `/auth/verify-otp`, …) with the right fields. Clean.
- **Push notifications** (`usePushNotifications`): correctly gated for Expo Go / physical device /
  permissions, registers the token to `/notifications/push-token`, and is actually mounted (via
  `NotificationsContext` in the root layout) — so it really runs. Tap-handling routes to `actionUrl`
  or the notifications screen. Clean.
- **WhatsApp settings** (`settings/whatsapp.tsx`, 1322 lines): all calls
  (`meta.getAccounts`, `whatsapp.syncAllAccountsQuality`, `whatsapp.syncAccountQuality`,
  `meta.disconnect`, `meta.setDefault`) hit real, verified backend routes. No fabricated data.
- **`data.data.meta` anti-pattern:** swept the whole app — the campaign-create case was the only one;
  no others remain.
- **"Coming soon" stubs** (ChatInput location/contact share, CRM tasks, account-deletion→web, team,
  Microsoft login) are all **honest** — they tell the user the feature isn't available rather than
  faking it. Left as-is.

## 🟡 8. Minor / latent

- **Dead code removed:** `src/services/socket.service.ts` (unused, hard-coded prod URL), plus the
  unused hooks `src/hooks/useContacts.ts` and `src/hooks/useCampaigns.ts` (screens fetch directly).
- **Debug logs removed:** full-response / payment-message `console.log`s in `contacts.tsx`,
  `wallet/index.tsx`, and `RazorpayCheckout.tsx`.
- **Socket URL hard-coded** in `SocketContext.tsx` (`io("https://api.wabmeta.com")`) — ignores
  `EXPO_PUBLIC_API_URL`. Fine for production, but a staging build would still hit prod sockets.
- **Google Sign-In config:** `.env` sets `GOOGLE_ANDROID_CLIENT_ID`, `..._IOS_...`, and `..._WEB_...`
  to the **same Web client ID**. Native Android/iOS Google sign-in generally needs platform-specific
  OAuth clients (Android client tied to the app's SHA-1). Verify on a real build; this is a Google
  Cloud config item, not a code bug.
- **Unused env var:** `EXPO_PUBLIC_MOBILE_CONNECT_URL` is set but never read;
  `whatsapp-connect.tsx` hard-codes `https://wabmeta.com/dashboard/settings` instead.
- **Dead emits:** `SocketContext` emits `user:join` — the backend no longer listens for it (tenant/user
  rooms are auto-joined from the JWT). Harmless (ignored server-side).

---

## ✅ Verified OK

- **Auth & tokens:** `secureStorage.ts` stores JWTs in `expo-secure-store` (AsyncStorage fallback);
  `utils/storage.ts` re-exports the same `AuthStorage` (no split-brain). Single-flight refresh with
  debounce, `x-new-access-token` response header handling, 401→refresh→retry, force-logout event → all
  coherent and match the web client.
- **Inbox send:** `whatsappApi.sendText({ whatsappAccountId, to, message })` matches
  `POST /whatsapp/send/text`; account resolved from the first `CONNECTED` account. Media upload +
  `sendMediaMessage` match backend paths.
- **Navigation:** no empty `onPress`, no dead routes; `chatbot/new` correctly handled by `[id].tsx`
  via `isNew = id === "new"`.
- **`.env`** is not git-tracked and holds only public `EXPO_PUBLIC_` values.

---

## ⚠️ Repo state note (not a code bug)

`git status` shows the entire real app (`app/`, `src/`, `app.json`, config) is **untracked** — the only
commit (`7ead70d "Initial commit"`) is a bare Expo template. None of this app's code, or these fixes,
is under version control yet. Recommend an initial real commit when you're ready.
</content>
</invoke>

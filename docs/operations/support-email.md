# Support and transactional email (`kaila-app.com`)

KAILA sends transactional mail from **`no-reply@kaila-app.com`** (Brevo).  
User-facing help uses **`support@kaila-app.com`**, which must **receive** mail.

Brevo is configured for **sending only**. Use a free forwarder for inbound support mail.

## Recommended: ImprovMX (free forwarding)

DNS for `kaila-app.com` is managed separately from Brevo sending records.

1. Sign up at [improvmx.com](https://improvmx.com) (free tier).
2. Add domain **`kaila-app.com`**.
3. In DNS, add ImprovMX **MX records** (exact values shown in ImprovMX dashboard), typically:
   - `MX` `@` → `mx1.improvmx.com` priority **10**
   - `MX` `@` → `mx2.improvmx.com` priority **20**
4. In ImprovMX, create aliases:
   - **`support@kaila-app.com`** → your ops inbox
   - **`privacy@kaila-app.com`** → the same ops/DPO inbox (required for identity-verification and Privacy Policy contact)
5. Wait for DNS propagation (often 5–30 minutes).
6. Send a test to `support@kaila-app.com` and confirm it arrives.

> **Note:** Root-domain MX records route *all* inbound mail for `@kaila-app.com` through ImprovMX. That is fine while Brevo **Receiving** stays off. You can add more aliases later (`hello@`, `billing@`, etc.).

## App configuration

API (`.env`):

```env
MAIL_FROM_ADDRESS=no-reply@kaila-app.com
MAIL_FROM_NAME=KAILA
SUPPORT_EMAIL=support@kaila-app.com
```

Web (optional, defaults to the same):

```env
NEXT_PUBLIC_SUPPORT_EMAIL=support@kaila-app.com
```

Branded emails include a footer link: `mailto:support@kaila-app.com`.

Consumer Support surfaces that use the same address:

- `/support` hub — secondary “Email support@…” CTA beside New support request
- `/support/new` — email fallback under the case form (and on send failure)
- FAQs — “How do I contact support?” and the “Still need help?” aside
- Privacy policy Contact section (general support)
- Privacy / DPO contact **`privacy@kaila-app.com`** on Privacy Policy and identity-verification notice (forward to the same inbox until a separate mailbox exists)

In-app support cases remain the primary tracked channel (ADR-0032). Email is the signed-out / fallback path.

## Verify branded outbound mail

```bash
cd /var/www/kaila-rebuild/apps/api
php artisan mail:test you@example.com
```

The command sends the same KAILA-branded HTML and plain-text layout used by
production notifications. Check Brevo → **Transactional** for delivery status.

## Android internal-test invites (Admin)

Admins and super admins can send the typed Android internal-test invite from
**Admin → People**:

1. Select accounts and/or open **Send Android test invite**.
2. Optionally paste additional emails (comma or newline separated), including
   addresses that are not KAILA accounts yet.
3. Confirm to queue branded invites through Brevo.

KAILA accounts also receive a durable **in-app inbox** invitation
(`ops.android_test_invite`) that opens `/android-test` in the consumer app.
Pasted emails without an account receive email only.

API env (optional overrides; defaults match production Play internal testing):

```env
ANDROID_INTERNAL_TEST_URL=https://play.google.com/apps/internaltest/4701403150708602285
KAILA_FOUNDER_NAME="John Mark Agustin E. Acido"
KAILA_FOUNDER_TITLE="KAILA Founder"
```

Consumer web may override the in-app CTA with:

```env
NEXT_PUBLIC_ANDROID_INTERNAL_TEST_URL=https://play.google.com/apps/internaltest/4701403150708602285
```

Endpoint: `POST /api/v1/admin/marketplace/mail/android-internal-test` with
`{ "userIds": ["…"], "emails": ["…"] }` (at least one required; max 50 recipients).
Response includes `sent`, `inboxSent`, and `skipped`.
See ADR-0060.

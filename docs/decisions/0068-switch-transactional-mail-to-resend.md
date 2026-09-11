# ADR 0068: Switch transactional mail from Brevo to Resend

## Context

Production KAILA rebuild sent transactional mail through Brevo. Access-request
and test messages to `support@kaila-app.com` soft-bounced because Brevo’s shared
relay IP was rejected (SpamCop). The sibling pikl app on the same domain already
delivers reliably via Resend (`MAIL_MAILER=resend`).

## Decision

1. Install `resend/resend-php` and set `MAIL_MAILER=resend` with `RESEND_API_KEY`
   (reuse the verified `kaila-app.com` Resend domain already used by pikl).
2. Keep `MAIL_FROM_ADDRESS=no-reply@kaila-app.com` and ImprovMX for inbound
   `support@` / `privacy@`.
3. Leave the Brevo mailer code and `BREVO_API_KEY` in place for rollback, but do
   not use Brevo as the default mailer.
4. Update operations docs to describe Resend as the outbound provider.

## Consequences

- Outbound delivery follows the same path as pikl, avoiding the Brevo shared-IP
  bounce that blocked support notifications.
- DNS must keep Resend SPF/DKIM for `kaila-app.com` valid.
- Ops should verify delivery in Resend → Emails after deploy and queue restart.

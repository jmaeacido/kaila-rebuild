# ADR 0060: Typed Admin Android internal-test invite mail

## Context

Staff need to invite Android testers with a KAILA-branded email that includes the
Play Console internal-test link. Outbound mail already uses Brevo and a shared
Bull/wordmark layout for welcome, password reset, and provider decisions. There
was no Admin path to send ops invites, and a free-form composer would invite
inconsistent branding and unsafe arbitrary mail content. Invites also need to
appear in the KAILA app inbox for existing accounts, as a system invitation.

## Decision

1. Add one typed notification (`BrandedAndroidInternalTestInvite`) with HTML and
   plain-text views under `mail/ops/`, using `<x-mail.layout>`.
2. Expose `POST /api/v1/admin/marketplace/mail/android-internal-test` for
   `super_admin` / `admin` only. Accept selected People `userIds` and/or pasted
   `emails` (non-accounts allowed), dedupe by email, batch-cap at 50, skip
   invalid/deleted recipients.
3. For recipients who are KAILA users, also create a durable inbox notification
   (`ops.android_test_invite`) via `NotificationService` so the invitation appears
   in the KAILA app inbox and opens `/android-test`. Email-only paste recipients
   do not get an inbox row.
4. Store the Play internal-test URL and founder sign-off in `config/kaila.php`
   (env-overridable). Do not add Reply-To as founder; keep `no-reply@` sender and
   support footer.
5. Surface the action on Admin People (multi-select + paste dialog). Do not ship a
   generic compose-mail UI.

## Consequences

- Tester invites stay branded and reviewable like other transactional mail.
- Existing KAILA accounts receive both email and a system inbox invitation.
- Coverage tests must count the new sender and HTML template.
- Future ops mail types should follow the same typed-notification pattern rather
  than a free-form composer.

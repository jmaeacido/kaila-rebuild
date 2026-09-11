# Identity verification — production activation go/no-go report

| Field | Value |
| --- | --- |
| Date | 2026-09-11 |
| Prepared for | Release owner — John Mark Agustin Estrosos Acido |
| Activation performed? | **No** — flags not switched for production activation in this change set |

## Control scorecard

| # | Minimum control | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Admin MFA for identity evidence | **PASS** | `AdminMfaService`, `EnsureIdentityReviewerMfa`, admin MFA routes/UI; tests deny preview without MFA and allow after challenge |
| 2 | Private encrypted evidence storage | **PASS (local encrypted)** | `IdentityEvidenceCipher`; `IDENTITY_EVIDENCE_ENCRYPT_AT_REST`; private disk; no public URLs; docs in `identity-evidence-storage.md` |
| 3 | Complete authorization tests | **PASS** | Production-controls feature tests: outsider forbidden, member cannot see others’ evidence, guest unauthorized, admin MFA gate |
| 4 | Upload safety | **PASS** | `IdentityImageValidator` (extension/MIME/signature/size); UUID object keys; quarantine; malware scan job; SVG/HTML reject tests |
| 5 | Sensitive-data protection | **PASS** | Expanded `SensitiveDataRedactor` + unit/feature tests; audits exclude raw images |
| 6 | Notice and consent (specific purpose) | **PASS** | Purpose statement wired in config/API/UI; notice/consent versions `1.1`; separate unticked consent; location not bundled |
| 7 | Accurate claims | **PASS** | “Identity verified” + non-guarantee copy; removed “trusted local provider” implications in welcome/community/landing |
| 8 | Auditability | **PASS** | Access/decision/appeal/hold/purge audits; Eloquent append-only guards; no raw ID in metadata |
| 9 | Retention / deletion / holds / tombstones | **PASS** | Explicit periods; legal holds API; tombstones; `identity-evidence:replay-tombstones` tested |
| 10 | Operational readiness | **PARTIAL** | Tabletop log drafted; QA matrix drafted with device rows **PENDING**; `privacy@` MX exists but **alias not verified** |
| 11 | Controlled activation plumbing | **PASS** | Kill switch (`CAPTURE_ENABLED`); allowlist + rollout percent; fail-closed storage/scanner checks; staging continuity percent only |
| 12 | Processor inventory | **PASS** | `identity-processor-inventory.md` (not N/A) |

### External status (must remain open)

| Item | Status |
| --- | --- |
| NPC registration/exemption | Pending — none claimed |
| Legal counsel | Pending — none retained |
| Business registration | Pending |
| Independent security review | Not conducted |

Release-owner acceptance of these external regulatory risks is **not** legal compliance.

## Tests executed

```text
cd apps/api && php artisan test --filter='IdentityVerification|SensitiveDataRedactor'
→ 21 passed
```

Includes MFA enforcement, encryption/quarantine, SVG reject, allowlist gating, audit append-only, purge tombstone + replay, legal hold, redaction.

## Deployment / configuration steps (only after you approve)

Do **not** run these until you accept this report.

1. Confirm ImprovMX alias `privacy@kaila-app.com` → your inbox; send/receive a test message.
2. Configure MFA on your admin account via Admin → Identity reviews (setup + confirm). Save recovery codes offline.
3. Complete PENDING rows in `docs/privacy/identity-qa-matrix.md` on your desktop/phone.
4. Countersign `docs/privacy/runbooks/identity-tabletop-2026-09-11.md`.
5. Set controlled activation env (example):

```bash
cd /var/www/kaila-rebuild/apps/api
# Edit .env — example for LIMITED GO:
# IDENTITY_VERIFICATION_CAPTURE_ENABLED=true
# IDENTITY_VERIFICATION_ENFORCEMENT_ENABLED=true   # enable only when ready to gate jobs/offers
# IDENTITY_VERIFICATION_ROLLOUT_PERCENT=0
# IDENTITY_VERIFICATION_ALLOWLIST_USER_IDS=<your-user-id>
# IDENTITY_VERIFICATION_ALLOWLIST_EMAILS=<your-email>
# IDENTITY_EVIDENCE_ENCRYPT_AT_REST=true
# IDENTITY_VERIFICATION_FAIL_CLOSED=true
# IDENTITY_EVIDENCE_DISK=identity-evidence-local
# MEDIA_SCANNER=clamav   # required if APP_ENV=production

php artisan config:clear
sudo systemctl reload php8.4-fpm
sudo systemctl restart kaila-rebuild-queue.service
# Rebuild web/admin if UI changes not yet deployed:
# (cd ../web && npm run build && sudo systemctl restart kaila-rebuild-web.service)
# (cd ../admin && npm run build && sudo systemctl restart kaila-rebuild-admin.service)
```

6. Expand allowlist / raise `ROLLOUT_PERCENT` only after monitoring the test cohort.

## Rollback

```bash
# Immediate kill switch
IDENTITY_VERIFICATION_CAPTURE_ENABLED=false
# Optional: also stop enforcement
IDENTITY_VERIFICATION_ENFORCEMENT_ENABLED=false
php artisan config:clear
sudo systemctl reload php8.4-fpm
sudo systemctl restart kaila-rebuild-queue.service
# Quarantine/delete as needed:
php artisan identity-evidence:purge
```

Evidence already collected remains until retention/purge/holds allow deletion.

## Remaining risks

- No NPC filing / counsel opinion / business registration / independent audit.
- One-person reviewer cannot meet independent-appeal separation without delay or external help.
- Local-disk evidence (not yet dedicated regional bucket with CMK custody paperwork).
- Device/accessibility QA incomplete.
- `privacy@` alias not proven end-to-end from this environment.
- Staging currently has capture enabled with rollout 100% for continuity — treat production activation as a **separate**, allowlist-first change.

## Recommendation

**LIMITED GO** — after you complete the operational checklist in steps 1–4 above.

Not **GO** (full open rollout). Not **NO-GO** on mandatory technical controls (those largely PASS).

Awaiting your explicit approval before any production activation commands are applied.

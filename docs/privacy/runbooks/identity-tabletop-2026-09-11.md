# Identity verification — tabletop incident rehearsal log

| Field | Value |
| --- | --- |
| Date | 2026-09-11 |
| Facilitator | Engineering agent under release-owner direction |
| Participants | John Mark Agustin Estrosos Acido (sole operator — self-rehearsal) |
| Scenario | Suspected reviewer misuse + failed malware quarantine + restored backup reintroducing purged objects |

## Walkthrough

1. **Detect** — Admin preview audit `identity.evidence_viewed` reviewed; unusual access would be spotted via `audit_events`.
2. **Contain** — Set `IDENTITY_VERIFICATION_CAPTURE_ENABLED=false` (global kill switch). Confirm config clear / PHP-FPM reload.
3. **Preserve** — Do not delete audit rows (append-only model guards). Do not email raw evidence.
4. **Malware/quarantine failure** — Evidence with `scan_status=failed|rejected` cannot be previewed (`clean` required). Fail-closed storage probe blocks new capture when disk errors.
5. **Backup restore** — Run `php artisan identity-evidence:replay-tombstones` after restore; automated test covers restored-object deletion.
6. **Notify** — Contact path `privacy@kaila-app.com` / `support@kaila-app.com`; NPC notification assessment remains counsel-pending.
7. **Recover** — Re-enable capture only with allowlist; require MFA session for reviewers.

## Result

| Item | Result |
| --- | --- |
| Kill switch procedure | Documented and verified in config |
| Tombstone replay command | Implemented + tested |
| MFA denial without challenge | Tested |
| Independent counsel notification script | Pending (no counsel retained) |
| Operator attestation | Release owner must countersign before production activation |

Operator countersignature: ______________________ date: __________

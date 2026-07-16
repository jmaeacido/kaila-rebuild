# Phase 7 pilot operations runbook

## Service objectives and alerts

| Signal | Pilot objective | Page when |
|---|---:|---:|
| API availability | 99.9% over 30 days | 5-minute success rate below 99% |
| API latency | 95% below 500 ms | p95 above 750 ms for 10 minutes |
| Realtime publication | 99% below 2 seconds | p95 above 5 seconds for 10 minutes |
| Outbox backlog | Oldest pending below 60 seconds | oldest above 5 minutes |
| Error rate | Below 1% over 15 minutes | above 2% for 10 minutes |

Structured API and realtime logs carry request/trace IDs. Alerts link to the dashboard, deployment, and this runbook. Never record messages, tokens, precise coordinates, or evidence paths in telemetry.

## Incident response

1. Acknowledge, assign an incident lead, set severity, and open a timestamped record.
2. Protect users: disable the operation, pause workers, or enable maintenance mode. Preserve evidence.
3. Correlate API, realtime, queue, database, and deployment events by trace ID and UTC time.
4. For suspected exposure, revoke affected sessions/keys, preserve audit evidence, and notify the privacy/security owner.
5. Validate recovery with health, authentication, authorization, outbox, and representative lifecycle checks.
6. Communicate impact and workaround plainly; complete a blameless review with owners and dates.

## Backup and restore drill

Use a least-privileged backup identity and encrypted storage. Never commit dumps or put credentials on command lines.

1. Record deployment SHA, migrations, UTC start, database version, and source row counts.
2. Create a transactionally consistent MySQL logical backup with routines/triggers and checksums; version the private-object inventory separately.
3. Provision an isolated empty restore database with no application traffic.
4. Restore, run `php artisan migrate:status`, and run the API test suite against the restored database.
5. Compare table counts and canonical checksums. Sample users, jobs, offers, evidence metadata, reviews, and audit events.
6. Record duration, exceptions, operators, artifact checksums, and isolated-copy destruction. Zero unexplained differences are allowed.

## Abuse controls and pilot support

- Keep authentication/recovery throttles and edge IP/device limits enabled.
- Alert on authorization failures, refresh replay, room probing, upload rejection, notification fan-out anomalies, and case-access spikes.
- Quarantine uploads until scanning completes; never serve unknown objects.
- Support access needs a scoped role and written reason; audit records are immutable.
- Weak signals alone never auto-ban a user.
- Tickets record user impact, relevant job ID, consent-safe reproduction, severity, owner, resolution, and linked incident/case.
- Support cannot alter prices, reviews, or lifecycle state outside audited domain actions.

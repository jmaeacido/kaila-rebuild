# Identity-related processor / service-provider inventory

| Field | Value |
| --- | --- |
| Updated | 2026-09-11 |
| Owner | DPO / PIC — John Mark Agustin Estrosos Acido |

First-party human review does **not** make processor diligence N/A. Infrastructure providers that host or transport personal data are recorded below. Identity raw evidence is intended to remain on KAILA-controlled private storage; other providers may still process account, contact, or operational data.

| Provider / system | Role | Personal data categories | Identity evidence? | Terms / DPA note |
| --- | --- | --- | --- | --- |
| KAILA API host / VPS | Application, DB, local private evidence disk | Account, messages metadata, identity ciphertext objects | Yes (ciphertext on disk) | Operator-controlled; access limited to PIC |
| MySQL on host | Primary database | Account profile, verification status, consent/audit metadata (no raw images in DB) | Status/consent only | Operator-controlled |
| Redis on host | Queue/cache/realtime | Job payloads may include evidence IDs (not image bytes) | IDs only | Operator-controlled |
| Nginx / TLS terminator | HTTPS reverse proxy | Connection metadata, request paths | No image bodies at rest | Operator-controlled |
| Brevo | Transactional email send | Email addresses, notification content | No raw ID images | Brevo DPA / terms — confirm under operator account |
| ImprovMX | Inbound mail forwarding (`support@`, `privacy@`) | Email content forwarded to operator inbox | Should never receive ID images (policy) | ImprovMX terms |
| Firebase Cloud Messaging | Push notifications | Device tokens, notification titles/bodies | No raw ID images | Google/Firebase terms |
| Nominatim / OSRM (maps) | Geocoding / routing | Addresses, coordinates for jobs/travel | No | OSM/Nominatim usage policy; self-hosted where configured |
| Groq / Katabang AI (if enabled) | Assistant responses | User prompts to Katabang | Must not include ID images (policy) | Groq terms |
| ClamAV | Malware scanning | Temporary scan of evidence bytes in worker memory | Transient scan only | Self-hosted |

**Rule:** Do not send government-ID images or selfies to email, chat, AI, analytics, or support tools. Re-open this inventory and execute a written DPA before any identity processor, OCR, or cloud vision vendor is added.

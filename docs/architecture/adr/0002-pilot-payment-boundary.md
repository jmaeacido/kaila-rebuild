# ADR-0002 — No KAILA-processed payments during the pilot

**Decision date:** 2026-07-10  
**Applies to:** New KAILA platform and later migration work

**Status:** Accepted

## Context

Escrow, wallets, payment collection, refunds, chargebacks, KYC, settlement, and regulatory obligations would materially expand pilot risk and scope.

## Decision

KAILA will not collect, hold, route, release, refund, or settle money during the pilot. Any payment arrangement occurs outside KAILA between the client and provider.

KAILA may retain the accepted commercial terms of the selected offer, including an agreed amount, but must not represent that amount as paid, secured, escrowed, released, or guaranteed.

## Consequences

- No payment gateway, wallet, escrow ledger, payout engine, or payment-status workflow in the pilot.
- UI copy must clearly state that payment is arranged directly between the parties.
- Job completion and reviews must not depend on a KAILA payment event.
- Future integrated payments require a new ADR and a separate compliance/security review.



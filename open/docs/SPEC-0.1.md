# OpenClearing Specification 0.1 — working draft

Status: experimental. This document is a falsifiable model, not an accounting, legal, or protocol standard.

## Objective

Normalize the economic state between service delivery, off-chain authorization, on-chain settlement, distribution, and refund for metered machine payments.

## Scope

Version 0.1 models one unidirectional, capital-backed payment channel and one asset. It does not execute payments, hold keys, validate signatures, determine legal revenue recognition, or replace the underlying MPP/x402/Solana specifications.

## Event ordering

```text
CHANNEL_FUNDED
  → SERVICE_DELIVERED + VOUCHER_ACCEPTED (repeated)
  → CLAIM_CONFIRMED
  → FUNDS_DISTRIBUTED
  → PAYER_REFUNDED
```

Events may be interleaved, but resulting cumulative state must satisfy the invariants below.

## Required invariants

- OC-001: every event ID is unique.
- OC-102: accepted cumulative vouchers strictly increase.
- OC-103: accepted vouchers do not exceed funded collateral.
- OC-203: settled amount does not exceed accepted vouchers.
- OC-205: distributed amount does not exceed settled amount.
- OC-401: distributed plus refunded does not exceed funding.

## Risk indicators

- OC-101: delivered service exceeds accepted vouchers.
- OC-211: settled funds have not been fully distributed.
- OC-301: an accepted voucher is expired at analysis time.

## Open questions

1. Should receivable be recognized at delivery, voucher acceptance, or another contractual event?
2. Is `settled` best represented as merchant receivable, merchant payable, or a protocol-specific intermediate account?
3. How should facilitator credit risk be represented when the facilitator can close before the latest voucher is claimed?
4. What evidence binds service delivery to a voucher increment?
5. Which events must be durable before a resource is released?
6. How should one channel shared across sessions be scoped?
7. How should fees and multi-recipient distributions be represented?

Answers must be validated with implementers before version 0.2.

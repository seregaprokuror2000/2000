# OpenClearing

> Experimental clearing and settlement-risk engine for unsettled machine-payment obligations.

**Status:** Day 1 foundation is ready: model, engine, fixtures, tests, specification, and theory.

OpenClearing turns payment-channel funding, service delivery, cumulative vouchers, settlement, distribution, and refunds into a reproducible exposure statement and a balanced shadow journal.

## Why

With MPP/x402 payment channels, a service may already be delivered and a cumulative voucher accepted while final on-chain settlement and distribution happen later. Those are different economic states. OpenClearing makes the gaps explicit.

This repository is an early falsifiable prototype. It does **not** hold funds, sign vouchers, execute settlement, provide an audit, or claim compliance with accounting standards.

## Current model

```text
Channel funded
    ↓
Service delivered ↔ cumulative voucher accepted
    ↓
Claim confirmed on-chain
    ↓
Funds distributed to merchant
    ↓
Unused collateral refunded to payer
```

It calculates:

- merchant receivable;
- unsettled exposure;
- unsecured delivery;
- distribution backlog;
- remaining collateral;
- invariant violations;
- a double-entry shadow journal.

## Quick start

Requirements: Node.js 20+.

```bash
npm install
npm run demo
npm test
npm run typecheck
```

Analyze another fixture:

```bash
npm run analyze -- examples/valid-session.json
```

The risky example should return exit code `2`; that is intentional and makes the CLI usable in CI.

## Repository map

```text
src/engine.ts                 state and invariant engine
src/money.ts                  exact fixed-point amount helpers
src/types.ts                  event and report types
examples/valid-session.json   valid lifecycle
examples/risky-session.json   expired and under-covered delivery
test/engine.test.ts           executable expectations
docs/SPEC-0.1.md              working event/accounting model
docs/THEORY-DAY-01-RU.md      today's Russian theory lesson
```

## Prototype formulas

```text
merchantReceivable  = max(delivered − distributed, 0)
unsettledExposure   = max(accepted − settled, 0)
unsecuredDelivery   = max(delivered − accepted, 0)
distributionBacklog = max(settled − distributed, 0)
remainingCollateral = max(funded − distributed − refunded, 0)
```

These definitions are hypotheses to validate with payment-channel implementers. In particular, legal revenue recognition is outside the current scope.

## Seven-day direction

1. Validate the event and accounting model.
2. Add malformed and crash-recovery fixtures.
3. Map fields to Solana Payment Channels.
4. Import an on-chain channel state snapshot.
5. Generate machine-readable JSON reports.
6. Publish a failure corpus.
7. Ask implementers to falsify the model.

## Theory

Start with [`docs/THEORY-DAY-01-RU.md`](docs/THEORY-DAY-01-RU.md). Do the exercise manually before running the CLI.

## License

No license has been selected yet. Do not assume reuse rights until the repository owner chooses one.

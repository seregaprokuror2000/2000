import { parseAmount } from "./money.js";
import type { Analysis, ExposureState, Finding, JournalEntry, SessionInput } from "./types.js";

const max = (a: bigint, b: bigint) => (a > b ? a : b);

export function analyzeSession(input: SessionInput): Analysis {
  if (input.specificationVersion !== "0.1") throw new Error("Unsupported specification version");
  if (!input.channelId || !input.asset) throw new Error("channelId and asset are required");
  if (!Number.isInteger(input.decimals) || input.decimals < 0 || input.decimals > 18) throw new Error("decimals must be an integer from 0 to 18");

  const state: ExposureState = { funded: 0n, delivered: 0n, accepted: 0n, settled: 0n, distributed: 0n, refunded: 0n };
  const findings: Finding[] = [];
  const journal: JournalEntry[] = [];
  const seenIds = new Set<string>();
  const analyzedAt = new Date(input.analyzedAt ?? new Date().toISOString());

  for (const event of input.events) {
    if (seenIds.has(event.id)) {
      findings.push({ code: "OC-001", severity: "CRITICAL", message: "Duplicate event id", eventId: event.id });
      continue;
    }
    seenIds.add(event.id);

    if (Number.isNaN(new Date(event.timestamp).getTime())) throw new Error(`Invalid timestamp in ${event.id}`);

    switch (event.type) {
      case "CHANNEL_FUNDED": {
        const amount = requiredAmount(event.amount, event.id, input.decimals);
        state.funded += amount;
        journal.push({ eventId: event.id, debit: "asset:channel_escrow", credit: "liability:payer_refundable", amount });
        break;
      }
      case "SERVICE_DELIVERED":
        state.delivered += requiredAmount(event.amount, event.id, input.decimals);
        break;
      case "VOUCHER_ACCEPTED": {
        const next = requiredAmount(event.cumulativeAmount, event.id, input.decimals);
        if (next <= state.accepted) findings.push({ code: "OC-102", severity: "CRITICAL", message: "Cumulative voucher did not increase", eventId: event.id });
        const delta = max(next - state.accepted, 0n);
        state.accepted = max(state.accepted, next);
        if (delta > 0n) journal.push({ eventId: event.id, debit: "liability:payer_refundable", credit: "liability:merchant_claimable", amount: delta });
        if (event.expiresAt && new Date(event.expiresAt) <= analyzedAt) findings.push({ code: "OC-301", severity: "CRITICAL", message: "Accepted voucher is expired", eventId: event.id });
        break;
      }
      case "CLAIM_CONFIRMED": {
        const next = requiredAmount(event.cumulativeAmount, event.id, input.decimals);
        if (next < state.settled) findings.push({ code: "OC-202", severity: "CRITICAL", message: "Settlement watermark decreased", eventId: event.id });
        const delta = max(next - state.settled, 0n);
        state.settled = max(state.settled, next);
        if (delta > 0n) journal.push({ eventId: event.id, debit: "liability:merchant_claimable", credit: "liability:merchant_payable", amount: delta });
        break;
      }
      case "FUNDS_DISTRIBUTED": {
        const next = requiredAmount(event.cumulativeAmount, event.id, input.decimals);
        if (next < state.distributed) findings.push({ code: "OC-204", severity: "CRITICAL", message: "Distribution watermark decreased", eventId: event.id });
        const delta = max(next - state.distributed, 0n);
        state.distributed = max(state.distributed, next);
        if (delta > 0n) journal.push({ eventId: event.id, debit: "liability:merchant_payable", credit: "asset:channel_escrow", amount: delta });
        break;
      }
      case "PAYER_REFUNDED": {
        const amount = requiredAmount(event.amount, event.id, input.decimals);
        state.refunded += amount;
        journal.push({ eventId: event.id, debit: "liability:payer_refundable", credit: "asset:channel_escrow", amount });
        break;
      }
    }
  }

  if (state.accepted > state.funded) findings.push({ code: "OC-103", severity: "CRITICAL", message: "Accepted vouchers exceed channel funding" });
  if (state.settled > state.accepted) findings.push({ code: "OC-203", severity: "CRITICAL", message: "Settled amount exceeds accepted vouchers" });
  if (state.distributed > state.settled) findings.push({ code: "OC-205", severity: "CRITICAL", message: "Distributed amount exceeds settled amount" });
  if (state.distributed + state.refunded > state.funded) findings.push({ code: "OC-401", severity: "CRITICAL", message: "Distribution plus refunds exceed funding" });
  if (state.delivered > state.accepted) findings.push({ code: "OC-101", severity: "WARNING", message: "Service delivery exceeds accepted vouchers" });
  if (state.settled > state.distributed) findings.push({ code: "OC-211", severity: "WARNING", message: "Settled funds have not been fully distributed" });

  const critical = findings.some((finding) => finding.severity === "CRITICAL");
  const verdict = critical ? "HIGH_RISK" : findings.length ? "WARNING" : "PASS";

  return {
    channelId: input.channelId,
    asset: input.asset,
    decimals: input.decimals,
    state,
    metrics: {
      merchantReceivable: max(state.delivered - state.distributed, 0n),
      unsettledExposure: max(state.accepted - state.settled, 0n),
      unsecuredDelivery: max(state.delivered - state.accepted, 0n),
      distributionBacklog: max(state.settled - state.distributed, 0n),
      remainingCollateral: max(state.funded - state.distributed - state.refunded, 0n),
    },
    journal,
    findings,
    verdict,
  };
}

function requiredAmount(value: string | undefined, eventId: string, decimals: number): bigint {
  if (value === undefined) throw new Error(`Missing amount in ${eventId}`);
  const parsed = parseAmount(value, decimals);
  if (parsed <= 0n) throw new Error(`Amount must be positive in ${eventId}`);
  return parsed;
}

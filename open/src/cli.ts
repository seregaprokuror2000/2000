#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { analyzeSession } from "./engine.js";
import { formatAmount } from "./money.js";
import type { SessionInput } from "./types.js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npm run analyze -- <session.json>");
  process.exit(1);
}

try {
  const input = JSON.parse(await readFile(path, "utf8")) as SessionInput;
  const result = analyzeSession(input);
  const money = (value: bigint) => `${formatAmount(value, result.decimals)} ${result.asset}`;

  console.log(`\nOpenClearing Exposure Statement`);
  console.log(`Channel: ${result.channelId}\n`);
  console.log(`Funded:               ${money(result.state.funded)}`);
  console.log(`Services delivered:   ${money(result.state.delivered)}`);
  console.log(`Accepted vouchers:    ${money(result.state.accepted)}`);
  console.log(`Settled on-chain:      ${money(result.state.settled)}`);
  console.log(`Distributed:           ${money(result.state.distributed)}`);
  console.log(`Refunded:              ${money(result.state.refunded)}\n`);
  console.log(`Merchant receivable:   ${money(result.metrics.merchantReceivable)}`);
  console.log(`Unsettled exposure:    ${money(result.metrics.unsettledExposure)}`);
  console.log(`Unsecured delivery:    ${money(result.metrics.unsecuredDelivery)}`);
  console.log(`Distribution backlog:  ${money(result.metrics.distributionBacklog)}`);
  console.log(`Remaining collateral:  ${money(result.metrics.remainingCollateral)}\n`);
  console.log(`VERDICT: ${result.verdict}`);

  for (const finding of result.findings) {
    console.log(`${finding.severity.padEnd(8)} ${finding.code}: ${finding.message}${finding.eventId ? ` (${finding.eventId})` : ""}`);
  }
  console.log();
  process.exit(result.verdict === "HIGH_RISK" ? 2 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

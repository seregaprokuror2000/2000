export const EVENT_TYPES = [
  "CHANNEL_FUNDED",
  "SERVICE_DELIVERED",
  "VOUCHER_ACCEPTED",
  "CLAIM_CONFIRMED",
  "FUNDS_DISTRIBUTED",
  "PAYER_REFUNDED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type ClearingEvent = {
  id: string;
  type: EventType;
  timestamp: string;
  amount?: string;
  cumulativeAmount?: string;
  expiresAt?: string;
};

export type SessionInput = {
  specificationVersion: "0.1";
  channelId: string;
  asset: string;
  decimals: number;
  analyzedAt?: string;
  events: ClearingEvent[];
};

export type Severity = "WARNING" | "CRITICAL";

export type Finding = {
  code: string;
  severity: Severity;
  message: string;
  eventId?: string;
};

export type ExposureState = {
  funded: bigint;
  delivered: bigint;
  accepted: bigint;
  settled: bigint;
  distributed: bigint;
  refunded: bigint;
};

export type JournalEntry = {
  eventId: string;
  debit: string;
  credit: string;
  amount: bigint;
};

export type Analysis = {
  channelId: string;
  asset: string;
  decimals: number;
  state: ExposureState;
  metrics: {
    merchantReceivable: bigint;
    unsettledExposure: bigint;
    unsecuredDelivery: bigint;
    distributionBacklog: bigint;
    remainingCollateral: bigint;
  };
  journal: JournalEntry[];
  findings: Finding[];
  verdict: "PASS" | "WARNING" | "HIGH_RISK";
};

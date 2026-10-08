/**
 * Scan persistence abstraction.
 *
 * - DynamoDbScanRepository: real AWS persistence (used when configured).
 * - MemoryScanRepository:  local fallback for development; clearly not AWS
 *   (reported as repository: "memory" in API responses).
 *
 * Selection happens in createScanRepository() — callers never branch on AWS.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { env } from "@/lib/env";
import { buildScanKeys, type ScanRecord } from "@/lib/aws/schema";
import type { ScanResult } from "@/types/scan";

export interface ScanRepository {
  readonly id: "dynamodb" | "memory";
  put(scan: ScanResult): Promise<void>;
  get(scanId: string): Promise<ScanResult | null>;
  /** Most recent scans, newest first (future scan-history feature). */
  listRecent(limit?: number): Promise<ScanResult[]>;
}

export class DynamoDbScanRepository implements ScanRepository {
  readonly id = "dynamodb" as const;
  private doc: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const tableName = env.scanTable;
    if (!tableName) {
      throw new Error(
        "DynamoDbScanRepository requires RELOOP_SCAN_TABLE — refusing to run unconfigured.",
      );
    }
    this.tableName = tableName;
    this.doc = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: env.awsRegion }),
      { marshallOptions: { removeUndefinedValues: true } },
    );
  }

  async put(scan: ScanResult): Promise<void> {
    const record: ScanRecord = {
      ...buildScanKeys(scan.scanId, scan.createdAt),
      scanId: scan.scanId,
      createdAt: scan.createdAt,
      scan,
    };
    await this.doc.send(
      new PutCommand({ TableName: this.tableName, Item: record }),
    );
  }

  async get(scanId: string): Promise<ScanResult | null> {
    const keys = buildScanKeys(scanId, "");
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: keys.PK, SK: keys.SK },
      }),
    );
    const item = res.Item as ScanRecord | undefined;
    return (item?.scan as ScanResult | undefined) ?? null;
  }

  async listRecent(limit = 20): Promise<ScanResult[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "ENTITY#SCAN" },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    const items = (res.Items ?? []) as ScanRecord[];
    return items.map((item) => item.scan as ScanResult);
  }
}

/** Development fallback — records vanish on restart; never labelled as AWS. */
export class MemoryScanRepository implements ScanRepository {
  readonly id = "memory" as const;
  private store = new Map<string, ScanResult>();

  async put(scan: ScanResult): Promise<void> {
    this.store.set(scan.scanId, scan);
  }

  async get(scanId: string): Promise<ScanResult | null> {
    return this.store.get(scanId) ?? null;
  }

  async listRecent(limit = 20): Promise<ScanResult[]> {
    return [...this.store.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
}

/**
 * Process-wide singleton for the memory repository — without this, every
 * call would get a fresh empty Map and a scan written by POST could never
 * be read back by GET in local development.
 */
let memoryRepository: MemoryScanRepository | null = null;

export function createScanRepository(): ScanRepository {
  if (env.scanTable) return new DynamoDbScanRepository();
  memoryRepository ??= new MemoryScanRepository();
  return memoryRepository;
}

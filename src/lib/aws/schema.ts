/**
 * DynamoDB single-table design for scan persistence.
 *
 * Access patterns (MVP → future):
 *  - Get scan by id            → PK = SCAN#<scanId>,  SK = META
 *  - List recent scans (later) → GSI1 PK = ENTITY#SCAN, SK = createdAt#<scanId>
 *
 * No user accounts; scans are addressed by opaque scanId only.
 */

export const ENTITY_SCAN = "SCAN";

export interface ScanRecord {
  /** Partition key: "SCAN#<scanId>" */
  PK: string;
  /** Sort key: "META" */
  SK: "META";
  /** GSI1 partition key: "ENTITY#SCAN" */
  GSI1PK: string;
  /** GSI1 sort key: "createdAt#<ISO timestamp>#<scanId>" */
  GSI1SK: string;
  /** Raw scanId (without key prefixes). */
  scanId: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** Full ScanResult document (analysis, score, recommendation, impact). */
  scan: unknown;
}

export function buildScanKeys(scanId: string, createdAt: string) {
  return {
    PK: `SCAN#${scanId}`,
    SK: "META" as const,
    GSI1PK: `ENTITY#${ENTITY_SCAN}`,
    GSI1SK: `${createdAt}#${scanId}`,
  };
}

/** Human-readable schema docs for infra/template authors. */
export const SCAN_TABLE_SCHEMA = {
  TableName: process.env.RELOOP_SCAN_TABLE ?? "<RELOOP_SCAN_TABLE>",
  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" },
    { AttributeName: "SK", KeyType: "RANGE" },
  ],
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" },
    { AttributeName: "SK", AttributeType: "S" },
    { AttributeName: "GSI1PK", AttributeType: "S" },
    { AttributeName: "GSI1SK", AttributeType: "S" },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: "GSI1",
      KeySchema: [
        { AttributeName: "GSI1PK", KeyType: "HASH" },
        { AttributeName: "GSI1SK", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    },
  ],
} as const;

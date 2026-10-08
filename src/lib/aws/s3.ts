/**
 * S3 image storage abstraction.
 *
 * - S3ImageStore: private bucket, server-side encryption, presigned read URLs.
 *   No public ACLs, no exposed bucket URLs.
 * - LocalImageStore: development fallback when RELOOP_IMAGE_BUCKET is unset;
 *   objects live in .local-uploads/ (gitignored). Clearly not AWS.
 *
 * Selection in createImageStore() — never pretend S3 is available when it
 * isn't (see env.missingAwsConfig()).
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export interface PutImageInput {
  /** Stable object key, usually derived from the scan id. */
  key: string;
  body: Uint8Array;
  contentType: string;
}

export interface ImageStore {
  readonly id: "s3" | "local";
  put(input: PutImageInput): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  /** Time-limited read URL (presigned for S3, local route for dev). */
  getReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/** Content types accepted for device photos. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export function isAcceptedImageType(value: string): value is AcceptedImageType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(value);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Deterministic object key for a scan image: scans/<scanId>.<ext> */
export function buildImageKey(scanId: string, contentType: string): string {
  const ext = EXTENSIONS[contentType] ?? "bin";
  return `scans/${scanId}.${ext}`;
}

const LOCAL_DIR = path.join(process.cwd(), ".local-uploads");

export class S3ImageStore implements ImageStore {
  readonly id = "s3" as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    const bucket = env.imageBucket;
    if (!bucket) {
      throw new Error(
        "S3ImageStore requires RELOOP_IMAGE_BUCKET — refusing to run unconfigured.",
      );
    }
    this.bucket = bucket;
    this.client = new S3Client({ region: env.awsRegion });
  }

  async put({ key, body, contentType }: PutImageInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Private by default: no ACL, no public access.
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return new Uint8Array(bytes);
    } catch {
      return null;
    }
  }

  async getReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * Local development store. Objects are written outside the public dir and
 * only readable through the local API route — mirrors S3's private posture.
 */
export class LocalImageStore implements ImageStore {
  readonly id = "local" as const;

  async put({ key, body, contentType }: PutImageInput): Promise<void> {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    // Store metadata alongside content so the local route can serve it.
    await writeFile(filePath, body);
    await writeFile(`${filePath}.meta`, contentType, "utf8");
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const bytes = await readFile(this.resolve(key));
      return new Uint8Array(bytes);
    } catch {
      return null;
    }
  }

  async getReadUrl(key: string): Promise<string> {
    return `/api/images/${encodeURIComponent(key)}`;
  }

  /** Confine keys to the local uploads dir (no path traversal). */
  private resolve(key: string): string {
    const normalized = path.normalize(key).replace(/^([/\\.])+/, "");
    const filePath = path.join(LOCAL_DIR, normalized);
    if (!filePath.startsWith(path.resolve(LOCAL_DIR))) {
      throw new Error(`Invalid image key: ${key}`);
    }
    return filePath;
  }
}

/**
 * Returns S3 when RELOOP_IMAGE_BUCKET is configured, otherwise the local
 * store. Callers get honest provenance via `.id` — never a fake S3 claim.
 */
export function createImageStore(): ImageStore {
  return env.imageBucket ? new S3ImageStore() : new LocalImageStore();
}

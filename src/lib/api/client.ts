/**
 * Frontend → backend abstraction.
 *
 * In production this targets API Gateway (NEXT_PUBLIC_API_BASE_URL), which
 * fronts the analysis Lambda. In local development with no API Gateway
 * configured, it falls back to the built-in Next.js route (/api/scans) which
 * uses the SAME shared abstractions (ImageStore, ScanRepository) — swapping in
 * the real AWS stack requires no frontend changes.
 *
 * No AWS credentials ever reach the browser: the browser only ever speaks
 * this HTTP contract.
 */
import type {
  ApiErrorBody,
  ScanFetchResponse,
  UploadScanResponse,
} from "@/types/scan";
import { env } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorBody["error"]["kind"],
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function scansEndpoint(): string {
  const base = env.apiBaseUrl;
  return base ? `${base.replace(/\/$/, "")}/scans` : "/api/scans";
}

/**
 * Fetch a persisted scan (result page). Throws ApiError("not_found") when
 * the scan does not exist — the page must not fabricate a result.
 */
export async function getScan(
  scanId: string,
  signal?: AbortSignal,
): Promise<ScanFetchResponse> {
  const base = env.apiBaseUrl
    ? `${env.apiBaseUrl.replace(/\/$/, "")}/scans`
    : "/api/scans";

  let response: Response;
  try {
    response = await fetch(`${base}/${encodeURIComponent(scanId)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("aws_failure", "Network error — could not reach the ReLoop API.");
  }

  const body = (await response.json()) as ScanFetchResponse | ApiErrorBody;
  if (!response.ok) {
    const err = (body as ApiErrorBody).error;
    throw new ApiError(
      err?.kind ?? "aws_failure",
      err?.message ?? `Lookup failed (HTTP ${response.status}).`,
    );
  }
  return body as ScanFetchResponse;
}

export interface UploadOptions {
  /** 0–100 upload progress, when the transport reports it. */
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Upload a device image and create a pending scan record.
 * Throws ApiError with a machine-readable kind on any failure — callers must
 * surface it; a failed upload never yields a fake result.
 */
export async function uploadDeviceImage(
  file: File | Blob,
  { onProgress, signal }: UploadOptions = {},
): Promise<UploadScanResponse> {
  const form = new FormData();
  form.append("image", file, file instanceof File ? file.name : "device.jpg");

  // XHR gives real upload progress; fetch does not (yet).
  const response = await new Promise<Awaited<ReturnType<typeof fetch>>>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", scansEndpoint());
      xhr.responseType = "json";
      if (signal) {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => xhr.abort(), { once: true });
      }
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () =>
        resolve(
          new Response(JSON.stringify(xhr.response ?? {}), {
            status: xhr.status,
            headers: { "Content-Type": "application/json" },
          }),
        );
      xhr.onerror = () => reject(new ApiError("aws_failure", "Network error — could not reach the ReLoop API."));
      xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
      xhr.send(form);
    },
  );

  const body = (await response.json()) as UploadScanResponse | ApiErrorBody;

  if (!response.ok) {
    const err = (body as ApiErrorBody).error;
    throw new ApiError(
      err?.kind ?? "aws_failure",
      err?.message ?? `Upload failed (HTTP ${response.status}).`,
    );
  }

  return body as UploadScanResponse;
}

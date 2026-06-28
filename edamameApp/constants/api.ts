import Constants from "expo-constants";
import { Platform } from "react-native";

declare const process: {
  env?: {
    EXPO_PUBLIC_API_URL?: string;
  };
};

const API_PORT = "5000";
const REQUEST_TIMEOUT_MS = 12000;
const REQUEST_RETRIES = 1;

class BackendError extends Error {}

function normalizeBaseUrl(url?: string | null) {
  const trimmed = String(url || "").trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

function getExpoHost() {
  const constants = Constants as any;
  const hostUri =
    constants?.expoConfig?.hostUri ||
    constants?.expoGoConfig?.debuggerHost ||
    constants?.manifest?.debuggerHost ||
    constants?.manifest?.hostUri ||
    constants?.manifest2?.extra?.expoClient?.hostUri ||
    constants?.linkingUri;

  if (!hostUri) return null;

  const withoutProtocol = String(hostUri).replace(/^[a-z]+:\/\//i, "");
  const hostPort = withoutProtocol.split(/[/?#]/)[0];
  const host = hostPort.replace(/^\[/, "").replace(/\]$/, "").split(":")[0];

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  return host;
}

function unique(values: Array<string | null | undefined>) {
  return values.filter((value, index, arr): value is string => {
    return Boolean(value) && arr.indexOf(value) === index;
  });
}

// ═══════════════════════════════════════════════════════════════
// SEBELUM BUILD APK, GANTI URL DI BAWAH DENGAN URL RENDER KAMU
// Contoh: "https://edamame-peramalan.onrender.com"
// ═══════════════════════════════════════════════════════════════
const PRODUCTION_URL = "https://edamame-peramalan.onrender.com"; // <-- GANTI INI!

function makeApiCandidates() {
  const envUrl =
    typeof process !== "undefined"
      ? normalizeBaseUrl(process.env?.EXPO_PUBLIC_API_URL)
      : null;
  const expoHost = getExpoHost();

  // Kalau di development (expo start), pakai local Flask
  // Kalau di production (APK), pakai PRODUCTION_URL
  const isDevMode = !!expoHost;

  return unique([
    envUrl,
    // Lokal dev mode candidates
    ...(isDevMode
      ? [
          expoHost ? `http://${expoHost}:${API_PORT}` : null,
          Platform.OS === "android" ? `http://10.0.2.2:${API_PORT}` : null,
          `http://127.0.0.1:${API_PORT}`,
          `http://localhost:${API_PORT}`,
        ]
      : []),
    // Production fallback (PythonAnywhere)
    PRODUCTION_URL,
  ]);
}

export const API_CANDIDATES = makeApiCandidates();
export const API_BASE_URL = API_CANDIDATES[0] || PRODUCTION_URL;

let activeApiBaseUrl = API_BASE_URL;

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getPrioritizedApiBases() {
  return unique([activeApiBaseUrl, ...API_CANDIDATES, API_BASE_URL]);
}

export function getApiUrl(path: string) {
  return buildUrl(activeApiBaseUrl, path);
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T = any>(
  path: string,
  options: RequestInit = {},
  config: { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  const timeoutMs = config.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const retries = config.retries ?? REQUEST_RETRIES;
  let lastError: unknown = null;

  for (const baseUrl of getPrioritizedApiBases()) {
    const url = buildUrl(baseUrl, path);

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const res = await fetchWithTimeout(url, options, timeoutMs);
        const text = (await res.text()).trim();

        if (!text.startsWith("{") && !text.startsWith("[")) {
          throw new Error(`Response backend bukan JSON (${res.status})`);
        }

        const data = JSON.parse(text);

        if (!res.ok || data?.error || data?.status === "error") {
          throw new BackendError(
            data?.error || data?.message || `Request backend gagal (${res.status})`
          );
        }

        activeApiBaseUrl = baseUrl;
        return data;
      } catch (error) {
        if (error instanceof BackendError) {
          throw error;
        }

        lastError = error;

        if (attempt < retries) {
          await wait(450 * (attempt + 1));
        }
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Tidak bisa terhubung ke backend. Pastikan Flask berjalan dan perangkat memakai jaringan yang sama. Detail: ${detail}`
  );
}

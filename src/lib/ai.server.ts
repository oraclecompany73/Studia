import { createOpenAI } from "@ai-sdk/openai";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
/** Prefer free-tier models; override with OPENROUTER_MODEL. */
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export class GatewayError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function openRouterModel() {
  return process.env["OPENROUTER_MODEL"] ?? DEFAULT_OPENROUTER_MODEL;
}

export function createOpenRouterProvider() {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new GatewayError(401, "AI is not configured for this app yet.");

  let gatewayError: GatewayError | null = null;

  const provider = createOpenAI({
    baseURL: OPENROUTER_URL,
    apiKey,
    headers: {
      "HTTP-Referer": process.env["OPENROUTER_SITE_URL"] ?? "https://studia.app",
      "X-Title": process.env["OPENROUTER_APP_NAME"] ?? "Studia",
    },
    fetch: async (url, init) => {
      const res = await fetch(url, init);
      if (!res.ok) {
        const body = await res.clone().text();
        console.error(`OpenRouter error [${res.status}]: ${body}`);
        let msg = body;
        try {
          const j = JSON.parse(body);
          msg = j?.error?.message ?? j?.message ?? body;
        } catch {
          // Body was not JSON; keep the raw text.
        }
        gatewayError = new GatewayError(res.status, msg || `Request failed (${res.status})`);
      }
      return res;
    },
  });

  return {
    provider,
    takeError: () => gatewayError,
  };
}

// Save / load / share of knob configurations.
//
// Everything is client-side: a JSON file for archiving, and a compact one-line
// "order code" a customer can copy and send to the maker to request a print.

import { DEFAULT_PARAMS, clampParams, type KnobParams } from "./params";

export const CONFIG_VERSION = 1;
const ORDER_PREFIX = "EKNOB1.";

export interface KnobConfigFile {
  app: "everyday-knobs";
  version: number;
  savedAt: string;
  params: KnobParams;
}

/** Pretty JSON for download / archiving. */
export function serializeConfig(params: KnobParams): string {
  const file: KnobConfigFile = {
    app: "everyday-knobs",
    version: CONFIG_VERSION,
    savedAt: new Date().toISOString(),
    params,
  };
  return JSON.stringify(file, null, 2);
}

/** Compact, copy-pasteable order code (prefix + base64 of the params JSON). */
export function encodeOrderCode(params: KnobParams): string {
  return ORDER_PREFIX + btoa(JSON.stringify(params));
}

/**
 * Parse a config from any supported text form — an order code, a saved config
 * file, or a bare params object — and return sanitized, valid params.
 * Throws an Error with a user-facing (Japanese) message on malformed input.
 */
export function parseConfig(text: string): KnobParams {
  const t = text.trim();
  if (!t) throw new Error("内容が空です");

  let raw: unknown;
  if (t.startsWith(ORDER_PREFIX)) {
    try {
      raw = JSON.parse(atob(t.slice(ORDER_PREFIX.length)));
    } catch {
      throw new Error("注文コードを解釈できませんでした");
    }
  } else {
    try {
      raw = JSON.parse(t);
    } catch {
      throw new Error("JSON / 注文コードとして読み込めませんでした");
    }
  }

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  if (!isPlainObject(raw)) throw new Error("パラメータが見つかりません");
  const params = isPlainObject(raw.params) ? raw.params : raw;
  if (!isPlainObject(params)) throw new Error("パラメータが見つかりません");

  return clampParams({ ...DEFAULT_PARAMS, ...(params as Partial<KnobParams>) });
}

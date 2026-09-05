import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerSecret } from './log.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only account this tool is ever allowed to publish to. */
export const TARGET_USERNAME = 'movewell.il';

/** Accounts this tool must refuse outright, even if .env points at them. */
export const DENY_USERNAMES = ['bynexora.co'];

/** Instagram Login uses this host only. graph.facebook.com is a different auth model. */
export const REQUIRED_GRAPH_HOST = 'graph.instagram.com';

/** Load KEY=VALUE pairs from .env without overriding the real environment. */
export function loadEnvFile(path = resolve(ROOT, '.env')) {
  if (!existsSync(path)) return false;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

/**
 * DRY_RUN is true unless the value is exactly "false".
 * A missing, empty, or malformed value always means dry run.
 */
function parseDryRun(raw) {
  if (raw === undefined) return true;
  return String(raw).trim().toLowerCase() !== 'false';
}

export function loadConfig() {
  const envFileFound = loadEnvFile();
  const accessToken = (process.env.IG_ACCESS_TOKEN || '').trim();
  registerSecret(accessToken);

  return {
    envFileFound,
    accessToken,
    userId: (process.env.IG_USER_ID || '').trim(),
    targetUsername: (process.env.IG_TARGET_USERNAME || TARGET_USERNAME).trim(),
    graphHost: (process.env.IG_GRAPH_HOST || REQUIRED_GRAPH_HOST).trim(),
    apiVersion: (process.env.IG_API_VERSION || 'v23.0').trim(),
    dryRun: parseDryRun(process.env.DRY_RUN),
    contentFile: resolve(ROOT, process.env.CONTENT_FILE || 'content/posts.json'),
    stateFile: resolve(ROOT, process.env.STATE_FILE || 'state/published.json'),
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 30000),
  };
}

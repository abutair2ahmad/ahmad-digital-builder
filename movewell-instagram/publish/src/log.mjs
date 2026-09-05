// Redacting logger. Nothing that looks like a credential is ever printed.

const secrets = new Set();

/** Register a value that must never appear in output. */
export function registerSecret(value) {
  if (typeof value === 'string' && value.length >= 8) secrets.add(value);
}

/** Strip registered secrets and token-shaped fields out of any text. */
export function redact(input) {
  let s = typeof input === 'string' ? input : safeStringify(input);
  for (const secret of secrets) {
    if (secret) s = s.split(secret).join('[REDACTED]');
  }
  s = s.replace(/(access_token=)[^&\s"']+/gi, '$1[REDACTED]');
  s = s.replace(/("access_token"\s*:\s*")[^"]*"/gi, '$1[REDACTED]"');
  s = s.replace(/\b(IG(?:_[A-Z]+)*_TOKEN\s*=\s*)\S+/gi, '$1[REDACTED]');
  return s;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Show only enough of a secret to confirm which one is loaded. */
export function fingerprint(value) {
  if (!value) return '(not set)';
  return `set, ${value.length} chars, ends ...${value.slice(-4)}`;
}

const out = (prefix, msg) => console.log(`${prefix} ${redact(msg)}`);

export const log = {
  plain: (msg = '') => console.log(redact(msg)),
  info: (msg) => out('  ', msg),
  step: (msg) => out('->', msg),
  ok: (msg) => out('OK', msg),
  warn: (msg) => out('!!', msg),
  fail: (msg) => out('XX', msg),
  head: (msg) => {
    console.log('');
    console.log(redact(msg));
    console.log('-'.repeat(Math.min(72, String(msg).length)));
  },
};

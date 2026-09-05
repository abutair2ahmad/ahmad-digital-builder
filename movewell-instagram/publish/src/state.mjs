import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const EMPTY = { version: 1, account: null, published: {} };

export function readState(stateFile) {
  if (!existsSync(stateFile)) return structuredClone(EMPTY);
  try {
    const parsed = JSON.parse(readFileSync(stateFile, 'utf8'));
    return { ...structuredClone(EMPTY), ...parsed, published: parsed.published ?? {} };
  } catch (error) {
    throw new Error(
      `State file ${stateFile} is not valid JSON (${error.message}). ` +
        'Fix or delete it before publishing — the duplicate guard depends on it.',
    );
  }
}

/** Write atomically so an interrupted run cannot corrupt the duplicate guard. */
export function writeState(stateFile, state) {
  mkdirSync(dirname(stateFile), { recursive: true });
  const tmp = `${stateFile}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  renameSync(tmp, stateFile);
}

export function recordPublished(stateFile, state, post, result) {
  const next = {
    ...state,
    account: result.account ?? state.account,
    published: {
      ...state.published,
      [post.id]: {
        title: post.title,
        contentHash: post.contentHash,
        containerId: result.containerId,
        mediaId: result.mediaId,
        publishedAt: new Date().toISOString(),
      },
    },
  };
  writeState(stateFile, next);
  return next;
}

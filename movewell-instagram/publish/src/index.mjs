#!/usr/bin/env node
import { loadConfig, TARGET_USERNAME } from './config.mjs';
import { buildCaption, findNextPost, findPost, loadPosts, validatePost } from './content.mjs';
import {
  assertAccount,
  assertGraphHost,
  assertLiveAllowed,
  assertNotPublished,
  assertTargetAllowed,
  GuardError,
} from './guards.mjs';
import { InstagramClient } from './ig.mjs';
import { fingerprint, log } from './log.mjs';
import { readState, recordPublished } from './state.mjs';

function parseArgs(argv) {
  const flags = { confirm: false };
  let command = null;
  let postId = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') command = 'check';
    else if (arg === '--next') command = 'next';
    else if (arg === '--post') {
      command = 'post';
      postId = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--post=')) {
      command = 'post';
      postId = arg.slice('--post='.length);
    } else if (arg === '--confirm') flags.confirm = true;
    else if (arg === '--help' || arg === '-h') command = 'help';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { command: command ?? 'help', postId, flags };
}

function showHelp() {
  log.plain(`
MoveWell Instagram publisher — @${TARGET_USERNAME} only

  node src/index.mjs --check        Validate env, content and account. Sends nothing.
  node src/index.mjs --post 01      Run post 01 through the pipeline.
  node src/index.mjs --next         Run the first post not yet in the state file.

  --confirm    Required in addition to DRY_RUN=false to publish for real.

DRY_RUN defaults to true. A run is live only when DRY_RUN=false in .env AND
--confirm is on the command line. Anything else is a rehearsal.
`);
}

function describeConfig(config) {
  log.head('Configuration');
  log.info(`.env file          ${config.envFileFound ? 'found' : 'NOT found (using shell env only)'}`);
  log.info(`mode               ${config.dryRun ? 'DRY RUN (nothing is published)' : 'LIVE (--confirm still required)'}`);
  log.info(`api                https://${config.graphHost}/${config.apiVersion}`);
  log.info(`target account     @${config.targetUsername}`);
  log.info(`IG_USER_ID         ${config.userId || '(not set — will be read from the token)'}`);
  log.info(`IG_ACCESS_TOKEN    ${fingerprint(config.accessToken)}`);
}

function describeContent(posts, state) {
  log.head('Content manifest');
  let blocking = 0;
  for (const post of posts) {
    const problems = validatePost(post);
    const done = state.published[post.id];
    const status = done ? 'published' : problems.length === 0 ? 'ready' : 'blocked';
    log.info(`${post.id}  ${status.padEnd(9)} ${post.caption.length.toString().padStart(4)} chars  ${(post.hashtags ?? []).length} tags  ${post.title}`);
    if (!done && problems.length > 0) {
      blocking += 1;
      for (const problem of problems) log.info(`        - ${problem}`);
    }
  }
  return blocking;
}

function describeState(state, stateFile) {
  const entries = Object.entries(state.published);
  log.head('Local state');
  log.info(`file               ${stateFile}`);
  log.info(`account recorded   ${state.account ? `@${state.account.username} (${state.account.id})` : '(none yet)'}`);
  log.info(`published          ${entries.length} post(s)`);
  for (const [id, record] of entries) {
    log.info(`  ${id}  ${record.publishedAt}  media ${record.mediaId}`);
  }
}

async function verifyAccount(config) {
  if (!config.accessToken) {
    log.warn('IG_ACCESS_TOKEN is not set — account guard could not run.');
    return null;
  }
  const client = new InstagramClient(config);
  log.step(`Resolving token against ${config.graphHost} ...`);
  const me = await client.me();
  const account = assertAccount(me, config);
  log.ok(`Account guard passed: @${account.username} (id ${account.id}, ${me.account_type ?? 'type unknown'})`);
  return { client, account };
}

async function runCheck(config) {
  describeConfig(config);
  assertGraphHost(config);
  assertTargetAllowed(config);

  const posts = loadPosts(config.contentFile);
  const state = readState(config.stateFile);
  const blocking = describeContent(posts, state);
  describeState(state, config.stateFile);

  log.head('Account');
  let verified = null;
  try {
    verified = await verifyAccount(config);
  } catch (error) {
    log.fail(error.message);
  }

  log.head('Verdict');
  const ready = Boolean(verified) && blocking === 0;
  if (!config.accessToken) log.info('- add IG_ACCESS_TOKEN to .env');
  if (blocking > 0) log.info(`- ${blocking} post(s) need a public image_url or a caption fix`);
  if (ready) log.ok('Ready. A live run still needs DRY_RUN=false and --confirm.');
  else log.warn('Not ready to publish yet — see the items above.');
  return ready ? 0 : 1;
}

function previewDryRun(config, post, account) {
  const igUserId = account?.id ?? (config.userId || '{IG_USER_ID}');
  log.head('Dry run — the exact calls that a live run would make');
  log.info(`1. POST https://${config.graphHost}/${config.apiVersion}/${igUserId}/media`);
  log.info(`     image_url    ${post.image_url}`);
  log.info(`     caption      ${post.caption.length} chars`);
  log.info(`     access_token [REDACTED]`);
  log.info(`2. GET  .../{creation_id}?fields=status_code   (poll until FINISHED)`);
  log.info(`3. POST https://${config.graphHost}/${config.apiVersion}/${igUserId}/media_publish`);
  log.info(`     creation_id  {from step 1}`);

  log.head('Caption as Instagram would receive it');
  log.plain(post.caption);

  log.head('Result');
  log.ok('Dry run complete. Nothing was sent to Instagram and no state was written.');
}

async function publishLive(client, config, post, account, state) {
  log.head('Publishing');
  log.step('Creating media container ...');
  const container = await client.createContainer(account.id, {
    imageUrl: post.image_url,
    caption: post.caption,
  });
  log.ok(`Container ${container.id} created.`);

  log.step('Waiting for Instagram to fetch the image ...');
  await client.waitForContainer(container.id, {
    onTick: (attempt, code) => log.info(`check ${attempt}: ${code}`),
  });

  log.step('Publishing container ...');
  const published = await client.publishContainer(account.id, container.id);
  log.ok(`Published. Media id ${published.id}`);

  recordPublished(config.stateFile, state, post, {
    containerId: container.id,
    mediaId: published.id,
    account,
  });
  log.ok(`State updated: ${post.id} recorded as published.`);
}

async function runPost(config, post, flags) {
  log.head(`Post ${post.id} — ${post.title}`);
  describeConfig(config);
  assertGraphHost(config);
  assertTargetAllowed(config);

  const problems = validatePost(post);
  if (problems.length > 0) {
    for (const problem of problems) log.fail(problem);
    throw new Error(`Post ${post.id} is not publishable yet.`);
  }
  log.ok('Content validation passed.');

  const state = readState(config.stateFile);
  assertNotPublished(state, post);
  log.ok('Duplicate guard passed.');

  assertLiveAllowed(config, flags);

  const verified = await verifyAccount(config);

  if (config.dryRun) {
    previewDryRun(config, post, verified?.account);
    return 0;
  }
  if (!verified) throw new Error('Cannot publish without a token that passes the account guard.');

  await publishLive(verified.client, config, post, verified.account, state);
  return 0;
}

async function main() {
  const { command, postId, flags } = parseArgs(process.argv.slice(2));
  if (command === 'help') {
    showHelp();
    return 0;
  }

  const config = loadConfig();
  if (command === 'check') return runCheck(config);

  const posts = loadPosts(config.contentFile);

  if (command === 'post') {
    if (!postId) throw new Error('--post needs an id, for example: --post 01');
    return runPost(config, findPost(posts, postId), flags);
  }

  const state = readState(config.stateFile);
  const next = findNextPost(posts, state);
  if (!next) {
    log.ok('Every post in the manifest is already published. Nothing to do.');
    return 0;
  }
  return runPost(config, next, flags);
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((error) => {
    log.plain('');
    if (error instanceof GuardError) log.fail(`Guard blocked this run: ${error.message}`);
    else log.fail(error.message);
    process.exit(1);
  });

export { buildCaption };

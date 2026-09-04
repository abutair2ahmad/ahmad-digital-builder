/**
 * Dependency-free constants shared with the Edge middleware.
 *
 * The middleware runs in the Edge runtime, which has no `node:crypto`, so it
 * must never reach into the session module that signs and verifies cookies.
 */
export const ADMIN_COOKIE = 'nacre_admin';

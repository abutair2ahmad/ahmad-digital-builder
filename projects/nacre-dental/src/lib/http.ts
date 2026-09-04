import { NextResponse } from 'next/server';

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

export function badRequest(message: string, fields?: Record<string, string>) {
  return json({ error: message, fields: fields ?? {} }, { status: 400 });
}

export function notFound(message = 'Not found') {
  return json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return json({ error: message }, { status: 409 });
}

export function unauthorized(message = 'Authentication required') {
  return json({ error: message }, { status: 401 });
}

export function tooMany(retryAfterSeconds: number) {
  return json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

export function serverError(message = 'Something went wrong on our side.') {
  return json({ error: message }, { status: 500 });
}

/** Parses a JSON body without letting a malformed payload throw. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

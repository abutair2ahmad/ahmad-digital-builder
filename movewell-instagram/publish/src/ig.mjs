import { redact } from './log.mjs';

/** Thin client for the Instagram API with Instagram Login (graph.instagram.com). */
export class InstagramClient {
  constructor(config) {
    this.config = config;
  }

  get base() {
    return `https://${this.config.graphHost}/${this.config.apiVersion}`;
  }

  async #request(path, { method = 'GET', params = {} } = {}) {
    const url = new URL(`${this.base}${path}`);
    const init = { method, signal: AbortSignal.timeout(this.config.requestTimeoutMs) };

    if (method === 'GET') {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      url.searchParams.set('access_token', this.config.accessToken);
    } else {
      init.body = new URLSearchParams({ ...params, access_token: this.config.accessToken });
    }

    let response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new Error(`Network call to ${this.config.graphHost} failed: ${redact(error.message)}`);
    }

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Unexpected non-JSON reply (HTTP ${response.status}): ${redact(text.slice(0, 300))}`);
    }
    if (!response.ok || payload.error) {
      const detail = payload.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Instagram API error: ${redact(detail)}`);
    }
    return payload;
  }

  /** Resolve the token to an account. This is what the account guard checks. */
  me() {
    return this.#request('/me', { params: { fields: 'id,username,account_type' } });
  }

  createContainer(igUserId, { imageUrl, caption }) {
    return this.#request(`/${igUserId}/media`, {
      method: 'POST',
      params: { image_url: imageUrl, caption },
    });
  }

  containerStatus(containerId) {
    return this.#request(`/${containerId}`, { params: { fields: 'status_code,status' } });
  }

  publishContainer(igUserId, creationId) {
    return this.#request(`/${igUserId}/media_publish`, {
      method: 'POST',
      params: { creation_id: creationId },
    });
  }

  /** Instagram fetches image_url asynchronously; wait for FINISHED before publishing. */
  async waitForContainer(containerId, { attempts = 10, delayMs = 3000, onTick } = {}) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const { status_code: code, status } = await this.containerStatus(containerId);
      onTick?.(attempt, code);
      if (code === 'FINISHED') return true;
      if (code === 'ERROR' || code === 'EXPIRED') {
        throw new Error(`Container ${containerId} ended as ${code}: ${redact(status ?? '')}`);
      }
      if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`Container ${containerId} was still not FINISHED after ${attempts} checks.`);
  }
}

const MAX_BODY_BYTES = 24 * 1024;
const MAX_TOKEN_LENGTH = 2048;
const UPSTREAM_TIMEOUT_MS = 8000;
const ALLOWED_ORIGINS = new Set([
  'https://404builds.com',
  'https://www.404builds.com',
]);
const ALLOWED_HOSTNAMES = new Set(['404builds.com', 'www.404builds.com']);
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SMTP2GO_URL = 'https://api.smtp2go.com/v3/email/send';
const CONTACT_ADDRESS = 'support@404builds.com';

class RequestError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(status, payload, origin) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function emptyResponse(status, origin) {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'content-type');
    headers.set('Access-Control-Max-Age', '86400');
    headers.set('Vary', 'Origin');
  }
  return new Response(null, { status, headers });
}

function requireJsonContentType(request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    throw new RequestError(400, 'invalid_request');
  }
}

async function readLimitedBody(request) {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new RequestError(413, 'payload_too_large');
  }

  if (!request.body) throw new RequestError(400, 'invalid_request');

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new RequestError(413, 'payload_too_large');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'invalid_request');
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new RequestError(400, 'invalid_request');
  }
}

function isValidEmail(email) {
  if (email.length > 254) return false;
  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@')) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || domain.length > 253 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }

  const atom = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+$/;
  if (!local.split('.').every((part) => atom.test(part))) return false;

  const labels = domain.split('.');
  return labels.length >= 2 && labels.every(
    (label) => label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label),
  );
}

function validateForm(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new RequestError(400, 'invalid_request');
  }

  const { name, email, message, turnstileToken, honeypot } = data;
  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    typeof turnstileToken !== 'string' ||
    typeof honeypot !== 'string'
  ) {
    throw new RequestError(400, 'invalid_request');
  }

  const form = {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    turnstileToken: turnstileToken.trim(),
  };
  const invalidNameControl = /[\u0000-\u001f\u007f]/;
  const invalidMessageControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

  if (
    !form.name || form.name.length > 120 || invalidNameControl.test(form.name) ||
    !isValidEmail(form.email) ||
    !form.message || form.message.length > 5000 || invalidMessageControl.test(form.message) ||
    !form.turnstileToken || form.turnstileToken.length > MAX_TOKEN_LENGTH ||
    honeypot.trim() !== ''
  ) {
    throw new RequestError(400, 'invalid_request');
  }

  return form;
}

async function fetchJson(fetchImpl, url, options) {
  let response;
  try {
    response = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new RequestError(502, 'upstream_failure');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new RequestError(502, 'upstream_failure');
  }

  return { response, payload };
}

async function verifyTurnstile(form, secret, fetchImpl) {
  const { response, payload } = await fetchJson(fetchImpl, SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: form.turnstileToken }),
  });

  if (!response.ok) throw new RequestError(502, 'upstream_failure');
  if (
    payload?.success !== true ||
    !ALLOWED_HOSTNAMES.has(payload.hostname) ||
    payload.action !== 'contact'
  ) {
    throw new RequestError(403, 'verification_failed');
  }
}

function buildEmail(form) {
  return {
    sender: `404 Builds <${CONTACT_ADDRESS}>`,
    to: [CONTACT_ADDRESS],
    subject: 'Website contact form',
    text_body: `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`,
    custom_headers: [{ header: 'Reply-To', value: form.email }],
  };
}

async function sendEmail(form, apiKey, fetchImpl) {
  const { response, payload } = await fetchJson(fetchImpl, SMTP2GO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Smtp2go-Api-Key': apiKey,
    },
    body: JSON.stringify(buildEmail(form)),
  });

  const data = payload?.data;
  if (
    !response.ok ||
    !data ||
    !Number.isInteger(data.succeeded) || data.succeeded < 1 ||
    !Number.isInteger(data.failed) || data.failed !== 0 ||
    !Array.isArray(data.failures) || data.failures.length !== 0
  ) {
    throw new RequestError(502, 'upstream_failure');
  }
}

export async function handleRequest(request, env, fetchImpl = globalThis.fetch) {
  let origin;
  try {
    origin = request.headers.get('origin');
    const url = new URL(request.url);

    if (url.pathname !== '/submit') {
      throw new RequestError(404, 'not_found');
    }

    if (request.method === 'OPTIONS') {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        throw new RequestError(403, 'forbidden');
      }
      const requestedHeaders = (request.headers.get('access-control-request-headers') ?? '')
        .split(',')
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean);
      if (
        request.headers.get('access-control-request-method') !== 'POST' ||
        !requestedHeaders.includes('content-type') ||
        requestedHeaders.some((header) => header !== 'content-type')
      ) {
        throw new RequestError(403, 'forbidden');
      }
      return emptyResponse(204, origin);
    }

    if (request.method !== 'POST') {
      throw new RequestError(405, 'method_not_allowed');
    }
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      throw new RequestError(403, 'forbidden');
    }

    requireJsonContentType(request);
    const text = await readLimitedBody(request);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new RequestError(400, 'invalid_request');
    }
    const form = validateForm(data);

    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    const smtp2goApiKey = env.SMTP2GO_API_KEY;
    if (!turnstileSecret || !smtp2goApiKey) {
      throw new RequestError(500, 'internal_error');
    }

    await verifyTurnstile(form, turnstileSecret, fetchImpl);
    await sendEmail(form, smtp2goApiKey, fetchImpl);
    return jsonResponse(200, { ok: true }, origin);
  } catch (error) {
    if (error instanceof RequestError) {
      return jsonResponse(error.status, { error: error.code }, origin);
    }
    return jsonResponse(500, { error: 'internal_error' }, origin);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

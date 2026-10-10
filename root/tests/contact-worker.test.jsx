// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRequest } from '../workers/contact-api/index.js';

const ORIGIN = 'https://404builds.com';
const WWW_ORIGIN = 'https://www.404builds.com';
const API_URL = 'https://contact-api.404builds.com/submit';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SMTP2GO_URL = 'https://api.smtp2go.com/v3/email/send';
const SECRETS = {
  SMTP2GO_API_KEY: 'smtp-test-secret',
  TURNSTILE_SECRET_KEY: 'turnstile-test-secret',
};

const validForm = {
  name: 'Wesley Ruede',
  email: 'visitor@example.com',
  message: 'Hello from the contact form.',
  turnstileToken: 'valid-turnstile-token',
  honeypot: '',
};

const validSiteverify = {
  success: true,
  hostname: '404builds.com',
  action: 'contact',
};

const acceptedEmail = {
  data: {
    succeeded: 1,
    failed: 0,
    failures: [],
  },
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makePost({ body = validForm, origin = ORIGIN, path = '/submit', raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (origin !== null) headers.Origin = origin;
  return new Request(`https://contact-api.404builds.com${path}`, {
    method: 'POST',
    headers,
    body: raw ? body : JSON.stringify(body),
  });
}

function makeFetch({
  siteverify = validSiteverify,
  email = acceptedEmail,
  siteverifyError,
  emailError,
} = {}) {
  return vi.fn(async (input) => {
    const url = String(input);
    if (url === SITEVERIFY_URL) {
      if (siteverifyError) throw siteverifyError;
      return siteverify instanceof Response ? siteverify : jsonResponse(siteverify);
    }
    if (url === SMTP2GO_URL) {
      if (emailError) throw emailError;
      return email instanceof Response ? email : jsonResponse(email);
    }
    throw new Error(`Unexpected upstream URL: ${url}`);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('contact form Worker request boundary', () => {
  it('allows the apex origin to preflight only POST with JSON', async () => {
    const request = new Request(API_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    const response = await handleRequest(request, SECRETS, makeFetch());

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('content-type');
    expect(response.headers.get('Vary')).toContain('Origin');
  });

  it('denies an untrusted preflight without permissive CORS headers', async () => {
    const request = new Request(API_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://attacker.example',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const response = await handleRequest(request, SECRETS, makeFetch());

    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('denies an allowed-origin preflight that does not request JSON', async () => {
    const request = new Request(API_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN,
        'Access-Control-Request-Method': 'POST',
      },
    });

    const response = await handleRequest(request, SECRETS, makeFetch());

    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeNull();
  });

  it.each([
    ['a missing origin', null],
    ['a forged origin', 'https://attacker.example'],
  ])('rejects POST from %s before contacting upstream services', async (_label, origin) => {
    const upstream = makeFetch();

    const response = await handleRequest(makePost({ origin }), SECRETS, upstream);

    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(upstream).not.toHaveBeenCalled();
  });

  it('allows the www origin and returns only a generic success response', async () => {
    const response = await handleRequest(makePost({ origin: WWW_ORIGIN }), SECRETS, makeFetch());

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(WWW_ORIGIN);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects paths other than /submit without contacting upstream services', async () => {
    const upstream = makeFetch();

    const response = await handleRequest(makePost({ path: '/other' }), SECRETS, upstream);

    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects methods other than POST and OPTIONS', async () => {
    const request = new Request(API_URL, { method: 'GET', headers: { Origin: ORIGIN } });
    const upstream = makeFetch();

    const response = await handleRequest(request, SECRETS, upstream);

    expect(response.status).toBe(405);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before Siteverify or SMTP2GO', async () => {
    const upstream = makeFetch();

    const response = await handleRequest(makePost({ body: '{broken', raw: true }), SECRETS, upstream);

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects non-JSON content types before Siteverify or SMTP2GO', async () => {
    const request = new Request(API_URL, {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' },
      body: JSON.stringify(validForm),
    });
    const upstream = makeFetch();

    const response = await handleRequest(request, SECRETS, upstream);

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects a request body larger than 24 KB before Siteverify', async () => {
    const upstream = makeFetch();
    const oversized = JSON.stringify({ ...validForm, message: 'x'.repeat(24 * 1024) });

    const response = await handleRequest(makePost({ body: oversized, raw: true }), SECRETS, upstream);

    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ['blank name', { name: '   ' }],
    ['blank email', { email: '   ' }],
    ['malformed email', { email: 'not-an-email' }],
    ['header-injected email', { email: 'visitor@example.com\r\nBcc: attacker@example.com' }],
    ['control characters in the name', { name: 'Visitor\nBcc: attacker@example.com' }],
    ['blank message', { message: '\n  ' }],
    ['blank Turnstile token', { turnstileToken: '' }],
    ['oversized Turnstile token', { turnstileToken: 't'.repeat(2049) }],
  ])('rejects %s without any upstream calls', async (_label, change) => {
    const upstream = makeFetch();

    const response = await handleRequest(makePost({ body: { ...validForm, ...change } }), SECRETS, upstream);

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ['name', 120, 121],
    ['message', 5000, 5001],
  ])('accepts a %s at its maximum and rejects one character over', async (field, limit, over) => {
    const atLimit = { ...validForm, [field]: 'x'.repeat(limit) };
    const validResponse = await handleRequest(makePost({ body: atLimit }), SECRETS, makeFetch());
    const overLimit = { ...validForm, [field]: 'x'.repeat(over) };
    const invalidResponse = await handleRequest(makePost({ body: overLimit }), SECRETS, makeFetch());

    expect(validResponse.status).toBe(200);
    expect(invalidResponse.status).toBe(400);
  });

  it('accepts a 254-character email and rejects a valid-looking 255-character email', async () => {
    const domain252 = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(60)}`;
    const email254 = `a@${domain252}`;
    const responseAtLimit = await handleRequest(
      makePost({ body: { ...validForm, email: email254 } }),
      SECRETS,
      makeFetch(),
    );
    const responseOverLimit = await handleRequest(
      makePost({ body: { ...validForm, email: `aa@${domain252}` } }),
      SECRETS,
      makeFetch(),
    );

    expect(email254).toHaveLength(254);
    expect(responseAtLimit.status).toBe(200);
    expect(responseOverLimit.status).toBe(400);
  });

  it('rejects a filled honeypot before Turnstile verification', async () => {
    const upstream = makeFetch();

    const response = await handleRequest(
      makePost({ body: { ...validForm, honeypot: 'a person filled this' } }),
      SECRETS,
      upstream,
    );

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ['SMTP2GO_API_KEY', { TURNSTILE_SECRET_KEY: SECRETS.TURNSTILE_SECRET_KEY }],
    ['TURNSTILE_SECRET_KEY', { SMTP2GO_API_KEY: SECRETS.SMTP2GO_API_KEY }],
  ])('fails closed when %s is missing', async (_name, availableSecret) => {
    const upstream = makeFetch();

    const response = await handleRequest(makePost(), availableSecret, upstream);

    expect(response.status).toBe(500);
    expect(upstream).not.toHaveBeenCalled();
    const responseText = await response.text();
    expect(responseText).not.toContain('smtp-test-secret');
    expect(responseText).not.toContain('turnstile-test-secret');
  });
});

describe('contact form Worker verification and delivery', () => {
  it('applies an independent eight-second timeout to both upstream requests', async () => {
    const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    timeout.mockImplementation((milliseconds) => originalTimeout(milliseconds));
    const upstream = makeFetch();

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(200);
    expect(timeout).toHaveBeenCalledTimes(2);
    expect(timeout).toHaveBeenNthCalledWith(1, 8000);
    expect(timeout).toHaveBeenNthCalledWith(2, 8000);
    expect(upstream.mock.calls.every(([, options]) => options.signal instanceof AbortSignal)).toBe(true);
  });

  it('sends only fixed email routing and subject, with the validated visitor email as Reply-To', async () => {
    const upstream = makeFetch();
    const response = await handleRequest(
      makePost({
        body: {
          ...validForm,
          name: '  Wesley Ruede  ',
          email: ' visitor@example.com ',
          message: '  Hello from the contact form.  ',
          sender: 'attacker@example.com',
          recipient: 'attacker@example.com',
          subject: 'attacker supplied subject',
        },
      }),
      SECRETS,
      upstream,
    );
    const smtpCall = upstream.mock.calls.find(([url]) => String(url) === SMTP2GO_URL);

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(upstream.mock.calls[0][0]).toBe(SITEVERIFY_URL);
    expect(JSON.parse(upstream.mock.calls[0][1].body)).toEqual({
      secret: SECRETS.TURNSTILE_SECRET_KEY,
      response: validForm.turnstileToken,
    });
    expect(smtpCall).toBeDefined();
    const [url, options] = smtpCall;
    const email = JSON.parse(options.body);
    expect(url).toBe(SMTP2GO_URL);
    expect(options.method).toBe('POST');
    expect(options.headers['X-Smtp2go-Api-Key']).toBe(SECRETS.SMTP2GO_API_KEY);
    expect(email.sender).toBe('404 Builds <support@404builds.com>');
    expect(email.to).toEqual(['support@404builds.com']);
    expect(email.subject).toBe('Website contact form');
    expect(email.text_body).toContain('Name: Wesley Ruede');
    expect(email.text_body).toContain('Hello from the contact form.');
    expect(email.custom_headers).toEqual([
      { header: 'Reply-To', value: 'visitor@example.com' },
    ]);
  });

  it.each([
    ['a rejected token', { success: false, hostname: '404builds.com', action: 'contact' }],
    ['a wrong hostname', { success: true, hostname: 'attacker.example', action: 'contact' }],
    ['a wrong action', { success: true, hostname: '404builds.com', action: 'login' }],
  ])('does not send email after %s', async (_label, siteverify) => {
    const upstream = makeFetch({ siteverify });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][0]).toBe(SITEVERIFY_URL);
  });

  it('accepts a successful Turnstile result for the www hostname', async () => {
    const upstream = makeFetch({
      siteverify: { ...validSiteverify, hostname: 'www.404builds.com' },
    });

    const response = await handleRequest(makePost({ origin: WWW_ORIGIN }), SECRETS, upstream);

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('fails closed when Turnstile verification times out', async () => {
    const upstream = makeFetch({
      siteverifyError: new DOMException('request timed out', 'TimeoutError'),
    });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('fails closed when Siteverify returns a non-success HTTP status', async () => {
    const upstream = makeFetch({ siteverify: jsonResponse({ success: true }, 503) });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a failed count', { data: { succeeded: 0, failed: 1, failures: [] } }],
    ['a non-empty failures list', { data: { succeeded: 0, failed: 0, failures: ['rejected'] } }],
  ])('returns a generic failure when SMTP2GO reports %s in HTTP 200', async (_label, email) => {
    const upstream = makeFetch({ email });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('rejected');
  });

  it('returns a generic failure when SMTP2GO returns an HTTP error', async () => {
    const upstream = makeFetch({ email: jsonResponse({ error: 'private provider detail' }, 500) });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private provider detail');
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('returns a generic failure when SMTP2GO returns malformed JSON with HTTP 200', async () => {
    const upstream = makeFetch({ email: new Response('private malformed provider detail', { status: 200 }) });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private malformed provider detail');
  });

  it('does not retry an SMTP2GO timeout or leak its error details', async () => {
    const upstream = makeFetch({
      emailError: new DOMException('private SMTP2GO timeout detail', 'TimeoutError'),
    });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private SMTP2GO timeout detail');
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('returns a generic 502 when an upstream fetch throws', async () => {
    const upstream = makeFetch({
      siteverifyError: new Error('private upstream diagnostic'),
    });

    const response = await handleRequest(makePost(), SECRETS, upstream);

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private upstream diagnostic');
  });

  it('returns a generic 500 when an unexpected internal error occurs', async () => {
    const upstream = makeFetch();
    const env = new Proxy(SECRETS, {
      get(target, property, receiver) {
        if (property === 'TURNSTILE_SECRET_KEY') {
          throw new Error('private internal diagnostic');
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const response = await handleRequest(makePost(), env, upstream);

    expect(response.status).toBe(500);
    expect(upstream).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('private internal diagnostic');
  });
});

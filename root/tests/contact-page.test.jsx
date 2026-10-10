import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactPage from '../src/ContactPage.jsx';

const CONTACT_ENDPOINT = 'https://contact-api.404builds.com/submit';
const CONTACT_VALUES = {
  name: 'Wesley Ruede',
  email: 'wesley@example.com',
  message: 'I have a question about a build.',
};

const turnstile = {
  render: vi.fn(() => 'widget-test-id'),
  reset: vi.fn(),
  remove: vi.fn(),
};
const fetchMock = vi.fn();

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function fillForm(values = CONTACT_VALUES) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: values.message } });
}

function completeVerification(token = 'test-turnstile-token') {
  const options = turnstile.render.mock.calls[0][1];
  act(() => options.callback(token));
}

function deferred() {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'public-test-site-key');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue(response({ ok: true }));
  turnstile.render.mockReset().mockReturnValue('widget-test-id');
  turnstile.reset.mockReset();
  turnstile.remove.mockReset();
  Object.defineProperty(window, 'turnstile', {
    configurable: true,
    value: turnstile,
  });
});

afterEach(() => {
  delete window.turnstile;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Contact page form', () => {
  it('renders labeled required fields with the server-matched maximum lengths', () => {
    render(<ContactPage />);

    const name = screen.getByLabelText('Name');
    const email = screen.getByLabelText('Email');
    const message = screen.getByLabelText('Message');

    expect(name).toBeRequired();
    expect(name.maxLength).toBe(120);
    expect(email).toBeRequired();
    expect(email.maxLength).toBe(254);
    expect(message).toBeRequired();
    expect(message.maxLength).toBe(5000);
    expect(screen.getByRole('form', { name: 'Contact form' })).toBeInTheDocument();
  });

  it('renders Turnstile using the public key and contact action', async () => {
    render(<ContactPage />);

    await waitFor(() => expect(turnstile.render).toHaveBeenCalledTimes(1));
    expect(turnstile.render.mock.calls[0][1]).toEqual(expect.objectContaining({
      sitekey: 'public-test-site-key',
      action: 'contact',
    }));
  });

  it('loads the explicit Turnstile script when the API is not already present', async () => {
    delete window.turnstile;
    render(<ContactPage />);

    const script = document.querySelector('script[data-404builds-turnstile]');
    expect(script).toHaveAttribute('src', 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    expect(script.async).toBe(true);
    expect(script.defer).toBe(true);

    Object.defineProperty(window, 'turnstile', { configurable: true, value: turnstile });
    fireEvent.load(script);
    await waitFor(() => expect(turnstile.render).toHaveBeenCalledTimes(1));
  });

  it('fails closed with an inline notice when the public site key is missing', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    render(<ContactPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(/not configured/i);
    expect(turnstile.render).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('requires a Turnstile token before posting the form', async () => {
    render(<ContactPage />);
    fillForm();

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Contact form' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/complete the security check/i);
  });

  it('shows an inline pending state and prevents duplicate submissions', async () => {
    const pendingRequest = deferred();
    fetchMock.mockReturnValue(pendingRequest.promise);
    render(<ContactPage />);
    fillForm();
    completeVerification();

    const form = screen.getByRole('form', { name: 'Contact form' });
    fireEvent.submit(form);

    expect(screen.getByRole('status')).toHaveTextContent(/sending/i);
    expect(screen.getByRole('button', { name: 'Sending message…' })).toBeDisabled();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => pendingRequest.resolve(response({ ok: true })));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/message has been sent/i));
  });

  it('posts the Worker contract and clears fields only after success', async () => {
    render(<ContactPage />);
    fillForm();
    completeVerification();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(CONTACT_ENDPOINT, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...CONTACT_VALUES,
        turnstileToken: 'test-turnstile-token',
        honeypot: '',
      }),
    }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/message has been sent/i));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Message')).toHaveValue('');
    expect(turnstile.reset).toHaveBeenCalledWith('widget-test-id');
  });

  it('shows a generic failure, preserves the draft, and resets verification after an HTTP error', async () => {
    fetchMock.mockResolvedValue(response({ error: 'private SMTP2GO diagnostic' }, 502));
    render(<ContactPage />);
    fillForm();
    completeVerification();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/couldn.t send/i));
    expect(screen.getByRole('status')).not.toHaveTextContent(/SMTP2GO|private/i);
    expect(screen.getByLabelText('Name')).toHaveValue(CONTACT_VALUES.name);
    expect(screen.getByLabelText('Email')).toHaveValue(CONTACT_VALUES.email);
    expect(screen.getByLabelText('Message')).toHaveValue(CONTACT_VALUES.message);
    expect(turnstile.reset).toHaveBeenCalledWith('widget-test-id');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('preserves the draft and resets verification after a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('private network diagnostic'));
    render(<ContactPage />);
    fillForm();
    completeVerification();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/couldn.t send/i));
    expect(screen.getByRole('status')).not.toHaveTextContent(/private network diagnostic/i);
    expect(screen.getByLabelText('Message')).toHaveValue(CONTACT_VALUES.message);
    expect(turnstile.reset).toHaveBeenCalledWith('widget-test-id');
  });
});

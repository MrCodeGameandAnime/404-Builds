import React, { useEffect, useRef, useState } from 'react';
import { Footer, Header } from './App.jsx';

const CONTACT_ENDPOINT = 'https://contact-api.404builds.com/submit';
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function emptyForm() {
  return { name: '', email: '', message: '', honeypot: '' };
}

function ContactPage() {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const widgetContainerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const submittingRef = useRef(false);
  const [form, setForm] = useState(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState({ kind: 'idle', message: '' });

  useEffect(() => {
    let active = true;

    if (!siteKey) {
      setTurnstileError('The security check is not configured yet. Please try again later.');
      return () => { active = false; };
    }

    const renderWidget = () => {
      if (!active || !widgetContainerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
          sitekey: siteKey,
          action: 'contact',
          callback: (token) => setTurnstileToken(typeof token === 'string' ? token : ''),
          'expired-callback': () => setTurnstileToken(''),
          'error-callback': () => {
            setTurnstileToken('');
            setTurnstileError('Security verification failed to load. Please refresh and try again.');
          },
        });
        setTurnstileError('');
      } catch {
        setTurnstileError('Security verification failed to load. Please refresh and try again.');
      }
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        active = false;
        if (widgetIdRef.current !== null) {
          try { window.turnstile?.remove?.(widgetIdRef.current); } catch { /* Widget cleanup is best-effort. */ }
          widgetIdRef.current = null;
        }
      };
    }

    let script = document.querySelector('script[data-404builds-turnstile]');
    const createdScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset['404buildsTurnstile'] = 'true';
    }

    const onLoad = () => {
      if (window.turnstile) renderWidget();
      else setTurnstileError('Security verification failed to load. Please refresh and try again.');
    };
    const onError = () => setTurnstileError('Security verification failed to load. Please refresh and try again.');
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    if (createdScript) document.head.appendChild(script);

    return () => {
      active = false;
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
  }, [siteKey]);

  function resetTurnstile() {
    setTurnstileToken('');
    if (widgetIdRef.current !== null) {
      try { window.turnstile?.reset?.(widgetIdRef.current); } catch { /* A fresh page load can retry verification. */ }
    }
  }

  function handleChange(event) {
    const { name, value } = event.currentTarget;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!turnstileToken) {
      setStatus({ kind: 'error', message: 'Complete the security check before sending.' });
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setStatus({ kind: 'pending', message: 'Sending your message…' });

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          turnstileToken,
          honeypot: form.honeypot,
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error('Contact request failed.');

      setForm(emptyForm());
      setStatus({ kind: 'success', message: 'Your message has been sent. Thanks for reaching out.' });
      resetTurnstile();
    } catch {
      setStatus({ kind: 'error', message: 'We couldn’t send your message. Please try again.' });
      resetTurnstile();
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div id="top" className="site-shell contact-shell">
      <div className="site-grid" aria-hidden="true" />
      <Header page="contact" />
      <main className="contact-main">
        <section className="contact-intro" aria-labelledby="contact-title">
          <p className="section-kicker"><span className="eyebrow-line" />Contact</p>
          <h1 id="contact-title">Let&apos;s make <span>something happen.</span></h1>
          <p>Questions, feedback, or an idea you want to build? Send a note and it&apos;ll land in the 404 Builds inbox.</p>
        </section>

        <section className="contact-card" aria-label="Send a message to 404 Builds">
          <form aria-label="Contact form" aria-busy={pending} onSubmit={handleSubmit}>
            <div className="contact-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={120}
                required
                disabled={pending}
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={pending}
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows={7}
                maxLength={5000}
                required
                disabled={pending}
                value={form.message}
                onChange={handleChange}
              />
              <span className="contact-field-hint">Up to 5,000 characters.</span>
            </div>

            <div className="contact-honeypot" aria-hidden="true">
              <label htmlFor="contact-honeypot">Leave this field empty</label>
              <input
                id="contact-honeypot"
                name="honeypot"
                type="text"
                autoComplete="off"
                tabIndex={-1}
                value={form.honeypot}
                onChange={handleChange}
              />
            </div>

            <div className="contact-verification">
              <div ref={widgetContainerRef} className="contact-turnstile" />
              {turnstileError && <p className="contact-verification-error" role="alert">{turnstileError}</p>}
            </div>

            <p className={`contact-status contact-status-${status.kind}`} role="status" aria-live="polite">
              {status.message}
            </p>

            <button className="button button-primary contact-submit" type="submit" disabled={pending || !turnstileToken}>
              {pending ? 'Sending message…' : 'Send message'}
              {!pending && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="contact-privacy">Your note goes directly to our support inbox. We don&apos;t store submissions on this site.</p>
        </section>
      </main>
      <Footer page="contact" />
    </div>
  );
}

export default ContactPage;

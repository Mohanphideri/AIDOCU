import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, RefreshCcw } from 'lucide-react';
import { api } from '../services/api';

/**
 * Server-generated alphanumeric CAPTCHA.
 *
 * The backend (services/captchaService.js) draws a random 6-character
 * code, hashes it, stores only the hash + expiry in MongoDB, and renders
 * a distorted SVG image containing the text. This component only ever
 * receives that image + an opaque captchaId — the answer is verified
 * entirely server-side in POST /api/auth/login and /api/auth/register.
 */
export default function Captcha({ onChange }) {
  const [captchaId, setCaptchaId] = useState(null);
  const [image, setImage] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.getCaptcha();
      setCaptchaId(data.captchaId);
      setImage(data.image);
      setAnswer('');
      onChange({ captchaId: data.captchaId, answer: '' });
    } catch {
      setError(true);
      setCaptchaId(null);
      setImage(null);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.refreshCaptcha(captchaId);
      setCaptchaId(data.captchaId);
      setImage(data.image);
      setAnswer('');
      onChange({ captchaId: data.captchaId, answer: '' });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [captchaId, onChange]);

  const handleAnswerChange = (e) => {
    const value = e.target.value.toUpperCase().slice(0, 8);
    setAnswer(value);
    onChange({ captchaId, answer: value });
  };

  return (
    <div className="rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-dark-canvas p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-ink dark:text-dark-ink">
          <ShieldCheck size={16} className="text-primary" />
          Security check
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-muted hover:text-primary transition-colors dark:text-dark-muted"
          aria-label="Refresh CAPTCHA"
          title="Get a new code"
        >
          <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {image ? (
        <div className="flex items-center gap-3 max-[560px]:flex-col max-[560px]:items-stretch">
          <div
            className="h-[70px] w-[200px] shrink-0 overflow-hidden rounded-lg border border-border dark:border-dark-border bg-white flex items-center justify-center max-[560px]:w-full max-[560px]:max-w-[200px]"

            role="img"
            aria-label="CAPTCHA image"
            style={{ lineHeight: 0 }}
            dangerouslySetInnerHTML={{ __html: decodeURIComponent(image.replace('data:image/svg+xml;utf8,', '')) }}
          />
          <input
            type="text"
            value={answer}
            onChange={handleAnswerChange}
            placeholder="Enter code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="input flex-1 tracking-[0.2em] font-mono uppercase"
            aria-label="CAPTCHA answer"
          />
        </div>
      ) : (
        <p className="text-sm text-danger">
          {error ? "Couldn't load a CAPTCHA. Try refreshing." : 'Loading…'}
        </p>
      )}
      <p className="mt-2 text-xs text-muted dark:text-dark-muted">
        Enter the characters shown above. Not case-sensitive.
      </p>
    </div>
  );
}

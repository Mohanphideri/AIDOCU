import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, RefreshCcw } from 'lucide-react';
import { api } from '../services/api';

/**
 * Server-generated alphanumeric CAPTCHA.
 * The challenge is verified entirely by the backend.
 */
export default function Captcha({ onChange }) {
  const [captchaId, setCaptchaId] = useState(null);
  const [image, setImage] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const applyCaptcha = useCallback((data) => {
    setCaptchaId(data.captchaId);
    setImage(data.image);
    setAnswer('');
    onChange({ captchaId: data.captchaId, answer: '' });
  }, [onChange]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.getCaptcha();
      applyCaptcha(data);
    } catch {
      setError(true);
      setCaptchaId(null);
      setImage(null);
      onChange({ captchaId: '', answer: '' });
    } finally {
      setLoading(false);
    }
  }, [applyCaptcha, onChange]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (!captchaId) return load();
    setLoading(true);
    setError(false);
    try {
      const data = await api.refreshCaptcha(captchaId);
      applyCaptcha(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [captchaId, applyCaptcha, load]);

  const handleAnswerChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setAnswer(value);
    onChange({ captchaId, answer: value });
  };

  return (
    <div className="rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-dark-canvas p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-ink dark:text-dark-ink">
          <ShieldCheck size={18} className="text-primary" />
          Security check
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="btn-ghost !p-1.5 text-muted hover:text-primary dark:text-dark-muted disabled:opacity-50"
          aria-label="Refresh CAPTCHA"
          title="Get a new code"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {image ? (
        <div className="flex items-center gap-3 max-[560px]:flex-col max-[560px]:items-stretch">
          <div
            className="captcha-box"
            role="img"
            aria-label="CAPTCHA image"
            dangerouslySetInnerHTML={{
              __html: decodeURIComponent(image.replace('data:image/svg+xml;utf8,', '')),
            }}
          />
          <input
            type="text"
            value={answer}
            onChange={handleAnswerChange}
            placeholder="ENTER CODE"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
            className="input flex-1 min-w-0 tracking-[0.2em] font-mono uppercase text-base"
            aria-label="CAPTCHA answer"
          />
        </div>
      ) : (
        <div className="captcha-box flex items-center justify-center text-sm text-muted">
          {error ? "Couldn't load CAPTCHA. Click refresh." : 'Loading CAPTCHA…'}
        </div>
      )}

      <p className="mt-2 text-xs text-muted dark:text-dark-muted">
        Enter the characters shown above. Not case-sensitive.
      </p>
    </div>
  );
}

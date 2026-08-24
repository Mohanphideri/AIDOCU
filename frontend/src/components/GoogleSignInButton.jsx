import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Sign-In is not configured.');
      return undefined;
    }

    const render = () => {
      if (cancelled || !window.google || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) onCredential(response.credential);
        },
        ux_mode: 'popup',
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(containerRef.current.clientWidth || 360, 360),
      });
    };

    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT}"]`);
    if (existing) {
      if (window.google) render();
      else existing.addEventListener('load', render, { once: true });
      return () => { cancelled = true; };
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => setError('Could not load Google Sign-In. Check your internet connection.');
    document.head.appendChild(script);
    return () => { cancelled = true; };
  }, [onCredential]);

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      <div ref={containerRef} className="flex justify-center min-h-[44px]" />
      {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}
    </div>
  );
}

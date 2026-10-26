import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SysDiagPage() {
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState<'idle' | 'checked' | 'unchecked' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (action: 'check' | 'uncheck' | 'status') => {
      if (!secret) {
        setStatus('error');
        setMessage('Enter the key');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/_internal/hc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: secret, action }),
        });

        const data = await res.json();

        if (data.ok) {
          setStatus(data.checked ? 'checked' : 'unchecked');
          setMessage(
            data.message || (data.checked ? 'Health check active' : 'Health check inactive'),
          );
        } else {
          setStatus('error');
          setMessage('Invalid key or endpoint');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Connection failed');
      } finally {
        setLoading(false);
      }
    },
    [secret],
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: 16,
          padding: 40,
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{ fontSize: 14, color: '#71717a', letterSpacing: 2, textTransform: 'uppercase' }}
          >
            System Diagnostics
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Authorization key"
            autoComplete="off"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: 8,
              color: '#e4e4e7',
              fontSize: 14,
              fontFamily: '"SF Mono", "Fira Code", monospace',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#52525b')}
            onBlur={(e) => (e.target.style.borderColor = '#27272a')}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={() => send('check')}
            disabled={loading}
            style={{
              padding: '14px 20px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Check Health
          </button>
          <button
            onClick={() => send('uncheck')}
            disabled={loading}
            style={{
              padding: '14px 20px',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Uncheck Health
          </button>
        </div>

        <button
          onClick={() => send('status')}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px 20px',
            background: '#27272a',
            color: '#a1a1aa',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Check Status
        </button>

        {status !== 'idle' && (
          <div
            style={{
              marginTop: 20,
              padding: '14px 16px',
              background: '#09090b',
              border: `1px solid ${status === 'checked' ? '#dc2626' : status === 'unchecked' ? '#16a34a' : '#f59e0b'}`,
              borderRadius: 8,
              fontFamily: '"SF Mono", "Fira Code", monospace',
              fontSize: 13,
              color:
                status === 'checked' ? '#fca5a5' : status === 'unchecked' ? '#86efac' : '#fcd34d',
              wordBreak: 'break-all',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                marginRight: 8,
                verticalAlign: 'middle',
                background:
                  status === 'checked' ? '#dc2626' : status === 'unchecked' ? '#16a34a' : '#f59e0b',
              }}
            />
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

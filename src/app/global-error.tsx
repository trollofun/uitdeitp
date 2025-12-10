'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '32rem',
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Eroare Critică
            </h1>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              Ne pare rău, aplicația a întâmpinat o eroare critică
            </p>
            {error.message && (
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '1rem',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem',
                textAlign: 'left'
              }}>
                <code style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                  {error.message}
                </code>
              </div>
            )}
            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                cursor: 'pointer',
                marginBottom: '0.5rem'
              }}
            >
              Încearcă din nou
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'white',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Înapoi la Pagina Principală
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

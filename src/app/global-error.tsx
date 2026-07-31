'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          background: '#0a0a0a',
          color: '#e5e5e5',
          flexDirection: 'column',
          gap: '1rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: '#a3a3a3', fontSize: '0.875rem' }}>
          A critical error occurred. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

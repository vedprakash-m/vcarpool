'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [apiTest, setApiTest] = useState<string>('Testing...');

  useEffect(() => {
    setMounted(true);

    // Test simple fetch
    fetch('https://carpool-api-prod.azurewebsites.net/api/trips/stats')
      .then(res => res.json())
      .then(data => {
        setApiTest(`API Success: ${JSON.stringify(data)}`);
      })
      .catch(err => {
        setApiTest(`API Error: ${err.message}`);
      });
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>🟢 React is Working!</h1>
      <p>
        <strong>Mounted:</strong> {mounted ? 'Yes' : 'No'}
      </p>
      <p>
        <strong>Current Time:</strong> {new Date().toISOString()}
      </p>
      <p>
        <strong>API Test:</strong> {apiTest}
      </p>

      <div
        style={{ background: '#f0f0f0', padding: '10px', marginTop: '20px' }}
      >
        <h3>Environment Info:</h3>
        <p>
          <strong>URL:</strong>{' '}
          {typeof window !== 'undefined' ? window.location.href : 'SSR'}
        </p>
        <p>
          <strong>User Agent:</strong>{' '}
          {typeof window !== 'undefined' ? navigator.userAgent : 'SSR'}
        </p>
      </div>

      <div
        style={{ background: '#e8f5e8', padding: '10px', marginTop: '20px' }}
      >
        <h3>✅ If you can see this page, React components are working!</h3>
        <p>
          This means the issue is specific to the dashboard or authentication
          components.
        </p>
      </div>
    </div>
  );
}

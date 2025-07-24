'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';

export default function MinimalDashboard() {
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  console.log('MinimalDashboard render:', {
    mounted,
    user,
    isAuthenticated,
    isLoading,
  });

  if (!mounted) {
    return <div style={{ padding: '20px' }}>Mounting...</div>;
  }

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading auth...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Not Authenticated</h1>
        <p>isAuthenticated: {String(isAuthenticated)}</p>
        <p>user: {user ? 'exists' : 'null'}</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>No User Data</h1>
        <p>isAuthenticated: {String(isAuthenticated)}</p>
        <p>user: {String(user)}</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>✅ Minimal Dashboard Working!</h1>

      <div
        style={{ background: '#f0f0f0', padding: '10px', marginBottom: '20px' }}
      >
        <h2>User Info:</h2>
        <p>
          <strong>Name:</strong> {user.firstName} {user.lastName}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
        <p>
          <strong>Authenticated:</strong> {String(isAuthenticated)}
        </p>
      </div>

      <div
        style={{ background: '#e8f5e8', padding: '10px', marginBottom: '20px' }}
      >
        <h3>🎉 Authentication is working!</h3>
        <p>
          If you can see this, the auth store and user data are working
          correctly.
        </p>
        <p>The issue must be in the complex dashboard component.</p>
      </div>

      <div>
        <h3>Test Links:</h3>
        <ul>
          <li>
            <a href="/dashboard">Original Dashboard (broken)</a>
          </li>
          <li>
            <a href="/simple-dashboard">Simple Dashboard Debug</a>
          </li>
          <li>
            <a href="/test">React Test Page</a>
          </li>
        </ul>
      </div>
    </div>
  );
}

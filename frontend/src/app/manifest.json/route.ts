import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'Carpool - Smart Carpool Management',
    short_name: 'Carpool',
    description:
      'Efficient carpool management for schools and families with real-time coordination',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.ico',
        sizes: '16x16',
        type: 'image/x-icon',
      },
    ],
    categories: ['education', 'productivity'],
    lang: 'en-US',
    prefer_related_applications: false,
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

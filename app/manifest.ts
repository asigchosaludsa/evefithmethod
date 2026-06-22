import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EveFit Method',
    short_name: 'EveFit',
    description: 'Tu coaching fitness, con metodo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E1015',
    theme_color: '#0E1015',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

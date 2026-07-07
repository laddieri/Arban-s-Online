import type { MetadataRoute } from 'next';
import { appConfig } from '@/config/app.config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.bookTitle,
    short_name: "Arban's",
    description: appConfig.bookDescription,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

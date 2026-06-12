import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rememberwhen.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL,                   lastModified: new Date(), priority: 1.0 },
    { url: `${APP_URL}/pricing`,      lastModified: new Date(), priority: 0.8 },
    { url: `${APP_URL}/signup`,       lastModified: new Date(), priority: 0.6 },
    { url: `${APP_URL}/login`,        lastModified: new Date(), priority: 0.5 },
  ]
}

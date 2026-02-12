import prisma from './prisma';

/**
 * Default SEO values as fallbacks
 */
const DEFAULT_SEO = {
  metaTitle: 'HomeSolution - Home Services Marketplace',
  metaDescription: 'Book trusted home services with HomeSolution. Discover cleaning, repair, and beauty professionals with secure checkout and quick support.',
  metaKeywords: 'home services, marketplace, cleaning, repairs, beauty services',
  ogTitle: 'HomeSolution - Home Services Marketplace',
  ogDescription: 'Book trusted home services with HomeSolution. Discover cleaning, repair, and beauty professionals with secure checkout and quick support.',
  ogImageUrl: '/assets/hero_product_img1.png', // Default image path
};

/**
 * Fetches SEO settings from database with fallbacks
 * @returns {Promise<Object>} SEO settings object
 */
export async function getSeoSettings() {
  try {
    const settings = await prisma.platformSettings.findFirst();

    return {
      metaTitle: settings?.metaTitle || DEFAULT_SEO.metaTitle,
      metaDescription: settings?.metaDescription || DEFAULT_SEO.metaDescription,
      metaKeywords: settings?.metaKeywords || DEFAULT_SEO.metaKeywords,
      ogTitle: settings?.ogTitle || DEFAULT_SEO.ogTitle,
      ogDescription: settings?.ogDescription || DEFAULT_SEO.ogDescription,
      ogImageUrl: settings?.ogImageUrl || DEFAULT_SEO.ogImageUrl,
      siteName: settings?.siteName || 'HomeSolution',
    };
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    // Return defaults on error
    return {
      ...DEFAULT_SEO,
      siteName: 'HomeSolution',
    };
  }
}

/**
 * Generates meta tags object for Next.js metadata API
 * @returns {Promise<Object>} Meta tags object
 */
export async function getMetaTags() {
  const seo = await getSeoSettings();

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    keywords: seo.metaKeywords,
  };
}

/**
 * Generates Open Graph metadata object for Next.js metadata API
 * @returns {Promise<Object>} Open Graph object
 */
export async function getOpenGraphData() {
  const seo = await getSeoSettings();

  return {
    title: seo.ogTitle,
    description: seo.ogDescription,
    images: [
      {
        url: seo.ogImageUrl,
        width: 1200,
        height: 630,
        alt: seo.ogTitle,
      },
    ],
    siteName: seo.siteName,
    type: 'website',
  };
}

/**
 * Generates complete metadata object for Next.js App Router
 * @returns {Promise<Object>} Complete metadata object
 */
export async function getMetadata() {
  const [metaTags, openGraph] = await Promise.all([
    getMetaTags(),
    getOpenGraphData(),
  ]);

  return {
    ...metaTags,
    openGraph,
  };
}

/**
 * Generates Twitter Card metadata (uses Open Graph data as fallback)
 * @returns {Promise<Object>} Twitter Card object
 */
export async function getTwitterCardData() {
  const seo = await getSeoSettings();

  return {
    card: 'summary_large_image',
    title: seo.ogTitle,
    description: seo.ogDescription,
    images: [seo.ogImageUrl],
  };
}
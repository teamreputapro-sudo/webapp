/**
 * SEO Component - Dynamic meta tags for each page
 *
 * Updates document title and meta tags on route change.
 * Essential for Google indexing of SPA content.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOConfig {
  title: string;
  description: string;
  canonical: string;
}

const seoConfig: Record<string, SEOConfig> = {
  '/': {
    title: 'Funding Rate Arbitrage Scanner | Real-Time DEX Perpetual Opportunities',
    description: 'Find profitable funding rate arbitrage opportunities across Hyperliquid, Lighter, Pacifica, and Extended DEX perpetuals. Real-time spreads, historical data, and profit calculator. 20-150% APR potential.',
    canonical: 'https://54strategydigital.com/',
  },
  '/chart': {
    title: 'Live Trading Charts | Funding Rate Arbitrage Scanner',
    description: 'Real-time price charts and funding rate visualization for DEX perpetual futures. Monitor Hyperliquid, Lighter, Pacifica, and Extended markets with interactive charting tools.',
    canonical: 'https://54strategydigital.com/chart',
  },
  '/insights': {
    title: 'Funding Arbitrage Education & Guides | Learn Delta-Neutral Trading',
    description: 'Expert guides on funding rate arbitrage, spread inversions, timing strategies, and risk management. Learn how to profit from DEX perpetual funding rates with our comprehensive educational content.',
    canonical: 'https://54strategydigital.com/insights',
  },
  '/about': {
    title: 'About Us | 54 Strategy Digital - Funding Rate Arbitrage Tools',
    description: '54 Strategy Digital provides free professional-grade funding rate arbitrage tools. Learn about our mission to democratize access to delta-neutral trading strategies across DEX perpetuals.',
    canonical: 'https://54strategydigital.com/about',
  },
  '/terms': {
    title: 'Terms of Service | 54 Strategy Digital',
    description: 'Terms of Service for the Funding Rate Arbitrage Scanner. Read about data usage, risk disclosure, liability limitations, and user responsibilities.',
    canonical: 'https://54strategydigital.com/terms',
  },
  '/privacy': {
    title: 'Privacy Policy | 54 Strategy Digital',
    description: 'Privacy Policy for 54 Strategy Digital. Learn how we handle data, cookies, and third-party services like Google AdSense on our funding rate arbitrage scanner.',
    canonical: 'https://54strategydigital.com/privacy',
  },
  '/cookies': {
    title: 'Cookie Policy | 54 Strategy Digital',
    description: 'Cookie Policy for 54 Strategy Digital. Information about essential and advertising cookies used on our funding rate arbitrage scanner website.',
    canonical: 'https://54strategydigital.com/cookies',
  },
};

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    const config = seoConfig[location.pathname] || seoConfig['/'];

    // Update document title
    document.title = config.title;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', config.description);
    }

    // Update meta title
    const metaTitle = document.querySelector('meta[name="title"]');
    if (metaTitle) {
      metaTitle.setAttribute('content', config.title);
    }

    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', config.canonical);
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', config.title);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', config.description);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', config.canonical);
    }

    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[property="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', config.title);
    }

    const twitterDescription = document.querySelector('meta[property="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', config.description);
    }

    const twitterUrl = document.querySelector('meta[property="twitter:url"]');
    if (twitterUrl) {
      twitterUrl.setAttribute('content', config.canonical);
    }

  }, [location.pathname]);

  return null; // This component doesn't render anything
}

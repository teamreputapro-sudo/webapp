/**
 * Main App Component
 *
 * Full routing support with URL-based navigation:
 * - / (Opportunities Scanner - main feature)
 * - /chart (Live Chart)
 * - /insights (Educational content)
 * - /privacy (Privacy Policy)
 * - /cookies (Cookie Policy)
 */

import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { TrendingUp, LineChart, BookOpen, Menu, X, WifiOff, AlertCircle, Moon, Sun, Home } from 'lucide-react';
import OpportunitiesScanner from './components/OpportunitiesScanner';
import AdBanner from './components/AdBanner';
import SEO from './components/SEO';
import SymbolDetailRoute from './components/SymbolDetailRoute';
import { api } from './services/api';
import { withBase } from './lib/assetBase';
import { getLandingPath, getMainPaths, getScannerDetailRoute, getScannerPath, isScannerMode } from './lib/routerBase';

const ScannerRedirect = () => {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const target = pathname === '/scanner' ? '/scanner/' : pathname;
    window.location.replace(`${window.location.origin}${target}${search}${hash}`);
  }, []);

  return (
    <div className="card animate-fade-in">
      <div className="text-sm text-gray-600 dark:text-gray-400">Redirecting to Scanner…</div>
    </div>
  );
};

const LandingPage = lazy(() => import('./components/LandingPage'));
const LiveTradingChart = lazy(() => import('./components/LiveTradingChart'));
const Insights = lazy(() => import('./components/Insights'));
const ArticlePage = lazy(() => import('./components/ArticlePage'));

// Dark mode hook
function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark]);

  return [isDark, setIsDark] as const;
}

// Privacy Policy Page Component
function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="card">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
        <div className="prose dark:prose-invert text-gray-700 dark:text-gray-300 space-y-4">
          <p><strong>Last updated:</strong> December 2025</p>
          <h2 className="text-xl font-semibold font-display mt-6">Information We Collect</h2>
          <p>This website displays publicly available funding rate data from cryptocurrency exchanges. We do not collect personal information, require user accounts, or store any user data.</p>
          <h2 className="text-xl font-semibold font-display mt-6">Cookies</h2>
          <p>We use cookies for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Remembering your dark/light mode preference</li>
            <li>Google AdSense advertising (third-party cookies)</li>
          </ul>
          <h2 className="text-xl font-semibold font-display mt-6">Third-Party Services</h2>
          <p>We use Google AdSense to display advertisements. Google may use cookies to serve ads based on your prior visits to this or other websites. You can opt out of personalized advertising at <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 transition-colors">Google Ads Settings</a>.</p>
          <h2 className="text-xl font-semibold font-display mt-6">Data Sources</h2>
          <p>All funding rate data is sourced from public APIs of cryptocurrency exchanges including Hyperliquid, Lighter, Pacifica, and Extended.</p>
          <h2 className="text-xl font-semibold font-display mt-6">Disclaimer</h2>
          <p>This website is for educational and informational purposes only. It does not constitute financial advice. Cryptocurrency trading involves substantial risk of loss. Always do your own research before making any trading decisions.</p>
          <h2 className="text-xl font-semibold font-display mt-6">Contact</h2>
          <p>For questions about this privacy policy, please contact us through our website.</p>
        </div>
      </div>
    </div>
  );
}

// Cookie Policy Page Component
function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="card">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-6">Cookie Policy</h1>
        <div className="prose dark:prose-invert text-gray-700 dark:text-gray-300 space-y-4">
          <p><strong>Last updated:</strong> December 2025</p>
          <h2 className="text-xl font-semibold font-display mt-6">What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and provide a better user experience.</p>
          <h2 className="text-xl font-semibold font-display mt-6">Cookies We Use</h2>
          <div className="bg-gray-100 dark:bg-surface-800 rounded-lg p-4 space-y-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Essential Cookies</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">darkMode - Stores your theme preference</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Advertising Cookies (Third-party)</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Google AdSense cookies for serving relevant advertisements</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold font-display mt-6">Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Note that disabling cookies may affect website functionality.</p>
          <p>To opt out of Google's personalized advertising, visit: <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 transition-colors">Google Ads Settings</a></p>
          <h2 className="text-xl font-semibold font-display mt-6">More Information</h2>
          <p>For more information about cookies and how to manage them, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 transition-colors">allaboutcookies.org</a>.</p>
        </div>
      </div>
    </div>
  );
}

// About Us Page Component
function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="card">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-6">About Us</h1>
        <div className="prose dark:prose-invert text-gray-700 dark:text-gray-300 space-y-4">

          <h2 className="text-xl font-semibold font-display mt-6">Our Mission</h2>
          <p>At <strong>54 Strategy Digital</strong>, we are dedicated to democratizing access to professional-grade cryptocurrency trading tools. Our Funding Rate Arbitrage Scanner was built to help traders identify delta-neutral opportunities across decentralized perpetual exchanges.</p>

          <h2 className="text-xl font-semibold font-display mt-6">What We Do</h2>
          <p>We provide a free, real-time funding rate scanner that monitors four leading DEX perpetual exchanges:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Hyperliquid</strong> - The most liquid decentralized perpetuals exchange</li>
            <li><strong>Lighter</strong> - Zero maker fees with ZK-rollup technology</li>
            <li><strong>Pacifica</strong> - 8-hour funding intervals with unique rate dynamics</li>
            <li><strong>Extended</strong> - Broad asset coverage with StarkNet integration</li>
          </ul>
          <p>Our scanner calculates funding rate spreads between these venues, helping traders identify arbitrage opportunities with APRs ranging from 20% to over 150%.</p>

          <h2 className="text-xl font-semibold font-display mt-6">Our Technology</h2>
          <p>Our platform is built with modern web technologies to ensure fast, reliable data delivery:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Real-time WebSocket connections</strong> to all supported exchanges</li>
            <li><strong>Historical data analysis</strong> with 31-day spread charts</li>
            <li><strong>Profit calculator</strong> to estimate returns after fees</li>
            <li><strong>Educational content</strong> to help traders understand funding arbitrage</li>
          </ul>

          <h2 className="text-xl font-semibold font-display mt-6">Why We Built This</h2>
          <p>Funding rate arbitrage is one of the most consistent profit strategies in crypto, but finding opportunities requires monitoring multiple exchanges simultaneously. We built this scanner to automate that process and make it accessible to everyone.</p>
          <p>Our team has experience in quantitative trading, software engineering, and blockchain technology. We use the same tools we provide to you.</p>

          <h2 className="text-xl font-semibold font-display mt-6">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-100 dark:bg-surface-800 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-white">Transparency</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">All data sources are public APIs. We don't manipulate or delay information.</p>
            </div>
            <div className="bg-gray-100 dark:bg-surface-800 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-white">Education First</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">We provide extensive educational content to help users understand the strategy.</p>
            </div>
            <div className="bg-gray-100 dark:bg-surface-800 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-white">Privacy Focused</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">We don't require accounts or collect personal data. Your privacy matters.</p>
            </div>
            <div className="bg-gray-100 dark:bg-surface-800 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-white">Free Access</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Core features are free. We sustain the platform through non-intrusive advertising.</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold font-display mt-6">Disclaimer</h2>
          <p>This website is for educational and informational purposes only. It does not constitute financial advice. Cryptocurrency trading, including funding rate arbitrage, involves substantial risk of loss. Past performance does not guarantee future results. Always do your own research and never trade with money you cannot afford to lose.</p>

          <h2 className="text-xl font-semibold font-display mt-6">Contact</h2>
          <p>For questions, feedback, or partnership inquiries, please reach out through our website or social media channels.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">© 2026 54 Strategy Digital. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

// Terms of Service Page Component
function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="card">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-6">Terms of Service</h1>
        <div className="prose dark:prose-invert text-gray-700 dark:text-gray-300 space-y-4">
          <p><strong>Last updated:</strong> January 2026</p>
          <p>Please read these Terms of Service ("Terms") carefully before using the 54 Strategy Digital website and Funding Rate Arbitrage Scanner (the "Service").</p>

          <h2 className="text-xl font-semibold font-display mt-6">1. Acceptance of Terms</h2>
          <p>By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>

          <h2 className="text-xl font-semibold font-display mt-6">2. Description of Service</h2>
          <p>54 Strategy Digital provides a free funding rate arbitrage scanner that displays publicly available funding rate data from cryptocurrency exchanges. The Service includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Real-time funding rate data from multiple DEX perpetual exchanges</li>
            <li>Spread calculations and APR estimates</li>
            <li>Historical data visualization</li>
            <li>Educational content about funding rate arbitrage</li>
            <li>Profit calculator tools</li>
          </ul>

          <h2 className="text-xl font-semibold font-display mt-6">3. No Financial Advice</h2>
          <p><strong>IMPORTANT:</strong> The information provided on this website is for educational and informational purposes only. It does NOT constitute:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Financial advice or investment recommendations</li>
            <li>Trading signals or buy/sell recommendations</li>
            <li>Professional financial consultation</li>
            <li>Guaranteed profit strategies</li>
          </ul>
          <p>You should consult with a qualified financial advisor before making any investment decisions. We are not responsible for any trading losses you may incur.</p>

          <h2 className="text-xl font-semibold font-display mt-6">4. Risk Disclosure</h2>
          <p>Cryptocurrency trading involves significant risks, including but not limited to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Market Risk:</strong> Cryptocurrency prices are highly volatile and can result in substantial losses</li>
            <li><strong>Leverage Risk:</strong> Perpetual futures trading with leverage can amplify both gains and losses</li>
            <li><strong>Smart Contract Risk:</strong> DEX platforms may have vulnerabilities that could result in loss of funds</li>
            <li><strong>Execution Risk:</strong> Slippage, failed orders, and timing issues can affect trading outcomes</li>
            <li><strong>Regulatory Risk:</strong> Cryptocurrency regulations may change and affect your ability to trade</li>
          </ul>
          <p><strong>Never trade with money you cannot afford to lose.</strong></p>

          <h2 className="text-xl font-semibold font-display mt-6">5. Data Accuracy</h2>
          <p>While we strive to provide accurate and timely data, we make no warranties regarding:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The accuracy, completeness, or timeliness of funding rate data</li>
            <li>The availability of the Service at all times</li>
            <li>The reliability of third-party exchange APIs</li>
          </ul>
          <p>Data is provided "as is" and you should verify all information independently before making trading decisions.</p>

          <h2 className="text-xl font-semibold font-display mt-6">6. User Responsibilities</h2>
          <p>By using our Service, you agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Comply with all applicable laws and regulations in your jurisdiction</li>
            <li>Not use the Service for any illegal purposes</li>
            <li>Not attempt to disrupt or compromise the Service's infrastructure</li>
            <li>Not scrape, copy, or redistribute our content without permission</li>
            <li>Take full responsibility for your own trading decisions</li>
          </ul>

          <h2 className="text-xl font-semibold font-display mt-6">7. Intellectual Property</h2>
          <p>The Service and its original content (excluding third-party data from exchanges), features, and functionality are owned by 54 Strategy Digital and are protected by international copyright, trademark, and other intellectual property laws.</p>

          <h2 className="text-xl font-semibold font-display mt-6">8. Third-Party Links and Services</h2>
          <p>Our Service may contain links to third-party websites or services that are not owned or controlled by 54 Strategy Digital. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.</p>

          <h2 className="text-xl font-semibold font-display mt-6">9. Limitation of Liability</h2>
          <p>In no event shall 54 Strategy Digital, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your use or inability to use the Service</li>
            <li>Any trading losses or missed opportunities</li>
            <li>Any errors or inaccuracies in the data provided</li>
            <li>Unauthorized access to your accounts on third-party exchanges</li>
            <li>Any interruption or cessation of the Service</li>
          </ul>

          <h2 className="text-xl font-semibold font-display mt-6">10. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold harmless 54 Strategy Digital and its licensees and licensors from any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or violation of these Terms.</p>

          <h2 className="text-xl font-semibold font-display mt-6">11. Modifications</h2>
          <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

          <h2 className="text-xl font-semibold font-display mt-6">12. Governing Law</h2>
          <p>These Terms shall be governed and construed in accordance with applicable international laws, without regard to conflict of law provisions.</p>

          <h2 className="text-xl font-semibold font-display mt-6">13. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us through our website.</p>

          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
            <p className="text-amber-800 dark:text-amber-200 font-medium">By using the Funding Rate Arbitrage Scanner, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// FAQ Page Component - Extensive Q&A for AdSense compliance
function FAQ() {
  const faqs = [
    {
      question: "What is funding rate arbitrage?",
      answer: "Funding rate arbitrage is a delta-neutral trading strategy that profits from the difference in funding rates between perpetual futures exchanges. By opening opposing positions (long on one exchange, short on another), traders can collect funding payments while remaining market-neutral, meaning price movements don't affect your P&L - only the funding rate spread matters."
    },
    {
      question: "How much can I earn with funding rate arbitrage?",
      answer: "Returns vary based on market conditions, but typical APRs range from 20% to 150%. During high volatility periods, spreads can exceed 200% APR, though these opportunities are usually short-lived. Realistic long-term expectations are 25-50% APR after accounting for fees and spread decay. Remember that past performance doesn't guarantee future results."
    },
    {
      question: "What are the risks of funding rate arbitrage?",
      answer: "The main risks include: 1) Spread inversion - when your profitable spread becomes negative, 2) Exchange risk - platform hacks or insolvency, 3) Execution risk - slippage and failed orders, 4) Liquidation risk - if positions become unbalanced. Proper risk management, position sizing, and venue diversification can mitigate these risks significantly."
    },
    {
      question: "What is a spread inversion?",
      answer: "A spread inversion occurs when the funding rate relationship between your exchanges flips. For example, if you're short on Exchange A (receiving +0.01%) and long on Exchange B (paying -0.005%), your spread is +0.015%. An inversion happens when Exchange A's rate drops below Exchange B's, turning your profit into a loss. Quick exits are essential when inversions occur."
    },
    {
      question: "Which exchanges does your scanner support?",
      answer: "Our scanner monitors four leading decentralized perpetual exchanges: Hyperliquid (highest liquidity, 100+ pairs), Lighter (zero maker fees, ZK-rollup technology), Pacifica (8-hour funding intervals), and Extended (StarkNet integration, wide asset selection). Each venue has unique characteristics that create arbitrage opportunities."
    },
    {
      question: "How often are funding rates paid?",
      answer: "Funding payment frequency varies by exchange: Hyperliquid, Lighter, and Extended pay funding every 1 hour on the hour. Pacifica pays every 8 hours at 00:00, 08:00, and 16:00 UTC. The different intervals create unique timing opportunities for arbitrageurs."
    },
    {
      question: "What is the minimum capital needed to start?",
      answer: "You can start with as little as $500-1000, though $5,000+ is recommended for meaningful returns after fees. The key is that your capital must be split between two exchanges, so $1,000 means $500 per leg. With smaller amounts, fees represent a larger percentage of potential profits."
    },
    {
      question: "How do I calculate my actual profit?",
      answer: "Net APR = Gross Spread APR - Fee Drag. For example: If the spread is 0.006% per hour (52.6% APR) and round-trip fees are 0.15%, held for 7 days, your fee drag is 0.15% x (365/7) = 7.8% APR. Net APR = 52.6% - 7.8% = 44.8%. Also factor in slippage (0.02-0.1% per trade) and spread decay over time."
    },
    {
      question: "What is delta-neutral trading?",
      answer: "Delta-neutral means your overall position has zero exposure to price movements. By holding equal and opposite positions (e.g., $1000 long and $1000 short), if the price moves 10%, your long gains 10% while your short loses 10%, netting to zero. Your profit comes purely from funding payments, not price speculation."
    },
    {
      question: "How long should I hold positions?",
      answer: "Hold times vary by strategy: After major market moves (10%+ price change), expect 12-48 hour holds as sentiment normalizes. During stable markets, positions can be held 3-14 days. For altcoin-specific events, 4-24 hours is typical. Always calculate your break-even time first (fees / hourly spread) and plan to hold at least 2x that."
    },
    {
      question: "What fees should I expect?",
      answer: "Typical fees: Hyperliquid (0.02% maker, 0.05% taker), Lighter (0% maker, 0.04% taker), Pacifica (0.02% maker, 0.05% taker), Extended (0.02% maker, 0.05% taker). Using limit orders (maker) significantly reduces costs. A typical round-trip with taker orders costs 0.10-0.20%."
    },
    {
      question: "Why use DEX exchanges instead of centralized exchanges?",
      answer: "DEX perpetuals offer several advantages: 1) Self-custody - your keys, your crypto, 2) Divergent rates - less efficient markets create bigger spreads, 3) Transparency - all rates visible on-chain, 4) No KYC for most platforms, 5) Lower counterparty risk - no exchange insolvency concerns. The trade-off is sometimes lower liquidity."
    },
    {
      question: "What is the best time to enter positions?",
      answer: "The best entry opportunities typically occur during: 1) The US trading session (14:00-22:00 UTC) when volatility and rate divergence peak, 2) After significant price movements (5%+ in BTC/ETH), 3) When spreads are widening, not narrowing. Avoid entries during weekend low liquidity (Friday evening to Sunday morning) and before major events."
    },
    {
      question: "How do I know when to exit?",
      answer: "Exit when: 1) Spread drops below 15-20% APR, 2) Spread inverts (becomes negative), 3) 24-hour average spread is lower than your entry spread, 4) Better opportunities appear elsewhere, 5) The 48-hour rule - if spread is less than 50% of entry after 48 hours, consider exiting."
    },
    {
      question: "Is funding rate arbitrage legal?",
      answer: "Funding rate arbitrage is a legitimate trading strategy and is legal in most jurisdictions. However, cryptocurrency regulations vary by country. Users should consult with local legal and tax professionals to understand their specific obligations. This website does not provide legal or tax advice."
    },
    {
      question: "Does the scanner provide trading signals?",
      answer: "No. Our scanner displays real-time funding rate data and calculates spreads, but does not provide buy/sell signals or trading recommendations. It's an informational tool to help you identify potential opportunities. All trading decisions are yours to make based on your own research and risk tolerance."
    },
    {
      question: "What is APR vs APY?",
      answer: "APR (Annual Percentage Rate) is simple interest - the rate multiplied by time. APY (Annual Percentage Yield) includes compound interest. Our scanner shows APR for clarity. To convert: APY = (1 + APR/n)^n - 1, where n is compounding periods. With hourly funding and daily compounding, the difference is minimal."
    },
    {
      question: "How reliable is the data?",
      answer: "Our data comes directly from exchange APIs and is updated in real-time via WebSocket connections. However, we make no guarantees about data accuracy, completeness, or timeliness. Exchange APIs can have delays or errors. Always verify rates directly on the exchange before trading."
    },
    {
      question: "Can I automate my arbitrage trading?",
      answer: "Yes, many traders use scripts or bots to automate execution. This requires programming knowledge and exchange API access. Automation helps with speed (simultaneous entries/exits) and monitoring (24/7 spread tracking). However, automated trading carries additional risks and requires careful testing."
    },
    {
      question: "Why do different exchanges have different funding rates?",
      answer: "Funding rates reflect the supply/demand imbalance on each exchange. Different user bases, liquidity levels, and market maker activity cause rates to diverge. For example, retail-heavy exchanges may have more longs (positive funding) while institutional exchanges may be more balanced. These inefficiencies create arbitrage opportunities."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="card">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Everything you need to know about funding rate arbitrage and using our scanner.</p>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
              <h2 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-2">
                {faq.question}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Still have questions? Check out our <Link to="/insights" className="text-primary-600 dark:text-primary-400 hover:underline">educational articles</Link> for in-depth guides on funding rate arbitrage strategies.
          </p>
        </div>
      </div>
    </div>
  );
}

// Glossary Page Component - Trading terms explained
function Glossary() {
  const terms = [
    { term: "APR (Annual Percentage Rate)", definition: "The annualized return rate calculated as simple interest. A 0.01% hourly rate equals 87.6% APR (0.01% x 8,760 hours)." },
    { term: "Arbitrage", definition: "A trading strategy that profits from price or rate differences between markets. In funding arbitrage, the 'price' difference is between funding rates on different exchanges." },
    { term: "Ask Price", definition: "The lowest price a seller is willing to accept. Also called the 'offer' price. When you buy with a market order, you pay the ask price." },
    { term: "Bid Price", definition: "The highest price a buyer is willing to pay. When you sell with a market order, you receive the bid price." },
    { term: "Break-Even Time", definition: "The minimum time you need to hold a position to cover your entry and exit fees. Calculated as: Total Fees / Hourly Spread." },
    { term: "Convergence", definition: "When funding rates across venues move toward each other, reducing the spread. The natural tendency of efficient markets over time." },
    { term: "Delta", definition: "A measure of how much a position's value changes when the underlying asset's price changes. A delta of 1 means 1:1 movement with the asset." },
    { term: "Delta-Neutral", definition: "A portfolio with zero net delta, meaning price movements don't affect overall P&L. Achieved by holding equal long and short positions." },
    { term: "DEX (Decentralized Exchange)", definition: "An exchange that operates without a central authority, using smart contracts for trading. Examples: Hyperliquid, Lighter, Pacifica, Extended." },
    { term: "Fee Drag", definition: "The annualized impact of trading fees on your returns. For a 7-day position with 0.15% round-trip fees: 0.15% x (365/7) = 7.8% APR drag." },
    { term: "Funding Interval", definition: "How often funding payments are exchanged. Common intervals: 1 hour (Hyperliquid, Lighter, Extended) or 8 hours (Pacifica)." },
    { term: "Funding Rate", definition: "A periodic payment between long and short traders that keeps perpetual contract prices aligned with spot prices. Positive = longs pay shorts; negative = shorts pay longs." },
    { term: "GTC (Good Till Cancelled)", definition: "An order type that remains active until filled or manually cancelled. Useful for patient entries at your desired price." },
    { term: "Hedge", definition: "A position taken to offset risk from another position. In funding arbitrage, your long and short positions hedge each other against price risk." },
    { term: "IOC (Immediate Or Cancel)", definition: "An order type that fills immediately at available prices and cancels any unfilled portion. Used for quick execution but may cause slippage." },
    { term: "Leverage", definition: "Using borrowed funds to increase position size. 10x leverage means $100 controls $1,000. Higher leverage increases both potential returns and risks." },
    { term: "Limit Order", definition: "An order to buy/sell at a specific price or better. Limit orders often have lower fees (maker fees) but may not fill immediately." },
    { term: "Liquidation", definition: "Forced closure of a position when losses exceed your margin. Occurs when your position moves against you beyond your available collateral." },
    { term: "Long Position", definition: "A position that profits when prices rise. You buy the asset expecting it to increase in value." },
    { term: "Maker Fee", definition: "The fee charged when your order adds liquidity to the order book (typically limit orders). Usually lower than taker fees, sometimes zero." },
    { term: "Margin", definition: "The collateral required to open and maintain a leveraged position. Initial margin opens the position; maintenance margin keeps it open." },
    { term: "Mark Price", definition: "A fair price calculated from multiple sources, used to determine unrealized P&L and liquidation. Helps prevent manipulation." },
    { term: "Market Order", definition: "An order to buy/sell immediately at the best available price. Ensures execution but may suffer slippage in illiquid markets." },
    { term: "Open Interest", definition: "The total number of outstanding perpetual contracts. High open interest indicates an active, liquid market." },
    { term: "Perpetual Contract", definition: "A futures contract with no expiration date. Uses funding rates instead of settlement to track spot prices." },
    { term: "Position Size", definition: "The dollar value or quantity of your trade. In funding arbitrage, your long and short positions should be equal." },
    { term: "Premium", definition: "When perpetual price is above spot price, indicating bullish sentiment. Typically results in positive funding (longs pay shorts)." },
    { term: "Short Position", definition: "A position that profits when prices fall. You sell borrowed assets expecting to buy them back cheaper." },
    { term: "Slippage", definition: "The difference between expected and actual execution price. More common with large orders in illiquid markets." },
    { term: "Spot Price", definition: "The current market price for immediate delivery of an asset. Funding rates work to keep perpetual prices aligned with spot." },
    { term: "Spread", definition: "In funding arbitrage: the difference between funding rates on two venues. Spread = Short Venue Rate - Long Venue Rate." },
    { term: "Spread Inversion", definition: "When the funding rate relationship flips, turning a profitable spread negative. Signals time to exit the position." },
    { term: "Taker Fee", definition: "The fee charged when your order removes liquidity from the order book (typically market orders). Usually higher than maker fees." },
    { term: "Unrealized P&L", definition: "Paper profit or loss that hasn't been locked in yet. Becomes realized P&L when you close the position." },
    { term: "Venue", definition: "A trading platform or exchange. In this context, refers to DEX perpetual exchanges like Hyperliquid, Lighter, Pacifica, and Extended." },
    { term: "Volatility", definition: "The degree of price variation over time. Higher volatility often creates larger funding rate divergences and arbitrage opportunities." },
    { term: "WebSocket", definition: "A communication protocol enabling real-time data streaming. Our scanner uses WebSocket connections for live funding rate updates." },
    { term: "Yield", definition: "The return earned on an investment. In funding arbitrage, yield comes from collecting funding payments, not price appreciation." },
    { term: "ZK-Rollup", definition: "A Layer 2 scaling solution using zero-knowledge proofs. Lighter uses ZK-rollup technology, which can cause 20+ second settlement delays." }
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="card">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-2">Trading Glossary</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Key terms and concepts for funding rate arbitrage trading.</p>

        <div className="space-y-4">
          {terms.map((item, index) => (
            <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
              <dt className="font-semibold font-display text-gray-900 dark:text-white">
                {item.term}
              </dt>
              <dd className="mt-1 text-gray-700 dark:text-gray-300">
                {item.definition}
              </dd>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Want to learn more? Read our <Link to="/insights/what-is-funding-rate-arbitrage" className="text-primary-600 dark:text-primary-400 hover:underline">complete guide to funding rate arbitrage</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Contact Page Component
function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create mailto link with form data
    const mailtoLink = `mailto:54lab4ia@gmail.com?subject=${encodeURIComponent(formData.subject || 'Contact from 54 Strategy Digital')}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`)}`;
    window.location.href = mailtoLink;
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Information */}
        <div className="card">
          <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-4">Contact Us</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Have questions about funding rate arbitrage or our scanner? We're here to help. Reach out and we'll respond as soon as possible.
          </p>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                <a href="mailto:54lab4ia@gmail.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                  54lab4ia@gmail.com
                </a>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We typically respond within 24-48 hours</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Support Hours</h3>
                <p className="text-gray-600 dark:text-gray-400">Monday - Friday</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">9:00 AM - 6:00 PM UTC</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Quick Help</h3>
                <p className="text-gray-600 dark:text-gray-400">Check our resources:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Link to="/faq" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">FAQ</Link>
                  <span className="text-gray-400">|</span>
                  <Link to="/insights" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">Guides</Link>
                  <span className="text-gray-400">|</span>
                  <Link to="/glossary" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">Glossary</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="card">
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-4">Send a Message</h2>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Client Opened</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your default email app should have opened with the message. If not, please email us directly at{' '}
                <a href="mailto:54lab4ia@gmail.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                  54lab4ia@gmail.com
                </a>
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 dark:text-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 dark:text-white"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 dark:text-white"
                >
                  <option value="">Select a topic...</option>
                  <option value="General Question">General Question</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Partnership Inquiry">Partnership Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-surface-800 border border-gray-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 dark:text-white resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-3 font-semibold"
              >
                Send Message
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By submitting this form, you agree to our{' '}
                <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="card mt-8">
        <h2 className="text-lg font-bold font-display text-gray-900 dark:text-white mb-4">Before You Contact Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-surface-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">New to Arbitrage?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start with our comprehensive guide to understand the basics.
            </p>
            <Link to="/insights/what-is-funding-rate-arbitrage" className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
              Read the Guide →
            </Link>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-surface-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Common Questions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check our FAQ for answers to frequently asked questions.
            </p>
            <Link to="/faq" className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
              View FAQ →
            </Link>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-surface-800 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Trading Terms</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Confused by terminology? Our glossary explains key concepts.
            </p>
            <Link to="/glossary" className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
              View Glossary →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isDark, setIsDark] = useDarkMode();

  // Check backend health on mount and periodically
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const checkBackendHealth = async () => {
    try {
      await api.getHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  };

  const scannerPath = getScannerPath();
  const landingPath = getLandingPath();
  const navigation = [
    { path: landingPath, name: 'Home', icon: Home, description: 'Funding rate arbitrage overview' },
    { path: scannerPath, name: 'Scanner', icon: TrendingUp, description: 'Find arbitrage opportunities' },
    { path: '/chart', name: 'Live Chart', icon: LineChart, description: 'Real-time price charts' },
    { path: '/insights', name: 'Insights', icon: BookOpen, description: 'Learn about funding arbitrage' },
  ];

  const currentNav = navigation.find(n => n.path === location.pathname) || navigation[0];
  const isMainPage = getMainPaths().includes(location.pathname);
  const isLandingPage = location.pathname === landingPath;
  const showAdBanners = backendStatus === 'online' && !isLandingPage;

  return (
    <div className="min-h-screen transition-colors flex flex-col">
      {/* SEO - Dynamic meta tags */}
      <SEO />

      {/* Header */}
      <header className="bg-white/80 dark:bg-surface-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-surface-700/50 sticky top-0 z-50 h-16 min-h-[64px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-full min-h-[64px]">
            {/* Logo & Title */}
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
              <img
                src={withBase('logo-54sd-mini.png?v=2')}
                alt="54 Strategy Digital"
                width={40}
                height={40}
                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div>
                <h1 className="text-xl font-bold font-display text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-neon-cyan transition-colors">
                  54 Strategy Digital
                </h1>
                <div className="flex items-center space-x-2 min-h-[20px]">
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block font-medium">
                    Real-time Opportunities
                  </p>
                  {/* Backend Status */}
                  <div className="flex items-center min-w-[96px] h-5">
                    {backendStatus === 'online' && (
                      <div className="live-indicator">
                        <span>Live</span>
                      </div>
                    )}
                    {backendStatus === 'offline' && (
                      <div className="flex items-center space-x-1 px-2.5 py-1 bg-red-100 dark:bg-red-500/20 rounded-full">
                        <WifiOff className="w-3 h-3 text-red-600 dark:text-red-400" />
                        <span className="text-xs text-red-700 dark:text-red-400 font-semibold">Offline</span>
                      </div>
                    )}
                    {backendStatus === 'checking' && (
                      <div className="w-4 h-4 spinner" />
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 min-w-[420px] min-h-[40px] flex-shrink-0">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    reloadDocument={item.path === scannerPath && !isScannerMode()}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium font-display transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-neon-cyan shadow-sm dark:shadow-neon-cyan/10'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'dark:drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]' : ''}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="ml-2 p-2.5 rounded-lg bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 transition-all duration-200 hover:scale-105 active:scale-95"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-neon-yellow drop-shadow-[0_0_8px_rgba(255,255,0,0.5)]" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </nav>

            {/* Mobile: Dark mode + Menu */}
            <div className="flex items-center space-x-2 md:hidden">
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-surface-700 transition-all"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-neon-yellow" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600 dark:text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600 dark:text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-surface-700 bg-white/95 dark:bg-surface-900/95 backdrop-blur-lg animate-fade-in-down">
            <nav className="px-4 py-3 space-y-1">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg font-medium font-display transition-all duration-200 animate-fade-in-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-neon-cyan' : 'text-gray-500'}`} />
                    <div className="text-left">
                      <div className={isActive ? 'text-primary-700 dark:text-neon-cyan' : 'text-gray-700 dark:text-white'}>{item.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Top Ad Banner (not on Landing/Home). */}
      {showAdBanners && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <AdBanner
            slot="2893729326"
            format="auto"
            className="mb-2"
            enabled
            reserve="auto"
          />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        {/* Backend Offline Warning */}
        {backendStatus === 'offline' && isMainPage && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 animate-fade-in">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold font-display text-amber-800 dark:text-amber-200">
                  Backend API Offline
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Real-time data is unavailable. Start the backend to see live opportunities.
                </p>
                <pre className="mt-2 p-3 bg-surface-900 rounded-lg text-xs text-neon-green font-mono overflow-x-auto">
                  cd webapp && ./start_backend.sh
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Page Header - only for main pages */}
        {isMainPage && (
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center space-x-3 mb-2">
              {currentNav && (
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-500/20">
                  <currentNav.icon className="w-7 h-7 text-primary-600 dark:text-neon-cyan" />
                </div>
              )}
              <h2 className="text-3xl font-bold font-display text-gray-900 dark:text-white">
                {currentNav?.name}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 ml-12 font-medium">
              {currentNav?.description}
            </p>
          </div>
        )}

        {/* Routes */}
        <Suspense
          fallback={(
            <div className="animate-fade-in-up card">
              <div className="h-5 w-40 bg-gray-200/70 dark:bg-surface-700 rounded mb-3" />
              <div className="h-4 w-72 bg-gray-200/60 dark:bg-surface-700 rounded mb-2" />
              <div className="h-4 w-64 bg-gray-200/50 dark:bg-surface-700 rounded" />
            </div>
          )}
        >
          <Routes>
            {isScannerMode() ? (
              <>
                <Route path="/" element={<OpportunitiesScanner />} />
                <Route path={getScannerDetailRoute()} element={<SymbolDetailRoute />} />
                <Route path="/home" element={<LandingPage />} />
              </>
            ) : (
              <>
                <Route path="/" element={<LandingPage />} />
                <Route path="/scanner" element={<ScannerRedirect />} />
                <Route path={getScannerDetailRoute()} element={<ScannerRedirect />} />
              </>
            )}
            <Route path="/chart" element={<LiveTradingChart />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/insights/:slug" element={<ArticlePage />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms" element={<TermsOfService />} />
            {/* Fallback based on mode */}
            <Route path="*" element={isScannerMode() ? <OpportunitiesScanner /> : <LandingPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Bottom Ad Banner (not on Landing/Home). */}
      {showAdBanners && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 w-full">
          <AdBanner
            slot="3776222694"
            format="auto"
            className="mt-4"
            enabled
            reserve="auto"
          />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 dark:border-surface-700 bg-white/50 dark:bg-surface-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <img
                src={withBase('logo-54sd-mini.png?v=2')}
                alt="54 Strategy Digital"
                className="w-8 h-8 object-contain"
              />
              <div className="text-center md:text-left">
                <p className="text-sm font-display font-medium text-gray-700 dark:text-white">
                  54 Strategy Digital
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Funding rate arbitrage scanner. Not financial advice.
                </p>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link
                to="/insights"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                Articles
              </Link>
              <Link
                to="/faq"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                FAQ
              </Link>
              <Link
                to="/glossary"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                Glossary
              </Link>
              <Link
                to="/contact"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                Contact
              </Link>
              <Link
                to="/about"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                About
              </Link>
              <Link
                to="/terms"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-neon-cyan transition-colors font-medium"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

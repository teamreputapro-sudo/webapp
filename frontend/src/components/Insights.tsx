/**
 * Insights Component - Blog/Educational Content Listing for SEO
 *
 * This page lists all articles with links to individual article pages.
 * Each article has its own URL for better Google indexing.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, Shield, ChevronRight, Clock, Tag, AlertTriangle, Target } from 'lucide-react';
import { articles, categoryColors } from '../data/articles';

const categoryIcons = {
  strategy: TrendingUp,
  education: BookOpen,
  analysis: BookOpen,
  guide: Shield,
  advanced: Target,
};

export default function Insights() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = selectedCategory
    ? articles.filter(a => a.category === selectedCategory)
    : articles;

  const categories = [
    { id: 'education', name: 'Education', icon: BookOpen },
    { id: 'strategy', name: 'Strategy', icon: TrendingUp },
    { id: 'guide', name: 'Guides', icon: Shield },
    { id: 'advanced', name: 'Advanced', icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* SEO-friendly intro */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
        <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-2">
          Funding Rate Arbitrage Education Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Expert guides, strategies, and analysis for maximizing returns with delta-neutral funding rate arbitrage across DEX perpetual exchanges. Learn how to find opportunities, manage risk, and calculate real profits.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !selectedCategory
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          All Articles ({articles.length})
        </button>
        {categories.map(cat => {
          const Icon = cat.icon;
          const count = articles.filter(a => a.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.name} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Featured Article */}
      {!selectedCategory && (
        <Link
          to={`/insights/${articles[0].slug}`}
          className="block card bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white cursor-pointer hover:shadow-xl transition-all group overflow-hidden"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            {articles[0].image && (
              <div className="md:w-2/5 flex-shrink-0">
                <img
                  src={articles[0].image}
                  alt={articles[0].title}
                  className="w-full h-48 md:h-full object-cover rounded-lg"
                  loading="eager"
                />
              </div>
            )}
            {/* Content */}
            <div className={articles[0].image ? 'md:w-3/5' : 'w-full'}>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-primary-500 rounded-full text-sm font-medium">Featured</span>
                <span className="flex items-center text-sm text-gray-300">
                  <Clock className="w-4 h-4 mr-1" />
                  {articles[0].readTime} min read
                </span>
              </div>
              <h2 className="text-2xl font-bold font-display mb-3 group-hover:text-primary-300 transition-colors">
                {articles[0].title}
              </h2>
              <p className="text-gray-300 mb-4">{articles[0].excerpt}</p>
              <span className="text-primary-400 flex items-center group-hover:text-primary-300 transition-colors">
                Read Full Article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Articles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.slice(selectedCategory ? 0 : 1).map(article => {
          const CategoryIcon = categoryIcons[article.category] || BookOpen;
          return (
            <Link
              key={article.id}
              to={`/insights/${article.slug}`}
              className="card hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
            >
              <article>
                {/* Thumbnail image */}
                {article.image && (
                  <div className="mb-4 -mx-6 -mt-6">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[article.category]}`}>
                    <CategoryIcon className="w-4 h-4 inline mr-1" />
                    {article.category}
                  </span>
                  <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {article.readTime} min
                  </span>
                </div>

                <h3 className="text-xl font-semibold font-display text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {article.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs rounded"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {filteredArticles.length === 0 && (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No articles found for this category.
          </p>
        </div>
      )}

      {/* Quick Links Section for SEO */}
      <div className="card">
        <h2 className="text-lg font-bold font-display text-gray-900 dark:text-white mb-4">
          Quick Links: Popular Topics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link to="/insights/what-is-funding-rate-arbitrage" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            What is Funding Rate Arbitrage?
          </Link>
          <Link to="/insights/best-dex-venues-funding-arbitrage" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            Best DEX Exchanges for Arbitrage
          </Link>
          <Link to="/insights/spread-inversions-risk-management" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            Understanding Spread Inversions
          </Link>
          <Link to="/insights/funding-rate-cycles-timing-strategy" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            Timing Your Entries and Exits
          </Link>
          <Link to="/insights/funding-arbitrage-profit-calculator" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            Calculating Real Profits
          </Link>
          <Link to="/insights/advanced-risk-management-funding-arbitrage" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            Advanced Risk Management
          </Link>
        </div>
      </div>

      {/* SEO-friendly bottom section */}
      <div className="card">
        <AlertTriangle className="w-8 h-8 text-yellow-500 mb-3" />
        <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-2">
          Disclaimer
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The information provided in these articles is for educational purposes only and should not be considered financial advice.
          Trading perpetual futures involves significant risk of loss. Always do your own research and never trade with money you cannot afford to lose.
        </p>
      </div>
    </div>
  );
}

/**
 * ArticlePage Component - Individual article view with SEO-friendly URL
 *
 * Each article has its own URL for better Google indexing:
 * /insights/what-is-funding-rate-arbitrage
 * /insights/spread-inversions-risk-management
 * etc.
 */

import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Clock, Tag, BookOpen } from 'lucide-react';
import { getArticleBySlug, categoryColors, articles } from '../data/articles';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : null;

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Article Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/insights"
            className="btn-primary inline-flex items-center"
          >
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            Back to All Articles
          </Link>
        </div>
      </div>
    );
  }

  // Get related articles (same category, excluding current)
  const relatedArticles = articles
    .filter(a => a.category === article.category && a.id !== article.id)
    .slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/insights" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          Insights
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
          {article.title}
        </span>
      </nav>

      {/* Article content */}
      <article className="card max-w-4xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[article.category]}`}>
              {article.category}
            </span>
            <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-1" />
              {article.readTime} min read
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {article.date}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-gray-900 dark:text-white mb-4">
            {article.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            {article.excerpt}
          </p>
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span
                key={tag}
                className="flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-xs rounded"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>

          {/* Hero Image */}
          {article.image && (
            <div className="mt-6 rounded-xl overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-auto object-cover"
                loading="eager"
              />
            </div>
          )}
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {article.content.split('\n').map((line, idx) => {
            // Skip the first H1 as we already show the title
            if (line.startsWith('# ') && idx < 5) {
              return null;
            }
            if (line.startsWith('# ')) {
              return <h1 key={idx} className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={idx} className="text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-100">{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={idx} className="text-lg font-medium mt-4 mb-2 text-gray-700 dark:text-gray-200">{line.slice(4)}</h3>;
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return <li key={idx} className="ml-4 text-gray-700 dark:text-gray-300 mb-1">{line.slice(2)}</li>;
            }
            if (line.match(/^\d+\./)) {
              return <li key={idx} className="ml-4 text-gray-700 dark:text-gray-300 mb-1 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
            }
            if (line.startsWith('```')) {
              return null;
            }
            if (line.startsWith('|')) {
              // Table handling - simplified
              const cells = line.split('|').filter(c => c.trim());
              if (line.includes('---')) return null; // Skip separator
              return (
                <div key={idx} className="flex text-sm border-b border-gray-200 dark:border-gray-700">
                  {cells.map((cell, i) => (
                    <div key={i} className={`flex-1 px-2 py-1 ${i === 0 ? 'font-medium' : ''} text-gray-700 dark:text-gray-300`}>
                      {cell.trim()}
                    </div>
                  ))}
                </div>
              );
            }
            if (line.trim() === '') {
              return <div key={idx} className="h-2" />;
            }
            // Handle inline formatting
            const formatted = line
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
              .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-sm font-mono text-primary-600 dark:text-primary-400">$1</code>');
            return <p key={idx} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: formatted }} />;
          })}
        </div>

        {/* CTA at bottom of article */}
        <div className="mt-8 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-2">
            Ready to Find Opportunities?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Use our real-time scanner to identify the best funding rate arbitrage opportunities across Hyperliquid, Lighter, Pacifica, and Extended.
          </p>
          <Link to="/" className="btn-primary inline-block">
            View Live Opportunities
          </Link>
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-4xl">
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-4">
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map(related => (
              <Link
                key={related.id}
                to={`/insights/${related.slug}`}
                className="card hover:shadow-lg transition-all group"
              >
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${categoryColors[related.category]}`}>
                  {related.category}
                </span>
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                  {related.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {related.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Back to insights link */}
      <div className="max-w-4xl">
        <Link
          to="/insights"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
          View All Articles
        </Link>
      </div>
    </div>
  );
}

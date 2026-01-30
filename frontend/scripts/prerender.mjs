/**
 * Pre-rendering script for SPA
 *
 * Generates static HTML for each route so search engines can index content.
 * Run after `npm run build` to generate pre-rendered HTML files.
 */

import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, '..', 'dist');
const PORT = 8888;

// Routes to pre-render
const routes = [
  '/',
  '/chart',
  '/insights',
  '/about',
  '/terms',
  '/privacy',
  '/cookies'
];

// Simple static file server
function createStaticServer(dir, port) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
    };

    const server = createServer((req, res) => {
      let filePath = join(dir, req.url === '/' ? 'index.html' : req.url);

      // For SPA routes, serve index.html
      if (!existsSync(filePath) || !filePath.includes('.')) {
        filePath = join(dir, 'index.html');
      }

      try {
        const content = readFileSync(filePath);
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/html' });
        res.end(content);
      } catch (e) {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      console.log(`Static server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function prerender() {
  console.log('Starting pre-rendering...\n');

  // Start static server
  const server = await createStaticServer(DIST_DIR, PORT);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const route of routes) {
      console.log(`Pre-rendering: ${route}`);

      const page = await browser.newPage();

      // Navigate to the route
      await page.goto(`http://localhost:${PORT}${route}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for React to render
      await page.waitForSelector('#root > *', { timeout: 10000 });

      // Wait a bit more for any async content
      await new Promise(r => setTimeout(r, 1000));

      // Get the full HTML
      const html = await page.content();

      // Determine output path
      let outputPath;
      if (route === '/') {
        outputPath = join(DIST_DIR, 'index.html');
      } else {
        const routeDir = join(DIST_DIR, route);
        if (!existsSync(routeDir)) {
          mkdirSync(routeDir, { recursive: true });
        }
        outputPath = join(routeDir, 'index.html');
      }

      // Write the pre-rendered HTML
      writeFileSync(outputPath, html);
      console.log(`  -> Saved to: ${outputPath}`);

      await page.close();
    }

    console.log('\nPre-rendering completed successfully!');
    console.log(`Generated ${routes.length} static HTML files.`);

  } catch (error) {
    console.error('Pre-rendering failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
}

prerender();

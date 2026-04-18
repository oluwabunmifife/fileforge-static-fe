import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Check if dist folder exists
const distPath = join(__dirname, 'dist');
const distExists = fs.existsSync(distPath);
console.log(`[DEBUG] dist folder exists: ${distExists}`);
console.log(`[DEBUG] dist folder path: ${distPath}`);
console.log(`[DEBUG] __dirname: ${__dirname}`);

if (distExists) {
  const distContents = fs.readdirSync(distPath);
  console.log(`[DEBUG] dist contents: ${distContents.join(', ')}`);
  const assetsPath = join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assetsContents = fs.readdirSync(assetsPath);
    console.log(`[DEBUG] assets contents: ${assetsContents.join(', ')}`);
  }
}

// Serve configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    apiBaseUrl: (process.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  });
});

// Set proper MIME types
app.set('view engine', 'html');
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (req.url.endsWith('.woff') || req.url.endsWith('.woff2')) {
    res.setHeader('Content-Type', 'font/woff2');
  }
  next();
});

// Serve static files from the dist directory
app.use(express.static(distPath, { 
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  console.log(`[DEBUG] Requesting: ${req.url}, serving: ${indexPath}`);
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

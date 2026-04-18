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

if (distExists) {
  const distContents = fs.readdirSync(distPath);
  console.log(`[DEBUG] dist contents: ${distContents.join(', ')}`);
}

// Serve configuration endpoint
app.get('/api/config', (req, res) => {
  res.json({
    apiBaseUrl: (process.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  });
});

// Serve static files from the dist directory
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

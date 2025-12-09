// FIBRIL Static File Server
// All processing runs client-side in fibril-core.js

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public/
app.use(express.static(join(__dirname, 'public')));

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   FIBRIL - Dynamic Bayesian Network Harmonizer            ║
║   (Client-Side Processing)                                ║
║                                                           ║
║   Server running at http://localhost:${PORT}                 ║
║                                                           ║
║   All state processing runs in your browser.              ║
║   Multiple users can play independently.                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;

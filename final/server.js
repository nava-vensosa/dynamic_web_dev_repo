// FIBRIL Express Server
// Stub for future UI integration

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import {
  initialize,
  startClock,
  stopClock,
  getState,
  getDBN,
  updateInputs,
  simulateKeypress,
  simulateSustain,
  simulateKeycenter
} from './src/index.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Initialize FIBRIL core
const { state, dbn } = initialize();

// API Routes

/**
 * GET /api/state
 * Get current system state
 */
app.get('/api/state', (req, res) => {
  try {
    res.json({
      success: true,
      state: getState()?.toJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/voicemap
 * Get current voicemap output
 */
app.get('/api/voicemap', (req, res) => {
  try {
    res.json({
      success: true,
      voicemap: getDBN()?.getLastOutput() || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/clock/start
 * Start the clock loop
 */
app.post('/api/clock/start', (req, res) => {
  try {
    startClock();
    res.json({ success: true, message: 'Clock started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/clock/stop
 * Stop the clock loop
 */
app.post('/api/clock/stop', (req, res) => {
  try {
    stopClock();
    res.json({ success: true, message: 'Clock stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/input/keypress
 * Simulate a keypress on a rank button
 * Body: { rankId: number, buttonIndex: number }
 */
app.post('/api/input/keypress', (req, res) => {
  try {
    const { rankId, buttonIndex } = req.body;
    simulateKeypress(rankId, buttonIndex);
    res.json({ success: true, message: `Keypress: Rank ${rankId}, Button ${buttonIndex}` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/input/sustain
 * Set sustain pedal state
 * Body: { pressed: boolean }
 */
app.post('/api/input/sustain', (req, res) => {
  try {
    const { pressed } = req.body;
    simulateSustain(pressed);
    res.json({ success: true, message: `Sustain: ${pressed}` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/input/keycenter
 * Set keycenter
 * Body: { midiNote: number }
 */
app.post('/api/input/keycenter', (req, res) => {
  try {
    const { midiNote } = req.body;
    simulateKeycenter(midiNote);
    res.json({ success: true, message: `Keycenter: ${midiNote}` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/input/update
 * Bulk update inputs
 * Body: { ranks?, keycenter?, sustain?, rl_flip?, drawbars? }
 */
app.post('/api/input/update', (req, res) => {
  try {
    updateInputs(req.body);
    res.json({ success: true, message: 'Inputs updated' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/input/heuristics
 * Update heuristic weights
 * Body: { crawl?, harmonicity?, vl? }
 */
app.post('/api/input/heuristics', (req, res) => {
  try {
    const { crawl, harmonicity, vl } = req.body;
    const currentState = getState();
    if (crawl !== undefined) currentState.setCrawl(crawl);
    if (harmonicity !== undefined) currentState.setHarmonicity(harmonicity);
    if (vl !== undefined) currentState.setVl(vl);
    res.json({ success: true, message: 'Heuristics updated' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Static files from public/ will serve index.html automatically

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   FIBRIL - Dynamic Bayesian Network Harmonizer            ║
║                                                           ║
║   Server running at http://localhost:${PORT}                 ║
║                                                           ║
║   Commands:                                               ║
║   - npm start     : Start server                          ║
║   - npm run demo  : Run demo sequence                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Auto-start the clock
  startClock();
});

export default app;

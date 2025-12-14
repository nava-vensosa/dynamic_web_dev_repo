// FIBRIL Static File Server + OSC Bridge
// All processing runs client-side in fibril-core.js
// WebSocket bridge sends voicemap data to Max MSP via UDP/OSC

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import dgram from 'dgram';
import osc from 'osc';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// UDP/OSC Configuration for Max MSP
// =============================================

const MAX_MSP_PORT = 7474;  // Max MSP udpreceive port
const MAX_MSP_HOST = '127.0.0.1';

// Create UDP client for sending OSC to Max MSP
const udpClient = dgram.createSocket('udp4');

// Send OSC message to Max MSP
function sendOSC(address, args) {
  const oscMsg = osc.writePacket({
    address: address,
    args: args
  });
  udpClient.send(oscMsg, MAX_MSP_PORT, MAX_MSP_HOST);
}

// =============================================
// Express Server
// =============================================

// Serve static files from public/
app.use(express.static(join(__dirname, 'public')));

// Start HTTP server (capture reference for WebSocket upgrade)
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   FIBRIL - Dynamic Bayesian Network Harmonizer            ║
║   (Client-Side Processing + OSC Bridge)                   ║
║                                                           ║
║   Server running at http://localhost:${PORT}                 ║
║   OSC output to Max MSP at ${MAX_MSP_HOST}:${MAX_MSP_PORT}             ║
║                                                           ║
║   All state processing runs in your browser.              ║
║   Voicemap data sent via OSC to /voicemap                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// =============================================
// WebSocket Server for Browser-to-Server Bridge
// =============================================

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[OSC Bridge] WebSocket client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'voicemap') {
        const notes = msg.notes || [];

        // Send voicemap as OSC list of integers
        if (notes.length > 0) {
          sendOSC('/voicemap', notes.map(n => ({ type: 'i', value: n })));
        } else {
          // Send empty message when no notes
          sendOSC('/voicemap', []);
        }

        // Also send note count
        sendOSC('/voicemap/count', [{ type: 'i', value: notes.length }]);
      }
    } catch (e) {
      console.error('[OSC Bridge] Message parse error:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('[OSC Bridge] WebSocket client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[OSC Bridge] WebSocket error:', err.message);
  });
});

export default app;

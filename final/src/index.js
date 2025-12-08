// FIBRIL Main Runtime
// Core logic initialization and clock loop

import { State } from './core/state.js';
import { DBN } from './algorithm/dbn.js';
import { CLOCK_INTERVAL_MS, NUM_RANKS, RANK_BUTTONS } from './utils/constants.js';
import {
  logInfo,
  logDebug,
  setDebugLevel,
  DEBUG_LEVELS,
  setEnabledCategories
} from './utils/helpers/debug_log.js';
import { midiToNote } from './utils/helpers/midi.js';

const CATEGORY = 'Runtime';

// Global state and DBN instances
let state = null;
let dbn = null;
let clockInterval = null;
let isRunning = false;

// Simulated input state (for demo mode)
let simulatedInputs = {
  ranks: Array(NUM_RANKS).fill(null).map(() => Array(RANK_BUTTONS).fill(0)),
  keycenter: 60,
  sustain: false,
  rl_flip: false,
  drawbars: [24, 0, 0, 0, 0, 0, 0, 0, 96]
};

/**
 * Initialize the FIBRIL system
 */
export function initialize() {
  logInfo(CATEGORY, 'Initializing FIBRIL...');

  // Create state instance
  state = new State();
  state.init();

  // Run initial drawbars normalization
  state.drawbars.reinit(simulatedInputs.drawbars);

  // Create DBN instance
  dbn = new DBN();

  // Set up output callback
  dbn.setOutputCallback((voicemap) => {
    logInfo(CATEGORY, 'Voicemap output:', {
      notes: voicemap.map(n => `${n} (${midiToNote(n)})`),
      count: voicemap.length
    });

    // TODO: Send to tone.js for audio playback
    // TODO: Send to treemap.js for visualization
  });

  logInfo(CATEGORY, 'FIBRIL initialized successfully');

  return { state, dbn };
}

/**
 * Start the 12ms clock loop
 */
export function startClock() {
  if (isRunning) {
    logDebug(CATEGORY, 'Clock already running');
    return;
  }

  logInfo(CATEGORY, `Starting clock loop (${CLOCK_INTERVAL_MS}ms interval)`);
  isRunning = true;

  clockInterval = setInterval(() => {
    clockTick();
  }, CLOCK_INTERVAL_MS);
}

/**
 * Stop the clock loop
 */
export function stopClock() {
  if (!isRunning) {
    logDebug(CATEGORY, 'Clock not running');
    return;
  }

  logInfo(CATEGORY, 'Stopping clock loop');
  clearInterval(clockInterval);
  clockInterval = null;
  isRunning = false;
}

/**
 * Single clock tick - reads inputs and triggers algorithm if needed
 */
function clockTick() {
  if (!state || !dbn) return;

  // Read simulated/actual inputs
  state.setKeycenter(simulatedInputs.keycenter);
  state.setSustain(simulatedInputs.sustain);
  state.setRlFlip(simulatedInputs.rl_flip);

  // Update rank states
  state.updateRankStates(simulatedInputs.ranks);

  // Check if any rank changed and trigger algorithm
  if (dbn.shouldTrigger(state)) {
    logDebug(CATEGORY, 'Change detected, triggering algorithm');
    dbn.runAlgorithm(state);
  }
}

/**
 * Simulate a keypress on a rank button
 * @param {number} rankId - Rank ID (1-6)
 * @param {number} buttonIndex - Button index (0-3)
 */
export function simulateKeypress(rankId, buttonIndex) {
  if (rankId < 1 || rankId > NUM_RANKS) {
    throw new Error(`Invalid rank ID: ${rankId}`);
  }
  if (buttonIndex < 0 || buttonIndex >= RANK_BUTTONS) {
    throw new Error(`Invalid button index: ${buttonIndex}`);
  }

  const rankIndex = rankId - 1;

  // Toggle the button
  simulatedInputs.ranks[rankIndex][buttonIndex] =
    simulatedInputs.ranks[rankIndex][buttonIndex] === 0 ? 1 : 0;

  logDebug(CATEGORY, `Simulated keypress: Rank ${rankId}, Button ${buttonIndex}`, {
    newState: simulatedInputs.ranks[rankIndex]
  });
}

/**
 * Simulate pressing all buttons in a rank pattern
 * @param {number} rankId - Rank ID (1-6)
 * @param {number[]} pattern - Array of 4 binary values
 */
export function simulateRankPattern(rankId, pattern) {
  if (rankId < 1 || rankId > NUM_RANKS) {
    throw new Error(`Invalid rank ID: ${rankId}`);
  }
  if (!Array.isArray(pattern) || pattern.length !== RANK_BUTTONS) {
    throw new Error(`Pattern must be ${RANK_BUTTONS}-element array`);
  }

  simulatedInputs.ranks[rankId - 1] = [...pattern];

  logDebug(CATEGORY, `Simulated rank pattern: Rank ${rankId}`, {
    pattern
  });
}

/**
 * Simulate sustain pedal press/release
 * @param {boolean} pressed - True if pressed
 */
export function simulateSustain(pressed) {
  simulatedInputs.sustain = pressed;
  logDebug(CATEGORY, `Simulated sustain: ${pressed}`);
}

/**
 * Simulate keycenter change
 * @param {number} midiNote - New keycenter MIDI note
 */
export function simulateKeycenter(midiNote) {
  simulatedInputs.keycenter = midiNote;
  logDebug(CATEGORY, `Simulated keycenter: ${midiNote} (${midiToNote(midiNote)})`);
}

/**
 * Run automated demo sequence
 */
export async function runDemo() {
  logInfo(CATEGORY, '=== Starting FIBRIL Demo ===');

  // Initialize if not already done
  if (!state) {
    initialize();
  }

  // Set debug level for demo
  setDebugLevel(DEBUG_LEVELS.INFO);

  console.log('\n--- Demo: Initializing and starting clock ---');
  startClock();

  // Wait a bit for clock to stabilize
  await sleep(100);

  console.log('\n--- Demo: Pressing Rank 1, Button 0 (tonic, band 1) ---');
  simulateKeypress(1, 0);
  await sleep(500);

  console.log('\n--- Demo: Pressing Rank 1, Button 1 (tonic, bands 1-2) ---');
  simulateKeypress(1, 1);
  await sleep(500);

  console.log('\n--- Demo: Pressing Rank 3, Button 2 (mediant, band 3) ---');
  simulateKeypress(3, 2);
  await sleep(500);

  console.log('\n--- Demo: Pressing Rank 5, Button 0 (dominant, band 1) ---');
  simulateKeypress(5, 0);
  await sleep(500);

  console.log('\n--- Demo: Enabling sustain pedal ---');
  simulateSustain(true);
  await sleep(500);

  console.log('\n--- Demo: Changing keycenter to G (67) ---');
  simulateKeycenter(67);
  await sleep(500);

  console.log('\n--- Demo: Releasing Rank 1 buttons ---');
  simulateRankPattern(1, [0, 0, 0, 0]);
  await sleep(500);

  console.log('\n--- Demo: Releasing sustain ---');
  simulateSustain(false);
  await sleep(500);

  console.log('\n--- Demo: Final state ---');
  console.log('Voicemap:', dbn.getLastOutput().map(n => `${n} (${midiToNote(n)})`));
  console.log('State:', JSON.stringify(state.toJSON(), null, 2));

  console.log('\n--- Demo: Stopping clock ---');
  stopClock();

  logInfo(CATEGORY, '=== FIBRIL Demo Complete ===');

  return { state, dbn };
}

/**
 * Helper: Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current state (for external access)
 * @returns {object} Current state object
 */
export function getState() {
  return state;
}

/**
 * Get DBN instance (for external access)
 * @returns {object} DBN instance
 */
export function getDBN() {
  return dbn;
}

/**
 * Update simulated inputs directly
 * @param {object} inputs - Input updates
 */
export function updateInputs(inputs) {
  if (inputs.ranks) simulatedInputs.ranks = inputs.ranks;
  if (inputs.keycenter !== undefined) simulatedInputs.keycenter = inputs.keycenter;
  if (inputs.sustain !== undefined) simulatedInputs.sustain = inputs.sustain;
  if (inputs.rl_flip !== undefined) simulatedInputs.rl_flip = inputs.rl_flip;
  if (inputs.drawbars) {
    simulatedInputs.drawbars = inputs.drawbars;
    if (state && state.drawbars) {
      state.drawbars.reinit(inputs.drawbars);
    }
  }
}

// Export for direct node execution
export default {
  initialize,
  startClock,
  stopClock,
  simulateKeypress,
  simulateRankPattern,
  simulateSustain,
  simulateKeycenter,
  runDemo,
  getState,
  getDBN,
  updateInputs
};

// Run demo if executed directly
const isMainModule = process.argv[1]?.endsWith('index.js');
if (isMainModule) {
  runDemo().catch(console.error);
}

// Drawbars (Crawl) Heuristic
// Generates probability field based on crawl parameter and drawbar settings

import { createUniformVector, normalizeVector, createZeroVector } from './sum_matrix.js';
import {
  copyMatrix,
  normalizeMatrix,
  scaleMatrix,
  zeroOutNonKeyNotes,
  boostCell
} from './matrix_utils.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

const CATEGORY = 'DrawbarsHeuristic';

/**
 * Calculate crawl/drawbars probability MATRIX (128x128)
 * Implements the full Crawl heuristic per specification:
 * 1. Copy Prior
 * 2. Zero out rows/cols outside keycenter's major key
 * 3. Normalize
 * 4. For each cell (A,B): if abs(A - B) <= 4, add crawl_weight
 * 5. Normalize again
 * 6. Scale by crawl_weight
 *
 * @param {Float64Array[]} priorMatrix - The Prior 128x128 matrix
 * @param {object} state - System state
 * @param {number[]} currentNotes - Notes currently in voicemap.next
 * @param {object} rank - Target rank being processed
 * @returns {Float64Array[]} 128x128 probability matrix
 */
export function calculateCrawlMatrix(priorMatrix, state, currentNotes, rank) {
  const { crawl, keycenter } = state;

  logDebug(CATEGORY, 'calculateCrawlMatrix', {
    crawl,
    keycenter,
    rankId: rank?.id
  });

  // Step 1: Copy Prior Matrix
  const matrix = copyMatrix(priorMatrix);

  // Step 2: Zero out rows/cols for notes outside keycenter's major key
  zeroOutNonKeyNotes(matrix, keycenter);

  // Step 3: Normalize
  normalizeMatrix(matrix);

  // Step 4: Boost cells where abs(A - B) <= 4
  for (let row = 0; row < 128; row++) {
    for (let col = 0; col < 128; col++) {
      if (Math.abs(row - col) <= 4 && row !== col) {
        boostCell(matrix, row, col, crawl);
      }
    }
  }

  // Step 5: Normalize again
  normalizeMatrix(matrix);

  // Step 6: Scale by crawl_weight
  scaleMatrix(matrix, crawl);

  logDebug(CATEGORY, 'Crawl matrix computed');

  return matrix;
}

/**
 * Legacy vector-based crawl calculation (kept for compatibility)
 * @deprecated Use calculateCrawlMatrix instead
 */
export function calculateCrawl(state, currentNotes, rank) {
  const { crawl, drawbars } = state;

  logDebug(CATEGORY, 'calculateCrawl (legacy vector)', {
    crawl,
    highpass: drawbars?.highpass,
    lowpass: drawbars?.lowpass,
    rankId: rank?.id
  });

  // STUB: Create distribution based on highpass/lowpass range
  const vector = createZeroVector();

  if (!drawbars) {
    return createUniformVector();
  }

  const { highpass, lowpass } = drawbars;
  const range = lowpass - highpass;

  if (range <= 0) {
    return createUniformVector();
  }

  // Fill the valid range with uniform probability
  for (let midi = Math.floor(highpass); midi <= Math.ceil(lowpass); midi++) {
    if (midi >= 0 && midi < 128) {
      vector[midi] = 1;
    }
  }

  // Apply crawl influence: higher crawl = prefer notes closer to existing
  if (crawl > 0 && currentNotes && currentNotes.length > 0) {
    for (let midi = 0; midi < 128; midi++) {
      if (vector[midi] > 0) {
        // Find distance to nearest existing note
        let minDist = Infinity;
        for (const note of currentNotes) {
          const dist = Math.abs(midi - note);
          if (dist < minDist) minDist = dist;
        }

        // Weight by distance (closer = higher weight when crawl is high)
        // crawl of 0 = no preference
        // crawl of 0.67 = strong preference for nearby notes
        const distanceFactor = Math.max(1, minDist);
        const weight = 1 / (1 + crawl * distanceFactor * 0.1);
        vector[midi] *= weight;
      }
    }
  }

  return normalizeVector(vector);
}

/**
 * Determine how many notes should be sustained based on crawl
 * @param {number} crawl - Crawl value (0-0.67)
 * @param {number} totalNotes - Total notes in previous voicemap
 * @returns {number} Number of notes to sustain
 */
export function getSustainCount(crawl, totalNotes) {
  // Higher crawl = more notes sustained
  // crawl 0 = no notes sustained (complete change)
  // crawl 0.67 = most notes sustained (gradual change)
  const ratio = crawl / 0.67; // Normalize to 0-1
  return Math.floor(totalNotes * ratio);
}

/**
 * Determine which notes to sustain based on crawl heuristics
 * @param {number[]} prevNotes - Previous voicemap notes
 * @param {number} crawl - Crawl value
 * @param {number[]} priorities - Note priorities (higher = more likely to sustain)
 * @returns {number[]} Notes to sustain
 */
export function selectNotesToSustain(prevNotes, crawl, priorities = null) {
  if (!prevNotes || prevNotes.length === 0) {
    return [];
  }

  const sustainCount = getSustainCount(crawl, prevNotes.length);

  if (sustainCount === 0) {
    return [];
  }

  if (sustainCount >= prevNotes.length) {
    return [...prevNotes];
  }

  // If priorities provided, sustain highest priority notes
  if (priorities && priorities.length === prevNotes.length) {
    const indexed = prevNotes.map((note, i) => ({ note, priority: priorities[i] }));
    indexed.sort((a, b) => b.priority - a.priority);
    return indexed.slice(0, sustainCount).map(item => item.note);
  }

  // Default: sustain random selection
  const shuffled = [...prevNotes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, sustainCount);
}

export default {
  calculateCrawl,
  getSustainCount,
  selectNotesToSustain
};

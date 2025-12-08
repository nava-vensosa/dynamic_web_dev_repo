// Drawbars (Crawl) Heuristic
// Generates probability field based on crawl parameter and drawbar settings

import { createUniformVector, normalizeVector, createZeroVector } from './sum_matrix.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

const CATEGORY = 'DrawbarsHeuristic';

/**
 * Calculate crawl/drawbars probability vector
 * STUB: Returns distribution based on crawl parameter
 * Full implementation will use drawbar values for weighting
 *
 * @param {object} state - System state
 * @param {number[]} currentNotes - Notes currently in voicemap.next
 * @param {object} rank - Target rank being processed
 * @returns {number[]} Size-128 probability vector
 */
export function calculateCrawl(state, currentNotes, rank) {
  const { crawl, drawbars } = state;

  logDebug(CATEGORY, 'calculateCrawl (STUB)', {
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

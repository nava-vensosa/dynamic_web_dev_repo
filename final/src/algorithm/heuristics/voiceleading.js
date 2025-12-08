// Voice Leading Heuristic
// Generates probability field based on voice leading principles

import { createUniformVector, normalizeVector } from './sum_matrix.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

const CATEGORY = 'VoiceLeading';

/**
 * Calculate voice leading probability vector
 * STUB: Returns uniform distribution
 * Full implementation will use gci_prev/gci_next to favor smooth voice leading
 *
 * @param {object} state - System state
 * @param {number[]} currentNotes - Notes currently in voicemap.next
 * @param {object} rank - Target rank being processed
 * @returns {number[]} Size-128 probability vector
 */
export function calculateVoiceLeading(state, currentNotes, rank) {
  logDebug(CATEGORY, 'calculateVoiceLeading (STUB)', {
    vlWeight: state.vl,
    currentNotes,
    rankId: rank?.id,
    gci_prev: rank?.gci_prev,
    gci_next: rank?.gci_next
  });

  // STUB: Return uniform distribution
  // Full implementation will:
  // - Analyze gci_prev and gci_next to understand the voice leading direction
  // - Favor notes that are close to existing notes (smooth voice leading)
  // - Weight based on state.vl parameter
  // - Consider the rank's scale degree and tonicization

  const vector = createUniformVector();

  // Placeholder: slightly favor notes near current notes
  if (currentNotes && currentNotes.length > 0) {
    for (const note of currentNotes) {
      // Boost nearby notes (within a minor third)
      for (let offset = -3; offset <= 3; offset++) {
        const neighbor = note + offset;
        if (neighbor >= 0 && neighbor < 128) {
          // Weight by distance (closer = higher weight)
          const weight = 1 + (3 - Math.abs(offset)) * state.vl;
          vector[neighbor] *= weight;
        }
      }
    }

    return normalizeVector(vector);
  }

  return vector;
}

/**
 * Get voice leading distance between two notes
 * @param {number} from - Starting MIDI note
 * @param {number} to - Ending MIDI note
 * @returns {number} Absolute semitone distance
 */
export function getVoiceLeadingDistance(from, to) {
  return Math.abs(to - from);
}

/**
 * Score a potential note based on voice leading from existing notes
 * @param {number} candidate - Candidate MIDI note
 * @param {number[]} existing - Existing notes
 * @returns {number} Voice leading score (lower = better)
 */
export function scoreVoiceLeading(candidate, existing) {
  if (!existing || existing.length === 0) {
    return 0;
  }

  // Find minimum distance to any existing note
  let minDistance = Infinity;
  for (const note of existing) {
    const distance = getVoiceLeadingDistance(note, candidate);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

export default {
  calculateVoiceLeading,
  getVoiceLeadingDistance,
  scoreVoiceLeading
};

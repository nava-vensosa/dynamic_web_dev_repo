// Voice Leading Heuristic
// Generates probability field based on voice leading principles

import { createUniformVector, normalizeVector } from './sum_matrix.js';
import {
  copyMatrix,
  normalizeMatrix,
  scaleMatrix,
  boostCell
} from './matrix_utils.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

const CATEGORY = 'VoiceLeading';

/**
 * Calculate voice leading probability MATRIX (128x128)
 * Implements the full VL heuristic per specification:
 * 1. Copy Prior Matrix
 * 2. Calculate direction: delta = rank.gci_next - rank.gci_prev
 * 3. For each cell (A,B), boost if ALL conditions met:
 *    - A in rank.projected_series (projected_series[A] > 0)
 *    - B in voicemap.prev
 *    - abs(A - B) < 4
 *    - Direction matches (delta > 0 && A > B) OR (delta < 0 && A < B)
 * 4. Normalize
 * 5. Scale by vl_weight
 *
 * @param {Float64Array[]} priorMatrix - The Prior 128x128 matrix
 * @param {object} state - System state
 * @param {object} voicemap - Voicemap instance (has .prev and .next)
 * @param {object} rank - Target rank being processed
 * @returns {Float64Array[]} 128x128 probability matrix
 */
export function calculateVLMatrix(priorMatrix, state, voicemap, rank) {
  const { vl } = state;

  logDebug(CATEGORY, 'calculateVLMatrix', {
    vlWeight: vl,
    rankId: rank?.id,
    gci_prev: rank?.gci_prev,
    gci_next: rank?.gci_next,
    prevNotes: voicemap?.prev
  });

  // Step 1: Copy Prior Matrix
  const matrix = copyMatrix(priorMatrix);

  // Step 2: Calculate direction delta
  const delta = (rank?.gci_next || 0) - (rank?.gci_prev || 0);
  const biasUpward = delta > 0;
  const biasDownward = delta < 0;

  // Get the projected series (size-128 weighted vector)
  const projectedSeries = rank?.projected_series || [];

  // Get previous voicemap notes
  const prevNotes = voicemap?.prev || [];

  // Create a Set for faster lookup
  const prevNotesSet = new Set(prevNotes);

  // Step 3: For each cell (A,B), check conditions and boost if met
  for (let row = 0; row < 128; row++) {
    // Condition 1: A must be in projected_series
    const aInProjected = projectedSeries[row] > 0;
    if (!aInProjected) continue;

    for (let col = 0; col < 128; col++) {
      // Condition 2: B must be in voicemap.prev
      if (!prevNotesSet.has(col)) continue;

      // Condition 3: abs(A - B) < 4 (within 3 semitones)
      const distance = Math.abs(row - col);
      if (distance >= 4) continue;

      // Condition 4: Direction matches
      // If bias upward (delta > 0): A > B
      // If bias downward (delta < 0): A < B
      let directionMatches = false;
      if (biasUpward && row > col) {
        directionMatches = true;
      } else if (biasDownward && row < col) {
        directionMatches = true;
      } else if (!biasUpward && !biasDownward) {
        // No bias (delta == 0): boost both directions
        directionMatches = true;
      }

      if (directionMatches) {
        boostCell(matrix, row, col, vl);
      }
    }
  }

  // Step 4: Normalize
  normalizeMatrix(matrix);

  // Step 5: Scale by vl_weight
  scaleMatrix(matrix, vl);

  logDebug(CATEGORY, 'VL matrix computed', {
    delta,
    biasUpward,
    biasDownward
  });

  return matrix;
}

/**
 * Legacy vector-based voice leading calculation (kept for compatibility)
 * @deprecated Use calculateVLMatrix instead
 */
export function calculateVoiceLeading(state, currentNotes, rank) {
  logDebug(CATEGORY, 'calculateVoiceLeading (legacy vector)', {
    vlWeight: state.vl,
    currentNotes,
    rankId: rank?.id,
    gci_prev: rank?.gci_prev,
    gci_next: rank?.gci_next
  });

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

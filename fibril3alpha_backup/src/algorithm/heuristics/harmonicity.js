// Harmonicity Heuristic
// Generates probability field based on harmonic relationships

import { createUniformVector, normalizeVector } from './sum_matrix.js';
import {
  copyMatrix,
  normalizeMatrix,
  scaleMatrix,
  zeroOutNonKeyNotes,
  zeroOutDiagonal,
  boostCell
} from './matrix_utils.js';
import { logDebug } from '../../utils/helpers/debug_log.js';

const CATEGORY = 'Harmonicity';

// Consonance weights for intervals (semitones from root)
// Based on harmonic series and traditional music theory
const INTERVAL_CONSONANCE = {
  0: 1.0,   // Unison - perfect
  1: 0.2,   // Minor 2nd - dissonant
  2: 0.4,   // Major 2nd - mild dissonance
  3: 0.7,   // Minor 3rd - consonant
  4: 0.8,   // Major 3rd - consonant
  5: 0.9,   // Perfect 4th - consonant
  6: 0.3,   // Tritone - dissonant
  7: 1.0,   // Perfect 5th - perfect consonance
  8: 0.7,   // Minor 6th - consonant
  9: 0.8,   // Major 6th - consonant
  10: 0.4,  // Minor 7th - mild dissonance
  11: 0.3,  // Major 7th - dissonant
};

// Target intervals for harmonicity boost (perfect 4th and 5th)
const HARMONIC_INTERVALS = [5, 7];

/**
 * Calculate harmonicity probability MATRIX (128x128)
 * Implements the full Harmonicity heuristic per specification:
 * 1. Copy Prior Matrix
 * 2. Zero out rows/cols outside keycenter's major key
 * 3. Zero out diagonal (A == B)
 * 4. Normalize
 * 5. For each cell (A,B), for each k in voicemap.next:
 *    If abs(A - k) == 5 or 7 OR abs(B - k) == 5 or 7: add harmonicity_weight
 * 6. Normalize
 * 7. Scale by harmonicity_weight
 *
 * @param {Float64Array[]} priorMatrix - The Prior 128x128 matrix
 * @param {object} state - System state
 * @param {number[]} currentNotes - Notes currently in voicemap.next
 * @param {object} rank - Target rank being processed
 * @returns {Float64Array[]} 128x128 probability matrix
 */
export function calculateHarmonicityMatrix(priorMatrix, state, currentNotes, rank) {
  const { harmonicity, keycenter } = state;

  logDebug(CATEGORY, 'calculateHarmonicityMatrix', {
    harmonicityWeight: harmonicity,
    keycenter,
    currentNotes,
    rankId: rank?.id
  });

  // Step 1: Copy Prior Matrix
  const matrix = copyMatrix(priorMatrix);

  // Step 2: Zero out rows/cols outside keycenter's major key
  zeroOutNonKeyNotes(matrix, keycenter);

  // Step 3: Zero out diagonal (A == B)
  zeroOutDiagonal(matrix);

  // Step 4: Normalize
  normalizeMatrix(matrix);

  // Step 5: For each cell (A,B), check against all notes k in currentNotes (voicemap.next)
  // If abs(A - k) == 5 or 7 OR abs(B - k) == 5 or 7: boost
  if (currentNotes && currentNotes.length > 0) {
    for (let row = 0; row < 128; row++) {
      for (let col = 0; col < 128; col++) {
        // Skip if already zero (optimization)
        if (matrix[row][col] === 0) continue;

        let shouldBoost = false;

        for (const k of currentNotes) {
          const distA = Math.abs(row - k);
          const distB = Math.abs(col - k);

          // Check if A or B is a perfect 4th or 5th from k
          if (HARMONIC_INTERVALS.includes(distA) || HARMONIC_INTERVALS.includes(distB)) {
            shouldBoost = true;
            break;
          }
        }

        if (shouldBoost) {
          boostCell(matrix, row, col, harmonicity);
        }
      }
    }
  }

  // Step 6: Normalize
  normalizeMatrix(matrix);

  // Step 7: Scale by harmonicity_weight
  scaleMatrix(matrix, harmonicity);

  logDebug(CATEGORY, 'Harmonicity matrix computed');

  return matrix;
}

/**
 * Legacy vector-based harmonicity calculation (kept for compatibility)
 * @deprecated Use calculateHarmonicityMatrix instead
 */
export function calculateHarmonicity(state, currentNotes, rank) {
  logDebug(CATEGORY, 'calculateHarmonicity (legacy vector)', {
    harmonicityWeight: state.harmonicity,
    keycenter: state.keycenter,
    currentNotes,
    rankId: rank?.id
  });

  const vector = createUniformVector();

  // If no current notes, favor notes consonant with keycenter
  const referenceNotes = (currentNotes && currentNotes.length > 0)
    ? currentNotes
    : [state.keycenter];

  // Weight each MIDI note by its consonance with reference notes
  for (let midi = 0; midi < 128; midi++) {
    let totalConsonance = 0;

    for (const refNote of referenceNotes) {
      const interval = Math.abs(midi - refNote) % 12;
      const consonance = INTERVAL_CONSONANCE[interval] || 0.5;
      totalConsonance += consonance;
    }

    // Average consonance across reference notes
    const avgConsonance = totalConsonance / referenceNotes.length;

    // Apply harmonicity weight (higher weight = more influence)
    // When harmonicity is 0, all notes equal
    // When harmonicity is 1, consonance matters most
    const weight = 1 + (avgConsonance - 0.5) * state.harmonicity * 2;
    vector[midi] *= Math.max(0.01, weight);
  }

  return normalizeVector(vector);
}

/**
 * Get consonance score between two notes
 * @param {number} note1 - First MIDI note
 * @param {number} note2 - Second MIDI note
 * @returns {number} Consonance score (0-1)
 */
export function getConsonance(note1, note2) {
  const interval = Math.abs(note1 - note2) % 12;
  return INTERVAL_CONSONANCE[interval] || 0.5;
}

/**
 * Get the most consonant note with a set of existing notes
 * @param {number[]} candidates - Candidate MIDI notes
 * @param {number[]} existing - Existing notes to harmonize with
 * @returns {number|null} Most consonant candidate or null
 */
export function getMostConsonant(candidates, existing) {
  if (!candidates || candidates.length === 0) return null;
  if (!existing || existing.length === 0) return candidates[0];

  let bestNote = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    let totalConsonance = 0;
    for (const note of existing) {
      totalConsonance += getConsonance(candidate, note);
    }
    const avgScore = totalConsonance / existing.length;

    if (avgScore > bestScore) {
      bestScore = avgScore;
      bestNote = candidate;
    }
  }

  return bestNote;
}

export default {
  calculateHarmonicity,
  getConsonance,
  getMostConsonant
};

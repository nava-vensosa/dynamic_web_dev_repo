// Harmonicity Heuristic
// Generates probability field based on harmonic relationships

import { createUniformVector, normalizeVector } from './sum_matrix.js';
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

/**
 * Calculate harmonicity probability vector
 * STUB: Returns weighted distribution based on consonance
 * Full implementation will consider complex harmonic relationships
 *
 * @param {object} state - System state
 * @param {number[]} currentNotes - Notes currently in voicemap.next
 * @param {object} rank - Target rank being processed
 * @returns {number[]} Size-128 probability vector
 */
export function calculateHarmonicity(state, currentNotes, rank) {
  logDebug(CATEGORY, 'calculateHarmonicity (STUB)', {
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

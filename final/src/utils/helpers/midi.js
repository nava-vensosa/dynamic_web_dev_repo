// MIDI Helper Functions

import { MIDI_MIN, MIDI_MAX } from '../constants.js';

// Note names for conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Major scale intervals (semitones from root)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/**
 * Convert a note string (e.g., "C4", "F#5") to MIDI number
 * @param {string} note - Note string with octave
 * @returns {number} MIDI note number (0-127)
 */
export function noteToMidi(note) {
  const match = note.match(/^([A-G]#?)(-?\d+)$/i);
  if (!match) {
    throw new Error(`Invalid note format: ${note}`);
  }

  const noteName = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);

  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  // MIDI note 60 = C4 (middle C)
  // Formula: MIDI = (octave + 1) * 12 + noteIndex
  const midi = (octave + 1) * 12 + noteIndex;

  if (midi < MIDI_MIN || midi > MIDI_MAX) {
    throw new Error(`MIDI value ${midi} out of range (0-127)`);
  }

  return midi;
}

/**
 * Convert MIDI number to note string
 * @param {number} midi - MIDI note number (0-127)
 * @returns {string} Note string with octave (e.g., "C4")
 */
export function midiToNote(midi) {
  if (midi < MIDI_MIN || midi > MIDI_MAX) {
    throw new Error(`MIDI value ${midi} out of range (0-127)`);
  }

  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;

  return NOTE_NAMES[noteIndex] + octave;
}

/**
 * Get all MIDI notes in a major scale starting from root
 * Returns notes across the full MIDI range
 * @param {number} root - Root MIDI note number
 * @returns {number[]} Array of MIDI notes in the scale
 */
export function getMajorScaleNotes(root) {
  const notes = [];
  const rootPitchClass = root % 12;

  for (let midi = MIDI_MIN; midi <= MIDI_MAX; midi++) {
    const pitchClass = midi % 12;
    const intervalFromRoot = (pitchClass - rootPitchClass + 12) % 12;

    if (MAJOR_SCALE_INTERVALS.includes(intervalFromRoot)) {
      notes.push(midi);
    }
  }

  return notes;
}

/**
 * Check if a MIDI note is within a given range
 * @param {number} midi - MIDI note number
 * @param {number} low - Lower bound (inclusive)
 * @param {number} high - Upper bound (inclusive)
 * @returns {boolean} True if note is in range
 */
export function isInRange(midi, low, high) {
  return midi >= low && midi <= high;
}

/**
 * Get the pitch class (0-11) of a MIDI note
 * @param {number} midi - MIDI note number
 * @returns {number} Pitch class (0 = C, 1 = C#, etc.)
 */
export function getPitchClass(midi) {
  return midi % 12;
}

/**
 * Get the octave of a MIDI note
 * @param {number} midi - MIDI note number
 * @returns {number} Octave number
 */
export function getOctave(midi) {
  return Math.floor(midi / 12) - 1;
}

/**
 * Transpose a MIDI note by semitones
 * @param {number} midi - MIDI note number
 * @param {number} semitones - Number of semitones to transpose
 * @returns {number} Transposed MIDI note (clamped to valid range)
 */
export function transpose(midi, semitones) {
  const result = midi + semitones;
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, result));
}

/**
 * Create a size-128 vector (array) from an array of MIDI notes
 * Notes present in the input get value 1, others get 0
 * @param {number[]} notes - Array of MIDI note numbers
 * @returns {number[]} Size-128 binary vector
 */
export function notesToVector(notes) {
  const vector = new Array(128).fill(0);
  for (const note of notes) {
    if (note >= 0 && note < 128) {
      vector[note] = 1;
    }
  }
  return vector;
}

/**
 * Convert a size-128 vector back to an array of MIDI notes
 * @param {number[]} vector - Size-128 vector
 * @returns {number[]} Array of MIDI note numbers where vector[i] > 0
 */
export function vectorToNotes(vector) {
  const notes = [];
  for (let i = 0; i < vector.length; i++) {
    if (vector[i] > 0) {
      notes.push(i);
    }
  }
  return notes;
}

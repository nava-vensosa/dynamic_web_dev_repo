// FIBRIL Constants

// Scale degrees - 6 values (no leading tone)
export const SCALE_DEGREES = [
  'tonic',
  'supertonic',
  'mediant',
  'subdominant',
  'dominant',
  'submediant'
];

// Semitone offsets from root for each scale degree (in major scale)
export const SCALE_DEGREE_MAP = {
  tonic: 0,
  supertonic: 2,
  mediant: 4,
  subdominant: 5,
  dominant: 7,
  submediant: 9
};

// Default priority order for rank processing
export const DEFAULT_PRIORITY_ORDER = [3, 4, 5, 2, 1, 6];

// Clock interval in milliseconds
export const CLOCK_INTERVAL_MS = 12;

// MIDI range
export const MIDI_MIN = 0;
export const MIDI_MAX = 127;

// Drawbar input range (before normalization)
export const DRAWBAR_RANGE = {
  min: 0,
  max: 100
};

// Default drawbar state [highpass, d1-d7, lowpass]
export const DEFAULT_DRAWBAR_STATE = [24, 1, 0, 0, 0, 1, 0, 0, 96];

// Default keycenter (middle C)
export const DEFAULT_KEYCENTER = 60;

// Default heuristic weights
export const DEFAULT_CRAWL = 0.5;
export const DEFAULT_HARMONICITY = 0.5;
export const DEFAULT_VL = 0.5;

// Crawl max value
export const CRAWL_MAX = 0.67;

// Number of ranks
export const NUM_RANKS = 6;

// Rank button count (per rank)
export const RANK_BUTTONS = 4;

// Default rank colors (for UI visualization)
export const RANK_COLORS = [
  'rgba(255, 99, 132, 0.8)',   // Rank 1 - Red
  'rgba(255, 159, 64, 0.8)',   // Rank 2 - Orange
  'rgba(255, 205, 86, 0.8)',   // Rank 3 - Yellow
  'rgba(75, 192, 192, 0.8)',   // Rank 4 - Teal
  'rgba(54, 162, 235, 0.8)',   // Rank 5 - Blue
  'rgba(153, 102, 255, 0.8)'   // Rank 6 - Purple
];

// ===========================================
// Phase 2 Constants
// ===========================================

// Quota mapping: rank sum → note contribution
export const SUM_TO_QUOTA_MAP = {
  0: 0,
  1: 2,
  2: 3,
  3: 4,
  4: 5
};

// Major scale intervals (semitones from root) - used to build the scale
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Scale degree name to scale position (0-indexed)
export const SCALE_DEGREE_TO_POSITION = {
  tonic: 0,
  supertonic: 1,
  mediant: 2,
  subdominant: 3,
  dominant: 4,
  submediant: 5
};

// Keyboard mappings for UI
export const KEYBOARD_MAPS = {
  leftSide: [
    { keys: ['q', 'w', 'e', 'r'], rankId: 3 },  // Rank 3 - Mediant
    { keys: ['a', 's', 'd', 'f'], rankId: 1 },  // Rank 1 - Tonic
    { keys: ['z', 'x', 'c', 'v'], rankId: 6 }   // Rank 6 - Submediant
  ],
  rightSide: [
    { keys: ['i', 'o', 'p', '['], rankId: 5 },  // Rank 5 - Dominant
    { keys: ['j', 'k', 'l', ';'], rankId: 4 },  // Rank 4 - Subdominant
    { keys: ['n', 'm', ',', '.'], rankId: 2 }   // Rank 2 - Supertonic
  ],
  keyselector: [
    ['/', '*', '-'],       // Row 1: Db, Gb, B
    ['7', '8', '9'],       // Row 2: D, A, E
    ['4', '5', '6'],       // Row 3: F, C, G
    ['1', '2', '3']        // Row 4: Ab, Eb, Bb
  ],
  sustain: ' ',            // Spacebar
  rlFlip: 'Backspace'
};

// Keyselector key to MIDI note (all octave 4)
export const KEYSELECTOR_TO_MIDI = {
  '5': 60,  // C4 (middle C)
  '4': 65,  // F4
  '6': 67,  // G4
  '2': 63,  // Eb4
  '1': 56,  // Ab3
  '3': 70,  // Bb4
  '8': 69,  // A4
  '7': 62,  // D4
  '9': 64,  // E4
  '*': 66,  // Gb4
  '/': 61,  // Db4
  '-': 71   // B4
};

// Rank Class
// Represents one of the 6 harmonic agents

import {
  SCALE_DEGREES,
  RANK_COLORS,
  RANK_BUTTONS,
  MAJOR_SCALE_INTERVALS,
  SCALE_DEGREE_TO_POSITION
} from '../utils/constants.js';
import { binaryArrayToGreyCodeInt } from '../utils/helpers/grey_code.js';
import { logDebug, logStateChange } from '../utils/helpers/debug_log.js';

const CATEGORY = 'Rank';

// Right-side ranks (for RL flip logic)
const RIGHT_SIDE_RANKS = [2, 4, 5];

export class Rank {
  /**
   * Create a new Rank instance
   * @param {number} id - Rank ID (1-6)
   */
  constructor(id) {
    this.id = id;
    this.position = id; // Initially same as id
    this.scaledegree = SCALE_DEGREES[id - 1] || 'tonic';
    this.color = RANK_COLORS[id - 1] || 'rgba(0, 0, 0, 0)';

    // Local rl_flip flag for processing
    this.rl_flip = false;

    // State arrays (4 buttons per rank)
    this.state_prev = new Array(RANK_BUTTONS).fill(0);
    this.state_next = new Array(RANK_BUTTONS).fill(0);

    // Grey code indices
    this.gci_prev = 0;
    this.gci_next = 0;

    // Sum of active buttons
    this.sum_prev = 0;
    this.sum_next = 0;

    // Owned voices
    this.voices_owned_prev = [];
    this.voices_owned_next = [];

    // Change detection
    this.changed_flag = false;

    // Quota portion for this rank
    this.quota_portion = 0;

    // Projected series (potential MIDI notes)
    this.projected_series = [];
  }

  /**
   * Initialize the rank instance
   * @param {number} id - Rank ID (1-6)
   */
  init(id) {
    this.id = id;
    this.position = id;
    this.scaledegree = SCALE_DEGREES[id - 1] || 'tonic';
    this.color = RANK_COLORS[id - 1] || 'rgba(0, 0, 0, 0)';

    this.rl_flip = false;
    this.state_prev = new Array(RANK_BUTTONS).fill(0);
    this.state_next = new Array(RANK_BUTTONS).fill(0);
    this.gci_prev = 0;
    this.gci_next = 0;
    this.sum_prev = 0;
    this.sum_next = 0;
    this.voices_owned_prev = [];
    this.voices_owned_next = [];
    this.changed_flag = false;
    this.quota_portion = 0;
    this.projected_series = [];

    logDebug(CATEGORY, `Initialized Rank ${id}`, { scaledegree: this.scaledegree });
  }

  /**
   * Update state from UI input
   * @param {number[]} inputBytes - Array of 4 binary values
   * @param {boolean} globalRlFlip - Global RL flip state
   */
  state_update(inputBytes, globalRlFlip = false) {
    if (!Array.isArray(inputBytes) || inputBytes.length !== RANK_BUTTONS) {
      throw new Error(`Input must be a ${RANK_BUTTONS}-element array`);
    }

    // Store rl_flip state
    this.rl_flip = globalRlFlip;

    // Copy current next to prev
    this.state_prev = [...this.state_next];

    // Apply RL flip if global flip is on and this is a right-side rank
    if (globalRlFlip && RIGHT_SIDE_RANKS.includes(this.id)) {
      this.state_next = [...inputBytes].reverse();
    } else {
      this.state_next = [...inputBytes];
    }

    logStateChange(`${CATEGORY}_${this.id}`, 'state', this.state_prev, this.state_next);
  }

  /**
   * Calculate Grey Code index from state_next
   * @returns {number} Grey code integer (0-15)
   */
  get_gci() {
    this.gci_prev = this.gci_next;
    this.gci_next = binaryArrayToGreyCodeInt(this.state_next);

    if (this.gci_prev !== this.gci_next) {
      logStateChange(`${CATEGORY}_${this.id}`, 'gci', this.gci_prev, this.gci_next);
    }

    return this.gci_next;
  }

  /**
   * Calculate sum of active buttons in state_next
   * @returns {number} Sum (0-4)
   */
  get_sum() {
    this.sum_prev = this.sum_next;
    this.sum_next = this.state_next.reduce((acc, val) => acc + val, 0);

    if (this.sum_prev !== this.sum_next) {
      logStateChange(`${CATEGORY}_${this.id}`, 'sum', this.sum_prev, this.sum_next);
    }

    return this.sum_next;
  }

  /**
   * Check if state has changed
   * @returns {boolean} True if state changed
   */
  has_changed() {
    this.changed_flag = !this.arraysEqual(this.state_prev, this.state_next);
    return this.changed_flag;
  }

  /**
   * Helper: Check if two arrays are equal
   * @param {number[]} a - First array
   * @param {number[]} b - Second array
   * @returns {boolean} True if equal
   */
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Calculate active octave bands based on state_next
   * Each bit represents 25% of the highpass-lowpass range
   * @param {number} highpass - Lower MIDI bound
   * @param {number} lowpass - Upper MIDI bound
   * @returns {Array<{min: number, max: number}>} Array of active bands
   */
  get_bands(highpass, lowpass) {
    const range = lowpass - highpass;
    const bandSize = range / RANK_BUTTONS;
    const bands = [];

    for (let i = 0; i < RANK_BUTTONS; i++) {
      if (this.state_next[i] === 1) {
        const min = Math.floor(highpass + i * bandSize);
        const max = Math.floor(highpass + (i + 1) * bandSize);
        bands.push({ min, max });
      }
    }

    logDebug(`${CATEGORY}_${this.id}`, 'Calculated bands', { bands, highpass, lowpass });
    return bands;
  }

  /**
   * Generate projected series of MIDI notes as a size-128 weighted vector
   * Uses scale-aware logic: drawbars cycle through the major scale from rank position
   * @param {number} keycenter - Root MIDI note (e.g., 60 for C major)
   * @param {object} drawbars - Drawbars instance
   * @returns {number[]} Size-128 vector where index=MIDI and value=weight
   */
  get_projected_series(keycenter, drawbars) {
    // Create size-128 vector (all zeros)
    const vector = new Array(128).fill(0);

    // Get active bands from state_next
    const bands = this.get_bands(drawbars.highpass, drawbars.lowpass);

    // If no bands active, return empty vector
    if (bands.length === 0) {
      this.projected_series = vector;
      return vector;
    }

    // Build the major scale pitch classes from keycenter
    // e.g., C major (keycenter=60): pitch classes [0, 2, 4, 5, 7, 9, 11]
    const scalePitchClasses = MAJOR_SCALE_INTERVALS.map(
      interval => (keycenter + interval) % 12
    );

    // Get this rank's position in the scale (0-5)
    const rankPosition = SCALE_DEGREE_TO_POSITION[this.scaledegree];

    // Get drawbar values [d1, d2, d3, d4, d5, d6, d7]
    const drawbarValues = drawbars.getDrawbarValues();

    // For each active band, populate valid notes
    for (const band of bands) {
      // Iterate through MIDI notes in this band
      for (let midi = band.min; midi <= band.max; midi++) {
        const midiPitchClass = midi % 12;

        // Check each drawbar (d1-d7 = degrees 1-7 from rank root)
        for (let i = 0; i < 7; i++) {
          const weight = drawbarValues[i];
          if (weight <= 0) continue;

          // Calculate which scale degree this drawbar represents
          // relative to the rank's position in the scale
          // e.g., supertonic (pos 1) + d3 (index 2) = scale position 3 = F in C major
          const targetScalePosition = (rankPosition + i) % 7;
          const targetPitchClass = scalePitchClasses[targetScalePosition];

          // Check if this MIDI note matches
          if (midiPitchClass === targetPitchClass) {
            vector[midi] = Math.max(vector[midi], weight);
          }
        }
      }
    }

    this.projected_series = vector;

    // Log summary of non-zero entries
    const nonZeroEntries = vector
      .map((w, i) => w > 0 ? { midi: i, weight: w } : null)
      .filter(x => x !== null);

    logDebug(`${CATEGORY}_${this.id}`, 'get_projected_series', {
      keycenter,
      scaledegree: this.scaledegree,
      rankPosition,
      bands,
      noteCount: nonZeroEntries.length
    });

    return vector;
  }

  /**
   * Prepare for next algorithm run
   * Copy next values to prev, clear working arrays
   */
  prepareForNextRun() {
    this.state_prev = [...this.state_next];
    this.gci_prev = this.gci_next;
    this.sum_prev = this.sum_next;
    this.voices_owned_prev = [...this.voices_owned_next];
    this.voices_owned_next = [];
    this.changed_flag = false;
    this.quota_portion = 0;
    this.projected_series = [];
  }

  /**
   * Get current state for serialization/UI
   * @returns {object} Current state object
   */
  toJSON() {
    return {
      id: this.id,
      position: this.position,
      scaledegree: this.scaledegree,
      color: this.color,
      state_next: this.state_next,
      gci_next: this.gci_next,
      sum_next: this.sum_next,
      voices_owned_next: this.voices_owned_next,
      changed_flag: this.changed_flag,
      quota_portion: this.quota_portion
    };
  }
}

export default Rank;

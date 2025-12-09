// Drawbars Class
// Manages harmonic sliders and frequency cutoffs

import { DEFAULT_DRAWBAR_STATE, DRAWBAR_RANGE } from '../utils/constants.js';
import { logDebug, logStateChange } from '../utils/helpers/debug_log.js';

const CATEGORY = 'Drawbars';

export class Drawbars {
  constructor() {
    // UI values (raw input)
    this.state = [...DEFAULT_DRAWBAR_STATE];

    // Algorithm values (with normalized d1-d7)
    this.values = [...DEFAULT_DRAWBAR_STATE];

    // Derived properties
    this.highpass = this.values[0];
    this.lowpass = this.values[8];
    this.d1 = this.values[1];
    this.d2 = this.values[2];
    this.d3 = this.values[3];
    this.d4 = this.values[4];
    this.d5 = this.values[5];
    this.d6 = this.values[6];
    this.d7 = this.values[7];
  }

  /**
   * Initialize the drawbars instance
   */
  init() {
    this.state = [...DEFAULT_DRAWBAR_STATE];
    this.values = [...DEFAULT_DRAWBAR_STATE];
    this.normalise();
    logDebug(CATEGORY, 'Initialized', { state: this.state, values: this.values });
  }

  /**
   * Update state from new input and normalize
   * @param {number[]} newInputArray - Array of 9 values [highpass, d1-d7, lowpass]
   */
  reinit(newInputArray) {
    if (!Array.isArray(newInputArray) || newInputArray.length !== 9) {
      throw new Error('Drawbars input must be a 9-element array');
    }

    const oldState = [...this.state];
    this.state = [...newInputArray];

    logStateChange(CATEGORY, 'state', oldState, this.state);

    this.normalise();
  }

  /**
   * Normalize drawbar values
   * - Indices 1-7 (d1-d7): normalize from 0-100 to 0.0-1.0
   * - Indices 0 and 8 (highpass/lowpass): keep as MIDI note values
   */
  normalise() {
    // Copy state to values
    this.values = [...this.state];

    // Normalize d1-d7 (indices 1-7) from 0-100 to 0-1
    for (let i = 1; i <= 7; i++) {
      const raw = this.state[i];
      const clamped = Math.max(DRAWBAR_RANGE.min, Math.min(DRAWBAR_RANGE.max, raw));
      this.values[i] = clamped / DRAWBAR_RANGE.max;
    }

    // Update derived properties
    this.highpass = this.values[0];
    this.lowpass = this.values[8];
    this.d1 = this.values[1];
    this.d2 = this.values[2];
    this.d3 = this.values[3];
    this.d4 = this.values[4];
    this.d5 = this.values[5];
    this.d6 = this.values[6];
    this.d7 = this.values[7];

    logDebug(CATEGORY, 'Normalized', {
      highpass: this.highpass,
      lowpass: this.lowpass,
      d1_d7: [this.d1, this.d2, this.d3, this.d4, this.d5, this.d6, this.d7]
    });
  }

  /**
   * Get all normalized drawbar values (d1-d7) as an array
   * @returns {number[]} Array of 7 normalized values
   */
  getDrawbarValues() {
    return [this.d1, this.d2, this.d3, this.d4, this.d5, this.d6, this.d7];
  }

  /**
   * Get the current state for serialization/UI
   * @returns {object} Current state object
   */
  toJSON() {
    return {
      state: this.state,
      values: this.values,
      highpass: this.highpass,
      lowpass: this.lowpass,
      d1: this.d1,
      d2: this.d2,
      d3: this.d3,
      d4: this.d4,
      d5: this.d5,
      d6: this.d6,
      d7: this.d7
    };
  }
}

export default Drawbars;

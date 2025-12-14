// State Class
// Central store for system status

import { Voicemap } from './voicemap.js';
import { Drawbars } from './drawbars.js';
import { Rank } from './ranks.js';
import {
  DEFAULT_KEYCENTER,
  DEFAULT_CRAWL,
  DEFAULT_HARMONICITY,
  DEFAULT_VL,
  DEFAULT_PRIORITY_ORDER,
  NUM_RANKS,
  CRAWL_MAX
} from '../utils/constants.js';
import { logDebug, logInfo, logStateChange } from '../utils/helpers/debug_log.js';

const CATEGORY = 'State';

export class State {
  constructor() {
    // Key center (MIDI note, default middle C)
    this.keycenter = DEFAULT_KEYCENTER;

    // UI toggles
    this.rl_flip = false;
    this.sustain = false;

    // Heuristic weights
    this.crawl = DEFAULT_CRAWL;
    this.harmonicity = DEFAULT_HARMONICITY;
    this.vl = DEFAULT_VL;

    // Child instances (initialized in init())
    this.voicemap = null;
    this.drawbars = null;
    this.ranks = [];

    // Priority order for rank processing
    this.priority_order = [...DEFAULT_PRIORITY_ORDER];
  }

  /**
   * Initialize the state and all child instances
   */
  init() {
    logInfo(CATEGORY, 'Initializing State...');

    // Initialize voicemap
    this.voicemap = new Voicemap();
    this.voicemap.init();

    // Initialize drawbars
    this.drawbars = new Drawbars();
    this.drawbars.init();

    // Initialize 6 ranks
    this.ranks = [];
    for (let i = 1; i <= NUM_RANKS; i++) {
      const rank = new Rank(i);
      rank.init(i);
      this.ranks.push(rank);
    }

    // Run initial normalization
    this.drawbars.normalise();

    logInfo(CATEGORY, 'State initialized', {
      keycenter: this.keycenter,
      numRanks: this.ranks.length,
      priorityOrder: this.priority_order
    });
  }

  /**
   * Update keycenter
   * @param {number} midiNote - New keycenter MIDI note
   */
  setKeycenter(midiNote) {
    if (midiNote < 0 || midiNote > 127) {
      throw new Error('Keycenter must be a valid MIDI note (0-127)');
    }

    const old = this.keycenter;
    this.keycenter = midiNote;

    if (old !== midiNote) {
      logStateChange(CATEGORY, 'keycenter', old, midiNote);
    }
  }

  /**
   * Toggle RL flip
   * @param {boolean} value - New RL flip state
   */
  setRlFlip(value) {
    const old = this.rl_flip;
    this.rl_flip = !!value;

    if (old !== this.rl_flip) {
      logStateChange(CATEGORY, 'rl_flip', old, this.rl_flip);
    }
  }

  /**
   * Set sustain pedal state
   * @param {boolean} value - Sustain state
   */
  setSustain(value) {
    const old = this.sustain;
    this.sustain = !!value;

    if (old !== this.sustain) {
      logStateChange(CATEGORY, 'sustain', old, this.sustain);
    }
  }

  /**
   * Set crawl value
   * @param {number} value - Crawl value (0 to CRAWL_MAX)
   */
  setCrawl(value) {
    const old = this.crawl;
    this.crawl = Math.max(0, Math.min(CRAWL_MAX, value));

    if (old !== this.crawl) {
      logStateChange(CATEGORY, 'crawl', old, this.crawl);
    }
  }

  /**
   * Set harmonicity value
   * @param {number} value - Harmonicity value (0-1)
   */
  setHarmonicity(value) {
    const old = this.harmonicity;
    this.harmonicity = Math.max(0, Math.min(1, value));

    if (old !== this.harmonicity) {
      logStateChange(CATEGORY, 'harmonicity', old, this.harmonicity);
    }
  }

  /**
   * Set voice leading weight
   * @param {number} value - VL value (0-1)
   */
  setVl(value) {
    const old = this.vl;
    this.vl = Math.max(0, Math.min(1, value));

    if (old !== this.vl) {
      logStateChange(CATEGORY, 'vl', old, this.vl);
    }
  }

  /**
   * Get a rank by ID
   * @param {number} id - Rank ID (1-6)
   * @returns {Rank|null} Rank instance or null
   */
  getRank(id) {
    return this.ranks.find(r => r.id === id) || null;
  }

  /**
   * Update all ranks with new input states
   * @param {Array<number[]>} rankInputs - Array of 6 arrays of 4 binary values
   */
  updateRankStates(rankInputs) {
    if (!Array.isArray(rankInputs) || rankInputs.length !== NUM_RANKS) {
      throw new Error(`Expected ${NUM_RANKS} rank inputs`);
    }

    for (let i = 0; i < NUM_RANKS; i++) {
      this.ranks[i].state_update(rankInputs[i], this.rl_flip);
      this.ranks[i].get_gci();
      this.ranks[i].get_sum();
      this.ranks[i].has_changed();
    }
  }

  /**
   * Check if any rank has changed
   * @returns {boolean} True if any rank changed
   */
  anyRankChanged() {
    return this.ranks.some(rank => rank.changed_flag);
  }

  /**
   * Get all changed ranks
   * @returns {Rank[]} Array of changed ranks
   */
  getChangedRanks() {
    return this.ranks.filter(rank => rank.changed_flag);
  }

  /**
   * Prepare all ranks for next algorithm run
   */
  prepareRanksForNextRun() {
    for (const rank of this.ranks) {
      rank.prepareForNextRun();
    }
  }

  /**
   * Get current state for serialization/UI
   * @returns {object} Current state object
   */
  toJSON() {
    return {
      keycenter: this.keycenter,
      rl_flip: this.rl_flip,
      sustain: this.sustain,
      crawl: this.crawl,
      harmonicity: this.harmonicity,
      vl: this.vl,
      priority_order: this.priority_order,
      voicemap: this.voicemap?.toJSON(),
      drawbars: this.drawbars?.toJSON(),
      ranks: this.ranks.map(r => r.toJSON())
    };
  }
}

export default State;

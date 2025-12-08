// Voicemap Class
// Manages the transition of MIDI notes between states

import { SUM_TO_QUOTA_MAP } from '../utils/constants.js';
import { logDebug, logStateChange } from '../utils/helpers/debug_log.js';

const CATEGORY = 'Voicemap';

export class Voicemap {
  constructor() {
    // Previous voicing (MIDI notes from last state)
    this.prev = [];

    // Next voicing (being built by algorithm)
    this.next = [];

    // Quota: number of algorithm loops remaining
    this.quota = 0;

    // Queue of rank IDs to process
    this.quota_queue = [];
  }

  /**
   * Initialize the voicemap instance
   */
  init() {
    this.prev = [];
    this.next = [];
    this.quota = 0;
    this.quota_queue = [];

    logDebug(CATEGORY, 'Initialized');
  }

  /**
   * Determine which notes to free/sustain from prev
   * STUB: Full implementation deferred
   * @param {object} state - System state object
   * @returns {number[]} Notes sustained in next
   */
  free(state) {
    // STUB implementation
    // Full implementation will:
    // - Check state.crawl to determine sustain ratio
    // - Check state.sustain (pedal) for full sustain
    // - Check which ranks have changed
    // - Determine which notes from prev should carry over to next

    const { crawl, sustain } = state;

    logDebug(CATEGORY, 'free() called (STUB)', { crawl, sustain, prevNotes: this.prev });

    // For now, if sustain is on, keep all notes
    // Otherwise, clear (no notes sustained)
    if (sustain) {
      this.next = [...this.prev];
    } else {
      // Stub: sustain based on crawl value (higher crawl = more sustained)
      // This is a placeholder - real logic will be more complex
      this.next = [];
    }

    logDebug(CATEGORY, 'free() result', { sustained: this.next });
    return this.next;
  }

  /**
   * Calculate quota and quota_queue based on ranks and priority order
   * Uses SUM_TO_QUOTA_MAP: sum 1→2 notes, sum 2→3, sum 3→4, sum 4→5
   * @param {Rank[]} ranks - Array of rank instances
   * @param {number} crawl - Crawl value (0-0.67) - reserved for future use
   * @param {number[]} priorityOrder - Order of rank processing
   * @returns {number} Total quota
   */
  get_quota(ranks, crawl, priorityOrder) {
    logDebug(CATEGORY, 'get_quota() called', {
      crawl,
      priorityOrder,
      numRanks: ranks.length
    });

    // Reset quota
    this.quota = 0;
    this.quota_queue = [];

    // Calculate quota using SUM_TO_QUOTA_MAP
    // sum 1 → 2 notes, sum 2 → 3 notes, sum 3 → 4 notes, sum 4 → 5 notes
    for (const rankId of priorityOrder) {
      const rank = ranks.find(r => r.id === rankId);
      if (!rank || rank.sum_next === 0) continue;

      // Map sum to quota portion using the constant
      const portion = SUM_TO_QUOTA_MAP[rank.sum_next] || 0;
      rank.quota_portion = portion;
      this.quota += portion;

      // Add rank to queue for each note it owns
      for (let i = 0; i < portion; i++) {
        this.quota_queue.push(rankId);
      }
    }

    logDebug(CATEGORY, 'get_quota() result', {
      quota: this.quota,
      queue: this.quota_queue
    });

    return this.quota;
  }

  /**
   * Add a note to the next voicemap
   * @param {number} midiNote - MIDI note to add
   * @returns {boolean} True if added successfully
   */
  addNote(midiNote) {
    if (midiNote < 0 || midiNote > 127) {
      return false;
    }

    // Avoid duplicates
    if (!this.next.includes(midiNote)) {
      this.next.push(midiNote);
      logDebug(CATEGORY, 'Added note', { midiNote, next: this.next });
      return true;
    }

    return false;
  }

  /**
   * Process one step of the quota queue
   * @returns {number|null} Rank ID processed, or null if queue empty
   */
  processQueueStep() {
    if (this.quota_queue.length === 0 || this.quota <= 0) {
      return null;
    }

    const rankId = this.quota_queue.shift();
    this.quota--;

    logDebug(CATEGORY, 'Processed queue step', {
      rankId,
      remainingQuota: this.quota,
      remainingQueue: this.quota_queue
    });

    return rankId;
  }

  /**
   * Cleanup after algorithm completes
   * Move next to prev, clear working state
   */
  cleanup() {
    logStateChange(CATEGORY, 'prev', this.prev, this.next);

    this.prev = [...this.next];
    this.next = [];
    this.quota = 0;
    this.quota_queue = [];

    logDebug(CATEGORY, 'Cleanup complete', { prev: this.prev });
  }

  /**
   * Check if algorithm should continue looping
   * @returns {boolean} True if more processing needed
   */
  hasMoreQuota() {
    return this.quota > 0 && this.quota_queue.length > 0;
  }

  /**
   * Get current state for serialization/UI
   * @returns {object} Current state object
   */
  toJSON() {
    return {
      prev: this.prev,
      next: this.next,
      quota: this.quota,
      quota_queue: this.quota_queue
    };
  }
}

export default Voicemap;

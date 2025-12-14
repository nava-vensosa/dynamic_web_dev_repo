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
   * Determine which notes to free/sustain from prev based on crawl
   * Implements the pre-DBN Crawl Sustain logic per specification:
   * 1. Calculate sustain_count = floor(crawl * voicemap.prev.length)
   * 2. Find notes in prev that exist in active ranks' projected_series
   * 3. Move first N valid notes to next
   *
   * @param {object} state - System state object
   * @returns {number[]} Notes sustained in next
   */
  free(state) {
    const { crawl, sustain, ranks } = state;

    logDebug(CATEGORY, 'free() called', { crawl, sustain, prevNotes: this.prev });

    // If sustain pedal is held, keep all notes regardless of crawl
    if (sustain) {
      this.next = [...this.prev];
      logDebug(CATEGORY, 'Sustain pedal held - keeping all notes', { sustained: this.next });
      return this.next;
    }

    // If no previous notes, nothing to sustain
    if (this.prev.length === 0) {
      this.next = [];
      logDebug(CATEGORY, 'No previous notes to sustain');
      return this.next;
    }

    // Calculate how many notes to sustain based on crawl
    // crawl ranges from 0 to 0.67
    // sustain_count = floor(crawl * prev.length)
    const sustainCount = Math.floor(crawl * this.prev.length);

    logDebug(CATEGORY, 'Sustain count calculation', {
      crawl,
      prevLength: this.prev.length,
      sustainCount
    });

    // If crawl is 0 or sustainCount is 0, don't sustain anything
    if (sustainCount === 0) {
      this.next = [];
      logDebug(CATEGORY, 'Crawl too low - no notes sustained');
      return this.next;
    }

    // Build a set of valid notes from all active (changed) ranks' projected_series
    const validNotesSet = new Set();
    for (const rank of ranks) {
      // Only consider ranks that have active buttons (sum_next > 0)
      if (rank.sum_next > 0 && rank.projected_series) {
        // projected_series is a size-128 vector where value > 0 means the note is valid
        for (let midi = 0; midi < 128; midi++) {
          if (rank.projected_series[midi] > 0) {
            validNotesSet.add(midi);
          }
        }
      }
    }

    logDebug(CATEGORY, 'Valid notes from active ranks', {
      validNotesCount: validNotesSet.size
    });

    // Find notes from prev that are valid to sustain
    const validPrevNotes = this.prev.filter(note => validNotesSet.has(note));

    logDebug(CATEGORY, 'Valid prev notes', {
      validPrevNotes,
      validCount: validPrevNotes.length
    });

    // Take the first sustainCount valid notes
    // (You could also randomize or prioritize by other criteria)
    this.next = validPrevNotes.slice(0, sustainCount);

    logDebug(CATEGORY, 'free() result', {
      sustained: this.next,
      sustainedCount: this.next.length,
      requestedCount: sustainCount
    });

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

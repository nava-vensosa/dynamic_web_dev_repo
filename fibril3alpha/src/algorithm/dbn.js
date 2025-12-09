// Dynamic Bayesian Network Orchestrator
// Main algorithm entry point

import { calculateVoiceLeading, calculateVLMatrix } from './heuristics/voiceleading.js';
import { calculateHarmonicity, calculateHarmonicityMatrix } from './heuristics/harmonicity.js';
import { calculateCrawl, calculateCrawlMatrix } from './heuristics/drawbars_heuristic.js';
import {
  multiplyVectors,
  applyMask,
  sampleFromDistribution,
  createZeroVector,
  computeSumMatrix,
  sumMatrixToVector,
  normalizeVector
} from './heuristics/sum_matrix.js';
import { createPriorMatrix, copyMatrix } from './heuristics/matrix_utils.js';
import { notesToVector } from '../utils/helpers/midi.js';
import { logInfo, logDebug, logStateChange } from '../utils/helpers/debug_log.js';

const CATEGORY = 'DBN';

export class DBN {
  constructor() {
    // Store last output for external access (tone.js, treemap.js)
    this.lastOutput = [];

    // Callbacks for output
    this.onOutput = null;

    // The Prior Matrix (128x128) - persists between algorithm runs
    // Initialized on first algorithm run
    this.priorMatrix = null;

    // Store the last Sum Matrix for visualization (treemap)
    this.lastSumMatrix = null;

    // Callback for Sum Matrix visualization
    this.onSumMatrix = null;
  }

  /**
   * Set callback for voicemap output
   * @param {function} callback - Called with voicemap array when algorithm completes
   */
  setOutputCallback(callback) {
    this.onOutput = callback;
  }

  /**
   * Set callback for Sum Matrix visualization
   * @param {function} callback - Called with Sum Matrix each DBN loop iteration
   */
  setSumMatrixCallback(callback) {
    this.onSumMatrix = callback;
  }

  /**
   * Run the DBN algorithm using 128x128 matrix operations
   * @param {object} state - System state object
   * @returns {number[]} Final voicemap (MIDI notes)
   */
  runAlgorithm(state) {
    logInfo(CATEGORY, 'Algorithm triggered');

    const { voicemap, ranks, drawbars, priority_order, crawl } = state;

    // Initialize Prior Matrix on first run
    if (!this.priorMatrix) {
      logInfo(CATEGORY, 'Initializing Prior Matrix (first run)');
      this.priorMatrix = createPriorMatrix();
    }

    // Step 1: Calculate quota and build queue
    voicemap.get_quota(ranks, crawl, priority_order);
    logDebug(CATEGORY, 'Quota calculated', {
      quota: voicemap.quota,
      queue: voicemap.quota_queue
    });

    // Early return: if no active buttons and no sustain, output silence
    if (voicemap.quota === 0 && !state.sustain) {
      voicemap.next = [];
      this.lastOutput = [];

      logInfo(CATEGORY, 'No active buttons, outputting silence');

      if (this.onOutput) {
        this.onOutput(this.lastOutput);
      }

      voicemap.cleanup();
      state.prepareRanksForNextRun();
      return this.lastOutput;
    }

    // Step 2: Free/sustain notes from previous voicemap
    voicemap.free(state);
    logDebug(CATEGORY, 'Free/sustain complete', {
      sustained: voicemap.next
    });

    // Step 3: Generate projected series for all ranks
    for (const rank of ranks) {
      rank.get_projected_series(state.keycenter, drawbars);
    }

    // Track last Sum Matrix for Prior update
    let lastSumMatrix = null;

    // Step 4: Main loop - process quota queue
    let iteration = 0;
    while (voicemap.hasMoreQuota()) {
      iteration++;
      logDebug(CATEGORY, `Loop iteration ${iteration}`, {
        quota: voicemap.quota,
        queueLength: voicemap.quota_queue.length
      });

      // Get target rank from queue
      const rankId = voicemap.processQueueStep();
      if (rankId === null) break;

      const targetRank = state.getRank(rankId);
      if (!targetRank) {
        logDebug(CATEGORY, `Rank ${rankId} not found, skipping`);
        continue;
      }

      // Step A: Calculate heuristic probability MATRICES (128x128)
      const crawlMatrix = calculateCrawlMatrix(this.priorMatrix, state, voicemap.next, targetRank);
      const vlMatrix = calculateVLMatrix(this.priorMatrix, state, voicemap, targetRank);
      const harmonicityMatrix = calculateHarmonicityMatrix(this.priorMatrix, state, voicemap.next, targetRank);

      // Step B: Compute Sum Matrix (weighted sum of the three, normalized)
      const sumMatrix = computeSumMatrix(crawlMatrix, vlMatrix, harmonicityMatrix);
      lastSumMatrix = sumMatrix;
      this.lastSumMatrix = sumMatrix;

      // Call Sum Matrix visualization callback (for treemap)
      if (this.onSumMatrix) {
        this.onSumMatrix(sumMatrix, iteration, targetRank.id);
      }

      // Step C: Get projection vector from rank's projected_series
      let projectionVector;
      if (targetRank.projected_series && targetRank.projected_series.some(v => v > 0)) {
        projectionVector = targetRank.projected_series;
      } else {
        // Fallback to range mask if no projected series
        projectionVector = this.createRangeMask(drawbars.highpass, drawbars.lowpass);
      }

      // Step D: Multiply Sum Matrix by projection vector to get probability vector
      const probabilityVector = sumMatrixToVector(sumMatrix, projectionVector);

      // Sample with duplicate detection
      // Sustain ON: allow duplicates after 1 resample; Sustain OFF: after 3
      const MAX_RESAMPLE_ATTEMPTS = state.sustain ? 1 : 3;
      let selectedNote = sampleFromDistribution(Array.from(probabilityVector));
      let resampleCount = 0;

      while (voicemap.next.includes(selectedNote) && resampleCount < MAX_RESAMPLE_ATTEMPTS) {
        resampleCount++;
        logDebug(CATEGORY, `Duplicate detected (${selectedNote}), resampling attempt ${resampleCount}`);
        selectedNote = sampleFromDistribution(Array.from(probabilityVector));
      }

      if (resampleCount === MAX_RESAMPLE_ATTEMPTS && voicemap.next.includes(selectedNote)) {
        logDebug(CATEGORY, `Allowing duplicate after ${MAX_RESAMPLE_ATTEMPTS} resample attempts`, {
          note: selectedNote
        });
      }

      // Step E: Update voicemap and rank ownership
      voicemap.addNote(selectedNote);
      targetRank.voices_owned_next.push(selectedNote);

      logDebug(CATEGORY, `Selected note for Rank ${rankId}`, {
        note: selectedNote,
        rankVoices: targetRank.voices_owned_next,
        resampleAttempts: resampleCount
      });
    }

    // Step 5: Update Prior Matrix with last Sum Matrix
    // (This makes the system "learn" from the current run)
    if (lastSumMatrix) {
      this.priorMatrix = copyMatrix(lastSumMatrix);
      logDebug(CATEGORY, 'Prior Matrix updated from Sum Matrix');
    }

    // Step 6: Finalize
    this.lastOutput = [...voicemap.next];

    logInfo(CATEGORY, 'Algorithm complete', {
      finalVoicemap: this.lastOutput,
      noteCount: this.lastOutput.length
    });

    // Call output callback (for tone.js / treemap.js integration)
    if (this.onOutput) {
      this.onOutput(this.lastOutput);
    }

    // Cleanup for next run
    voicemap.cleanup();
    state.prepareRanksForNextRun();

    return this.lastOutput;
  }

  /**
   * Create a binary mask for a MIDI range
   * @param {number} low - Lower bound (inclusive)
   * @param {number} high - Upper bound (inclusive)
   * @returns {number[]} Size-128 binary mask
   */
  createRangeMask(low, high) {
    const mask = createZeroVector();

    for (let i = Math.floor(low); i <= Math.ceil(high); i++) {
      if (i >= 0 && i < 128) {
        mask[i] = 1;
      }
    }

    return mask;
  }

  /**
   * Check if the algorithm should be triggered
   * @param {object} state - System state
   * @returns {boolean} True if algorithm should run
   */
  shouldTrigger(state) {
    return state.anyRankChanged();
  }

  /**
   * Get the last algorithm output
   * @returns {number[]} Last voicemap output
   */
  getLastOutput() {
    return this.lastOutput;
  }

  /**
   * Get the Prior Matrix
   * @returns {Float64Array[]|null} The 128x128 Prior Matrix or null if not initialized
   */
  getPriorMatrix() {
    return this.priorMatrix;
  }

  /**
   * Get the last Sum Matrix (for visualization)
   * @returns {Float64Array[]|null} The last computed Sum Matrix or null
   */
  getLastSumMatrix() {
    return this.lastSumMatrix;
  }

  /**
   * Reset the Prior Matrix (re-initialize to uniform)
   * Useful when changing keycenter or for testing
   */
  resetPriorMatrix() {
    this.priorMatrix = createPriorMatrix();
    logInfo(CATEGORY, 'Prior Matrix reset to uniform');
  }
}

export default DBN;

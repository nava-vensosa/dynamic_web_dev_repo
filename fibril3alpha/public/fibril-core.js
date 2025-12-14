// FIBRIL Core - Client-Side Bundle
// All state processing runs locally in the browser

// =============================================
// CONSTANTS
// =============================================

const SCALE_DEGREES = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant'];

const SCALE_DEGREE_MAP = {
  tonic: 0, supertonic: 2, mediant: 4, subdominant: 5, dominant: 7, submediant: 9
};

const DEFAULT_PRIORITY_ORDER = [3, 4, 5, 2, 1, 6];
const CLOCK_INTERVAL_MS = 12;
const MIDI_MIN = 0;
const MIDI_MAX = 127;
const DRAWBAR_RANGE = { min: 0, max: 100 };
const DEFAULT_DRAWBAR_STATE = [24, 1, 0, 0, 0, 1, 0, 0, 96];
const DEFAULT_KEYCENTER = 60;
const DEFAULT_CRAWL = 0.5;
const DEFAULT_HARMONICITY = 0.5;
const DEFAULT_VL = 0.5;
const CRAWL_MAX = 0.67;
const NUM_RANKS = 6;
const RANK_BUTTONS = 4;

const RANK_COLORS = [
  'rgba(255, 99, 132, 0.8)', 'rgba(255, 159, 64, 0.8)', 'rgba(255, 205, 86, 0.8)',
  'rgba(75, 192, 192, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(153, 102, 255, 0.8)'
];

const SUM_TO_QUOTA_MAP = { 0: 0, 1: 2, 2: 3, 3: 4, 4: 5 };
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const SCALE_DEGREE_TO_POSITION = {
  tonic: 0, supertonic: 1, mediant: 2, subdominant: 3, dominant: 4, submediant: 5
};

const RIGHT_SIDE_RANKS = [2, 4, 5];
const VECTOR_SIZE = 128;

// =============================================
// GREY CODE HELPERS
// =============================================

function binaryArrayToGreyCodeInt(arr) {
  if (!Array.isArray(arr) || arr.length !== 4) {
    throw new Error('Input must be a 4-element array');
  }
  const binary = (arr[0] << 3) | (arr[1] << 2) | (arr[2] << 1) | arr[3];
  return binary ^ (binary >> 1);
}

// =============================================
// SUM MATRIX UTILITIES
// =============================================

function createUniformVector() {
  const value = 1 / VECTOR_SIZE;
  return new Array(VECTOR_SIZE).fill(value);
}

function createZeroVector() {
  return new Array(VECTOR_SIZE).fill(0);
}

function normalizeVector(vector) {
  const sum = vector.reduce((acc, val) => acc + val, 0);
  if (sum === 0) return createUniformVector();
  return vector.map(val => val / sum);
}

function multiplyVectors(vectors) {
  if (vectors.length === 0) return createUniformVector();
  if (vectors.length === 1) return normalizeVector(vectors[0]);

  const result = new Array(VECTOR_SIZE).fill(1);
  for (const vector of vectors) {
    for (let i = 0; i < VECTOR_SIZE; i++) {
      result[i] *= vector[i];
    }
  }
  return normalizeVector(result);
}

function applyMask(probVector, mask) {
  const result = new Array(VECTOR_SIZE).fill(0);
  for (let i = 0; i < VECTOR_SIZE; i++) {
    result[i] = probVector[i] * mask[i];
  }
  return normalizeVector(result);
}

function sampleFromDistribution(probVector) {
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probVector.length; i++) {
    cumulative += probVector[i];
    if (random <= cumulative) return i;
  }
  return VECTOR_SIZE - 1;
}

// =============================================
// HEURISTICS
// =============================================

const INTERVAL_CONSONANCE = {
  0: 1.0, 1: 0.2, 2: 0.4, 3: 0.7, 4: 0.8, 5: 0.9,
  6: 0.3, 7: 1.0, 8: 0.7, 9: 0.8, 10: 0.4, 11: 0.3
};

function calculateVoiceLeading(state, currentNotes, rank) {
  const vector = createUniformVector();
  if (currentNotes && currentNotes.length > 0) {
    for (const note of currentNotes) {
      for (let offset = -3; offset <= 3; offset++) {
        const neighbor = note + offset;
        if (neighbor >= 0 && neighbor < 128) {
          const weight = 1 + (3 - Math.abs(offset)) * state.vl;
          vector[neighbor] *= weight;
        }
      }
    }
    return normalizeVector(vector);
  }
  return vector;
}

function calculateHarmonicity(state, currentNotes, rank) {
  const vector = createUniformVector();
  const referenceNotes = (currentNotes && currentNotes.length > 0)
    ? currentNotes : [state.keycenter];

  for (let midi = 0; midi < 128; midi++) {
    let totalConsonance = 0;
    for (const refNote of referenceNotes) {
      const interval = Math.abs(midi - refNote) % 12;
      totalConsonance += INTERVAL_CONSONANCE[interval] || 0.5;
    }
    const avgConsonance = totalConsonance / referenceNotes.length;
    const weight = 1 + (avgConsonance - 0.5) * state.harmonicity * 2;
    vector[midi] *= Math.max(0.01, weight);
  }
  return normalizeVector(vector);
}

function calculateCrawl(state, currentNotes, rank) {
  const { crawl, drawbars } = state;
  const vector = createZeroVector();

  if (!drawbars) return createUniformVector();

  const { highpass, lowpass } = drawbars;
  const range = lowpass - highpass;
  if (range <= 0) return createUniformVector();

  for (let midi = Math.floor(highpass); midi <= Math.ceil(lowpass); midi++) {
    if (midi >= 0 && midi < 128) vector[midi] = 1;
  }

  if (crawl > 0 && currentNotes && currentNotes.length > 0) {
    for (let midi = 0; midi < 128; midi++) {
      if (vector[midi] > 0) {
        let minDist = Infinity;
        for (const note of currentNotes) {
          const dist = Math.abs(midi - note);
          if (dist < minDist) minDist = dist;
        }
        const distanceFactor = Math.max(1, minDist);
        const weight = 1 / (1 + crawl * distanceFactor * 0.1);
        vector[midi] *= weight;
      }
    }
  }
  return normalizeVector(vector);
}

// =============================================
// DRAWBARS CLASS
// =============================================

class Drawbars {
  constructor() {
    this.state = [...DEFAULT_DRAWBAR_STATE];
    this.values = [...DEFAULT_DRAWBAR_STATE];
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

  init() {
    this.state = [...DEFAULT_DRAWBAR_STATE];
    this.values = [...DEFAULT_DRAWBAR_STATE];
    this.normalise();
  }

  reinit(newInputArray) {
    if (!Array.isArray(newInputArray) || newInputArray.length !== 9) {
      throw new Error('Drawbars input must be a 9-element array');
    }
    this.state = [...newInputArray];
    this.normalise();
  }

  normalise() {
    this.values = [...this.state];
    for (let i = 1; i <= 7; i++) {
      const raw = this.state[i];
      const clamped = Math.max(DRAWBAR_RANGE.min, Math.min(DRAWBAR_RANGE.max, raw));
      this.values[i] = clamped / DRAWBAR_RANGE.max;
    }
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

  getDrawbarValues() {
    return [this.d1, this.d2, this.d3, this.d4, this.d5, this.d6, this.d7];
  }
}

// =============================================
// RANK CLASS
// =============================================

class Rank {
  constructor(id) {
    this.id = id;
    this.position = id;
    this.scaledegree = SCALE_DEGREES[id - 1] || 'tonic';
    this.color = RANK_COLORS[id - 1] || 'rgba(0, 0, 0, 0)';
    this.state_prev = [0, 0, 0, 0];
    this.state_next = [0, 0, 0, 0];
    this.gci_prev = 0;
    this.gci_next = 0;
    this.sum_prev = 0;
    this.sum_next = 0;
    this.changed_flag = false;
    this.rl_flip = false;
    this.voices_owned_prev = [];
    this.voices_owned_next = [];
    this.projected_series = null;
    this.quota_portion = 0;
  }

  init(id) {
    this.id = id;
    this.position = id;
    this.scaledegree = SCALE_DEGREES[id - 1] || 'tonic';
    this.color = RANK_COLORS[id - 1] || 'rgba(0, 0, 0, 0)';
    this.state_prev = [0, 0, 0, 0];
    this.state_next = [0, 0, 0, 0];
    this.gci_prev = 0;
    this.gci_next = 0;
    this.sum_prev = 0;
    this.sum_next = 0;
    this.changed_flag = false;
    this.rl_flip = false;
    this.voices_owned_prev = [];
    this.voices_owned_next = [];
    this.projected_series = null;
    this.quota_portion = 0;
  }

  state_update(inputBytes, globalRlFlip = false) {
    if (!Array.isArray(inputBytes) || inputBytes.length !== RANK_BUTTONS) {
      throw new Error(`Input must be a ${RANK_BUTTONS}-element array`);
    }
    this.rl_flip = globalRlFlip;
    this.state_prev = [...this.state_next];

    if (globalRlFlip && RIGHT_SIDE_RANKS.includes(this.id)) {
      this.state_next = [...inputBytes].reverse();
    } else {
      this.state_next = [...inputBytes];
    }
  }

  get_gci() {
    this.gci_prev = this.gci_next;
    this.gci_next = binaryArrayToGreyCodeInt(this.state_next);
    return this.gci_next;
  }

  get_sum() {
    this.sum_prev = this.sum_next;
    this.sum_next = this.state_next.reduce((a, b) => a + b, 0);
    return this.sum_next;
  }

  has_changed() {
    this.changed_flag = this.gci_next !== this.gci_prev;
    return this.changed_flag;
  }

  get_bands(highpass, lowpass) {
    const bands = [];
    const range = lowpass - highpass;
    if (range <= 0) return bands;

    const bandSize = range / 4;
    const activeBits = this.state_next;

    for (let i = 0; i < 4; i++) {
      if (activeBits[i] === 1) {
        bands.push({
          index: i,
          min: Math.round(highpass + i * bandSize),
          max: Math.round(highpass + (i + 1) * bandSize)
        });
      }
    }
    return bands;
  }

  get_projected_series(keycenter, drawbars) {
    const vector = new Array(128).fill(0);
    const bands = this.get_bands(drawbars.highpass, drawbars.lowpass);
    if (bands.length === 0) {
      this.projected_series = vector;
      return vector;
    }

    const scalePitchClasses = MAJOR_SCALE_INTERVALS.map(
      interval => (keycenter + interval) % 12
    );
    const rankPosition = SCALE_DEGREE_TO_POSITION[this.scaledegree];
    const drawbarValues = drawbars.getDrawbarValues();

    for (const band of bands) {
      for (let midi = band.min; midi <= band.max; midi++) {
        if (midi < 0 || midi > 127) continue;
        const midiPitchClass = midi % 12;
        for (let i = 0; i < 7; i++) {
          const weight = drawbarValues[i];
          if (weight <= 0) continue;
          const targetScalePosition = (rankPosition + i) % 7;
          const targetPitchClass = scalePitchClasses[targetScalePosition];
          if (midiPitchClass === targetPitchClass) {
            vector[midi] = Math.max(vector[midi], weight);
          }
        }
      }
    }
    this.projected_series = vector;
    return vector;
  }

  prepareForNextRun() {
    this.voices_owned_prev = [...this.voices_owned_next];
    this.voices_owned_next = [];
    this.changed_flag = false;
    this.quota_portion = 0;
  }
}

// =============================================
// VOICEMAP CLASS
// =============================================

class Voicemap {
  constructor() {
    this.prev = [];
    this.next = [];
    this.quota = 0;
    this.quota_queue = [];
  }

  init() {
    this.prev = [];
    this.next = [];
    this.quota = 0;
    this.quota_queue = [];
  }

  get_quota(ranks, crawl, priorityOrder) {
    this.quota = 0;
    this.quota_queue = [];

    for (const rankId of priorityOrder) {
      const rank = ranks.find(r => r.id === rankId);
      if (!rank || rank.sum_next === 0) continue;

      const portion = SUM_TO_QUOTA_MAP[rank.sum_next] || 0;
      rank.quota_portion = portion;
      this.quota += portion;

      for (let i = 0; i < portion; i++) {
        this.quota_queue.push(rankId);
      }
    }
    return this.quota;
  }

  free(state) {
    this.prev = [...this.next];
    this.next = [];
  }

  hasMoreQuota() {
    return this.quota_queue.length > 0;
  }

  processQueueStep() {
    if (this.quota_queue.length === 0) return null;
    return this.quota_queue.shift();
  }

  addNote(note) {
    if (note !== null && note !== undefined) {
      this.next.push(note);
    }
  }

  cleanup() {
    this.quota = 0;
    this.quota_queue = [];
  }
}

// =============================================
// STATE CLASS
// =============================================

class State {
  constructor() {
    this.keycenter = DEFAULT_KEYCENTER;
    this.rl_flip = false;
    this.sustain = false;
    this.crawl = DEFAULT_CRAWL;
    this.harmonicity = DEFAULT_HARMONICITY;
    this.vl = DEFAULT_VL;
    this.voicemap = null;
    this.drawbars = null;
    this.ranks = [];
    this.priority_order = [...DEFAULT_PRIORITY_ORDER];
  }

  init() {
    this.voicemap = new Voicemap();
    this.voicemap.init();
    this.drawbars = new Drawbars();
    this.drawbars.init();
    this.ranks = [];
    for (let i = 1; i <= NUM_RANKS; i++) {
      const rank = new Rank(i);
      rank.init(i);
      this.ranks.push(rank);
    }
    this.drawbars.normalise();
  }

  setKeycenter(midiNote) {
    if (midiNote < 0 || midiNote > 127) {
      throw new Error('Keycenter must be a valid MIDI note (0-127)');
    }
    this.keycenter = midiNote;
  }

  setRlFlip(value) { this.rl_flip = !!value; }
  setSustain(value) { this.sustain = !!value; }

  setCrawl(value) {
    this.crawl = Math.max(0, Math.min(CRAWL_MAX, value));
  }

  setHarmonicity(value) {
    this.harmonicity = Math.max(0, Math.min(1, value));
  }

  setVl(value) {
    this.vl = Math.max(0, Math.min(1, value));
  }

  getRank(id) {
    return this.ranks.find(r => r.id === id) || null;
  }

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

  anyRankChanged() {
    return this.ranks.some(rank => rank.changed_flag);
  }

  prepareRanksForNextRun() {
    for (const rank of this.ranks) {
      rank.prepareForNextRun();
    }
  }
}

// =============================================
// DBN (ALGORITHM) CLASS
// =============================================

class DBN {
  constructor() {
    this.lastOutput = [];
    this.onOutput = null;
    this.onProbabilityVector = null;  // Callback for treemap visualization
    this.iterationData = [];          // Store all iterations for current run
  }

  setOutputCallback(callback) {
    this.onOutput = callback;
  }

  setProbabilityVectorCallback(callback) {
    this.onProbabilityVector = callback;
  }

  runAlgorithm(state) {
    const { voicemap, ranks, drawbars, priority_order, crawl } = state;

    // Reset iteration data for this run
    this.iterationData = [];
    let iteration = 0;

    // Step 1: Calculate quota
    voicemap.get_quota(ranks, crawl, priority_order);

    // Early return for silence
    if (voicemap.quota === 0 && !state.sustain) {
      voicemap.next = [];
      this.lastOutput = [];
      if (this.onOutput) this.onOutput(this.lastOutput);
      // Clear treemaps when no notes
      if (this.onProbabilityVector) {
        this.onProbabilityVector([]);
      }
      voicemap.cleanup();
      state.prepareRanksForNextRun();
      return this.lastOutput;
    }

    // Step 2: Free/sustain
    voicemap.free(state);

    // Step 3: Generate projected series
    for (const rank of ranks) {
      rank.get_projected_series(state.keycenter, drawbars);
    }

    // Step 4: Main loop
    while (voicemap.hasMoreQuota()) {
      iteration++;
      const rankId = voicemap.processQueueStep();
      if (rankId === null) break;

      const targetRank = state.getRank(rankId);
      if (!targetRank) continue;

      const crawlVector = calculateCrawl(state, voicemap.next, targetRank);
      const vlVector = calculateVoiceLeading(state, voicemap.next, targetRank);
      const harmonicityVector = calculateHarmonicity(state, voicemap.next, targetRank);

      const combinedVector = multiplyVectors([crawlVector, vlVector, harmonicityVector]);

      let projectionMask;
      if (targetRank.projected_series && targetRank.projected_series.some(v => v > 0)) {
        projectionMask = targetRank.projected_series;
      } else {
        projectionMask = this.createRangeMask(drawbars.highpass, drawbars.lowpass);
      }

      const maskedVector = applyMask(combinedVector, projectionMask);

      // Capture probability vector for treemap visualization
      this.iterationData.push({
        iteration: iteration,
        rankId: rankId,
        probabilityVector: [...maskedVector],
        keycenter: state.keycenter
      });

      // Duplicate detection
      const MAX_RESAMPLE_ATTEMPTS = state.sustain ? 1 : 3;
      let selectedNote = sampleFromDistribution(maskedVector);
      let resampleCount = 0;

      while (voicemap.next.includes(selectedNote) && resampleCount < MAX_RESAMPLE_ATTEMPTS) {
        resampleCount++;
        selectedNote = sampleFromDistribution(maskedVector);
      }

      voicemap.addNote(selectedNote);
      targetRank.voices_owned_next.push(selectedNote);
    }

    // Step 5: Emit probability vectors for treemap visualization
    if (this.onProbabilityVector && this.iterationData.length > 0) {
      this.onProbabilityVector([...this.iterationData]);
    }

    // Step 6: Finalize
    this.lastOutput = [...voicemap.next];
    if (this.onOutput) this.onOutput(this.lastOutput);
    voicemap.cleanup();
    state.prepareRanksForNextRun();

    return this.lastOutput;
  }

  createRangeMask(low, high) {
    const mask = createZeroVector();
    for (let i = Math.floor(low); i <= Math.ceil(high); i++) {
      if (i >= 0 && i < 128) mask[i] = 1;
    }
    return mask;
  }

  shouldTrigger(state) {
    return state.anyRankChanged();
  }

  getLastOutput() {
    return this.lastOutput;
  }
}

// =============================================
// FIBRIL ENGINE (CLIENT-SIDE RUNTIME)
// =============================================

const FibrilEngine = {
  state: null,
  dbn: null,
  clockInterval: null,
  isRunning: false,
  prevSustainState: false,

  // Input state (managed by UI)
  inputs: {
    ranks: Array(NUM_RANKS).fill(null).map(() => Array(RANK_BUTTONS).fill(0)),
    keycenter: 60,
    sustain: false,
    rl_flip: false,
    drawbars: [...DEFAULT_DRAWBAR_STATE]
  },

  // Callbacks
  onVoicemapChange: null,

  initialize() {
    this.state = new State();
    this.state.init();
    this.state.drawbars.reinit(this.inputs.drawbars);
    this.dbn = new DBN();

    this.dbn.setOutputCallback((voicemap) => {
      if (this.onVoicemapChange) {
        this.onVoicemapChange(voicemap);
      }
    });

    console.log('FibrilEngine initialized (client-side)');
    return { state: this.state, dbn: this.dbn };
  },

  startClock() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clockInterval = setInterval(() => this.clockTick(), CLOCK_INTERVAL_MS);
    console.log('Clock started');
  },

  stopClock() {
    if (!this.isRunning) return;
    clearInterval(this.clockInterval);
    this.clockInterval = null;
    this.isRunning = false;
    console.log('Clock stopped');
  },

  clockTick() {
    if (!this.state || !this.dbn) return;

    // Update state from inputs
    this.state.setKeycenter(this.inputs.keycenter);
    this.state.setSustain(this.inputs.sustain);
    this.state.setRlFlip(this.inputs.rl_flip);
    this.state.updateRankStates(this.inputs.ranks);

    // Detect sustain release
    const sustainReleased = this.prevSustainState && !this.inputs.sustain;
    this.prevSustainState = this.inputs.sustain;

    const allRanksZero = this.inputs.ranks.every(rank =>
      rank.every(btn => btn === 0)
    );

    // Trigger algorithm
    if (this.dbn.shouldTrigger(this.state) || (sustainReleased && allRanksZero)) {
      this.dbn.runAlgorithm(this.state);
    }
  },

  // Input methods
  setKeypress(rankId, buttonIndex) {
    if (rankId < 1 || rankId > NUM_RANKS) return;
    if (buttonIndex < 0 || buttonIndex >= RANK_BUTTONS) return;
    const rankIndex = rankId - 1;
    this.inputs.ranks[rankIndex][buttonIndex] =
      this.inputs.ranks[rankIndex][buttonIndex] === 0 ? 1 : 0;
  },

  setSustain(pressed) {
    this.inputs.sustain = pressed;
  },

  setKeycenter(midiNote) {
    this.inputs.keycenter = midiNote;
  },

  setRlFlip(value) {
    this.inputs.rl_flip = value;
  },

  setDrawbars(drawbarArray) {
    this.inputs.drawbars = [...drawbarArray];
    if (this.state && this.state.drawbars) {
      this.state.drawbars.reinit(drawbarArray);
    }
  },

  setCrawl(value) {
    if (this.state) this.state.setCrawl(value);
  },

  setHarmonicity(value) {
    if (this.state) this.state.setHarmonicity(value);
  },

  setVl(value) {
    if (this.state) this.state.setVl(value);
  },

  getLastOutput() {
    return this.dbn ? this.dbn.getLastOutput() : [];
  }
};

// Export for browser
window.FibrilEngine = FibrilEngine;

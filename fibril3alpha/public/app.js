// FIBRIL UI Controller - Client-Side Processing
// All state engine processing runs locally in the browser

// =============================================
// OSC Bridge (WebSocket to Server for Max MSP)
// =============================================

const OSCBridge = {
  ws: null,
  isConnected: false,

  init() {
    const wsUrl = `ws://${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('OSC bridge connected');
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      console.log('OSC bridge disconnected');
      // Reconnect after 2 seconds
      setTimeout(() => this.init(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('OSC bridge error:', err);
    };
  },

  sendVoicemap(notes) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'voicemap',
        notes: notes
      }));
    }
  }
};

// =============================================
// Audio Engine (Tone.js)
// =============================================

const AudioEngine = {
  isStarted: false,
  oscillatorMap: new Map(),  // Map<midi, {osc, panner}> - track oscillators by MIDI note
  lastVoicemap: [],
  rampTime: 0.018,      // 18ms ramp time (increased from 12ms to fix audio popping)

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  async start() {
    if (this.isStarted) return;
    await Tone.start();
    this.isStarted = true;
    console.log('Audio engine started');
  },

  updateVoicemap(newVoicemap) {
    if (!this.isStarted) return;

    const now = Tone.now();

    const lastSet = new Set(this.lastVoicemap);
    const newSet = new Set(newVoicemap);

    // Notes to remove (in last but not in new) - ramp down and dispose
    for (const midi of this.lastVoicemap) {
      if (!newSet.has(midi) || !this.lastVoicemap.has(midi)) {
        const entry = this.oscillatorMap.get(midi);
        if (entry) {
          entry.osc.volume.rampTo(-Infinity, this.rampTime, now);
          setTimeout(() => {
            entry.osc.stop();
            entry.osc.dispose();
            entry.panner.dispose();
          }, this.rampTime * 1000 + 10);
          this.oscillatorMap.delete(midi);
        }
      }
    }
    // Notes that exist in both (sustained) - do nothing, keep playing

    // Notes to add (in new but not in last) - create and ramp up
    let panIndex = this.oscillatorMap.size;
    for (const midi of newVoicemap) {
      if (!lastSet.has(midi)) {
        const freq = this.midiToFreq(midi);
        const pan = ((panIndex + 1) % 2 === 0) ? 1 : -1;

        const panner = new Tone.Panner(pan).toDestination();
        const osc = new Tone.Oscillator({
          frequency: freq,
          type: 'sine',
          volume: -Infinity
        }).connect(panner);

        osc.start(now);
        osc.volume.rampTo(-12, this.rampTime, now);
        this.oscillatorMap.set(midi, { osc, panner });
        panIndex++;
      }
    }

    this.lastVoicemap = [...newVoicemap];
  },

  stop() {
    const now = Tone.now();
    for (const [midi, entry] of this.oscillatorMap) {
      entry.osc.volume.rampTo(-Infinity, this.rampTime, now);
      setTimeout(() => {
        entry.osc.stop();
        entry.osc.dispose();
        entry.panner.dispose();
      }, this.rampTime * 1000 + 10);
    }
    this.oscillatorMap.clear();
    this.lastVoicemap = [];
  }
};

// =============================================
// Keyboard mappings
// =============================================

const KEYBOARD_MAPS = {
  leftSide: [
    { keys: ['q', 'w', 'e', 'r'], rankId: 3 },
    { keys: ['a', 's', 'd', 'f'], rankId: 1 },
    { keys: ['z', 'x', 'c', 'v'], rankId: 6 }
  ],
  rightSide: [
    { keys: ['i', 'o', 'p', '['], rankId: 5 },
    { keys: ['j', 'k', 'l', ';'], rankId: 4 },
    { keys: ['n', 'm', ',', '.'], rankId: 2 }
  ],
  keyselector: [
    ['/', '*', '-'],
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3']
  ]
};

const KEYSELECTOR_TO_MIDI = {
  '5': 60, '4': 65, '6': 67, '2': 63, '1': 56, '3': 70,
  '8': 69, '7': 62, '9': 64, '*': 66, '/': 61, '-': 71
};

const NOTE_NAMES = {
  56: 'Ab', 61: 'Db', 62: 'D', 63: 'Eb', 64: 'E', 65: 'F',
  66: 'Gb', 67: 'G', 69: 'A', 70: 'Bb', 71: 'B', 60: 'C'
};

// State
let currentKeycenter = 60;
let rlFlipState = false;
const keyState = new Map();

// Drawbar state
let drawbarState = [24, 1, 0, 0, 0, 1, 0, 0, 96];

// Heuristic state
let heuristicState = { vl: 0.5, crawl: 0.5, harmonicity: 0.5 };

// Key-to-rank mapping
const keyToRankMap = new Map();

function buildKeyToRankMap() {
  KEYBOARD_MAPS.leftSide.forEach(({ keys, rankId }) => {
    keys.forEach((key, btnIndex) => {
      keyToRankMap.set(key.toLowerCase(), { rankId, btnIndex });
    });
  });
  KEYBOARD_MAPS.rightSide.forEach(({ keys, rankId }) => {
    keys.forEach((key, btnIndex) => {
      keyToRankMap.set(key.toLowerCase(), { rankId, btnIndex });
    });
  });
}

// =============================================
// Initialize
// =============================================

function init() {
  // Initialize FibrilEngine (client-side state processing)
  FibrilEngine.initialize();

  // Initialize OSC bridge for Max MSP
  OSCBridge.init();

  // Set callback for voicemap changes
  FibrilEngine.onVoicemapChange = (voicemap) => {
    // Update audio engine
    AudioEngine.updateVoicemap(voicemap);

    // Send to Max MSP via OSC
    OSCBridge.sendVoicemap(voicemap);

    // Update display
    const formatted = voicemap.map(midi => {
      const noteName = midiToNoteName(midi);
      return `${midi} (${noteName})`;
    });
    document.getElementById('voicemap-output').textContent =
      formatted.length > 0 ? formatted.join(', ') : '[]';
  };

  // Initialize treemap visualizer
  TreemapVisualizer.init();

  // Set callback for probability vector visualization
  FibrilEngine.dbn.setProbabilityVectorCallback((iterationData) => {
    TreemapVisualizer.render(iterationData);
  });

  // Initialize UI
  buildKeyToRankMap();
  createRankGrids();
  createKeyselectorGrid();
  setupKeyboardListeners();
  setupDrawbarSliders();
  setupHeuristicSliders();
  setupAudioButton();

  // Start the client-side clock
  FibrilEngine.startClock();
}

// =============================================
// Audio Button
// =============================================

function setupAudioButton() {
  const btn = document.getElementById('audio-start-btn');

  btn.addEventListener('click', async () => {
    if (!AudioEngine.isStarted) {
      await AudioEngine.start();
      btn.textContent = 'Audio On';
      btn.classList.add('active');

      // Play current voicemap if one exists
      const currentVoicemap = FibrilEngine.getLastOutput();
      if (currentVoicemap && currentVoicemap.length > 0) {
        AudioEngine.updateVoicemap(currentVoicemap);
      }
    } else {
      AudioEngine.stop();
      AudioEngine.isStarted = false;
      btn.textContent = 'Start Audio';
      btn.classList.remove('active');
    }
  });
}

// =============================================
// Rank Grids
// =============================================

function createRankGrids() {
  document.querySelectorAll('.left-ranks .rank-grid').forEach((grid, i) => {
    const { keys, rankId } = KEYBOARD_MAPS.leftSide[i];
    grid.dataset.rank = rankId;
    for (let btn = 0; btn < 4; btn++) {
      const button = document.createElement('button');
      button.className = 'rank-btn';
      button.dataset.rank = rankId;
      button.dataset.btn = btn;
      button.dataset.key = keys[btn].toLowerCase();
      button.textContent = keys[btn].toUpperCase();
      grid.appendChild(button);
    }
  });

  document.querySelectorAll('.right-ranks .rank-grid').forEach((grid, i) => {
    const { keys, rankId } = KEYBOARD_MAPS.rightSide[i];
    grid.dataset.rank = rankId;
    for (let btn = 0; btn < 4; btn++) {
      const button = document.createElement('button');
      button.className = 'rank-btn';
      button.dataset.rank = rankId;
      button.dataset.btn = btn;
      button.dataset.key = keys[btn].toLowerCase();
      button.textContent = keys[btn].toUpperCase();
      grid.appendChild(button);
    }
  });
}

// =============================================
// Keyselector Grid
// =============================================

function createKeyselectorGrid() {
  const grid = document.querySelector('.keyselector-grid');
  for (const row of KEYBOARD_MAPS.keyselector) {
    for (const key of row) {
      const button = document.createElement('button');
      button.className = 'key-btn';
      button.dataset.key = key;
      const midi = KEYSELECTOR_TO_MIDI[key];
      const noteName = NOTE_NAMES[midi] || '?';

      button.innerHTML = `<span class="note-name">${noteName}</span><span class="key-hint">${key}</span>`;

      if (midi === currentKeycenter) {
        button.classList.add('selected');
      }
      grid.appendChild(button);
    }
  }
  updateKeycenterDisplay();
}

// =============================================
// Keyboard Listeners
// =============================================

function setupKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    // Sustain (spacebar)
    if (e.code === 'Space') {
      e.preventDefault();
      document.getElementById('sustain-btn').classList.add('active');
      FibrilEngine.setSustain(true);
      return;
    }

    // RL Flip (backspace)
    if (e.code === 'Backspace') {
      e.preventDefault();
      rlFlipState = !rlFlipState;
      const btn = document.getElementById('rl-flip-btn');
      btn.classList.toggle('active', rlFlipState);
      FibrilEngine.setRlFlip(rlFlipState);
      return;
    }

    const key = e.key;

    // Keyselector
    if (KEYSELECTOR_TO_MIDI[key]) {
      const midi = KEYSELECTOR_TO_MIDI[key];
      currentKeycenter = midi;
      updateKeyselectorUI();
      updateKeycenterDisplay();

      const keyBtn = document.querySelector(`.key-btn[data-key="${key}"]`);
      if (keyBtn) keyBtn.classList.add('active');

      FibrilEngine.setKeycenter(midi);
      return;
    }

    // Rank buttons
    handleRankKey(key.toLowerCase(), true);
  });

  document.addEventListener('keyup', (e) => {
    // Sustain
    if (e.code === 'Space') {
      document.getElementById('sustain-btn').classList.remove('active');
      FibrilEngine.setSustain(false);
      return;
    }

    const key = e.key;

    // Keyselector - remove highlight
    if (KEYSELECTOR_TO_MIDI[key]) {
      const keyBtn = document.querySelector(`.key-btn[data-key="${key}"]`);
      if (keyBtn) keyBtn.classList.remove('active');
      return;
    }

    // Rank buttons
    handleRankKey(key.toLowerCase(), false);
  });
}

function handleRankKey(key, pressed) {
  const mapping = keyToRankMap.get(key);
  if (!mapping) return;

  const { rankId, btnIndex } = mapping;
  const button = document.querySelector(`.rank-btn[data-key="${key}"]`);

  if (!button) return;

  if (pressed) {
    button.classList.add('active');
    keyState.set(key, true);
  } else {
    button.classList.remove('active');
    keyState.delete(key);
  }

  // Update FibrilEngine directly (no server call)
  FibrilEngine.setKeypress(rankId, btnIndex);
}

// =============================================
// UI Updates
// =============================================

function updateKeyselectorUI() {
  document.querySelectorAll('.key-btn').forEach(btn => {
    const midi = KEYSELECTOR_TO_MIDI[btn.dataset.key];
    btn.classList.toggle('selected', midi === currentKeycenter);
  });
}

function updateKeycenterDisplay() {
  const noteName = NOTE_NAMES[currentKeycenter] || 'C';
  document.getElementById('current-key').textContent = noteName;
}

function midiToNoteName(midi) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

// =============================================
// Drawbar Sliders
// =============================================

function setupDrawbarSliders() {
  const drawbars = document.querySelectorAll('.drawbar');

  drawbars.forEach(drawbar => {
    const index = parseInt(drawbar.dataset.index);
    const slider = drawbar.querySelector('.drawbar-slider');
    const valueDisplay = drawbar.querySelector('.drawbar-value');

    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      drawbarState[index] = value;
      valueDisplay.textContent = value;

      // Update FibrilEngine directly
      FibrilEngine.setDrawbars(drawbarState);
    });
  });
}

// =============================================
// Heuristic Sliders
// =============================================

function setupHeuristicSliders() {
  const heuristics = document.querySelectorAll('.heuristic');

  heuristics.forEach(heuristic => {
    const param = heuristic.dataset.param;
    const slider = heuristic.querySelector('.heuristic-slider');
    const valueDisplay = heuristic.querySelector('.heuristic-value');

    slider.addEventListener('input', (e) => {
      const rawValue = parseInt(e.target.value);
      let normalizedValue;

      if (param === 'crawl') {
        normalizedValue = rawValue / 100;
      } else {
        normalizedValue = rawValue / 100;
      }

      heuristicState[param] = normalizedValue;
      valueDisplay.textContent = normalizedValue.toFixed(2);

      // Update FibrilEngine directly
      if (param === 'crawl') FibrilEngine.setCrawl(normalizedValue);
      if (param === 'harmonicity') FibrilEngine.setHarmonicity(normalizedValue);
      if (param === 'vl') FibrilEngine.setVl(normalizedValue);
    });
  });
}

// =============================================
// Start
// =============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

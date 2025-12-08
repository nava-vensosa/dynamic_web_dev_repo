// FIBRIL UI Controller

// =============================================
// Audio Engine (Tone.js)
// =============================================

const AudioEngine = {
  isStarted: false,
  oscillators: [],      // Currently playing oscillators
  lastVoicemap: [],     // Last voicemap for comparison
  rampTime: 0.012,      // 12ms ramp time

  // Convert MIDI note to frequency
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  // Start audio context (must be called from user gesture)
  async start() {
    if (this.isStarted) return;

    await Tone.start();
    this.isStarted = true;
    console.log('Audio engine started');
  },

  // Update voicemap - crossfade from old notes to new notes
  updateVoicemap(newVoicemap) {
    if (!this.isStarted) return;

    const now = Tone.now();

    // Ramp down old oscillators over 8ms
    for (const osc of this.oscillators) {
      osc.volume.rampTo(-Infinity, this.rampTime, now);
      // Schedule disposal after ramp completes
      setTimeout(() => {
        osc.stop();
        osc.dispose();
      }, this.rampTime * 1000 + 10);
    }

    // Create new oscillators for new voicemap
    this.oscillators = [];

    for (let i = 0; i < newVoicemap.length; i++) {
      const midi = newVoicemap[i];
      const freq = this.midiToFreq(midi);

      // Determine pan: odd indices (1, 3, 5...) → left (-1), even indices (0, 2, 4...) → right (+1)
      const pan = (i % 2 === 0) ? 1 : -1;

      // Create oscillator → panner → destination
      const panner = new Tone.Panner(pan).toDestination();
      const osc = new Tone.Oscillator({
        frequency: freq,
        type: 'sine',
        volume: -Infinity  // Start silent
      }).connect(panner);

      // Start and ramp up over 8ms
      osc.start(now);
      osc.volume.rampTo(-12, this.rampTime, now);  // Ramp to -12dB

      this.oscillators.push(osc);
    }

    this.lastVoicemap = [...newVoicemap];
  },

  // Stop all oscillators
  stop() {
    const now = Tone.now();
    for (const osc of this.oscillators) {
      osc.volume.rampTo(-Infinity, this.rampTime, now);
      setTimeout(() => {
        osc.stop();
        osc.dispose();
      }, this.rampTime * 1000 + 10);
    }
    this.oscillators = [];
    this.lastVoicemap = [];
  }
};

// =============================================
// Keyboard mappings
const KEYBOARD_MAPS = {
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
    ['/', '*', '-'],       // Row 1
    ['7', '8', '9'],       // Row 2
    ['4', '5', '6'],       // Row 3
    ['1', '2', '3']        // Row 4
  ]
};

// Keyselector key to MIDI note
const KEYSELECTOR_TO_MIDI = {
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

// MIDI to note name
const NOTE_NAMES = {
  56: 'Ab', 61: 'Db', 62: 'D', 63: 'Eb', 64: 'E', 65: 'F',
  66: 'Gb', 67: 'G', 69: 'A', 70: 'Bb', 71: 'B', 60: 'C'
};

// State
let currentKeycenter = 60;
let rlFlipState = false;
const keyState = new Map(); // key -> pressed

// Drawbar state [highpass, d1-d7, lowpass]
let drawbarState = [24, 1, 0, 0, 0, 1, 0, 0, 96];

// Heuristic state
let heuristicState = { vl: 0.5, crawl: 0.5, harmonicity: 0.5 };

// Build key-to-rank mapping for quick lookup
const keyToRankMap = new Map();

function buildKeyToRankMap() {
  // Left side ranks
  KEYBOARD_MAPS.leftSide.forEach(({ keys, rankId }) => {
    keys.forEach((key, btnIndex) => {
      keyToRankMap.set(key.toLowerCase(), { rankId, btnIndex });
    });
  });

  // Right side ranks
  KEYBOARD_MAPS.rightSide.forEach(({ keys, rankId }) => {
    keys.forEach((key, btnIndex) => {
      keyToRankMap.set(key.toLowerCase(), { rankId, btnIndex });
    });
  });
}

// Initialize UI
function init() {
  buildKeyToRankMap();
  createRankGrids();
  createKeyselectorGrid();
  setupKeyboardListeners();
  setupDrawbarSliders();
  setupHeuristicSliders();
  setupAudioButton();
  startClock();
  pollVoicemap();
}

// Setup audio start button
function setupAudioButton() {
  const btn = document.getElementById('audio-start-btn');

  btn.addEventListener('click', async () => {
    await AudioEngine.start();
    btn.textContent = 'Audio On';
    btn.classList.add('active');
  });
}

function createRankGrids() {
  // Left side ranks
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

  // Right side ranks
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

function setupKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    // Sustain (spacebar)
    if (e.code === 'Space') {
      e.preventDefault();
      document.getElementById('sustain-btn').classList.add('active');
      fetch('/api/input/sustain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pressed: true })
      });
      return;
    }

    // RL Flip (backspace) - toggle behavior
    if (e.code === 'Backspace') {
      e.preventDefault();
      rlFlipState = !rlFlipState;
      const btn = document.getElementById('rl-flip-btn');
      btn.classList.toggle('active', rlFlipState);
      // Send to server
      fetch('/api/input/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rl_flip: rlFlipState })
      });
      return;
    }

    const key = e.key;

    // Keyselector (check raw key for special chars like / * -)
    if (KEYSELECTOR_TO_MIDI[key]) {
      const midi = KEYSELECTOR_TO_MIDI[key];
      currentKeycenter = midi;
      updateKeyselectorUI();
      updateKeycenterDisplay();

      // Highlight the pressed key
      const keyBtn = document.querySelector(`.key-btn[data-key="${key}"]`);
      if (keyBtn) keyBtn.classList.add('active');

      fetch('/api/input/keycenter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ midiNote: midi })
      });
      return;
    }

    // Rank buttons (lowercase comparison)
    handleRankKey(key.toLowerCase(), true);
  });

  document.addEventListener('keyup', (e) => {
    // Sustain
    if (e.code === 'Space') {
      document.getElementById('sustain-btn').classList.remove('active');
      fetch('/api/input/sustain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pressed: false })
      });
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

  // Send to server - toggle the button state
  fetch('/api/input/keypress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rankId, buttonIndex: btnIndex })
  });
}

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

async function startClock() {
  try {
    await fetch('/api/clock/start', { method: 'POST' });
  } catch (err) {
    console.error('Failed to start clock:', err);
  }
}

let lastVoicemapStr = '[]';

function pollVoicemap() {
  setInterval(async () => {
    try {
      const res = await fetch('/api/voicemap');
      const data = await res.json();
      if (data.success && data.voicemap) {
        const voicemap = data.voicemap;
        const voicemapStr = JSON.stringify(voicemap);

        // Check if voicemap changed
        if (voicemapStr !== lastVoicemapStr) {
          lastVoicemapStr = voicemapStr;

          // Update audio engine with new voicemap
          AudioEngine.updateVoicemap(voicemap);
        }

        // Format nicely with note names for display
        const formatted = voicemap.map(midi => {
          const noteName = midiToNoteName(midi);
          return `${midi} (${noteName})`;
        });
        document.getElementById('voicemap-output').textContent =
          formatted.length > 0 ? formatted.join(', ') : '[]';
      }
    } catch (err) {
      // Silently ignore polling errors
    }
  }, 100);
}

// Convert MIDI to note name
function midiToNoteName(midi) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

// Setup drawbar sliders
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

      // Send to server
      sendDrawbars();
    });
  });
}

// Send drawbar state to server
function sendDrawbars() {
  fetch('/api/input/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drawbars: drawbarState })
  });
}

// Setup heuristic sliders
function setupHeuristicSliders() {
  const heuristics = document.querySelectorAll('.heuristic');

  heuristics.forEach(heuristic => {
    const param = heuristic.dataset.param;
    const slider = heuristic.querySelector('.heuristic-slider');
    const valueDisplay = heuristic.querySelector('.heuristic-value');

    slider.addEventListener('input', (e) => {
      const rawValue = parseInt(e.target.value);
      let normalizedValue;

      // Crawl max is 0.67, others are 0-1
      if (param === 'crawl') {
        normalizedValue = rawValue / 100; // 0-67 -> 0-0.67
      } else {
        normalizedValue = rawValue / 100; // 0-100 -> 0-1
      }

      heuristicState[param] = normalizedValue;
      valueDisplay.textContent = normalizedValue.toFixed(2);

      // Send to server
      sendHeuristics();
    });
  });
}

// Send heuristic state to server
function sendHeuristics() {
  fetch('/api/input/heuristics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(heuristicState)
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

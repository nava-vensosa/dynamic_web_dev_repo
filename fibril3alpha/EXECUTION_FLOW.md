# FIBRIL Execution Flow Documentation

A pointer-based guide to understanding how the FIBRIL codebase executes, from server initialization through user input to DBN algorithm completion.

---

## Section 1: Class and Function Reference

### Class Definitions

| Class | File | Line | Description |
|-------|------|------|-------------|
| `State` | `src/core/state.js` | 20 | Central state store for system parameters |
| `Voicemap` | `src/core/voicemap.js` | 9 | Manages MIDI note transitions between states |
| `Drawbars` | `src/core/drawbars.js` | 9 | Manages harmonic sliders and frequency cutoffs |
| `Rank` | `src/core/ranks.js` | 19 | Represents one of 6 harmonic agents |
| `DBN` | `src/algorithm/dbn.js` | 22 | Dynamic Bayesian Network algorithm orchestrator |

#### Client-Side Bundle Classes (`public/fibril-core.js`)

| Class | Line | Description |
|-------|------|-------------|
| `Drawbars` | 183 | Client-side drawbars implementation |
| `Rank` | 239 | Client-side rank implementation |
| `Voicemap` | 374 | Client-side voicemap implementation |
| `State` | 438 | Client-side state implementation |
| `DBN` | 519 | Client-side DBN algorithm |
| `FibrilEngine` | 620 | Main client-side runtime controller |

---

### Functions and Methods by File

#### `server.js`
| Function/Expression | Line | Description |
|---------------------|------|-------------|
| `app.use(express.static(...))` | 16 | Serve static files from `public/` |
| `app.listen(PORT, ...)` | 19 | Start Express server |

#### `public/app.js`
| Function/Object | Line | Description |
|-----------------|------|-------------|
| `AudioEngine` | 8 | Audio synthesis controller object |
| `AudioEngine.midiToFreq()` | 14 | Convert MIDI note to frequency |
| `AudioEngine.start()` | 18 | Initialize Tone.js |
| `AudioEngine.updateVoicemap()` | 25 | Update oscillators based on voicemap |
| `AudioEngine.stop()` | 74 | Stop all oscillators |
| `buildKeyToRankMap()` | 122 | Map keyboard keys to rank buttons |
| `init()` | 139 | Initialize UI and engine |
| `setupAudioButton()` | 174 | Set up audio toggle button |
| `createRankGrids()` | 201 | Create rank button UI grids |
| `createKeyselectorGrid()` | 235 | Create keyselector UI |
| `setupKeyboardListeners()` | 260 | Set up keyboard event handlers |
| `handleRankKey()` | 324 | Handle rank button keyboard input |
| `updateKeyselectorUI()` | 349 | Update keyselector visual state |
| `updateKeycenterDisplay()` | 356 | Update keycenter display |
| `midiToNoteName()` | 361 | Convert MIDI to note name |
| `setupDrawbarSliders()` | 372 | Set up drawbar slider handlers |
| `setupHeuristicSliders()` | 395 | Set up heuristic slider handlers |

#### `public/fibril-core.js` - FibrilEngine Object
| Method | Line | Description |
|--------|------|-------------|
| `FibrilEngine.initialize()` | 639 | Initialize state and DBN |
| `FibrilEngine.startClock()` | 655 | Start 12ms clock loop |
| `FibrilEngine.stopClock()` | 662 | Stop clock loop |
| `FibrilEngine.clockTick()` | 670 | Single clock tick execution |
| `FibrilEngine.setKeypress()` | 694 | Toggle rank button state |
| `FibrilEngine.setSustain()` | 702 | Set sustain pedal state |
| `FibrilEngine.setKeycenter()` | 706 | Set key center |
| `FibrilEngine.setRlFlip()` | 710 | Toggle RL flip |
| `FibrilEngine.setDrawbars()` | 714 | Update drawbar values |
| `FibrilEngine.setCrawl()` | 721 | Set crawl heuristic weight |
| `FibrilEngine.setHarmonicity()` | 725 | Set harmonicity heuristic weight |
| `FibrilEngine.setVl()` | 729 | Set voice leading heuristic weight |
| `FibrilEngine.getLastOutput()` | 733 | Get last voicemap output |

#### `src/index.js` (Node.js Runtime)
| Function | Line | Description |
|----------|------|-------------|
| `initialize()` | 39 | Initialize FIBRIL system |
| `startClock()` | 71 | Start clock loop |
| `stopClock()` | 88 | Stop clock loop |
| `clockTick()` | 103 | Single clock tick |
| `simulateKeypress()` | 137 | Toggle a rank button |
| `simulateRankPattern()` | 161 | Set entire rank pattern |
| `simulateSustain()` | 180 | Set sustain state |
| `simulateKeycenter()` | 189 | Set keycenter |
| `runDemo()` | 197 | Run automated demo |
| `sleep()` | 263 | Async sleep helper |
| `getState()` | 271 | Get current state |
| `getDBN()` | 279 | Get DBN instance |
| `updateInputs()` | 287 | Update simulated inputs |

#### `src/core/state.js` - State Class Methods
| Method | Line | Description |
|--------|------|-------------|
| `constructor()` | 21 | Initialize state properties |
| `init()` | 46 | Initialize child instances |
| `setKeycenter()` | 79 | Update keycenter |
| `setRlFlip()` | 96 | Toggle RL flip |
| `setSustain()` | 109 | Set sustain state |
| `setCrawl()` | 122 | Set crawl value |
| `setHarmonicity()` | 135 | Set harmonicity value |
| `setVl()` | 148 | Set voice leading weight |
| `getRank()` | 162 | Get rank by ID |
| `updateRankStates()` | 170 | Update all ranks from input |
| `anyRankChanged()` | 187 | Check if any rank changed |
| `getChangedRanks()` | 195 | Get list of changed ranks |
| `prepareRanksForNextRun()` | 202 | Reset ranks for next algorithm |
| `toJSON()` | 212 | Serialize state |

#### `src/core/voicemap.js` - Voicemap Class Methods
| Method | Line | Description |
|--------|------|-------------|
| `constructor()` | 10 | Initialize voicemap properties |
| `init()` | 27 | Reset voicemap |
| `free()` | 46 | Determine notes to sustain based on crawl |
| `get_quota()` | 130 | Calculate quota and build queue |
| `addNote()` | 171 | Add note to next voicemap |
| `processQueueStep()` | 190 | Process one queue step |
| `cleanup()` | 211 | Cleanup after algorithm |
| `hasMoreQuota()` | 226 | Check if more processing needed |
| `toJSON()` | 234 | Serialize voicemap |

#### `src/core/ranks.js` - Rank Class Methods
| Method | Line | Description |
|--------|------|-------------|
| `constructor()` | 24 | Initialize rank properties |
| `init()` | 63 | Reset rank |
| `state_update()` | 90 | Update state from UI input |
| `get_gci()` | 115 | Calculate Grey Code index |
| `get_sum()` | 130 | Calculate sum of active buttons |
| `has_changed()` | 145 | Check if state changed |
| `arraysEqual()` | 156 | Helper: compare arrays |
| `get_bands()` | 175 | Calculate active octave bands |
| `get_projected_series()` | 195 | Generate MIDI note weight vector |
| `prepareForNextRun()` | 267 | Reset for next algorithm run |
| `toJSON()` | 282 | Serialize rank |

#### `src/core/drawbars.js` - Drawbars Class Methods
| Method | Line | Description |
|--------|------|-------------|
| `constructor()` | 10 | Initialize drawbar properties |
| `init()` | 32 | Reset drawbars |
| `reinit()` | 43 | Update from new input array |
| `normalise()` | 61 | Normalize d1-d7 values to 0-1 |
| `getDrawbarValues()` | 94 | Get normalized d1-d7 array |
| `toJSON()` | 102 | Serialize drawbars |

#### `src/algorithm/dbn.js` - DBN Class Methods
| Method | Line | Description |
|--------|------|-------------|
| `constructor()` | 23 | Initialize DBN properties |
| `setOutputCallback()` | 45 | Set voicemap output callback |
| `setSumMatrixCallback()` | 53 | Set Sum Matrix visualization callback |
| `runAlgorithm()` | 62 | Run the main DBN algorithm |
| `createRangeMask()` | 218 | Create binary mask for MIDI range |
| `shouldTrigger()` | 235 | Check if algorithm should run |
| `getLastOutput()` | 243 | Get last voicemap output |
| `getPriorMatrix()` | 251 | Get Prior Matrix |
| `getLastSumMatrix()` | 259 | Get last Sum Matrix |
| `resetPriorMatrix()` | 267 | Reset Prior Matrix to uniform |

#### `src/algorithm/heuristics/voiceleading.js`
| Function | Line | Description |
|----------|------|-------------|
| `calculateVLMatrix()` | 34 | Calculate voice leading 128x128 matrix |
| `calculateVoiceLeading()` | 114 | Legacy vector-based calculation |
| `getVoiceLeadingDistance()` | 151 | Get distance between notes |
| `scoreVoiceLeading()` | 161 | Score candidate note |

#### `src/algorithm/heuristics/harmonicity.js`
| Function | Line | Description |
|----------|------|-------------|
| `calculateHarmonicityMatrix()` | 55 | Calculate harmonicity 128x128 matrix |
| `calculateHarmonicity()` | 120 | Legacy vector-based calculation |
| `getConsonance()` | 164 | Get consonance between notes |
| `getMostConsonant()` | 175 | Find most consonant candidate |

#### `src/algorithm/heuristics/drawbars_heuristic.js`
| Function | Line | Description |
|----------|------|-------------|
| `calculateCrawlMatrix()` | 32 | Calculate crawl 128x128 matrix |
| `calculateCrawl()` | 74 | Legacy vector-based calculation |
| `getSustainCount()` | 135 | Calculate sustain count from crawl |
| `selectNotesToSustain()` | 150 | Select notes to sustain |

#### `src/algorithm/heuristics/sum_matrix.js`
| Function | Line | Description |
|----------|------|-------------|
| `createUniformVector()` | 20 | Create uniform distribution vector |
| `createZeroVector()` | 29 | Create zero vector |
| `normalizeVector()` | 38 | Normalize vector to sum to 1 |
| `multiplyVectors()` | 54 | Multiply vectors element-wise |
| `applyMask()` | 81 | Apply binary mask to vector |
| `sampleFromDistribution()` | 96 | Sample note from probability distribution |
| `getMaxProbabilityNote()` | 117 | Get highest probability note |
| `addVectors()` | 137 | Add vectors element-wise |
| `scaleVector()` | 153 | Scale vector by constant |
| `computeSumMatrix()` | 167 | Combine three heuristic matrices |
| `sumMatrixToVector()` | 187 | Convert matrix to probability vector |

#### `src/algorithm/heuristics/matrix_utils.js`
| Function | Line | Description |
|----------|------|-------------|
| `createPriorMatrix()` | 15 | Create 128x128 Prior Matrix |
| `copyMatrix()` | 36 | Deep copy matrix |
| `normalizeMatrix()` | 51 | Normalize matrix cells to sum to 1 |
| `scaleMatrix()` | 87 | Scale matrix by weight |
| `addMatrices()` | 101 | Add matrices element-wise |
| `getMajorKeyPitchClasses()` | 123 | Get pitch classes for major key |
| `zeroOutNonKeyNotes()` | 140 | Zero rows/cols outside key |
| `zeroOutDiagonal()` | 167 | Zero diagonal cells |
| `matrixVectorMultiply()` | 182 | Matrix-vector multiplication |
| `normalizeVectorFromMatrix()` | 201 | Normalize vector |
| `boostCell()` | 232 | Add boost to matrix cell |
| `createZeroMatrix()` | 242 | Create zero matrix |
| `getMatrixSum()` | 255 | Sum all matrix cells |

---

## Section 2: Pointer Diagram - Execution Flow

### Initialization Chain

```
server.js:19 → app.listen(PORT)
    │
    ├── Serves static files from public/
    │
    └── Browser loads index.html
            │
            ├── Loads Tone.js (CDN)
            ├── Loads fibril-core.js:739 (defines window.FibrilEngine)
            └── Loads app.js → document.DOMContentLoaded → init()
```

### Application Initialization (`app.js:init()`)

```
init() [app.js:139]
    │
    ├── FibrilEngine.initialize() [fibril-core.js:639]
    │       │
    │       ├── this.state = new State() [fibril-core.js:438]
    │       │       │
    │       │       └── state.init() [fibril-core.js:452]
    │       │               │
    │       │               ├── this.voicemap = new Voicemap() [fibril-core.js:374]
    │       │               │       └── voicemap.init() [fibril-core.js:382]
    │       │               │
    │       │               ├── this.drawbars = new Drawbars() [fibril-core.js:183]
    │       │               │       └── drawbars.init() [fibril-core.js:198]
    │       │               │               └── drawbars.normalise() [fibril-core.js:212]
    │       │               │
    │       │               └── for i = 1..6:
    │       │                       this.ranks[i] = new Rank(i) [fibril-core.js:239]
    │       │                               └── rank.init(i) [fibril-core.js:259]
    │       │
    │       ├── state.drawbars.reinit(inputs.drawbars) [fibril-core.js:204]
    │       │
    │       └── this.dbn = new DBN() [fibril-core.js:519]
    │               └── dbn.setOutputCallback(onVoicemapChange) [fibril-core.js:525]
    │
    ├── FibrilEngine.onVoicemapChange = callback [app.js:144]
    │       └── callback: AudioEngine.updateVoicemap() + UI update
    │
    ├── buildKeyToRankMap() [app.js:122]
    ├── createRankGrids() [app.js:201]
    ├── createKeyselectorGrid() [app.js:235]
    ├── setupKeyboardListeners() [app.js:260]
    ├── setupDrawbarSliders() [app.js:372]
    ├── setupHeuristicSliders() [app.js:395]
    ├── setupAudioButton() [app.js:174]
    │
    └── FibrilEngine.startClock() [fibril-core.js:655]
            │
            └── setInterval(clockTick, 12ms)
```

### Clock Tick Flow (`FibrilEngine.clockTick()`)

```
clockTick() [fibril-core.js:670] ← Every 12ms
    │
    ├── state.setKeycenter(inputs.keycenter) [fibril-core.js:466]
    ├── state.setSustain(inputs.sustain) [fibril-core.js:474]
    ├── state.setRlFlip(inputs.rl_flip) [fibril-core.js:473]
    │
    ├── state.updateRankStates(inputs.ranks) [fibril-core.js:492]
    │       │
    │       └── for each rank (i = 0..5):
    │               ├── rank.state_update(rankInputs[i], rl_flip) [fibril-core.js:278]
    │               ├── rank.get_gci() [fibril-core.js:292]
    │               ├── rank.get_sum() [fibril-core.js:298]
    │               └── rank.has_changed() [fibril-core.js:304]
    │
    ├── Check: sustainReleased = prevSustain && !currentSustain
    │
    └── if dbn.shouldTrigger(state) || (sustainReleased && allRanksZero):
            │
            └── dbn.runAlgorithm(state) [fibril-core.js:529]
```

### User Input → State Update

```
Keyboard Event (keydown/keyup)
    │
    ├── Rank Buttons (Q-R, A-F, Z-V, I-P-[, J-;, N-.)
    │       │
    │       └── handleRankKey(key, pressed) [app.js:324]
    │               │
    │               ├── mapping = keyToRankMap.get(key)
    │               ├── Update button UI (add/remove 'active' class)
    │               │
    │               └── FibrilEngine.setKeypress(rankId, btnIndex) [fibril-core.js:694]
    │                       │
    │                       └── Toggle: inputs.ranks[rankIndex][buttonIndex] = 0↔1
    │
    ├── Keyselector (numpad keys)
    │       │
    │       └── FibrilEngine.setKeycenter(midi) [fibril-core.js:706]
    │               └── inputs.keycenter = midiNote
    │
    ├── Sustain (Spacebar)
    │       │
    │       └── FibrilEngine.setSustain(true/false) [fibril-core.js:702]
    │               └── inputs.sustain = pressed
    │
    └── RL Flip (Backspace)
            │
            └── FibrilEngine.setRlFlip(true/false) [fibril-core.js:710]
                    └── inputs.rl_flip = value
```

### DBN Algorithm Execution (`dbn.runAlgorithm()`)

```
runAlgorithm(state) [fibril-core.js:529]
    │
    ├── STEP 1: Calculate Quota
    │       │
    │       └── voicemap.get_quota(ranks, crawl, priority_order) [fibril-core.js:389]
    │               │
    │               ├── quota = 0, quota_queue = []
    │               │
    │               └── for rankId in priority_order [3,4,5,2,1,6]:
    │                       │
    │                       ├── portion = SUM_TO_QUOTA_MAP[rank.sum_next]
    │                       │       (sum 1→2, sum 2→3, sum 3→4, sum 4→5 notes)
    │                       │
    │                       ├── quota += portion
    │                       │
    │                       └── Push rankId to queue 'portion' times
    │
    ├── EARLY RETURN: if quota == 0 && !sustain
    │       │
    │       ├── voicemap.next = []
    │       ├── lastOutput = []
    │       ├── onOutput([]) → AudioEngine.updateVoicemap([])
    │       ├── voicemap.cleanup()
    │       └── state.prepareRanksForNextRun()
    │
    ├── STEP 2: Free/Sustain Notes
    │       │
    │       └── voicemap.free(state) [fibril-core.js:408]
    │               │
    │               └── (Client version: prev = next, next = [])
    │
    ├── STEP 3: Generate Projected Series
    │       │
    │       └── for each rank:
    │               │
    │               └── rank.get_projected_series(keycenter, drawbars) [fibril-core.js:329]
    │                       │
    │                       ├── bands = get_bands(highpass, lowpass) [fibril-core.js:309]
    │                       │       │
    │                       │       └── For each active button (state_next[i] == 1):
    │                       │               Create band {min, max} with overlap
    │                       │
    │                       ├── scalePitchClasses = MAJOR_SCALE_INTERVALS mapped from keycenter
    │                       │
    │                       └── For each band → each MIDI → each drawbar:
    │                               If MIDI pitch class matches target scale position:
    │                                   vector[midi] = max(vector[midi], drawbar weight)
    │
    ├── STEP 4: Main Loop (process quota queue)
    │       │
    │       └── while voicemap.hasMoreQuota():
    │               │
    │               ├── rankId = voicemap.processQueueStep() [fibril-core.js:417]
    │               │
    │               ├── targetRank = state.getRank(rankId)
    │               │
    │               ├── Calculate Heuristic Vectors:
    │               │       │
    │               │       ├── crawlVector = calculateCrawl(state, voicemap.next, targetRank)
    │               │       │       [fibril-core.js:148]
    │               │       │
    │               │       ├── vlVector = calculateVoiceLeading(state, voicemap.next, targetRank)
    │               │       │       [fibril-core.js:113]
    │               │       │
    │               │       └── harmonicityVector = calculateHarmonicity(state, voicemap.next, targetRank)
    │               │               [fibril-core.js:130]
    │               │
    │               ├── combinedVector = multiplyVectors([crawl, vl, harmonicity])
    │               │       [fibril-core.js:73]
    │               │
    │               ├── projectionMask = targetRank.projected_series (or range mask)
    │               │
    │               ├── maskedVector = applyMask(combinedVector, projectionMask)
    │               │       [fibril-core.js:86]
    │               │
    │               ├── Sample Note with Duplicate Detection:
    │               │       │
    │               │       ├── selectedNote = sampleFromDistribution(maskedVector)
    │               │       │       [fibril-core.js:94]
    │               │       │
    │               │       └── Resample up to 3x (sustain: 1x) if duplicate
    │               │
    │               ├── voicemap.addNote(selectedNote) [fibril-core.js:422]
    │               │
    │               └── targetRank.voices_owned_next.push(selectedNote)
    │
    ├── STEP 5: Finalize
    │       │
    │       ├── lastOutput = [...voicemap.next]
    │       │
    │       ├── onOutput(lastOutput) → callback
    │       │       │
    │       │       └── FibrilEngine.onVoicemapChange(voicemap)
    │       │               │
    │       │               └── [app.js:144-155]
    │       │                       ├── AudioEngine.updateVoicemap(voicemap)
    │       │                       └── Update UI display
    │       │
    │       ├── voicemap.cleanup() [fibril-core.js:428]
    │       │
    │       └── state.prepareRanksForNextRun() [fibril-core.js:508]
    │
    └── return lastOutput
```

### Audio Output Flow (`AudioEngine.updateVoicemap()`)

```
updateVoicemap(newVoicemap) [app.js:25]
    │
    ├── Create Sets: lastSet, newSet
    │
    ├── Notes to Remove (in lastSet but not newSet):
    │       │
    │       └── for each removed MIDI:
    │               ├── entry = oscillatorMap.get(midi)
    │               ├── entry.osc.volume.rampTo(-Infinity, 18ms)
    │               ├── setTimeout → osc.stop(), osc.dispose(), panner.dispose()
    │               └── oscillatorMap.delete(midi)
    │
    ├── Notes to Keep (in both): DO NOTHING (continue playing)
    │
    ├── Notes to Add (in newSet but not lastSet):
    │       │
    │       └── for each new MIDI:
    │               ├── freq = midiToFreq(midi)
    │               ├── panner = new Tone.Panner(pan).toDestination()
    │               ├── osc = new Tone.Oscillator(freq, 'sine', -Infinity)
    │               ├── osc.connect(panner)
    │               ├── osc.start()
    │               ├── osc.volume.rampTo(-12, 18ms)
    │               └── oscillatorMap.set(midi, {osc, panner})
    │
    └── lastVoicemap = [...newVoicemap]
```

---

## Section 3: Key Data Structures

### State Object
```
state = {
  keycenter: 60,           // MIDI note (C4)
  rl_flip: false,          // Right-left flip toggle
  sustain: false,          // Sustain pedal state
  crawl: 0.5,              // Crawl heuristic weight (0-0.67)
  harmonicity: 0.5,        // Harmonicity weight (0-1)
  vl: 0.5,                 // Voice leading weight (0-1)
  voicemap: Voicemap,      // Voicemap instance
  drawbars: Drawbars,      // Drawbars instance
  ranks: [Rank x 6],       // Array of 6 Rank instances
  priority_order: [3,4,5,2,1,6]  // Rank processing order
}
```

### Rank Object
```
rank = {
  id: 1-6,                 // Rank ID
  scaledegree: 'tonic',    // Scale degree name
  state_prev: [0,0,0,0],   // Previous button states
  state_next: [0,0,0,0],   // Current button states
  gci_prev: 0,             // Previous Grey Code index (0-15)
  gci_next: 0,             // Current Grey Code index
  sum_prev: 0,             // Previous active button count
  sum_next: 0,             // Current active button count
  changed_flag: false,     // Whether state changed
  projected_series: [...], // Size-128 MIDI weight vector
  voices_owned_next: [],   // MIDI notes owned by this rank
  quota_portion: 0         // Notes to generate this cycle
}
```

### Voicemap Object
```
voicemap = {
  prev: [],                // Previous MIDI notes
  next: [],                // Next MIDI notes (being built)
  quota: 0,                // Total notes to generate
  quota_queue: []          // Queue of rank IDs to process
}
```

### Drawbars Object
```
drawbars = {
  state: [24,1,0,0,0,1,0,0,96],  // Raw input values
  values: [24,0.01,...,96],      // Normalized values
  highpass: 24,                   // Lower MIDI bound
  lowpass: 96,                    // Upper MIDI bound
  d1-d7: 0-1                      // Normalized drawbar weights
}
```

---

## Section 4: Constants Quick Reference

| Constant | Value | Location |
|----------|-------|----------|
| `CLOCK_INTERVAL_MS` | 12 | `src/utils/constants.js:27` |
| `NUM_RANKS` | 6 | `src/utils/constants.js:54` |
| `RANK_BUTTONS` | 4 | `src/utils/constants.js:57` |
| `DEFAULT_KEYCENTER` | 60 | `src/utils/constants.js:43` |
| `CRAWL_MAX` | 0.67 | `src/utils/constants.js:51` |
| `MAJOR_SCALE_INTERVALS` | [0,2,4,5,7,9,11] | `src/utils/constants.js:83` |
| `SUM_TO_QUOTA_MAP` | {0:0, 1:2, 2:3, 3:4, 4:5} | `src/utils/constants.js:74` |
| `DEFAULT_PRIORITY_ORDER` | [3,4,5,2,1,6] | `src/utils/constants.js:24` |

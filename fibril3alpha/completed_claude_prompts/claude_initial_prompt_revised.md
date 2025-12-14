Here is a structured, clearer, and more actionable version of your instructions.

I have refactored your notes into a professional technical specification. This format reduces ambiguity, ensures the math/logic flow is strictly followed, and keeps the AI focused on the "Core" phase (Node.js/Logic) without getting distracted by the UI or frontend libraries.

You can copy and paste the block below directly into your Claude CLI session.

-----

# Project Specification: FIBRIL (Dynamic Bayesian Network Harmonizer)

**Phase:** 1 - Core Logic, State Management, and Algorithm Implementation
**Environment:** Node.js (Backend/Core Logic Focus)
**Language:** Modern JavaScript (ES Modules)

## Context

We are building the core engine for **FIBRIL**, a music harmonization system based on a Dynamic Bayesian Network (DBN). For this session, we are **only** implementing the core logic, mathematical classes, and the basic system runtime.

**Out of Scope for this Session:**

  * Frontend UI (HTML/CSS/Express).
  * Audio Synthesis (`tone.js` implementation details).
  * Visualization (`treemap.js` implementation details).

## File Structure

We are strictly adhering to this directory structure. Please scaffold the project accordingly.

```text
root/
├── README.md
├── package.json
├── server.js               # Basic entry point
├── src/
│   ├── index.js            # Main runtime initialization
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers/
│   │   │   ├── grey_code.js
│   │   │   ├── midi.js
│   │   │   ├── debug_log.js
│   ├── core/
│   │   ├── voicemap.js
│   │   ├── ranks.js
│   │   ├── drawbars.js
│   │   ├── state.js
│   ├── algorithm/
│   │   ├── dbn.js          # The main DBN Orchestrator
│   │   ├── heuristics/
│   │   │   ├── voiceleading.js
│   │   │   ├── harmonicity.js
│   │   │   ├── drawbars_heuristic.js
│   │   │   ├── sum_matrix.js
│   ├── ui/                 # Stubs/Interfaces only
│   │   ├── tone.js         # Interface for audio output
│   │   ├── treemap/        # Interface for visualization
```

-----

## Class Specifications

### 1\. Voicemap (`src/core/voicemap.js`)

Manages the transition of MIDI notes between states.

  * **Attributes:**
      * `prev`: Array (List of previously voicing MIDI notes).
      * `next`: Array (Initially empty; populates during algorithm execution).
      * `quota`: Integer (Remaining algorithm loops required).
      * `quota_queue`: Array (Queue of Rank IDs to be processed).
  * **Methods:**
      * `init()`: Constructor/Initializer.
      * `free(state)`: Determines which notes in `prev` should be sustained or freed based on `state.crawl` and input changes. Populates `next` with sustained notes.
      * `get_quota(ranks, crawl_value)`: Calculates ownership portions for ranks and populates `quota_queue`.
      * `cleanup()`: Resets `next`, `quota`, and `quota_queue` for the next run. Sets `prev = next`.

### 2\. Drawbars (`src/core/drawbars.js`)

Manages harmonic sliders and frequency cutoffs.

  * **Attributes:**
      * `state`: Array[9] (User interface values. Init: `[24, 0, 0, 0, 0, 0, 0, 0, 96]`).
      * `values`: Array[9] (Normalized values for algorithm use).
      * **Derived Properties:** `highpass` (index 0), `lowpass` (index 8), `d1` through `d7` (indices 1-7).
  * **Methods:**
      * `init()`: Initialize attributes.
      * `reinit(new_input_array)`: Updates `state` from inputs and calls `normalise()`.
      * `normalise()`: Normalizes indices 1-7 to [0.0 - 1.0]. Updates `values` and derived properties.

### 3\. Rank (`src/core/ranks.js`)

Represents one of the 6 harmonic agents.

  * **Attributes:**
      * `id`: Integer (1-6).
      * `position`: Integer (1-6).
      * `scaledegree`: String (e.g., "tonic").
      * `state_prev`: Array[4] (Previous binary UI state).
      * `state_next`: Array[4] (Current binary UI state).
      * `gci_prev`, `gci_next`: Integers (0-15, Grey Code converted indices).
      * `sum_prev`, `sum_next`: Integers (0-4, sum of active bits in state).
      * `voices_owned_prev`, `voices_owned_next`: Arrays (MIDI notes owned by this rank).
      * `changed_flag`: Boolean (True if `state_prev != state_next`).
      * `quota_portion`: Integer.
      * `projected_series`: Array (Potential MIDI notes based on drawbars/tonicization).
  * **Methods:**
      * `state_update(input_bytes, rl_flip)`: Updates `state_next`. If `rl_flip` is True and `position` is odd, reverse the input array bits.
      * `get_gci()`: Converts `state_next` binary array to integer using standard Grey Code logic.
      * `get_sum()`: Sums `state_next`.
      * `has_changed()`: Updates `changed_flag`.
      * `get_bands(highpass, lowpass)`: Calculates active octave bands based on `state_next` bits (25% chunks of the range).
      * `get_projected_series(keycenter, drawbars)`: Generates candidate MIDI notes within `get_bands` range based on the rank's tonicization and drawbar settings.

### 4\. State (`src/core/state.js`)

The central store for system status.

  * **Attributes:**
      * `keycenter`: Integer (MIDI, init: 60).
      * `rl_flip`: Boolean (UI toggle).
      * `sustain`: Boolean (Spacebar/Pedal status).
      * `crawl`: Float (0.0 - 0.67).
      * `harmonicity`: Float (0.0 - 1.0).
      * `vl`: Float (0.0 - 1.0).
      * `voicemap`: Instance of `Voicemap`.
      * `drawbars`: Instance of `Drawbars`.
      * `ranks`: Array of 6 `Rank` instances.
      * `priority_order`: Array (Init: `[3, 4, 5, 2, 1, 6]`).
  * **Methods:**
      * `init()`: Instantiates all children (ranks, voicemap, drawbars).

-----

## Program Runtime & Algorithm Flow

### 1\. Initialization

1.  Initialize `State` and all child classes.
2.  Run `drawbars.reinit()` to set initial normalized values.
3.  Launch two async intervals (Event Loop & Clock).

### 2\. Async Input Monitor (Event Driven)

  * Watch for changes in: Drawbars, RL\_Flip, Heuristic Weights (Crawl, VL, Harmonicity), Sustain.
  * On change: Update specific State/Class attributes immediately.

### 3\. The Clock Loop (12ms Interval)

This is the heartbeat of the application.

1.  **Read Inputs:** Update `state.keycenter` and `rank.state_next` for all ranks.
2.  **Check Changes:** Iterate through ranks. If `rank.changed_flag` is true, trigger the **DBN Algorithm**.

#### **The DBN Algorithm Steps:**

When triggered:

1.  **Quota & Free:**
      * Call `voicemap.get_quota()` (influenced by `state.crawl`).
      * Call `voicemap.free()` (influenced by `state.crawl` and `state.sustain`). This moves sustained notes to `voicemap.next`.
2.  **The Loop:** While `voicemap.quota > 0` and `quota_queue` is not empty:
      * *Step A (Heuristics):* Calculate Probability Matrices (size 128 vectors or matrices as required by logic).
          * **Crawl Heuristic:** Generate & Normalize.
          * **VL (Voice Leading) Heuristic:** Generate & Normalize.
          * **Harmonicity Heuristic:** Generate & Normalize.
      * *Step B (Combination):* Multiplicatively combine the normalized matrices from A.
      * *Step C (Projection):* Identify the target Rank (first in `quota_queue`). Convert its `projected_series` into a size 128 binary mask vector (1 for valid notes, 0 for others).
      * *Step D (Selection):* Multiply the **Combined Heuristic Matrix** by the **Projection Mask**. Normalize the result. Sample the probability distribution to select **one** MIDI note.
      * *Step E (Update):* Add selected note to `voicemap.next`. Add note to Rank's `voices_owned_next`.
      * *Step F (Advance):* Decrement `quota`, remove Rank from queue. Repeat Loop.
3.  **Finalize:**
      * Move `voicemap.next` to `voicemap.prev`.
      * Output `voicemap.prev` to `tone.js` (stub) and `treemap.js` (stub).
      * Clear `voicemap.next`.

-----

## Instructions for Implementation

1.  **Setup:** Create the `package.json` and directory structure.
2.  **Utils:** Implement `grey_code.js` and `midi.js` helpers first.
3.  **Core Classes:** Implement `Voicemap`, `Drawbars`, `Rank`, and `State` exactly as specified.
4.  **Runtime:** Implement `index.js` with the 12ms clock loop.
5.  **Algorithm Stub:** Create the `dbn.js` file and scaffolding for the heuristics. *Note: We will fill in the complex matrix math for the heuristics in the next prompt, for now, set up the flow/loop.*
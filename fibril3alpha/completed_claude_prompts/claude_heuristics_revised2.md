Here is a refined, structured, and technically precise prompt designed for the Claude Code CLI. It condenses the prose into algorithmic requirements and logic flows while preserving the specific variable names and constraints.

***

**Copy and paste the following into the Claude Code CLI:**

***

## Context & Objective
Implement a Dynamic Bayesian Network (DBN) for MIDI note generation within the existing codebase. The system uses a $128 \times 128$ transition matrix (The Prior) to generate a series of notes (`voicemap.next`) based on heuristic rules (Crawl, Voice Leading, Harmonicity).

Please implement the following logic flow and data structures:

### 1. Data Structures & Initialization
* **The Prior ($128 \times 128$ Matrix):**
    * Represents $P(A|B)$ where $A$ (row) and $B$ (col) are MIDI indices.
    * **Init:** Uniform probability of $1/(128 \times 127)$ for all cells.
    * **Constraint:** Identity diagonal ($A==B$) is always $0$.
* **Heuristic Matrices:** Three temporary $128 \times 128$ matrices (Crawl, VL, Harmonicity) used during calculation.
* **The Sum Matrix:** The weighted, normalized result of the three heuristics.

### 2. Control Flow: The "Crawl" Sustain & Quota
Triggered on new Rank/Keystate input:
1.  **Calculate Sustain:**
    * Determine `sustain_count = floor(crawl_weight * len(voicemap.prev))`.
    * Identify valid notes in `voicemap.prev` that exist in the new `rank.projected_series`.
    * Move the first $N$ valid notes (where $N=$ `sustain_count`) directly into `voicemap.next`.
2.  **Derive Quota:**
    * `dbn_loops = state.quota - len(voicemap.next)`.
3.  **Execute DBN Loop:** Run the process below `dbn_loops` times.
4.  **Update Prior:** After the loop finishes (quota met), overwrite **The Prior** with the final state of **The Sum Matrix**.

### 3. The DBN Loop Logic
For each cycle:
1.  **Compute Heuristics:** Generate Crawl, VL, and Harmonicity matrices (logic defined below).
2.  **Compute Sum Matrix:**
    * Equation: `SumMatrix = Normalize((Crawl * w_crawl) + (VL * w_vl) + (Harmonicity * w_harm))`.
    * *Note: Each individual heuristic matrix is normalized before scaling by its weight.*
3.  **Visualization Hook:** Expose the `SumMatrix` data for the frontend ChartJS Treemap.
4.  **Selection:**
    * Multiply `rank.projected_series` (vector) by `SumMatrix`.
    * Sample the resulting probability vector to select **one** note.
    * Add note to `voicemap.next`.
    * *Repeat loop with updated `voicemap.next` context.*

### 4. Heuristic Rules
Each matrix starts as a copy of **The Prior** and applies specific transformations.

#### A. Crawl Heuristic
* **Filter:** Set probability to 0 for any row/col index outside the Key Center.
* **Transformation:**
    * Normalize Matrix.
    * Iterate cells: If `abs(Row - Col) <= 4`, add `crawl_weight` to cell value.
    * Normalize Matrix.
    * Scale by `crawl_weight`.

#### B. Voice Leading (VL) Heuristic
* **Direction Logic:**
    * Calculate delta: `d = rank.gci_next - rank.gci_prev`.
    * If `d > 0`: Bias Upward ($A > B$).
    * If `d < 0`: Bias Downward ($A < B$).
* **Transformation:**
    * Iterate cells ($A|B$). Apply boost `vl_weight` if ALL conditions met:
        1.  $A$ is in `rank.projected_series`.
        2.  $B$ is in `voicemap.prev`.
        3.  `abs(A - B) < 4`.
        4.  Direction matches bias (e.g., if Bias Upward, $A > B$).
    * Normalize Matrix.
    * Scale by `vl_weight`.

#### C. Harmonicity Heuristic
* **Filter:** Zero out indices outside Key Center and diagonal ($A==B$).
* **Transformation:**
    * Normalize Matrix.
    * Iterate cells ($A|B$): Check against all notes $k$ currently in `voicemap.next`.
    * If `abs(A - k) == 5 or 7` OR `abs(B - k) == 5 or 7`: Add `harmonicity_weight` to cell probability.
    * Normalize Matrix.
    * Scale by `harmonicity_weight`.

***


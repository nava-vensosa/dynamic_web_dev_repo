# Chartjs Treemap Integration

- While the program is running, it loops through the Heuristic Matrices N times, where N is the quota amount (and the number of new notes generated)

- Every time the program selects notes for voicemap.next, N Sum Matrices get generated. Each time a Sum Matrix gets generated, it will be multiplied with the input vector of a certain rank's projected range. This multiplication results in a probability vector, which is then sampled to select a note that gets added to voicemap.next. I want this final probability vector (derived from the multiplication of the input vector with the Sum Matrix) to be normalized and then visualized in a Treemap.

- Every time a new Rank keypress is detected (that is to say, any time voicemap.prev changes), there should be N Treemaps generated, each corresponding to a different resultant probability vector. Each treemap should exist in its own flex space -- they should be organized in rows of up to 3 treemaps. 

- The outer size of each treemap should be the same. The size of each cell within a treemap should be the portion of the probability space it takes up (if a certain note within a vector has 50% probability, it should take up half of that treemap's area)

- The title of each treemap should be "Rank {rank.id}" for the rank that provides the projected_series input vector

- The title of each cell within a treemap should be the MIDI number it represents (the size is of that cell is the probability of that MIDI number being chosen)

- The color of each cell within a treemap should be the harmonicity composition of that note. Harmonicity is checking for Roots & Perfect 4ths/5ths -- so, in the key of C, a C note would belong to the Tonic Rank's Harmonicity, the Dominant Rank's Harmonicity, and the Subdominant Rank's Harmonicity; as such, that cell should display all three colors (predominantly that of the Tonic, but also displaying those of the other two)

---

# REVISED PROMPT

# Task: Implement Chart.js Treemap Visualization for Probability Vectors

I need to visualize the note selection probability process using `chartjs-chart-treemap`. Please implement a visualization component based on the following specifications:

## 1. Trigger & Data Lifecycle
- **Trigger:** Listen for changes to `voicemap.prev` (representing a new Rank keypress).
- **Iteration:** When triggered, perform a loop $N$ times, where $N$ is the current `quota` (number of new notes to generate).
- **Calculation Per Iteration:**
  1. Retrieve the `Sum Matrix` generated for this step.
  2. Retrieve the input vector of the current Rank's projected range.
  3. Perform Matrix Multiplication: $$ProbabilityVector = InputVector \times SumMatrix$$
  4. Normalize the resulting `ProbabilityVector` so values sum to 1.0.
  5. Store this normalized vector to be rendered as a Treemap.

## 2. Visualization Layout (UI)
- **Container:** A Flexbox container holding all generated Treemaps.
- **Grid System:** Organize Treemaps in rows of up to **3 items per row**.
- **Sizing:** All Treemaps must have identical outer dimensions.

## 3. Chart.js Configuration
- **Library:** Use `chartjs-chart-treemap`.
- **Chart Title:** "Rank {rank.id}" (derived from the rank providing the projected_series input).
- **Cell Data:**
  - **Label:** The MIDI number represented by the cell.
  - **Area/Size:** Proportional to the probability value in the `ProbabilityVector` (e.g., 0.5 = 50% of the chart area).

## 4. Advanced Coloring Logic (Harmonicity)
Implement a dynamic coloring system for the cells based on the note's harmonic function within the current key (Root, Perfect 4th, Perfect 5th).

- **Logic:**
  - A note can belong to multiple harmonic identities simultaneously (e.g., in C Major, a 'C' note is the Root of Tonic, P4 of Dominant, P5 of Subdominant).
  - Define base colors for Tonic, Dominant, and Subdominant ranks.
- **Implementation:**
  - For each cell (MIDI note), calculate a **blended color**.
  - The blend should result from the weighted combination of the base colors associated with that note's functions.
  - *Example:* If a note functions as both Tonic and Dominant, blend those two colors, weighting the Tonic color more heavily (predominant).

## Requirements
- Ensure `chart.js` and `chartjs-chart-treemap` are installed/imported.
- Create a reusable helper function for the color blending logic to keep the component clean.
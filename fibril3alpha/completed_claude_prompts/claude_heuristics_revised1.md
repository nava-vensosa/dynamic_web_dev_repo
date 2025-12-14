# Dynamic Bayesian Network Music Generation Specification

## Overview
A DBN system that generates MIDI note sequences based on three weighted heuristics (Crawl, VL, Harmonicity), processing through probability matrices to select notes constrained by musical key and voice leading principles.

## Core Data Structures

### Prior Matrix (128×128)
- **Initialization**: All cells = `1/(128*127)`, diagonal = 0% (A==B impossible)
- **Cell meaning**: P(note_A | note_B) where indices = MIDI note numbers
- **Update**: After DBN completes quota loops, Prior ← Sum Matrix

### Sum Matrix (128×128)
- **Computation**: Normalized sum of (Crawl + VL + Harmonicity matrices)
- Each heuristic matrix: copies Prior → applies rules → normalizes → scales by weight
- **Output**: Visualized as Chart.js treemap, multiplied with rank vector to sample next note

## DBN Loop Process

1. User changes keystate → derive quota N from `state.quota`
2. Loop N times:
   - Each heuristic copies Prior, applies rules, normalizes, scales by weight
   - Sum = normalize(Crawl + VL + Harmonicity)
   - Visualize Sum Matrix
   - Sample: `rank.projected_series × Sum Matrix` → select note → add to `voicemap.next`
3. After quota met: Prior ← Sum Matrix

## Heuristic 1: Crawl (range 0–0.67)

### Pre-DBN: Note Sustaining
- Sustain `floor(crawl_weight * voicemap.prev.size)` notes from `voicemap.prev` into `voicemap.next`
- Only sustain notes present in modified ranks' `projected_series`
- Reduce DBN quota by sustained note count
- **Example**: 50% crawl, 4 prev voices, 3 tonic keys pressed → sustain 2 valid notes, DBN loops only 1 time

### Within DBN Loop
1. Copy Prior
2. Zero out rows/columns outside keycenter's major key
3. Normalize
4. Boost cells where `abs(A - B) ≤ 4` by adding crawl weight
5. Normalize again
6. Scale by crawl weight
7. Pass to Sum Matrix equation

## Heuristic 2: VL (Voice Leading, range 0–0.1)

### Direction Logic
- `Δgci = rank.gci_next - rank.gci_prev`
- If Δgci > 0: bias upward
- If Δgci < 0: bias downward

### Boost Conditions (upward bias example)
Boost cell if ALL true:
- `A ∈ rank.projected_series`
- `B ∈ voicemap.prev`
- `abs(A - B) < 4` (within 3 semitones)
- `Δgci > 0`
- `A > B`

Then: `P(A|B) += vl_weight`

For downward bias: same logic with `A < B`

### Processing
1. Copy Prior
2. Apply boost rules
3. Normalize
4. Scale by VL weight
5. Pass to Sum Matrix

## Heuristic 3: Harmonicity

### Boost Rule
At cell (A, B), for each `k ∈ voicemap.next`:
- If `abs((A OR B) - k) ∈ {5, 7}` (perfect 4th or 5th)
- Then: `P(A|B) += harmonicity_weight`

### Processing
1. Copy Prior
2. Zero out non-key notes and diagonal (A==B)
3. Normalize
4. Apply harmonicity boost rule
5. Normalize again
6. Scale by harmonicity weight
7. Pass to Sum Matrix

## Key Variables

- `voicemap.prev`: Previously voiced MIDI notes
- `voicemap.next`: Notes being constructed (starts with sustained notes)
- `rank.projected_series`: Valid notes for current rank based on drawbars/keycenter
- `rank.gci_prev/next`: Gestural Context Index values determining VL direction
- `state.quota`: Total notes to generate from keystate change
- Keycenter: Selected major key for probability filtering

## Implementation Notes

- All matrices normalize such that sum ≈ 1.0
- Edge cases in percentage calculations can be handled intuitively (floor/ceil/round)
- Process one rank at a time during DBN loops
- Chart.js treemap visualization occurs each loop after Sum Matrix computation; there should be as many treemaps generated as the quota amount, as every Sum Matrix should be displayed in the treemap section of the UI; the treemaps should auto-resize (perhaps using flex) to fit in frame, and the keyboard should not move its position while the treemaps resize

1) The Prior
  - The Prior is a 128x128 matrix
  - Each cell of the Prior is comparing A given B, where A and B are the MIDI notes corresponding to the indices of the row/column being compared at that junction
  - In the first instance of the Prior when the program starts, every cell of the Prior is set to a probability of 1/(128*127) and the identity diagonal's cells have their values set to 0%
    -> This is because for any A | B where A == B, the probability of that comparison is 0%
  - When the user inputs a new keystate for the Ranks, the Dynamic Bayesian Network is triggered; it loops through its process N times, where N is the state.quota derived from the change in keystate
  - at the end of this loop, the Prior matrix takes on the definition of the Sum Matrix

2) The Sum Matrix
  - The Sum Matrix the computed result of the Crawl, VL, and Harmonicity Heuristic Matrices
  - The Sum Matrix is a 128x128 matrix
  - For each loop of the DBN, the Crawl, VL, and Harmonicity matrices will copy the state of the prior, and then march through the contents of that copied matrix making changes according to the current state of voicemap.next, according to their own rules; then, each of these 3 matrices is normalized (such that adding all their contents would amount to roughly 1), and then scaled according to the weight indicated in the UI; finally, the 3 matrices are summed up, and the result of that summation gets normalized -- this is what the Sum Matrix stores
  - The Sum Matrix is then sent to be visualized as a chartjs Treemap
  - Once computed, the Rank Vector (rank.projected_series) which is currently being processed gets multiplied with the Sum Matrix, and the resulting probability vector is sampled to select a note that gets added to voicemap.next; this marks the conclusion of a loop instance of the DBN
    -> Until the quota has been reached, the DBN loops, recomputing the states of all 3 Heuristic matrices against the newly modified voicemap.next data, deriving a new Sum Matrix, visualizing that, and sampling it for each cycle of the loop
    -> Once the DBN has completed its loop and the quota has been met, the most recent state of the Sum Matrix is assigned to be the value of the Prior Matrix

3) Crawl Heuristic

3.1) Crawl's influence on the quota before the DBN
  - The Crawl Heuristic is a float in the range (0, .67)
  - Whatever the size of voicemap.prev, the percentage the Crawl Heuristic represents should be sustained into voicemap.next so long as those notes exist in the modified ranks' projected series
    -> For example, if the Crawl Heuristic is set to .5, and there are 4 notes currently being voiced, and the keycenter is C, and the current voices are [60, 67, 65, 62] (i.e. C, G, F, D) and the drawbars are set to [50, 0, 0, 50, 0, 0, 0] (i.e., 50% on the first degree and 50% on the fourth degree, with the remaining degrees set to 0%), and the current ranks pressed are the Tonic and the Supertonic, but the next ranks pressed are just 3 notes in the Tonic rank, then the Tonic Rank's projected series contains all C and G notes in the viable bands, and the requested number of notes to sustain from voicemap.prev into voicemap.next is 2 (since Crawl is set to 50%, and the size of voicemap.prev is 4, and 50% of 4 is 2), and the only notes in voicemap.prev which are valid to be sustained are Cs and Gs, so before the DBN begins, voicemap.next's initial state should be [60, 65] -- and since there are 3 keys pressed in the Tonic rank, the full quota should be 3 notes voiced in total, but since 2 notes are being sustained, the derived quota amount from the ranks' keystate should be reduced by the size of voicemap.next before launching into the DBN (in this example, this would mean the DBN conducts 1 loop only, since the expected quota amount 3 reduced by the size of voicemap.next after sustaining 2 notes returns 1)
  - There will be edge cases, since percentages of integers can be unwieldy... it doesn't need to be super precise here, so edge cases can be intuitively circumnavigated

3.2) The Crawn Heuristic's influence within the DBN
  - First, the Crawl Matrix copies the state of the Prior matrix
  - Second, the Crawl Matrix reduces the probabilty of any row or column whose index lies outside of the major key selected as the keycenter to 0%
  - Third, the Crawl Matrix is normalized
  - Fourth, the Crawl Matrix steps throughits cells, comparing the row index A with the column index B; if it finds abs(A - B <= 4), then the probability of that cell should be boosted by the weight of the Crawl Heuristic (if the user has set the Crawl Heuristic to .55, and the prior probability at that cell was .97, then that cell should be set to .97 + .55 = 1.52)
  - Fifth, the Crawl Matrix is normalized again
  - Sixth, the Crawl Matrix is scaled by the Crawl Heuristic's weight
  - Seventh, the Crawl Matrix is passed into the equation for deriving the Sum Matrix, alongside the normalized and weighted matrices for Harmonicity and VL
  - The next time the DBN loops, the Crawl Matrix overwrites its last state by copying the state of the Prior matrix, and proceeds through the aforementioned steps again


4) VL Heuristic
  - The VL Heuristic is a float in the range (0, .1.)
  - For the rank being processed during this loop of the DBN, the difference between rank.gci_prev and rank.gci_next determines the direction of the Voice Leading bias
    -> PLEASE DOUBLE CHECK THE LOGIC FOR THIS SECTION
    -> If the rank.gci_next is greater than rank.gci_prev, the VL heuristic influences notes to tend upward; if rank.gci_next is less than rank.gci_prev, the VL heuristic influences notes to tend downward
    -> For a note A given B, if ( (A is in rank.projected_series) && (B is in voicemap.prev) && (abs(A - B) < 4) && ( (rank.gci_next - rank.gci_prev) > 0) && (A > B), then I believe this series of conditionals indicates that this cell represents a note in the direction intended by the Voice Leading bias within the limited proximity (within 3 semitones above a previously voiced note), then this cell should have its probability likelihood boosted by the weight of the VL Heuristic (if the VL Heuristic in the UI is set to .5 and the probability of this cell was .86, then the probability should be transformed to .86 + .5 = 1.36)
    -> Similarly, if the rank.gci has decreased from prev to next, then the VL Heuristic wants to trend voice leading downward -- so, notes within the selected key that are less than 4 semitones below notes in voicemap.prev which fall within the currently analyzed rank's projected series should have their probability boosted by the VL Heuristic weight
  - After the VL Heuristic transforms all the cells needing modification within its probability field, the VL Matrix gets normalized, and then scaled by the VL Heuristic weight, before being slotted into the Sum Matrix equation

5) Harmonicity Heuristic
  - The Harmonicity Heuristic operates in the same series of operations as the other two-- inheriting the Prior Matrix state, reducing the probability of any A or B outside of the key, or any cell where A == B, normalizing, then stepping through its indices to run comparisons according to its ruleset, normalizing again, then scaling by the weight described in the UI before being slotted into the Sum Matrix equation
  -> The Harmonicity Heuristic's ruleset is as follows:
    - At the juncture of A & B, for each note k in voicemap.next, if ( abs( (A OR B) - k) == (5 OR 7)) then this cell should get the Harmonicity Heuristic's Weight added to its probability value

We're going to try again to implement the Dynamic Bayesian Network-based harmonizer, FIBRIL. We will be using Javascript, and it will be thrown onto a website.

The website will also have a tone.js and a treemap.js file which I have not included in the projected codebase. the tone.js file will simply take the voicemap array and, whenever it changes, ramp the previous notes down from 100% volume to 0% volume over 8ms, while ramping the next notes up from 0% to 100% during the same 8ms; it will play the even indexed elements of the voicemap array as MIDI notes out of the right speaker, and the odd indexed elements will play out of the left speaker. The treemap.js file will use the chartjs treemap (https://chartjs-chart-treemap.pages.dev/#installation) to visualize the matrices coing out of the DBN -- we'll handle that later.

During this session, we are setting up the codebase and working on utils and classes, as well as setting up the basic program runtime. We are not yet working on either the UI (which will use HTML, CSS, Express.js and Node.js) or the DBN (which will use javascript to crunch vectorized matrix multiplications and output probability fields; the probability fields will be visualized by the treemap, printed to the browser console -- along with the rest of the system state variables -- and will be sampled to select notes that get added to the voicemap and then played aloud as sine tones)

---

Here's the projected codebase:

root/
├── README.md
├── package.json
├── package-lock.json
├── server.js
├── src/
│   ├── index.js
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
│   │   ├── dbn.js
│   │   ├── heuristics/
│   │   │   ├── voiceleading.js
│   │   │   ├── harmonicity.js
│   │   │   ├── drawbars.js
│   │   │   ├── sum_matrix.js
│   ├── ui/
│   │   ├── keyboard/
│   │   │   ├── draw.js
│   │   │   ├── monitor.js
│   │   ├── treemap/
│   │   │   ├── prepare_treemap.js
│   │   │   ├── draw_treemap.js
│   │   ├── tone.js

---

Here's what I propose for each class:

Voicemap Class Attributes:
- self.prev = [] # list containing the previously voicing MIDI notes
- self.next = [] # initially empty list; every time the algorithm is run in response to a change in user inputs, this will be filled to compute the next voicemap state
- self.quota = 0 # this is an integer which determines how many more loops of the algorithm are due to run
- self.quota_queue = [] # this is an array which details the next rank to be processed by the algorithm in order to derive a probability field which then gets sampled to add a MIDI note to self.next; each time the algorithm loops, it processes the rank whose id is referenced by the next element of the quota_queue

Voicemap Class Methods:
- self.init() # initializes the voicemap instance and its attributes
- self.free() # when the algorithm runs, this is the first step to determine which notes to free/sustain out of this.prev
- self.get_quota() # determines portions for rank ownership in the next step of the algorithm; also assigns a value to the self.quota_queue
- self.cleanup() # reinitializes all the values that need to be clean-slated for the next time the algorithm gets triggered to begin its loop

Drawbars Class Attributes:
- self.state = [24, 0., 0., 0., 0., 0., 0., 0., 96] # this is the state which the drawbars initialize as; these numbers correspond to what the sliders display in the UI
- self.values = [24, 0., 0., 0., 0., 0., 0., 0., 96] # this is the initial state that the .values attribute is saved as; however, the .values attribute contains the normalized values for indices 1-7, and these are the values the algorithm will use
- self.highpass = self.values[0] # this is the highpass cutoff frequency for the drawbars
- self.lowpass = self.values[8] # this is the lowpass cutoff frequency for the drawbars
- self.d1 = self.values[1] # this is the first slider's value
- self.d2 = self.values[2] # this is the second slider's value
- self.d3 = self.values[3] # this is the third slider's value
- self.d4 = self.values[4] # this is the fourth slider's value
- self.d5 = self.values[5] # this is the fifth slider's value
- self.d6 = self.values[6] # this is the sixth slider's value
- self.d7 = self.values[7] # this is the seventh slider's value

Drawbars Class Methods:
- self.init() # initializes the drawbar instance and its attributes
- self.reinit() # measures user input changes, alter self.state, then calls self.normalise()
- self.normalise() # normalizes the drawbars' values to be between 0 and 1, and sets self.values, then reassigns self.highpass, self.lowpass, and self.d1 through self.d7

State Class Attributes:
- self.keycenter = 60 # this is a MIDI number; this value initializes at middle C
- self.rl_flip = False # this is a boolean; when the user hits a certain button on the UI, it toggles this to either True or False
- self.sustain = False # this is a boolean; if the user is holding the sustain pedal (which is mapped as the spacebar on the keyboard) then this is True, else if the spacebar is not held then this is False
- self.crawl = .5 # this is a float between 0 and .67, controlled by a dial on the UI
- self.harmonicity = .5 # this is a float between 0. and 1. controlled by a dial on the UI
- self.vl = .5 # this is a float between 0. and 1. controlled by a dial on the UI
- self.voicemap = Voicemap() # this is an instance of the Voicemap class
self.drawbars = Drawbars() # this is an instance of the Drawbars class
- self.ranks = [] # this is an array containing all 6 rank class instances which the system uses
- self.priority_order = [3, 4, 5, 2, 1, 6] # this is an array containing the priority order of the ranks, which is determined by the order in which they are processed through the quota during the algorithm's runtime; the value indicated here is the default it initializes as 

State Class Methods:
- self.init() # this is called at the start of the program, and initializes the state variables, including the rank class instances, drawbars class instance, and voicemap instance

Rank Class Attributes:
- self.id = 0 # this is an integer between 1-6, determining which instance of a rank this is; used to determine priority order
- self.position = 1 # this is an integer between 1-6, determining which of the UI ranks this rank corresponds to
- self.scaledegree = "tonic" # this is a string indicating tonicization, mapped by a utils constant
- self.color = rgba(0, 0, 0, 0) # this indicates the color of the UI rank
- self.state_prev = [0, 0, 0, 0] # this array corresponds to the user's last keypresses in the UI -- each rank in the UI is a row of 4 buttons, and when one of those buttons is held the corresponding byte in this array toggles from 0 to 1, and when released it detoggles from 1 to 0
- self.state_next = [0, 0, 0, 0] # this array corresponds to the user's newest keypresses for this rank in the UI 
- self.gci_prev = 0 # this is an integer between 0 and 15, used by the VL heuristic
- self.gci_next = 0
- self.sum_prev = 0 # this is an integer between 0 and 4, derived by adding all the elements in the self.state array
- self.sum_next = 0
- self.voices_owned_prev = [] # this array logs all the voices in the current system state voicemap which this rank has "ownership" for
- self.voices_owned_next = [] # this array is empty at the start of each time the entire algorithm is run; it populates with MIDI numbers as the quota gets filled
- self.changed_flag = False # this is a boolean flag used for a check when iterating through determining the voicemap quota/queue
- self.rl_flip = false # flag used for processing self.state_next and self.gci_next
- self.quota_portion = 0 # this integer determines how much of the quota this rank is due ownership over; this corresponds to how many times the algorithm loop will focus on this rank
- self.projected_series = [] # this array contains the MIDI notes that this rank could possibly voice in the next voicemap statem given the user's inputs

Rank Class Methods:
- self.init() # initializes the rank instance and its attributes
- self.state_update() # reads the UI state corresponding to this rank and stores its bytes into self.state_next; if state.rl_flip && self.position%2 (that is to say, if the rl_flip is triggered and this rank is in an odd numbered position) then reverse the array and store that as self.state_next
- self.get_gci() # process self.state_next to get the corresponding grey code integer value (according to the grey code conversion table shown at https://www.baeldung.com/cs/gray-code-vs-base-two-representation)
- self.get_sum() # add the elements contained in self.state_next and assign self.sum_next to that value
- self.has_changed() # assign self.changed_flag = self.state_prev == self.state_next
- self.get_bands() # helper function for self.get_projected_series(); each byte in self.state_next represents 25% of the range between state.highpass -> state.lowpass; projected_series can only contain notes within the octave ranges corresponding to the bands toggled on
- self.get_projected_series() # in the range of MIDI notes indicated by get_bands, populate all notes in the major key corresponding to the system state.keycenter according to the series of state.d1-state.d7 for the tonicization of this rank

---
Program Runtine:

1) startup: initialize
  -> initialize state instance
    -> initialize rank instances
    -> initialize drawbars instance
    -> initialize voicemap instance
  -> run drawbars.reinit() to normalize drawbars.values
  -> launch the two async threads

2) async: monitor for changes in user input (any time the value changes in the UI for these objects, their values should reflect that and the appropriate functions should run to reinitialize/normalize those values)
  -> Drawbars
  -> RL_Flip
  -> Heuristic Weights (Crawl, VL, Harmonicity)
  -> Sustain

3) async: clock; while the controls for stage 2) are responding to every single change in user input, these changes are only detected every 12ms, as if measuring the state of these objects on a repeat interval
  -> read the keystate of the keyselector grid & update state.keycenter
  -> read the state of all 6 ranks in the UI and update the ranks' state_next values
  -> for rank in ranks, if rank.changed_flag, then update_voice_map
    -> update_voice_map triggers the Dynamic Bayesian Network; first the state.crawl value influences how voicemap.free() and voicemap.get_quota() run; then, the state.crawl value, the state.vl value, and the state.harmonicity value all influence 3 different matrix operations, which will then be normalized, multiplicatively combined, and used to process each
      -> step 1 of the algorithm: voicemap.get_quota() ; this is influenced by state.crawl
      -> step 2: voicemap.free() ; this is influenced by state.crawl ; this ends up storing certain "sustained" notes into voicemap.next (unless the prior keypress state was empty, in which case nothing will be sustained and voicemap.next is empty when the heuristics run) ; voicemap.next will be referenced by the crawl, vl, and harmonicity heuristics for them to determine their probability fields
      -> step 3: the crawl heuristic derives a matrix probability field, which is then normalized
      -> step 4: the vl heuristic derives a matrix probability field, which is then normalized
      -> step 5: the harmonicity heuristic derives a matrix probability field, which is then normalized
      -> step 6: the normalized matrices are multiplicatively combined
      -> step 7: the rank whose id matches the first element of the quota_queue has its projected_series translated into a size 128 vector (the indices of the size 128 vector corresponding to MIDI notes in the projected_series array's elements get toggled to 1, and the remaining elements stay at 0)
      -> step 8: the size 128 vector is multiplied by the size 128 vector of the next voicemap state, and the result is a size 128 vector which is then normalized and sampled to determine a MIDI note that will be stored into the next voicemap
      -> step 9: the first element of the quota_queue is removed from the quota_queue, and the quota integer reduces by 1; the rank which was just processed also copies that MIDI note into its owned notes, which will be used for visualization
      -> step 10: as voicemap.next has been altered, the algorithm loops from step 3 until the quotahas been reached and the quota_queue is empty
      -> step 11: voicemap.prev is set to voicemap.next, voicemap.next is cleared, and voicemap.prev is sent to treemap.js and tone.js to visualize the notes being played and so the new chord can be played with sine tones; this marks the algorithm's completion, until it is triggered again by a change in the ranks' keypresses

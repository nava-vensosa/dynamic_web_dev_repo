# Debugging / Cleanup

1) There's popping occurring when notes are released -- when notes ramp down from being voiced to not being voiced, make the decay time 18ms
2) If a note is being sustained from voicemap.prev to voicemap.next, its volume should not ramp down and then ramp back up again -- it should just continue voicing out of the speaker it's playing from
3) Currently, a rank's bytes' bands correspond to: bottom 25%, low-mid 25%, high-mid 25%, high 25% of the range between the highpass and lowpass thresholds. I'd like to add a certain window overlap -- the LSB should permit the portion of the valid range that goes from 0%-35%; the second least significant byte should permit the band within the valid range that goes from 18.75%-56.25%; the second most significant byte should permit the band within the valid range from 43.75%-81.25%; the MSB should permit the top 35% of the valid range

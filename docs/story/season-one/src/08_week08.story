# Week 08: "EARN IT AGAIN" (League Game 6). Owner rewrite 2026-10-27, authoritative.
# Training field (Blake absent), development checkpoint, combined team training, weekly minigame (no school
# conversation), home, League Game 6 (Blake still on the team), Blake moves to Next Horizon after the match,
# midseason report and tournament priority.
=== S1_W08_T neutral_pitch v3
System: Week 8. Training field. Sam glances toward the parking lot.
Sam: Blake's late.
Player: Maybe stuck admiring the rankings.
Sam: Hasn't answered the group chat either.
Coach Code: Bring it in. Let's get started.
System: Sam puts the phone away. Blake's spot stays empty.
System: Development checkpoint.
@activity dev_checkpoint
System: Team Training.
Coach Code: Looking early, a useful first touch, a good decision, then movement. Today we connect them.
@activity team_training
Coach Code: One good action doesn't finish your job. Pass it, then become useful again.
@if detail:S1_W08_T=strong
Coach Code: You're connecting the actions. Keep doing it when the pressure changes.
@elif detail:S1_W08_T=execution
Coach Code: You've shown you can do it. Now we work on repeating it.
@elif detail:S1_W08_T=poor_decision
Coach Code: Start with the information. Find the pressure before you rush the next action.
@end
=== S1_W08_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W08_S.activity=crossbar
@activity jungle chose:S1_W08_S.activity=jungle
=== S1_W08_H home_v3 v3
System: Home.
@activity home_hub
=== S1_W08_G neutral_pitch v3
System: League Game 6. Blake is back.
Coach Code: Last league game before the tournament. Play this opponent—not the rankings.
@activity league_match
@activity standings
=== S1_W08_B neutral_pitch v3
System: Blake approaches while you and Sam pack your bags.
Blake: I'm moving to Next Horizon.
Sam: Since when?
Blake: It's sorted. I'm going somewhere that wins.
Player: You practice that line?
System: Blake shoulders the bag and leaves.
Sam: Definitely in a mirror.
@activity blake_transfer
=== S1_W08_E neutral_home v3
System: End of week 8. Midseason report.
@activity week_close
? next_target
* keep | Keep the development target
* tournament | Select a recommended tournament priority

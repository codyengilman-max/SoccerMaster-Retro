# Week 10: "FIX THE WEAK LINK" (League Game 7). Owner rewrite 2026-10-27, authoritative.
# Training field (Code's tournament report, two evidence-backed development needs), target-specific team training,
# weekly minigame (no school conversation), home, League Game 7, week close and next focus.
=== S1_W10_T neutral_pitch v3
System: Week 10. Training field. Code opens the tournament report.
Coach Code: What kept giving you trouble?
@activity tournament_report
? target
* receive_pressure | Receiving under pressure
* support | Support angles
* passing | Passing execution
* defending | Defensive decisions
Coach Code: Good. We've got something specific to work on.
Sam: Can mine be playing better before nine in the morning?
Coach Code: Start by arriving before nine.
System: Team Training.
@if chose:S1_W10_T.target=receive_pressure
Coach Code: Find the pressure early. Let your first touch help with it.
@elif chose:S1_W10_T.target=support
Coach Code: Move where the pass can reach you. Adjust when the picture changes.
@elif chose:S1_W10_T.target=passing
Coach Code: The right option still needs the right weight. Give your teammate a ball they can use.
@elif chose:S1_W10_T.target=defending
Coach Code: Can you win it? If not, slow the attack and protect the dangerous space.
@end
@activity team_training
Coach Code: Don't learn one setup. Learn what to look for.
=== S1_W10_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W10_S.activity=crossbar
@activity jungle chose:S1_W10_S.activity=jungle
=== S1_W10_H home_v3 v3
System: Home.
@activity home_hub
=== S1_W10_G neutral_pitch v3
System: League Game 7.
Sam: Ready to see if the homework worked?
Player: Better than showing my working.
Coach Code: Use it when the moment comes. Don't force it.
@activity league_match
@activity standings
=== S1_W10_E neutral_home v3
System: End of week 10.
@activity week_close
? next_target
* keep | Keep working on this target
* another | Choose another recommended focus

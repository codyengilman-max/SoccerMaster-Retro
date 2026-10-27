# Week 06: "CARRY OR RELEASE?" (League Game 4). Owner rewrite 2026-10-27, authoritative.
# Training-field rankings (Sam's phone, team position + next opponent), carry-or-release team training,
# after-training Blake (dialogue only), weekly minigame (no school conversation), home, League Game 4,
# development checkpoint and next target.
=== S1_W06_T neutral_pitch v3
System: Week 6. At training, Sam opens the team rankings on a phone.
Sam: Here's where we are.
Player: And where we want to be?
Sam: Higher. Very advanced analysis.
@activity team_profile
System: Team Training.
Coach Code: Space ahead. A teammate available. What do you do?
Coach Code: A useful pass might be available now. Carrying might improve the picture. Look at the pressure, the space, and what your teammate can do next.
@activity team_training
Coach Code: Don't wait for a tackle to tell you it was time to pass.
@if detail:S1_W06_T=strong
Coach Code: You used what the defender gave you.
@elif detail:S1_W06_T=pass_weight
Coach Code: Good choice. Now get the weight right.
@elif detail:S1_W06_T=struggled
Coach Code: Look again. What was available before the pressure arrived?
@end
=== S1_W06_A neutral_pitch v3
System: Code finishes giving you feedback. Blake waits until Coach walks away.
Blake: You getting a private lesson or what?
Player: I asked a question. You can do that.
Blake: Don't get comfortable. You're still new.
Player: You keep reminding me.
System: Sam approaches.
Sam: Coming?
Blake: Ask Coach's favorite.
System: Blake grabs a bag and walks off.
Sam: That's a yes. Just with issues.
=== S1_W06_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W06_S.activity=crossbar
@activity jungle chose:S1_W06_S.activity=jungle
=== S1_W06_H home_v3 v3
System: Home.
@activity home_hub
=== S1_W06_G neutral_pitch v3
System: League Game 4.
Coach Code: Carry with a purpose. Pass with a purpose. Then help again.
@activity league_match
@activity standings
=== S1_W06_D neutral_pitch v3
System: Development checkpoint.
@activity dev_checkpoint
Sam: Same target next week?
? next_target
* keep | Keep building this skill
* weakness | Work on a recommended weakness
=== S1_W06_E neutral_home v3
System: End of week 6.
@activity week_close

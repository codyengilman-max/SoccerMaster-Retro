# Week 05: "MAKE THE PASS POSSIBLE" (League Game 3). Owner rewrite 2026-10-27, authoritative.
# School (leaving science), weekly minigame, support-angle team training, assignment choice, home, League Game 3.
=== S1_W05_M neutral_school v3
System: Week 5. School. Sam, Blake, and you leave science.
Sam: That sub was actually baked.
Player: He said, 'Let that sink in,' then stared at the sink.
Blake: I asked to go to the bathroom. He said, 'Good question.'
Sam: Did you go?
Blake: Apparently we're discussing it tomorrow.
=== S1_W05_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W05_S.activity=crossbar
@activity jungle chose:S1_W05_S.activity=jungle
=== S1_W05_T neutral_pitch v3
System: Team Training. Sam has possession. A defender blocks the passing lane to you.
Coach Code: Calling louder won't move the defender. Find an angle.
Coach Code: Far enough to open the lane. Close enough to help. Keep adjusting as the ball and defenders move.
@activity team_training
@if detail:S1_W05_T=moved_defender
Coach Code: You moved a defender. Now see what opened for somebody else.
@end
@if detail:S1_W05_T=passed
Coach Code: Find your next job. Don't stand there admiring it.
@end
? assignment
* across_body | Receiving across the body
* weaker_foot_pass | Passing with the weaker foot
=== S1_W05_H home_v3 v3
System: Home.
@activity home_hub
=== S1_W05_G neutral_pitch v3
System: League Game 3.
Sam: If I'm waving behind a defender?
Player: I'll wave back.
Coach Code: Give the player on the ball an option they can actually use.
@activity league_match
@activity standings
=== S1_W05_E neutral_home v3
System: End of week 5.
@activity week_close

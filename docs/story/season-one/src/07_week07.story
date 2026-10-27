# Week 07: "MORE THAN ONE FOOT" (League Game 5). Owner rewrite 2026-10-27, authoritative.
# School (Blake on the player rankings), weekly minigame, both-feet team training, assignment choice, home, League Game 5.
=== S1_W07_M neutral_school v3
System: Week 7. School. Blake checks the player rankings on a phone. Sam looks over.
Sam: Checking your ranking?
Blake: Checking why everyone's getting excited about theirs.
Player: You could just follow me.
Blake: Let's see that other foot first.
Sam: Weird thing to ask at lunch.
=== S1_W07_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W07_S.activity=crossbar
@activity jungle chose:S1_W07_S.activity=jungle
=== S1_W07_T neutral_pitch v3
System: Team Training. Code sets up a receiving situation with pressure closing one side.
Coach Code: Your favorite foot isn't always the useful one. Open your body. See what's available.
Coach Code: We're building options. Don't force the weaker foot when it makes no sense—but don't lose a good option because you're afraid to use it.
@activity team_training
@if detail:S1_W07_T=strong
Coach Code: You kept the option open. That's why we practice both.
@elif detail:S1_W07_T=pass_weight
Coach Code: Right idea. Slow the repetition down and clean it up.
@elif detail:S1_W07_T=struggled
Coach Code: You took an extra touch to get comfortable. What closed while you waited?
@end
? assignment
* weaker_receive | Weaker-foot receiving and control
* weaker_pass | Weaker-foot short passing
=== S1_W07_H home_v3 v3
System: Home.
@activity home_hub
=== S1_W07_G neutral_pitch v3
System: League Game 5.
Sam: Both feet coming today?
Player: Depends how this warm-up goes.
Coach Code: Use the option the game gives you. Help each other.
@activity league_match
@activity standings
=== S1_W07_E neutral_home v3
System: End of week 7.
@activity week_close

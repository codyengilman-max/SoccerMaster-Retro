# Week 09: "HOW GOOD ARE WE?" (AZ Showcase). Owner rewrite 2026-10-27, authoritative.
# School (Sam's phone, the actual group and an opponent profile), opponent-adaptation team training, priority
# choice, weekly minigame, home tournament preparation with Mom, the AZ Showcase (three group games, the final
# only for a group winner), tournament review. Tournament results never change league points.
=== S1_W09_M neutral_school v3
System: Week 9. School. Sam opens the AZ Showcase field on a phone.
Sam: Two out-of-state teams in our group.
Player: Any good?
Sam: Let's check before you promise a hat trick.
@activity tournament_group
Player: Rankings don't play the game.
Sam: Good. Mine has terrible stamina.
=== S1_W09_T neutral_pitch v3
System: Team Training.
Coach Code: New opponents. Same job: find out what's available.
Coach Code: If they press, look for the option their movement opens. If they stand off, use the space. Don't decide before you've looked.
@activity team_training
? priority
* receive_pressure | Receiving under pressure
* support | Moving to support
=== S1_W09_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W09_S.activity=crossbar
@activity jungle chose:S1_W09_S.activity=jungle
=== S1_W09_H home_v3 v3
System: Home. Tournament preparation.
Mom: Packed?
Player: Boots, kit, shin guards.
Mom: Water?
Player: That was the next word.
@activity home_hub
=== S1_W09_ARRIVE neutral_pitch v3
System: Saturday. The AZ Showcase. Eight teams, two groups of four.
Coach Code: Three games to earn another one. Focus on the game in front of you.
=== S1_W09_G1 neutral_pitch v3
System: AZ Showcase, group game 1 of 3. Saturday.
@activity tournament_match
@if result:S1_W09_G1=WIN
Coach Code: Good result. What worked that we can use again?
@elif result:S1_W09_G1=DRAW
Coach Code: Look at what they took away. Where was the next option?
@elif result:S1_W09_G1=LOSS
Coach Code: Find one thing we can change. Take it into the next game.
@end
=== S1_W09_G2 neutral_pitch v3
System: AZ Showcase, group game 2 of 3. Saturday.
@activity tournament_match done:S1_W09_G1
@if result:S1_W09_G2=WIN
Coach Code: Good result. What worked that we can use again?
@elif result:S1_W09_G2=DRAW
Coach Code: Look at what they took away. Where was the next option?
@elif result:S1_W09_G2=LOSS
Coach Code: Find one thing we can change. Take it into the next game.
@end
=== S1_W09_G3 neutral_pitch v3
System: AZ Showcase, group game 3 of 3. Sunday.
@activity tournament_match done:S1_W09_G2
@if detail:S1_W09_G3=final
@if result:S1_W09_G3=WIN
Coach Code: Good result. What worked that we can use again?
@elif result:S1_W09_G3=DRAW
Coach Code: Look at what they took away. Where was the next option?
@elif result:S1_W09_G3=LOSS
Coach Code: Find one thing we can change. Take it into the next game.
@end
@end
=== S1_W09_G4 neutral_pitch v3
System: AZ Showcase final. Sunday.
@activity tournament_match detail:S1_W09_G3=final
=== S1_W09_E neutral_home v3
System: End of week 9. Tournament review. Tournament results stay out of the league table.
@activity week_close

# Week 09: Everybody Has a Badge. Scottsdale Starter Cup (working fictional name): three group games,
# then the championship (top two) or placement game (other two). Results never enter the league.
=== S1_W09_M aquarium
System: Week 9, Monday. Everybody Has a Badge.
Cloudy: A whole tournament? I packed for a weekend once. Same water, different corner.
Player: They all look like they belong.
Cloudy: Matching bags are impressive. Let's see what happens when the ball moves.
? feeling
* curious | I'm curious.
  Cloudy: Curious is great. Pick one thing to prepare, and let curiosity do the rest.
* intimidated | I'm intimidated.
  Cloudy: Fair. Prepare one practical thing. Intimidation hates preparation.
* eager | I can't wait.
  Cloudy: Eager! Pack water. Eager gets thirsty.
=== S1_W09_S neutral_school
System: The class is planning a small outing on Saturday. You'll be at the tournament that day.
Jordan: You're coming, right? Oh. The tournament.
? outing
* catch_up | Wish them a good time and suggest a catch-up
  Player: Have a great time. Can we hang out next week?
  Jordan: Deal. Next week.
* small_task | Ask for a small task you can do beforehand
  Player: Can I help with something before Saturday? Like the snack list?
  Jordan: Snack list. Done by Thursday?
* decline | Decline more plans this week
  Player: I can't add anything this week. Sorry.
  Jordan: It's okay. I'll miss you there, though.
Riley: I'm going on the outing. Good luck at the tournament!
=== S1_W09_C neutral_pitch
Coach Code: A new badge doesn't change the rules of the game. Watch the players.
? code
* first_opponent | Ask about the first opponent
  Coach Code: First game first. The final isn't in this drill.
* recovery | Plan between-game recovery
  Coach Code: Water, shade, food, and sit down. Recovery is part of the game.
* role | Clarify your role
  Coach Code: Same role as the league. Bring the task back to something you can actually see.
@activity team_training
=== S1_W09_F aquarium
Cloudy: Tell me about training. Then we can panic about the bag you haven't packed.
? reflection
* worked | Training went well.
  Cloudy: Good. Bring it with you.
* difficult | Training was hard.
  Cloudy: Then rest tonight. Hard and tired is a bad combo.
* not_yet | I don't want to unpack it yet.
  Cloudy: Unpacking is for later. Packing is for now.
? preparation
* pack | Pack and confirm the plan for Saturday
  Cloudy: Then inspect your astonishingly organised bag.
* cue | Review one training cue
  Cloudy: One cue. Small and clear.
* school_task | Finish your school task before the deadline
  Cloudy: Promises first. Then the tournament.
=== S1_W09_ARRIVE neutral_pitch
System: Saturday. The Scottsdale Starter Cup. Four teams, matching bags, lots of noise.
Coach Code: Three group games. Then the top two play the championship, and the other two play for third.
=== S1_W09_G1 neutral_pitch
System: Starter Cup, group game 1.
@activity tournament_match
@if result:S1_W09_G1=WIN
Coach Code: A win to start. One game at a time.
@elif result:S1_W09_G1=DRAW
Coach Code: A draw to start. Still all to play for.
@elif result:S1_W09_G1=LOSS
Coach Code: A loss to start. Two more group games. Reset.
@else
Coach Code: That game wasn't finished. The tournament can't continue without a result, so it ends here, unfinished. No result is invented.
@end
=== S1_W09_G2 neutral_pitch
System: Rest break. Shade, water, food.
@activity tournament_match done:S1_W09_G1
@if done:S1_W09_G2
@if chose:S1_W06_C.joint=confirm
Alex: Thursday's practice helped. That pass in the second half, we'd tried it.
@else
Alex: What did you see on their left side? I think there's space there.
@end
@if chose:S1_W08_S.sam=public|private|adult
Sam: Nice game. Seriously.
@end
@end
=== S1_W09_G3 neutral_pitch
System: Rest break. Group game 3 is next.
@activity tournament_match done:S1_W09_G2
@if detail:S1_W09_G3=final
Coach Code: Group stage done. We're in the championship game.
@elif detail:S1_W09_G3=placement
Coach Code: Group stage done. We play the placement game for third.
@end
=== S1_W09_G4 neutral_pitch
System: One more rest break. Last game of the day.
@activity tournament_match done:S1_W09_G3
@if detail:S1_W09_G4=champion
Coach Code: Champions of the Starter Cup. You earned this one together.
@elif detail:S1_W09_G4=shared_champion
Coach Code: The final finished level, and there's no shoot-out at this cup, so the title is shared. Co-champions.
@elif detail:S1_W09_G4=runner_up
Coach Code: Runners-up. Second of four is a real achievement, even if it hurts right now.
@elif detail:S1_W09_G4=third
Coach Code: Third place. We won the placement game. That's real.
@elif detail:S1_W09_G4=shared_third
Coach Code: The placement game finished level, so third place is shared.
@elif detail:S1_W09_G4=fourth
Coach Code: Fourth today. We'll take the lessons, not the label.
@else
Coach Code: The tournament didn't finish, so there's no final place. Nothing is invented.
@end
@activity standings
=== S1_W09_E neutral_home
System: The long drive home. Tournament results stay out of the league table.
@activity week_close

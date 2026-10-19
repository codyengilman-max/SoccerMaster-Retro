# Week 11: The Second Test. Desert Lights Cup (working fictional name), same format as week 9.
=== S1_W11_M aquarium
System: Week 11, Monday. The Second Test.
Cloudy: You've been to a tournament now. You're qualified to complain about folding chairs.
Cloudy: What do you know this time that you didn't know before?
? lesson
* soccer | A real soccer lesson
  Cloudy: Then use it on Saturday. That's what lessons are for.
* logistics | A logistics lesson
  Cloudy: Snacks, shade, sit down between games. Very professional.
* unsure | I still don't know what to expect.
  Cloudy: Honest. Nobody does. That's why they play the games.
=== S1_W11_S neutral_school
System: Riley is rehearsing a school presentation while everyone else talks about the tournament.
Riley: Could you listen to my practice run? It's five minutes.
? riley
* listen | Listen to the practice run
  Riley: Thanks. Was the middle part too fast?
  @if chose:S1_W04_S.riley_route=crush
  Player: The drawings are really good. You're really good at this.
  Riley: ...Thanks. That helps.
  @else
  Player: A little fast. The drawings are great, though.
  Riley: Thanks. That helps.
  @end
* short_slot | Offer a shorter slot tomorrow
  Player: I've got two minutes tomorrow before class. Is that enough?
  Riley: Two minutes works. Thanks.
* cant_help | Admit you can't help this week
  Player: I can't this week. I'm sorry.
  Riley: That's okay. Jordan said they'd listen.
=== S1_W11_C neutral_pitch
Coach Code: Repeating the same plan isn't the same as learning. Notice what this opponent gives you.
? code
* switch | Ask about changing the point of attack
  Coach Code: If one side is crowded, the other side is usually empty. Look for it.
* outlet | Ask about protecting a dangerous outlet
  Coach Code: Know where their quick player is when we have the ball.
* first_action | Ask about adapting your role's first action
  Coach Code: If they press high, the first pass has to be simpler. If they sit off, take a touch.
Coach Code: If the first plan fails, reconnect before forcing it again.
@activity team_training
=== S1_W11_F aquarium
Cloudy: I have developed a second strategy: swim around the rock. Critics call it growth.
? reflection
* adapted | Describe something you adapted
  Cloudy: Adapting is the whole trick. Nice.
* question | Describe an unanswered question
  Cloudy: Keep the question. Saturday might answer it.
? preparation
* two_cues | A main cue plus one backup
  Cloudy: Plan A, plan B. Very fancy.
* logistics | Confirm the logistics
  Cloudy: Bag, water, ride. Checked.
* rest | Take the agreed recovery time
  Cloudy: Rest. The best kind of preparation nobody photographs.
=== S1_W11_ARRIVE neutral_pitch
System: Saturday. The Desert Lights Cup.
@if detail:S1_W09_G4=champion|shared_champion
Coach Code: Last time we left with a trophy. This is a different day. Same rules.
@elif detail:S1_W09_G4=runner_up|third|shared_third|fourth
Coach Code: We learned things at the Starter Cup. Let's use them.
@else
Coach Code: New tournament, new day.
@end
Coach Code: Three group games, then the championship or the placement game.
=== S1_W11_G1 neutral_pitch
System: Desert Lights Cup, group game 1.
@activity tournament_match
@if done:S1_W11_G1
Coach Code: One useful adjustment for the next game. What did you see?
@else
Coach Code: That game wasn't finished. The tournament ends here, unfinished. No result is invented.
@end
=== S1_W11_G2 neutral_pitch
System: Rest break.
@activity tournament_match done:S1_W11_G1
@if done:S1_W11_G2
Sam: Good game. I counted three of your passes that set us up.
@end
=== S1_W11_G3 neutral_pitch
System: Rest break. Group game 3 is next.
@activity tournament_match done:S1_W11_G2
@if detail:S1_W11_G3=final
Coach Code: We're in the championship game.
@elif detail:S1_W11_G3=placement
Coach Code: We play the placement game for third.
@end
=== S1_W11_G4 neutral_pitch
System: Last rest break of the day.
@activity tournament_match done:S1_W11_G3
@if detail:S1_W11_G4=champion
Coach Code: Desert Lights Cup champions. Earned, not given.
@elif detail:S1_W11_G4=shared_champion
Coach Code: A level final and no shoot-out here, so the title is shared. Co-champions.
@elif detail:S1_W11_G4=runner_up
Coach Code: Runners-up. A real result. Hold your heads up.
@elif detail:S1_W11_G4=third
Coach Code: Third place. We won the placement game.
@elif detail:S1_W11_G4=shared_third
Coach Code: The placement game finished level. Third place is shared.
@elif detail:S1_W11_G4=fourth
Coach Code: Fourth today. Specific lessons, no labels.
@else
Coach Code: The tournament didn't finish, so there's no final place.
@end
@activity standings
=== S1_W11_E neutral_home
System: Home again. No scouting offers, no shortcuts: just the season.
@activity week_close

# Week 13: They Know Your Name Now. League game 7; second league block begins.
=== S1_W13_M aquarium
System: Week 13, Monday. They Know Your Name Now.
Cloudy: I remain available to pronounce your name correctly. My rates are reasonable.
Cloudy: What do you want to do with the chances you have?
? chances
* w12_goal | Chase the goal from last week
  Cloudy: Good. Same goal, six games to show it.
* new_goal | Set a specific new goal
  Cloudy: New goal. Write it where you'll see it.
* still_waiting | I'm still trying to get a chance.
  Cloudy: Then keep being ready. Chances like ready people.
=== S1_W13_S recess
@if done:S1_W09_G4
Blake: The tournament was a lucky stretch. Prove it. Another crossbar challenge, same rules.
@elif result:S1_W03_G=WIN|DRAW
Blake: Okay, you've played some games. Prove it in the schoolyard. Crossbar, same rules.
@else
Blake: You keep showing up. Fine. Crossbar challenge, same rules?
@end
? challenge
* accept | Accept the challenge
  Player: Same rules. Let's go.
* equal_teams | Suggest equal teams for a normal recess game
  Player: How about equal teams and just play?
  Blake: ...Fine. Equal teams.
  System: The recess game is just a game. Nobody keeps score for the season.
* season_first | Say the season comes first
  Player: The season's my priority right now.
  Blake: Whatever.
  System: Declining doesn't erase anything you've already shown.
@activity crossbar chose:S1_W13_S.challenge=accept
@if result:S1_W13_S=WIN
Blake: ...Again tomorrow.
@elif result:S1_W13_S=DRAW
Blake: Even. Annoying.
@elif result:S1_W13_S=LOSS
Blake: Still got it.
@end
=== S1_W13_C neutral_pitch
Coach Code: Whatever people expect now, the next game still needs real decisions.
? code
* responsibility | Ask about a new responsibility
  Coach Code: Responsibility comes from what I see. Your current job first.
* consistency | Ask about consistency
  Coach Code: Do the useful thing every time, especially the boring time.
* keep_task | Keep your current task
  Coach Code: Good. Be available again after the first action.
Coach Code: Yesterday's answer may not fit today's picture.
@activity team_training
=== S1_W13_F aquarium
Cloudy: Fame hasn't changed me. I was difficult before the tank got lights.
? reflection
* training | Talk about training
  Cloudy: Good. Training is where the boring magic happens.
* blake | Talk about Blake
  Cloudy: Blake keeps changing the argument. You don't have to keep answering it.
? preparation
* follow_goal | Follow your goal
  Cloudy: Goal locked in. Go.
* reset | Reset after a difficult action
  Cloudy: Breath, look, next job.
* team_cue | Share one useful cue with a teammate
  Cloudy: Teamwork through words. Very advanced.
=== S1_W13_G neutral_pitch
System: League game 7. The second block of the league begins.
@activity league_match
@if result:S1_W13_G=WIN
Coach Code: A win to start the run-in. Nothing resets. Earned progress stays.
@elif result:S1_W13_G=DRAW
Coach Code: A draw. Five more league games.
@elif result:S1_W13_G=LOSS
Coach Code: A loss. Your growth and the earlier results stay. Next game.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W13_E neutral_home
System: Weekend.
@activity week_close

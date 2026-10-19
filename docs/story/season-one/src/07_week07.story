# Week 07: Who Gets the Credit? League game 5.
=== S1_W07_M aquarium
System: Week 7, Monday. Who Gets the Credit?
Cloudy: I invented a brilliant move. Turned left, hit glass. Still working on the second part.
Player: People only notice the finish.
Cloudy: Who helped it happen?
? credit
* teammate | Name a teammate's contribution
  Cloudy: See? You noticed. That's how the credit gets shared.
* overlooked | Talk about being overlooked
  Cloudy: Being overlooked stings. The work still counts, even unseen.
* school | Talk about a school worry instead
  Cloudy: Sure. I have room for more than soccer. Mostly water, but room.
=== S1_W07_S neutral_school
System: Riley's illustrated notice is up on the school board. Nearby, a group is arguing about soccer.
@if chose:S1_W04_S.lunch=sit|one_idea
Riley: You said stitching lines. I added them. Look.
@else
Riley: Hey. Have you seen the notice? I drew it.
@end
? riley
* listen | Stay and listen to Riley
  Player: Tell me how you made it.
  Riley: It took four tries. The ball kept looking like a potato.
  @if chose:S1_W04_S.riley_route=crush
  System: You notice you've been smiling the whole time.
  @end
* later | Join the group, but set a real time to talk later
  Player: Can I see it properly at lunch tomorrow?
  Riley: Okay. Tomorrow at lunch.
* distracted | Say you're distracted
  Player: Sorry, my head's somewhere else today.
  Riley: That's fine. It'll be up all week.
=== S1_W07_C neutral_pitch
Coach Code: The person who gets the final touch isn't always the person who made the chance.
? code
* move_defender | Ask about moving a defender
  Coach Code: Run to pull a defender with you. Space appears behind them.
* return_pass | Ask about the return pass
  Coach Code: Pass and offer it straight back. Make the defender choose.
* cover_attack | Ask about covering the attack
  Coach Code: Someone has to stay ready behind the attack. Sometimes that's you.
Coach Code: And when the shot is the best option, shoot. That's not selfish, that's correct.
@activity team_training
=== S1_W07_F aquarium
Cloudy: Today I created space by moving behind a rock. Then everyone forgot I was there.
? reflection
* helpful | Describe a helpful action
  Cloudy: That's the kind of thing scoreboards forget and teammates remember.
* hard_decision | Describe a difficult decision
  Cloudy: Hard decisions mean the game is asking real questions. Good.
* riley_art | Talk about Riley's drawing
  Cloudy: The potato that became a ball. Art is hard. So is soccer.
? preparation
* spot_opening | Recognise an opening
  Cloudy: Look up before the ball arrives. Openings are shy.
* talk_early | Communicate early
  Cloudy: Early words. Calm feet.
* ask_situation | Ask Code about a specific moment
  Cloudy: One moment, one question. Very efficient.
=== S1_W07_G neutral_pitch
System: League game 5. Kickoff.
@activity league_match
@if result:S1_W07_G=WIN
Coach Code: A win. The credit belongs to more than one person, and that includes you.
@elif result:S1_W07_G=DRAW
Coach Code: A draw. The useful work still happened.
@elif result:S1_W07_G=LOSS
Coach Code: A loss. Your growth is still your growth. We keep going.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W07_E neutral_home
System: Weekend.
@activity week_close

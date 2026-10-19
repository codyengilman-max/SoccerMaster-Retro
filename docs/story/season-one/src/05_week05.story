# Week 05: The Work Nobody Sees. League game 3.
=== S1_W05_M aquarium
System: Week 5, Monday. The Work Nobody Sees.
Cloudy: I've completed six laps before breakfast. Nobody applauded. The snail filed a noise complaint.
Player: What if all this work changes nothing?
Cloudy: Let's look for one thing that is different.
? progress
* improved | Name one real improvement
  Cloudy: That's evidence. Not a feeling, a fact. Keep it.
* still_hard | Name something still difficult
  Cloudy: Then that's where the next work goes. Good to know where.
* cant_tell | "I can't tell yet."
  Cloudy: Fair. Sometimes progress hides. We'll look again next week.
=== S1_W05_S neutral_school
System: Jordan's display is up on the classroom wall.
@if chose:S1_W03_F.project_check=complete
System: A classmate says the display looks great.
Jordan: The captions were done by our new teammate. On time, too.
@elif chose:S1_W03_F.project_check=renegotiate
Jordan: You did the revised part we agreed on. Thanks for telling me early.
@elif chose:S1_W03_F.project_check=cancel
Jordan: The captions didn't get done. I finished them myself on Thursday night.
@elif chose:S1_W03_S.project=decline
System: The display is finished. You weren't part of this one, and that's fine. You said so honestly.
@else
Jordan: The display is done.
@end
? jordan
* talk | Talk about what happened, privately
  Player: Can we talk about the project for a second?
  Jordan: Sure. I'd rather hear it from you.
* next_help | Offer a next contribution you can manage
  Player: Next time, I can do one part, and I'll finish it.
  Jordan: One part. Okay. We'll see.
* acknowledge | Just say Jordan's work looks good
  Player: It looks really good, Jordan.
  Jordan: Thanks. It took a while.
=== S1_W05_C neutral_pitch
Coach Code: Some of your best work won't be near the ball. I will be looking.
? code
* cover | Ask for a cover cue
  Coach Code: When a teammate steps, cover the space they leave behind.
* support_angle | Ask for a support-angle cue
  Coach Code: Make an angle so the ball carrier can see you and the ball at the same time.
* communicate | Ask for an early communication cue
  Coach Code: Talk early. One clear word before the ball arrives.
Coach Code: Make the useful run, even if the pass goes elsewhere.
@activity team_training
=== S1_W05_F aquarium
Cloudy: I noticed something today. Then I forgot it. Fish. You tell me.
? reflection
* observed | Describe something you saw happen
  Cloudy: That's something you actually saw. Evidence. Nice.
* impression | Describe how it felt
  Cloudy: That's a feeling, which is real too. We'll check it against the game.
* not_yet | I don't want to unpack it yet.
  Cloudy: Okay. Bubbles only.
? preparation
* repeat_move | Repeat one helpful movement
  Cloudy: Do it again. The good stuff gets better when it's boring.
* ask_feedback | Ask Code about a job nobody notices
  Cloudy: Ask. Coaches see more than the ball.
* recovery_plan | Make a simple plan for after a mistake
  Cloudy: Mistake, breath, next job. Done.
=== S1_W05_G neutral_pitch
System: League game 3. Kickoff.
@activity league_match
@if result:S1_W05_G=WIN
Coach Code: A win. Some of what made it happen wasn't near the ball. I saw it.
@elif result:S1_W05_G=DRAW
Coach Code: A draw. Not everything showed on the scoreboard. Keep going.
@elif result:S1_W05_G=LOSS
Coach Code: A loss. A small step forward can still happen in a defeat. Let's find it.
@else
Coach Code: Not finished. No result, nothing to grade. It stays pending.
@end
@activity standings
=== S1_W05_E neutral_home
System: Weekend.
@activity week_close

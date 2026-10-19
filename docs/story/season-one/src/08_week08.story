# Week 08: The Cost of Being Seen. League game 6; the first league block closes.
=== S1_W08_M aquarium
System: Week 8, Monday. The Cost of Being Seen.
Cloudy: Any new fans?
? fans
* some | A few people know my name now.
  Cloudy: Excellent. Mine is a filter. Very consistent support.
* none | Not really.
  Cloudy: Mine is a filter. Very consistent support. You can borrow it.
Cloudy: What do you want people to know about you besides a score?
? known_for
* reliable | That I'm reliable.
  Cloudy: Reliable. People notice that slowly, then all at once.
* creative | That I'm creative.
  Cloudy: Creative. Turning left into glass counts, right?
* figuring | I'm still figuring it out.
  Cloudy: Good answer. You don't need a label yet.
=== S1_W08_S neutral_school
System: At lunch, Sam starts explaining an idea for the class games day.
System: Blake's group talks over Sam and waves you over to their table instead.
? sam
* public | Ask Sam to finish the idea, out loud
  Player: Wait, Sam wasn't finished. Go on.
  Sam: ...Okay. Relay races, but with a ball.
  System: Blake's table stops waving you over.
* private | Talk to Sam privately afterwards
  Player: Your idea was good. I wanted to hear the rest.
  Sam: Thanks. It's fine. It's always like that.
* adult | Ask a teacher to help, since it keeps happening
  System: You tell a teacher that Sam keeps being talked over. The teacher thanks you and says they'll keep an eye on lunch.
  Sam: You didn't have to do that. ...Thanks.
=== S1_W08_C neutral_pitch
Coach Code: Six games will tell us some things. They won't tell us everything.
? code
* baseline | Compare one skill with preseason
  Coach Code: Check your skill levels in Career. That's the honest comparison.
* weakness | Ask about a remaining weakness
  Coach Code: Shape after we lose the ball. Recover first, then decide.
* tournament | Ask what the team needs at the tournament
  Coach Code: Three games in a day. Recovery between games matters as much as effort.
Coach Code: After the ball goes, your decision still matters. If you can't win it, slow it and help us recover.
@activity team_training
=== S1_W08_F aquarium
Cloudy: Halfway through the league games. Please collect your imaginary half-trophy.
? reflection
* proud | Talk about something you're proud of
  Cloudy: Keep it. Proud is allowed.
* uneven | Talk about how uneven it's been
  Cloudy: Uneven is normal. Seasons are lumpy.
* not_yet | I don't want to unpack it yet.
  Cloudy: Okay. I'll hold the half-trophy.
? preparation
* close_game | Close the game responsibly
  Cloudy: Last minutes, simple choices.
* transition | Watch for danger when we lose the ball
  Cloudy: Lose it, react. The first two seconds matter most.
* simplify | Keep the first action simple under pressure
  Cloudy: Simple first touch, then the clever stuff.
@if chose:S1_W08_S.sam=private|public
Cloudy: And Sam. Whatever you said to Sam, don't forget it over the tournament.
@end
=== S1_W08_P neutral_home
System: Mom is planning the tournament weekend: the drive, the early start, the long day.
Mom: This takes planning. That's our job to discuss with you, not a bill you pay with goals.
? cost
* manageable | Ask what's manageable
  Mom: The early start is fine. The drive home will be tired. We'll pack snacks.
* responsible | Admit you feel responsible
  Mom: You're not responsible for this. We chose it together, and we want to.
* help | Help with a practical task
  Player: I'll pack the bag the night before.
  Mom: That really helps. Thank you.
Mom: Your results don't buy anything from me. You already have all of it.
=== S1_W08_G neutral_pitch
System: League game 6. Kickoff. The first block of the league ends today.
@activity league_match
@if result:S1_W08_G=WIN
Coach Code: A win to close the first half of the league. Expectations will rise. That's okay.
@elif result:S1_W08_G=DRAW
Coach Code: A draw to close the first block. Uneven, but honest.
@elif result:S1_W08_G=LOSS
Coach Code: A loss to close the first block. We'll stick together and get specific.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W08_E neutral_home
System: Weekend. Next week: the Scottsdale Starter Cup.
@activity week_close

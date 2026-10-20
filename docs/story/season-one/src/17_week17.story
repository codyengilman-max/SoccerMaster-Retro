# Week 17: One More Week. League game 11.
=== S1_W17_M aquarium
System: Week 17, Monday. One More Week.
Cloudy: Nearly the last week. I shall miss your concise three-hour summaries.
Player: Have I changed?
Cloudy: Pick something from the first week. You tell me.
? changed
* soccer | A soccer difference
  Cloudy: You can see it too. Good.
* relationship | A relationship change
  Cloudy: People. The best part, mostly.
* unfinished | Something still difficult
  Cloudy: Still difficult is honest. Not everything finishes in a season.
=== S1_W17_S neutral_school
@if chose:S1_PRO_DEPART.phone=photo
System: You show Jordan the mountain photo from moving day.
@else
System: You show Jordan a photo from the old neighbourhood.
@end
Jordan: How is it there now?
? old_new
* good | Describe something good
  Jordan: Sounds nice. Here's nice too, though. Sometimes.
* hard | Admit it's still hard
  Jordan: That makes sense. You don't have to pick one place.
* funny | Share something funny
  Jordan: Ha. Tell me the full version at lunch.
@if chose:S1_W16_S.casey_repair=invite
Casey: Thanks for asking me last week. The game was fun.
@end
=== S1_W17_C neutral_pitch
Coach Code: Prepare for the game we have, not the ending you are imagining.
? code
* existing | Keep the existing task
  Coach Code: Good.
* adjust | One small adjustment
  Coach Code: Small adjustments, real games.
* next_fixture | Ask about the next opponent
  Coach Code: Simple doesn't mean passive. Find the useful advantage.
@activity team_training
=== S1_W17_F aquarium
Cloudy: I have hidden the imaginary trophy until you finish this week's actual job.
? reflection
* worked | Training went well.
  Cloudy: Good.
* difficult | Training was difficult.
  Cloudy: One more week to work on it.
? preparation
* logistics | Prepare equipment and logistics
  Cloudy: Bag, boots, water.
* cue | Review one cue
  Cloudy: One cue.
* calm | A calm evening
  Cloudy: Calm evening. Excellent choice.
=== S1_W17_G neutral_pitch
System: League game 11. Kickoff.
@activity league_match
@if result:S1_W17_G=WIN
Coach Code: A win. One league game left.
@elif result:S1_W17_G=DRAW
Coach Code: A draw. One league game left.
@elif result:S1_W17_G=LOSS
Coach Code: A loss. One league game left, and it still matters.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W17_E neutral_home
System: Weekend. Next week: the last league game.
@activity week_close

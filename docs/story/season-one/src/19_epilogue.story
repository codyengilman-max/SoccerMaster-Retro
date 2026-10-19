# Season ending (outside the weekly slots). The final standings screen shows the true record; the
# layers below close separately and never replace the recorded results.
=== S1_END_FIELD neutral_pitch
System: Final whistle on the season.
@activity standings
@if done:S1_W18_G
Coach Code: Twelve league games, two tournaments. The table is the table. I saw real contributions from you this season.
@else
Coach Code: Some games are still unplayed, so the season is incomplete. I'd need more evidence before saying more.
@end
@if chose:S1_W14_S.alex=ask|code_said|ask_together
Alex: You made it hard for me. In a good way. I still want that spot next year.
@else
Alex: Good season. I'm still coming for your spot.
@end
Sam: I led the overlap drill twice. Did you see?
@if chose:S1_W04_S.riley_route=crush
@if chose:S1_W16_S.riley=honest|slower
Riley: See you at lunch Monday?
@else
Riley: Good season. See you around.
@end
@else
Riley: Good season, friend.
@end
=== S1_END_AQUARIUM aquarium
Player: So, am I different?
Cloudy: You ask harder questions now. Very inconvenient for a fish.
? remembered
* first_recess | The first recess
  Cloudy: The occupied goal. You came back to it.
* tournament | A tournament
  @if detail:S1_W09_G4=champion|shared_champion
  Cloudy: The Starter Cup. A trophy, and you were part of it.
  @elif detail:S1_W11_G4=champion|shared_champion
  Cloudy: The Desert Lights Cup. You were part of that trophy.
  @else
  Cloudy: The tournaments. Long days, real games.
  @end
* people | The people
  Cloudy: Jordan's directions. Sam's ideas. Coach Code's questions. Mom's car snacks.
Cloudy: What are you taking into next season?
? next_season
* learning | A learning goal
  Cloudy: Write it on the glass. I'll guard it.
* relationship | A relationship to care for
  Cloudy: Good. People need tending, like fish.
* question | A new question
  Cloudy: My favourite thing. A question.
System: Season One is complete. Next season isn't built yet: no U12 campaign, transfer or tournament place is promised.

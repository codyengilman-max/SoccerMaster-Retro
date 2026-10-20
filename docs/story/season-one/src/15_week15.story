# Week 15: Make Room. League game 9. Casey is a new fictional classmate (no portrait supplied).
=== S1_W15_M aquarium
System: Week 15, Monday. Make Room.
Cloudy: A new fish would have to earn my respect. First test: don't eat my lunch.
Player: That's your whole plan?
Cloudy: I'm revising it. Remember your first recess?
? first_recess
* goal | The occupied goal
  @if chose:S1_W02_S.audience=refuse
  Cloudy: Blake wanted an audition. You walked away instead.
  @elif done:S1_W02_S
  Cloudy: Blake picked the audience. You put the ball back on the mark.
  @else
  Cloudy: You walked away and found Jordan.
  @end
* sam_silent | Sam looking away
  Cloudy: Sam saw it and looked away. Sometimes people are scared too.
* first_help | The first person who helped
  Cloudy: Directions first. Friendship later. Jordan was right.
=== S1_W15_S recess
System: Recess. A new kid, Casey, walks up to the schoolyard goal.
Casey: Is there room for one more?
System: A couple of players glance at you.
? casey
* rotation | Suggest a fair rotation
  Player: Next goal, one player rotates out. Casey's in.
  Casey: Thanks.
* other_game | Invite Casey into a separate game
  Player: Want to pass with me by the wall?
  Casey: Sure!
* ask_help | Ask someone else to help organise it
  Player: Sam, can you help sort the teams?
  Sam: Yeah. Casey, you're with us.
* nothing | Do nothing
  System: Nobody answers. Casey waits, then walks toward another group.
  Sam: That's what happened to you. Remember?
=== S1_W15_C neutral_pitch
Coach Code: Making a teammate useful starts with noticing what they can do.
Sam: What if we try the overlap? I go outside, you hold it.
? code
* support_angle | Improve a support angle
  Coach Code: Good. Give Sam an angle to find you.
* clear_call | Make a clearer call
  Coach Code: A loud call is only helpful if the option is real.
* partner_view | Ask Sam's view
  Sam: I'd go earlier. Before the defender turns.
  Coach Code: Listen to that.
@activity team_training
=== S1_W15_F aquarium
Cloudy: Did you become the welcoming committee or the keeper of the imaginary gate?
? reflection
* casey | Talk about Casey
  @if chose:S1_W15_S.casey=nothing
  Cloudy: How do you think Casey felt? You don't have to answer out loud.
  @else
  Cloudy: What do you think it changed for Casey?
  @end
* skip | I'd rather not talk about it.
  Cloudy: Okay.
* training | Talk about training
  Cloudy: Sam led part of it, didn't they? Good.
? preparation
* teammate | Notice an available teammate
  Cloudy: Look up. Someone's free.
* trust | Trust the agreed role exchange
  Cloudy: Trust it. You practised it.
* objective | Concentrate on your own goal
  Cloudy: Goal first. Very focused.
=== S1_W15_G neutral_pitch
System: League game 9. Kickoff.
@activity league_match
@if result:S1_W15_G=WIN
Coach Code: A win. Your calls helped, armband or not.
@elif result:S1_W15_G=DRAW
Coach Code: A draw. Good communication out there.
@elif result:S1_W15_G=LOSS
Coach Code: A loss. Some of the talking helped. We'll build on it.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W15_E neutral_home
System: Weekend.
@activity week_close

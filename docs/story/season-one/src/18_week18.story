# Week 18: A Place You Earn. League game 12 and season closure.
=== S1_W18_M aquarium
System: Week 18, Monday. A Place You Earn.
Cloudy: Season finale. I wore my formal stripes.
Player: You always wear those.
Cloudy: A commitment to excellence.
Cloudy: What did you need to hear when you first got here?
? needed
* improve | "You can improve."
  Cloudy: Carry that into this week. Not a prediction. Just a thought.
* not_alone | "You don't have to face everything alone."
  Cloudy: Carry that into this week.
* teammate | "Decide what kind of teammate to be."
  Cloudy: Carry that into this week.
=== S1_W18_S recess
System: Recess, back at the schoolyard goal from week 1.
@if result:S1_W13_S=WIN
Blake: You're playing?
@elif chose:S1_W13_S.challenge=equal_teams
Blake: Next game's starting. Equal teams.
@else
Sam: Next game's starting, if you want in.
@end
@if chose:S1_W15_S.casey=rotation|other_game|ask_help
Casey: Hey! Over here.
@elif chose:S1_W16_S.casey_repair=invite
Casey: ...Hi. Are we rotating?
@else
System: Casey watches from the side, still wary.
@end
? goal_again
* make_room | Make room for Casey
  Player: Casey, you're in. I'll rotate out first.
* rotation | Join the fair rotation
  System: You join the rotation. Everyone gets a turn.
* talk_first | Talk with Sam and Jordan before playing
  Jordan: Big game this weekend?
  Sam: You'll be fine. Or you won't, and we'll still be here.
=== S1_W18_C neutral_pitch
Coach Code: I remember what you were working on when you arrived. Today, give this team what you can give it now.
? code
* improvement | Name a real improvement
  Coach Code: I saw it too. Bring it today.
* assignment | Ask about your final assignment
  Coach Code: Same job your role asks. Do it well.
* concern | Admit a remaining concern
  Coach Code: Good. Concerns said out loud get smaller.
Coach Code: You don't need a different game to make this one matter.
@activity team_training
=== S1_W18_F aquarium
Cloudy: What has this cost you?
? cost
* missed_event | A missed event
  Cloudy: The outing. Real cost.
* hard_talk | A difficult conversation
  Cloudy: Hard conversations cost energy. Usually worth it.
* comfort | Lost comfort
  Cloudy: Comfort is nice. Growth is lumpier.
* unsure | I'm not sure.
  Cloudy: That's okay too.
Cloudy: And what do you want to keep?
? preparation
* role_task | A useful role task
  Cloudy: Do your job. That's plenty.
* team_plan | A team communication plan
  Cloudy: Talk early, talk clearly.
* first_action | A calm first-action routine
  Cloudy: First touch calm. Then everything else.
=== S1_W18_P neutral_home
Mom: Before you go, I want to say this while we don't know the score: I'm proud that you've let us see who you're becoming.
@if chose:S1_W08_S.sam=public|private|adult
Mom: You told me about standing up for Sam. That stayed with me.
@elif chose:S1_W09_S.outing=catch_up|small_task
Mom: You handled missing that outing really well.
@end
? before_game
* thanks | Say thank you
  Mom: Always.
* miss_home | Admit you still miss home
  Mom: Me too, sometimes. Both can be true.
* enjoy | Ask her to just enjoy the game
  Mom: Deal. Snacks and cheering, no coaching.
Mom: Whatever the score is, none of this changes.
=== S1_W18_G neutral_pitch
System: League game 12. The last league game of the season.
@activity league_match
@if result:S1_W18_G=WIN
Coach Code: A win to finish.
@elif result:S1_W18_G=DRAW
Coach Code: A draw to finish.
@elif result:S1_W18_G=LOSS
Coach Code: A loss to finish. It doesn't undo the season.
@else
Coach Code: Not finished. The last game stays pending, and the season is labelled incomplete.
@end
@activity standings
=== S1_W18_E neutral_home
System: The season is over.
@activity week_close

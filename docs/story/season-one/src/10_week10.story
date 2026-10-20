# Week 10: When the Noise Stops. No official fixture; recovery and reconnection.
=== S1_W10_M aquarium
System: Week 10, Monday. When the Noise Stops.
Cloudy: Welcome back. The snail won the household cup. Controversial judging.
Player: I thought I'd feel different.
Cloudy: You might. Or you might need lunch.
? topic
* result | Talk about the tournament result
  @if detail:S1_W09_G4=champion|shared_champion
  Cloudy: Champions, and it still feels strange? That's allowed. Winning can be lonely.
  @elif detail:S1_W09_G4=runner_up|third|shared_third|fourth
  Cloudy: You played every game of a real tournament. Some of it felt good, I bet.
  @else
  Cloudy: It didn't finish. That's not a loss. It's just unfinished.
  @end
* outing | Talk about the outing you missed
  Cloudy: Missing things is the price of choosing things. It's okay to feel both.
* funny | Talk about something funny
  Cloudy: Excellent. I love a funny thing. Tell me twice.
=== S1_W10_S neutral_school
Jordan: The outing was good. We went to the science museum. Someone got stuck in a revolving door.
Jordan: I wanted you there. I still wanted to have a good day.
? jordan
* ask | Ask about it
  Jordan: The planetarium was the best part. You'd have liked it.
* left_out | Admit feeling left out
  Jordan: I get it. Next time we'll pick a day without a game.
* plan | Arrange a specific next hangout
  Player: Saturday? Nothing's scheduled.
  Jordan: Saturday. Bring the bad jokes.
@if chose:S1_W09_S.outing=small_task
Jordan: And thanks for the snack list. People actually used it.
@end
Riley: The planetarium had a soccer-ball shaped planet. Okay, it didn't. But it should have.
=== S1_W10_C neutral_pitch
Coach Code: Today is review, not punishment. Bring one thing we can use.
? code
* success | A sequence that went well
  Coach Code: Good. We'll do more of that.
* difficult | A sequence that was difficult
  Coach Code: Good. That's what review is for.
* unknown | A question the evidence can't answer
  Coach Code: Honest. Some things we'll only learn by playing more.
Coach Code: Fresh eyes before more repetitions. Rest is part of being ready to learn.
@activity team_training
=== S1_W10_F aquarium
Cloudy: No league game this weekend. A shocking opportunity to become a person with another hobby.
? reflection
* review | Talk about the review
  Cloudy: You looked back without sinking. That's a skill too.
* need_break | Admit you need a break
  Cloudy: Then take one. Breaks are part of the plan.
? preparation
* social | Keep your social plan
  Cloudy: Go. Have fun. Report back.
* hobby | Do something unrelated
  Cloudy: An unrelated hobby. I recommend staring at bubbles.
* note | Write a short note for the next tournament
  Cloudy: One note. Then put the pen down.
=== S1_W10_P neutral_home
@if chose:S1_PRO_DEPART.phone=photo
System: Mom holds up a print of the mountain photo you sent from the car.
@else
System: Mom holds up a photo from the old neighbourhood.
@end
Mom: I thought the exciting parts of moving would make the hard parts smaller. I was wrong about how quickly.
? old_life
* miss | Name what you miss
  Mom: I miss it too. Some days more than I say.
* connected | Ask for help staying connected
  Mom: Let's set a call. Sunday evenings, if you want.
* new_things | Say there are new things worth keeping
  Mom: I'm really glad to hear that.
Mom: I'm still figuring this out too. That's my job, not yours.
=== S1_W10_E neutral_home
System: A quiet weekend. No official fixture this week. Next week: the Desert Lights Cup.
@activity week_close

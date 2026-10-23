# Week 06: "HEAD UP" (League Game 4). Owner text: docs/story/season-one/owner/WEEK_06_OWNER.txt (no school story this week).
=== S1_W06_S recess
System: Week 6. Recess.
Sam: Crossbar or Jungle?
Player: Which one won't you complain about?
Sam: Neither. Pick.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W06_S.activity=crossbar
@activity jungle chose:S1_W06_S.activity=jungle
@if result:S1_W06_S=WIN
Sam: Recruiting you was a mistake.
@elif result:S1_W06_S=LOSS
Player: We're blaming the sun.
@elif result:S1_W06_S=DRAW
Sam: Rematch next week.
@end
=== S1_W06_T neutral_pitch
System: Team Training. Code holds up a ball.
Coach Code: What's behind you?
System: You turn.
Coach Code: Now you know. Do that before this arrives.
Sam: What if it's Blake?
Coach Code: Then definitely know where Blake is.
System: Blake steals the ball from Sam.
Coach Code: Last week: use the space. This week: find it sooner.
? question
* looking | "What am I looking for?"
  Player: What am I looking for?
  Coach Code: Pressure. Teammates. Space. Enough information to give your first touch a job.
* changes | "What if everything changes?"
  Player: What if everything changes?
  Coach Code: Then update the picture. One look isn't a lifetime subscription.
* straight_back | "Can I just play it straight back?"
  Player: Can I just play it straight back?
  Coach Code: Sometimes. Know why you're doing it. Don't send someone else your problem.
@activity team_training
@if detail:S1_W06_T=strong
Coach Code: THERE! You already knew your next option. See how much time that gave you?
@elif detail:S1_W06_T=execution
Coach Code: You saw the right option. Now tidy up the execution.
@elif detail:S1_W06_T=poor_decision
Coach Code: Stop. What changed while the ball was travelling?
@end
=== S1_W06_L neutral_pitch
System: Leaving training.
Player: You make it look easy.
Coach Code: That's why I explain it standing still.
Coach Code: Now we make it work while you're moving. Check your home assignment. Bring me one thing that gets easier—and one that doesn't.
=== S1_W06_H home_v3
System: Home. Your phone buzzes. A text from Sam.
Sam: Park tomorrow. Riley's coming. Apparently we're doing something that isn't soccer.
? park
* training_first | "Training first. What time?"
  Player: Training first. What time?
* early | "I'll come early. Train afterward."
  Player: I'll come early. Train afterward.
* not_this_time | "Not this time. Have fun."
  Player: Not this time. Have fun.
@activity home_hub
@if detail:S1_W06_H=talk
Player: Code wants me looking over my shoulder.
Cloudy: Tried it. Tail's still following me.
Player: Want me to watch it?
Cloudy: Finally. Security.
@activity home_hub
@end
=== S1_W06_G neutral_pitch
System: Weekend. League Game 4.
Blake: Big plans?
? plans
* play_well | "Play well. Yours?"
  Player: Play well. Yours?
* full_name | "Avoid Code using my full name."
  Player: Avoid Code using my full name.
System: Code calls the team in.
Coach Code: Get your picture early. Help the player on the ball. And when something goes wrong—next decision.
@activity league_match
@if result:S1_W06_G=WIN
Sam: Good afternoon. Better if there are snacks.
@elif result:S1_W06_G=DRAW
Sam: Feels unfinished.
@elif result:S1_W06_G=LOSS
Sam: Talk later?
Player: Yeah.
@end
@if done:S1_W06_G
System: Code approaches.
@if detail:S1_W06_G=learning_moment
Coach Code: That moment we flagged—good reading of the game. We'll look at it next session.
@else
Coach Code: We'll find a useful moment to review. There's always something.
@end
@end
@activity standings
System: Sam adds you to a group chat.
Riley: Finally. Someone who might answer.
Sam: ⚽
=== S1_W06_E neutral_home
System: End of week 6.
@activity week_close

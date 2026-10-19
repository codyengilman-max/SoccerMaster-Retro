# Week 03: The First Receipt. League game 1.
=== S1_W03_M aquarium
System: Week 3, Monday. The First Receipt.
Cloudy: First league game. I would come, but the away kit keeps floating off.
Player: What if I mess it up?
Cloudy: Then you'll have a next action. Pack that too.
? feeling
* excited | I'm excited.
  Cloudy: Excited is good fuel. Pick one thing you control and point the fuel at it.
* nervous | I'm nervous.
  Cloudy: Nervous means it matters. Choose one small job you can do even when nervous.
* annoyed | I'm annoyed I have to prove anything.
  Cloudy: Fair. So don't prove. Just do one useful thing, then another.
=== S1_W03_S neutral_school
System: In class, Jordan is building a small display for the classroom wall.
Jordan: Can you help with the project? It's due Friday.
System: Someone at the next desk laughs: "The new kid will be too busy becoming famous."
? project
* task | Take one specific task
  Player: I'll do the captions. I can finish them by Thursday.
  Jordan: Captions by Thursday. Clear. I like clear.
* shared | Suggest a smaller shared task
  Player: Could we do the title board together at lunch?
  Jordan: Together at lunch. That works.
* decline | Decline before promising
  Player: I can't promise this week. I don't want to let you down later.
  Jordan: Okay. Thanks for saying it now instead of Friday.
=== S1_W03_C neutral_pitch
Coach Code: Your job is to help the next action happen. You don't have to make this match your autobiography.
? code
* start_pos | Ask about your starting position
  Coach Code: Start where your role says. Then move to where your teammate can find you.
* recovery | Ask about recovering after a mistake
  Coach Code: After a mistake, the next job is the only job. Get back into a useful place.
* support_cue | Ask for a support cue
  Coach Code: Pass, then find the next useful space. Keepers: reset and support the angle. Both count.
Coach Code: If your first option closes, keep another one alive.
@activity team_training
=== S1_W03_F aquarium
Cloudy: I prepared a victory speech and a disappointed face. Both are mostly bubbles.
? reflection
* worked | Something in training worked.
  Cloudy: Good. Bring that into the match.
* difficult | Something was difficult.
  Cloudy: Then that's your cue for the weekend: slow it down once and get it right once.
* not_yet | I don't want to unpack it yet.
  Cloudy: Understood. Let's do the useful part instead.
@if chose:S1_W03_S.project=task|shared
Cloudy: Also, Jordan's project. Is your part on track?
? project_check
* complete | It's done.
  Cloudy: Done before the deadline. That is the quiet kind of impressive.
* renegotiate | Ask Jordan for a new plan
  Cloudy: Telling Jordan early is the respectful version. Good.
* cancel | Tell Jordan you have to drop out
  Cloudy: It's not fun, but telling them plainly is better than going silent.
@end
Cloudy: Matchday prep. What are you taking with you?
? preparation
* role_cue | A role cue
  Cloudy: One cue for your position. Small and clear.
* communication | A communication cue
  Cloudy: Use your voice. Teammates can't read minds. Neither can I, mostly.
* reset | A reset routine
  Cloudy: Breathe, look, next action. Repeat as needed.
=== S1_W03_G neutral_pitch
System: League game 1. Kickoff.
@activity league_match
@if result:S1_W03_G=WIN
Coach Code: A win. The score is real, and so is the work that got it. Remember one thing you did that helped.
@elif result:S1_W03_G=DRAW
Coach Code: Level. An even game. Pick one concrete next step for training.
@elif result:S1_W03_G=LOSS
Coach Code: We lost this one. What you earned in training stays earned. Let's find one thing to learn from it.
@else
Coach Code: The game wasn't finished, so there's no result to talk about. It stays pending, not lost.
@end
@activity standings
=== S1_W03_E neutral_home
System: Weekend. League game 1 is in the books (or pending if it wasn't finished).
@activity week_close

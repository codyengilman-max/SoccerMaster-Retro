# Week 14: Say It to My Face. League game 8.
=== S1_W14_M aquarium
System: Week 14, Monday. Say It to My Face.
Cloudy: I heard a rumour about you.
Player: What?
Cloudy: Nothing. You haven't told me one yet.
Cloudy: If someone has a question about you, who should they ask?
? gossip
* direct | Me, directly.
  Cloudy: Direct. Brave and efficient.
* help | I might need help handling gossip.
  Cloudy: Asking for help is allowed. Even fish do it. Mostly with food.
* leave_it | Leave it alone for now.
  Cloudy: Okay. Not every bubble needs popping.
=== S1_W14_S neutral_school
@if chose:S1_W06_C.code=criteria|direct_feedback
Alex: I don't always understand why Code gives you that task.
@else
Alex: I don't know what Code wants from either of us.
@end
? alex
* ask | Ask Alex what feels unclear
  Alex: Just... I want to know what I'm being judged on.
* code_said | Say what Code actually told you
  Player: Code said decisions first, then execution, then consistency.
  Alex: Okay. That's something.
* ask_together | Suggest asking Code together
  Alex: Together? ...Fine. That's fair.
* walk_away | Leave before it escalates
  System: You step away. Alex's question stays open.
=== S1_W14_C neutral_pitch
Coach Code: You can ask how a decision was made. You deserve an answer I can explain.
@if chose:S1_W14_S.alex=ask_together
Alex: We both want to know what you're looking for.
Coach Code: Good. Decisions, effort without the ball, and the job your role asks. Same for both of you.
@end
? code
* question | Ask a private question
  Coach Code: Ask. I'll explain what I saw.
* improve | Ask for a specific improvement task
  Coach Code: When one of you presses, the other covers. Two players can't both leave the space.
* keep | Keep your current task
  Coach Code: Fine. Keep at it.
Coach Code: One goes. Someone else has to protect what opens.
@activity team_training
=== S1_W14_F aquarium
@if chose:S1_W14_S.alex=ask|code_said|ask_together
Cloudy: Excellent teamwork. Asking questions uses less energy than imaginary arguments.
@else
Cloudy: Imaginary arguments are undefeated in this bedroom.
@end
? reflection
* worked | Training went well.
  Cloudy: Good. Keep it.
* difficult | Training was difficult.
  Cloudy: Difficult is information.
* not_yet | I don't want to unpack it yet.
  Cloudy: Fine. Bubbles only.
? preparation
* handoff | Communicate the press-and-cover handoff
  Cloudy: "I go, you cover." Short and clear.
* weak_point | Focus on a weak point
  Cloudy: One weak point, one week. Fair deal.
* explanation | Ask for a calm explanation before the game
  Cloudy: Calm questions get calm answers.
=== S1_W14_P neutral_home
Mom: Something can feel unfair before we know why it happened. Sometimes we learn more. Sometimes it really is unfair.
@if chose:S1_W08_S.sam=adult
Mom: And the teacher you talked to about Sam said lunch has been better. That process is still working.
@end
? fairness
* help_ask | Ask for help asking a question
  Mom: Let's practise what you'd say. Respectfully, clearly.
* space | Ask for space to be upset
  Mom: Okay. Upset is allowed. I'm here when you're ready.
* plan | Ask for help planning a response
  Mom: Let's plan it together. I can't promise you minutes, but I can help you ask well.
=== S1_W14_G neutral_pitch
System: League game 8. Kickoff.
@activity league_match
@if result:S1_W14_G=WIN
Coach Code: A win. And some good press-and-cover moments to talk about.
@elif result:S1_W14_G=DRAW
Coach Code: A draw. We'll work on it.
@elif result:S1_W14_G=LOSS
Coach Code: A loss. We'll work on it.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W14_E neutral_home
System: Weekend.
@activity week_close

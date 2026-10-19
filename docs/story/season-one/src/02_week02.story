# Week 02: No Borrowed Reputation. Role assessment and preseason; no league game.
=== S1_W02_M aquarium
System: Week 2, Monday. No Borrowed Reputation.
Player: Back home, people knew what I could do.
Cloudy: Tell them you're my agent. That should confuse them long enough to get a touch.
Cloudy: What can you show them here?
? start
* fresh | Start fresh.
  Cloudy: A clean page. Very brave. Very papery.
* reminder | Keep the old shirt as a reminder.
  Cloudy: Keep it. It reminds you that you've done hard things before.
* afraid | Admit you're afraid of comparison.
  Cloudy: Honest. Everyone compares. The trick is comparing with last week's you.
=== S1_W02_S recess
System: Recess, by the schoolyard goal.
@if chose:S1_PRO_DEPART.keepsake=old_shirt
Blake: Nice shirt. Did you ever actually play, or just wear it?
@else
Blake: Have you ever actually played?
@end
Blake: Let's see, then. Crossbar challenge. Same rules for everybody.
? challenge
* accept | Accept the published rules
  Player: Same rules. Fine.
* warmup | Ask for one equal warm-up for everyone
  Player: One warm-up kick each, then we start.
  Blake: Whatever. One each.
* decline | Decline and go back to recess
  Player: Not today.
  System: You walk back to the benches. Declining isn't losing; nothing is recorded against you.
@if chose:S1_W02_S.challenge=accept|warmup
Sam: The ball has to hit the bar. Posts don't count. Blake never says that part.
@end
@activity crossbar chose:S1_W02_S.challenge=accept|warmup
@if result:S1_W02_S=WIN
Blake: Again tomorrow.
@elif result:S1_W02_S=DRAW
Blake: ...Fine. Not bad.
@elif result:S1_W02_S=LOSS
Blake: Told you. That's how it's done.
@end
=== S1_W02_C neutral_pitch
Coach Code: The player you were somewhere else isn't here for this exercise. You are. Show me the next decision.
? feedback
* first_touch | Ask for feedback on first touch
  Coach Code: Watch your first touch today. Take it toward the next option, not just away from pressure.
* passing | Ask about passing options
  Coach Code: Before the ball arrives, know two passes. Then pick one.
* positioning | Ask about positioning in your role
  Coach Code: Stay where your teammates expect you, then adjust to the picture.
Coach Code: Everyone gets the same explanation before we compare. If the exercise isn't clear, ask before you start.
@activity team_training
=== S1_W02_F aquarium
Cloudy: Excellent. We have survived an assessment without a dramatic soundtrack.
? reflection
* worked | Something worked.
  Cloudy: Hold on to that. Real evidence beats a dramatic soundtrack.
* difficult | Something was difficult.
  Cloudy: Difficult is information. Now you know what to practise.
* not_yet | I don't want to unpack it yet.
  Cloudy: We can leave it in the box. I'm an expert in boxes.
Cloudy: Next week has a real match. What's your preparation?
? preparation
* cue | Pick one practice cue
  Cloudy: One cue. Small enough to remember when it gets loud.
* clarify_role | Ask Code about the match role
  Cloudy: Ask early. Questions before kickoff are free.
* routine | Plan a calm pregame routine
  Cloudy: Calm routine. Water, warm-up, one deep breath. I recommend bubbles.
=== S1_W02_P neutral_home
System: Evening, at home.
Mom: I keep saying you'll settle in. That doesn't make today easier.
? parent
* miss_home | Say you miss home
  Player: I miss home.
  Mom: I know. I miss parts of it too. You're allowed to.
* why_move | Ask why the move had to happen
  Player: Why did we have to move?
  Mom: There are grown-up parts we need to explain properly. None of this was because you weren't enough.
* just_listen | Ask her to just listen
  Player: Can you just listen? No advice.
  Mom: Listening. No advice. I promise.
Mom: Let's talk more this weekend. Properly. And let's decide where the old shirt lives in your new room.
Mom: Whatever happens with soccer, I love you. That part isn't up for selection.
=== S1_W02_E neutral_home
System: Weekend. The assessment closes with Coach Code's feedback. Next week: league game 1.
@activity week_close

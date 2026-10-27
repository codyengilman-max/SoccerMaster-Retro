# Week 03: "LOOK FIRST" (League Game 1). Owner rewrite 2026-10-27, authoritative.
# School recess Jungle Ball, scanning team training, home menu, League Game 1, week close.
=== S1_W03_S recess v3
System: Week 3. School recess. Blake rolls a ball toward you.
Blake: Enough crossbar. Come play real soccer.
Player: You playing, or just doing the announcements?
Sam: Please play. There's no mute button.
@activity jungle
=== S1_W03_T neutral_pitch v3
System: Team Training. Code stands behind you while Sam prepares a pass.
Coach Code: Where am I?
System: You look.
Coach Code: Good. Get that information before the ball arrives.
Coach Code: Look for pressure, teammates, and space. Check again if the picture changes. Looking only helps if you use what you see.
@activity team_training
@if detail:S1_W03_T=strong
Coach Code: You saw the pressure. Your first touch dealt with it.
@elif detail:S1_W03_T=execution
Coach Code: Good idea. Now give the touch the right weight.
@elif detail:S1_W03_T=poor_decision
Coach Code: What was behind you? Reset. Find out before it arrives.
@end
=== S1_W03_H home_v3 v3
System: Home.
@activity home_hub
=== S1_W03_G neutral_pitch v3
System: League Game 1.
Sam: Ready?
Player: Ask me after my first touch.
Coach Code: Find your information early. Give each other options.
@activity league_match
@activity standings
=== S1_W03_E neutral_home v3
System: End of week 3.
@activity week_close

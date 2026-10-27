# Week 04: "HOW TO GET BETTER FASTER" (League Game 2). Owner rewrite 2026-10-27, authoritative.
# Development tutorial (My Player, Home Training preview, team training, session results), weekly minigame
# (no school conversation), home with Mom, League Game 2, week close.
=== S1_W04_T neutral_pitch v3
System: Week 4. Training field.
Player: How do I move up faster?
Sam: Ask Code. I was going to say better socks.
Coach Code: Pick something that needs work. Practice it properly. Use it in games. Let me show you.
System: Find your target.
@activity my_player
Coach Code: Don't just chase your lowest number. Find something that will help you play your position better.
? target
* first_touch | Control and first touch
* passing | Passing
System: Make home training count.
@activity home_preview
Coach Code: This is where you build consistency. Controlled repetitions. Both feet. Get it right before you speed it up.
System: Complete and log assigned work to earn its available rewards. Each completion is credited once.
System: Apply it at team training.
Coach Code: Now add teammates and pressure. A skill helps when you can use it at the right time.
@activity team_training
System: Check what improved.
Player: So just train all night?
Coach Code: No. Focused work, then recover. Tired repetitions aren't a shortcut.
System: Choose a target → complete home work → apply it with the team → test it in matches.
=== S1_W04_S recess v3
System: Weekly minigame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W04_S.activity=crossbar
@activity jungle chose:S1_W04_S.activity=jungle
=== S1_W04_H home_v3 v3
System: Home.
Mom: You've got a training plan?
Player: Apparently 'get good' wasn't specific enough.
Mom: Neither is 'clean your room,' but here we are.
@activity home_hub
=== S1_W04_G neutral_pitch v3
System: League Game 2.
Coach Code: Use what you practiced when the opportunity is there. Don't force it just to prove you worked on it.
@activity league_match
@activity standings
=== S1_W04_E neutral_home v3
System: End of week 4.
@activity week_close

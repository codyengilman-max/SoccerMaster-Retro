# Week 12: The Choice Behind the Choice. No official fixture; reset before league games 7-12.
=== S1_W12_M aquarium
System: Week 12, Monday. The Choice Behind the Choice.
Cloudy: Two tournaments. Twelve league games in total, six still ahead. My accounting department is a snail, so check that.
Player: I want more.
Cloudy: More of what?
? want
* better_play | Better play
  Cloudy: Then give it time. Better play is built on boring repetitions.
* recognition | Recognition
  Cloudy: Honest. Recognition comes slower than work, usually.
* belonging | To belong here
  Cloudy: Belonging. That one's built with people, not just goals.
=== S1_W12_S neutral_school
System: Jordan's school exhibition is on Thursday after school.
? exhibition
* attend | Go to the exhibition
  Jordan: You came! Look, this part's mine.
* short_visit | Agree a short visit, and keep it
  Player: I can come for fifteen minutes.
  Jordan: Fifteen minutes is great. Thanks for coming.
* later | Decline warmly and ask to see it later
  Player: I can't make Thursday. Can you show me Friday?
  Jordan: Sure. Friday at lunch.
@if chose:S1_W11_S.riley=listen|short_slot
Riley: My drawings are in it too. The presentation went fine. Thanks for listening.
@end
=== S1_W12_C neutral_pitch
Coach Code: We have six league games left. Pick something to get better at that you can actually recognise.
? goal
* role_goal | Pick a role objective
  Coach Code: Good. Make it specific enough that we can see it.
* help_choose | Ask for help choosing
  Coach Code: Start with your first touch under pressure. We'll see it in every game.
* keep_focus | Keep your current focus
  Coach Code: Keep the useful part of your game while you improve the difficult part.
@activity team_training
=== S1_W12_F aquarium
Cloudy: My long-term goal is the ocean. My short-term goal is getting past this ornament without looking foolish.
? reflection
* clear | My goal feels clear.
  Cloudy: Clear goals are easier to chase.
* fuzzy | My goal still feels fuzzy.
  Cloudy: Fuzzy is okay. Sharpen it a little each week.
? preparation
* weekly_plan | Make a weekly plan you can keep
  Cloudy: A plan you can keep beats a plan that looks impressive.
* clarify | Clarify a commitment
  Cloudy: Clear promises are kind promises.
* small_change | Keep the routine with one small change
  Cloudy: One small change. Very wise. Very fish.
=== S1_W12_P neutral_home
Mom: If nobody was watching, would you still want this?
? dream
* need_help | "Yes, but I need help."
  Mom: Then let's work out what help looks like.
* pressure | "I love playing and hate the pressure."
  Mom: Then let's change something about the routine so the pressure's smaller.
* figuring | "I'm still figuring out what I want."
  Mom: That's okay. You're eleven. Figuring out is the job.
Mom: Other clubs and tryouts can wait. We can be curious about them later. No decisions now.
=== S1_W12_E neutral_home
System: A reset weekend. No official fixture. League game 7 is next week.
@activity week_close

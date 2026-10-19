# Week 06: Two Names, One Opportunity. League game 4.
=== S1_W06_M aquarium
System: Week 6, Monday. Two Names, One Opportunity.
Cloudy: Two players, one spot. I understand. The snail and I both applied for castle manager.
Player: Who got it?
Cloudy: Apparently it was a decorative position.
Cloudy: What can you improve without needing Alex to fail?
? approach
* technical | Work on a technical task
  Cloudy: A skill you improve stays yours, whoever starts.
* role_talk | Have an honest role conversation
  Cloudy: Ask Code what decides it. Then you'll know what to aim at.
* joint_practice | Invite Alex to practise together
  Cloudy: Bold. Competing and practising together aren't opposites.
=== S1_W06_S neutral_school
System: A classmate starts comparing you with Alex. Blake tries to turn it into a ranking.
@if result:S1_W02_S=WIN
Blake: The new kid did beat me at crossbar. Once. That's schoolyard stuff.
@elif result:S1_W02_S=LOSS
Blake: I beat the new kid at crossbar. Just saying.
@end
System: Alex looks uncomfortable but doesn't say anything yet.
? comparison
* goal | State one personal goal
  Player: I want to get better at receiving under pressure. That's my goal.
  Alex: ...Mine's defending one-on-ones.
* unfair | Say the comparison is unfair to both
  Player: This isn't fair to either of us.
  Alex: Yeah. It isn't.
* leave | Leave the debate
  System: You walk away. Alex watches you go.
=== S1_W06_C neutral_pitch
Coach Code: Competition is allowed. Making your teammate worse is not your assignment.
Coach Code: I'm not promising anyone a starting place. Here's what I look at: decisions, effort off the ball, and the job your role asks for.
? code
* criteria | Ask about the criteria
  Coach Code: Decisions first. Then execution. Then consistency.
* direct_feedback | Ask for direct feedback
  Coach Code: Your first touch is improving. Your recovery runs need to start sooner.
* keep_working | Keep working under the stated criteria
  Coach Code: Good. That's all anyone can do.
Coach Code: You can want the same place and still make a good pass.
@activity team_training
@if chose:S1_W06_M.approach=joint_practice
? joint
* confirm | Confirm a joint practice slot with Alex
  Alex: Thursday after school? Okay.
* not_now | Leave it for now
  System: No slot this week. Declining is allowed.
@end
=== S1_W06_F aquarium
Cloudy: I gave the snail a pep talk. Still no eye contact.
? reflection
* comparison | Talk about being compared
  Cloudy: Comparisons are loud. Your own work is quieter but it lasts.
* execution | Talk about what you actually did
  Cloudy: Good. Let's stay with what you did. That's the useful bit.
* not_yet | I don't want to unpack it yet.
  Cloudy: Fine. The snail doesn't unpack either.
? preparation
* cooperate | Cooperate with Alex
  Cloudy: Two people who want the same thing can still make each other better.
* own_job | Focus on your assigned job
  Cloudy: Your job, done well. That's the plan.
* clarify | Ask Code to clarify the evaluation
  Cloudy: Clarity is a gift. Ask for it.
=== S1_W06_P neutral_home
Mom: I can see how much this matters. I also need you to know you can tell me when it hurts.
? wanting
* want_place | "I want the place."
  Player: I want the place.
  Mom: Then want it. I can't promise you'll get it, but I'll back you trying.
* scared | "I'm scared I'm not good enough."
  Player: I'm scared I'm not good enough.
  Mom: You don't have to earn being enough. Not with me.
* stop_rank | "Please stop asking where I rank."
  Player: Please stop asking where I rank.
  Mom: Okay. No more ranking questions. Thanks for telling me.
? support
* rides | Quiet rides to games
  Mom: Quiet rides. Got it.
* practice_help | Help with home practice
  Mom: I'll be the world's worst goalkeeper in the back yard. Deal.
* just_there | Just being there
  Mom: I'll be there.
=== S1_W06_G neutral_pitch
System: League game 4. Kickoff.
@activity league_match
@if result:S1_W06_G=WIN
Coach Code: A win. Whoever started, the job was the job. Well done.
@elif result:S1_W06_G=DRAW
Coach Code: A draw. Everyone's role mattered today.
@elif result:S1_W06_G=LOSS
Coach Code: A loss. Here's the next development step, for you and for the team.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W06_E neutral_home
System: Weekend.
@activity week_close

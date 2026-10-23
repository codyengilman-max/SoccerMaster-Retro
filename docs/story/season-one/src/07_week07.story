# Week 07: "LOUDER DOESN'T MEAN OPEN" (League Game 5). Owner text: docs/story/season-one/owner/WEEK_07_OWNER.txt
=== S1_W07_M neutral_school
System: Week 7. School.
System: Blake scrolls through Next Horizon's weekend clips, tapping the heart on another one.
Sam: You scouting them or joining the fan club?
System: Blake locks the phone.
Blake: They actually move the ball.
? clips
* good_bits | "Easy when they only post the good bits."
  Player: Easy when they only post the good bits.
  Sam: My highlights would be incredible if we deleted most of me.
* follow | "Since when do you follow them?"
  Player: Since when do you follow them?
  Blake: Since they started playing decent soccer.
System: Riley catches you before class.
Riley: Showcase Friday. Can you help set up?
? riley
* check_training | "Send me the time. I'll check training."
  Player: Send me the time. I'll check training.
* show_time | "Can't help set up. Send me the show time?"
  Player: Can't help set up. Send me the show time?
* cant | "I can't this week."
  Player: I can't this week.
Riley: Okay. Just tell me before Friday.
System: The bell rings. Blake checks the phone once more before putting it away.
=== S1_W07_S recess
System: Recess.
Sam: Crossbar or Jungle?
Player: You picking?
Sam: No. I need someone to blame.
? activity
* crossbar | Crossbar Challenge
* jungle | Jungle Ball
@activity crossbar chose:S1_W07_S.activity=crossbar
@activity jungle chose:S1_W07_S.activity=jungle
@if result:S1_W07_S=WIN
Sam: Please don't start giving speeches.
@elif result:S1_W07_S=LOSS
Sam: We're keeping that between us.
@elif result:S1_W07_S=DRAW
Sam: Lunch? Something I'm good at.
@end
=== S1_W07_T neutral_pitch
System: Team Training. Code positions a defender between two teammates.
Coach Code: Call for it.
Sam: HERE!
Coach Code: Louder.
Sam: HERE!
Coach Code: Did the defender disappear?
System: Sam steps sideways.
Coach Code: THERE. Now your teammate can actually use you.
? question
* how_far | "How far should I move?"
  Player: How far should I move?
  Coach Code: Far enough to open the lane. Close enough to help. Keep checking—you don't get a permanent parking space.
* follows | "What if the defender follows?"
  Player: What if the defender follows?
  Coach Code: Then you've moved a defender. Look at what opened for somebody else.
* after_pass | "What do I do after I pass?"
  Player: What do I do after I pass?
  Coach Code: Find your next job. Support underneath, move beyond, or hold useful space. Don't admire the pass.
System: Blake passes, stays put, then throws both hands up when the return ball doesn't come.
Coach Code: Blake. You passed, then watched. Give them an angle.
Blake: I was open.
Coach Code: You were calling. That's different. Move so they can find you.
System: Blake drops both hands and moves. Code immediately turns back to the drill.
System: The correction is over. Blake's expression says otherwise.
@activity team_training
@if detail:S1_W07_T=strong
Coach Code: YES! You made your teammate's next decision easier. That's good soccer.
@elif detail:S1_W07_T=execution
Coach Code: The option was right. Now clean up the execution.
@elif detail:S1_W07_T=poor_decision
Coach Code: Freeze. Can the player on the ball actually reach you?
@end
=== S1_W07_A neutral_pitch
System: After training. Code gathers the team.
Coach Code: At home, work on the touches that let you use those options. Both feet. Under control. A useful repetition beats ten rushed ones.
Player: Even with the bad foot?
Coach Code: Especially the foot you keep insulting.
=== S1_W07_H home_v3
System: Home. Mom finds you checking the week's schedule.
Mom: Anything on there besides soccer?
Player: School. Unfortunately.
Mom: And people you like?
? plan
* everything | "I'm trying to fit everything in."
  Player: I'm trying to fit everything in.
  Mom: Then leave some breathing room. Every minute doesn't need a job.
* get_better | "I really want to get better."
  Player: I really want to get better.
  Mom: I know. I want you to enjoy getting there, too.
* help | "Could you help me plan it?"
  Player: Could you help me plan it?
  Mom: Yep. Show me what's required first.
@activity home_hub
@if detail:S1_W07_H=talk
Player: Working on being a better teammate.
Cloudy: Good. I've been carrying this aquarium.
Player: You're the only player.
Cloudy: And somehow still underappreciated.
@activity home_hub
@end
=== S1_W07_G neutral_pitch
System: Weekend. League Game 5. Sam stretches beside you.
Sam: If I'm shouting and covered, ignore me.
Player: Can I get that in writing?
System: Code calls everyone together.
Coach Code: Help before you're needed. Give the player on the ball a picture worth looking at.
@activity league_match
@if result:S1_W07_G=WIN
Sam: We should do that more.
@elif result:S1_W07_G=DRAW
Sam: Another one for the 'almost' collection.
@elif result:S1_W07_G=LOSS
Sam: Walk with me?
Player: Yeah.
@end
@if done:S1_W07_G
@if detail:S1_W07_G=support_moment
Coach Code: That support movement mattered. We'll look at how it helped the team.
@else
Coach Code: Next session, we'll look at where we gave each other options—and where we didn't.
@end
@end
@activity standings
System: While everyone collects their bags, Blake opens another Next Horizon clip.
Sam: You coming?
Blake: In a minute.
System: Blake taps the heart. You and Sam head toward the parking lot.
=== S1_W07_E neutral_home
System: End of week 7.
@activity week_close

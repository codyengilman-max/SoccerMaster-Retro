# Week 05: "PUT THE WORK IN" (League Game 3). Owner-approved V3 text, SoccerMaster_V3_Week5 WEEK_05_APPROVED.md.
=== S1_W05_M neutral_school
System: Week 5. Monday, outside science. Sam catches up with you and Blake.
Sam: That sub had to be on something.
Blake: Told us to watch the video. It was a screenshot.
Player: I thought it was paused.
Sam: For twelve minutes?
? sub
* learned | "Still learned more than last week."
  Player: Still learned more than last week.
  Blake: Yeah. Never let that guy drive the field-trip bus.
* notes | "Blake was taking notes."
  Player: Blake was taking notes.
  Blake: I drew him a play button. Trying to help.
System: The three of you crack up as the bell rings.
=== S1_W05_S recess
System: Recess. Sam drops a ball at your feet.
Sam: Pick your punishment.
? activity
* crossbar | Crossbar Challenge
  Player: You going first?
  Sam: No. I want to hear your excuse before I pick mine.
* jungle | Jungle Ball
  Sam: Friendship resumes after the whistle.
@activity crossbar chose:S1_W05_S.activity=crossbar
@activity jungle chose:S1_W05_S.activity=jungle
@if result:S1_W05_S=WIN
Sam: Been practicing?
Player: Wouldn't you like to know.
@elif result:S1_W05_S=LOSS
Player: We're not discussing that.
Sam: Already forgotten. Mostly.
@elif result:S1_W05_S=DRAW
Sam: Rematch next week.
@end
=== S1_W05_T neutral_pitch
System: Team Training. Code rolls a ball into the practice area.
Coach Code: HEADS UP! The grass isn't going anywhere.
Sam: Neither are we, apparently.
Coach Code: Heard that. Show me otherwise.
System: Code gathers the players around the half-field setup.
Coach Code: Find the space. Use it. When someone comes to stop you, see what they've left.
Player: So dribble until someone comes?
Coach Code: If the pass is already there, use it. Read the field. Don't memorize an answer.
@activity team_training
@if detail:S1_W05_T=strong
Coach Code: YES! You saw it before it happened. That's the game!
@elif detail:S1_W05_T=steady
Coach Code: Right idea. Now give the pass the weight it needs. Again.
@elif detail:S1_W05_T=struggled
Coach Code: Freeze. Where was the pressure? Show me what you missed.
@end
=== S1_W05_A neutral_pitch
System: You stay behind while Code collects cones.
Player: Do you think I could get really good?
System: Code stops stacking.
Coach Code: How good?
? ambition
* state_best | "One of the best in Arizona."
  Player: One of the best in Arizona.
  Coach Code: All right. That's a big goal.
  Player: Too big?
  Coach Code: Didn't say that.
* team_reliable | "Someone this team can count on."
  Player: Someone this team can count on.
  Coach Code: Even when nobody's watching?
  Player: I'd prefer somebody watching.
  Coach Code: Honest. I like it.
* explore | "I want to find out."
  Player: I want to find out.
  Coach Code: Good. Give yourself a chance to be surprised.
System: Code hands you the last cone.
Coach Code: I get you a couple hours a week. The work between sessions matters. Short, focused practice. Bring me what you figure out.
=== S1_W05_H home_v3
System: Home. Your training bag lands beside the door. Cloudy tracks you across the room.
@activity home_hub
@if detail:S1_W05_H=talk
System: Cloudy swims up to the glass.
Cloudy: You smell like ambition.
Player: Probably my bag.
Cloudy: Move it. I breathe through that.
? cloudy
* share | Tell Cloudy what you said to Code.
  @if chose:S1_W05_A.ambition=state_best
  Player: I told Code I want to be one of the best in Arizona.
  @elif chose:S1_W05_A.ambition=team_reliable
  Player: I told Code I want to be someone this team can count on.
  @elif chose:S1_W05_A.ambition=explore
  Player: I told Code I want to find out how good I can get.
  @end
  Cloudy: I respect ambition. I'm trying to become the first fish with a sponsorship.
  Player: For what?
  Cloudy: Water.
* check | "Just checking on you."
  Player: Just checking on you.
  Cloudy: Excellent timing. I was checking whether you remembered dinner.
@activity home_hub
@end
=== S1_W05_G neutral_pitch
System: Weekend. League Game 3. Sam meets you near the field.
Sam: Ready?
Player: Ask me after warm-ups.
Sam: That's when I usually start lying.
System: Code calls the team together.
Coach Code: Be available for each other. When the picture changes, change with it.
@if done:S1_W05_H
Coach Code: You did the work. Now look up and use it.
@end
@activity league_match
@if result:S1_W05_G=WIN
Sam: The walk to the car is much better when we win.
Player: You're still carrying your own bag.
@elif result:S1_W05_G=DRAW
Sam: I can't decide whether I'm happy.
Player: Take your time. You usually do.
@elif result:S1_W05_G=LOSS
Sam: That sucked.
Player: Yeah.
System: Sam stays beside you as you walk.
System: Code catches up.
Coach Code: We'll look at what happened. Then we'll know what to work on.
@end
@activity standings
@if done:S1_W05_G
System: Sam turns toward you.
Sam: Park tomorrow?
? park
* practice | "Bring a ball."
  Player: Bring a ball.
* hang_out | "Let's just hang out."
  Player: Let's just hang out.
* rest | "I need a day."
  Player: I need a day.
Sam: Okay. Text me.
@end
=== S1_W05_E neutral_home
System: End of week 5.
@activity week_close

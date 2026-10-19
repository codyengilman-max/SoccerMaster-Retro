# Week 16: The Honest Conversation. League game 10.
=== S1_W16_M aquarium
System: Week 16, Monday. The Honest Conversation.
Cloudy: Three league games left. I am available for a dramatic speech, a terrible joke, or respectful silence.
? mood
* speech | A dramatic speech
  Cloudy: You can still do useful work before you know the ending.
* joke | A terrible joke
  Cloudy: Why am I never offside? Different sport.
* silence | Respectful silence
  System: Cloudy swims a slow circle around the castle. Nobody says anything. It's nice.
=== S1_W16_S neutral_school
@if chose:S1_W11_S.riley=cant_help
Riley: You said you couldn't help last time. That's okay. I just wanted to say it out loud.
@elif chose:S1_W07_S.riley=listen|later
Riley: Want to have lunch tomorrow? Just talking.
@if chose:S1_W04_S.riley_route=crush
Player: I like spending time with you.
Riley: I'm still figuring out what I feel. But I like lunch with you.
@end
@else
Riley: Hey. Good luck this weekend.
@end
? riley
* honest | Respond honestly
  Riley: Thanks for being honest.
* slower | Ask for a slower friendship
  Riley: Slow is fine.
* boundary | Accept a boundary
  Riley: Thanks for understanding.
@if chose:S1_W15_S.casey=nothing
? casey_repair
* invite | Invite Casey to join the next recess game
  Casey: Okay. Maybe.
* not_now | Not now
  System: Maybe later.
@end
=== S1_W16_C neutral_pitch
Coach Code: I want to talk about the next step while we still have time to work on it.
? code
* feedback | Ask for feedback
  Coach Code: Your decisions are good. Your execution under pressure is the next step.
* demo | Ask for a demonstration
  Coach Code: Watch. Open the body, then take the touch away from pressure.
* continue | Keep a manageable task
  Coach Code: Good. Keep it manageable.
Coach Code: A good idea can need a better touch. A lucky outcome doesn't tell the whole story either.
@activity team_training
=== S1_W16_F aquarium
Cloudy: Anything you have been carrying around that isn't yours to carry?
? reflection
* training | Talk about training
  Cloudy: Good.
* school | Talk about school
  Cloudy: Thanks for telling me.
* nothing | Nothing right now.
  Cloudy: Okay.
? preparation
* code_task | Work on Code's task
  Cloudy: The real task. Good.
* nerves | Ask for support with nerves
  Cloudy: Nerves shared are nerves halved.
* simplify | Simplify the pregame routine
  Cloudy: Fewer steps, calmer brain.
=== S1_W16_P neutral_home
Mom: You don't have to wait until the season is over to tell us how you're doing.
@if chose:S1_W06_P.wanting=stop_rank
Mom: And I've stopped asking where you rank. I noticed it helped.
@end
? honest
* pressure | Name the pressure
  Mom: Thank you. Let's make it lighter.
* uncertain | Admit you're unsure about something
  Mom: Unsure is fine. We'll take it slowly.
* other | Talk about something else
  Mom: Tell me everything. Not soccer is great.
=== S1_W16_G neutral_pitch
System: League game 10. Kickoff.
@activity league_match
@if result:S1_W16_G=WIN
Coach Code: A win.
@elif result:S1_W16_G=DRAW
Coach Code: A draw.
@elif result:S1_W16_G=LOSS
Coach Code: A loss. A hard game doesn't erase a good week.
@else
Coach Code: Not finished. It stays pending.
@end
@activity standings
=== S1_W16_E neutral_home
System: Weekend.
@activity week_close

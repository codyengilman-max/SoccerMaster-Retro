# Week 04: "Everybody Wants Something" (owner script, 2026-10-20). League Game Two.
# Monday school, Tuesday school-activity choice (Crossbar or Jungle Ball, unchanged) and its performance
# adjustment, Wednesday lunch, Wednesday home-learning check and team training, Thursday Mom (real
# training logs), Friday Cloudy, Saturday League Game Two.
=== S1_W04_M neutral_school v2
System: Week 4, Monday. Coach Code isn't the loudest problem anymore. "Was that normal?"
System: Sam finds you staring at Saturday's team photo.
Sam: You've been looking at that for a while.
Player: Trying to figure out when soccer became a hostage negotiation.
Sam: First league weekend.
Player: Sam. Their coach was trying to recruit Alex while we were still playing.
Sam: Technically, the ball was out.
System: You look at him.
Sam: Not defending it. Just remembering.
System: A flash of Saturday: Alex waiting near the touchline. An opposing coach leaning toward him.
Opposing Coach: You've got good feet. Come train with us sometime. We'd know how to use you.
System: Then Code's voice cutting across the field:
Coach Code: ALEX! CHECK YOUR SHOULDER!
System: Back in the hallway—
Player: At first I thought Code was yelling about that guy. But there was someone behind Alex. He was actually helping.
Sam: Usually is.
Player: I'm used to him now. He's just loud.
Sam: His whisper has a parking radius.
System: You almost laugh.
Player: But the parents? Everybody yelling different stuff. Their bench talking at us. Some dad telling our players they're on the wrong team.
Sam: You didn't have that back home?
Player: Not like that. People were chill. They watched the game.
Sam: Some people here watch their imaginary future professional athlete.
? sideline
* bother | "Doesn't it bother you?"
  System: Sam's joke disappears.
  Sam: Yeah. I just know which voices to stop listening to.
  Player: I haven't figured that out yet.
  Sam: Code. Teammates. Ref. Start there.
* say_something | "I wanted to say something."
  Sam: To which one?
  Player: That's the problem.
  Sam: You'd have missed the second half working through the list.
* alex | "Was Alex actually interested?"
  System: Sam looks toward the classroom door.
  Sam: Ask Alex.
  Player: You don't know?
  Sam: I know I don't want to put words in his mouth.
System: Blake approaches, catching the last part.
Blake: Someone getting recruited?
System: Neither of you answers.
Blake: Not you, then.
Player: You want something?
Blake: Just wondering how long your team stays your team.
System: He walks away. You turn to Sam.
Player: Does he come with a mute button?
Sam: Been checking since sixth grade.
System: Sam nods toward the school activity area.
Sam: Tomorrow. Your pick.
Player: What?
Sam: Crossbar or Jungle Ball. Something where the adults aren't the main event.
=== S1_W04_S recess v2
System: Tuesday. "My choice this time." Blake is already nearby when you arrive.
Blake: Jungle Ball?
Sam: Their choice.
System: Blake looks at you.
Blake: Picking the easy one?
Player: Picking the one I want. Weird concept, I know.
? activity
* crossbar | Crossbar Challenge
  Player: Crossbar today.
  Blake: Figures.
  Player: You can join or keep commentating.
  System: Sam reaches for his ball.
  Sam: Please join. We've heard the commentary.
* jungle | Jungle Ball
  Player: Jungle Ball.
  System: Blake smiles.
  Blake: Thought last week might have been enough.
  Player: I liked the soccer. The conversation needed work.
@activity crossbar chose:S1_W04_S.activity=crossbar
@activity jungle chose:S1_W04_S.activity=jungle
=== S1_W04_R recess v2
@activity school_reward
@if detail:S1_W04_R=plus
System: You check the result.
System: Sam leans over.
Sam: There you go.
Blake: It's a school game.
Player: Then you can stop being upset about it.
@elif detail:S1_W04_R=minus
System: You stare at the result longer than you meant to.
Blake: Going backwards now?
Player: Bad session. You should recognize one. You've been having a bad conversation for three weeks.
System: Sam snorts. The comeback feels good. The result still doesn't.
@elif detail:S1_W04_R=neutral
Sam: Again next week?
Player: Yeah.
Blake: That your big plan?
Player: Playing soccer again? Pretty solid soccer plan.
@end
=== S1_W04_S2 neutral_school v2
System: Wednesday lunch. "An invitation isn't a contract." Sam is watching a short clip from Saturday.
System: You sit beside him. Riley looks up from her notebook. In the clip, three adults shout three different instructions.
Riley: Which one are you supposed to listen to?
Player: Apparently all of them, while becoming three different people.
System: Sam pauses the video.
Sam: Alex said that coach spoke to his dad too.
Player: When?
Sam: After the game.
System: Blake, passing behind you, slows down.
Blake: Smart.
Player: Nobody asked.
Blake: If a better team wants you, you go.
Riley: Do you know anything about the other team?
Blake: I know they're asking Alex.
System: He looks at you.
Blake: Not everybody gets options.
? blake
* defend | Defend Alex's right to decide.
  Player: Alex can make his own choice. You don't get a vote.
  Blake: Neither do you.
  Player: Finally. Something we agree on.
* challenge | Challenge Blake's assumption.
  Player: Someone saying they want you doesn't make everything they say true.
  Blake: You'd turn it down?
  Player: I'd ask questions. Try it sometime.
* end | End the conversation.
  Player: We're eating.
  Blake: Sensitive subject?
  System: You turn back to Sam.
  Player: Show me the next clip.
  System: Blake stays a moment, waiting for someone to look at him. Nobody does.
System: When he leaves, Riley taps the paused screen.
Riley: What if Alex just wants to hear what they're offering?
System: You don't answer immediately.
Sam: Doesn't mean he's gone.
Player: I know.
Player: I just got here. I'd like everyone to stay in one place for five minutes.
System: Riley closes her notebook.
Riley: That makes more sense than being mad at him.
=== S1_W04_C neutral_pitch v2
System: Wednesday. Mandatory team training. "Whose instructions?" Code calls across the field before you've finished putting down your bag.
Coach Code: SAM! BALLS IN THE BAG, NOT BESIDE THE BAG!
System: You barely react. Sam notices.
Sam: Didn't even flinch.
Player: I'm learning the local language.
@activity home_learning
@if detail:S1_W04_C=completed
System: Code asks you to explain one observation from your home learning and apply it.
@elif detail:S1_W04_C=partial
System: Code asks you to point out what is still unclear.
@elif detail:S1_W04_C=none
System: Code asks what prevented it, and you agree on a specific, manageable next step.
@end
Coach Code: I don't need you telling me you worked hard. Show me what you learned—or tell me where you're stuck.
System: You catch Code beside the equipment.
Player: Can I ask something?
Coach Code: You just did. You get another.
Player: Saturday. Everybody was shouting different instructions.
System: Code sets down the cones.
Player: And their coach was talking to Alex about joining them. During the game.
Coach Code: I heard.
Player: You weren't mad?
Coach Code: I can deal with another adult without making it your job.
System: He gestures toward the field.
Coach Code: During the match, focus on our plan, your teammates, and the referee. If someone on the sideline pressures you or makes you uncomfortable, tell me.
Player: What if Alex wants to hear them out?
Coach Code: Then he and his family can have that conversation away from a match. He doesn't owe anyone an answer while he's taking a throw-in.
System: This week's focus: when to go forward—and when to keep the ball. Code gathers the team.
Coach Code: You will hear "GO!" on Saturday.
Sam: From you?
Coach Code: Quite possibly.
System: A few players laugh.
Coach Code: But noise isn't information. Look first. Can we play forward safely? Is there support? If the route is closed, can we keep it and move them?
System: He turns to you.
Coach Code: Keeping the ball isn't being scared. Forcing it forward isn't automatically being brave.
System: Code presents a situation: the forward route is crowded, but a teammate is available in support.
? tactic
* force | Force the forward pass.
  Coach Code: What tells you that pass is on? If you can't see a route, don't let somebody shouting invent one.
* support | Use the support and move again.
  Coach Code: Good. Now make yourself useful for the next pass.
* hold | Hold the ball and wait.
  Coach Code: Sometimes. But check the pressure. Waiting only helps if you still have time.
=== S1_W04_T neutral_pitch v2
System: Training: this week's Team Training. No scripted failure or automatic success.
@activity team_training
System: Alex sits beside you while changing shoes.
Player: You going?
Alex: Home? Eventually.
Player: You know what I mean.
System: Alex pulls one lace loose.
Alex: I haven't decided anything. My dad said we could listen.
? alex
* stay | "I hope you stay."
  System: Alex looks up.
  Alex: Yeah?
  Player: Don't make it weird.
  Alex: You started it.
* want | "Just make sure it's what you want."
  Alex: Working on that part.
* hear | "Would've been nice hearing it from you."
  Alex: There wasn't anything to tell yet.
  System: You consider that.
  Player: Fair.
System: Code calls you over for the home-learning assignment: a short review of forward versus supporting options, plus your existing individual practice plan.
Coach Code: A focused session you understand is worth more than extra work you're doing just to say you did it.
System: You glance toward Alex. For once, Alex looks as uncertain as you feel.
=== S1_W04_P neutral_home v2
System: Thursday. "What am I looking at?" Mom finds you beside your soccer bag.
Mom: Can we talk about how this week is going?
Player: That sounds dangerously broad.
Mom: Soccer, then. We'll leave your bedroom out of it.
System: She sits.
@activity training_log
@if detail:S1_W04_P=above
Mom: You've logged more training than your plan called for this week. What made you add the extra sessions?
Player: I want to catch up.
Mom: With what?
? catch_up
* longer | "Everyone who's been here longer."
* played | "I didn't like how I played."
* stop | "If I stop, I keep thinking about it."
System: Mom lets the answer land.
Mom: I'm not asking you to care less. I want to know whether this is helping—or whether you're trying to punish a bad day out of yourself.
Player: Coach says the work at home matters.
Mom: It does. That doesn't mean every spare minute has to become training. Let's check the plan with him before you add more.
Player: You think I can't handle it?
Mom: I think you deserve a plan that doesn't depend on proving how exhausted you can get.
? load
* ask_code | Ask Code about workload.
* planned | Return to the planned schedule.
* driving | Tell Mom what's driving the extra work.
@elif detail:S1_W04_P=below
Mom: You said you wanted to follow the practice plan, but the log shows some of it hasn't happened. What got in the way?
Player: You checking up on me?
Mom: I'm asking you. There's a difference.
? got_in_way
* confused | "I don't know what I'm doing on my own."
  Mom: Then let's get the assignment clearer. You don't have to pretend you understand it.
* putting_off | "I keep putting it off."
  Mom: Okay. What's one realistic time you'll do the next session?
* overwhelmed | "School and everything else took more out of me than I expected."
  Mom: Then we need a plan that fits the week you're actually having. Not the perfect week.
Player: You disappointed?
Mom: I'm not keeping score against you. But if this matters to you, I'll help you follow through.
? follow_through
* time | Set a manageable time.
* ask_code | Ask Code for clarification.
* support | Tell Mom what support would help.
@elif detail:S1_W04_P=within
Mom: Looks like you're keeping up with what you agreed to do. How does it feel?
Player: Like you were ready to give a speech and the evidence ruined it.
Mom: Terrible. I'd prepared gestures.
System: She smiles.
Mom: Seriously. Is the schedule working?
? schedule
* manageable | "It's manageable."
* around_school | Ask for help fitting it around school.
* pressure | "The pressure is harder than the sessions."
@end
Mom: Saturday surprised me too.
System: You look up.
Mom: The parents. The yelling. I didn't always know whether I should say something or stay out of it.
Player: You looked calm.
Mom: I was concentrating.
Player: On what?
Mom: Not becoming another person shouting at the field.
System: You laugh.
Mom: What would actually help from me this weekend?
? support
* cheer | "Just cheer. No instructions."
* time | "Give me a little time after the game before we talk about it."
* feel | "Ask how it felt before asking how I played."
Mom: Okay. I can do that.
=== S1_W04_F aquarium v2
System: Friday. "Free advice. Very expensive volume." You sit beside the tank.
Player: Coach Code doesn't really bother me anymore.
Cloudy: Congratulations on your hearing loss.
Player: I can hear him fine.
Cloudy: From what you've told me, so can neighboring states.
System: You explain the sideline shouting and the recruiting approach.
Player: Adults were trying to convince our players to join another team. While we were playing them.
Cloudy: Impatient shoppers.
Player: It's not funny.
Cloudy: No. But "deeply inappropriate aquarium behavior" didn't feel like your language.
System: You smile despite yourself.
? cloudy
* alex | "What if Alex leaves?"
  Cloudy: Did you ask him?
  @if done:S1_W04_T
  System: You tell Cloudy what Alex said after training.
  @end
  Player: He hasn't decided.
  Cloudy: Then you don't know yet.
  Player: I hate that answer.
  Cloudy: You keep asking a fish to control other people. My qualifications are limited.
* noticed | "I want somebody to notice me too."
  System: Cloudy pauses near the glass.
  Player: I know. I just complained about it.
  Cloudy: You can dislike how they asked and still wish they'd asked you.
  Player: That sounds bad.
  Cloudy: It sounds honest. What would you want to know before saying yes?
  System: You think for a moment.
  Player: Whether they actually knew anything about me.
* normal | "I just want Saturday to feel normal."
  Cloudy: What part can you make familiar?
  Player: Warm-up. Find Sam. Listen to Code.
  Cloudy: Good. Three things. Much easier than personally reorganizing every parent.
System: You check the time, then set the phone down.
Player: Mom's trying to help.
Cloudy: Did you tell her how?
Player: Yeah.
Cloudy: Excellent. Saves everyone guessing loudly.
=== S1_W04_G neutral_pitch v2
System: Saturday. League Game Two. "Our side of the line." You hear the field before reaching it.
System: A whistle. A parent calling across the warm-up. A coach demanding a quicker pass. Then—
Coach Code: EYES UP! YOU'VE GOT TIME!
System: You exhale. That voice, at least, makes sense now.
System: Mom walks beside you. She keeps to what you asked for on Thursday. No surprise lecture. No last-minute tactical advice.
Mom: See you afterward.
Player: Yeah.
System: Sam is waiting near the bags.
Sam: Ready?
Player: Ask me after warm-up.
Sam: Healthy avoidance. Respect it.
System: Across the team area, Alex is talking to a parent. He catches you looking. Then picks up his bag and joins the group. For today, he is here.
System: Code brings everyone close.
Coach Code: There will be plenty of opinions outside these lines. We've got jobs inside them.
System: He points toward the pitch.
Coach Code: Look before you play. Forward when it's on. Support when it isn't. Help each other after mistakes.
System: His voice drops. Everyone leans in.
Coach Code: You don't have to impress every person watching. You do have to work with the people wearing your shirt.
? intention
* picture | "Play the picture, not the noise."
* usable | "Be someone my teammates can use."
* next | "Don't let one mistake become the next one."
System: That's your intention for the match. It doesn't change your attributes.
@activity league_match
@if result:S1_W04_G=WIN
System: Sam reaches you, breathless.
Sam: That felt louder than last week.
Player: Everything feels louder than last week.
System: Code gathers the team.
Coach Code: Enjoy it. Then we'll look at what we can repeat.
System: Winning has not answered whether Alex will stay. It has given you a result you earned together.
@elif result:S1_W04_G=DRAW
System: Alex stares back at the field.
Alex: We could've had that.
Player: Yeah.
System: Neither of you needs to pretend it feels satisfying. Code gathers the team before frustration turns into blame.
Coach Code: We'll look at the chances we made and the ones we allowed. Both matter.
@elif result:S1_W04_G=LOSS
System: Someone kicks at the grass. You can already imagine Blake on Monday. Code calls everyone in.
Coach Code: Look here. We're reviewing our performance—not putting each other on trial.
System: You raise your eyes.
Coach Code: One thing to learn. One thing to take into next week. We'll work through it.
@end
@activity standings
@if done:S1_W04_G
System: As you shoulder your bag, Alex approaches.
Alex: Park sometime this week?
Player: Thought you had invitations.
System: Alex's expression changes. You realize how it sounded.
? park
* own | Own it.
  Player: Sorry. That came out wrong.
  Alex: Yeah. It did.
  Player: Park sounds good.
* underneath | Say what is underneath it.
  Player: I don't know if you're staying.
  Alex: I don't know yet either. I'm still asking if you want to play.
  System: You nod.
  Player: Yeah. I do.
* drop | Drop the challenge.
  Player: What time?
  System: Alex studies you for a moment. Then gives a small nod.
  Alex: I'll message you.
System: Mom waits near the exit. Behind you, adults are still arguing about something that happened ten minutes ago.
System: You look back once. Then catch up with her. The conversation—or the quiet—follows what you asked for on Thursday.
@end
=== S1_W04_E neutral_home
System: End of week 4.
@activity week_close

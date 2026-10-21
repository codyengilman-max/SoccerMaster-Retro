# Week 03: "When It Counts" (owner script, 2026-10-20). League Game One.
# Monday school, Tuesday Jungle Ball vs Blake (real result), Wednesday class, Wednesday home-learning check
# (real records) and mandatory team training, Friday Cloudy, Saturday League Game One.
=== S1_W03_M neutral_school v2
System: Week 3, Monday. The first league game is Saturday. Before you get there, Blake wants to make school feel like an away game.
System: Sam catches up outside the cafeteria, holding his phone.
Sam: Saturday. First league game.
Player: You sound surprised.
Sam: Practice feels different when there's a scoreboard coming.
System: He shows the team message: match details, arrival time, what to bring. You read it twice.
Sam: You checking the address or hoping your name disappears?
Player: Checking whether they let you talk during the game.
Sam: Huge part of my skill set.
System: A ball rolls across your path. Blake stands beside two other students. His foot comes down on the ball before you can return it.
Blake: You two comparing bench assignments?
Player: You checking everybody's schedule or just mine?
System: One of Blake's friends laughs before catching himself. Blake looks at him. Then back at you.
Blake: Jungle Ball. Tomorrow.
System: Sam's smile disappears.
Blake: Come on. Prove you can play some real soccer.
Player: You practice that in the mirror?
System: Blake steps closer.
Blake: You always need a joke before you do anything?
? challenge
* meet | Meet the challenge.
  Player: I'll play. You can stop selling it.
  Blake: Don't disappear tomorrow.
  Player: You'll have to find something else to talk about.
* boundary | Set the boundary.
  Player: I'll play Jungle Ball. I'm not playing whatever this is.
  Blake: What's that supposed to mean?
  Player: It means you asked. I answered. Move.
  System: You wait. Blake eventually lifts the ball and steps aside, making it look like his decision.
* not_show | Refuse the performance, not the game.
  Player: I was going to play anyway. You don't get to turn it into your event.
  Blake: Sure you were.
  Player: See you tomorrow.
  System: You walk before Blake can demand another answer.
System: Farther down the hall, Sam finally speaks.
Sam: He's been doing that longer than you've been here.
Player: Does everybody just let him?
System: Sam looks back.
Sam: Sometimes people decide it's easier.
Player: Easier for who?
System: Sam has no quick answer. For once, he doesn't try to make one funny.
=== S1_W03_S recess v2
System: Tuesday. "Everybody's watching." By the time you arrive, Blake already has an audience.
System: Sam stands near the playing area. Riley is beside him, finishing a conversation with another student.
Blake: There you are.
Player: You said tomorrow. It's tomorrow.
Blake: Just making sure you didn't get lost on the way from the crossbar.
Player: Still thinking about that?
System: Blake's expression tightens. Sam steps between the conversation and the start of play.
Sam: We playing, or is this a podcast?
System: Riley laughs. Blake does not.
? before
* answer | Answer Blake.
  Player: Let's see if you talk this much while you're playing.
  Blake: Try keeping up and you'll find out.
* sam | Speak to Sam.
  Player: You actually playing today?
  System: Sam understands the second meaning.
  Sam: Yeah. I'm here.
* silent | Say nothing.
  System: You set your bag down and get ready.
  Blake: Nothing?
  System: You look up.
  Player: You wanted soccer.
@activity jungle
@if result:S1_W03_S=WIN
System: Blake reaches for his bag immediately.
Blake: It's Jungle Ball. Relax.
Player: Yesterday it was real soccer.
System: A couple of students laugh. Blake turns.
Blake: Let's see what you do when it counts.
Player: Pick one. Does this count or not?
System: Blake leaves without answering. You enjoy that. More than you want to admit.
@elif result:S1_W03_S=LOSS
Blake: There it is. That's what I thought.
System: You pick up your bag.
Blake: No comeback?
System: You stop.
Player: You played better today.
System: Blake looks almost disappointed by the answer.
Player: Doesn't make the rest of this impressive.
System: You walk away before Blake can turn the admission into another show. It still hurts. Saying it calmly doesn't change that.
@elif result:S1_W03_S=DRAW
Blake: Saved yourself.
Player: From what?
Blake: You know.
Player: Then you shouldn't have trouble explaining it.
System: Sam picks up his bag.
Sam: Bell's going.
System: Blake keeps looking at you.
Blake: Next time.
Player: Probably. We go to the same school.
@end
@if done:S1_W03_S
System: As the crowd breaks up, Blake calls after you.
Blake: Try not to embarrass your team Saturday.
System: Sam stops walking.
Sam: Our team.
System: Blake looks at him.
Blake: What?
Sam: You said "your team." It's mine too.
System: There is a short, uncomfortable silence. Then Sam turns and catches up.
System: You don't thank him in front of everyone. Sam doesn't ask you to.
@end
=== S1_W03_S2 neutral_school v2
System: Wednesday. "After the audience leaves." In class, you open the team message under the desk.
System: Saturday's arrival time. Same as Monday. Still there.
Riley: Has it changed since the last time you checked?
System: You turn the phone over.
Player: Could have.
Riley: Big game?
Player: First one.
Riley: Here?
System: You nod.
Riley: That's different.
System: Before you can answer, Blake passes your table.
@if result:S1_W03_S=WIN
Blake: Hope you didn't use up your whole season yesterday.
@elif result:S1_W03_S=LOSS
Blake: Coach see you play yesterday? Might save him some time.
@elif result:S1_W03_S=DRAW
Blake: Saturday won't end with everybody pretending they won.
@end
System: He keeps moving. You start to stand. Riley looks up.
Riley: Where are you going?
Player: He doesn't get to—
System: The teacher enters. You sit. Blake glances back, pleased that the last word is still his.
? riley
* admit | Admit what's bothering you.
  Player: I hate that he can say one thing and suddenly that's all I'm thinking about.
  Riley: He checks whether you heard him every time.
  System: You look toward Blake. He is looking back. This time, you turn away first.
* armor | Keep the armor on.
  Player: I'm fine.
  Riley: Okay.
  System: She returns to her work. A moment later:
  Player: Mostly.
  Riley: That sounds more believable.
  System: She doesn't make you explain further.
* saturday | Focus on Saturday.
  Player: I just want to play well this weekend.
  Riley: For your team or at him?
  Player: Both.
  Riley: At least you're honest.
System: After class, Sam waits at the door.
Sam: About yesterday—
Player: You actually said something.
Sam: Yeah.
Player: Took you a while.
Sam: Yeah.
System: No excuse follows. You adjust your backpack.
Player: I heard you, though.
System: Sam nods. You start walking.
Sam: Training later?
Player: That was the plan.
Sam: Good. I need someone there who appreciates my passing.
Player: Find someone before I arrive.
System: Sam grins. The friendship is not fixed by one sentence. But it has somewhere to go.
=== S1_W03_C neutral_pitch v2
System: Wednesday. Mandatory team training. "What happens after?" Coach Code is arranging the session when you arrive.
Coach Code: Before you grab a ball. Last week's home learning.
System: You stop.
Coach Code: What did you notice about the player after they passed?
@activity home_learning
@if detail:S1_W03_C=completed
System: You give the observation you learned. Code asks you to point out where that player moved and why.
Coach Code: Good. Tonight, see whether you can recognize that picture while you're in it.
@elif detail:S1_W03_C=partial
Player: I watched it. I'm not sure I understood all of it.
Coach Code: Show me where you got lost.
System: You briefly review the confusing moment together.
Coach Code: Bring me a question like that. It gives us something useful to work on.
@elif detail:S1_W03_C=none
Player: I didn't do it.
Coach Code: What got in the way?
? obstacle
* forgot | "I forgot."
* time | "I ran out of time."
* hard | "It was difficult, so I avoided it."
System: Code helps you find a manageable time and clears up what got in the way.
Coach Code: You're still training tonight. But I need you doing your part between sessions. I only get a couple of hours with you each week.
@end
System: He gestures toward the team.
Coach Code: Your work at home helps you arrive ready. This is where we learn to use it together.
System: Code gathers the players.
Coach Code: First league game Saturday. Some of you will try to win it in the first thirty seconds.
System: Sam raises a hand.
Coach Code: That wasn't a request.
System: Sam lowers it.
Coach Code: Tonight: what happens after we lose the ball.
System: He places the ball at his feet.
Coach Code: Closest player pressures when they can. Next player protects the dangerous pass. Everybody else recovers and gets organized. We are not sending six people to solve one problem.
System: Alex glances at Sam.
Sam: Why are you looking at me?
Alex: Previous experience.
System: Code points toward the practice area.
Coach Code: Show me.
System: You begin the exercise carrying Tuesday with you. You want every touch to look convincing. You want Code to notice. You want Saturday to erase everything Blake said.
System: During a teaching pause, Code brings you beside him and points to a situation involving your teammates.
Coach Code: Ball's gone. What matters now?
? ball_gone
* win_back | "Win it straight back."
  Coach Code: Maybe. If you're close enough and somebody covers you. If not, chasing can make the next problem bigger.
* stop_pass | "Stop the next pass."
  Coach Code: Good. Which pass hurts us most? Find that before you move.
* position | "Get back into position."
  Coach Code: Good start. But see the ball and your teammates as you recover. Your position changes with what's happening.
=== S1_W03_T neutral_pitch v2
System: Playable training: this week's Team Training. Code's feedback follows what you actually do.
@activity team_training
@if detail:S1_W03_T=strong
Coach Code: There. You helped us recover before you touched the ball.
@elif detail:S1_W03_T=steady
Coach Code: Right idea. We work on the execution. Don't throw away a good decision because the touch wasn't clean.
@elif detail:S1_W03_T=struggled
Coach Code: You're working hard. Now look where that work is taking you.
@end
System: You stay beside the equipment while the others collect their bags.
Player: How do I know if I'm ready for Saturday?
System: Code looks at you.
Coach Code: Ready to do what?
Player: Play.
Coach Code: You've been playing.
Player: You know what I mean.
System: His tone softens, slightly.
Coach Code: You won't know every answer before your first match here. Listen. Do your job. Help the player next to you.
Player: And if I mess up?
Coach Code: You'll have a job after that too.
System: He hands you a cone.
Coach Code: Right now, it's this one.
System: At-home preparation: Code assigns a short continuation of your home-learning work. Notice what the closest two teammates do after possession is lost.
Coach Code: I want you thinking about it, not just telling me you watched it.
System: That evening, your old friends send a message. They are getting online together. You look from the message to the unfinished assignment.
? evening
* finish_first | Finish the learning task, then join late.
* friends_then | Join briefly, set a time to finish after.
* ask_help | Ask for help with the part you don't get.
System: That sets a plan. Only what you actually complete counts as done.
=== S1_W03_F aquarium v2
System: Friday evening. "A very small stadium." The match bag is open on the floor.
System: You take out your shin guards. Check them. Put them back. Cloudy watches from the tank.
Cloudy: Have they escaped before?
Player: What?
Cloudy: The shin guards. You're keeping a close eye on them.
Player: First game tomorrow.
Cloudy: Ah. That explains the packing ceremony.
System: You sit beside the tank.
@if done:S1_W03_S
Player: Blake challenged me to Jungle Ball this week.
Cloudy: Is that the one you've been annoyed about?
Player: That narrows it down less than you'd think.
System: You tell Cloudy what happened.
@end
@if result:S1_W03_S=WIN
Player: I thought he'd finally shut up.
Cloudy: Did he?
Player: No.
Cloudy: Terrible prize.
@elif result:S1_W03_S=LOSS
Player: Worst part is, he played well.
Cloudy: You're allowed to notice that.
Player: I'd rather not.
Cloudy: Understandable. Still happened.
@elif result:S1_W03_S=DRAW
Player: He acted like he won anyway.
Cloudy: Sounds like he brought his own result.
@end
Player: Now I keep thinking about what he'll say if Saturday goes badly.
System: Cloudy swims past the small ornament in his tank.
Cloudy: Is he on your team?
Player: No.
Cloudy: Your coach?
Player: No.
Cloudy: Then he has excellent attendance for someone who isn't involved.
System: You smile, reluctantly.
? why
* prove | "I want to prove him wrong."
  Cloudy: Fair enough. What do you want if he never admits it?
  System: You think.
  Player: To know I can play here.
  Cloudy: That sounds like something worth finding out.
* sam | "I don't want to let Sam down."
  Cloudy: Did Sam invite you because you never make mistakes?
  Player: He watched me play at the park. So definitely not.
  Cloudy: Encouraging. He had the evidence.
* fit | "I miss knowing where I fit."
  System: Cloudy pauses near the glass.
  Player: Back home, I knew who would pass to me. Where I'd sit. All that stuff.
  Cloudy: Who do you know here?
  Player: Sam. A little. Coach knows my name now.
  Cloudy: Loudly, from what you've told me.
  Player: Very loudly.
System: You check the team message one last time. Then turn the phone face down.
Player: Coach says I'll still have a job after I make a mistake.
Cloudy: Good. Mine is swimming, and I've been doing the same lap wrong for months.
System: You laugh. You zip the bag. This time, you leave it zipped.
=== S1_W03_G neutral_pitch v2
System: Saturday. League Game One. "Your name on the team sheet." The parking lot is already busy.
System: Cleats scrape pavement. Someone's younger sibling is complaining about the early start. A parent is trying to open a chair that refuses to cooperate.
System: You pause outside the field. Sam waves from the team area. Just like the gate at your first practice.
Sam: You made it.
Player: You sound disappointed.
Sam: No. Now I have to remember somebody else's water bottle.
System: You join the team. Code checks you in and confirms your role for the match from the real team setup.
System: Alex is tightening a boot.
Alex: First game here?
System: You nod.
Alex: First few minutes feel fast.
Player: Then it slows down?
Alex: Sometimes you just stop panicking.
System: Code calls everyone together before you can decide whether that helped.
Coach Code: You don't need to make the whole season happen today.
System: He looks around the group.
Coach Code: Give each other options. Talk early. When we lose it, do we all chase?
Team: No.
Sam: Apparently not.
System: Code looks at him.
Sam: Learning has occurred.
System: A few players laugh. The tension loosens. Code turns to you.
Coach Code: What's your first job?
? first_job
* look | "Look before I receive."
  Coach Code: Good. Give yourself a picture.
* help | "Help the player next to me."
  Coach Code: Make it something they can see or hear.
* ready | "Stay ready for the next play."
  Coach Code: Exactly. Whatever happened before it.
@activity league_match
@if result:S1_W03_G=WIN
System: Sam reaches you, grinning.
Sam: First one.
Player: You going to act like this after every win?
Sam: Let's find out.
System: Code lets the team enjoy it before gathering them.
Coach Code: Good result. We'll look at what earned it—and where we made it harder than it needed to be.
@elif result:S1_W03_G=DRAW
System: Sam looks back toward the field.
Sam: I've got about four moments I want back.
Player: Only four?
Sam: I'm editing.
System: Code gathers the team.
Coach Code: Remember what you saw. We'll use it. Standing here replaying the score won't change it.
@elif result:S1_W03_G=LOSS
System: For a moment, nobody knows what to do with their hands. Sam pulls at the tape around his wrist.
Sam: Not how I pictured that.
Player: Me neither.
System: Code waits until everyone is listening.
Coach Code: We lost. We're going to be honest about why. And nobody's picking one teammate to carry it for everybody.
System: He looks around the circle.
Coach Code: We come back. We work.
@end
@activity standings
@if done:S1_W03_G
System: As the team breaks up, you look at your phone. Your old group chat has a message.
Old Friend: First game today, right? How'd it go?
System: You start typing the result. Stop. Across the field, Sam calls your name.
Sam: You coming?
System: You look up.
? reply
* honest | Send the honest version.
  System: You share the real result and how the debut felt. Then pocket the phone and follow Sam.
* call_later | "Call you later? Got a lot to tell you."
  System: Home is still there. You don't have to abandon it to walk toward your new team.
* photo | Take a photo of the field first.
  System: Not a victory pose. Not proof for Blake. Just the place where your first league game here happened.
  System: You send it, then jog to catch up.
Sam: What took you?
Player: Trying to describe you without making the team sound bad.
Sam: Impossible. Lead with my passing.
System: You leave together.
@end
=== S1_W03_E neutral_home
System: End of week 3.
@activity week_close

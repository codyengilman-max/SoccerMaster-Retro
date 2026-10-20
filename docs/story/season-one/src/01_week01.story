# Week 01: You Don't Know Anybody Yet (owner rewrite 2026-10-20). No school yet, no league game.
# Tuesday park with Sam + a friendly Crossbar against Sam, Thursday first training with Coach Code,
# Friday Cloudy, Friday night Mom. Results stay real: nothing below forces a Crossbar or training outcome.
=== S1_W01_M recess v2
System: Week 1, Tuesday. The local park, late afternoon. (Stand-in art: the schoolyard goal.)
System: A boy is standing several steps from the goal, arguing with himself.
Sam: Height was good. Direction was terrible. Overall, promising.
System: He shoots. The ball sails over the crossbar. You stop it as it rolls back from the fence.
Player: Which part was promising?
Sam: The part where nobody was watching.
System: You pass it back. He looks at the second ball under your arm.
Sam: You play?
Player: No. I carry this around so people ask.
Sam: Good. You're annoying. We'll get along.
Sam: Crossbar challenge?
? sam_reply
* prize | "What do I get when I win?"
  Sam: The respect of everyone here.
  System: You both look around. A man walks a dog on the far side of the park.
  Player: Big crowd.
  Sam: He's very difficult to impress.
* few_shots | "I'm just having a few shots."
  Sam: Perfect. Have three in my direction.
  Player: You always this persistent?
  Sam: Only when I'm losing to myself.
* not_good | "I've never been that good at crossbar."
  Sam: Neither have I. You arrived during my demonstration.
Sam: Three each. Same place. No pretending a post counts.
Player: That happen often?
Sam: I'm trying to become a better person.
Sam: I'm Sam.
Player: {player.name}.
Sam: You live around here?
Player: Since yesterday.
Sam: Then I've got approximately one whole day of local knowledge on you.
Player: You moved here two days ago?
Sam: No. I just don't know much.
=== S1_W01_S recess v2
System: Crossbar with Sam. One warm-up each, then three counted shots each from the same line, taking turns. Only the bar scores.
@activity crossbar
@if result:S1_W01_S=WIN
Sam: Congratulations. You've beaten the third-best crossbar player in my house.
Player: How many people live there?
Sam: We don't need to investigate everything.
@elif result:S1_W01_S=DRAW
Sam: A draw. Very professional.
Player: You want another round?
Sam: Desperately. But I should probably pretend I have a life.
@elif result:S1_W01_S=LOSS
Sam: I'd like to thank the crossbar for finally cooperating.
Player: Rematch.
Sam: There it is.
@else
Sam: No score today. The bar will still be here.
@end
System: You sit in the shade beside the field. Sam turns his ball slowly under one foot.
Sam: You got a team yet?
Player: I've barely got a bedroom.
Sam: You should come out for mine.
Player: Just like that?
Sam: You like playing. You haven't thrown anything at me. Strong start.
Player: What's your coach like?
Sam: Loud.
Player: That's your sales pitch?
Sam: He actually teaches you stuff.
Player: After the yelling?
Sam: Sometimes during.
? invite
* in | "Yeah. I'm in."
  Sam: Good. I'll ask Code about Thursday.
  Player: Code?
  Sam: Coach Code. You'll understand the "Coach" part immediately.
* good_enough | "Am I even good enough?"
  Sam: I don't pick the team. But you don't have to already be on it to come train.
  Player: And if I'm terrible?
  Sam: Then you'll know what to work on.
  Player: You sound like your coach.
  Sam: That's upsetting.
  System: You agree to try one session.
* one_practice | "One practice. I'm not promising anything."
  Sam: Perfect. Neither is he.
  Player: You're really bad at selling this.
  Sam: Yet you're coming.
* ask_mom | "I need to ask my mom."
  Sam: Yeah. Mine will send her the details.
  Player: You've thought this through.
  Sam: I've been here before.
System: Sam's family shares the details with Mom. Coach Code confirms a guest session: a chance to train, not a promised place on the team.
Sam: I'll meet you by the gate.
Player: You better.
Sam: I'll be the one looking incredibly prepared.
=== S1_W01_C neutral_pitch v2
System: Thursday. The training complex, late afternoon. You check your boots, then your water bottle, then your boots again.
Coach Code: ALEX! YOU PASSED IT! YOU DIDN'T FINISH YOUR SHIFT! MOVE AGAIN! GIVE YOUR TEAMMATE SOMETHING!
System: You freeze halfway out of the car. On the field, Alex starts running.
Player: That's him?
Mom: I'm guessing.
Sam: You came!
Player: You said loud. You didn't say airport loud.
Sam: I was trying to get you here.
System: Code blows his whistle and walks toward Alex.
Coach Code: What happened after your pass?
Alex: I thought he'd turn.
Coach Code: And if he couldn't?
Alex: He needed another option.
Coach Code: Exactly. Don't admire the pass. Help the next one.
Coach Code: You must be our guest.
Player: {player.name}.
Coach Code: {player.name}. Good to meet you. Sam says you've just moved.
Player: Monday.
Coach Code: Then you've had a busy week.
? code_intro
* yell | "Do you always yell like that?"
  System: Sam stares at you.
  Coach Code: When someone's forty yards away doing the same thing for the third time? Sometimes.
  Coach Code: You're standing right here. We can talk normally.
* try | "Sam said I could try training."
  Coach Code: He asked. I said yes. You get a proper session. I get a proper look. Fair?
  Player: Fair.
* nervous | "I'm a little nervous."
  Coach Code: Good of you to say it. You don't need to impress everybody in the first five minutes. Learn the exercise. Ask when you don't understand.
  Coach Code: And bring your water. Arizona has already started the warm-up.
System: Code introduces you to the group and assigns a partner. Sam starts stepping forward.
Coach Code: Sam, you can survive ten minutes without doing the talking.
Sam: Unconfirmed.
System: A few players laugh. Your shoulders drop slightly.
System: First touches with a new group: the ball runs a little farther than you meant, and you hurry the return.
Player: Sorry.
Coach Code: You don't owe me an apology every time the ball moves. Give me the next touch.
? help
* show | "Can you show me once?"
  System: Code cushions a pass into a usable position, passes, and moves.
  Coach Code: Give yourself somewhere to go before it gets here.
* too_fast | "I'm trying to do it too fast."
  Coach Code: Then start with what you can control. One useful touch. One playable pass. Build from there.
* let_me | "I've got it. Let me go again."
  Coach Code: All right. But you're allowed to ask for help before you're angry.
Alex: He did that to me my first week. The "next touch" thing. Yelling was my second week.
System: You laugh despite yourself.
Coach Code: Receive, pass, move to offer another angle. Then a defender joins in. Same exercise, different picture. Keepers: receive, set, distribute, and move to stay available.
@activity team_training
@if detail:S1_W01_C=strong
Coach Code: You're comfortable with the ball. Good. Now show me you can notice when the easy option closes.
@elif detail:S1_W01_C=steady
Coach Code: That one. What changed?
Player: I knew where I wanted the touch.
Coach Code: You looked before it arrived. Keep doing that.
@elif detail:S1_W01_C=struggled
Coach Code: You're trying to fix three things at once. For the next repetition, just find the pressure before the ball comes. We'll build from there.
@end
Sam: Still coming back?
Player: Ask me when my legs forgive you.
Coach Code: You did the difficult part today.
Player: Running?
Coach Code: Walking through the gate when you didn't know anybody.
Coach Code: Before next session, work on receiving. Short passes with someone, or a suitable wall if you have safe space. Set the ball where you can use it. Don't just stop it under your feet.
Player: How much?
Coach Code: A short plan that fits. Do it with attention. Tell me what gets easier and where you get stuck.
Player: So there's homework.
Coach Code: You moved to a new city. Unfortunately, homework found the address.
Sam: He remembered your name.
Player: He yelled it.
Sam: Correct pronunciation, though.
System: You still don't know whether this will become your team. But now you know where the gate is.
=== S1_W01_F aquarium v2
System: Friday evening. You lower yourself onto the floor. Slowly.
Cloudy: Interesting technique.
Player: My legs hurt.
Cloudy: I've avoided that problem through careful planning.
Player: You don't have legs.
Cloudy: Excellent planning.
System: You tell Cloudy about Sam, the park challenge and Coach Code.
@if result:S1_W01_S=WIN
Player: I beat Sam at crossbar, by the way.
@elif result:S1_W01_S=LOSS
Player: Sam beat me at crossbar. I want a rematch.
@elif result:S1_W01_S=DRAW
Player: Sam and I drew at crossbar.
@end
Player: You could hear Code from the parking lot.
Cloudy: Helpful. Most people need signs.
Player: I thought he was going to hate me.
Cloudy: Did he?
Player: No. ...I still messed things up.
Cloudy: You were expecting to arrive fully assembled?
? share
* used_to | "I used to feel better at this."
  Cloudy: Before you moved?
  Player: Yeah. I knew everybody. I knew what we were doing.
  Cloudy: That sounds like quite a lot to lose in one week.
  Player: What if it takes forever to feel normal?
  Cloudy: Let's try another practice before we measure forever.
* sam_funny | "Sam's actually pretty funny."
  Cloudy: A dangerous development. I've had a monopoly.
  Player: He came to meet me at the gate.
  Cloudy: You were worried he wouldn't?
  Player: A little.
  Cloudy: But he did.
  Player: Yeah.
* show_code | "I want to show Code I'm better than that."
  Cloudy: Better than what?
  @if detail:S1_W01_C=strong
  Player: I played okay. It just felt like being watched the whole time.
  @else
  Player: My touch kept getting away from me once the defender came in.
  @end
  Cloudy: Did he ask you to be finished?
  Player: He asked me to practice.
  Cloudy: Convenient. That sounds more achievable by next session.
Player: School starts next week.
Cloudy: Another building full of people. You're collecting them.
Player: At least I know Sam.
Cloudy: That's one more than you knew when you got here.
System: There are still boxes against the wall. Your boots are by the door now.
? intention
* home_plan | Keep the home plan; go back to training
  Cloudy: An intention, not a trophy. We'll see what you actually do.
* sam_park | Ask Sam to meet at the park again
  Cloudy: Ask him. What he says is his part.
* school | Get ready for school, one thing at a time
  Cloudy: One thing at a time. I recommend starting with socks.
Player: You seem pretty comfortable already.
Cloudy: I brought my entire house.
Player: Fair.
=== S1_W01_P neutral_home v2
System: Friday night. The kitchen. Two mugs on the counter; a few unopened boxes remain. Mom is staring at her phone.
Player: Lost again?
Mom: I'm learning the area.
Player: That's directions to the grocery store.
Mom: A very important part of the area.
Mom: How was the first week?
Player: You were here.
Mom: I saw the parts you let me see.
Player: I thought you were going to ask about soccer.
Mom: I was going to ask about you.
? worry
* fit_in | "I'm worried I won't fit in."
  Mom: Me too.
  Player: You?
  Mom: You think grown-ups arrive somewhere new and immediately know where they belong?
  Player: You act like you do.
  Mom: I'm your mom. Sometimes I'm trying to make the next ten minutes feel manageable.
* mad | "I'm still mad we moved."
  Mom: I know.
  Player: Meeting Sam doesn't mean I'm suddenly happy about everything.
  Mom: It doesn't have to. You can like something here and still miss what we left.
* training_hard | "Training was harder than I thought."
  Mom: Hard because of the soccer, or hard because you were new?
  Player: ...Both, maybe.
  Mom: I watched you sit in the car checking the same bag three times.
  Player: You noticed?
  Mom: I was checking the address for the fourth time.
Mom: I'm nervous too.
Player: About what?
Mom: Getting things wrong. Finding our routine. Whether this place will start feeling like ours.
Mom: That's mine to handle. You don't have to make the team or have a perfect first week to make me feel better.
Player: I thought maybe if soccer went well, the rest would.
Mom: It might help.
Player: But?
Mom: But you're allowed to have more than one thing going on.
? support
* stay | "Can you stay for the next practice?"
  Mom: If you want me there, yes.
  Player: Just don't yell instructions.
  Mom: That appears to be a fully staffed position.
* minute | "Give me a minute before asking how it went?"
  Mom: Yes.
  Player: Sometimes I don't know yet.
  Mom: Then I'll stop asking for the final report in the parking lot.
* other_thing | "Something with no moving and no soccer?"
  Mom: Absolutely.
  Player: And doesn't involve unpacking?
  Mom: You negotiate aggressively.
  System: You pick a small plan together: a walk, a movie, or finding a place for a favorite treat.
Mom: We don't have to settle everything tonight.
Player: Good. I don't even know where half my stuff is.
Mom: Neither do I.
Player: You labeled the boxes.
System: She turns one toward you. On the side, in thick marker: IMPORTANT THINGS.
System: You both laugh. For the first time since arriving, the kitchen sounds less empty.
=== S1_W01_E neutral_home
System: Weekend. No league game this week. The schoolyard is open if you want extra practice, and your training plan is in Career.
@activity week_close

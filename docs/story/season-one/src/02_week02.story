# Week 02: Nobody Saved You a Spot (owner rewrite 2026-10-20). No league game, no Mom conversation.
# Monday lunch, Tuesday Crossbar vs Blake (refusal is remembered as a refusal, a tie stays a tie),
# Wednesday classroom, Wednesday training, Thursday Cloudy. S1_W02_P is retired (week 1 has the Mom talk).
=== S1_W02_M neutral_school v2
System: Week 2, Monday. The lunch courtyard. (Stand-in art: school.) One chair at the table is empty.
Sam: You can—
System: Blake drops his backpack onto the chair.
Blake: That seat's taken.
Player: Does it eat, or are you saving it for someone?
System: Sam laughs before he can stop himself. Blake turns toward him. Sam studies his lunch.
Blake: You always talk this much?
Player: Only when luggage gets a seat before I do.
Riley: Blake. Move the bag.
Blake: There are other tables.
System: You stay standing. The tray feels heavier, but leaving now would give Blake exactly what he wants.
? chair
* move_it | "Move it yourself. I'm not touching it."
  System: You hold eye contact. Blake eventually drags the bag away with his foot.
  Blake: Relax. Nobody said you couldn't sit.
  Player: You literally just did.
  System: You sit. The conversation around the table doesn't immediately restart.
* sam_coming | "Sam, you coming?"
  Sam: I was already—
  Player: Eating? You can do that over there.
  System: Sam hesitates, then picks up his lunch.
  Blake: Taking your new friend on a tour?
  Sam: Just lunch.
  System: It costs Sam something to say it. You notice.
* where_play | "Keep the chair. Where do you play?"
  Blake: You play?
  Player: That's usually why people ask.
  Blake: We'll find out.
System: Before recess ends, Blake picks up his ball.
Blake: Crossbar. Tomorrow. Three shots each.
Player: Same ball. Same line.
Blake: You already need rules?
Player: I like knowing which ones you'll complain about.
System: This time, Riley laughs. Blake hears it.
=== S1_W02_S recess v2
System: Tuesday. Schoolyard, recess. Blake has picked a spot with an audience: Sam by the goal, Riley at the fence with two other students.
Blake: New kid says they can play.
Player: New kid has a name. {player.name}.
Blake: Hit the bar. Maybe I'll remember it.
Sam: Three each. Alternate. One warm-up each if you both want it.
System: Blake nudges the ball a shoe-length farther back. You roll it straight back onto the mark.
Player: From there.
Blake: ...Fine.
? audience
* watch | "Watch closely."
  System: You let the crowd look. Fine. Let them.
* counting | "Sam, you're counting."
  Sam: Counting. Out loud. Bar only.
* silent | Say nothing. Set the ball.
  System: You set the ball and let the next kick answer.
* refuse | Refuse: "Not an audition."
  Player: I'll play soccer. I'm not doing an audition for your lunch table.
  System: Blake calls after you. You keep walking. It's remembered as a refusal, not a defeat.
@if chose:S1_W02_S.audience=watch|counting|silent
? warmup
* yes | One warm-up each
  Blake: Whatever. One each.
* no | Straight to the counted shots
  Blake: Good. Less waiting.
System: How you handled the crowd changes the talk, not your aim. Blake gets the same physics you do.
@end
@activity crossbar chose:S1_W02_S.audience=watch|counting|silent
@if result:S1_W02_S=WIN
System: Blake collects the ball before anyone can celebrate for long.
Blake: It's a crossbar. Try doing something useful in a game.
Player: You picked it.
System: Sam looks down to hide his smile. Blake walks away with the ball under his arm.
@elif result:S1_W02_S=DRAW
Blake: Again. Sudden death.
System: The bell rings.
Player: Tomorrow, if you still need an answer.
Blake: Scared?
Player: Of being late to math? A little.
System: The tie stays a tie. Blake doesn't get to change the result by talking louder.
@elif result:S1_W02_S=LOSS
Blake: Long way to move just to miss that.
System: For a moment, you have no comeback. That one landed.
Player: You won three shots. Don't get confused about what else you won.
System: You pick up your bag and walk toward class without waiting for permission.
@end
=== S1_W02_S2 neutral_school v2
System: Wednesday morning. The classroom, before the teacher arrives. Someone has drawn a small scoreboard on the corner of the board.
@if result:S1_W02_S=WIN
System: The board says: CROSSBAR CHAMPION — STILL NO TEAM.
@elif result:S1_W02_S=DRAW
System: The board says: NEW KID: STILL UNDER REVIEW.
@elif result:S1_W02_S=LOSS
System: The board says: {crossbar.score}. WELCOME TO ARIZONA.
@else
System: The board says: TRYOUT CANCELLED.
@end
System: Blake is sitting on the edge of a desk. Two classmates are laughing. You put your bag down carefully.
Player: You get here early just to think about me?
Blake: It's a joke.
Player: Then explain the funny part.
Blake: Don't be so sensitive.
Player: Don't hide behind "joke" because I answered.
Blake: Leave it.
System: Riley wipes off the last line.
Riley: You had your turn.
? board
* erase | Take the eraser and finish
  Player: You don't have to like me. You do have to stop putting my name on things.
  System: You hand back the eraser and sit down. Your hands shake under the desk, where Blake can't see.
* ask_sam | Ask Sam: "Were you part of this?"
  Sam: I laughed.
  Player: Yeah. I saw.
  Sam: I didn't write it.
  Player: That wasn't what I asked.
  @if chose:S1_W02_M.chair=sam_coming
  System: Sam has to sit with that. On Monday he walked away from Blake with you. One brave moment didn't make him brave every time.
  @else
  System: Sam has to sit with that.
  @end
* teacher | Call the teacher over when she enters
  Player: Can you look at this before it gets erased? It's the second time he's made a thing out of me being new.
  System: Blake starts talking over you.
  Player: I'm still speaking.
  System: The teacher sees the board and takes the conversation away from the audience. Getting help is an assertive choice.
System: After class, Riley catches up outside.
Riley: You don't have to answer everything he says.
Player: I know.
Riley: Do you?
Player: I'm working on knowing it faster.
Riley: That was a better answer.
=== S1_W02_C neutral_pitch v2
System: Wednesday afternoon. The training field. You're still thinking about the classroom. Code rolls a ball toward you.
Coach Code: Before we start. Did you do the home work?
? homework
* yes | "Yes. The receiving practice."
  Coach Code: What got easier?
  Player: Setting it to the side instead of under my feet.
  Coach Code: Good. Now we find out whether you can use it with someone trying to stop you.
* some | "Some of it. I kept getting stuck."
  Coach Code: Where did it break down? ...Show me after the session. Getting stuck gives us something to work with. Pretending you understand doesn't.
* no | "No. I didn't get to it."
  Coach Code: What got in the way? ...Then we make a plan you can actually keep. I expect you to come back having tried.
Coach Code: I get you for a couple of hours a week. At home, you get repetitions. Here, you learn when to use them. Today: make yourself available before you ask for the ball.
System: In the demonstration, Alex passes toward you. A defender steps into the lane and intercepts.
Player: That pass wasn't getting through.
Coach Code: You're right. What could you have changed before Alex kicked it?
Player: Moved?
Coach Code: Where?
? angle
* behind | "Out from behind the defender?"
  Coach Code: Show Alex a clear lane. Make the defender choose between following you and protecting something else.
* closer | "Closer to Alex?"
  Coach Code: Sometimes. But closer isn't automatically open. Look at the defender, then choose your angle.
* follows | "What if the defender follows me?"
  Coach Code: Then you've moved a defender. Who can use the space you just opened?
  Player: Them.
  Coach Code: Now you're seeing more than your own feet.
Coach Code: Find the passing angle. Get out of the cover shadow, give a lane your teammate can use, and adjust when the defender follows. Keepers: support the build-up and distribute from your own position.
@activity team_training
@if detail:S1_W02_C=strong
Coach Code: That movement gave your teammate a choice. Do you see why it mattered?
Player: I didn't even get the ball.
Coach Code: And the team still got out. Keep that.
@elif detail:S1_W02_C=steady|struggled
Coach Code: You kept asking for it before checking the lane. Next time, find the defender first. Then move.
@end
Coach Code: Keep working on that first touch at home. And in this week's learning clip, watch the player who never touches the ball. Tell me what they changed.
Player: You give homework too?
Coach Code: Mine comes with grass stains.
=== S1_W02_F aquarium v2
System: Thursday evening. You stand beside the aquarium, still in your school clothes.
Cloudy: You've been making that face for ten minutes.
Player: What face?
Cloudy: The one that suggests you're about to challenge a cupboard.
System: You tell Cloudy about the chair, the Crossbar and the classroom.
@if result:S1_W02_S=WIN
Player: I beat him at crossbar. He still wrote on the board.
@elif result:S1_W02_S=DRAW
Player: We tied at crossbar. He wanted sudden death; the bell said no.
@elif result:S1_W02_S=LOSS
Player: He beat me at crossbar. Then he put it on the board.
@else
Player: I didn't even play his crossbar thing. He still wrote on the board.
@end
Player: I had something better I could've said.
Cloudy: Of course. The best comebacks arrive after dinner. Terrible transportation system.
Player: He thinks he can just decide who I am.
Cloudy: And you've spent all evening helping him. He said something at school. You brought it home. Gave it a room. Apparently it lives here now.
Player: So I'm supposed to let him do it?
Cloudy: No. But making him stop and making him like you are different jobs.
? admit
* beat_him | "I want to beat him so badly he shuts up."
  Cloudy: Reasonable fantasy. What if he loses and keeps talking?
  @if result:S1_W02_S=WIN
  Player: ...He already did.
  @end
  Player: Then I'll need another reason to get better.
  Cloudy: There you are.
* sam | "I thought Sam was going to back me up."
  Cloudy: Did you tell Sam that?
  @if chose:S1_W02_S2.board=ask_sam
  Player: I asked if he was part of it. He said he only laughed.
  Cloudy: What did you want him to do?
  Player: Stop acting like it was nothing.
  @else
  Player: I shouldn't have to.
  Cloudy: Possibly. Still leaves you both guessing.
  @end
  Cloudy: You can talk to him next week. I can't promise what he'll say.
* tired | "I'm tired of being the new kid."
  Cloudy: You were somebody before you got here.
  Player: Nobody here knows that.
  Cloudy: You do. Try acting like your opinion counts too.
Player: Code had us working on getting open. He said you can help someone else get the ball without getting it yourself.
Cloudy: I'm excellent at that. Terrible at doors. Did that annoy you?
Player: A little.
Cloudy: Honest. Disturbing development.
@if detail:S1_W02_C=strong
Player: It worked, though. I moved, the defender came with me, and Alex had another pass.
Cloudy: Did you need everyone to clap for it to count?
Player: No.
Cloudy: Useful information.
@else
Player: I kept moving where I wanted the pass instead of looking at the defender.
Cloudy: And now you know what you're looking for?
Player: I think so.
Cloudy: Try it. Report back. My calendar is unusually open.
@end
Player: You're pretty confident for someone who swims into the same corner every day.
Cloudy: I'm testing it. The corner is under review.
System: On a loose page you'd started writing another comeback. You cross it out and write one intention underneath.
? intention
* control | Get better at something I control
  Cloudy: Good. That one doesn't need Blake's permission.
* sam_friend | Find out if Sam can be a real friend
  Cloudy: Then ask him. Friends can survive a real question.
* make_place | Stop asking Blake for a place. Make one.
  Cloudy: Make one. Then don't hand him the key.
System: Code's home assignment is still waiting. So is the next school day.
Mom: Dinner's ready!
Player: Coming.
System: For once, you leave the argument in the room.
=== S1_W02_E neutral_home
System: Weekend. The assessment closes with Coach Code's feedback. Next week: league game 1.
@activity week_close

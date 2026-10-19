# Week 04: A Seat at the Table. League game 2.
=== S1_W04_M aquarium
System: Week 4, Monday. A Seat at the Table.
Cloudy: How was the debut?
@if result:S1_W03_G=WIN
Player: We won.
Cloudy: Good. A win. You're still you. I checked the paperwork.
@elif result:S1_W03_G=DRAW
Player: We drew.
Cloudy: Even. You're still you. I checked the paperwork.
@elif result:S1_W03_G=LOSS
Player: We lost.
Cloudy: Losing isn't fun. I won't pretend it was. You're still you. I checked the paperwork.
@else
Player: It didn't really finish.
Cloudy: Then there's nothing to grade. You're still you. I checked the paperwork.
@end
? feeling
* proud | Proud.
  Cloudy: Enjoy it. Proud doesn't have to mean perfect.
* disappointed | Disappointed.
  Cloudy: Disappointed means you care. Keep the caring, drop the sinking.
* mixed | Mixed.
  Cloudy: Mixed is the most honest flavour.
=== S1_W04_S neutral_school
System: Lunch. There's a spare chair next to Riley, who is drawing an illustrated notice for the school board.
Riley: Can I ask your opinion? Does this look like a soccer ball or a potato?
System: Someone nearby makes a small joke about your awkward first day.
System: Story setting: how should Riley's storyline go? You can change your mind only by starting a new career.
? riley_route
* friendship | Riley as a friend
  System: Riley's storyline stays a friendship.
* crush | Allow an optional crush
  System: Riley's storyline can include a small crush. Riley's interest is never earned by match results.
? lunch
* sit | Sit and ask about the drawing
  Player: Definitely a ball. Maybe add the stitching lines?
  Riley: Stitching lines. Yes. That's the potato fix.
  @if chose:S1_W04_S.riley_route=crush
  System: Your face feels warm for no reason at all.
  @end
* one_idea | Offer one idea, then go back to Jordan
  Player: More stitching lines. Then it's a ball.
  Riley: Thanks. See you around.
* another_time | Say "Maybe another time"
  Player: Maybe another time.
  Riley: Sure. The chair's usually free.
=== S1_W04_C neutral_pitch
Coach Code: People remember the score. I need you to remember what the game was asking.
? code
* review | Review one action from the last game
  Coach Code: Good. One real moment, honestly reviewed, is worth more than ten stories.
* opponent | Ask about the next opponent
  Coach Code: Their midfield presses fast. Get the picture before the ball arrives.
* simple_task | Keep a simple task
  Coach Code: Simple task: scan before you receive. Every time.
Coach Code: A look should give you information, not just move your head. If you don't have the picture, protect the ball and get help.
@activity team_training
=== S1_W04_F aquarium
Cloudy: You sat at a table. Incredible. I've been training on a rock for years.
? reflection
* worked | Training went well.
  Cloudy: Then the plan is working. Keep it.
* difficult | Training was difficult.
  Cloudy: Difficult today, easier next time. That's how this works.
* not_yet | I want to talk about school instead.
  Cloudy: School it is. Lunch tables are basically a tactics board.
? preparation
* pressure | Notice pressure early
  Cloudy: Look over the shoulder before the ball comes. Early info, calmer touch.
* teammate_call | Ask a teammate for a useful call
  Cloudy: "Man on" and "time" are free. Ask for them.
* reuse_cue | Reuse last week's cue
  Cloudy: If it worked, use it again. That's not boring, that's smart.
=== S1_W04_P neutral_home
@if chose:S1_W02_P.parent=just_listen
Mom: Do you want me to just listen tonight? No advice unless you ask.
@end
Mom: I want to hear how your day felt, not just whether people liked you.
? topic
* riley | Talk about Riley
  Player: There's this kid, Riley. We talked at lunch.
  Mom: That sounds nice. What would help this week?
* exclusion | Talk about being left out
  Player: Some kids still act like I'm not there.
  Mom: That's hard. What would help? Me listening, or me helping you plan?
* pressure | Talk about soccer pressure
  Player: Everyone keeps watching what I do in games.
  Mom: That's a lot. What would help: a quiet ride there, or talking it through?
Mom: Whatever you pick, I'm on your side.
System: You both end up laughing about the vending machine that eats coins.
=== S1_W04_G neutral_pitch
System: League game 2. Kickoff.
@activity league_match
@if result:S1_W04_G=WIN
Coach Code: A win. Two games in, and you're learning what the game asks.
@elif result:S1_W04_G=DRAW
Coach Code: A draw. Fair result. Next week we build on it.
@elif result:S1_W04_G=LOSS
Coach Code: A loss. We keep what we earned and find the next step.
@else
Coach Code: Not finished, so there's no result. It stays pending.
@end
@activity standings
=== S1_W04_E neutral_home
System: Weekend. The table updates from real results only.
@activity week_close

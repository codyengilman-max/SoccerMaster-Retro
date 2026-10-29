# Completed design handoff — 2026-10-29

The requested training-board and demonstration-screen concepts are now included in screen_concepts/. Preserve the existing 14 demonstration designs, source notes and review boundaries.

## Build direction

1. Use Home_Training_Board.png as the visual reference for exactly two Home Training sections: Juggling and Ball Mastery. Keep Team Training separate. Use the selected boy/girl protagonist in the actual app; the boy in these concepts is not a replacement for character selection.
2. Start juggling opens the existing juggling flow. Watch & practise opens the relevant Ball Mastery lesson using Ball_Mastery_Demonstration_Screen.png as its layout reference.
3. Keep cream/navy/orange styling, blue navigation, large demonstration stage, foot-detail inset and Coach Code cue. Build real responsive text and controls; do not use the whole screenshot as a clickable background.
4. Playback controls belong primarily on the lesson screen. The home-board control strip is a visual preview; either make it a genuine inline preview or omit it from the hub. Do not ship decorative controls that look interactive but do nothing.
5. Keep Play/Pause, Step, 0.5x and Right/Left bound to the same approved demonstration. Log practice records the player's report, not automatic proof of mastery. Preserve existing attributes and rewards.
6. These PNGs are AI-generated visual concepts, not sprite atlases or verified footwork. Use existing approved character assets and separately reviewed motion. Do not slice the concept player into production animation frames.
7. Follow DEVIN_DEMONSTRATION_DESIGN.md for motion and the separate Research Expansion v2 package for validation/release rules. This design ZIP is not a replacement for that code package.
8. Test both character choices, portrait/landscape, legible mobile text, working navigation and unchanged training history. Report missing reviewed demonstrations rather than marking them approved.

Packaging is complete. Live implementation, finished animations and coaching approval are separate outstanding work; no approval or release flags were changed by adding these visuals.

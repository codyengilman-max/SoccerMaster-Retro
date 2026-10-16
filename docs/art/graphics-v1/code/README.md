# Renderer reference
`sprite-factory.mjs` exports the approved procedural renderer as a browser ES module.
No install is required to view the reference. The separate cutscene demo uses Intl.Segmenter for Unicode boundaries; if unavailable it shows a clear unsupported-browser message instead of corrupting a name. Production must reuse its validated identity service and tested fallback. It requires a browser DOM + Canvas2D; do not execute it at Node import-time expecting a canvas.

`const frame = sprite(0, 0, 2, 'run', false, 2, 3);`
This creates an orange kit, east-facing input, run pose 2, auburn mohawk.

The approved demo source is 64 x 64 with anchor (32,52). The packaged factory/export adds 16 transparent pixels on every side so rotated poses are not clipped: frame 96 x 96, foot anchor (48,68), origin (0.5, 0.7083333333). To retain exactly the approved visible player size, draw the padded canvas at 144 x 158.4 with its foot at the world position. This is the same 1.5x/1.65x scale, not a larger body. Exported sheets use 96 x 96 cells. Match scale to the existing game's world units by visual comparison. Ball contact and collisions keep their existing simulation coordinates. Eight direction inputs use a simplified largely frontal body; this is not a complete hand-animated eight-view character sheet.

Render-only factory does not add real player identity, roster number, skill, collision, animation timing, possession logic or controls. Existing prototype repeats numbers 10/6/1. When integrating, use existing roster shirt numbers and preserve identity across looks. Team palettes and the prototype's skin tone are examples; use actual appearance/team data rather than assigning hair or skin from performance or role. The user-approved protagonists remain dark-haired boy/light-haired girl.

Cache is bounded to 512 frames. Build/prewarm only the current roster off the match-critical path, not every theoretical combination. Dispose textures on scene teardown. Atlas exporter below generates one configured appearance at a time.

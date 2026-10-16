// Package-only check. Optional development dependency: @napi-rs/canvas.
// No network, credentials, repository mutation, or game engine execution.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCanvas } = require('@napi-rs/canvas');
globalThis.document = { createElement: kind => {
  assert.equal(kind, 'canvas');
  return createCanvas(96, 96);
}};
const { sprite, SPRITE_FRAME } = await import('../code/sprite-factory.mjs');

// Preserve the approved drawing instructions; the only geometric edit is padding.
// Canvas rasterizers can change edge antialiasing when the viewport changes, so
// byte-identical center pixels are not a valid assertion across the two sizes.
const html = fs.readFileSync(new URL('../preview/index.html', import.meta.url), 'utf8');
const factory = fs.readFileSync(new URL('../code/sprite-factory.mjs', import.meta.url), 'utf8');
const drawing = text => text.slice(text.indexOf('const a=dir*'), text.indexOf('g.restore();'));
assert.equal(drawing(factory).replace('g.translate(48,68)', 'g.translate(32,52)'), drawing(html));

let cases = 0, recovered = 0;
for (const kind of ['run', 'idle', 'kick', 'slide', 'dive']) {
  for (let direction = 0; direction < 8; direction++) {
    for (let frame = 0; frame < 6; frame++) {
      for (let hair = 0; hair < 7; hair++) {
        const canvas = sprite(0, direction, frame, kind, false, 2, hair);
        assert.equal(canvas.width, 96);
        assert.equal(canvas.height, 96);
        const pixels = canvas.getContext('2d').getImageData(0, 0, 96, 96).data;
        let outside = false, visible = false;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
          const alpha = pixels[(y * 96 + x) * 4 + 3];
          if (x === 0 || y === 0 || x === 95 || y === 95) {
            assert.equal(alpha, 0, `outer-edge clipping: ${kind}/${direction}/${frame}/${hair}`);
          }
          if (alpha > 0) {
            visible = true;
            if (x < 16 || x >= 80 || y < 16 || y >= 80) outside = true;
          }
        }
        assert.ok(visible, 'empty player frame');
        if (outside) recovered++;
        cases++;
      }
    }
  }
}
assert.ok(recovered > 0, 'padding should recover previously cropped pose pixels');
for (const args of [[NaN,0,0],[0,8,0],[0,0,6],[0,0,0,'oops'],[0,0,0,'run',false,99,0],[0,0,0,'run',false,0,-1],[0,0,0,'run','false',0,0]]) {
  assert.throws(() => sprite(...args), RangeError);
}
assert.deepEqual(SPRITE_FRAME, {width:96,height:96,anchorX:48,anchorY:68,displayWidth:144,displayHeight:158.4});
assert.equal(SPRITE_FRAME.anchorX - 16, 32);
assert.equal(SPRITE_FRAME.anchorY - 16, 52);
assert.equal(SPRITE_FRAME.displayWidth / SPRITE_FRAME.width, 1.5);
assert.ok(Math.abs(SPRITE_FRAME.displayHeight / SPRITE_FRAME.height - 1.65) < 1e-12);
console.log(`PASS: approved drawing instructions preserved except translated padding; ${cases} visible poses have no outer-edge clipping; ${recovered} recover pixels outside the legacy bounds; foot anchor, visible scale and invalid-input checks pass.`);
console.log('Offline Canvas verification only. Not an integrated browser/device test or a guarantee of identical rasterization in every browser.');

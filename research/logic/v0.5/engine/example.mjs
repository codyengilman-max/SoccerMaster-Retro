import {createDecisionEngine} from './decision-engine.mjs';
import {fixture} from './fixtures.mjs';
console.log(JSON.stringify(createDecisionEngine().step(fixture()),null,2));

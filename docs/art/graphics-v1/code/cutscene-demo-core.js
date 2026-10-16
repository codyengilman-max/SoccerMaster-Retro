/* Standalone visual demo only. No production persistence, effects or activity launch. */
(function(root){'use strict';
const GRAPH = {"W1_SCHOOL_01/intro": {"scene": "W1_SCHOOL_01", "kind": "line", "speaker": "Jordan", "text": "New kid? The map makes it look easier than it is.", "next": "W1_SCHOOL_01/response"}, "W1_SCHOOL_01/response": {"scene": "W1_SCHOOL_01", "kind": "choice", "options": [{"id": "directions", "label": "Directions", "next": "W1_SCHOOL_01/response_reply_directions"}, {"id": "introduce", "label": "Introduce", "next": "W1_SCHOOL_01/response_reply_introduce"}, {"id": "quiet", "label": "Quiet", "next": "W1_SCHOOL_01/response_reply_quiet"}]}, "W1_SCHOOL_01/response_reply_directions": {"scene": "W1_SCHOOL_01", "kind": "line", "speaker": "Jordan", "text": "Come on. I’m going that way.", "next": "W1_SCHOOL_01/end"}, "W1_SCHOOL_01/response_reply_introduce": {"scene": "W1_SCHOOL_01", "kind": "line", "speaker": "Jordan", "text": "Nice to meet you, {player.name}. This corridor.", "next": "W1_SCHOOL_01/end"}, "W1_SCHOOL_01/response_reply_quiet": {"scene": "W1_SCHOOL_01", "kind": "line", "speaker": "Player", "text": "We can just sit here a minute.", "next": "W1_SCHOOL_01/end"}, "W1_SCHOOL_01/end": {"scene": "W1_SCHOOL_01", "kind": "transition", "next": "W1_SCHOOL_02/intro"}, "W1_SCHOOL_02/intro": {"scene": "W1_SCHOOL_02", "kind": "line", "speaker": "Blake", "text": "You play soccer? Let’s see it. Everyone gets the same attempts.", "next": "W1_SCHOOL_02/invitation"}, "W1_SCHOOL_02/invitation": {"scene": "W1_SCHOOL_02", "kind": "choice", "options": [{"id": "accept", "label": "Accept", "next": "W1_SCHOOL_02/invitation_reply_accept"}, {"id": "equal_attempts", "label": "Equal attempts", "next": "W1_SCHOOL_02/invitation_reply_equal_attempts"}, {"id": "shared_warmup", "label": "Shared warmup", "next": "W1_SCHOOL_02/invitation_reply_shared_warmup"}, {"id": "decline", "label": "Decline", "next": "W1_SCHOOL_02/invitation_reply_decline"}]}, "W1_SCHOOL_02/invitation_reply_accept": {"scene": "W1_SCHOOL_02", "kind": "line", "speaker": "Blake", "text": "Three scored shots each. Warm-up first if we all want one.", "next": "W1_SCHOOL_02/end"}, "W1_SCHOOL_02/invitation_reply_equal_attempts": {"scene": "W1_SCHOOL_02", "kind": "line", "speaker": "Blake", "text": "Same number for everybody. Count them.", "next": "W1_SCHOOL_02/end"}, "W1_SCHOOL_02/invitation_reply_shared_warmup": {"scene": "W1_SCHOOL_02", "kind": "line", "speaker": "Blake", "text": "Everybody gets one practice shot, then we start.", "next": "W1_SCHOOL_02/end"}, "W1_SCHOOL_02/invitation_reply_decline": {"scene": "W1_SCHOOL_02", "kind": "line", "speaker": "Jordan", "text": "No problem. Let’s head back.", "next": "W1_SCHOOL_02/end"}, "W1_SCHOOL_02/end": {"scene": "W1_SCHOOL_02", "kind": "boundary", "next": null}};

function validateName(input){
 if(typeof input!=='string'||input.length>1024)return {ok:false,message:'Enter a name.'};
 for(let i=0;i<input.length;i++){const u=input.charCodeAt(i);if(u>=0xd800&&u<=0xdbff){const v=input.charCodeAt(++i);if(!(v>=0xdc00&&v<=0xdfff))return {ok:false,message:'The name contains invalid Unicode.'};}else if(u>=0xdc00&&u<=0xdfff)return {ok:false,message:'The name contains invalid Unicode.'};}
 const name=input.normalize('NFC').trim();
 if(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069{}]/u.test(input))return {ok:false,message:'Use a name without control characters or template braces.'};
 if([...name].length>96 || new TextEncoder().encode(name).length>384 || /\p{M}{9}/u.test(name))return {ok:false,message:'That name exceeds the supported text limits.'};
 if(typeof Intl.Segmenter!=='function')return {ok:false,message:'This visual demo needs a browser with Unicode name segmentation. Production must use its validated identity service.'};
 const segments=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(name));
 if(segments.length<1||segments.length>24)return {ok:false,message:'Use 1–24 visible characters.'};
 return {ok:true,name};
}
function createSession(rawName,presentation){
 const valid=validateName(rawName);if(!valid.ok)throw new RangeError(valid.message);
 if(!['boy','girl'].includes(presentation))throw new RangeError('Unknown appearance');
 const name=valid.name;let node='W1_SCHOOL_01/intro',revision=0,revealed=false;const history=[];
 function land(next){for(let i=0;i<3;i++){const n=GRAPH[next];if(!n)throw new Error('Unknown demo node');if(n.kind!=='transition'){node=next;revealed=false;return;}next=n.next;}throw new Error('Invalid transition chain');}
 function text(n){return n.text.replace(/\{player\.name\}/g,()=>name);}
 function view(){const n=GRAPH[node];return {nodeId:node,revision,kind:n.kind,revealed,presentation,speaker:n.speaker==='Player'?name:n.speaker||'',speakerRole:n.speaker==='Player'?'player':n.speaker?.toLowerCase()||'system',text:n.kind==='line'?text(n):'',options:n.kind==='choice'?n.options.map(o=>({id:o.id,label:o.label})):[],cast:n.scene==='W1_SCHOOL_01'?['player','jordan']:['player','jordan','blake']};}
 function reveal(expected){const n=GRAPH[node];if(expected!==revision||n.kind!=='line'||revealed)return false;revealed=true;history.push({speaker:n.speaker==='Player'?name:n.speaker,text:text(n)});revision++;return true;}
 function advance(expected){const n=GRAPH[node];if(expected!==revision||n.kind!=='line'||!revealed)return false;land(n.next);revision++;return true;}
 function choose(id,expected){const n=GRAPH[node];if(expected!==revision||n.kind!=='choice')return false;const option=n.options.find(o=>o.id===id);if(!option)return false;history.push({speaker:name,text:option.label});land(option.next);revision++;return true;}
 return Object.freeze({view,reveal,advance,choose,history:()=>history.map(x=>({...x}))});
}
const api=Object.freeze({validateName,createSession});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SoccerMasterVisualDemo=api;
})(globalThis);

export const roster=Array.from({length:18},(_,i)=>({id:`p${i}`,keeper:i>=16,role:i>=16?'GK':'LW'}));
export const testContext={careerId:'career',seasonId:1,weekId:'S1-W02',slotId:'A',sessionId:'S1-W02-A',variantId:'S1-W02-A-LW',layoutKey:'fixture-layout',rulesProfile:'youth',curriculumVersion:2,scenarioVersion:1,runId:'run',practiceId:'S1',contentVersion:1,seed:17,humanId:'p0',players:roster};

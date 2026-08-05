(function(global){
  'use strict';
  const VERSION=1;
  function uid(prefix){return prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
  function isoPlusHours(hours){return new Date(Date.now()+hours*3600000).toISOString()}
  function assertNoPersonalData(data){
    const forbidden=['learnerName','name','firstName','lastName','dateOfBirth','dob','email','phone','address','employerContact','signature'];
    for(const key of forbidden){if(data[key])throw new Error('Personal field not permitted in review snapshot: '+key)}
  }
  function makeSnapshot(data){
    assertNoPersonalData(data||{});
    return {
      format:'APPRENTICE_PLUS_REVIEW_SNAPSHOT',version:VERSION,direction:'ApprenticePlusToAssessorPlus',
      transferId:data.transferId||uid('snapshot'),createdAt:new Date().toISOString(),expiresAt:data.expiresAt||isoPlusHours(24),
      course:String(data.course||''),standardVersion:String(data.standardVersion||''),reviewPeriod:String(data.reviewPeriod||''),
      progressPercent:num(data.progressPercent),ksbCompleted:num(data.ksbCompleted),ksbTotal:num(data.ksbTotal),
      assignmentsCompleted:num(data.assignmentsCompleted),assignmentsTotal:num(data.assignmentsTotal),
      otjHours:num(data.otjHours),otjRequired:num(data.otjRequired),academyScore:num(data.academyScore),epaStatus:String(data.epaStatus||''),
      learnerReflection:String(data.learnerReflection||''),
      previousTargets:Array.isArray(data.previousTargets)?data.previousTargets.slice(0,10).map(t=>({text:String(t.text||t.target||''),status:String(t.status||'To review')})):[],
      suggestedTargets:Array.isArray(data.suggestedTargets)?data.suggestedTargets.slice(0,5).map(t=>String(t.text||t.target||t)):[]
    };
  }
  function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
  function parseOutcome(text){
    let raw=typeof text==='string'?JSON.parse(text):text;
    if(raw&&raw.format==='APREVIEW_PACKAGE'&&raw.payload)raw=raw.payload;
    if(!raw||raw.direction!=='AssessorPlusToApprenticePlus')throw new Error('Not a valid Assessor+ review outcome.');
    return raw;
  }
  function download(name,text){const blob=new Blob([text],{type:'application/octet-stream'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
  global.ApprenticeReviewTransfer={VERSION,makeSnapshot,parseOutcome,download};
})(window);

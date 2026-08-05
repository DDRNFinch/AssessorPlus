const DATA_KEY = 'assessorPlusSimpleRegisterV4';
const PREVIOUS_V3_KEY = 'assessorPlusSimpleRegisterV3';
const PREVIOUS_KEY = 'assessorPlusSimpleRegisterV2';
const OLD_KEY = 'assessorPlusSimpleRegisterV1';
const state = loadState();
let currentClassId = null;
let currentRegisterId = null;
let currentSessionIndex = 0;
let currentLearnerId = null;
let deferredInstallPrompt = null;
let confirmCallback = null;
let liveTimer = null;

const $ = id => document.getElementById(id);
const pages = [...document.querySelectorAll('.page')];
const navItems = [...document.querySelectorAll('[data-page-target]')];
const classDialog = $('classDialog');
const learnerDialog = $('learnerDialog');
const classLearnersDialog = $('classLearnersDialog');
const confirmDialog = $('confirmDialog');

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(DATA_KEY));
    if(saved) return normalise(saved);
    const v3=JSON.parse(localStorage.getItem(PREVIOUS_V3_KEY));
    if(v3) return normalise(v3);
    const previous=JSON.parse(localStorage.getItem(PREVIOUS_KEY));
    if(previous) return normalise(previous);
    const old=JSON.parse(localStorage.getItem(OLD_KEY));
    if(old) return migrateOld(old);
  }catch{}
  return {learners:[],classes:[],registers:[]};
}
function normalise(data){
  return {learners:Array.isArray(data.learners)?data.learners:[],classes:Array.isArray(data.classes)?data.classes:[],registers:Array.isArray(data.registers)?data.registers:[]};
}
function migrateOld(old){
  const learners=[]; const byName=new Map();
  const classes=(old.classes||[]).map(c=>{
    const learnerIds=(c.learners||[]).map(l=>{
      const key=(l.name||'').trim().toLowerCase();
      if(!byName.has(key)){const item={id:l.id||uid('learner'),name:l.name};learners.push(item);byName.set(key,item.id);}
      return byName.get(key);
    });
    return {...c,learnerIds,learners:undefined};
  });
  return {learners,classes,registers:old.registers||[]};
}
function saveState(){localStorage.setItem(DATA_KEY,JSON.stringify(state));renderHome();}
function uid(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;}
function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function timeText(iso){return iso?new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'—';}
function minutesToText(mins){mins=Math.max(0,Math.round(mins));const h=Math.floor(mins/60),m=mins%60;return h?`${h}h ${m}m`:`${m}m`;}
function timeToMinutes(value){const [h,m]=value.split(':').map(Number);return h*60+m;}
function scheduledMinutes(session){return Math.max(0,timeToMinutes(session.end)-timeToMinutes(session.start));}
function sessionDate(date,time){return new Date(`${date}T${time}:00`);}
function creditedMinutes(session,markedAt,date){
  if(!markedAt)return 0;
  const mark=new Date(markedAt), start=sessionDate(date,session.start), end=sessionDate(date,session.end);
  const effectiveStart=mark<start?start:mark;
  return Math.max(0,Math.min(scheduledMinutes(session),(end-effectiveStart)/60000));
}
function arrivalTiming(session,markedAt,date){
  if(!markedAt)return {early:0,late:0};
  const mark=new Date(markedAt),start=sessionDate(date,session.start);
  const difference=(mark-start)/60000;
  return {early:Math.max(0,-difference),late:Math.max(0,difference)};
}
function learnerAttendanceLedger(learnerId){
  let bank=0,totalEarned=0,totalUsed=0,totalLate=0,totalCredited=0,totalPossible=0,presentSessions=0,absentSessions=0;
  const entries=[];
  const registers=state.registers.slice().sort((a,b)=>(a.date+a.createdAt).localeCompare(b.date+b.createdAt));
  registers.forEach(r=>{
    const c=state.classes.find(x=>x.id===r.classId);if(!c)return;
    const belongs=(c.learnerIds||[]).includes(learnerId)||(r.learnerSnapshots||[]).some(l=>l.id===learnerId);if(!belongs)return;
    c.sessions.forEach((session,i)=>{
      const a=r.attendance?.[`${learnerId}_session_${i}`];
      if(!a||(!r.finishedAt&&a.status!=='present'))return;
      const possible=scheduledMinutes(session);totalPossible+=possible;
      if(a.status==='absent'){
        absentSessions++;
        entries.push({date:r.date,className:c.name,sessionIndex:i,status:'absent',start:session.start,end:session.end,bankAfter:bank});
        return;
      }
      if(a.status!=='present')return;
      presentSessions++;
      const timing=arrivalTiming(session,a.markedAt,r.date);
      const earned=Math.round(timing.early);
      const actualLate=Math.round(timing.late);
      const used=Math.min(bank,actualLate);
      bank+=earned-used;
      totalEarned+=earned;totalUsed+=used;totalLate+=actualLate;
      const credited=Math.max(0,Math.min(possible,possible-actualLate+used));
      totalCredited+=credited;
      entries.push({date:r.date,className:c.name,sessionIndex:i,status:'present',start:session.start,end:session.end,markedAt:a.markedAt,early:earned,late:actualLate,used,credited,bankAfter:bank});
    });
  });
  return {bank,totalEarned,totalUsed,totalLate,totalCredited,totalPossible,presentSessions,absentSessions,entries};
}
function sessionBankEffect(learnerId,registerId,sessionIndex){
  const ledger=learnerAttendanceLedger(learnerId);
  const r=state.registers.find(x=>x.id===registerId),c=state.classes.find(x=>x.id===r?.classId);if(!r||!c)return null;
  return ledger.entries.find(e=>e.date===r.date&&e.className===c.name&&e.sessionIndex===sessionIndex)||null;
}
function classLearners(c){return (c.learnerIds||[]).map(id=>state.learners.find(l=>l.id===id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));}
function registerLearners(r,c){
  if(Array.isArray(r?.learnerSnapshots)&&r.learnerSnapshots.length)return r.learnerSnapshots.slice().sort((a,b)=>a.name.localeCompare(b.name));
  return classLearners(c);
}
function showToast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200);}
function showPage(name){
  pages.forEach(p=>p.classList.toggle('active',p.dataset.page===name));
  navItems.forEach(n=>n.classList.toggle('active',n.dataset.pageTarget===name));
  document.querySelector('.bottom-nav').style.display=['class-detail','live-register','learner-profile'].includes(name)?'none':'grid';
  if(name!=='live-register') stopLiveTimer();
  window.scrollTo(0,0);
  if(name==='registers')renderClasses();
  if(name==='learners')renderLearners();
  if(name==='home')renderHome();
}
function renderHome(){
  $('statClasses').textContent=state.classes.length;
  $('statLearners').textContent=state.learners.length;
  $('statRegisters').textContent=state.registers.length;
  const today=todayISO();
  const presentIds=new Set(state.registers.filter(r=>r.date===today).flatMap(r=>Object.entries(r.attendance||{}).filter(([,v])=>v?.status==='present').map(([key])=>key.split('_session_')[0])));
  $('statPresent').textContent=presentIds.size;
}
function renderLearners(){
  const empty=$('learnersEmpty'),list=$('learnerMasterList');
  empty.hidden=state.learners.length>0;
  list.innerHTML=state.learners.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(l=>{
    const classes=state.classes.filter(c=>(c.learnerIds||[]).includes(l.id));
    const ledger=learnerAttendanceLedger(l.id);
    const pct=ledger.totalPossible?Math.round(ledger.totalCredited/ledger.totalPossible*100):0;
    return `<article class="class-card learner-card" data-open-learner="${l.id}"><div class="class-card-header"><div><h3>${esc(l.name)}</h3><p>${classes.length} class${classes.length===1?'':'es'} · ${ledger.presentSessions} attended session${ledger.presentSessions===1?'':'s'}</p></div><span class="pill">${ledger.totalPossible?pct+'%':'No data'}</span></div><div class="learner-bank-line"><strong>${minutesToText(ledger.bank)} banked</strong><span>Earned ${minutesToText(ledger.totalEarned)} · Used ${minutesToText(ledger.totalUsed)}</span></div><div class="card-actions"><button class="text-button" data-open-learner="${l.id}">Open profile</button><button class="text-button" data-edit-learner="${l.id}">Edit</button><button class="text-button danger" data-delete-learner="${l.id}">Delete</button></div></article>`;
  }).join('');
}
function openLearnerProfile(id){currentLearnerId=id;renderLearnerProfile();showPage('learner-profile');}
function renderLearnerProfile(){
  const l=state.learners.find(x=>x.id===currentLearnerId);if(!l)return showPage('learners');
  const ledger=learnerAttendanceLedger(l.id),classes=state.classes.filter(c=>(c.learnerIds||[]).includes(l.id));
  const pct=ledger.totalPossible?Math.round(ledger.totalCredited/ledger.totalPossible*100):0;
  const history=ledger.entries.slice().reverse();
  $('learnerProfile').innerHTML=`<article class="detail-card profile-hero"><div class="class-card-header"><div><p class="eyebrow">LEARNER PROFILE</p><h2>${esc(l.name)}</h2><p class="meta">${classes.map(c=>esc(c.name)).join(' · ')||'Not assigned to a class'}</p></div><button class="secondary-button compact" data-edit-learner="${l.id}">Edit</button></div><div class="profile-stats"><article><span>Attendance</span><strong>${ledger.totalPossible?pct+'%':'—'}</strong></article><article class="bank-stat"><span>Minute bank</span><strong>${minutesToText(ledger.bank)}</strong></article><article><span>Total credited</span><strong>${minutesToText(ledger.totalCredited)}</strong></article><article><span>Sessions attended</span><strong>${ledger.presentSessions}</strong></article></div></article><article class="detail-card"><h3>Minute bank account</h3><div class="bank-breakdown"><div><span>Early minutes earned</span><strong>+${minutesToText(ledger.totalEarned)}</strong></div><div><span>Minutes used against lateness</span><strong>−${minutesToText(ledger.totalUsed)}</strong></div><div><span>Current balance</span><strong>${minutesToText(ledger.bank)}</strong></div></div><p class="meta">Actual late arrivals remain visible in the history. Banked minutes only make up the attendance-time shortfall; absence is never covered.</p></article><article class="detail-card"><div class="section-title-row"><div><h3>Attendance history</h3><p>${history.length} recorded session${history.length===1?'':'s'}</p></div></div><div class="profile-history">${history.length?history.map(e=>`<div class="history-row profile-history-row"><div><strong>${new Date(`${e.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})} · ${esc(e.className)}</strong><small>Session ${e.sessionIndex+1} · ${e.start}–${e.end}${e.status==='present'?` · Arrived ${timeText(e.markedAt)}`:''}</small></div><div class="history-values">${e.status==='absent'?'<span class="absence-label">Absent</span>':`${e.early?`<span class="positive">+${e.early}m early</span>`:''}${e.late?`<span class="late">${e.late}m late</span>`:''}${e.used?`<span>${e.used}m bank used</span>`:''}<span>Balance ${e.bankAfter}m</span>`}</div></div>`).join(''):'<p class="meta">No attendance has been recorded yet.</p>'}</div></article>`;
}
function renderClasses(){
  const empty=$('classesEmpty'),list=$('classList');empty.hidden=state.classes.length>0;
  list.innerHTML=state.classes.map(c=>{const total=(c.sessions||[]).reduce((n,s)=>n+scheduledMinutes(s),0);const n=classLearners(c).length;return `<article class="class-card"><div class="class-card-header"><div><h3>${esc(c.name)}</h3><p>${esc(c.location||'No location')} · ${n} learner${n===1?'':'s'}</p></div><span class="pill">${minutesToText(total)}</span></div><div class="card-actions"><button class="text-button" data-open-class="${c.id}">Open</button><button class="text-button" data-start-class="${c.id}">Start today</button><button class="text-button" data-edit-class="${c.id}">Edit</button><button class="text-button danger" data-delete-class="${c.id}">Delete</button></div></article>`;}).join('');
}
function getClass(id=currentClassId){return state.classes.find(c=>c.id===id);}
function getRegister(){return state.registers.find(r=>r.id===currentRegisterId);}
function renderClassDetail(){
  const c=getClass();if(!c)return showPage('registers');const learners=classLearners(c);const regs=state.registers.filter(r=>r.classId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  $('classDetail').innerHTML=`<article class="detail-card"><div class="class-card-header"><div><p class="eyebrow">CLASS</p><h2>${esc(c.name)}</h2><p class="meta">${esc(c.location||'No location')}</p></div><button class="primary-button compact" data-start-class="${c.id}">Start today</button></div><div class="session-list">${c.sessions.map((s,i)=>`<div class="session-summary"><strong>Session ${i+1}</strong><span>${s.start}–${s.end} · ${minutesToText(scheduledMinutes(s))}</span></div>`).join('')}</div></article><article class="detail-card"><div class="section-title-row"><div><h3>Saved class list</h3><p>${learners.length} learner${learners.length===1?'':'s'} currently assigned</p></div><div class="card-actions"><button class="secondary-button compact" id="addLearnerFromClassButton">Add new learner</button><button class="secondary-button compact" id="selectLearnersButton">Add or remove learners</button></div></div><div class="learner-list">${learners.length?learners.map(l=>`<button class="learner-row learner-row-button" data-open-learner="${l.id}"><strong>${esc(l.name)}</strong><span>Open profile ›</span></button>`).join(''):'<p class="meta">No learners selected yet.</p>'}</div></article><article class="detail-card"><div class="section-title-row"><div><h3>Register history</h3><p>Completed registers stay saved even if the class list changes later</p></div></div><div>${regs.length?regs.map(r=>{const counts=registerCounts(r,c);return `<button class="list-row" data-open-register="${r.id}"><span><strong>${new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</strong><small>${counts.present}/${learners.length} attended · ${r.finishedAt?'Completed':'Running'}</small></span><span>›</span></button>`}).join(''):'<p class="meta">No registers recorded yet.</p>'}</div></article>`;
}
function registerCounts(r,c){let present=0,totalMinutes=0;registerLearners(r,c).forEach(l=>{let lm=0;c.sessions.forEach((s,i)=>{const a=r.attendance?.[`${l.id}_session_${i}`];if(a?.status==='present')lm+=creditedMinutes(s,a.markedAt,r.date);});if(lm>0)present++;totalMinutes+=lm;});return {present,totalMinutes};}
function openClass(id){currentClassId=id;renderClassDetail();showPage('class-detail');}
function openLearnerDialog(id=null){const l=id?state.learners.find(x=>x.id===id):null;$('editingLearnerId').value=l?.id||'';$('learnerName').value=l?.name||'';$('learnerDialogTitle').textContent=l?'Edit learner':'Add learner';learnerDialog.showModal();}
function openClassDialog(id=null){const c=id?getClass(id):null;$('editingClassId').value=c?.id||'';$('className').value=c?.name||'';$('classLocation').value=c?.location||'';$('classDialogTitle').textContent=c?'Edit class':'Create class';$('sessionRows').innerHTML='';(c?.sessions?.length?c.sessions:[{start:'09:00',end:'10:00'},{start:'11:00',end:'13:00'}]).forEach(addSessionRow);classDialog.showModal();}
function addSessionRow(session={start:'09:00',end:'10:00'}){const row=document.createElement('div');row.className='session-edit-row';row.innerHTML=`<label>Starts<input type="time" class="session-start" value="${session.start}" required></label><label>Ends<input type="time" class="session-end" value="${session.end}" required></label><button type="button" class="remove-session">×</button>`;row.querySelector('.remove-session').onclick=()=>{if($('sessionRows').children.length===1)return showToast('A class needs at least one session');row.remove();};$('sessionRows').append(row);}
function openClassLearners(){const c=getClass();if(!c)return;if(!state.learners.length){showToast('Add learners first');showPage('learners');return;}$('classLearnerChoices').innerHTML=state.learners.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(l=>`<label class="choice-row"><input type="checkbox" value="${l.id}" ${(c.learnerIds||[]).includes(l.id)?'checked':''}><span>${esc(l.name)}</span></label>`).join('');classLearnersDialog.showModal();}
function startRegister(classId){
  const c=getClass(classId);if(!c)return;const selected=classLearners(c);if(!selected.length)return showToast('Add at least one learner to this class first');
  let r=state.registers.find(x=>x.classId===classId&&x.date===todayISO());
  if(!r){
    r={id:uid('reg'),classId,date:todayISO(),createdAt:new Date().toISOString(),startedAt:new Date().toISOString(),finishedAt:null,attendance:{},sessionStates:{0:'active'},learnerSnapshots:selected.map(l=>({id:l.id,name:l.name}))};
    state.registers.push(r);saveState();
  }else if(!r.finishedAt&&!r.startedAt){r.startedAt=new Date().toISOString();r.sessionStates=r.sessionStates||{};r.sessionStates[0]='active';saveState();}
  currentClassId=classId;currentRegisterId=r.id;reconcileRegister(r,c);currentSessionIndex=determineSessionIndex(r,c);renderLiveRegister();showPage('live-register');startLiveTimer();
}
function determineSessionIndex(r,c){
  for(let i=0;i<c.sessions.length;i++)if(r.sessionStates?.[i]==='active')return i;
  for(let i=0;i<c.sessions.length;i++)if(r.sessionStates?.[i]!=='finished')return i;
  return c.sessions.length-1;
}
function reconcileRegister(r,c){
  if(r.finishedAt)return;
  r.sessionStates=r.sessionStates||{};
  const now=new Date();
  const learners=registerLearners(r,c);
  for(let i=0;i<c.sessions.length;i++){
    const s=c.sessions[i];
    if(r.sessionStates[i]==='active'&&now>=sessionDate(r.date,s.end)){
      learners.forEach(l=>{const key=`${l.id}_session_${i}`;if(!r.attendance[key])r.attendance[key]={learnerId:l.id,sessionIndex:i,status:'absent',finalisedAt:new Date().toISOString()};});
      r.sessionStates[i]='finished';
      if(i<c.sessions.length-1&&now<sessionDate(r.date,c.sessions[i+1].end))r.sessionStates[i+1]='active';
    }
  }
  if(c.sessions.every((_,i)=>r.sessionStates[i]==='finished')){r.finishedAt=r.finishedAt||new Date().toISOString();r.autoFinished=true;}
  saveState();
}
function sessionStatus(r,c,i){
  if(r.finishedAt||r.sessionStates?.[i]==='finished')return 'finished';
  if(r.sessionStates?.[i]==='active')return 'active';
  return 'upcoming';
}
function startSessionEarly(index){
  const c=getClass(),r=getRegister();if(!c||!r||r.finishedAt)return;
  const active=Object.keys(r.sessionStates||{}).find(i=>r.sessionStates[i]==='active');
  if(active!==undefined&&Number(active)!==index)return showToast(`Finish Session ${Number(active)+1} before starting another`);
  if(r.sessionStates[index]==='finished')return showToast('That session is already finished');
  r.sessionStates[index]='active';
  if(!r.startedAt)r.startedAt=new Date().toISOString();
  currentSessionIndex=index;saveState();renderLiveRegister();showToast(`Session ${index+1} started`);
}
function renderLiveRegister(){
  const c=getClass(),r=getRegister();if(!c||!r)return;reconcileRegister(r,c);currentSessionIndex=determineSessionIndex(r,c);const counts=registerCounts(r,c);const current=c.sessions[currentSessionIndex];const status=sessionStatus(r,c,currentSessionIndex);const learners=registerLearners(r,c);
  const now=new Date();let banner='';if(r.finishedAt)banner='Register completed automatically';else if(status==='upcoming')banner=`Session ${currentSessionIndex+1} is ready to start early or will follow the previous session`;else banner=`Session ${currentSessionIndex+1} is live until ${current.end}`;
  $('liveRegister').innerHTML=`<div class="live-header"><div><p class="eyebrow">${r.finishedAt?'COMPLETED REGISTER':'AUTOMATIC REGISTER'}</p><h2>${esc(c.name)}</h2><p class="meta">${new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p></div><div class="live-actions"><button class="secondary-button compact" data-export-register="${r.id}">CSV</button></div></div><div class="status-banner">${banner}</div><div class="live-card"><div class="live-session-tabs">${c.sessions.map((s,i)=>`<button class="session-tab ${i===currentSessionIndex?'active':''} ${sessionStatus(r,c,i)}" data-session-index="${i}">Session ${i+1} · ${s.start}–${s.end}</button>`).join('')}</div></div><div class="live-summary"><article><span>Attended today</span><strong>${counts.present}/${learners.length}</strong></article><article><span>Current session</span><strong>${current.start}–${current.end}</strong></article><article><span>Status</span><strong>${status==='active'?'Live':status==='upcoming'?'Waiting':'Finished'}</strong></article><article><span>Total credited</span><strong>${minutesToText(counts.totalMinutes)}</strong></article></div><div class="live-card"><div class="section-title-row"><div><h3>Session ${currentSessionIndex+1}</h3><p class="meta">Tick learners as soon as they arrive, including before the scheduled start. Early arrivals are added to the learner minute bank. Future lateness can use that balance while the actual late time remains recorded.</p></div>${status==='upcoming'&&!r.finishedAt?`<button class="primary-button compact" data-start-session-early="${currentSessionIndex}">Start session early</button>`:''}</div><div class="attendance-list">${learners.map(l=>{const key=`${l.id}_session_${currentSessionIndex}`,a=r.attendance[key],effect=a?.status==='present'?sessionBankEffect(l.id,r.id,currentSessionIndex):null;const canTick=!r.finishedAt&&status==='active';const ledger=learnerAttendanceLedger(l.id);const detail=a?.status==='present'?`Arrived ${timeText(a.markedAt)}${effect?.early?` · ${effect.early}m banked`:''}${effect?.late?` · ${effect.late}m late${effect.used?` (${effect.used}m covered)`:''}`:''} · Bank ${ledger.bank}m`:a?.status==='absent'?'Absent':`Not yet marked · Bank ${ledger.bank}m`;return `<div class="attendance-row ${a?.status==='present'?'checked':a?.status==='absent'?'absent':''}"><button class="attendance-name attendance-profile-link" data-open-learner="${l.id}"><strong>${esc(l.name)}</strong><small>${detail}</small></button><button class="tick-button" data-toggle-attendance="${l.id}" ${canTick?'':'disabled'}>${a?.status==='present'?'✓ Present':a?.status==='absent'?'Absent':'Tick present'}</button></div>`}).join('')}</div></div><div class="live-card"><h3>Daily learner totals</h3><div>${learners.map(l=>{let total=0,presentSessions=0,absentSessions=0;c.sessions.forEach((s,i)=>{const a=r.attendance[`${l.id}_session_${i}`];if(a?.status==='present'){presentSessions++;total+=creditedMinutes(s,a.markedAt,r.date);}else if(a?.status==='absent')absentSessions++;});const ledger=learnerAttendanceLedger(l.id);return `<button class="history-row history-row-button" data-open-learner="${l.id}"><span><strong>${esc(l.name)}</strong><small>${presentSessions} attended · ${absentSessions} absent · ${minutesToText(total)} raw attendance</small></span><span><strong>${minutesToText(ledger.bank)} banked</strong><small>Open profile ›</small></span></button>`}).join('')}</div></div>`;
}
function toggleAttendance(learnerId){const c=getClass(),r=getRegister();if(!c||!r||r.finishedAt)return;const status=sessionStatus(r,c,currentSessionIndex);if(status!=='active')return showToast('Only the live session can be marked');const key=`${learnerId}_session_${currentSessionIndex}`;if(r.attendance[key]?.status==='present')delete r.attendance[key];else r.attendance[key]={learnerId,sessionIndex:currentSessionIndex,status:'present',markedAt:new Date().toISOString()};saveState();renderLiveRegister();}
function startLiveTimer(){stopLiveTimer();liveTimer=setInterval(()=>{const c=getClass(),r=getRegister();if(!c||!r)return;const before=r.finishedAt;reconcileRegister(r,c);renderLiveRegister();if(!before&&r.finishedAt)showToast('Final session ended — register saved');},15000);}
function stopLiveTimer(){if(liveTimer){clearInterval(liveTimer);liveTimer=null;}}
function exportRegister(id){const r=state.registers.find(x=>x.id===id),c=state.classes.find(x=>x.id===r?.classId);if(!r||!c)return;reconcileRegister(r,c);const header=['Learner',...c.sessions.flatMap((s,i)=>[`Session ${i+1} status`,`Session ${i+1} arrival`,`Session ${i+1} credited minutes`]),'Total minutes','Sessions attended','Sessions absent'];const rows=registerLearners(r,c).map(l=>{let total=0,p=0,aCount=0;const cols=[l.name];c.sessions.forEach((s,i)=>{const a=r.attendance[`${l.id}_session_${i}`];const mins=a?.status==='present'?creditedMinutes(s,a.markedAt,r.date):0;if(a?.status==='present')p++;if(a?.status==='absent')aCount++;total+=mins;cols.push(a?.status||'pending',a?.markedAt?timeText(a.markedAt):'',String(Math.round(mins)));});cols.push(String(Math.round(total)),String(p),String(aCount));return cols;});download(`${safeName(c.name)}-${r.date}-register.csv`,[header,...rows].map(row=>row.map(csvCell).join(',')).join('\n'),'text/csv');}
function csvCell(v){return `"${String(v).replace(/"/g,'""')}"`;}
function safeName(v){return v.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function askConfirm(title,message,action,label='Delete'){confirmCallback=action;$('confirmTitle').textContent=title;$('confirmMessage').textContent=message;$('confirmAction').textContent=label;confirmDialog.showModal();}

document.addEventListener('click',e=>{const target=e.target.closest('button,[data-go],[data-new-class],[data-new-learner],[data-open-learner]');if(!target)return;if(target.dataset.pageTarget)showPage(target.dataset.pageTarget);if(target.dataset.go)showPage(target.dataset.go);if(target.hasAttribute('data-new-class')||target.id==='newClassButton')openClassDialog();if(target.hasAttribute('data-new-learner')||target.id==='newLearnerButton')openLearnerDialog();if(target.dataset.openLearner)openLearnerProfile(target.dataset.openLearner);if(target.dataset.editLearner)openLearnerDialog(target.dataset.editLearner);if(target.dataset.deleteLearner){const l=state.learners.find(x=>x.id===target.dataset.deleteLearner);askConfirm('Delete learner?',`Delete ${l.name} from the master list and remove them from every class?`,()=>{state.learners=state.learners.filter(x=>x.id!==l.id);state.classes.forEach(c=>c.learnerIds=(c.learnerIds||[]).filter(id=>id!==l.id));saveState();renderLearners();});}if(target.dataset.openClass)openClass(target.dataset.openClass);if(target.dataset.editClass)openClassDialog(target.dataset.editClass);if(target.dataset.startClass)startRegister(target.dataset.startClass);if(target.dataset.deleteClass){const c=getClass(target.dataset.deleteClass);askConfirm('Delete class?',`Delete ${c.name} and all of its register history?`,()=>{state.classes=state.classes.filter(x=>x.id!==c.id);state.registers=state.registers.filter(x=>x.classId!==c.id);saveState();renderClasses();});}if(target.dataset.back)showPage(target.dataset.back);if(target.dataset.closeDialog!==undefined)target.closest('dialog')?.close();if(target.id==='addSessionRow')addSessionRow();if(target.id==='selectLearnersButton')openClassLearners();if(target.id==='addLearnerFromClassButton')openLearnerDialog();if(target.dataset.sessionIndex!==undefined){currentSessionIndex=Number(target.dataset.sessionIndex);renderLiveRegister();}if(target.dataset.startSessionEarly!==undefined)startSessionEarly(Number(target.dataset.startSessionEarly));if(target.dataset.toggleAttendance)toggleAttendance(target.dataset.toggleAttendance);if(target.dataset.exportRegister)exportRegister(target.dataset.exportRegister);if(target.dataset.openRegister){const r=state.registers.find(x=>x.id===target.dataset.openRegister);if(r){currentRegisterId=r.id;currentClassId=r.classId;renderLiveRegister();showPage('live-register');if(!r.finishedAt)startLiveTimer();}}});

$('classForm').addEventListener('submit',e=>{e.preventDefault();const sessions=[...document.querySelectorAll('.session-edit-row')].map(row=>({start:row.querySelector('.session-start').value,end:row.querySelector('.session-end').value})).sort((a,b)=>a.start.localeCompare(b.start));if(sessions.some(s=>timeToMinutes(s.end)<=timeToMinutes(s.start)))return showToast('Every session must end after it starts');if(sessions.some((s,i)=>i&&timeToMinutes(s.start)<timeToMinutes(sessions[i-1].end)))return showToast('Teaching sessions cannot overlap');const id=$('editingClassId').value,c=id?getClass(id):null;if(c){c.name=$('className').value.trim();c.location=$('classLocation').value.trim();c.sessions=sessions;}else state.classes.push({id:uid('class'),name:$('className').value.trim(),location:$('classLocation').value.trim(),sessions,learnerIds:[],createdAt:new Date().toISOString()});saveState();classDialog.close();renderClasses();showToast(c?'Class updated':'Class created');});
$('learnerForm').addEventListener('submit',e=>{e.preventDefault();const name=$('learnerName').value.trim(),id=$('editingLearnerId').value;if(!name)return;const duplicate=state.learners.find(l=>l.name.toLowerCase()===name.toLowerCase()&&l.id!==id);if(duplicate)return showToast('That learner already exists');if(id){state.learners.find(l=>l.id===id).name=name;}else {const newLearner={id:uid('learner'),name,createdAt:new Date().toISOString()};state.learners.push(newLearner);if(currentClassId&&document.querySelector('[data-page="class-detail"]')?.classList.contains('active')){const c=getClass();if(c&&!c.learnerIds.includes(newLearner.id))c.learnerIds.push(newLearner.id);}}state.learners.sort((a,b)=>a.name.localeCompare(b.name));saveState();learnerDialog.close();renderLearners();if(document.querySelector('[data-page="class-detail"]')?.classList.contains('active'))renderClassDetail();if(document.querySelector('[data-page="learner-profile"]')?.classList.contains('active'))renderLearnerProfile();showToast(id?'Learner updated':'Learner added');});
$('classLearnersForm').addEventListener('submit',e=>{e.preventDefault();const c=getClass();if(!c)return;c.learnerIds=[...$('classLearnerChoices').querySelectorAll('input:checked')].map(i=>i.value);saveState();classLearnersDialog.close();renderClassDetail();showToast('Class list updated');});
$('leaveLiveButton').addEventListener('click',()=>{stopLiveTimer();renderClassDetail();showPage('class-detail');});
confirmDialog.addEventListener('close',()=>{if(confirmDialog.returnValue==='confirm'&&confirmCallback)confirmCallback();confirmCallback=null;});
$('exportBackupButton').addEventListener('click',()=>download(`AssessorPlus-backup-${todayISO()}.json`,JSON.stringify({version:4,exportedAt:new Date().toISOString(),data:state},null,2),'application/json'));
$('importBackupInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),data=normalise(parsed.data||parsed);askConfirm('Restore backup?','This will replace all learners, classes and registers currently stored on this device.',()=>{state.learners=data.learners;state.classes=data.classes;state.registers=data.registers;saveState();renderClasses();renderLearners();showToast('Backup restored');},'Restore');}catch{showToast('That is not a valid Assessor+ backup');}e.target.value='';});
$('clearDataButton').addEventListener('click',()=>askConfirm('Delete all data?','This permanently removes every learner, class and register stored on this device.',()=>{state.learners=[];state.classes=[];state.registers=[];saveState();renderClasses();renderLearners();showToast('All local data deleted');}));

const installDialog=$('installDialog'),installButton=$('installButton'),dialogInstallButton=$('dialogInstallButton');window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;installButton.hidden=false;dialogInstallButton.hidden=false;});async function promptInstall(){if(!deferredInstallPrompt){installDialog.showModal();return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installButton.hidden=true;dialogInstallButton.hidden=true;}installButton.onclick=promptInstall;$('installRow').onclick=promptInstall;dialogInstallButton.onclick=promptInstall;if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
renderHome();renderLearners();renderClasses();showPage('home');

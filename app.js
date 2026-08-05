const DATA_KEY = 'assessorPlusSimpleRegisterV1';
const state = loadState();
let currentClassId = null;
let currentRegisterId = null;
let currentSessionIndex = 0;
let deferredInstallPrompt = null;
let confirmCallback = null;

const $ = id => document.getElementById(id);
const pages = [...document.querySelectorAll('.page')];
const navItems = [...document.querySelectorAll('[data-page-target]')];
const classDialog = $('classDialog');
const learnerDialog = $('learnerDialog');
const confirmDialog = $('confirmDialog');

function loadState(){
  try{return JSON.parse(localStorage.getItem(DATA_KEY)) || {classes:[],registers:[]};}
  catch{return {classes:[],registers:[]};}
}
function saveState(){localStorage.setItem(DATA_KEY,JSON.stringify(state));renderHome();}
function uid(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;}
function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function timeText(iso){return iso?new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'—';}
function minutesToText(mins){mins=Math.max(0,Math.round(mins));const h=Math.floor(mins/60),m=mins%60;return h?`${h}h ${m}m`:`${m}m`;}
function timeToMinutes(value){const [h,m]=value.split(':').map(Number);return h*60+m;}
function scheduledMinutes(session){return Math.max(0,timeToMinutes(session.end)-timeToMinutes(session.start));}
function creditedMinutes(session,markedAt,date){
  if(!markedAt)return 0;
  const mark=new Date(markedAt);
  const [eh,em]=session.end.split(':').map(Number);
  const end=new Date(`${date}T${session.end}:00`);
  if(Number.isNaN(end.getTime())) return scheduledMinutes(session);
  const start=new Date(`${date}T${session.start}:00`);
  const effectiveStart=mark<start?start:mark;
  return Math.max(0,Math.min(scheduledMinutes(session),(end-effectiveStart)/60000));
}
function showToast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200);}
function showPage(name){
  pages.forEach(p=>p.classList.toggle('active',p.dataset.page===name));
  navItems.forEach(n=>n.classList.toggle('active',n.dataset.pageTarget===name));
  document.querySelector('.bottom-nav').style.display=['class-detail','live-register'].includes(name)?'none':'grid';
  window.scrollTo(0,0);
  if(name==='registers')renderClasses();
  if(name==='home')renderHome();
}

function renderHome(){
  $('statClasses').textContent=state.classes.length;
  $('statLearners').textContent=state.classes.reduce((n,c)=>n+c.learners.length,0);
  $('statRegisters').textContent=state.registers.length;
  const today=todayISO();
  const presentIds=new Set(state.registers.filter(r=>r.date===today).flatMap(r=>Object.values(r.attendance||{}).filter(v=>v?.markedAt).map(v=>v.learnerId)));
  $('statPresent').textContent=presentIds.size;
}
function renderClasses(){
  const empty=$('classesEmpty'),list=$('classList');
  empty.hidden=state.classes.length>0;
  list.innerHTML=state.classes.map(c=>{
    const sessions=c.sessions||[];
    const total=sessions.reduce((n,s)=>n+scheduledMinutes(s),0);
    return `<article class="class-card">
      <div class="class-card-header"><div><h3>${esc(c.name)}</h3><p>${esc(c.location||'No location')} · ${c.learners.length} learner${c.learners.length===1?'':'s'}</p></div><span class="pill">${minutesToText(total)}</span></div>
      <div class="card-actions"><button class="text-button" data-open-class="${c.id}">Open</button><button class="text-button" data-start-class="${c.id}">Start register</button><button class="text-button" data-edit-class="${c.id}">Edit</button><button class="text-button danger" data-delete-class="${c.id}">Delete</button></div>
    </article>`;
  }).join('');
}
function getClass(id=currentClassId){return state.classes.find(c=>c.id===id);}
function renderClassDetail(){
  const c=getClass();if(!c)return showPage('registers');
  const regs=state.registers.filter(r=>r.classId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  $('classDetail').innerHTML=`
    <article class="detail-card"><div class="class-card-header"><div><p class="eyebrow">CLASS</p><h2>${esc(c.name)}</h2><p class="meta">${esc(c.location||'No location')}</p></div><button class="primary-button compact" data-start-class="${c.id}">Start register</button></div>
      <div class="session-list">${c.sessions.map((s,i)=>`<div class="session-summary"><strong>Session ${i+1}</strong><span>${s.start}–${s.end} · ${minutesToText(scheduledMinutes(s))}</span></div>`).join('')}</div>
    </article>
    <article class="detail-card"><div class="section-title-row"><div><h3>Learners</h3><p>${c.learners.length} on this register</p></div><button class="secondary-button compact" id="addLearnerButton">+ Learner</button></div>
      <div class="learner-list">${c.learners.length?c.learners.map(l=>`<div class="learner-row"><strong>${esc(l.name)}</strong><button data-remove-learner="${l.id}" aria-label="Remove ${esc(l.name)}">×</button></div>`).join(''):'<p class="meta">No learners added yet.</p>'}</div>
    </article>
    <article class="detail-card"><div class="section-title-row"><div><h3>Register history</h3><p>Saved on this device</p></div></div>
      <div>${regs.length?regs.map(r=>{const counts=registerCounts(r,c);return `<button class="list-row" data-open-register="${r.id}"><span><strong>${new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</strong><small>${counts.present}/${c.learners.length} learners marked · ${r.finishedAt?'Finished':'Open'}</small></span><span>›</span></button>`}).join(''):'<p class="meta">No registers completed yet.</p>'}</div>
    </article>`;
}
function registerCounts(r,c){
  let present=0,totalMinutes=0;
  c.learners.forEach(l=>{let learnerMinutes=0; c.sessions.forEach((s,i)=>{const a=r.attendance?.[`${l.id}_${i}`];if(a?.markedAt)learnerMinutes+=creditedMinutes(s,a.markedAt,r.date);});if(learnerMinutes>0)present++;totalMinutes+=learnerMinutes;});
  return {present,totalMinutes};
}
function openClass(id){currentClassId=id;renderClassDetail();showPage('class-detail');}
function openClassDialog(id=null){
  const c=id?getClass(id):null;
  $('editingClassId').value=c?.id||'';$('className').value=c?.name||'';$('classLocation').value=c?.location||'';
  $('classDialogTitle').textContent=c?'Edit class':'Create class';
  $('sessionRows').innerHTML='';(c?.sessions?.length?c.sessions:[{start:'09:00',end:'10:00'},{start:'11:00',end:'13:00'}]).forEach(addSessionRow);
  classDialog.showModal();
}
function addSessionRow(session={start:'09:00',end:'10:00'}){
  const row=document.createElement('div');row.className='session-edit-row';row.innerHTML=`<label>Starts<input type="time" class="session-start" value="${session.start}" required></label><label>Ends<input type="time" class="session-end" value="${session.end}" required></label><button type="button" class="remove-session">×</button>`;
  row.querySelector('.remove-session').onclick=()=>{if($('sessionRows').children.length===1)return showToast('A class needs at least one session');row.remove();};$('sessionRows').append(row);
}
function startRegister(classId){
  const c=getClass(classId);if(!c)return;
  if(!c.learners.length)return showToast('Add at least one learner first');
  let r=state.registers.find(x=>x.classId===classId&&x.date===todayISO()&&!x.finishedAt);
  if(!r){r={id:uid('reg'),classId,date:todayISO(),createdAt:new Date().toISOString(),finishedAt:null,attendance:{}};state.registers.push(r);saveState();}
  currentClassId=classId;currentRegisterId=r.id;currentSessionIndex=0;renderLiveRegister();showPage('live-register');
}
function renderLiveRegister(){
  const c=getClass(),r=state.registers.find(x=>x.id===currentRegisterId);if(!c||!r)return;
  const counts=registerCounts(r,c);const current=c.sessions[currentSessionIndex];
  $('liveRegister').innerHTML=`
    <div class="live-header"><div><p class="eyebrow">${r.finishedAt?'SAVED REGISTER':'LIVE REGISTER'}</p><h2>${esc(c.name)}</h2><p class="meta">${new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p></div><div class="live-actions"><button class="secondary-button compact" data-export-register="${r.id}">CSV</button>${r.finishedAt?'':`<button class="primary-button compact" id="finishRegisterButton">Finish</button>`}</div></div>
    <div class="live-card"><div class="live-session-tabs">${c.sessions.map((s,i)=>`<button class="session-tab ${i===currentSessionIndex?'active':''}" data-session-index="${i}">Session ${i+1} · ${s.start}–${s.end}</button>`).join('')}</div></div>
    <div class="live-summary"><article><span>Marked</span><strong>${counts.present}/${c.learners.length}</strong></article><article><span>Session</span><strong>${current.start}–${current.end}</strong></article><article><span>Session length</span><strong>${minutesToText(scheduledMinutes(current))}</strong></article><article><span>Total credited</span><strong>${minutesToText(counts.totalMinutes)}</strong></article></div>
    <div class="live-card"><h3>Session ${currentSessionIndex+1}</h3><p class="meta">Tick each learner when they arrive for this session. The exact time is saved.</p><div class="attendance-list">${c.learners.map(l=>{
      const key=`${l.id}_${currentSessionIndex}`,a=r.attendance[key],mins=a?creditedMinutes(current,a.markedAt,r.date):0;
      return `<div class="attendance-row ${a?.markedAt?'checked':''}"><div class="attendance-name"><strong>${esc(l.name)}</strong><small>${a?.markedAt?`Ticked ${timeText(a.markedAt)} · ${minutesToText(mins)} credited`:'Not yet marked'}</small></div><button class="tick-button" data-toggle-attendance="${l.id}" ${r.finishedAt?'disabled':''}>${a?.markedAt?'✓ Present':'Tick present'}</button></div>`;
    }).join('')}</div></div>
    <div class="live-card"><h3>Learner totals</h3><div>${c.learners.map(l=>{let total=0,marks=0;c.sessions.forEach((s,i)=>{const a=r.attendance[`${l.id}_${i}`];if(a?.markedAt){marks++;total+=creditedMinutes(s,a.markedAt,r.date);}});return `<div class="history-row"><strong>${esc(l.name)}</strong><small>${marks}/${c.sessions.length} sessions · ${minutesToText(total)} attended</small></div>`}).join('')}</div></div>`;
}
function toggleAttendance(learnerId){
  const c=getClass(),r=state.registers.find(x=>x.id===currentRegisterId);if(!c||!r||r.finishedAt)return;
  const key=`${learnerId}_${currentSessionIndex}`;
  if(r.attendance[key]?.markedAt) delete r.attendance[key]; else r.attendance[key]={learnerId,sessionIndex:currentSessionIndex,markedAt:new Date().toISOString()};
  saveState();renderLiveRegister();
}
function finishRegister(){const r=state.registers.find(x=>x.id===currentRegisterId);if(!r)return;r.finishedAt=new Date().toISOString();saveState();renderLiveRegister();showToast('Register saved');}
function exportRegister(id){
  const r=state.registers.find(x=>x.id===id),c=state.classes.find(x=>x.id===r?.classId);if(!r||!c)return;
  const header=['Learner',...c.sessions.flatMap((s,i)=>[`Session ${i+1} (${s.start}-${s.end}) tick time`,`Session ${i+1} credited minutes`]),'Total minutes'];
  const rows=c.learners.map(l=>{let total=0;const cols=[l.name];c.sessions.forEach((s,i)=>{const a=r.attendance[`${l.id}_${i}`];const mins=a?creditedMinutes(s,a.markedAt,r.date):0;total+=mins;cols.push(a?timeText(a.markedAt):'',String(Math.round(mins)));});cols.push(String(Math.round(total)));return cols;});
  download(`${safeName(c.name)}-${r.date}-register.csv`,[header,...rows].map(row=>row.map(csvCell).join(',')).join('\n'),'text/csv');
}
function csvCell(v){return `"${String(v).replace(/"/g,'""')}"`;}
function safeName(v){return v.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'');}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function askConfirm(title,message,action,label='Delete'){confirmCallback=action;$('confirmTitle').textContent=title;$('confirmMessage').textContent=message;$('confirmAction').textContent=label;confirmDialog.showModal();}

// Global interaction routing
document.addEventListener('click',e=>{
  const target=e.target.closest('button,[data-go],[data-new-class]');if(!target)return;
  if(target.dataset.pageTarget)showPage(target.dataset.pageTarget);
  if(target.dataset.go)showPage(target.dataset.go);
  if(target.hasAttribute('data-new-class')||target.id==='newClassButton')openClassDialog();
  if(target.dataset.openClass)openClass(target.dataset.openClass);
  if(target.dataset.editClass)openClassDialog(target.dataset.editClass);
  if(target.dataset.startClass)startRegister(target.dataset.startClass);
  if(target.dataset.deleteClass){const c=getClass(target.dataset.deleteClass);askConfirm('Delete class?',`Delete ${c.name} and all of its register history?`,()=>{state.classes=state.classes.filter(x=>x.id!==c.id);state.registers=state.registers.filter(x=>x.classId!==c.id);saveState();renderClasses();});}
  if(target.dataset.back)showPage(target.dataset.back);
  if(target.dataset.closeDialog!==undefined)target.closest('dialog')?.close();
  if(target.id==='addSessionRow')addSessionRow();
  if(target.id==='addLearnerButton')learnerDialog.showModal();
  if(target.dataset.removeLearner){const c=getClass(),l=c.learners.find(x=>x.id===target.dataset.removeLearner);askConfirm('Remove learner?',`Remove ${l.name} from this class? Existing historic register entries will remain in backups but no longer display.`,()=>{c.learners=c.learners.filter(x=>x.id!==l.id);saveState();renderClassDetail();});}
  if(target.dataset.sessionIndex!==undefined){currentSessionIndex=Number(target.dataset.sessionIndex);renderLiveRegister();}
  if(target.dataset.toggleAttendance)toggleAttendance(target.dataset.toggleAttendance);
  if(target.id==='finishRegisterButton')askConfirm('Finish register?','The register will be saved and attendance ticks will be locked.',finishRegister,'Finish');
  if(target.dataset.exportRegister)exportRegister(target.dataset.exportRegister);
});

$('classForm').addEventListener('submit',e=>{
  e.preventDefault();const sessions=[...document.querySelectorAll('.session-edit-row')].map(row=>({start:row.querySelector('.session-start').value,end:row.querySelector('.session-end').value})).sort((a,b)=>a.start.localeCompare(b.start));
  if(sessions.some(s=>timeToMinutes(s.end)<=timeToMinutes(s.start)))return showToast('Every session must end after it starts');
  if(sessions.some((s,i)=>i&&timeToMinutes(s.start)<timeToMinutes(sessions[i-1].end)))return showToast('Teaching sessions cannot overlap');
  const id=$('editingClassId').value,c=id?getClass(id):null;
  if(c){c.name=$('className').value.trim();c.location=$('classLocation').value.trim();c.sessions=sessions;}else state.classes.push({id:uid('class'),name:$('className').value.trim(),location:$('classLocation').value.trim(),sessions,learners:[],createdAt:new Date().toISOString()});
  saveState();classDialog.close();renderClasses();showToast(c?'Class updated':'Class created');
});
$('learnerForm').addEventListener('submit',e=>{e.preventDefault();const c=getClass(),name=$('learnerName').value.trim();if(!c||!name)return;if(c.learners.some(l=>l.name.toLowerCase()===name.toLowerCase()))return showToast('That learner is already in this class');c.learners.push({id:uid('learner'),name});c.learners.sort((a,b)=>a.name.localeCompare(b.name));$('learnerName').value='';saveState();learnerDialog.close();renderClassDetail();showToast('Learner added');});
$('leaveLiveButton').addEventListener('click',()=>{renderClassDetail();showPage('class-detail');});
confirmDialog.addEventListener('close',()=>{if(confirmDialog.returnValue==='confirm'&&confirmCallback)confirmCallback();confirmCallback=null;});
$('exportBackupButton').addEventListener('click',()=>download(`AssessorPlus-backup-${todayISO()}.json`,JSON.stringify({version:1,exportedAt:new Date().toISOString(),data:state},null,2),'application/json'));
$('importBackupInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),data=parsed.data||parsed;if(!Array.isArray(data.classes)||!Array.isArray(data.registers))throw new Error();askConfirm('Restore backup?','This will replace all classes and registers currently stored on this device.',()=>{state.classes=data.classes;state.registers=data.registers;saveState();renderClasses();showToast('Backup restored');},'Restore');}catch{showToast('That is not a valid Assessor+ backup');}e.target.value='';});
$('clearDataButton').addEventListener('click',()=>askConfirm('Delete all data?','This permanently removes every class, learner and register stored on this device.',()=>{state.classes=[];state.registers=[];saveState();renderClasses();showToast('All local data deleted');}));

// Install support
const installDialog=$('installDialog'),installButton=$('installButton'),dialogInstallButton=$('dialogInstallButton');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;installButton.hidden=false;dialogInstallButton.hidden=false;});
async function promptInstall(){if(!deferredInstallPrompt){installDialog.showModal();return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installButton.hidden=true;dialogInstallButton.hidden=true;}
installButton.onclick=promptInstall;$('installRow').onclick=promptInstall;dialogInstallButton.onclick=promptInstall;
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
renderHome();renderClasses();showPage('home');

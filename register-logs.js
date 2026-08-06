function legacyOneOffDate(c){return c?.oneOffDate||c?.scheduledDate||c?.registerDate||((c?.recurring===false&&/^\d{4}-\d{2}-\d{2}$/.test(String(c?.date||'')))?c.date:'')}
function registerIsOneOff(c){return c?.recurring===false||!!legacyOneOffDate(c)}
function registerHasCompletedLog(c,date){return state.logs.some(l=>String(l.classId||'')===String(c.id||'')&&l.date===date)}
function registerWasScheduledOn(c,date){
 if(registerIsOneOff(c))return legacyOneOffDate(c)===date;
 if(c.recurringStart&&date<c.recurringStart)return false;
 if(c.recurringEnd&&date>c.recurringEnd)return false;
 return Number(c.weekday)===dayStart(date).getDay();
}
function registerScheduledEnd(c,date){let sessions=(c.periods||[]).filter(p=>p.type==='session');let end=sessions.at(-1)?.end||'23:59';return new Date(`${date}T${end}:00`)}
function missedRegisterCandidates(daysBack=90){
 const current=now(),today=dateISO(current),startDate=new Date(dayStart(today));startDate.setDate(startDate.getDate()-daysBack);let out=[];
 for(const c of state.classes){
  if(registerIsOneOff(c)){
   const d=legacyOneOffDate(c);
   if(d&&dayStart(d)>=startDate&&registerScheduledEnd(c,d)<current&&!registerHasCompletedLog(c,d)&&!(state.live?.classId===c.id&&state.live?.date===d)&&!isClassOnHoliday(c.id,d))out.push({c,date:d});
   continue;
  }
  let from=new Date(startDate);if(c.recurringStart&&dayStart(c.recurringStart)>from)from=dayStart(c.recurringStart);
  let to=dayStart(today);if(c.recurringEnd&&dayStart(c.recurringEnd)<to)to=dayStart(c.recurringEnd);
  for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
   const iso=dateISO(d);
   if(!registerWasScheduledOn(c,iso))continue;
   if(registerScheduledEnd(c,iso)>=current)continue;
   if(registerHasCompletedLog(c,iso))continue;
   if(state.live?.classId===c.id&&state.live?.date===iso)continue;
   if(isClassOnHoliday(c.id,iso))continue;
   out.push({c,date:iso});
  }
 }
 const unique=new Map();for(const item of out)unique.set(`${item.c.id}|${item.date}`,item);
 return [...unique.values()].sort((a,b)=>b.date.localeCompare(a.date)||String(a.c.name).localeCompare(String(b.c.name)));
}
function createMissedRegisterLog(classId,date){
 const c=state.classes.find(x=>String(x.id)===String(classId));if(!c)return;
 if(registerHasCompletedLog(c,date))return alert('A completed register already exists for this date.');
 const sessions=(c.periods||[]).filter(p=>p.type==='session'),planned=sessions.reduce((sum,p)=>sum+Math.max(0,timeMin(p.end)-timeMin(p.start)),0);
 const learners=sortedLearners((c.learnerIds||[]).map(id=>state.learners.find(l=>String(l.id)===String(id))).filter(isActiveLearner));
 const results=learners.map(l=>{const holiday=isLearnerOnHoliday(l.id,date,c.id);return{learnerId:l.id,holiday,creditedMinutes:0,netMinutes:holiday?0:-planned,attendedSessions:0,totalSessions:sessions.length,details:sessions.map(p=>({periodId:p.id,label:p.label,status:holiday?'On holiday':'Absent',credited:0,net:holiday?0:-(timeMin(p.end)-timeMin(p.start)),segments:[]}))}});
 const log={id:uid('reglog'),classId:c.id,className:c.name,date,periods:JSON.parse(JSON.stringify(c.periods||[])),learnerIds:learners.map(l=>l.id),plannedMinutes:planned,results,completedAt:new Date().toISOString(),manualRecovery:true,sentAt:null};
 state.logs.unshift(log);save();currentLogTab='all';renderLogs();openEditLog(log.id);
}
function renderLogs(){
  if(state.live){const end=liveScheduledEnd(state.live);if(end&&now().getTime()>=end.getTime()){completeDay(true);return}}
  const el=$('logList'),unsent=state.logs.filter(log=>!log.sentAt),visible=currentLogTab==='all'?state.logs:currentLogTab==='unsent'?unsent:[];
  for(const id of [...selectedLogIds])if(!state.logs.some(log=>String(log.id)===id))selectedLogIds.delete(id);
  $('unsentLogTab')?.classList.toggle('active',currentLogTab==='unsent');$('allLogTab')?.classList.toggle('active',currentLogTab==='all');$('missedLogTab')?.classList.toggle('active',currentLogTab==='missed');
  if(currentLogTab==='missed'){const missed=missedRegisterCandidates();if($('logTabSummary'))$('logTabSummary').textContent=`${missed.length} missed register${missed.length===1?'':'s'} available to recover`;if($('selectedLogSummary'))$('selectedLogSummary').textContent='Create a log, then tick learners and enter their times.';if($('exportSelectedBtn'))$('exportSelectedBtn').disabled=true;el.innerHTML=missed.length?missed.map(x=>`<div class="missed-register-row"><div class="missed-register-main"><strong>${esc(x.c.name)}</strong><span class="row-meta">${dateFmt(x.date)} · ${classStart(x.c)}–${x.c.periods.filter(p=>p.type==='session').slice(-1)[0]?.end||'—'} · ${(x.c.learnerIds||[]).filter(id=>isActiveLearner(state.learners.find(l=>String(l.id)===String(id)))).length} learners</span></div><button class="btn small primary" onclick="createMissedRegisterLog('${x.c.id}','${x.date}')">Create log</button></div>`).join(''):'<div class="empty">No missed registers in the last 90 days.</div>';return;}
  el.innerHTML=visible.map(log=>`<div class="card register-log-card"><div class="row" style="border:0;padding:0"><label class="log-select"><input type="checkbox" data-log-select="${esc(log.id)}" onchange="toggleLogSelection('${esc(log.id)}',this.checked)"><span><span class="row-title">${esc(log.className)}</span><span class="row-meta">${dateFmt(log.date)} · ${minText(log.plannedMinutes)} planned · ${(log.results||[]).length} learners</span><span class="${log.sentAt?'sent-status':'unsent-status'}">${log.sentAt?`Sent ${new Date(log.sentAt).toLocaleDateString('en-GB')}${log.sendCount>1?` · sent ${log.sendCount} times`:''}`:'Unsent'}</span></span></label><div class="log-head-actions"><button type="button" class="btn small dark" onclick="toggleLog('${esc(log.id)}')">View</button><button type="button" class="btn small light" onclick="openEditLog('${esc(log.id)}')">Edit learners</button><button type="button" class="btn small danger" onclick="deleteRegisterById(decodeURIComponent('${encodeURIComponent(log.id)}'))">Delete</button></div></div><div id="log_${esc(log.id)}" style="display:none;margin-top:12px"><table><thead><tr><th>Learner</th><th>Attended</th><th>Attendance</th><th>Bank change</th><th>Sessions</th></tr></thead><tbody>${[...(log.results||[])].sort((a,b)=>learnerName(a.learnerId).localeCompare(learnerName(b.learnerId))).map(r=>`<tr><td>${esc(learnerName(r.learnerId))}</td><td>${r.holiday?'On holiday':minText(r.creditedMinutes)}</td><td>${logAttendancePercent(log,r)}</td><td class="${resultArrivalBankMinutes(log,r)>=0?'positive':'negative'}">${r.holiday?'—':bankText(resultArrivalBankMinutes(log,r))}</td><td>${r.holiday?'—':`${r.attendedSessions}/${r.totalSessions}`}</td></tr>`).join('')}</tbody></table></div></div>`).join('');updateLogSelectionUi()
}
function toggleLog(id){let el=$('log_'+id);el.style.display=el.style.display==='none'?'block':'none'}
function openEditLog(id){let log=state.logs.find(x=>x.id===id);if(!log)return;editingLogId=id;let sessions=log.periods.filter(p=>p.type==='session'),ordered=[...log.results].sort((a,b)=>learnerName(a.learnerId).localeCompare(learnerName(b.learnerId)));$('editLogContent').innerHTML=`<div class="edit-note">Open a learner, tick each session they attended, then set their arrival and leaving times. Unticked sessions remain absent.</div><div class="card" style="margin-bottom:12px"><strong>${esc(log.className)}</strong><div class="row-meta">${dateFmt(log.date)} · ${minText(log.plannedMinutes)} planned learning</div></div>${ordered.map(r=>{let ri=log.results.indexOf(r);return `<details class="card" style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:800;display:flex;justify-content:space-between;gap:12px;align-items:center"><span>${esc(learnerName(r.learnerId))}</span><span class="row-meta">${r.holiday?'On holiday':`${minText(r.creditedMinutes)} · ${logAttendancePercent(log,r)}`}</span></summary><div style="margin-top:12px">${r.holiday?'<div class="holiday-badge">On holiday for this register date</div>':sessions.map((p,si)=>{let d=(r.details||[]).find(x=>x.periodId===p.id)||{},segs=d.segments||[],first=segs.length?Math.min(...segs.map(x=>Number(x.inMinute))):null,outs=segs.map(x=>x.outMinute).filter(x=>x!=null).map(Number),last=outs.length?Math.max(...outs):null,fmt=m=>m==null?'':`${String(Math.floor(m/60)).padStart(2,'0')}:${String(Math.round(m%60)).padStart(2,'0')}`;return `<div class="edit-session"><div class="session-label"><strong>${esc(p.label)}</strong><div class="row-meta">Scheduled ${p.start}–${p.end}</div></div><label class="edit-present-check"><input id="el_present_${ri}_${si}" type="checkbox" ${first!=null?'checked':''} onchange="toggleEditSessionTimes(${ri},${si})"> Present</label><div class="field"><label>Arrived</label><input id="el_in_${ri}_${si}" type="time" value="${fmt(first)||p.start}" ${first==null?'disabled':''}></div><div class="field"><label>Left</label><input id="el_out_${ri}_${si}" type="time" value="${fmt(last)||p.end}" ${first==null?'disabled':''}></div></div>`}).join('')}</div></details>`}).join('')}`;openM('editLogModal')}
function toggleEditSessionTimes(ri,si){let on=$(`el_present_${ri}_${si}`).checked;$(`el_in_${ri}_${si}`).disabled=!on;$(`el_out_${ri}_${si}`).disabled=!on}
function saveEditedLog(){let log=state.logs.find(x=>x.id===editingLogId);if(!log)return;let sessions=log.periods.filter(p=>p.type==='session');log.results.forEach((r,ri)=>{if(r.holiday)return;let credited=0,attendedSessions=0,details=[];sessions.forEach((p,si)=>{let present=$(`el_present_${ri}_${si}`)?.checked,inVal=$(`el_in_${ri}_${si}`)?.value,outVal=$(`el_out_${ri}_${si}`)?.value,dur=timeMin(p.end)-timeMin(p.start);if(present&&inVal&&outVal){let inn=timeMin(inVal),out=timeMin(outVal);if(out<inn)out=inn;let mins=Math.max(0,out-inn);credited+=mins;if(mins>0)attendedSessions++;details.push({periodId:p.id,label:p.label,status:'Corrected',credited:mins,net:mins-dur,segments:[{inMinute:inn,inTime:`${log.date}T${inVal}:00`,outMinute:out,outTime:`${log.date}T${outVal}:00`}]})}else details.push({periodId:p.id,label:p.label,status:'Absent',credited:0,net:-dur,segments:[]})});r.creditedMinutes=Math.round(credited);r.netMinutes=Math.round(credited-log.plannedMinutes);r.attendedSessions=attendedSessions;r.totalSessions=sessions.length;r.details=details;r.edited=true});log.editedAt=new Date().toISOString();closeM('editLogModal');editingLogId=null;save()}

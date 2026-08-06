// Review+ professional review and pseudonymised Apprentice+ transfer
let reviewView='overview',pendingReviewSnapshot=null,editingReviewId=null,currentSharedReviewId=null,reviewScanStream=null,reviewScanTimer=null;
if(!Array.isArray(state.reviewSnapshots))state.reviewSnapshots=[];if(!Array.isArray(state.reviews))state.reviews=[];
function reviewLearner(id){return state.learners.find(l=>String(l.id)===String(id))}
function normaliseSnapshot(raw){
 if(raw&&raw.payload&&raw.format==='APREVIEW_PACKAGE')raw=raw.payload;
 if(!raw||typeof raw!=='object')throw new Error('This is not a valid review snapshot.');
 const direction=raw.direction||raw.transferDirection||'ApprenticePlusToAssessorPlus';
 if(direction!=='ApprenticePlusToAssessorPlus')throw new Error('This transfer is not an Apprentice+ progress snapshot.');
 if(raw.learnerName||raw.name||raw.email||raw.phone||raw.dateOfBirth||raw.address)throw new Error('This file contains personal details and cannot be imported as a pseudonymised snapshot.');
 const snapshot={
  format:'APPRENTICE_PLUS_REVIEW_SNAPSHOT',version:Number(raw.version||1),direction,
  transferId:String(raw.transferId||uid('snapshot')),createdAt:raw.createdAt||new Date().toISOString(),expiresAt:raw.expiresAt||null,
  course:String(raw.course||raw.courseName||'Not supplied'),standardVersion:String(raw.standardVersion||''),reviewPeriod:String(raw.reviewPeriod||''),
  progressPercent:numOrNull(raw.progressPercent??raw.progress),ksbCompleted:numOrNull(raw.ksbCompleted),ksbTotal:numOrNull(raw.ksbTotal),
  assignmentsCompleted:numOrNull(raw.assignmentsCompleted),assignmentsTotal:numOrNull(raw.assignmentsTotal),otjHours:numOrNull(raw.otjHours),otjRequired:numOrNull(raw.otjRequired),
  academyScore:numOrNull(raw.academyScore),epaStatus:String(raw.epaStatus||''),ragStatus:String(raw.ragStatus||raw.progressSnapshot?.rag||''),reviewStatus:String(raw.reviewStatus||raw.progressSnapshot?.reviewStatus||''),
  newEvidenceCount:numOrNull(raw.newEvidenceCount),newKsbCount:numOrNull(raw.newKsbCount),evidenceTotal:numOrNull(raw.evidenceTotal),epaReadiness:raw.epaReadiness&&typeof raw.epaReadiness==='object'?raw.epaReadiness:null,progressSnapshot:raw.progressSnapshot&&typeof raw.progressSnapshot==='object'?raw.progressSnapshot:null,learnerReflection:String(raw.learnerReflection||''),
  previousTargets:Array.isArray(raw.previousTargets)?raw.previousTargets.slice(0,10).map(t=>({text:String(t.text||t.target||''),status:String(t.status||'To review')})):[],
  suggestedTargets:Array.isArray(raw.suggestedTargets)?raw.suggestedTargets.slice(0,5).map(t=>String(t.text||t.target||t)):[],
  sourceHash:String(raw.sourceHash||'')
 };
 if(snapshot.expiresAt&&new Date(snapshot.expiresAt).getTime()<Date.now())throw new Error('This review snapshot has expired. Generate a new one in Apprentice+.');
 if(state.reviewSnapshots.some(x=>x.transferId===snapshot.transferId)||state.reviews.some(x=>x.snapshotTransferId===snapshot.transferId))throw new Error('This review snapshot has already been imported.');
 return snapshot;
}
function numOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null}
function renderAssessments(){
 const content=$('assessmentContent'),actions=$('assessmentHeaderActions');if(!content||!actions)return;
 actions.innerHTML='';
 const reviews=[...state.reviews].sort((a,b)=>(b.reviewDate||'').localeCompare(a.reviewDate||''));
 const pending=state.reviewSnapshots.filter(x=>!x.reviewId);
 const due=activeLearners().filter(l=>{const lr=reviews.find(r=>String(r.learnerId)===String(l.id));return !lr?.nextReviewDate||lr.nextReviewDate<=dateISO()}).length;
 const command=`<div class="review-commandbar"><div class="review-commandbar-copy"><strong>Professional reviews</strong><span>Receive Apprentice+ progress or start a review directly.</span></div><div class="review-inline-actions"><button class="btn light" type="button" onclick="openReviewImport()">Receive learner review</button><button class="btn primary" type="button" onclick="openReviewEditor()">New review</button></div></div>`;const nav=`<div class="review-tabs"><button class="${reviewView==='overview'?'active':''}" onclick="setReviewView('overview')">Overview</button><button class="${reviewView==='records'?'active':''}" onclick="setReviewView('records')">Review records</button><button class="${reviewView==='received'?'active':''}" onclick="setReviewView('received')">Received${pending.length?` (${pending.length})`:''}</button></div>`;
 if(reviewView==='overview'){
  const recent=reviews.slice(0,5);
  content.innerHTML=`<div class="review-shell">${command}${nav}<div class="review-summary"><div class="review-stat"><span>Learners</span><strong>${state.learners.length}</strong></div><div class="review-stat"><span>Reviews completed</span><strong>${reviews.length}</strong></div><div class="review-stat"><span>Due / not scheduled</span><strong>${due}</strong></div><div class="review-stat"><span>Received snapshots</span><strong>${pending.length}</strong></div></div><div class="section-head"><h2>Recent reviews</h2></div>${recent.length?`<div class="review-list">${recent.map(reviewRow).join('')}</div>`:'<div class="review-empty">No professional reviews have been completed yet.</div>'}</div>`;return;
 }
 if(reviewView==='received'){
  content.innerHTML=`<div class="review-shell">${command}${nav}<div class="section-head"><h2>Received learner data</h2></div>${pending.length?`<div class="review-list">${pending.map(s=>`<div class="review-row"><div><div class="review-title">${esc(s.course)}</div><div class="review-meta">${dateFmt((s.createdAt||'').slice(0,10))} · No personal information attached</div></div><div class="review-actions"><span class="review-badge pending">Awaiting learner</span><button class="btn small primary" onclick="openAttachSnapshot('${s.transferId}')">Attach</button><button class="btn small danger" onclick="deleteReceivedSnapshot('${s.transferId}')">Delete</button></div></div>`).join('')}</div>`:'<div class="review-empty">No unassigned review snapshots.</div>'}</div>`;return;
 }
 content.innerHTML=`<div class="review-shell">${command}${nav}<div class="section-head"><h2>Review records</h2></div>${reviews.length?`<div class="review-list">${reviews.map(reviewRow).join('')}</div>`:'<div class="review-empty">No review records yet.</div>'}</div>`;
}
function setReviewView(v){reviewView=v;renderAssessments()}
function reviewRow(r){return `<div class="review-row"><div><div class="review-title">${esc(r.learnerName||learnerName(r.learnerId))}</div><div class="review-meta">${dateFmt(r.reviewDate)} · Next ${dateFmt(r.nextReviewDate)} · ${esc(r.rag||'Not rated')}</div></div><div class="review-actions"><button class="btn small light" onclick="openReviewEditor('${r.id}')">Open</button><button class="btn small light" onclick="shareReview('${r.id}')">Send</button><button class="btn small danger" onclick="deleteReview('${r.id}')">Delete</button></div></div>`}
function openReviewImport(){pendingReviewSnapshot=null;$('reviewImportText').value='';$('reviewImportPreview').innerHTML='';$('reviewImportFile').value='';openM('reviewImportModal')}
function parseReviewImportText(){try{const text=$('reviewImportText').value.trim();if(!text)throw new Error('Paste or choose a review snapshot first.');const raw=JSON.parse(text);pendingReviewSnapshot=normaliseSnapshot(raw);showReviewImportPreview()}catch(e){alert(e.message||'Could not read the review snapshot.')}}
function showReviewImportPreview(){const s=pendingReviewSnapshot;if(!s)return;$('reviewImportPreview').innerHTML=`<div class="snapshot-preview" style="margin-top:12px"><strong>Snapshot ready</strong>${snapshotHtml(s)}<div class="review-inline-actions" style="margin-top:10px"><button class="btn primary" onclick="saveReceivedSnapshot()">Continue</button></div></div>`}
function saveReceivedSnapshot(){
 const snapshot=pendingReviewSnapshot;if(!snapshot)return alert('Choose or scan review data first.');
 if(state.reviewSnapshots.some(x=>x.transferId===snapshot.transferId)||state.reviews.some(x=>x.snapshotTransferId===snapshot.transferId))return alert('This review snapshot has already been imported.');
 state.reviewSnapshots.push(snapshot);pendingReviewSnapshot=null;closeM('reviewImportModal');save();openAttachSnapshot(snapshot.transferId)
}
function openAttachSnapshot(transferId){
 const snapshot=state.reviewSnapshots.find(x=>String(x.transferId)===String(transferId));if(!snapshot)return alert('The received review data could not be found.');
 pendingReviewSnapshot=snapshot;$('reviewAttachPreview').innerHTML=snapshotHtml(snapshot);
 const learners=sortedLearners(state.learners);const select=$('reviewAttachLearner');select.innerHTML=learners.map(l=>`<option value="${esc(l.id)}">${esc(l.first+' '+l.last)}</option>`).join('');
 if($('reviewAttachSearch'))$('reviewAttachSearch').value='';if(!learners.length)select.innerHTML='<option value="">Add a learner before attaching this review</option>';
 openM('reviewAttachModal');setTimeout(()=>filterLearnerSelect('reviewAttachSearch','reviewAttachLearner'),0)
}
function attachSnapshotToLearner(){
 const learnerId=$('reviewAttachLearner').value,snapshot=pendingReviewSnapshot;if(!snapshot)return alert('The received review data could not be found.');if(!learnerId)return alert('Select the correct learner.');
 closeM('reviewAttachModal');openReviewEditor(null,learnerId,snapshot.transferId)
}
function deleteReceivedSnapshot(transferId){
 const snapshot=state.reviewSnapshots.find(x=>String(x.transferId)===String(transferId));if(!snapshot||snapshot.reviewId)return;if(!confirm('Delete this received review snapshot?'))return;
 state.reviewSnapshots=state.reviewSnapshots.filter(x=>String(x.transferId)!==String(transferId));if(pendingReviewSnapshot?.transferId===transferId)pendingReviewSnapshot=null;save()
}
function snapshotHtml(s){
 const progress=s.progressPercent==null?'Not supplied':`${Math.round(s.progressPercent)}%`,ksb=s.ksbCompleted==null?'Not supplied':`${s.ksbCompleted}${s.ksbTotal!=null?` / ${s.ksbTotal}`:''}`,assignments=s.assignmentsCompleted==null?'Not supplied':`${s.assignmentsCompleted}${s.assignmentsTotal!=null?` / ${s.assignmentsTotal}`:''}`;
 const otj=s.otjHours==null?'Not supplied':`${Number(s.otjHours).toFixed(1)}h${s.otjRequired!=null?` / ${Number(s.otjRequired).toFixed(1)}h`:''}`;
 const epa=s.epaReadiness?.overall!=null?`${Math.round(s.epaReadiness.overall)}%`:s.epaStatus||'Not supplied';
 return `<div class="snapshot-grid" style="margin-top:8px"><div class="snapshot-item"><span>Course</span><strong>${esc(s.course)}</strong></div><div class="snapshot-item"><span>Review RAG</span><strong>${esc(s.ragStatus||'Not supplied')}</strong></div><div class="snapshot-item"><span>Progress</span><strong>${progress}</strong></div><div class="snapshot-item"><span>KSBs / LOs</span><strong>${ksb}</strong></div><div class="snapshot-item"><span>Assignments</span><strong>${assignments}</strong></div><div class="snapshot-item"><span>OTJ</span><strong>${otj}</strong></div><div class="snapshot-item"><span>New evidence</span><strong>${s.newEvidenceCount??0}</strong></div><div class="snapshot-item"><span>New KSBs / LOs</span><strong>${s.newKsbCount??0}</strong></div><div class="snapshot-item"><span>EPA readiness</span><strong>${esc(epa)}</strong></div><div class="snapshot-item"><span>Status</span><strong>${esc(s.reviewStatus||'Not supplied')}</strong></div></div>`
}
function addDaysIso(value,days){const d=new Date(`${value||dateISO()}T12:00:00`);d.setDate(d.getDate()+Number(days||0));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function defaultTargetDates(reviewDate){return Array.from({length:5},(_,i)=>addDaysIso(reviewDate,(i+1)*7))}
function initSignaturePads(saved={}){
 window._reviewSignatures={
  learner:saved.learner||window._reviewSignatures?.learner||'',
  employer:saved.employer||window._reviewSignatures?.employer||'',
  coach:saved.coach||window._reviewSignatures?.coach||''
 };
 ['learner','employer','coach'].forEach(key=>setupSignaturePad(key));
 document.querySelectorAll('[data-clear-signature]').forEach(button=>{
  button.onclick=()=>{
   const key=button.dataset.clearSignature;
   window._reviewSignatures[key]='';
   const canvas=document.getElementById(`sig-${key}`);
   if(canvas)setupSignaturePad(key,true);
  };
 });
}
function setupSignaturePad(key,force=false){
 const canvas=document.getElementById(`sig-${key}`);if(!canvas)return;
 const rect=canvas.getBoundingClientRect();
 if(rect.width<40||rect.height<20)return;
 const saved=window._reviewSignatures?.[key]||'';
 const ratio=Math.max(1,window.devicePixelRatio||1);
 const cssWidth=Math.round(rect.width),cssHeight=Math.round(rect.height||110);
 if(force||canvas.width!==Math.round(cssWidth*ratio)||canvas.height!==Math.round(cssHeight*ratio)){
  canvas.width=Math.round(cssWidth*ratio);canvas.height=Math.round(cssHeight*ratio);
 }
 const ctx=canvas.getContext('2d');
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,cssWidth,cssHeight);
 ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#2f2937';
 if(saved){const img=new Image();img.onload=()=>{ctx.clearRect(0,0,cssWidth,cssHeight);ctx.drawImage(img,0,0,cssWidth,cssHeight)};img.src=saved}
 if(canvas.dataset.signatureBound==='1')return;
 canvas.dataset.signatureBound='1';
 let drawing=false;
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 const finish=e=>{if(!drawing)return;drawing=false;try{canvas.releasePointerCapture?.(e.pointerId)}catch{}window._reviewSignatures[key]=canvas.toDataURL('image/png')};
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);canvas.setPointerCapture?.(e.pointerId);e.preventDefault()});
 canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();e.preventDefault()});
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('pointerleave',e=>{if(drawing&&e.pointerType==='mouse')finish(e)});
}
function refreshSignaturePads(){['learner','employer','coach'].forEach(key=>setupSignaturePad(key,true))}

function polishReviewEditor(){
 const root=$('reviewEditorBody'),layout=root?.querySelector('.review-editor-layout');
 if(!layout)return;
 layout.classList.add('review-polished');
 const sections=[...layout.querySelectorAll(':scope > .review-section.modern')];
 const map={
  'Apprentice+ progress snapshot':['review-wide',true,'Imported progress'],
  'Review details':['review-side',false,'Review setup'],
  'Previous actions':['review-side',true,'Previous review'],
  'Professional discussion':['review-primary',false,'Discussion'],
  'Agreed action plan':['review-primary',false,'Next steps'],
  'Agreement':['review-wide',false,'Sign-off']
 };
 sections.forEach((section,index)=>{
  const heading=section.querySelector(':scope > h3'); if(!heading)return;
  const title=heading.textContent.trim(),cfg=map[title]||['review-wide',index>2,'Review section'];
  section.classList.add(cfg[0]);
  const body=document.createElement('div');body.className='review-section-body';
  while(heading.nextSibling)body.appendChild(heading.nextSibling);
  section.appendChild(body);
  heading.innerHTML=`<span><span class="review-section-kicker">${cfg[2]}</span>${title}</span>`;
  heading.setAttribute('role','button');heading.setAttribute('tabindex','0');heading.setAttribute('aria-expanded',String(!cfg[1]));
  if(cfg[1])section.classList.add('is-collapsed');
  const toggle=()=>{section.classList.toggle('is-collapsed');const open=!section.classList.contains('is-collapsed');heading.setAttribute('aria-expanded',String(open));if(open&&title==='Agreement')setTimeout(refreshSignaturePads,40)};
  heading.addEventListener('click',toggle);heading.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
 });
}

function openReviewLearnerPicker(){if(!activeLearners().length)return alert('Add or reinstate an active learner first.');if($('reviewLearnerSearch'))$('reviewLearnerSearch').value='';renderReviewLearnerPicker();openM('reviewLearnerPickerModal')}
function renderReviewLearnerPicker(){const el=$('reviewLearnerPickerList');if(!el)return;const q=($('reviewLearnerSearch')?.value||'').trim().toLowerCase();const learners=sortedLearners(activeLearners().filter(l=>(l.first+' '+l.last).toLowerCase().includes(q)));el.innerHTML=learners.length?learners.map(l=>{const a=attendanceStats(l.id);return `<button type="button" class="learner-picker-row" data-review-learner="${esc(l.id)}"><strong>${esc(l.first+' '+l.last)}</strong><span>${Math.min(100,a.percent)}% attendance</span></button>`}).join(''):'<div class="empty">No learners match your search.</div>'}
function filterLearnerSelect(searchId,selectId){const input=$(searchId),sel=$(selectId);if(!input||!sel)return;const q=input.value.trim().toLowerCase();[...sel.options].forEach(o=>{o.hidden=q&&!o.text.toLowerCase().includes(q)});const first=[...sel.options].find(o=>!o.hidden);if(first&&!([...sel.selectedOptions][0]&&!([...sel.selectedOptions][0].hidden)))sel.value=first.value}
function openReviewEditor(id=null,learnerId=null,snapshotId=null){
 if(!id&&!learnerId&&!snapshotId){openReviewLearnerPicker();return;}
 editingReviewId=id;const old=state.reviews.find(x=>x.id===id),snap=state.reviewSnapshots.find(x=>x.transferId===(snapshotId||old?.snapshotTransferId)),l=reviewLearner(learnerId||old?.learnerId)||state.learners[0];if(!l)return alert('Add a learner first.');
 const att=attendanceStats(l.id),metrics=learnerSessionMetrics(l.id),prev=state.reviews.filter(r=>String(r.learnerId)===String(l.id)&&r.id!==id).sort((a,b)=>(b.reviewDate||'').localeCompare(a.reviewDate||''))[0];
 const reviewDate=old?.reviewDate||dateISO(),autoDates=defaultTargetDates(reviewDate),targets=old?.targets?.length?old.targets:Array.from({length:5},(_,i)=>({text:snap?.suggestedTargets?.[i]||'',dueDate:autoDates[i]})),rag=old?.rag||snap?.ragStatus||'Amber',nextDate=old?.nextReviewDate||addDaysIso(reviewDate,56),ps=snap?.progressSnapshot||{};
 $('reviewEditorTitle').textContent=old?'Edit professional review':'Professional review';
 $('reviewEditorBody').innerHTML=`<div class="review-editor-layout"><input id="rvLearnerId" type="hidden" value="${l.id}"><input id="rvSnapshotId" type="hidden" value="${esc(snap?.transferId||old?.snapshotTransferId||'')}"><div class="review-hero"><div><h3>${esc(l.first+' '+l.last)}</h3><p>${esc(snap?.course||'Professional apprenticeship review')}</p><div class="review-kpi-grid" style="margin-top:12px"><div class="review-kpi"><span>Attendance</span><strong>${Math.min(100,att.percent)}%</strong></div><div class="review-kpi"><span>Course progress</span><strong>${snap?.progressPercent==null?'—':Math.round(snap.progressPercent)+'%'}</strong></div><div class="review-kpi"><span>OTJ</span><strong>${snap?.otjHours==null?'—':Number(snap.otjHours).toFixed(1)+' / '+Number(snap.otjRequired||0).toFixed(1)}</strong></div><div class="review-kpi"><span>New evidence</span><strong>${snap?.newEvidenceCount??0}</strong></div><div class="review-kpi"><span>New KSBs / LOs</span><strong>${snap?.newKsbCount??0}</strong></div><div class="review-kpi"><span>EPA readiness</span><strong>${snap?.epaReadiness?.overall!=null?Math.round(snap.epaReadiness.overall)+'%':esc(snap?.epaStatus||'—')}</strong></div></div></div><div class="review-progress-card"><span class="rag-readonly">${esc(rag)}</span><h3 style="margin-top:12px">${esc(snap?.reviewStatus||'Review position')}</h3><div class="review-progress-track"><span style="width:${Math.max(0,Math.min(100,Number(snap?.progressPercent||0)))}%"></span></div><p>${ps.assignmentsCompleted??snap?.assignmentsCompleted??0}/${ps.assignmentsTotal??snap?.assignmentsTotal??0} assignments · ${ps.ksbCompleted??snap?.ksbCompleted??0}/${ps.ksbTotal??snap?.ksbTotal??0} KSBs / LOs</p></div></div>
 ${snap?`<div class="review-section modern"><h3>Apprentice+ progress snapshot</h3><div style="padding:12px 14px">${snapshotHtml(snap)}</div></div>`:''}
 <div class="review-section modern"><h3>Review details</h3><div class="review-field compact"><label>Review date</label><input id="rvDate" type="date" value="${reviewDate}"></div><div class="review-field compact"><label>Next review date</label><input id="rvNextDate" type="date" value="${nextDate}"></div><div class="review-field compact"><label>Overall RAG</label><select id="rvRag"><option ${rag==='Green'?'selected':''}>Green</option><option ${rag==='Amber'?'selected':''}>Amber</option><option ${rag==='Red'?'selected':''}>Red</option></select></div></div>
 <div class="review-section modern"><h3>Previous actions</h3><div class="review-field"><label>Previous review</label><div>${prev?`${dateFmt(prev.reviewDate)} · ${esc(prev.rag||'Not rated')}`:'No previous review recorded.'}</div></div><div class="review-field"><label>Previous targets</label><textarea id="rvPreviousTargets">${esc(old?.previousTargetOutcome||snap?.previousTargets?.map(t=>`${t.text} — ${t.status}`).join('\n')||prev?.targets?.map(t=>t.text).join('\n')||'')}</textarea></div></div>
 <div class="review-section modern"><h3>Professional discussion</h3><div class="review-field"><label>Learner comments</label><textarea id="rvLearnerComments">${esc(old?.learnerComments||snap?.learnerReflection||'')}</textarea></div><div class="review-field"><label>Employer / representative comments</label><textarea id="rvEmployerComments">${esc(old?.employerComments||'')}</textarea></div><div class="review-field"><label>Vocational Coach summary</label><textarea id="rvTutorSummary">${esc(old?.tutorSummary||buildSuggestedReviewSummary(l,snap,att,metrics))}</textarea></div><div class="review-field"><label>Barriers and support</label><textarea id="rvBarriers">${esc(old?.barriers||'')}</textarea></div></div>
 <div class="review-section modern"><h3>Agreed action plan</h3>${targets.map((t,i)=>`<div class="review-target"><div class="review-target-num">${i+1}</div><input id="rvTarget${i}" value="${esc(t.text||'')}" placeholder="Target ${i+1}"><input id="rvTargetDate${i}" type="date" value="${esc(t.dueDate||autoDates[i])}"></div>`).join('')}</div>
 <div class="review-section modern"><h3>Agreement</h3><div class="review-field"><label>Employer involved</label><select id="rvEmployerInvolved"><option value="yes" ${old?.employerInvolved!=='no'?'selected':''}>Yes</option><option value="no" ${old?.employerInvolved==='no'?'selected':''}>No — reason recorded</option></select></div><div class="review-field"><label>Agreement notes</label><textarea id="rvAgreement">${esc(old?.agreement||'')}</textarea></div><div class="signature-grid"><div class="signature-card"><label>Learner signature</label><canvas id="sig-learner" class="signature-pad"></canvas><div class="signature-actions"><button type="button" data-clear-signature="learner">Clear</button></div></div><div class="signature-card"><label>Employer / representative signature</label><canvas id="sig-employer" class="signature-pad"></canvas><div class="signature-actions"><button type="button" data-clear-signature="employer">Clear</button></div></div><div class="signature-card"><label>Vocational Coach signature</label><canvas id="sig-coach" class="signature-pad"></canvas><div class="signature-actions"><button type="button" data-clear-signature="coach">Clear</button></div></div></div></div></div>`;
 polishReviewEditor();openM('reviewEditorModal');setTimeout(()=>initSignaturePads(old?.signatures||{}),50);
 $('rvDate').addEventListener('change',e=>{const d=e.target.value;if(!d)return;$('rvNextDate').value=addDaysIso(d,56);defaultTargetDates(d).forEach((v,i)=>{$(`rvTargetDate${i}`).value=v})})
}
function buildSuggestedReviewSummary(l,snap,att,m){let parts=[`${l.first} ${l.last}'s attendance is ${Math.min(100,att.percent)}%, with ${minText(att.actual)} attended against ${minText(att.expected)} expected.`];if(m.lateSessions)parts.push(`${m.lateSessions} late session${m.lateSessions===1?' has':'s have'} been recorded.`);if(m.absentSessions)parts.push(`${m.absentSessions} absent session${m.absentSessions===1?' has':'s have'} been recorded.`);if(snap?.progressPercent!=null)parts.push(`Apprentice+ reports ${snap.progressPercent}% progress.`);if(snap?.otjHours!=null)parts.push(`Off-the-job learning recorded is ${snap.otjHours} hours${snap.otjRequired!=null?` against ${snap.otjRequired} required`:''}.`);return parts.join(' ')}
function saveProfessionalReview(){
 const learnerId=$('rvLearnerId').value,l=reviewLearner(learnerId);if(!l)return;const reviewDate=$('rvDate').value,nextReviewDate=$('rvNextDate').value;if(!reviewDate||!nextReviewDate)return alert('Enter the review date and next review date.');
 const targets=Array.from({length:5},(_,i)=>({text:$(`rvTarget${i}`).value.trim(),dueDate:$(`rvTargetDate${i}`).value})).filter(t=>t.text);if(!targets.length)return alert('Add at least one agreed target.');
 const old=state.reviews.find(x=>x.id===editingReviewId);const obj={...(old||{}),id:editingReviewId||uid('review'),learnerId,learnerName:l.first+' '+l.last,reviewDate,nextReviewDate,rag:$('rvRag').value,snapshotTransferId:$('rvSnapshotId').value||null,previousTargetOutcome:$('rvPreviousTargets').value.trim(),learnerComments:$('rvLearnerComments').value.trim(),employerComments:$('rvEmployerComments').value.trim(),tutorSummary:$('rvTutorSummary').value.trim(),barriers:$('rvBarriers').value.trim(),targets,employerInvolved:$('rvEmployerInvolved').value,agreement:$('rvAgreement').value.trim(),signatures:{...(window._reviewSignatures||{})},savedAt:new Date().toISOString()};
 if(editingReviewId)state.reviews=state.reviews.map(x=>x.id===editingReviewId?obj:x);else state.reviews.push(obj);if(obj.snapshotTransferId){const ss=state.reviewSnapshots.find(x=>x.transferId===obj.snapshotTransferId);if(ss)ss.reviewId=obj.id}closeM('reviewEditorModal');save();shareReview(obj.id)
}
function deleteReview(id){if(!confirm('Delete this review record?'))return;const r=state.reviews.find(x=>x.id===id);if(r?.snapshotTransferId){const s=state.reviewSnapshots.find(x=>x.transferId===r.snapshotTransferId);if(s)delete s.reviewId}state.reviews=state.reviews.filter(x=>x.id!==id);save()}
function reviewReturnPayload(r){const l=reviewLearner(r.learnerId),att=attendanceStats(r.learnerId);return{format:'APREVIEW_PACKAGE',version:1,payload:{format:'ASSESSOR_PLUS_REVIEW_OUTCOME',version:1,direction:'AssessorPlusToApprenticePlus',reviewId:r.id,createdAt:new Date().toISOString(),course:state.reviewSnapshots.find(x=>x.transferId===r.snapshotTransferId)?.course||'',reviewDate:r.reviewDate,nextReviewDate:r.nextReviewDate,rag:r.rag,attendancePercent:Math.min(100,att.percent),tutorSummary:r.tutorSummary,learnerComments:r.learnerComments,employerComments:r.employerComments,targets:r.targets,barriers:r.barriers,agreement:r.agreement,progressSnapshot:state.reviewSnapshots.find(x=>x.transferId===r.snapshotTransferId)?.progressSnapshot||null,epaReadiness:state.reviewSnapshots.find(x=>x.transferId===r.snapshotTransferId)?.epaReadiness||null,newEvidenceCount:state.reviewSnapshots.find(x=>x.transferId===r.snapshotTransferId)?.newEvidenceCount??null,newKsbCount:state.reviewSnapshots.find(x=>x.transferId===r.snapshotTransferId)?.newKsbCount??null,signaturesPresent:{learner:!!r.signatures?.learner,employer:!!r.signatures?.employer,vocationalCoach:!!r.signatures?.coach},assessor:'Vocational Coach'}}}
function compactReviewQrPayload(r){
 const full=reviewReturnPayload(r).payload;
 return{f:'APR',v:1,d:'A2P',i:full.reviewId,c:full.createdAt,rd:full.reviewDate,nr:full.nextReviewDate,g:full.rag,a:full.attendancePercent,s:String(full.tutorSummary||'').slice(0,320),t:(full.targets||[]).slice(0,5).map(x=>[String(x.text||x.title||'').slice(0,140),String(x.dueDate||'')])};
}
function shareReview(id){const r=state.reviews.find(x=>x.id===id);if(!r)return;currentSharedReviewId=id;const box=$('reviewShareQr');box.innerHTML='';let compact=compactReviewQrPayload(r),text=JSON.stringify(compact);try{box.appendChild(window.ApprenticeQR.toCanvas(text,360));box.insertAdjacentHTML('beforeend','<p class="muted" style="margin-top:10px">The QR sends the review summary, targets and next review date. Download the .apreview file when the full detailed review is required.</p>')}catch(e){box.innerHTML='<p class="muted">The QR could not be generated. Download the .apreview file instead.</p>'}openM('reviewShareModal')}
function downloadCurrentReviewPack(){const r=state.reviews.find(x=>x.id===currentSharedReviewId);if(!r)return;downloadBlob(`${safeFile(r.learnerName)}_Review_${r.reviewDate}.apreview`,JSON.stringify(reviewReturnPayload(r)), 'application/octet-stream')}
function safeFile(s){return String(s||'Review').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')}
function downloadBlob(name,data,type){const blob=data instanceof Blob?data:new Blob([data],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function downloadCurrentReviewPdf(){const r=state.reviews.find(x=>x.id===currentSharedReviewId);if(r)printReview(r)}
function printReview(r){const l=reviewLearner(r.learnerId),a=attendanceStats(r.learnerId),m=learnerSessionMetrics(r.learnerId);const w=window.open('','_blank');if(!w)return alert('Allow pop-ups to create the PDF.');w.document.write(`<!doctype html><html><head><title>${esc(r.learnerName)} Review</title><style>body{font-family:Arial,sans-serif;color:#222;margin:32px;font-size:12px}h1{font-size:22px;margin:0 0 4px;color:#5b21b6}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:5px;margin-top:20px}.meta{color:#666}.stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #ccc;margin:16px 0}.stat{padding:10px;border-right:1px solid #ccc}.stat:last-child{border:0}.stat b{display:block;font-size:16px}.box{border:1px solid #ccc;padding:10px;white-space:pre-wrap}.targets{padding-left:20px}.targets li{margin:7px 0}.foot{margin-top:24px;color:#666;font-size:10px}@media print{button{display:none}}</style></head><body><h1>Professional Apprenticeship Review</h1><div class="meta">${esc(r.learnerName)} · ${dateFmt(r.reviewDate)} · Next review ${dateFmt(r.nextReviewDate)}</div><div class="stats"><div class="stat">Attendance<b>${Math.min(100,a.percent)}%</b></div><div class="stat">Expected<b>${minText(a.expected)}</b></div><div class="stat">Attended<b>${minText(a.actual)}</b></div><div class="stat">RAG<b>${esc(r.rag)}</b></div></div><h2>Tutor summary</h2><div class="box">${esc(r.tutorSummary)}</div><h2>Learner comments</h2><div class="box">${esc(r.learnerComments||'No comments recorded.')}</div><h2>Employer comments</h2><div class="box">${esc(r.employerComments||'No comments recorded.')}</div><h2>Attendance detail</h2><div class="box">Late sessions: ${m.lateSessions}\nLateness: ${minText(m.lateMinutes)}\nAbsent sessions: ${m.absentSessions}\nMissed time: ${minText(m.absentMinutes)}</div><h2>Agreed action plan</h2><ol class="targets">${r.targets.map(t=>`<li>${esc(t.text)}${t.dueDate?` — due ${dateFmt(t.dueDate)}`:''}</li>`).join('')}</ol><h2>Barriers and support</h2><div class="box">${esc(r.barriers||'No barriers recorded.')}</div><h2>Agreement</h2><div class="box">Employer involved: ${r.employerInvolved==='yes'?'Yes':'No'}\n${esc(r.agreement||'')}</div><h2>Signatures</h2><div class="stats"><div class="stat">Learner<b>${r.signatures?.learner?'Signed':'Not signed'}</b>${r.signatures?.learner?`<img src="${r.signatures.learner}" style="width:100%;height:55px;object-fit:contain;margin-top:5px">`:''}</div><div class="stat">Employer / representative<b>${r.signatures?.employer?'Signed':'Not signed'}</b>${r.signatures?.employer?`<img src="${r.signatures.employer}" style="width:100%;height:55px;object-fit:contain;margin-top:5px">`:''}</div><div class="stat">Vocational Coach<b>${r.signatures?.coach?'Signed':'Not signed'}</b>${r.signatures?.coach?`<img src="${r.signatures.coach}" style="width:100%;height:55px;object-fit:contain;margin-top:5px">`:''}</div></div><div class="foot">Generated by Assessor+ V5.1</div><script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);w.document.close()}
function handleReviewFile(file){const reader=new FileReader();reader.onload=()=>{try{$('reviewImportText').value=String(reader.result||'');parseReviewImportText()}catch(e){alert('Could not read the selected file.')}};reader.readAsText(file)}
let reviewQrDetector=null;
let reviewScanBusy=false;
async function ensureReviewQrDetector(){
 if(!('BarcodeDetector' in window))throw new Error('This browser does not include QR scanning support.');
 if(typeof BarcodeDetector.getSupportedFormats==='function'){
  const formats=await BarcodeDetector.getSupportedFormats();
  if(!formats.includes('qr_code'))throw new Error('QR scanning is not supported by this browser.');
 }
 if(!reviewQrDetector)reviewQrDetector=new BarcodeDetector({formats:['qr_code']});
 return reviewQrDetector;
}
function receiveScannedReviewText(text){
 if(!text)return;
 stopReviewQrScan();closeM('reviewScanModal');openM('reviewImportModal');
 $('reviewImportText').value=text;parseReviewImportText();
}
async function beginReviewQrCamera(){
 const status=$('reviewScanStatus'),retry=$('reviewScanRetry'),imageLabel=$('reviewScanImageLabel');
 stopReviewQrScan();
 retry.disabled=true;retry.textContent='Starting…';status.textContent='Requesting camera access…';
 if(!window.isSecureContext){status.textContent='Camera scanning requires the secure HTTPS version of Assessor+.';retry.disabled=false;retry.textContent='Try again';return}
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='This browser cannot open the camera. Use the review file instead.';retry.disabled=false;retry.textContent='Try again';return}
 try{
  const detector=await ensureReviewQrDetector();
  const attempts=[
   {video:{facingMode:{exact:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
   {video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
   {video:true,audio:false}
  ];
  let lastError=null;
  for(const constraints of attempts){try{reviewScanStream=await navigator.mediaDevices.getUserMedia(constraints);break}catch(e){lastError=e}}
  if(!reviewScanStream)throw lastError||new Error('Camera unavailable');
  const video=$('reviewScanVideo');video.srcObject=reviewScanStream;await video.play();
  status.textContent='Scanning… keep the QR code steady inside the frame.';retry.textContent='Restart camera';retry.disabled=false;imageLabel.style.display='inline-flex';
  reviewScanTimer=setInterval(async()=>{
   if(reviewScanBusy||!reviewScanStream||video.readyState<2)return;
   reviewScanBusy=true;
   try{const codes=await detector.detect(video);const value=codes?.find(c=>c.rawValue)?.rawValue;if(value)receiveScannedReviewText(value)}catch(e){}finally{reviewScanBusy=false}
  },300);
 }catch(e){
  const name=String(e?.name||'');
  status.textContent=name==='NotAllowedError'?'Camera permission was blocked. Allow camera access in the browser, then press Start camera.':(e?.message||'The camera could not be started. Use the review file instead.');
  retry.disabled=false;retry.textContent='Start camera';imageLabel.style.display=('BarcodeDetector' in window)?'inline-flex':'none';
 }
}
async function startReviewQrScan(){
 stopReviewQrScan();closeM('reviewImportModal');openM('reviewScanModal');
 $('reviewScanStatus').textContent='Starting camera…';
 setTimeout(beginReviewQrCamera,80);
}
function stopReviewQrScan(){
 if(reviewScanTimer){clearInterval(reviewScanTimer);reviewScanTimer=null}
 reviewScanBusy=false;
 if(reviewScanStream){reviewScanStream.getTracks().forEach(t=>t.stop());reviewScanStream=null}
 const v=$('reviewScanVideo');if(v){v.pause?.();v.srcObject=null}
}
async function scanReviewQrImage(file){
 const status=$('reviewScanStatus');if(!file)return;
 try{const detector=await ensureReviewQrDetector();status.textContent='Reading QR image…';const bitmap=await createImageBitmap(file);const codes=await detector.detect(bitmap);bitmap.close?.();const value=codes?.find(c=>c.rawValue)?.rawValue;if(!value)throw new Error('No QR code was found in that image.');receiveScannedReviewText(value)}catch(e){status.textContent=e?.message||'The QR image could not be read.'}
}
$('reviewScanRetry')?.addEventListener('click',beginReviewQrCamera);
$('reviewScanImage')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)scanReviewQrImage(f);e.target.value=''});
$('reviewImportFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)handleReviewFile(f)});


function bindInstantLearnerSearch(inputId, handler){
  const input=document.getElementById(inputId);
  if(!input)return;
  const run=()=>handler();
  input.addEventListener('input',run);
  input.addEventListener('search',run);
  input.addEventListener('keyup',run);
  input.addEventListener('change',run);
}

document.addEventListener('DOMContentLoaded',()=>{
  bindInstantLearnerSearch('learnerSearch',renderLearners);
  bindInstantLearnerSearch('classLearnerSearch',()=>renderClassLearnerChecks());
  bindInstantLearnerSearch('reviewAttachSearch',()=>filterLearnerSelect('reviewAttachSearch','reviewAttachLearner'));
  bindInstantLearnerSearch('reviewLearnerSearch',renderReviewLearnerPicker);
});

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-review-learner]');
  if(!b)return;
  closeM('reviewLearnerPickerModal');
  openReviewEditor(null,b.dataset.reviewLearner,null);
});

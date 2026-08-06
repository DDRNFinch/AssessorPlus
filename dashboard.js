function renderOverview(){let total=state.learners.reduce((s,l)=>s+completedMinutes(l),0);$('overviewCards').innerHTML=`<div class="card"><div class="muted">Learners</div><div class="stat">${state.learners.length}</div></div><div class="card"><div class="muted">Classes</div><div class="stat">${state.classes.length}</div></div><div class="card"><div class="muted">Register logs</div><div class="stat">${state.logs.length}</div></div><div class="card"><div class="muted">Completed learning</div><div class="stat">${minText(total)}</div></div>`}
document.addEventListener('change',event=>{const cb=event.target.closest('[data-learner-select]');if(cb)toggleLearnerSelection(cb.dataset.learnerSelect,cb.checked)});
document.addEventListener('click',event=>{const row=event.target.closest('[data-open-learner]');if(row){event.preventDefault();openProfile(row.dataset.openLearner)}});
document.addEventListener('click',event=>{const learnerBtn=event.target.closest('[data-delete-learner]');if(learnerBtn){event.preventDefault();event.stopPropagation();deleteLearner(learnerBtn.dataset.deleteLearner);}});


function criterionSummary(c){
 if(c.type==='number')return `${c.min??0} to ${c.max??0}${c.unit?' '+c.unit:''}${c.passMin!==''&&c.passMax!==''?` · pass ${c.passMin} to ${c.passMax}`:''}`;
 if(c.type==='passfail')return 'Met / Not met';
 return (c.options||[]).join(' · ');
}
function renderAssessments(){
 const content=$('assessmentContent'),actions=$('assessmentHeaderActions');if(!content||!actions)return;
 const records=[...state.assessmentRecords].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const passCount=records.filter(r=>String(r.overall||'').toLowerCase()==='pass'||String(r.overall||'').toLowerCase()==='competent').length;
 actions.innerHTML='<button class="btn primary" type="button" onclick="openAssessmentRecordModal()">New assessment</button>';
 const nav=`<div class="assessment-nav"><button class="${assessmentView==='home'?'active':''}" type="button" onclick="setAssessmentView('home')">Overview</button><button class="${assessmentView==='templates'?'active':''}" type="button" onclick="setAssessmentView('templates')">Templates</button><button class="${assessmentView==='records'?'active':''}" type="button" onclick="setAssessmentView('records')">Records</button></div>`;
 if(assessmentView==='home'){
  const recent=records.slice(0,5);
  content.innerHTML=`<div class="assessment-shell">${nav}<div class="assessment-summary"><div class="assessment-summary-item"><span>Templates</span><strong>${state.assessmentTemplates.length}</strong></div><div class="assessment-summary-item"><span>Assessment records</span><strong>${records.length}</strong></div><div class="assessment-summary-item"><span>Pass / competent</span><strong>${passCount}</strong></div></div><div class="assessment-section-head"><h2>Recent assessments</h2><span>${records.length?`Showing ${Math.min(5,records.length)} of ${records.length}`:'No records yet'}</span></div>${recent.length?`<div class="assessment-list">${recent.map(assessmentRecordRow).join('')}</div>`:'<div class="assessment-empty">No assessment records yet.</div>'}</div>`;return;
 }
 if(assessmentView==='templates'){
  content.innerHTML=`<div class="assessment-shell">${nav}<div class="assessment-section-head"><h2>Assessment templates</h2><button class="btn small primary" type="button" onclick="openTemplateModal()">Create template</button></div>${state.assessmentTemplates.length?`<div class="assessment-list">${state.assessmentTemplates.map(t=>`<div class="assessment-list-row"><div class="assessment-row-main"><div class="assessment-row-title">${esc(t.name)}</div><div class="assessment-row-meta">${esc(t.subject||'No subject')} · ${(t.criteria||[]).length} criteria${t.description?` · ${esc(t.description)}`:''}</div></div><div class="assessment-row-end"><span class="assessment-count">${(t.criteria||[]).length}</span><button class="btn small light" onclick="duplicateAssessmentTemplate('${t.id}')">Duplicate</button><button class="btn small light" onclick="openTemplateModal('${t.id}')">Edit</button><button class="btn small danger" onclick="deleteAssessmentTemplate('${t.id}')">Delete</button></div></div>`).join('')}</div>`:'<div class="assessment-empty">No assessment templates yet.</div>'}</div>`;return;
 }
 content.innerHTML=`<div class="assessment-shell">${nav}<div class="assessment-section-head"><h2>Assessment records</h2><span>${records.length} total</span></div>${records.length?`<div class="assessment-list">${records.map(assessmentRecordRow).join('')}</div>`:'<div class="assessment-empty">No assessment records yet.</div>'}</div>`;
}
function assessmentRecordRow(r){
 const resultClass=String(r.overall).toLowerCase()==='pass'||String(r.overall).toLowerCase()==='competent'?'pass':String(r.overall).toLowerCase()==='refer'?'refer':'';
 return `<div class="assessment-list-row"><div class="assessment-row-main"><div class="assessment-row-title">${esc(r.learnerName)}</div><div class="assessment-row-meta">${esc(r.templateName)} · ${dateFmt(r.date)} · <span class="assessment-result ${resultClass}">${esc(r.overall||'Recorded')}</span></div><details class="record-detail"><summary>Criteria</summary><div class="record-criteria">${(r.criteria||[]).map(c=>`<div class="record-criterion"><span>${esc(c.name)}</span><strong>${esc(c.displayValue)}</strong></div>`).join('')||'<span class="muted" style="padding:8px">No criteria saved.</span>'}</div>${r.notes?`<p class="muted" style="font-size:12px;margin:8px 0 0">${esc(r.notes)}</p>`:''}</details></div><div class="assessment-row-end"><button class="btn small light" onclick="openAssessmentRecordModal('${r.id}')">Edit</button><button class="btn small danger" onclick="deleteAssessmentRecord('${r.id}')">Delete</button></div></div>`;
}
function setAssessmentView(view){assessmentView=view;renderAssessments()}
function openTemplateModal(id=null){
 const t=state.assessmentTemplates.find(x=>x.id===id);editingTemplateId=t?.id||null;tempCriteria=JSON.parse(JSON.stringify(t?.criteria||[]));
 $('templateModalTitle').textContent=t?'Edit assessment template':'Create assessment template';$('templateName').value=t?.name||'';$('templateSubject').value=t?.subject||'';$('templateDescription').value=t?.description||'';renderTemplateCriteria();openM('templateModal');
}
function renderTemplateCriteria(){
 $('templateCriteria').innerHTML=tempCriteria.length?tempCriteria.map(c=>`<div class="criterion-row"><div class="criterion-name">${esc(c.name)}</div><div class="criterion-meta">${c.type==='number'?'Number range':c.type==='passfail'?'Pass / fail':'Rating scale'}</div><div class="criterion-meta">${esc(criterionSummary(c))}</div><div class="row-actions"><button class="btn small light" type="button" onclick="openCriterionModal('${c.id}')">Edit</button><button class="btn small danger" type="button" onclick="removeCriterion('${c.id}')">Remove</button></div></div>`).join(''):'<div class="empty" style="padding:20px">Add the first marking criterion.</div>';
}
function openCriterionModal(id=null){
 const c=tempCriteria.find(x=>x.id===id);editingCriterionId=c?.id||null;$('criterionModalTitle').textContent=c?'Edit criterion':'Add criterion';$('criterionName').value=c?.name||'';$('criterionType').value=c?.type||'number';$('criterionRequired').checked=c?.required!==false;$('criterionModal').dataset.value=JSON.stringify(c||{});renderCriterionOptions();openM('criterionModal');
}
function renderCriterionOptions(){
 let type=$('criterionType').value,c={};try{c=JSON.parse($('criterionModal').dataset.value||'{}')}catch{}
 if(type==='number')$('criterionOptions').innerHTML=`<div class="form-grid" style="margin-top:12px"><div class="field"><label>Minimum value</label><input id="criterionMin" type="number" step="any" value="${esc(c.min??-5)}"></div><div class="field"><label>Maximum value</label><input id="criterionMax" type="number" step="any" value="${esc(c.max??5)}"></div><div class="field"><label>Unit</label><input id="criterionUnit" value="${esc(c.unit||'mm')}"></div><div class="field"></div><div class="field"><label>Pass minimum</label><input id="criterionPassMin" type="number" step="any" value="${esc(c.passMin??c.min??-5)}"></div><div class="field"><label>Pass maximum</label><input id="criterionPassMax" type="number" step="any" value="${esc(c.passMax??c.max??5)}"></div></div>`;
 else if(type==='scale')$('criterionOptions').innerHTML=`<div class="field" style="margin-top:12px"><label>Scale values (one per line)</label><textarea id="criterionScale" rows="5" style="width:100%;border:1px solid #bdcbcd;border-radius:8px;padding:10px">${esc((c.options||['Not ready','Developing','Competent']).join('\n'))}</textarea></div><div class="field" style="margin-top:10px"><label>Values counted as met (comma separated)</label><input id="criterionPassValues" value="${esc((c.passValues||['Competent']).join(', '))}"></div>`;
 else $('criterionOptions').innerHTML='';
}
function saveCriterion(){
 const name=$('criterionName').value.trim(),type=$('criterionType').value;if(!name)return alert('Enter a criterion name.');
 let c={id:editingCriterionId||uid('criterion'),name,type,required:$('criterionRequired').checked};
 if(type==='number'){c.min=Number($('criterionMin').value);c.max=Number($('criterionMax').value);c.unit=$('criterionUnit').value.trim();c.passMin=Number($('criterionPassMin').value);c.passMax=Number($('criterionPassMax').value);if(c.max<c.min)return alert('Maximum must be greater than minimum.');}
 if(type==='scale'){c.options=$('criterionScale').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);c.passValues=$('criterionPassValues').value.split(',').map(x=>x.trim()).filter(Boolean);if(c.options.length<2)return alert('Add at least two scale values.');}
 if(type==='passfail'){c.options=['Not met','Met'];c.passValues=['Met'];}
 const i=tempCriteria.findIndex(x=>x.id===c.id);if(i>=0)tempCriteria[i]=c;else tempCriteria.push(c);closeM('criterionModal');renderTemplateCriteria();
}
function removeCriterion(id){tempCriteria=tempCriteria.filter(c=>c.id!==id);renderTemplateCriteria()}
function saveAssessmentTemplate(){
 const name=$('templateName').value.trim();if(!name)return alert('Enter a template name.');if(!tempCriteria.length)return alert('Add at least one criterion.');
 const t={id:editingTemplateId||uid('template'),name,subject:$('templateSubject').value.trim(),description:$('templateDescription').value.trim(),criteria:JSON.parse(JSON.stringify(tempCriteria)),updatedAt:new Date().toISOString()};const i=state.assessmentTemplates.findIndex(x=>x.id===t.id);if(i>=0)state.assessmentTemplates[i]=t;else state.assessmentTemplates.push(t);closeM('templateModal');assessmentView='templates';save();renderAssessments();
}
function duplicateAssessmentTemplate(id){const t=state.assessmentTemplates.find(x=>x.id===id);if(!t)return;state.assessmentTemplates.push({...JSON.parse(JSON.stringify(t)),id:uid('template'),name:t.name+' copy',criteria:t.criteria.map(c=>({...c,id:uid('criterion')}))});save();renderAssessments()}
function deleteAssessmentTemplate(id){if(!confirm('Delete this assessment template? Existing assessment records will remain.'))return;state.assessmentTemplates=state.assessmentTemplates.filter(t=>t.id!==id);save();renderAssessments()}
function openAssessmentRecordModal(id=null){
 if(!state.assessmentTemplates.length)return alert('Create an assessment template first.');if(!state.learners.length)return alert('Add a learner first.');
 const r=state.assessmentRecords.find(x=>x.id===id);editingAssessmentId=r?.id||null;$('assessmentRecordTitle').textContent=r?'Edit assessment record':'Create assessment record';
 $('recordTemplate').innerHTML=state.assessmentTemplates.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');$('recordLearner').innerHTML=sortedLearners().map(l=>`<option value="${l.id}">${esc((l.first||'')+' '+(l.last||'')||l.name||'Learner')}</option>`).join('');
 $('recordTemplate').value=r?.templateId||state.assessmentTemplates[0].id;$('recordLearner').value=r?.learnerId||activeLearners()[0]?.id||'';$('recordDate').value=r?.date||dateISO();$('recordOverall').value=r?.overall||'';$('recordNotes').value=r?.notes||'';$('assessmentRecordModal').dataset.values=JSON.stringify(r?.values||{});renderRecordCriteria();openM('assessmentRecordModal');
}
function renderRecordCriteria(){
 const t=state.assessmentTemplates.find(x=>x.id===$('recordTemplate').value);let values={};try{values=JSON.parse($('assessmentRecordModal').dataset.values||'{}')}catch{}
 $('recordCriteria').innerHTML=t?(t.criteria||[]).map(c=>{let control='';const val=values[c.id]??'';if(c.type==='number')control=`<div><input data-assessment-value="${c.id}" type="number" step="any" min="${c.min}" max="${c.max}" value="${esc(val)}"><div class="row-meta">${esc(c.min)} to ${esc(c.max)}${c.unit?' '+esc(c.unit):''}</div></div>`;else control=`<select data-assessment-value="${c.id}"><option value="">Select</option>${(c.options||[]).map(o=>`<option ${String(val)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;return`<div class="assessment-field-row"><label><strong>${esc(c.name)}</strong><span class="row-meta">${c.required===false?'Informational':'Required'}</span></label>${control}</div>`}).join(''):'<div class="empty">Select a template.</div>';
}
function criterionMet(c,value){if(c.required===false)return true;if(value===''||value===null||value===undefined)return false;if(c.type==='number'){const n=Number(value);return Number.isFinite(n)&&n>=Number(c.passMin)&&n<=Number(c.passMax)}return (c.passValues||[]).includes(String(value))}
function saveAssessmentRecord(){
 const t=state.assessmentTemplates.find(x=>x.id===$('recordTemplate').value),l=state.learners.find(x=>x.id===$('recordLearner').value);if(!t||!l)return;
 const values={};document.querySelectorAll('#recordCriteria [data-assessment-value]').forEach(el=>values[el.dataset.assessmentValue]=el.value);
 if((t.criteria||[]).some(c=>values[c.id]===''))return alert('Complete every criterion before saving.');
 const criteria=t.criteria.map(c=>({id:c.id,name:c.name,value:values[c.id],displayValue:c.type==='number'?`${values[c.id]}${c.unit?' '+c.unit:''}`:String(values[c.id]),met:criterionMet(c,values[c.id])}));
 const suggested=t.criteria.filter(c=>c.required!==false).every(c=>criterionMet(c,values[c.id]))?'Pass':'Refer';const overall=$('recordOverall').value.trim()||suggested;
 const learnerName=((l.first||'')+' '+(l.last||'')).trim()||l.name||'Learner';const r={id:editingAssessmentId||uid('assessment'),templateId:t.id,templateName:t.name,learnerId:l.id,learnerName,date:$('recordDate').value,values,criteria,overall,notes:$('recordNotes').value.trim(),updatedAt:new Date().toISOString()};const i=state.assessmentRecords.findIndex(x=>x.id===r.id);if(i>=0)state.assessmentRecords[i]=r;else state.assessmentRecords.unshift(r);closeM('assessmentRecordModal');assessmentView='records';save();renderAssessments();
}
function deleteAssessmentRecord(id){if(!confirm('Delete this assessment record?'))return;state.assessmentRecords=state.assessmentRecords.filter(r=>r.id!==id);save();renderAssessments()}

function renderAll(){renderOverview();renderLearners();renderScheduledRegisters();renderClasses();renderLive();renderLogs();renderAssessments()}
window.addEventListener('click',e=>{if(e.target.classList.contains('modal-wrap'))e.target.classList.remove('open')});['ls','le','ldh'].forEach(id=>$(id).addEventListener('change',()=>{if($('learnerModal').classList.contains('open')){updateWeeklyExpectedSummary();renderHolidaySummary()}}));document.querySelectorAll('#attendanceDays input').forEach(x=>x.addEventListener('change',updateWeeklyExpectedSummary));
setInterval(()=>{$('topClock').textContent=nowTime();processClock()},1000);$('topClock').textContent=nowTime();recoverOverdueRegister();renderAll();

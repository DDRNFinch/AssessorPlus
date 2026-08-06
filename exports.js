function logAttendancePercent(log,r){if(r.holiday)return 'Holiday';if(!log.plannedMinutes)return '0%';return `${Math.min(100,Math.round(r.creditedMinutes/log.plannedMinutes*1000)/10)}%`}
function deleteRegisterById(id){
  const targetId=String(id||'');
  const before=state.logs.length;
  state.logs=state.logs.filter(log=>String(log.id)!==targetId);
  if(state.logs.length===before){
    alert('Register log not found.');
    return;
  }
  localStorage.setItem(KEY,JSON.stringify(state));
  renderAll();
}
function setLogTab(tab){
  currentLogTab=['unsent','all','missed'].includes(tab)?tab:'unsent';
  selectedLogIds.clear();
  renderLogs();
}
function visibleLogs(){const unsent=state.logs.filter(log=>!log.sentAt);return currentLogTab==='all'?state.logs:unsent}
function selectedLogs(){return state.logs.filter(log=>selectedLogIds.has(String(log.id)))}
function updateLogSelectionUi(){
 const count=selectedLogIds.size;
 if($('selectedLogSummary'))$('selectedLogSummary').textContent=`${count} register${count===1?'':'s'} selected`;
 if($('exportSelectedBtn'))$('exportSelectedBtn').disabled=!count;
 document.querySelectorAll('[data-log-select]').forEach(cb=>cb.checked=selectedLogIds.has(String(cb.dataset.logSelect)));
}
function toggleLogSelection(id,checked){id=String(id);if(checked)selectedLogIds.add(id);else selectedLogIds.delete(id);updateLogSelectionUi()}
function selectVisibleLogs(){const logs=visibleLogs();const allSelected=logs.length&&logs.every(log=>selectedLogIds.has(String(log.id)));logs.forEach(log=>allSelected?selectedLogIds.delete(String(log.id)):selectedLogIds.add(String(log.id)));updateLogSelectionUi()}
function registerPackPayload(logs){
  return {
    format:'AssessorPlus Register Pack',version:2,exportedAt:new Date().toISOString(),registerCount:logs.length,
    registers:logs.map(log=>({id:log.id,classId:log.classId||null,className:log.className,date:log.date,periods:log.periods,plannedMinutes:log.plannedMinutes,completedAt:log.completedAt,autoCompleted:!!log.autoCompleted,editedAt:log.editedAt||null,learners:(log.results||[]).map(r=>({learnerId:r.learnerId,learnerName:learnerName(r.learnerId),holiday:!!r.holiday,creditedMinutes:r.creditedMinutes,netMinutes:r.netMinutes,attendedSessions:r.attendedSessions,totalSessions:r.totalSessions,details:r.details||[]}))})),
    attendanceCredits:state.creditUses.filter(x=>logs.some(log=>(log.results||[]).some(r=>r.learnerId===x.learnerId)))
  };
}
function safePackDate(d){return String(d||'').replace(/[^0-9-]/g,'')}
function csvCell(value){let s=String(value??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function registerLogsCsv(logs){
 let rows=[['Date','Register','Learner','Status','Expected time','Attended time','Attendance','Late sessions','Total lateness','Absent sessions','Missed time','Minute bank change','Credits used','Available bank','Completed','Previously sent']];
 for(let log of logs){for(let r of (log.results||[])){let m=resultSessionMetrics(log,r);rows.push([dateFmt(log.date),log.className,learnerName(r.learnerId),r.holiday?'On holiday':'Recorded',minText(log.plannedMinutes||0),r.holiday?'—':minText(r.creditedMinutes||0),r.holiday?'—':logAttendancePercent(log,r),r.holiday?'—':m.lateSessions,r.holiday?'—':minText(m.lateMinutes),r.holiday?'—':m.absentSessions,r.holiday?'—':minText(m.absentMinutes),r.holiday?'—':bankText(resultArrivalBankMinutes(log,r)),minText(creditsUsedMinutes(r.learnerId)),bankText(learnerBankMinutes(r.learnerId,false)),log.autoCompleted?'Automatic':'Manual',log.sentAt?new Date(log.sentAt).toLocaleDateString('en-GB'):'No'])}}
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
}
function registerLogsPdf(logs){
 let sections=[{text:`Generated: ${new Date().toLocaleString('en-GB')}`,size:9},{text:`Registers included: ${logs.length}`,size:10},{gap:8}];
 for(let log of logs){sections.push({text:`${dateFmt(log.date)} - ${log.className}`,size:13,bold:true},{text:`Planned teaching: ${minText(log.plannedMinutes||0)} | ${log.autoCompleted?'Automatically':'Manually'} completed`});for(let r of (log.results||[])){let m=resultSessionMetrics(log,r);sections.push({text:`${learnerName(r.learnerId)}: ${r.holiday?'On holiday':`${minText(r.creditedMinutes||0)} attended, ${logAttendancePercent(log,r)}, ${m.lateSessions} late session(s), ${minText(m.lateMinutes)} late, ${m.absentSessions} absent session(s)`}`})}sections.push({gap:8})}
 return buildTextPdf('Assessor+ Register Report',sections)
}
function downloadBlob(blob,filename){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportBaseName(logs){let dates=logs.map(x=>x.date).filter(Boolean).sort(),first=safePackDate(dates[0]||dateISO()),last=safePackDate(dates[dates.length-1]||first);return `AssessorPlus-Registers-${first}-to-${last}`}
function markLogsSent(logs){let sentAt=new Date().toISOString();logs.forEach(log=>{log.sentAt=sentAt;log.sendCount=(Number(log.sendCount)||0)+1});localStorage.setItem(KEY,JSON.stringify(state));selectedLogIds.clear();renderLogs();renderAll()}
function openRegisterExport(){let logs=selectedLogs();if(!logs.length){alert('Select at least one register.');return}$('registerExportSummary').textContent=`${logs.length} completed register${logs.length===1?'':'s'} selected. Choose the format to download or share.`;openM('registerExportModal')}
function crc32(bytes){let table=crc32.table||(crc32.table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0}));let c=0xffffffff;for(let b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function u16(n){return [n&255,(n>>>8)&255]} function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
async function makeZip(files){let enc=new TextEncoder(),parts=[],central=[],offset=0;for(let f of files){let name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:new Uint8Array(await f.data.arrayBuffer()),crc=crc32(data),local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);parts.push(local,data);central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]));offset+=local.length+data.length}let centralSize=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)]);return new Blob([...parts,...central,end],{type:'application/zip'})}
async function exportSelectedLogs(format){
 const logs=selectedLogs();if(!logs.length)return;const base=exportBaseName(logs);closeM('registerExportModal');
 if(format==='csv')downloadBlob(new Blob([registerLogsCsv(logs)],{type:'text/csv;charset=utf-8'}),base+'.csv');
 if(format==='pdf')downloadBlob(registerLogsPdf(logs),base+'.pdf');
 if(format==='apreg'){
   const blob=new Blob([JSON.stringify(registerPackPayload(logs),null,2)],{type:'application/json'}),filename=base+'.apreg';let shared=false;
   try{const file=new File([blob],filename,{type:'application/json'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Assessor+ Register Pack',text:`${logs.length} completed register${logs.length===1?'':'s'}`,files:[file]});shared=true}}catch(err){if(err&&err.name==='AbortError')return}
   if(!shared)downloadBlob(blob,filename)
 }
 if(format==='zip'){
   const pdf=registerLogsPdf(logs),csv=new Blob([registerLogsCsv(logs)],{type:'text/csv;charset=utf-8'}),apreg=new Blob([JSON.stringify(registerPackPayload(logs),null,2)],{type:'application/json'});
   const zip=await makeZip([{name:base+'.pdf',data:pdf},{name:base+'.csv',data:csv},{name:base+'.apreg',data:apreg}]);downloadBlob(zip,base+'.zip')
 }
 markLogsSent(logs)
}

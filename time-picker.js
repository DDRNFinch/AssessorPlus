(function(){
  let activeInput=null, hour=9, minute=0;
  const overlay=()=>document.getElementById('apTimePicker');
  const pad=n=>String(n).padStart(2,'0');
  function paint(){
    document.getElementById('apTimeHour').textContent=pad(hour);
    document.getElementById('apTimeMinute').textContent=pad(minute);
  }
  function prepare(root=document){
    root.querySelectorAll('input[type="time"]:not([data-ap-time-ready])').forEach(input=>{
      const value=input.value;
      input.type='text';
      input.value=value;
      input.readOnly=true;
      input.inputMode='none';
      input.classList.add('ap-time-field');
      input.dataset.apTimeReady='1';
      input.setAttribute('aria-label',input.getAttribute('aria-label')||'Open time selector');
    });
  }
  function openPicker(input){
    if(input.disabled)return;
    activeInput=input;
    const parts=(input.value||'09:00').split(':').map(Number);
    hour=Number.isFinite(parts[0])?Math.max(0,Math.min(23,parts[0])):9;
    minute=Number.isFinite(parts[1])?Math.max(0,Math.min(59,parts[1])):0;
    paint();
    overlay().classList.add('open');
    overlay().setAttribute('aria-hidden','false');
  }
  function closePicker(){overlay().classList.remove('open');overlay().setAttribute('aria-hidden','true');activeInput=null}
  document.addEventListener('click',e=>{
    const input=e.target.closest('input.ap-time-field');
    if(input){e.preventDefault();openPicker(input);return}
    const action=e.target.closest('[data-time-action]')?.dataset.timeAction;
    if(!action)return;
    if(action==='hour-up')hour=(hour+1)%24;
    if(action==='hour-down')hour=(hour+23)%24;
    if(action==='minute-up')minute=(minute+5)%60;
    if(action==='minute-down')minute=(minute+55)%60;
    if(action==='cancel'){closePicker();return}
    if(action==='confirm'&&activeInput){
      activeInput.value=`${pad(hour)}:${pad(minute)}`;
      activeInput.dispatchEvent(new Event('input',{bubbles:true}));
      activeInput.dispatchEvent(new Event('change',{bubbles:true}));
      closePicker();return;
    }
    paint();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay().classList.contains('open'))closePicker()});
  document.addEventListener('focusin',e=>{if(e.target.matches('input.ap-time-field')){e.target.blur();openPicker(e.target)}});
  overlay().addEventListener('click',e=>{if(e.target===overlay())closePicker()});
  prepare();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)prepare(n)}))).observe(document.body,{childList:true,subtree:true});
})();

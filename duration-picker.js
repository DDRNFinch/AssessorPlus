(function(){
  let activeInput=null, hours=0, minutes=30;
  const overlay=()=>document.getElementById('apDurationPicker');
  const pad=n=>String(n).padStart(2,'0');
  function paint(){
    document.getElementById('apDurationHour').textContent=pad(hours);
    document.getElementById('apDurationMinute').textContent=pad(minutes);
  }
  function openPicker(input){
    activeInput=input;
    const total=Math.max(0,Number(input.dataset.durationMinutes)||0);
    hours=Math.floor(total/60);
    minutes=total%60;
    paint();
    overlay().classList.add('open');
    overlay().setAttribute('aria-hidden','false');
  }
  function closePicker(){
    overlay().classList.remove('open');
    overlay().setAttribute('aria-hidden','true');
    activeInput=null;
  }
  function apply(){
    if(!activeInput)return;
    const total=(hours*60)+minutes;
    activeInput.dataset.durationMinutes=String(total);
    activeInput.value=typeof minText==='function'?minText(total):`${hours}h ${minutes}m`;
    const id=activeInput.dataset.sessionId;
    if(id&&typeof updateSession==='function')updateSession(id,'breakMinutes',total);
    closePicker();
  }
  document.addEventListener('click',e=>{
    const input=e.target.closest('input.ap-duration-field');
    if(input){e.preventDefault();openPicker(input);return}
    const action=e.target.closest('[data-duration-action]')?.dataset.durationAction;
    if(!action)return;
    if(action==='hour-up')hours=Math.min(23,hours+1);
    if(action==='hour-down')hours=Math.max(0,hours-1);
    if(action==='minute-up')minutes=(minutes+5)%60;
    if(action==='minute-down')minutes=(minutes+55)%60;
    if(action==='cancel'){closePicker();return}
    if(action==='confirm'){apply();return}
    paint();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay().classList.contains('open'))closePicker()});
  overlay().addEventListener('click',e=>{if(e.target===overlay())closePicker()});
})();

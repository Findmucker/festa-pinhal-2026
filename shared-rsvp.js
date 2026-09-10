const SUPABASE_URL='https://pgfqpuwpvmcqotgqxqzw.supabase.co';
const SUPABASE_KEY='sb_publishable_u1rSLt8XiJZREUAlm_pBgw_cRuhgi_L';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let sharedData=[];
const $s=id=>document.getElementById(id);
const escS=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtS=(n,u)=>`${Number(Number(n).toFixed(2))} ${u}`;

async function loadShared(){
  const {data,error}=await sb.from('rsvps').select('id,owner_name,status,attendee_names,beer_liters,meat_kg,other_items,created_at').order('created_at',{ascending:true});
  if(error){console.error(error);return;}
  sharedData=data||[]; renderShared();
}
function renderSupplyS(kind,promised,required,unit){
  const pct=required?promised/required*100:0;
  const bar=$s(`${kind}-bar`), nums=$s(`${kind}-numbers`), delta=$s(`${kind}-delta`);
  if(!bar||!nums||!delta)return;
  bar.style.width=Math.min(100,pct)+'%';
  nums.innerHTML=`Vai ser trazido: <strong>${fmtS(promised,unit)}</strong><br>Necessário: <strong>${fmtS(required,unit)}</strong> · ${required?Math.round(pct):0}%`;
  const diff=promised-required;
  if(!required){delta.textContent='Ainda não há participantes confirmados.';delta.className='delta';}
  else if(diff<0){delta.textContent=`Falta ${fmtS(-diff,unit)}`;delta.className='delta missing';}
  else if(diff>0){delta.textContent=`Sobra ${fmtS(diff,unit)}`;delta.className='delta ok';}
  else{delta.textContent='Quantidade certa ✓';delta.className='delta ok';}
}
function renderShared(){
  const yes=sharedData.filter(x=>x.status==='yes');
  const allNames=yes.flatMap(x=>x.attendee_names||[]);
  if($s('participant-count'))$s('participant-count').textContent=`${allNames.length} pessoa${allNames.length===1?'':'s'} confirmada${allNames.length===1?'':'s'}`;
  if($s('participants-list'))$s('participants-list').innerHTML=yes.length?yes.map(x=>`<div class="participant"><div class="names">${(x.attendee_names||[]).map(escS).join(', ')}</div><div class="bringline">Leva: ${Number(x.beer_liters)?fmtS(Number(x.beer_liters),'L cerveja'):''}${Number(x.beer_liters)&&Number(x.meat_kg)?' · ':''}${Number(x.meat_kg)?fmtS(Number(x.meat_kg),'kg carne'):''}${(Number(x.beer_liters)||Number(x.meat_kg))&&x.other_items?' · ':''}${x.other_items?escS(x.other_items):(!Number(x.beer_liters)&&!Number(x.meat_kg)?'nada indicado':'')}</div></div>`).join(''):'<div class="empty">Ainda ninguém confirmou.</div>';
  const beer=yes.reduce((a,x)=>a+Number(x.beer_liters||0),0), meat=yes.reduce((a,x)=>a+Number(x.meat_kg||0),0);
  renderSupplyS('beer',beer,allNames.length*2,'L'); renderSupplyS('meat',meat,allNames.length*.3,'kg');
  const others=yes.filter(x=>x.other_items).map(x=>x.other_items);
  if($s('other-items'))$s('other-items').innerHTML=others.length?others.map(x=>`<span class="tag">${escS(x)}</span>`).join(''):'<span class="empty">Nada indicado ainda.</span>';
}

function installSharedForm(){
  const saveBtn=$s('confirm-rsvp'); if(!saveBtn)return;
  const fresh=saveBtn.cloneNode(true); saveBtn.replaceWith(fresh);
  fresh.addEventListener('click',async()=>{
    const owner=($s('name')?.value||'').trim(); if(!owner){alert('Mete o teu nome.');return;}
    const active=document.querySelector('#choice button.active'); const status=active?.dataset.answer||'yes';
    const extra=[...document.querySelectorAll('.attendee-name')].map(i=>i.value.trim()).filter(Boolean);
    const names=status==='yes'?[owner,...extra]:[owner];
    fresh.disabled=true; fresh.textContent='A guardar…';
    const payload={owner_name:owner,status,attendee_names:names,beer_liters:status==='yes'?Number($s('beer')?.value||0):0,meat_kg:status==='yes'?Number($s('meat')?.value||0):0,other_items:status==='yes'?($s('other')?.value||'').trim():''};
    const {error}=await sb.from('rsvps').insert(payload);
    fresh.disabled=false; fresh.textContent='Guardar confirmação';
    if(error){console.error(error);alert('Não consegui guardar. Tenta novamente.');return;}
    if($s('beer'))$s('beer').value='0'; if($s('meat'))$s('meat').value='0'; if($s('other'))$s('other').value=''; if($s('attendees'))$s('attendees').innerHTML='';
    alert(status==='yes'?'Presença confirmada! 🍻':'Ficou registado que não vais.'); await loadShared();
  });
  const note=document.querySelector('.sync-note'); if(note)note.textContent='As confirmações são partilhadas: todos os convidados veem a mesma lista e as contas atualizadas.';
}

installSharedForm();
loadShared();
sb.channel('batatada-rsvps').on('postgres_changes',{event:'*',schema:'public',table:'rsvps'},()=>loadShared()).subscribe();
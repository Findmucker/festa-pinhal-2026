const SUPABASE_URL='https://pgfqpuwpvmcqotgqxqzw.supabase.co';
const SUPABASE_KEY='sb_publishable_u1rSLt8XiJZREUAlm_pBgw_cRuhgi_L';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let sharedData=[];
const $s=id=>document.getElementById(id);
const escS=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtS=(n,u)=>`${Number(Number(n).toFixed(2))} ${u}`;

function installOtherDrinksUI(){
  if($s('other-drinks-wrap')) return;
  const beer=$s('beer');
  if(!beer) return;
  const beerField=beer.closest('.field');
  const wrap=document.createElement('div');
  wrap.className='field';
  wrap.id='other-drinks-wrap';
  wrap.innerHTML=`
    <label>Outras bebidas <span style="font-weight:500">(à unidade)</span></label>
    <div id="other-drinks-list"></div>
    <button class="mini-btn" type="button" id="add-drink">+ Adicionar bebida</button>
    <div class="tiny" style="margin-top:4px">Ex.: 2 garrafas de vinho, 1 garrafa de gin, 4 refrigerantes.</div>`;
  beerField.insertAdjacentElement('afterend',wrap);
  $s('add-drink').onclick=()=>addDrinkRow();
}

function addDrinkRow(name='',qty=1){
  const list=$s('other-drinks-list'); if(!list)return;
  const row=document.createElement('div');
  row.className='attendee-row drink-row';
  row.style.marginBottom='8px';
  row.innerHTML=`<div style="display:grid;grid-template-columns:1fr 90px;gap:8px"><input class="drink-name" placeholder="Bebida (ex.: vinho)" value="${escS(name)}"><input class="drink-qty" type="number" min="1" step="1" value="${Math.max(1,Number(qty)||1)}" aria-label="Unidades"></div><button class="mini-btn" type="button" aria-label="Remover bebida">✕</button>`;
  row.querySelector('button').onclick=()=>row.remove();
  list.appendChild(row);
}

function getOtherDrinks(){
  return [...document.querySelectorAll('.drink-row')].map(row=>({
    name:(row.querySelector('.drink-name')?.value||'').trim(),
    qty:Math.max(1,Math.floor(Number(row.querySelector('.drink-qty')?.value||1)))
  })).filter(x=>x.name);
}

async function loadShared(){
  const {data,error}=await sb.from('rsvps').select('id,owner_name,status,attendee_names,beer_liters,meat_kg,other_items,other_drinks,created_at').order('created_at',{ascending:true});
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
function drinksText(drinks){
  const arr=Array.isArray(drinks)?drinks:[];
  return arr.map(d=>`${Number(d.qty)||0} un. ${escS(d.name)}`).join(' · ');
}
function renderOtherDrinks(yes,allNames){
  const totals=new Map();
  yes.forEach(x=>(Array.isArray(x.other_drinks)?x.other_drinks:[]).forEach(d=>{
    const name=String(d.name||'').trim(); if(!name)return;
    const key=name.toLocaleLowerCase('pt-PT');
    const prev=totals.get(key)||{name,qty:0}; prev.qty+=Number(d.qty)||0; totals.set(key,prev);
  }));
  let box=$s('other-drinks-summary');
  if(!box && $s('other-items')){
    box=document.createElement('div'); box.id='other-drinks-summary'; box.className='supply';
    $s('other-items').parentElement.insertBefore(box,$s('other-items').parentElement.firstChild);
  }
  if(box){
    const items=[...totals.values()];
    const totalUnits=items.reduce((a,d)=>a+Number(d.qty||0),0);
    const needed=allNames.length;
    const diff=totalUnits-needed;
    const estimate=needed===0?'Ainda não há participantes confirmados.':diff<0?`Faltam ${-diff} garrafa${-diff===1?'':'s'}`:diff>0?`Sobram ${diff} garrafa${diff===1?'':'s'}`:'Quantidade certa ✓';
    box.innerHTML=`<div class="supply-title">🍷 Outras bebidas</div><div class="tiny" style="margin:4px 0 8px">Estimativa: 1 unidade/garrafa por pessoa confirmada. Necessário: <strong>${needed}</strong> · Vai ser trazido: <strong>${totalUnits}</strong> · <strong>${estimate}</strong></div>${items.length?`<div class="other-items">${items.map(d=>`<span class="tag"><strong>${escS(d.name)}</strong> — ${d.qty} un.</span>`).join('')}</div>`:'<div class="empty">Ainda não há outras bebidas indicadas.</div>'}`;
  }
}
function renderShared(){
  const yes=sharedData.filter(x=>x.status==='yes');
  const allNames=yes.flatMap(x=>x.attendee_names||[]);
  if($s('participant-count'))$s('participant-count').textContent=`${allNames.length} pessoa${allNames.length===1?'':'s'} confirmada${allNames.length===1?'':'s'}`;
  if($s('participants-list'))$s('participants-list').innerHTML=yes.length?yes.map(x=>{
    const parts=[];
    if(Number(x.beer_liters))parts.push(fmtS(Number(x.beer_liters),'L cerveja'));
    if(Array.isArray(x.other_drinks)&&x.other_drinks.length)parts.push(drinksText(x.other_drinks));
    if(Number(x.meat_kg))parts.push(fmtS(Number(x.meat_kg),'kg carne'));
    if(x.other_items)parts.push(escS(x.other_items));
    return `<div class="participant"><div class="names">${(x.attendee_names||[]).map(escS).join(', ')}</div><div class="bringline">Leva: ${parts.length?parts.join(' · '):'nada indicado'}</div></div>`;
  }).join(''):'<div class="empty">Ainda ninguém confirmou.</div>';
  const beer=yes.reduce((a,x)=>a+Number(x.beer_liters||0),0), meat=yes.reduce((a,x)=>a+Number(x.meat_kg||0),0);
  renderSupplyS('beer',beer,allNames.length*2,'L'); renderSupplyS('meat',meat,allNames.length*.3,'kg');
  renderOtherDrinks(yes,allNames);
  const others=yes.filter(x=>x.other_items).map(x=>x.other_items);
  if($s('other-items'))$s('other-items').innerHTML=others.length?others.map(x=>`<span class="tag">${escS(x)}</span>`).join(''):'<span class="empty">Nada indicado ainda.</span>';
}

function installSharedForm(){
  installOtherDrinksUI();
  const saveBtn=$s('confirm-rsvp'); if(!saveBtn)return;
  const fresh=saveBtn.cloneNode(true); saveBtn.replaceWith(fresh);
  fresh.addEventListener('click',async()=>{
    const owner=($s('name')?.value||'').trim(); if(!owner){alert('Mete o teu nome.');return;}
    const active=document.querySelector('#choice button.active'); const status=active?.dataset.answer||'yes';
    const extra=[...document.querySelectorAll('.attendee-name')].map(i=>i.value.trim()).filter(Boolean);
    const names=status==='yes'?[owner,...extra]:[owner];
    fresh.disabled=true; fresh.textContent='A guardar…';
    const payload={owner_name:owner,status,attendee_names:names,beer_liters:status==='yes'?Number($s('beer')?.value||0):0,meat_kg:status==='yes'?Number($s('meat')?.value||0):0,other_items:status==='yes'?($s('other')?.value||'').trim():'',other_drinks:status==='yes'?getOtherDrinks():[]};
    const {error}=await sb.from('rsvps').insert(payload);
    fresh.disabled=false; fresh.textContent='Guardar confirmação';
    if(error){console.error(error);alert('Não consegui guardar. Tenta novamente.');return;}
    if($s('beer'))$s('beer').value='0'; if($s('meat'))$s('meat').value='0'; if($s('other'))$s('other').value=''; if($s('attendees'))$s('attendees').innerHTML=''; if($s('other-drinks-list'))$s('other-drinks-list').innerHTML='';
    alert(status==='yes'?'Presença confirmada! 🍻':'Ficou registado que não vais.'); await loadShared();
  });
  const note=document.querySelector('.sync-note'); if(note)note.textContent='As confirmações são partilhadas: todos os convidados veem a mesma lista e as contas atualizadas.';
}

installSharedForm();
loadShared();
sb.channel('batatada-rsvps').on('postgres_changes',{event:'*',schema:'public',table:'rsvps'},()=>loadShared()).subscribe();
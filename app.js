const KEY = 'home-budget-v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const oldDefaultNames = new Set([
  'تسويقة الأسبوع','سمك ولحمة','مستلزمات البيت','باقات شخصية','باقات العائلة',
  'كهرباء','علاج','ملابس','عناية شخصية','اكل سكن','مواصلات','اشتراكات',
  'خروجات','أقساط','مديونية','اخري'
]);
const def = () => ({
  cur: 'ج.م', sel: 'm1', dark: false,
  months: [{id:'m1', n:'شهر 1'}],
  rows: [],
  cells: {}
});
let S;
try {
  S = JSON.parse(localStorage.getItem(KEY)) || def();
  if (!S.months || !S.rows || !S.cells) S = def();
} catch { S = def(); }

// Remove only the template categories from the previous version; retain custom categories and entered amounts.
S.rows = S.rows.filter(r => !oldDefaultNames.has(r.n));
if (!S.months.length) S.months = [{id:'m' + uid(), n:'شهر 1'}];
if (!S.sel || !S.months.some(m => m.id === S.sel)) S.sel = S.months[0].id;
const store = () => localStorage.setItem(KEY, JSON.stringify(S));
const key = (r,m) => r + '|' + m;
const det = (r,m) => ((S.cells[key(r,m)] || {}).det || []);
const get = (r,m) => {
  const c = S.cells[key(r,m)];
  if (!c) return 0;
  return c.det && c.det.length ? c.det.reduce((a,x) => a + (+x.p || 0), 0) : (+c.v || 0);
};
const rowName = r => r === 'inc' ? 'الدخل' : (S.rows.find(x => x.id === r) || {}).n;
const monthName = m => (S.months.find(x => x.id === m) || {}).n;
const expenses = m => S.rows.reduce((a,r) => a + get(r.id,m), 0);

function render() {
  document.documentElement.dataset.t = S.dark ? 'dark' : '';
  $('theme').textContent = S.dark ? 'الوضع الفاتح' : 'الوضع الداكن';
  $('mSel').innerHTML = S.months.map(m => `<option value="${esc(m.id)}" ${m.id === S.sel ? 'selected' : ''}>${esc(m.n)}</option>`).join('');
  const cell = (r,m) => {
    const has = det(r,m).length, v = get(r,m);
    return `<td><div class="c"><input class="amt" type="number" min="0" step="any" inputmode="decimal" data-r="${r}" data-m="${m}" value="${v || ''}" ${has ? 'readonly title="المبلغ محسوب من التفاصيل"' : ''} aria-label="${esc(rowName(r))} - ${esc(monthName(m))}">` +
      `<button class="dt" data-r="${r}" data-m="${m}" title="تفاصيل">${has ? has + ' تفاصيل' : 'تفاصيل'}</button></div></td>`;
  };
  const head = `<tr><th>البند</th><th>ملاحظات</th>` +
    S.months.map(m => `<th><input class="mn" data-m="${m.id}" value="${esc(m.n)}" aria-label="اسم الشهر" style="width:90px;font-weight:600"><button class="x" data-dm="${m.id}" title="حذف الشهر">×</button></th>`).join('') +
    `<th>إجمالي البند</th><th></th></tr>`;
  const incRow = `<tr class="inc"><td><b>الدخل / المرتب</b></td><td><span class="hint">أدخل مرتبك الشهري هنا</span></td>${S.months.map(m => cell('inc',m.id)).join('')}<td class="tot" id="rt-inc"></td><td></td></tr>`;
  const rows = S.rows.map(r => `<tr><td><input class="rn" data-r="${r.id}" value="${esc(r.n)}" aria-label="اسم البند"></td>` +
    `<td><input class="note" data-r="${r.id}" value="${esc(r.note)}" placeholder="ملاحظة" style="min-width:140px" aria-label="ملاحظة"></td>` +
    S.months.map(m => cell(r.id,m.id)).join('') +
    `<td class="tot" id="rt-${r.id}"></td><td><button class="x" data-dr="${r.id}" title="حذف البند">حذف ×</button></td></tr>`).join('');
  const foot = `<tr class="sum"><td>إجمالي المصروفات</td><td></td>${S.months.map(m => `<td class="tot" id="mt-${m.id}"></td>`).join('')}<td class="tot" id="gt"></td><td></td></tr>` +
    `<tr class="sum"><td>المتبقي من الدخل</td><td></td>${S.months.map(m => `<td class="tot" id="rem-${m.id}"></td>`).join('')}<td class="tot" id="grem"></td><td></td></tr>`;
  $('tbl').innerHTML = head + incRow + rows + foot;
  calc();
}
function calc() {
  let gInc = 0, gExp = 0;
  [{id:'inc'}, ...S.rows].forEach(r => {
    const total = S.months.reduce((a,m) => a + get(r.id,m.id), 0);
    const el = $('rt-' + r.id); if (el) el.textContent = fmt(total);
  });
  S.months.forEach(m => {
    const e = expenses(m.id), i = get('inc',m.id), rem = i-e;
    gInc += i; gExp += e;
    $('mt-' + m.id).textContent = fmt(e);
    const re = $('rem-' + m.id); re.textContent = fmt(rem); re.className = 'tot ' + (rem < 0 ? 'neg' : 'pos');
  });
  $('gt').textContent = fmt(gExp);
  const gr = $('grem'); gr.textContent = fmt(gInc-gExp); gr.className = 'tot ' + (gInc-gExp < 0 ? 'neg' : 'pos');
  const m = S.sel, inc = get('inc',m), exp = expenses(m), rem = inc-exp;
  $('cards').innerHTML =
    `<div class="card big ${rem < 0 ? 'neg' : ''}"><span>المتبقي من الدخل</span><b>${fmt(rem)} ${esc(S.cur || 'ج.م')}</b></div>` +
    `<div class="card"><span>الدخل / المرتب</span><b>${fmt(inc)} ${esc(S.cur || 'ج.م')}</b></div>` +
    `<div class="card"><span>إجمالي المصروفات</span><b>${fmt(exp)} ${esc(S.cur || 'ج.م')}</b></div>` +
    `<div class="card"><span>نسبة الصرف من الدخل</span><b>${inc ? Math.round(exp/inc*100)+'%' : '—'}</b></div>`;
  updateExpenseSelect();
  store();
}
function updateExpenseSelect() {
  const select = $('expenseSelect'), old = select.value;
  const rows = S.rows.filter(r => get(r.id,S.sel) > 0 || S.rows.length);
  if (!rows.length) {
    select.innerHTML = '<option value="">لا توجد بنود مصروفات بعد</option>';
    $('chart').innerHTML = '<p class="empty-state">أضف بند مصروف من الزر بالأعلى، وبعد تسجيل مبلغ سيظهر هنا في القائمة.</p>';
    return;
  }
  select.innerHTML = rows.map(r => `<option value="${r.id}">${esc(r.n)}</option>`).join('');
  if (rows.some(r => r.id === old)) select.value = old;
  else select.value = rows[0].id;
  showSelectedExpense();
}
function showSelectedExpense() {
  const id = $('expenseSelect').value;
  const row = S.rows.find(r => r.id === id);
  if (!row) { $('chart').innerHTML = '<p class="empty-state">أضف بند مصروف جديدًا ليظهر هنا.</p>'; return; }
  const amount = get(row.id,S.sel), total = expenses(S.sel), percent = total ? Math.round(amount/total*100) : 0;
  $('chart').innerHTML = `<div class="expense-detail"><span class="hint">${esc(monthName(S.sel))}</span><br><strong>${esc(row.n)}</strong><p>المبلغ: <span class="amount">${fmt(amount)} ${esc(S.cur || 'ج.م')}</span></p><p class="hint">يمثل ${percent}% من إجمالي مصروفات الشهر.</p></div>`;
}
$('expenseSelect').addEventListener('change', showSelectedExpense);
$('tbl').addEventListener('input', e => {
  const t=e.target, d=t.dataset;
  if (t.classList.contains('amt')) {
    const k=key(d.r,d.m); (S.cells[k]=S.cells[k]||{}).v=Math.max(0,parseFloat(t.value)||0);
  } else if (t.classList.contains('rn')) {
    const row=S.rows.find(r=>r.id===d.r); if(row) row.n=t.value;
  } else if (t.classList.contains('note')) {
    const row=S.rows.find(r=>r.id===d.r); if(row) row.note=t.value;
  } else if (t.classList.contains('mn')) {
    const month=S.months.find(m=>m.id===d.m); if(month) month.n=t.value;
  } else return;
  calc();
  if (t.classList.contains('mn')) {
    const option=$('mSel').querySelector(`option[value="${d.m}"]`); if(option) option.textContent=t.value;
  }
});
$('tbl').addEventListener('change', e => {
  if (e.target.classList.contains('rn') || e.target.classList.contains('mn')) render();
});
$('tbl').addEventListener('click', e => {
  const d=e.target.dataset;
  if (e.target.classList.contains('dt')) openDet(d.r,d.m);
  else if (d.dr && confirm('هل تريد حذف بند المصروف بكل بياناته؟')) {
    S.rows=S.rows.filter(r=>r.id!==d.dr);
    Object.keys(S.cells).forEach(k=>{if(k.startsWith(d.dr+'|')) delete S.cells[k];});
    render();
  } else if (d.dm && confirm('حذف الشهر ده بكل بياناته؟')) {
    S.months=S.months.filter(m=>m.id!==d.dm);
    Object.keys(S.cells).forEach(k=>{if(k.endsWith('|'+d.dm)) delete S.cells[k];});
    if (!S.months.length) S.months.push({id:'m'+uid(),n:'شهر جديد'});
    if (!S.months.some(m=>m.id===S.sel)) S.sel=S.months[0].id;
    render();
  }
});
$('mSel').addEventListener('change', e => { S.sel=e.target.value; render(); });
$('addRow').onclick = () => {
  const n=prompt('اكتب اسم بند المصروف الذي تريد إضافته:');
  if (n && n.trim()) { S.rows.push({id:uid(),n:n.trim(),note:''}); render(); }
};
$('addMonth').onclick = () => {
  const n=prompt('اسم الشهر الجديد:', 'شهر '+(S.months.length+1));
  if (n && n.trim()) { const id='m'+uid(); S.months.push({id,n:n.trim()}); S.sel=id; render(); }
};
let D=null;
function openDet(r,m) { D={r,m}; drawDet(); $('dlg').showModal(); }
function drawDet() {
  const k=key(D.r,D.m), c=S.cells[k]=S.cells[k]||{v:0}; c.det=c.det||[];
  $('dlg').innerHTML=`<h3>${esc(rowName(D.r))} — ${esc(monthName(D.m))}</h3>`+
    c.det.map((x,i)=>`<div class="dl"><input data-i="${i}" data-f="d" value="${esc(x.d)}" placeholder="وصف المشتريات"><input data-i="${i}" data-f="p" type="number" min="0" step="any" inputmode="decimal" value="${x.p??''}" placeholder="السعر"><button data-x="${i}" class="x" title="حذف السطر">×</button></div>`).join('')+
    `<p><button id="ad" class="btn">＋ إضافة مشتريات</button></p><p>الإجمالي: <b id="dtot">${fmt(get(D.r,D.m))}</b> ${esc(S.cur||'ج.م')}</p><button id="cl" class="btn btn-primary">تم</button>`;
}
$('dlg').addEventListener('input',e=>{
  const d=e.target.dataset; if(d.f===undefined) return;
  const x=S.cells[key(D.r,D.m)].det[d.i]; x[d.f]=d.f==='p'?Math.max(0,parseFloat(e.target.value)||0):e.target.value;
  $('dtot').textContent=fmt(get(D.r,D.m));
});
$('dlg').addEventListener('click',e=>{
  const c=S.cells[key(D.r,D.m)];
  if(e.target.id==='ad'){c.det.push({d:'',p:0});drawDet();}
  else if(e.target.dataset.x!==undefined){c.det.splice(+e.target.dataset.x,1);if(!c.det.length)c.v=0;drawDet();}
  else if(e.target.id==='cl') $('dlg').close();
});
$('dlg').addEventListener('close',render);
const download=(name,text,type)=>{
  const a=document.createElement('a'), url=URL.createObjectURL(new Blob([text],{type}));
  a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('csv').onclick=()=>{
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"', line=a=>a.map(q).join(',');
  const out=[line(['البند','ملاحظات',...S.months.map(m=>m.n),'الإجمالي'])];
  const total=r=>S.months.reduce((a,m)=>a+get(r,m.id),0);
  out.push(line(['الدخل / المرتب','',...S.months.map(m=>get('inc',m.id)),total('inc')]));
  S.rows.forEach(r=>out.push(line([r.n,r.note,...S.months.map(m=>get(r.id,m.id)),total(r.id)])));
  out.push(line(['إجمالي المصروفات','',...S.months.map(m=>expenses(m.id)),S.months.reduce((a,m)=>a+expenses(m.id),0)]));
  out.push(line(['المتبقي من الدخل','',...S.months.map(m=>get('inc',m.id)-expenses(m.id)),'']));
  download('budget.csv','\\ufeff'+out.join('\\n'),'text/csv;charset=utf-8');
};
$('save').onclick=()=>download('budget-backup.json',JSON.stringify(S,null,2),'application/json');
$('load').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  f.text().then(t=>{try{const o=JSON.parse(t);if(!o.months||!o.rows||!o.cells)throw 0;S=o;render();}catch{alert('الملف ده مش نسخة صحيحة من الميزانية.');}}).finally(()=>{e.target.value='';});
};
$('print').onclick=()=>window.print();
$('theme').onclick=()=>{S.dark=!S.dark;render();};
render();

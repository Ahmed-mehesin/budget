const KEY = 'home-budget-v1';
const uid = () => Math.random().toString(36).slice(2, 8);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const def = () => ({
  cur: 'ج.م', sel: 'm1', dark: false,
  months: [{ id: 'm1', n: 'شهر 11' }, { id: 'm2', n: 'شهر 12' }, { id: 'm3', n: 'شهر 1' }],
  rows: ['تسويقة الأسبوع|خضار و فاكهة و بهارات', 'سمك ولحمة|', 'مستلزمات البيت|', 'باقات شخصية|',
    'باقات العائلة|ماما نهي', 'كهرباء|', 'علاج|', 'ملابس|', 'عناية شخصية|', 'اكل سكن|', 'مواصلات|',
    'اشتراكات|جيم ترفيه', 'خروجات|', 'أقساط|', 'مديونية|', 'اخري|']
    .map(s => { const [n, note] = s.split('|'); return { id: uid(), n, note }; }),
  cells: {}
});

let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || def(); } catch { S = def(); }
const store = () => localStorage.setItem(KEY, JSON.stringify(S));

const key = (r, m) => r + '|' + m;
const det = (r, m) => (S.cells[key(r, m)] || {}).det || [];
const get = (r, m) => {
  const c = S.cells[key(r, m)];
  if (!c) return 0;
  return c.det && c.det.length ? c.det.reduce((a, x) => a + (+x.p || 0), 0) : (+c.v || 0);
};
const rowName = r => r === 'inc' ? 'الدخل' : (S.rows.find(x => x.id === r) || {}).n;
const monthName = m => (S.months.find(x => x.id === m) || {}).n;
const expenses = m => S.rows.reduce((a, r) => a + get(r.id, m), 0);

function render() {
  document.documentElement.dataset.t = S.dark ? 'dark' : '';
  $('theme').textContent = S.dark ? 'الوضع الفاتح' : 'الوضع الداكن';
  if (!S.months.find(m => m.id === S.sel)) S.sel = (S.months[0] || {}).id;
  $('mSel').innerHTML = S.months.map(m => `<option value="${m.id}" ${m.id === S.sel ? 'selected' : ''}>${esc(m.n)}</option>`).join('');

  const cell = (r, m) => {
    const has = det(r, m).length;
    const v = get(r, m);
    return `<td><div class="c"><input class="amt" type="number" step="any" inputmode="decimal" data-r="${r}" data-m="${m}" value="${v || ''}" ${has ? 'readonly title="المبلغ من التفاصيل"' : ''}>` +
      `<button class="dt" data-r="${r}" data-m="${m}" title="تفاصيل">${has ? has : 'تفاصيل'}</button></div></td>`;
  };
  const head = `<tr><th>البند</th><th>ملاحظات</th>` +
    S.months.map(m => `<th><input class="mn" data-m="${m.id}" value="${esc(m.n)}" style="width:90px;font-weight:600"><button class="x" data-dm="${m.id}" title="حذف الشهر">×</button></th>`).join('') +
    `<th>إجمالي البند</th></tr>`;
  const incRow = `<tr class="inc"><td><b>الدخل</b></td><td></td>${S.months.map(m => cell('inc', m.id)).join('')}<td class="tot" id="rt-inc"></td></tr>`;
  const rows = S.rows.map(r => `<tr><td><input class="rn" data-r="${r.id}" value="${esc(r.n)}"></td>` +
    `<td><input class="note" data-r="${r.id}" value="${esc(r.note)}" placeholder="ملاحظة" style="min-width:160px"></td>` +
    S.months.map(m => cell(r.id, m.id)).join('') +
    `<td class="tot" id="rt-${r.id}"></td><td><button class="x" data-dr="${r.id}" title="حذف البند">×</button></td></tr>`).join('');
  const foot = `<tr class="sum"><td>إجمالي المصروفات</td><td></td>${S.months.map(m => `<td class="tot" id="mt-${m.id}"></td>`).join('')}<td class="tot" id="gt"></td></tr>` +
    `<tr class="sum"><td>الباقي</td><td></td>${S.months.map(m => `<td class="tot" id="rem-${m.id}"></td>`).join('')}<td class="tot" id="grem"></td></tr>`;
  $('tbl').innerHTML = head + incRow + rows + foot;
  calc();
}

function calc() {
  const cur = S.cur;
  let gInc = 0, gExp = 0;
  const all = [{ id: 'inc' }, ...S.rows];
  all.forEach(r => {
    const t = S.months.reduce((a, m) => a + get(r.id, m.id), 0);
    const el = $('rt-' + r.id);
    if (el) el.textContent = fmt(t);
  });
  S.months.forEach(m => {
    const e = expenses(m.id), i = get('inc', m.id), rem = i - e;
    gInc += i; gExp += e;
    $('mt-' + m.id).textContent = fmt(e);
    const re = $('rem-' + m.id);
    re.textContent = fmt(rem);
    re.className = 'tot ' + (rem < 0 ? 'neg' : 'pos');
  });
  $('gt').textContent = fmt(gExp);
  const gr = $('grem');
  gr.textContent = fmt(gInc - gExp);
  gr.className = 'tot ' + (gInc - gExp < 0 ? 'neg' : 'pos');

  const m = S.sel, inc = get('inc', m), exp = expenses(m), rem = inc - exp;
  $('cards').innerHTML =
    `<div class="card big ${rem < 0 ? 'neg' : ''}"><span>الباقي</span><b>${fmt(rem)} ${cur}</b></div>` +
    `<div class="card"><span>الدخل</span><b>${fmt(inc)}</b></div>` +
    `<div class="card"><span>إجمالي المصروفات</span><b>${fmt(exp)}</b></div>` +
    `<div class="card"><span>نسبة الصرف من الدخل</span><b>${inc ? Math.round(exp / inc * 100) + '%' : '-'}</b></div>`;

  const items = S.rows.map(r => ({ n: r.n, v: get(r.id, m) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const max = items.length ? items[0].v : 1;
  $('chart').innerHTML = items.length
    ? items.map(x => `<div class="bar"><span>${esc(x.n)}</span><i style="width:${x.v / max * 100}%"></i><small>${fmt(x.v)} (${Math.round(x.v / exp * 100)}%)</small></div>`).join('')
    : '<p class="hint">لسه مفيش مصروفات في الشهر ده.</p>';
  store();
}

/* ---------- تعديل الخلايا ---------- */
$('tbl').addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (t.classList.contains('amt')) {
    const k = key(d.r, d.m);
    (S.cells[k] = S.cells[k] || {}).v = parseFloat(t.value) || 0;
  } else if (t.classList.contains('rn')) S.rows.find(r => r.id === d.r).n = t.value;
  else if (t.classList.contains('note')) S.rows.find(r => r.id === d.r).note = t.value;
  else if (t.classList.contains('mn')) S.months.find(m => m.id === d.m).n = t.value;
  else return;
  calc();
  if (t.classList.contains('mn')) {
    const o = $('mSel').querySelector(`option[value="${d.m}"]`);
    if (o) o.textContent = t.value;
  }
});

$('tbl').addEventListener('click', e => {
  const d = e.target.dataset;
  if (e.target.classList.contains('dt')) openDet(d.r, d.m);
  else if (d.dr && confirm('حذف البند ده؟')) {
    S.rows = S.rows.filter(r => r.id !== d.dr);
    Object.keys(S.cells).forEach(k => k.startsWith(d.dr + '|') && delete S.cells[k]);
    render();
  } else if (d.dm && confirm('حذف الشهر ده بكل بياناته؟')) {
    S.months = S.months.filter(m => m.id !== d.dm);
    Object.keys(S.cells).forEach(k => k.endsWith('|' + d.dm) && delete S.cells[k]);
    render();
  }
});

$('mSel').onchange = e => { S.sel = e.target.value; calc(); };
$('addRow').onclick = () => {
  const n = prompt('اسم البند الجديد:');
  if (n) { S.rows.push({ id: uid(), n, note: '' }); render(); }
};
$('addMonth').onclick = () => {
  const n = prompt('اسم الشهر الجديد:', 'شهر ' + (S.months.length + 1));
  if (n) { const id = 'm' + uid(); S.months.push({ id, n }); S.sel = id; render(); }
};

/* ---------- نافذة التفاصيل ---------- */
let D = null;
function openDet(r, m) { D = { r, m }; drawDet(); $('dlg').showModal(); }
function drawDet() {
  const k = key(D.r, D.m);
  const c = S.cells[k] = S.cells[k] || { v: 0 };
  c.det = c.det || [];
  $('dlg').innerHTML = `<h3>${esc(rowName(D.r))} - ${esc(monthName(D.m))}</h3><div>` +
    c.det.map((x, i) => `<div class="dl"><input data-i="${i}" data-f="d" value="${esc(x.d)}" placeholder="الوصف (مثلا: طماطم)">` +
      `<input data-i="${i}" data-f="p" type="number" step="any" inputmode="decimal" value="${x.p ?? ''}" placeholder="السعر"><button data-x="${i}" class="x">×</button></div>`).join('') +
    `</div><p><button id="ad">+ إضافة سطر</button></p><p>الإجمالي: <b id="dtot">${fmt(get(D.r, D.m))}</b> ${S.cur}</p><button id="cl">تم</button>`;
}
$('dlg').addEventListener('input', e => {
  const d = e.target.dataset;
  if (d.f === undefined) return;
  const x = S.cells[key(D.r, D.m)].det[d.i];
  x[d.f] = d.f === 'p' ? (parseFloat(e.target.value) || 0) : e.target.value;
  $('dtot').textContent = fmt(get(D.r, D.m));
});
$('dlg').addEventListener('click', e => {
  const c = S.cells[key(D.r, D.m)];
  if (e.target.id === 'ad') { c.det.push({ d: '', p: 0 }); drawDet(); }
  else if (e.target.dataset.x !== undefined) {
    c.det.splice(+e.target.dataset.x, 1);
    if (!c.det.length) c.v = 0;
    drawDet();
  } else if (e.target.id === 'cl') $('dlg').close();
});
$('dlg').addEventListener('close', render);

/* ---------- أدوات إضافية ---------- */
const download = (name, text, type) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
};
$('csv').onclick = () => {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const line = a => a.map(q).join(',');
  const out = [line(['البند', 'ملاحظات', ...S.months.map(m => m.n), 'الإجمالي'])];
  const tot = r => S.months.reduce((a, m) => a + get(r, m.id), 0);
  out.push(line(['الدخل', '', ...S.months.map(m => get('inc', m.id)), tot('inc')]));
  S.rows.forEach(r => out.push(line([r.n, r.note, ...S.months.map(m => get(r.id, m.id)), tot(r.id)])));
  out.push(line(['إجمالي المصروفات', '', ...S.months.map(m => expenses(m.id)), S.months.reduce((a, m) => a + expenses(m.id), 0)]));
  out.push(line(['الباقي', '', ...S.months.map(m => get('inc', m.id) - expenses(m.id)), '']));
  download('budget.csv', '\ufeff' + out.join('\n'), 'text/csv;charset=utf-8');
};
$('save').onclick = () => download('budget-backup.json', JSON.stringify(S), 'application/json');
$('load').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  f.text().then(t => {
    try {
      const o = JSON.parse(t);
      if (!o.months || !o.rows || !o.cells) throw 0;
      S = o; render();
    } catch { alert('الملف ده مش نسخة صحيحة من الميزانية.'); }
  });
  e.target.value = '';
};
$('print').onclick = () => window.print();
$('theme').onclick = () => { S.dark = !S.dark; render(); };

render();

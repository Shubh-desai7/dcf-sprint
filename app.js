/* DCF Sprint — all pages, widgets and the exam simulator. Model maths lives in model.js. */
const { run, CASES, YEARS, irr } = window.DCF;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = (v, d = 2) => (v == null || isNaN(v)) ? '' : (Math.abs(v) < 0.005 && d <= 2 ? 0 : v).toFixed(d);
const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';
const store = {
  get(k, d) { try { const v = localStorage.getItem('dcf:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dcf:' + k, JSON.stringify(v)); } catch (e) {} }
};
const close = (u, t, kind) => {
  if (u === '' || u == null || isNaN(+u)) return false;
  u = +u;
  if (kind === 'pct') return Math.abs(u - t * 100) <= 0.3;
  if (kind === 'df') return Math.abs(u - t) <= 0.002;
  return Math.abs(u - t) <= Math.max(0.15, Math.abs(t) * 0.005);
};
const CN = run(CASES.coolnomad);

/* ---------------- Quiz widget ---------------- */
function quiz(id, items) {
  return `<div class="card quiz" data-quiz="${id}"><b>Quick check</b>${items.map((it, i) => `
    <div class="q">${i + 1}. ${it.q}</div>
    ${it.o.map((o, j) => `<button class="opt" data-i="${i}" data-j="${j}">${o}</button>`).join('')}
    <div class="fb" id="${id}-fb-${i}"></div>`).join('')}</div>`;
}
function bindQuiz(id, items) {
  $$(`[data-quiz="${id}"] .opt`).forEach(b => b.onclick = () => {
    const i = +b.dataset.i, j = +b.dataset.j, it = items[i];
    $$(`[data-quiz="${id}"] .opt[data-i="${i}"]`).forEach(x => x.classList.remove('right', 'wrong'));
    b.classList.add(j === it.a ? 'right' : 'wrong');
    $(`#${id}-fb-${i}`).innerHTML = (j === it.a ? '✅ ' : '❌ ') + it.e;
  });
}

/* ---------------- Sheet renderer (looks like the Google Sheet) ---------------- */
const sheetMode = {};
function sheetHTML(def) {
  const mode = sheetMode[def.id] || 'val';
  const head = `<tr><th class="rn"></th><th>${def.title}</th>${def.cols.map((c, i) => `<th>${def.heads[i]}<br><span class="pill">${c}</span></th>`).join('')}</tr>`;
  const body = def.rows.map(row => `<tr class="click ${row.sub ? 'sub' : ''}" data-r="${row.r}">
    <td class="rn">${row.r}</td><td>${row.label}</td>
    ${def.cols.map(c => {
      const cell = row.cells[c];
      if (!cell) return '<td></td>';
      if (cell.input) return `<td class="in">${typeof cell.v === 'number' ? fmt(cell.v, cell.d ?? 2) : cell.v}</td>`;
      if (mode === 'f') return `<td class="f">${cell.f}</td>`;
      if (mode === 'drill') return `<td><input data-c="${c}" data-r="${row.r}" data-t="${cell.v}" data-k="${cell.d === 4 ? 'df' : cell.d === 'pct' ? 'pct' : ''}" placeholder="?"></td>`;
      return `<td>${cell.d === 'pct' ? pct(cell.v) : fmt(cell.v, cell.d ?? 2)}</td>`;
    }).join('')}</tr>`).join('');
  return `<div class="toolbar" data-sheet="${def.id}">
      <button data-m="val" class="${mode === 'val' ? 'on' : ''}">Values</button>
      <button data-m="f" class="${mode === 'f' ? 'on' : ''}">Formulas</button>
      <button data-m="drill" class="${mode === 'drill' ? 'on' : ''}">Drill: fill the blanks</button>
      <span class="pill">Yellow = hard-coded input · White = formula · Click a row to explain it</span>
    </div>
    <div class="tablewrap"><table id="t-${def.id}"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <div class="card explain" id="x-${def.id}"><span class="pill">Tip</span> Click any row to see the formula and why it works.</div>`;
}
function bindSheet(def, rerender) {
  $$(`[data-sheet="${def.id}"] button`).forEach(b => b.onclick = () => { sheetMode[def.id] = b.dataset.m; rerender(); });
  $$(`#t-${def.id} tr.click`).forEach(tr => tr.onclick = e => {
    if (e.target.tagName === 'INPUT') return;
    $$(`#t-${def.id} tr`).forEach(x => x.classList.remove('sel'));
    tr.classList.add('sel');
    const row = def.rows.find(r => r.r == tr.dataset.r);
    const first = def.cols.map(c => row.cells[c]).find(c => c && !c.input);
    $(`#x-${def.id}`).innerHTML = `<b>Row ${row.r} · ${row.label}</b><br>` +
      (first ? `Formula (first forecast cell): <code>${first.f}</code><br>` : '<span class="pill">Hard-coded input</span><br>') +
      `<span>${row.why || ''}</span>`;
  });
  $$(`#t-${def.id} input`).forEach(inp => inp.oninput = () => {
    inp.classList.remove('ok', 'no');
    if (inp.value === '') return;
    inp.classList.add(close(inp.value, +inp.dataset.t, inp.dataset.k) ? 'ok' : 'no');
  });
}
function mountSheet(el, defFn) {
  const draw = () => { el.innerHTML = sheetHTML(defFn()); bindSheet(defFn(), draw); };
  draw();
}

/* ---------------- Sheet definitions (same layout as the class file) ---------------- */
const F = ['F', 'G', 'H', 'I'], P = ['E', 'F', 'G', 'H'], A = ['C', 'D', 'E', 'F'];
const HIST = {
  off: { 6: [8, 23, 53], 7: [2, 7, 17], 8: [10, 30, 70], 9: [5.5, 15.6, 35], 10: [4.5, 14.4, 35], 11: [.2, .4, .8], 12: [.1, .3, .6], 13: [4.2, 13.7, 33.6], 14: [.7, 1.8, 3.5], 15: [3.5, 11.9, 30.1], 16: [2.4, 5.4, 9.1], 17: [1.8, 4.2, 7], 18: [-.7, 2.3, 14] },
  dc: { 6: [16, 35, 60], 7: [4, 10, 20], 8: [20, 45, 80], 9: [10.2, 22.1, 37.6], 10: [9.8, 22.9, 42.4], 11: [.3, .7, 1.2], 12: [.3, .7, 1.2], 13: [.6, 1.3, 2], 14: [8.6, 20.2, 38], 15: [7.6, 14, 22], 16: [1, 6.2, 16] },
  con: { 6: [10, 30, 70], 7: [20, 45, 80], 8: [30, 75, 150], 9: [-.7, 2.3, 14], 10: [1, 6.2, 16], 11: [.3, 8.5, 30], 12: [2.6, 4, 6], 13: [1.4, 2.2, 3.4], 14: [.5, .9, 1.5], 15: [.5, .9, 1.5], 16: [-4.7, .5, 17.6], 17: [.5, 1.5, 3], 18: [-5.2, -1, 14.6], 19: [0, 0, 0], 20: [-5.2, -1, 14.6], 21: [0, 0, 3.65], 22: [-5.2, -1, 10.95] }
};
function histFor(m) {
  if (m.c.id === 'coolnomad') return HIST;
  const c = m.c, e = v => [null, null, v];
  return {
    off: { 6: e(c.off.bags0), 7: e(c.off.acc0), 8: e(c.off.bags0 + c.off.acc0), 16: e(c.off.rent0), 17: e(c.off.staff0) },
    dc: { 6: e(c.d2c.bags0), 7: e(c.d2c.acc0), 8: e(c.d2c.bags0 + c.d2c.acc0) },
    con: { 12: e(c.common.sal0), 13: e(c.common.brand0), 14: e(c.common.tech0), 15: e(c.common.oth0), 17: e(c.dep0) }
  };
}
function mkRows(spec, data, hist) {
  return spec.map(([r, label, key, fn, why, sub]) => {
    const cells = {};
    ['C', 'D', 'E'].forEach((c, i) => { const h = hist[r]; if (h && h[i] != null) cells[c] = { v: h[i], input: true }; });
    F.forEach((c, i) => cells[c] = { v: data[key][i], f: fn(c, P[i], A[i], i) });
    return { r, label, why, sub, cells };
  });
}
const OFF_SPEC = [
  [6, 'Bags revenue', 'bags', (L, P, A) => `=${P}6*(1+Assumptions!${A}6)`, 'Revenue grows on last year: <code>previous year × (1 + growth %)</code>. The growth rate sits on the Assumptions sheet in the same column order (FY27 = column C).'],
  [7, 'Accessories revenue', 'acc', (L, P, A) => `=${P}7*(1+Assumptions!${A}7)`, 'Same as bags, with the accessories growth rate. Accessories grow faster, which is why they are modelled separately.'],
  [8, 'Total revenue', 'rev', L => `=${L}6+${L}7`, 'Bags + accessories.', 1],
  [9, 'Cost of goods sold', 'cogs', (L, P, A) => `=${L}8*(1-Assumptions!${A}8)`, 'You are given <b>gross margin %</b>, not COGS %. If gross margin is 50%, COGS is the other 50%: <code>Revenue × (1 − GM%)</code>.'],
  [10, 'Gross margin', 'gm', L => `=${L}8-${L}9`, 'Revenue − COGS.', 1],
  [11, 'Packaging', 'pack', (L, P, A) => `=${L}$8*Assumptions!${A}9`, 'A variable cost as % of revenue: <code>Revenue × %</code>. The <code>$</code> before 8 locks the row so you can drag the formula down to the next cost lines. Note: the class file has 1.0% in FY28 (case text says 1.2%). The answer key follows the class file.'],
  [12, 'Payment gateway charges', 'pg', (L, P, A) => `=${L}$8*Assumptions!${A}10`, 'Revenue × payment gateway %.'],
  [13, 'Contribution Margin-1', 'cm1', L => `=${L}10-${L}11-${L}12`, 'CM1 = Gross margin − packaging − payment gateway. (Stores have no shipping line.)', 1],
  [14, 'Performance Marketing', 'pm', (L, P, A) => `=${L}$8*Assumptions!${A}11`, 'Revenue × performance marketing %. Even physical stores spend on ads.'],
  [15, 'Contribution Margin-2', 'cm2', L => `=${L}13-${L}14`, 'CM2 = CM1 − performance marketing.', 1],
  [16, 'Store rent', 'rent', (L, P, A) => `=${P}16*(1+Assumptions!${A}12)`, '<b>Fixed cost</b>: never a % of revenue. Grow last year’s rupee amount by the escalation %. This is why store margin expands as revenue grows faster than rent.'],
  [17, 'Store staff', 'staff', (L, P, A) => `=${P}17*(1+Assumptions!${A}13)`, 'Fixed cost, grown year on year like rent.'],
  [18, 'Offline contribution', 'contrib', L => `=${L}15-${L}16-${L}17`, 'Store contribution = CM2 − rent − staff.', 1]
];
const D2C_SPEC = [
  [6, 'Bags revenue', 'bags', (L, P, A) => `=${P}6*(1+Assumptions!${A}17)`, 'Previous year × (1 + D2C bags growth). D2C assumptions start at row 17 of the Assumptions sheet.'],
  [7, 'Accessories revenue', 'acc', (L, P, A) => `=${P}7*(1+Assumptions!${A}18)`, 'Previous year × (1 + D2C accessories growth).'],
  [8, 'Total revenue', 'rev', L => `=${L}6+${L}7`, 'Bags + accessories.', 1],
  [9, 'Cost of goods sold', 'cogs', (L, P, A) => `=${L}8*(1-Assumptions!${A}19)`, 'Revenue × (1 − gross margin %).'],
  [10, 'Gross margin', 'gm', L => `=${L}8-${L}9`, 'Revenue − COGS.', 1],
  [11, 'Packaging', 'pack', (L, P, A) => `=${L}$8*Assumptions!${A}20`, 'Revenue × packaging %.'],
  [12, 'Payment gateway charges', 'pg', (L, P, A) => `=${L}$8*Assumptions!${A}21`, 'Revenue × payment gateway %.'],
  [13, 'Shipping', 'ship', (L, P, A) => `=${L}$8*Assumptions!${A}22`, 'Only D2C ships to the customer’s door, so only D2C has this line.'],
  [14, 'Contribution Margin-1', 'cm1', L => `=${L}10-${L}11-${L}12-${L}13`, 'CM1 = GM − packaging − gateway − shipping.', 1],
  [15, 'Performance marketing', 'pm', (L, P, A) => `=${L}$8*Assumptions!${A}23`, 'Revenue × performance marketing % (the big D2C cost, falling from 26% to 23%).'],
  [16, 'D2C contribution', 'contrib', L => `=${L}14-${L}15`, 'CM2 = CM1 − performance marketing. No rent or staff in D2C, so CM2 is the contribution.', 1]
];
function conSpec(m) {
  const cy = m.c.capexYear;
  return [
    [6, 'Offline revenue', 'offRev', L => `='Offline retail'!${L}8`, 'Just link to the Offline sheet. Never retype numbers.'],
    [7, 'D2C revenue', 'd2cRev', L => `=D2C!${L}8`, 'Link to the D2C sheet.'],
    [8, 'Total revenue', 'rev', L => `=${L}6+${L}7`, 'Offline + D2C. Working capital is built off this row.', 1],
    [9, 'Offline contribution', 'offContrib', L => `='Offline retail'!${L}18`, 'Link to the offline contribution row.'],
    [10, 'D2C contribution', 'd2cContrib', L => `=D2C!${L}16`, 'Link to the D2C contribution row.'],
    [11, 'Total contribution', 'contrib', L => `=${L}9+${L}10`, 'Sum of both verticals.', 1],
    [12, 'Head office salaries', 'sal', (L, P, A) => `=${P}12*(1+Assumptions!${A}27)`, 'Common costs each have their own growth rate: previous year × (1 + growth). In class: 6 × 1.30 = 7.8.'],
    [13, 'Brand marketing', 'brand', (L, P, A) => `=${P}13*(1+Assumptions!${A}28)`, 'Same pattern. Copy-paste row 12 down because the order matches the Assumptions sheet.'],
    [14, 'Technology and platform', 'tech', (L, P, A) => `=${P}14*(1+Assumptions!${A}29)`, 'Same pattern.'],
    [15, 'Other general and administrative', 'oth', (L, P, A) => `=${P}15*(1+Assumptions!${A}30)`, 'Same pattern.'],
    [16, 'EBITDA', 'ebitda', L => `=${L}11-SUM(${L}12:${L}15)`, 'Earnings before interest, tax, depreciation and amortisation = total contribution − all common costs.', 1],
    [17, 'Depreciation', 'dep', (L, P, A, i) => i >= cy ? '=Assumptions!$C$34+Assumptions!$C$38' : '=Assumptions!$C$34', `Existing fit-outs (₹${m.c.dep0} cr every year, locked with <code>$C$34</code>) plus, from the capex year (${YEARS[cy]}), the new machines: cost ÷ life = ${m.c.capex} ÷ ${m.c.life} = ${fmt(m.addDep)} (<code>$C$38</code>).`],
    [18, 'EBIT', 'ebit', L => `=${L}16-${L}17`, 'EBITDA − depreciation (and amortisation, which is depreciation on intangibles like software or goodwill; none here).', 1],
    [19, 'Interest', 'interest', () => '=Assumptions!$C$42*Assumptions!$C$43', `Debt × interest rate = ${m.c.debt} × ${pct(m.c.intRate, 0)} = ${fmt(m.c.debt * m.c.intRate)}. Both cells locked with $ because debt is assumed constant.`],
    [20, 'Profit before tax', 'pbt', L => `=${L}18-${L}19`, 'EBIT − interest.', 1],
    [21, 'Tax', 'tax', L => `=MAX(0,${L}20*Assumptions!$C$41)`, '<code>MAX(0, …)</code> means that if PBT is negative you pay 0 tax, not negative tax. <b>Common mistake:</b> after adding the interest row, tax must point to PBT (row 20), not EBIT.'],
    [22, 'Profit after tax', 'pat', L => `=${L}20-${L}21`, 'PBT − tax. This feeds the DCF sheet.', 1]
  ];
}
const offDef = m => ({ id: m.c.id + '-off', title: 'Offline retail (₹ cr)', cols: ['C', 'D', 'E', ...F], heads: ['FY24', 'FY25', 'FY26', ...YEARS], rows: mkRows(OFF_SPEC, m.off, histFor(m).off) });
const d2cDef = m => ({ id: m.c.id + '-d2c', title: 'D2C & App (₹ cr)', cols: ['C', 'D', 'E', ...F], heads: ['FY24', 'FY25', 'FY26', ...YEARS], rows: mkRows(D2C_SPEC, m.dc, histFor(m).dc) });
const conDef = m => ({ id: m.c.id + '-con', title: 'Consolidated (₹ cr)', cols: ['C', 'D', 'E', ...F], heads: ['FY24', 'FY25', 'FY26', ...YEARS], rows: mkRows(conSpec(m), m.con, histFor(m).con) });

function dcfDef(m) {
  const v = m.v, c = m.c, C4 = ['C', 'D', 'E', 'F'], CF = ['F', 'G', 'H', 'I'];
  const row4 = (r, label, vals, fn, why, sub, d) => ({ r, label, why, sub, cells: Object.fromEntries(C4.map((col, i) => [col, { v: vals[i], f: fn(col, i), d }])) });
  const one = (r, label, col, val, f, why, sub, d) => ({ r, label, why, sub, cells: { [col]: { v: val, f, d } } });
  const inp = (r, label, col, val, why, d) => ({ r, label, why, cells: { [col]: { v: val, input: true, d } } });
  return {
    id: c.id + '-dcf', title: 'DCF (FCFE) (₹ cr)', cols: ['C', 'D', 'E', 'F', 'G'], heads: ['FY27', 'FY28', 'FY29', 'FY30', '—'],
    rows: [
      inp(4, 'Discounting factor (required return)', 'C', pct(c.r, 0), 'The investor’s required return. It is typed in (yellow). Every discount factor locks onto this cell with <code>$C$4</code>.'),
      inp(5, 'Terminal growth rate', 'C', pct(c.g, 0), 'How fast cash flows grow forever after FY30. Low single digits; must be below the discount rate.'),
      row4(9, 'Profit after tax', m.con.pat, col => `='Consolidated '!${CF[C4.indexOf(col)]}22`, 'Link PAT from Consolidated row 22. Note the column shift: DCF column C = FY27 = Consolidated column F.'),
      row4(10, 'Add: non-cash expenses', m.con.dep, col => `='Consolidated '!${CF[C4.indexOf(col)]}17`, 'Depreciation was subtracted to get PAT but no cash left the business, so add it back.'),
      row4(11, 'Cash profit (for equity holders)', v.cashProfit, col => `=${col}9+${col}10`, 'PAT + depreciation. Interest is already paid, so this belongs to equity holders only.', 1),
      row4(12, 'Less: Additional working capital required', v.dWC, (col, i) => `=${['D', 'E', 'F', 'G'][i]}45`, 'Only the <b>increase</b> in working capital is a cash outflow, taken from the working capital working (row 45).'),
      { r: 13, label: 'Less: Capex', why: `Cash spent on machines: ₹${c.capex} cr in ${YEARS[c.capexYear]} only. Typed in (or linked to Assumptions!C35).`, cells: Object.fromEntries(C4.map((col, i) => [col, { v: v.capex[i], input: true }])) },
      row4(14, 'Free cash flows for equity (FCFE)', v.fcfe, col => `=${col}11-${col}12-${col}13`, 'Cash profit − ΔWC − capex. This is the cash that is actually free for shareholders.', 1),
      one(15, 'Terminal value', 'F', v.tv, '=F14*(1+C5)/(C4-C5)', `FCFE<sub>FY30</sub> × (1 + g) ÷ (r − g) = ${fmt(v.fcfe[3])} × ${1 + c.g} ÷ (${c.r} − ${c.g}). The brackets matter: Sheets solves brackets first (BODMAS). It captures FY31 → forever, sitting in FY30.`, 1),
      { r: 17, label: 'Years to discount', why: 'Valuation date is 31 Mar 2026, so FY27 is 1 year away … FY30 is 4 years away. Typed in.', cells: Object.fromEntries(C4.map((col, i) => [col, { v: i + 1, input: true, d: 0 }])) },
      row4(18, 'Discounting factor', v.df, col => `=1/(1+$C$4)^${col}17`, '1 ÷ (1 + r)<sup>years</sup>. Lock the rate with <code>$C$4</code> so it doesn’t drift when you drag across.', 0, 4),
      row4(20, 'Present value of free cash flows', v.pv, col => `=${col}14*${col}18`, 'FCFE × discount factor.'),
      one(21, 'Present value of terminal value', 'F', v.pvTV, '=F15*F18', 'TV sits in FY30, so it uses the <b>FY30</b> (4-year) factor. Don’t discount it an extra year.'),
      one(23, 'Equity value as per DCF', 'C', v.equity, '=C20+D20+E20+F20+F21', 'Sum of all present values = what an equity investor should pay today.', 1),
      one(27, "Investor's preferred value", 'C', v.equity, '=C23', 'Link to equity value.'),
      inp(28, "Founder's preferred value (ask)", 'C', c.ask, 'Given in the question / case. Typed in.'),
      one(29, 'Net present value (NPV)', 'C', v.npv, '=C27-C28', 'Investor value − price asked. Negative → overpaying → return below required. Positive → good deal.', 1),
      { r: 33, label: 'Cash flows (for IRR)', why: 'Day 0 = −price actually paid (negative = money out). Then each year FCFE; the last year also includes the terminal value (in the class file every year is <code>=C14+C15</code>, and C15–E15 are blank).', cells: { C: { v: -c.ask, f: `=-${c.ask}` }, D: { v: v.flows[1], f: '=C14+C15' }, E: { v: v.flows[2], f: '=D14+D15' }, F: { v: v.flows[3], f: '=E14+E15' }, G: { v: v.flows[4], f: '=F14+F15' } } },
      one(34, 'Internal rate of return (IRR)', 'C', v.irr, '=IRR(C33:G33)', 'The actual yearly return at the price paid. Pay exactly the DCF value → IRR = required return. Pay more → lower IRR.', 1, 'pct'),
      { r: 38, label: 'Upside (1.2×)', why: 'Multiple column is typed in (1.2); valuation = base × multiple.', cells: { C: { v: 1.2, input: true, d: 1 }, D: { v: v.upside, f: '=D39*C38' } } },
      { r: 39, label: 'Base (1.0×)', why: 'Base case = the DCF equity value.', cells: { C: { v: 1, input: true, d: 1 }, D: { v: v.equity, f: '=C23' } } },
      { r: 40, label: 'Downside (0.8×)', why: 'Downside = base × 0.8.', cells: { C: { v: 0.8, input: true, d: 1 }, D: { v: v.downside, f: '=D39*C40' } } },
      { r: 44, label: 'Working capital (FY26 → FY30)', why: `FY26 is given (₹${c.wc0} cr, Assumptions!C40). Then WC = ${pct(c.wcPct, 0)} × that year’s total revenue, with the % locked via <code>$C$39</code>. Columns here are FY26 | FY27 | FY28 | FY29 | FY30.`, cells: { C: { v: c.wc0, f: '=Assumptions!C40' }, D: { v: v.wcLevel[0], f: "=Assumptions!$C$39*'Consolidated '!F8" }, E: { v: v.wcLevel[1], f: "=Assumptions!$C$39*'Consolidated '!G8" }, F: { v: v.wcLevel[2], f: "=Assumptions!$C$39*'Consolidated '!H8" }, G: { v: v.wcLevel[3], f: "=Assumptions!$C$39*'Consolidated '!I8" } } },
      { r: 45, label: 'Increase in working capital', why: 'This year’s WC − last year’s WC. Only the extra money you must put in is cash out.', sub: 1, cells: { D: { v: v.dWC[0], f: '=D44-C44' }, E: { v: v.dWC[1], f: '=E44-D44' }, F: { v: v.dWC[2], f: '=F44-E44' }, G: { v: v.dWC[3], f: '=G44-F44' } } }
    ]
  };
}

/* ---------------- Exam-style questions (25 × 2 = 50 marks) ---------------- */
const QS = [
  ['Offline bags revenue, FY27', m => m.off.bags[0], 'FY26 bags × (1 + FY27 bags growth)'],
  ['Offline total revenue, FY28', m => m.off.rev[1], 'Bags + accessories, each grown year on year'],
  ['Offline cost of goods sold, FY27', m => m.off.cogs[0], 'Revenue × (1 − gross margin %)'],
  ['Store rent, FY30', m => m.off.rent[3], 'Fixed cost: grow the FY26 rupee amount each year, compounding'],
  ['Offline contribution, FY28', m => m.off.contrib[1], 'CM2 − rent − staff'],
  ['D2C total revenue, FY27', m => m.dc.rev[0], 'D2C bags + accessories, grown from FY26'],
  ['D2C performance marketing, FY29', m => m.dc.pm[2], 'D2C revenue × that year’s performance marketing %'],
  ['D2C CM1, FY28', m => m.dc.cm1[1], 'GM − packaging − gateway − shipping'],
  ['D2C contribution, FY30', m => m.dc.contrib[3], 'CM1 − performance marketing'],
  ['Total (consolidated) revenue, FY29', m => m.con.rev[2], 'Offline revenue + D2C revenue'],
  ['Head office salaries, FY28', m => m.con.sal[1], 'FY26 × (1+g27) × (1+g28)'],
  ['EBITDA, FY27', m => m.con.ebitda[0], 'Total contribution − the four common costs'],
  ['Depreciation, FY30', m => m.con.dep[3], 'Existing depreciation + capex ÷ life (once the capex year has started)'],
  ['Interest, FY27', m => m.con.interest[0], 'Debt × interest rate'],
  ['Profit after tax, FY28', m => m.con.pat[1], 'EBITDA − dep = EBIT; − interest = PBT; − MAX(0, PBT × tax)'],
  ['Increase in working capital, FY27', m => m.v.dWC[0], 'WC% × FY27 revenue − FY26 working capital'],
  ['FCFE, FY27', m => m.v.fcfe[0], 'PAT + depreciation − ΔWC − capex'],
  ['FCFE, FY30', m => m.v.fcfe[3], 'PAT + depreciation − ΔWC − capex'],
  ['Terminal value (at FY30)', m => m.v.tv, 'FCFE FY30 × (1+g) ÷ (r − g)'],
  ['Discount factor, FY29 (4 decimals)', m => m.v.df[2], '1 ÷ (1+r)^3', 'df'],
  ['Present value of terminal value', m => m.v.pvTV, 'TV × FY30 discount factor (4 years)'],
  ['Equity value as per DCF', m => m.v.equity, 'Sum of PV of FCFE + PV of TV'],
  ['Enterprise value', m => m.v.ev, 'Equity value + debt − cash'],
  ['NPV versus the founder’s ask', m => m.v.npv, 'Equity value − founder’s preferred value'],
  ['IRR if the deal happens at the founder’s ask (in %, e.g. 18.5)', m => m.v.irr, '=IRR(−ask, FCFE27, FCFE28, FCFE29, FCFE30 + TV)', 'pct']
];

/* ---------------- Case brief for the practice / test cases ---------------- */
function caseBrief(c) {
  const rowP = (l, a) => `<tr><td>${l}</td>${a.map(x => `<td>${pct(x, 1)}</td>`).join('')}</tr>`;
  const tbl = (title, rows) => `<div class="tablewrap"><table><thead><tr><th>${title}</th>${YEARS.map(y => `<th>${y}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  return `
  <div class="card"><b>${c.name}</b> · ${c.biz}. Two verticals: own stores (offline) and D2C website/app. Each is split into bags and accessories. Value the company as at 31 March 2026 using FCFE, forecasting FY27–FY30.
  <div class="grid3" style="margin-top:12px">
    <div class="stat"><b>${pct(c.r, 0)}</b><span>Required return</span></div>
    <div class="stat"><b>${pct(c.g, 0)}</b><span>Terminal growth</span></div>
    <div class="stat"><b>₹${c.ask} cr</b><span>Founder’s ask (preferred value)</span></div>
  </div></div>
  <h3>FY26 base figures (₹ cr)</h3>
  <div class="tablewrap"><table><tbody>
   <tr><td>Offline bags / accessories revenue</td><td>${c.off.bags0} / ${c.off.acc0}</td></tr>
   <tr><td>Store rent / store staff</td><td>${c.off.rent0} / ${c.off.staff0}</td></tr>
   <tr><td>D2C bags / accessories revenue</td><td>${c.d2c.bags0} / ${c.d2c.acc0}</td></tr>
   <tr><td>Head office salaries / brand marketing / technology / other G&amp;A</td><td>${c.common.sal0} / ${c.common.brand0} / ${c.common.tech0} / ${c.common.oth0}</td></tr>
   <tr><td>Working capital at 31 Mar 2026</td><td>${c.wc0}</td></tr>
   <tr><td>Debt at 31 Mar 2026 (constant) · interest rate</td><td>${c.debt} · ${pct(c.intRate, 0)}</td></tr>
   <tr><td>Cash at 31 Mar 2026</td><td>${c.cash}</td></tr>
  </tbody></table></div>
  <h3>Assumptions</h3>
  ${tbl('Offline retail', rowP('Bags growth', c.off.gB) + rowP('Accessories growth', c.off.gA) + rowP('Gross margin', c.off.gm) + rowP('Packaging (% rev)', c.off.pack) + rowP('Payment gateway (% rev)', c.off.pg) + rowP('Performance marketing (% rev)', c.off.pm) + rowP('Store rent growth', c.off.gRent) + rowP('Store staff growth', c.off.gStaff))}
  ${tbl('D2C', rowP('Bags growth', c.d2c.gB) + rowP('Accessories growth', c.d2c.gA) + rowP('Gross margin', c.d2c.gm) + rowP('Packaging (% rev)', c.d2c.pack) + rowP('Payment gateway (% rev)', c.d2c.pg) + rowP('Shipping (% rev)', c.d2c.ship) + rowP('Performance marketing (% rev)', c.d2c.pm))}
  ${tbl('Common cost growth', rowP('Head office salaries', c.common.gSal) + rowP('Brand marketing', c.common.gBrand) + rowP('Technology and platform', c.common.gTech) + rowP('Other G&amp;A', c.common.gOth))}
  <div class="tablewrap"><table><thead><tr><th>Corporate</th><th>Value</th></tr></thead><tbody>
   <tr><td>Depreciation on existing assets p.a.</td><td>₹${c.dep0} cr</td></tr>
   <tr><td>Capex (machines), year bought, life</td><td>₹${c.capex} cr · ${YEARS[c.capexYear]} · ${c.life} years (depreciation from the year bought)</td></tr>
   <tr><td>Working capital (% of total revenue)</td><td>${pct(c.wcPct, 0)}</td></tr>
   <tr><td>Tax rate (no tax on a loss)</td><td>${pct(c.tax, 0)}</td></tr>
   <tr><td>Scenarios</td><td>Upside 1.2× · Downside 0.8× of base</td></tr>
  </tbody></table></div>
  <div class="toolbar"><button data-copy="${c.id}">Copy assumptions for Google Sheets</button><span class="pill" id="copied-${c.id}"></span></div>`;
}
function bindCopy(c) {
  const b = $(`[data-copy="${c.id}"]`); if (!b) return;
  b.onclick = async () => {
    const L = (l, a) => [l, ...a].join('\t');
    const t = [
      `${c.name} assumptions\tFY27\tFY28\tFY29\tFY30`,
      'Offline retail', L('Bags revenue growth', c.off.gB), L('Accessories revenue growth', c.off.gA), L('Gross margin', c.off.gm), L('Packaging', c.off.pack), L('Payment gateway', c.off.pg), L('Performance marketing', c.off.pm), L('Store rent growth', c.off.gRent), L('Store staff growth', c.off.gStaff),
      'D2C', L('Bags revenue growth', c.d2c.gB), L('Accessories revenue growth', c.d2c.gA), L('Gross margin', c.d2c.gm), L('Packaging', c.d2c.pack), L('Payment gateway', c.d2c.pg), L('Shipping', c.d2c.ship), L('Performance marketing', c.d2c.pm),
      'Common cost growth', L('Head office salaries', c.common.gSal), L('Brand marketing', c.common.gBrand), L('Technology and platform', c.common.gTech), L('Other G&A', c.common.gOth),
      'FY26 base', `Offline bags\t${c.off.bags0}`, `Offline accessories\t${c.off.acc0}`, `Store rent\t${c.off.rent0}`, `Store staff\t${c.off.staff0}`, `D2C bags\t${c.d2c.bags0}`, `D2C accessories\t${c.d2c.acc0}`,
      `Head office salaries\t${c.common.sal0}`, `Brand marketing\t${c.common.brand0}`, `Technology\t${c.common.tech0}`, `Other G&A\t${c.common.oth0}`,
      'Corporate', `Depreciation existing p.a.\t${c.dep0}`, `Capex\t${c.capex}`, `Capex year\t${YEARS[c.capexYear]}`, `Life (years)\t${c.life}`, `Working capital % revenue\t${c.wcPct}`, `Working capital FY26\t${c.wc0}`, `Tax rate\t${c.tax}`, `Debt\t${c.debt}`, `Interest rate\t${c.intRate}`, `Cash\t${c.cash}`, `Required return\t${c.r}`, `Terminal growth\t${c.g}`, `Founder ask\t${c.ask}`
    ].join('\n');
    try { await navigator.clipboard.writeText(t); $(`#copied-${c.id}`).textContent = 'Copied. Paste into a blank Google Sheet.'; }
    catch (e) { $(`#copied-${c.id}`).textContent = 'Copy blocked by the browser. Select the tables above instead.'; }
  };
}
function fullModel(m, el) {
  el.innerHTML = `<h3>Offline retail</h3><div id="fm-off"></div><h3>D2C</h3><div id="fm-d2c"></div><h3>Consolidated</h3><div id="fm-con"></div><h3>DCF (FCFE)</h3><div id="fm-dcf"></div>
  <div class="card">Enterprise value = ${fmt(m.v.equity)} + ${m.c.debt} − ${m.c.cash} = <b>${fmt(m.v.ev)}</b></div>`;
  mountSheet($('#fm-off'), () => offDef(m)); mountSheet($('#fm-d2c'), () => d2cDef(m));
  mountSheet($('#fm-con'), () => conDef(m)); mountSheet($('#fm-dcf'), () => dcfDef(m));
}

/* ---------------- Pages ---------------- */
const PAGES = [
  { id: 'home', t: 'Start here', g: 'Overview', icon: '★' },
  { id: 's0', t: 'Why valuation?', g: 'Sprints', n: 0 },
  { id: 's1', t: 'Discounting', g: 'Sprints', n: 1 },
  { id: 's2', t: 'Terminal value, NPV, IRR', g: 'Sprints', n: 2 },
  { id: 's3', t: 'Thinking like an investor', g: 'Sprints', n: 3 },
  { id: 's4', t: 'Forecast sheets', g: 'Sprints', n: 4 },
  { id: 's5', t: 'The DCF sheet', g: 'Sprints', n: 5 },
  { id: 's6', t: 'Extras: other methods', g: 'Sprints', n: 6 },
  { id: 'practice', t: 'Practice test: TrekLite', g: 'Exam prep', icon: 'P' },
  { id: 'test', t: 'Mock exam: Wanderly', g: 'Exam prep', icon: 'T' },
  { id: 'cheat', t: 'Cheat sheet (print)', g: 'Exam prep', icon: '✎' }
];
const done = () => store.get('done', {});
function nav() {
  const cur = location.hash.slice(1) || 'home', d = done();
  $('#topnav').innerHTML = PAGES.map(p => `<a href="#${p.id}" class="${cur === p.id ? 'active' : ''} ${d[p.id] ? 'done' : ''}">${p.n != null ? (d[p.id] ? '✓ ' : p.n + ' · ') : ''}${p.t}</a>`).join('');
  const a = $('#topnav a.active'); a && a.scrollIntoView({ block: 'nearest', inline: 'center' });
}
$('#theme').onclick = () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark'; store.set('theme', document.documentElement.dataset.theme);
};
/* Wraps each page's first h1 + lead into the centred hero with a black eyebrow pill. */
function hero(id) {
  const h = $('#app h1'); if (!h) return;
  const p = PAGES.find(x => x.id === id), lead = h.nextElementSibling && h.nextElementSibling.matches('p.lead') ? h.nextElementSibling : null;
  const eyebrow = id === 'home' ? 'Mesa School of Business · FMV · DCF exam' : p.n != null ? `Sprint ${String(p.n).padStart(2, '0')} of 06 · ${p.g}` : p.g;
  const box = document.createElement('header'); box.className = 'hero';
  box.innerHTML = `<div class="pill-dark">${eyebrow}</div><div class="byline">Built on <b>Cool Nomad</b> · exam <b>29 Oct, 4:00 PM</b> · Delta Classroom</div>`;
  h.replaceWith(box); box.append(h); lead && box.append(lead);
}
function footer(id) {
  const i = PAGES.findIndex(p => p.id === id), prev = PAGES[i - 1], next = PAGES[i + 1], d = done();
  return `<div class="next">${prev ? `<a class="btn" href="#${prev.id}">← ${prev.t}</a>` : '<span></span>'}
    <span>${PAGES[i].n != null ? `<button class="primary" id="markdone">${d[id] ? '✓ Completed' : 'Mark sprint complete'}</button>` : ''}
    ${next ? `<a class="btn" href="#${next.id}">${next.t} →</a>` : ''}</span></div>`;
}
function bindFooter(id) {
  const b = $('#markdone'); if (!b) return;
  b.onclick = () => { const d = done(); d[id] = !d[id]; store.set('done', d); render(); };
}

const R = {};

R.home = () => {
  const d = done(), n = PAGES.filter(p => p.n != null), k = n.filter(p => d[p.id]).length;
  const ms = new Date('2026-10-29T16:00:00+05:30') - new Date();
  const left = ms > 0 ? `${Math.floor(ms / 36e5)}h ${Math.floor(ms % 36e5 / 6e4)}m` : 'Exam day. You’ve got this.';
  return `<h1>Learn DCF from zero. Walk into the exam ready.</h1>
  <p class="lead">Seven short sprints built from your class sessions and the Cool Nomad model, then a practice test and a timed mock exam in the same format as Thursday’s paper.</p>
  <div class="grid3">
    <div class="stat"><b>${left}</b><span>Until the exam (29 Oct, 4:00 PM, Delta Classroom)</span></div>
    <div class="stat"><b>${k} / ${n.length}</b><span>Sprints completed</span></div>
    <div class="stat"><b>50 marks · 2.5 h</b><span>Build the model + fill in the blanks</span></div>
  </div>
  <div class="progress" style="margin:14px 0"><i style="width:${k / n.length * 100}%"></i></div>
  <h2>What the exam looks like</h2>
  <div class="card"><ul class="tight">
    <li>You get an Excel file by email. You download it and work in <b>Google Sheets</b> offline. No AI, no other tabs, no internet.</li>
    <li>Forecast sheets (Offline, D2C, Consolidated) and the DCF sheet have <b>blanks</b>. You type <b>formulas</b> into them.</li>
    <li>Then you answer <b>fill-in-the-blank questions</b> from your model (50 marks).</li>
    <li><b>Printed or handwritten cheat sheets are allowed.</b> Print the cheat sheet page from this site.</li>
    <li>Nothing beyond what was taught in class. It’s the Cool Nomad structure with a different case and different numbers.</li>
  </ul></div>
  <h2>The whole DCF on one line</h2>
  <div class="flow"><span>Forecast revenue</span><em>→</em><span>Costs &amp; margins</span><em>→</em><span>EBITDA</span><em>→</em><span>PAT</span><em>→</em><span>+ Depreciation − ΔWC − Capex = FCFE</span><em>→</em><span>Terminal value</span><em>→</em><span>Discount to today</span><em>→</em><span>Equity value</span><em>→</em><span>EV · NPV · IRR · Scenarios</span></div>
  <h2>Suggested plan for tonight</h2>
  <div class="card"><ol class="tight">
    <li><b>Sprints 0–3</b> (≈35 min): concepts. Skip Sprint 0 if you’re short on time.</li>
    <li><b>Sprints 4–5</b> (≈45 min): the actual sheet, row by row. Use <i>Drill</i> mode until every cell turns green.</li>
    <li><b>Practice test</b> (≈45 min): build TrekLite in Google Sheets with hints on.</li>
    <li><b>Mock exam</b> (timed): Wanderly, no hints, scored out of 50.</li>
    <li>Print the <b>cheat sheet</b>.</li>
  </ol></div>
  <h2>What is in this guide</h2>
  <div class="index">${PAGES.filter(p => p.id !== 'home').map(p => `<a href="#${p.id}" class="${p.id === 'test' ? 'act' : ''}"><span class="n">${p.n != null ? 'S' + String(p.n).padStart(2, '0') : p.icon}</span><span class="t">${p.t}</span><span class="tag ${d[p.id] ? 'ok' : ''}">${d[p.id] ? 'Done' : p.g === 'Sprints' ? 'Learn' : p.id === 'cheat' ? 'Print' : 'Exam'}</span><span class="ar">→</span></a>`).join('')}</div>
  <section class="outro"><h2>Seven sprints. One model. Fifty marks.</h2><p>Start at Sprint 0 and drill every cell until it turns green.</p><a class="btn primary" href="#s0">Start Sprint 0 →</a></section>`;
};

/* Sprint 0 */
const Q0 = [
  { q: 'An investor is “influenced by the past, driven by the future, convinced by…”', o: ['the market size', 'founder affability', 'the valuation multiple'], a: 1, e: 'In class: past performance → future potential → founder affability (how easy and warm the founder is to work with).' },
  { q: 'Pre-money ₹10 cr, 10 lakh shares, new investor puts in ₹2 cr. How many new shares are issued?', o: ['2 lakh', '1.67 lakh', '2.4 lakh'], a: 0, e: 'Price per share = 10 cr ÷ 10 lakh = ₹100. New shares = 2 cr ÷ 100 = 2 lakh. Post-money = ₹12 cr.' },
  { q: 'According to your professor, valuation is…', o: ['80% science, 20% art', '80% art, 20% science', '100% maths'], a: 1, e: 'The methods (DCF, relative…) are the 20% science. Judgment and intuition are the 80% art.' }
];
R.s0 = () => `<h1>Sprint 0 · Why valuation exists</h1>
  <p class="lead">Where DCF fits. About 5 minutes.</p>
  <div class="grid2">
    <div class="card"><b>Functional finance</b> (inward-looking)<br>Runs the P&amp;L, balance sheet and cash flow: budgets, receivables, payables, inventory. It helps the company grow <i>internally</i>.</div>
    <div class="card"><b>Core finance</b> (outward-looking)<br>When internal growth saturates: raising money, M&amp;A, investments. Everything starts with one question: <b>what is the company worth?</b></div>
  </div>
  <h2>How an investor decides</h2>
  <div class="flow"><span>Influenced by the <b>past</b><br><small>sector &amp; business growth, product feedback</small></span><em>→</em><span>Driven by the <b>future</b><br><small>how big can the sector and company get</small></span><em>→</em><span>Convinced by <b>founder affability</b><br><small>warm, receptive, easy to work with</small></span></div>
  <h2>Cap table: why the valuation number matters</h2>
  <div class="card"><div class="inputs">
    <label class="f">Pre-money valuation (₹ cr)<input id="ct-pre" type="number" value="10"></label>
    <label class="f">Existing shares (lakh)<input id="ct-sh" type="number" value="10"></label>
    <label class="f">Founder shares (lakh)<input id="ct-f" type="number" value="8"></label>
    <label class="f">New investment (₹ cr)<input id="ct-inv" type="number" value="2"></label>
  </div><div id="ct-out"></div></div>
  <div class="callout">Primary issue = <b>new</b> shares, so total shares go up and everyone is diluted. Post-money = pre-money + cash in. Price per share is the same before and after.</div>
  <h2>Who decides the number?</h2>
  <div class="card">The founder and the investor, in the <b>decision box</b>. Investor starts low (₹5 cr) and moves up (₹8 cr). Founder starts high (₹15 cr) and moves down (₹12 cr). They meet in the middle, at ₹10 cr.<br><br>
  Valuation = <b>80% art, 20% science</b>. The science is the methods: <b>DCF</b>, relative valuation, exit-pegged, sum-of-the-parts, First Chicago, Berkus, all compared on a football field chart. This exam tests <b>DCF only</b>.</div>
  <div class="callout warn">Your professor’s view: DCF suits <b>mature, stable</b> companies (e.g. HUL), because the hard part is predicting future cash flows. It is also legally required for valuation reports. Pick “a good business at a reasonable valuation”. Valuation is an outcome: build the business and let the valuation follow.</div>
  ${quiz('q0', Q0)}${footer('s0')}`;
R.s0.after = () => {
  const calc = () => {
    const pre = +$('#ct-pre').value, sh = +$('#ct-sh').value, fo = +$('#ct-f').value, inv = +$('#ct-inv').value;
    const price = pre * 1e7 / (sh * 1e5), ns = inv * 1e7 / price / 1e5, tot = sh + ns;
    $('#ct-out').innerHTML = `<div class="tablewrap"><table><thead><tr><th>Shareholder</th><th>Before (lakh)</th><th>%</th><th>After (lakh)</th><th>%</th></tr></thead><tbody>
      <tr><td>Founder</td><td>${fmt(fo)}</td><td>${pct(fo / sh)}</td><td>${fmt(fo)}</td><td>${pct(fo / tot)}</td></tr>
      <tr><td>Existing VC</td><td>${fmt(sh - fo)}</td><td>${pct((sh - fo) / sh)}</td><td>${fmt(sh - fo)}</td><td>${pct((sh - fo) / tot)}</td></tr>
      <tr><td>New investor</td><td>–</td><td>–</td><td>${fmt(ns)}</td><td>${pct(ns / tot)}</td></tr>
      <tr class="sub"><td>Total</td><td>${fmt(sh)}</td><td>100%</td><td>${fmt(tot)}</td><td>100%</td></tr></tbody></table></div>
      Price per share ₹${fmt(price)} · New shares ${fmt(ns)} lakh · Post-money ₹${fmt(pre + inv)} cr`;
  };
  $$('#ct-pre,#ct-sh,#ct-f,#ct-inv').forEach(i => i.oninput = calc); calc(); bindQuiz('q0', Q0);
};

/* Sprint 1 */
const Q1 = [
  { q: 'You need ₹144 in 2 years and want 20% a year. What do you pay today?', o: ['₹120', '₹100', '₹115.2'], a: 1, e: '144 ÷ 1.2 ÷ 1.2 = 100. Equivalently 144 ÷ 1.2².' },
  { q: 'Discount factor for year 3 at 20%?', o: ['0.6000', '0.5787', '0.8333'], a: 1, e: '1 ÷ 1.2³ = 1 ÷ 1.728 = 0.5787.' },
  { q: 'Higher risk means the investor’s required return is…', o: ['lower', 'higher', 'unchanged'], a: 1, e: 'Govt bonds 3–4% · FDs 6–8% · mutual funds 10–12% · equity 12–15% · startups 20–30%. More risk, more required reward.' },
  { q: 'In Sheets, why write $C$4 in the discount factor formula?', o: ['To format as currency', 'To lock the rate cell when dragging across', 'To convert to %'], a: 1, e: 'The $ “freezes” the column/row reference so every year points at the same required-return cell.' }
];
R.s1 = () => `<h1>Sprint 1 · Discounting</h1>
  <p class="lead">The heart of DCF: what is future money worth today? About 10 minutes.</p>
  <h2>Step 1: know your required return</h2>
  <div class="tablewrap"><table><thead><tr><th>Option</th><th>Risk</th><th>Return expected</th></tr></thead><tbody>
  <tr><td>Government bonds</td><td>Very low</td><td>3–4%</td></tr><tr><td>Fixed deposits</td><td>Low</td><td>6–8%</td></tr>
  <tr><td>Mutual funds</td><td>Medium</td><td>10–12%</td></tr><tr><td>Listed equity</td><td>Higher</td><td>12–15%</td></tr>
  <tr class="sub"><td>Startups / private companies</td><td>Highest</td><td>20–30%</td></tr></tbody></table></div>
  <p>In class, Kaku (the investor) wants <b>20%</b>. This rate is called the <b>discount rate</b> or required return.</p>
  <h2>Step 2: compounding (money growing forward)</h2>
  <div class="card">₹100 at 20%, reinvested: <code>100 → 120 → 144 → 172.8</code>. You earn 72.8 over 3 years instead of 60 if you withdrew the 20 each year. That’s the power of compounding (the rice on a chessboard story).<br>
  As a formula: <code>FV = PV × (1 + r)ⁿ</code></div>
  <h2>Step 3: discounting (the same thing in reverse)</h2>
  <div class="card">If a business pays ₹120 in 1 year, ₹144 in 2 years and ₹172.8 in 3 years, a 20% investor pays <b>₹100 for each</b> today.<br>
  <code>PV = FV ÷ (1 + r)ⁿ</code> &nbsp;=&nbsp; <code>FV × 1/(1 + r)ⁿ</code> &nbsp;← that <code>1/(1+r)ⁿ</code> is the <b>discount factor</b>.</div>
  <div class="card"><b>Try it</b><div class="inputs">
    <label class="f">Future cash (₹)<input id="d-fv" type="number" value="400"></label>
    <label class="f">Rate %<input id="d-r" type="number" value="20"></label>
    <label class="f">Years<input id="d-n" type="number" value="3"></label></div><div id="d-out"></div></div>
  <h2>Class example: a business with cash flows 200, 300, 400</h2>
  <div class="tablewrap"><table><thead><tr><th>Year</th><th>Cash flow</th><th>Discount factor @20%</th><th>Present value</th></tr></thead><tbody>
  <tr><td>1</td><td>200</td><td>0.8333</td><td>166.7</td></tr><tr><td>2</td><td>300</td><td>0.6944</td><td>208.3</td></tr><tr><td>3</td><td>400</td><td>0.5787</td><td>231.5</td></tr>
  <tr class="sub"><td>Total (3 years only)</td><td></td><td></td><td>606.5</td></tr></tbody></table></div>
  <div class="callout">Check: 231.5 × 1.2 × 1.2 × 1.2 = 400. Paying 231.5 today for 400 in 3 years earns exactly 20% a year.</div>
  ${quiz('q1', Q1)}${footer('s1')}`;
R.s1.after = () => {
  const calc = () => {
    const fv = +$('#d-fv').value, r = +$('#d-r').value / 100, n = +$('#d-n').value, df = 1 / Math.pow(1 + r, n), pv = fv * df;
    let grow = [pv]; for (let i = 0; i < n; i++) grow.push(grow[i] * (1 + r));
    $('#d-out').innerHTML = `Discount factor = 1 ÷ (1 + ${r})<sup>${n}</sup> = <b>${fmt(df, 4)}</b> · PV = ${fv} × ${fmt(df, 4)} = <b>₹${fmt(pv)}</b><br><span class="fb">Proof (grow it back): ${grow.map(x => fmt(x)).join(' → ')}</span><br>Sheets: <code>=${fv}/(1+${r})^${n}</code>`;
  };
  $$('#d-fv,#d-r,#d-n').forEach(i => i.oninput = calc); calc(); bindQuiz('q1', Q1);
};

/* Sprint 2 */
const Q2 = [
  { q: 'Terminal value is calculated with the cash flow of…', o: ['the first forecast year', 'the last forecast year', 'the average year'], a: 1, e: 'TV = CF<sub>last year</sub> × (1+g) ÷ (r − g). In Cool Nomad that’s FY30 FCFE.' },
  { q: 'The terminal value in Cool Nomad sits in FY30. Which discount factor do you use?', o: ['FY30 (4 years)', 'FY31 (5 years)', 'None, TV is already today’s value'], a: 0, e: 'TV is the value of FY31→∞ standing at the end of FY30, so it is discounted 4 years, like FY30’s cash flow.' },
  { q: 'Investor value 2,226. Founder asks 3,000. NPV?', o: ['+774 → invest', '−774 → no deal at that price', '0'], a: 1, e: 'NPV = investor value − price = 2,226 − 3,000 = −774. Paying more than it’s worth to you means a return below 20%.' },
  { q: 'You pay ₹90 today for ₹120 in one year. IRR?', o: ['20%', '33.3%', '25%'], a: 1, e: '120 ÷ 90 − 1 = 33.3%. Pay less than your value → IRR above the required return.' },
  { q: 'If you pay exactly the DCF value, the IRR equals…', o: ['0%', 'the required return (discount rate)', 'the terminal growth rate'], a: 1, e: 'Zero NPV ⇔ IRR = required return.' }
];
R.s2 = () => `<h1>Sprint 2 · Terminal value, NPV, IRR</h1>
  <p class="lead">A business lives forever, so you value it forever. About 10 minutes.</p>
  <h2>Terminal value (TV)</h2>
  <div class="card">You forecast a few years explicitly, then capture <b>everything after</b> with one number standing at the end of the last forecast year:
  <p style="font-size:18px;text-align:center"><code>TV = CF<sub>last</sub> × (1 + g) ÷ (r − g)</code></p>
  <ul class="tight"><li><b>g</b> = terminal growth rate, forever. Keep it low single digits (3–5%). It must be <b>below r</b>.</li>
  <li>TV sits in the <b>last forecast year</b>, so discount it with that year’s factor.</li>
  <li>In Sheets the brackets matter: <code>=F14*(1+C5)/(C4-C5)</code></li></ul></div>
  <h2>Full mini-DCF calculator</h2>
  <div class="card"><div class="toolbar"><button id="ex1">Class example 1 (200/300/400, 20%, g 5%)</button><button id="ex2">Class example 2 (500/600/800, 30%, g 7%)</button></div>
  <div class="inputs">
    <label class="f">CF year 1<input id="m-1" type="number" value="200"></label>
    <label class="f">CF year 2<input id="m-2" type="number" value="300"></label>
    <label class="f">CF year 3<input id="m-3" type="number" value="400"></label>
    <label class="f">Required return %<input id="m-r" type="number" value="20"></label>
    <label class="f">Terminal growth %<input id="m-g" type="number" value="5"></label></div><div id="m-out"></div></div>
  <h2>NPV: should the deal happen?</h2>
  <div class="card"><code>NPV = Investor’s value − Founder’s ask</code>
  <ul class="tight"><li>Ask 3,000 vs value 2,226 → NPV −774 → <b>no deal</b> (return &lt; 20%).</li>
  <li>Ask 2,226 → NPV 0 → deal at exactly 20%.</li>
  <li>Ask 2,000 → NPV +226 → <b>great deal</b> (return &gt; 20%). The investor never reveals 2,226.</li></ul></div>
  <h2>IRR: the return you actually get</h2>
  <div class="card">IRR is the discount rate that makes NPV = 0 at the price you <b>actually pay</b>. In Sheets: <code>=IRR(range)</code>, where the first cell is <b>−price</b> (money out) and the last year includes <b>FCF + TV</b>.<br><br>
  <b>Cool Nomad live:</b> drag the deal price.<br><input id="irr-p" type="range" min="150" max="350" value="300" style="width:100%"><div id="irr-out"></div></div>
  ${quiz('q2', Q2)}${footer('s2')}`;
R.s2.after = () => {
  const calc = () => {
    const cf = [1, 2, 3].map(i => +$('#m-' + i).value), r = +$('#m-r').value / 100, g = +$('#m-g').value / 100;
    const df = [1, 2, 3].map(n => 1 / Math.pow(1 + r, n)), pv = cf.map((c, i) => c * df[i]);
    const tv = cf[2] * (1 + g) / (r - g), pvtv = tv * df[2], tot = pv.reduce((a, b) => a + b, 0) + pvtv;
    $('#m-out').innerHTML = `<div class="tablewrap"><table><thead><tr><th></th><th>Y1</th><th>Y2</th><th>Y3</th></tr></thead><tbody>
      <tr><td>Cash flow</td>${cf.map(x => `<td>${fmt(x)}</td>`).join('')}</tr>
      <tr><td>Discount factor</td>${df.map(x => `<td>${fmt(x, 4)}</td>`).join('')}</tr>
      <tr><td>Present value</td>${pv.map(x => `<td>${fmt(x)}</td>`).join('')}</tr>
      <tr><td>Terminal value (in Y3)</td><td></td><td></td><td>${fmt(tv)}</td></tr>
      <tr><td>PV of terminal value</td><td></td><td></td><td>${fmt(pvtv)}</td></tr>
      <tr class="sub"><td>Value today</td><td colspan="3">${fmt(tot)}</td></tr></tbody></table></div>
      TV = ${cf[2]} × (1 + ${g}) ÷ (${r} − ${g}) = ${fmt(tv)} · PV of TV = ${fmt(tv)} × ${fmt(df[2], 4)} = ${fmt(pvtv)}
      ${r <= g ? '<div class="callout bad">r must be greater than g, otherwise the formula breaks.</div>' : ''}`;
  };
  const set = (a, r, g) => { [1, 2, 3].forEach((i, k) => $('#m-' + i).value = a[k]); $('#m-r').value = r; $('#m-g').value = g; calc(); };
  $('#ex1').onclick = () => set([200, 300, 400], 20, 5); $('#ex2').onclick = () => set([500, 600, 800], 30, 7);
  $$('#m-1,#m-2,#m-3,#m-r,#m-g').forEach(i => i.oninput = calc); calc();
  const irrCalc = () => {
    const p = +$('#irr-p').value, f = [-p, ...CN.v.flows.slice(1)], i = irr(f), npv = CN.v.equity - p;
    $('#irr-out').innerHTML = `Price ₹${p} cr · DCF value ₹${fmt(CN.v.equity)} cr · NPV <b style="color:var(${npv >= 0 ? '--good' : '--bad'})">${fmt(npv)}</b> · IRR <b>${pct(i)}</b> ${i >= CN.c.r - 1e-4 ? '✅ ≥ 20% required' : '❌ below 20% required'}`;
  };
  $('#irr-p').oninput = irrCalc; irrCalc(); bindQuiz('q2', Q2);
};

/* Sprint 3 */
const RISKS = [
  ['Ad-hoc revenue dependence (≈66% of revenue by 2028, no contracts)', 1],
  ['Client concentration (two clients ≈ 69% of contract manufacturing)', 1],
  ['Plant employee attrition at 44%', 1],
  ['Top-management uncertainty (CFO resigned, CBO appointed late)', 1],
  ['Contracts expiring in Dec 2028 (optional, your judgment)', 0]
];
const Q3 = [
  { q: 'Why did the class take only 30% of forecast ad-hoc revenue?', o: ['It had lower margins', 'It is not contracted, so it’s uncertain (conservative valuation)', 'The founder asked for it'], a: 1, e: 'Contracted revenue is accepted 100%. One-off, uncontracted revenue is cut because investors value conservatively.' },
  { q: 'Base return 20%, four risk areas at +1% each. Discount rate?', o: ['20%', '24%', '28%'], a: 1, e: '20 + 1 + 1 + 1 + 1 = 24%.' },
  { q: 'For historical years, do you apply the 30% haircut?', o: ['Yes', 'No, history stays as reported'], a: 1, e: 'Historicals are audited actuals. Only the future forecast is adjusted.' }
];
R.s3 = () => `<h1>Sprint 3 · Thinking like an investor</h1>
  <p class="lead">The Nurture Lab case: turning messy data (founder email, contracts, board minutes) into a valuation. About 10 minutes.</p>
  <div class="card"><b>The business:</b> an ODM (original design manufacturer) for beauty brands. It designs and makes products for clients (contract manufacturing) and also sells its own <b>private label</b>. Plus <b>ad-hoc</b> one-off orders.</div>
  <h2>1 · Question the revenue</h2>
  <div class="tablewrap"><table><thead><tr><th>Stream</th><th>Evidence</th><th>What we accept</th></tr></thead><tbody>
  <tr><td>Contract manufacturing (8 clients)</td><td>Signed contracts</td><td>100% of forecast</td></tr>
  <tr><td>Private label (5 retailers)</td><td>Sale contracts</td><td>100% of forecast</td></tr>
  <tr><td>Ad-hoc = Total − CM − PL</td><td>Nothing signed</td><td><b>30%</b> of forecast (history unchanged)</td></tr></tbody></table></div>
  <h2>2 · Margins (from board minutes)</h2>
  <div class="card">CM1: contract manufacturing <b>9%</b>, private label <b>58%</b>, ad-hoc <b>15%</b>. Performance marketing = <b>40% of private-label revenue</b> → CM2. Then subtract fixed expenses → profit. Assume the P&amp;L is all cash: <b>profit = cash flow</b>.</div>
  <h2>3 · Build the discount rate (try it)</h2>
  <div class="card"><div>Base required return: <b>20%</b>. Add 1% for each risk you believe in:</div>
  ${RISKS.map((r, i) => `<label style="display:block;margin:6px 0"><input type="checkbox" class="rk" ${r[1] ? 'checked' : ''}> ${r[0]}</label>`).join('')}
  <div class="inputs"><label class="f">Terminal growth %<input id="n-g" type="number" value="5"></label></div><div id="n-out"></div></div>
  <div class="callout warn">There’s no scientific answer for the haircut, the +1% steps or g. It’s investor temperament. The exam gives you these numbers. This sprint is about understanding <b>why</b> they exist.</div>
  ${quiz('q3', Q3)}${footer('s3')}`;
R.s3.after = () => {
  const cf = [8.80, 18.95, 32.75];
  const calc = () => {
    const r = .20 + $$('.rk').filter(x => x.checked).length * .01, g = +$('#n-g').value / 100;
    const tv = cf[2] * (1 + g) / (r - g), pv = cf.map((c, i) => c / Math.pow(1 + r, i + 1)), pvtv = tv / Math.pow(1 + r, 3);
    $('#n-out').innerHTML = `Discount rate = <b>${pct(r, 0)}</b><br>Cash flows FY26–28: ${cf.join(', ')} → PV ${pv.map(x => fmt(x)).join(', ')}<br>
      TV = 32.75 × (1 + ${g}) ÷ (${fmt(r, 2)} − ${g}) = ${fmt(tv)} → PV ${fmt(pvtv)}<br>
      <b style="font-size:18px">Value ≈ ₹${fmt(pv.reduce((a, b) => a + b, 0) + pvtv, 1)} cr</b> <span class="pill">class answer at 24% / 5%: ≈ ₹131 cr</span>`;
  };
  $$('.rk').forEach(x => x.onchange = calc); $('#n-g').oninput = calc; calc(); bindQuiz('q3', Q3);
};

/* Sprint 4 */
R.s4 = () => `<h1>Sprint 4 · The forecast sheets</h1>
  <p class="lead">Cool Nomad, exactly as in the class file, with the same rows, columns and formulas. In the exam you type these formulas into blanks. About 20 minutes.</p>
  <h2>Six formula patterns cover every cell</h2>
  <div class="tablewrap"><table><thead><tr><th>Pattern</th><th>Used for</th><th>Example (FY27 = column F)</th></tr></thead><tbody>
  <tr><td>Grow last year</td><td>Revenue, rent, staff, common costs</td><td><code>=E6*(1+Assumptions!C6)</code></td></tr>
  <tr><td>Revenue × (1 − GM%)</td><td>COGS</td><td><code>=F8*(1-Assumptions!C8)</code></td></tr>
  <tr><td>Revenue × %</td><td>Packaging, gateway, shipping, perf. marketing</td><td><code>=F$8*Assumptions!C9</code></td></tr>
  <tr><td>Subtract down</td><td>GM, CM1, CM2, contribution, EBITDA, EBIT, PBT, PAT</td><td><code>=F10-F11-F12</code></td></tr>
  <tr><td>Link across sheets</td><td>Consolidated, DCF inputs</td><td><code>='Offline retail'!F8</code></td></tr>
  <tr><td>Locked constant ($)</td><td>Depreciation, interest, tax rate</td><td><code>=MAX(0,F20*Assumptions!$C$41)</code></td></tr></tbody></table></div>
  <div class="callout">Column map: forecast sheets use <b>F, G, H, I</b> for FY27–FY30, but the Assumptions sheet uses <b>C, D, E, F</b>. Your formula in F points at Assumptions column C. Write it once in F, then drag right.</div>
  <h2>Offline retail</h2><div id="sh-off"></div>
  <h2>D2C &amp; App</h2><div id="sh-d2c"></div>
  <h2>Consolidated</h2><div id="sh-con"></div>
  <div class="callout warn"><b>Classic traps:</b> rent and staff as % of revenue (wrong: they’re fixed costs, grown in ₹) · forgetting depreciation jumps by capex ÷ life from the capex year · tax still pointing at EBIT after adding interest · not locking $C$34 / $C$41 before dragging.</div>
  ${footer('s4')}`;
R.s4.after = () => { mountSheet($('#sh-off'), () => offDef(CN)); mountSheet($('#sh-d2c'), () => d2cDef(CN)); mountSheet($('#sh-con'), () => conDef(CN)); };

/* Sprint 5 */
const Q5 = [
  { q: 'Why add back depreciation to PAT?', o: ['It’s a tax refund', 'It reduced profit but no cash left the business', 'Because capex is added back'], a: 1, e: 'Depreciation is a non-cash expense.' },
  { q: 'Working capital was ₹27 cr in FY26 and is 18% of FY27 revenue of ₹217.2 cr. Cash outflow in FY27?', o: ['39.1', '12.1', '27.0'], a: 1, e: 'WC FY27 = 0.18 × 217.2 = 39.1. Only the increase (39.1 − 27 = 12.1) is new cash put in.' },
  { q: 'Enterprise value =', o: ['Equity − debt + cash', 'Equity + debt − cash', 'Equity + debt + cash'], a: 1, e: '220.9 + 40 − 18 = 242.9. Debt − cash is called net debt.' },
  { q: 'Why is the FCFE here “for equity” only?', o: ['Interest has already been paid out, so what’s left belongs to shareholders', 'Debt is ignored', 'Tax is not paid'], a: 0, e: 'PAT is after interest, so the cash flows (and the value) belong to equity holders.' }
];
R.s5 = () => {
  const v = CN.v;
  return `<h1>Sprint 5 · The DCF (FCFE) sheet</h1>
  <p class="lead">In the practice file this sheet is completely blank. Fill it in, in this order. About 25 minutes.</p>
  <div class="flow"><span>PAT</span><em>+</em><span>Depreciation</span><em>=</em><span>Cash profit</span><em>−</em><span>ΔWC</span><em>−</em><span>Capex</span><em>=</em><span>FCFE</span></div>
  <div id="sh-dcf"></div>
  <h2>Enterprise value (done in class on top of the sheet)</h2>
  <div class="card">Balance sheet view: <i>Equity + Debt</i> fund <i>Fixed assets + Working capital + Cash</i>. The DCF gives the equity value. To value the whole business add debt. Cash isn’t an operating asset (it could be used to repay debt right away), so subtract it.
  <div class="tablewrap"><table><tbody>
  <tr><td>Equity value (DCF)</td><td>${fmt(v.equity)}</td></tr><tr><td>Add: debt</td><td>${CN.c.debt}</td></tr><tr><td>Less: cash</td><td>(${CN.c.cash})</td></tr>
  <tr class="sub"><td>Enterprise value</td><td>${fmt(v.ev)}</td></tr><tr><td>Net debt = debt − cash</td><td>${fmt(v.netDebt)}</td></tr></tbody></table></div></div>
  <h2>Sensitivity (from the investor’s email: r 18/20/22%, g 4/5/6%)</h2>
  <div class="tablewrap"><table><thead><tr><th>r \\ g</th><th>4%</th><th>5%</th><th>6%</th></tr></thead><tbody>
  ${v.sens.map((row, i) => `<tr><td>${[18, 20, 22][i]}%</td>${row.map((x, j) => `<td ${i === 1 && j === 1 ? 'style="font-weight:700"' : ''}>${fmt(x, 1)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="fb">Higher r → lower value. Higher g → higher value. The terminal value is ${pct(v.pvTV / v.equity, 0)} of the total, which is why your professor distrusts DCF.</p>
  <h2>Check figures: Cool Nomad</h2>
  <div class="grid3">
    <div class="stat"><b>${fmt(v.tv, 1)}</b><span>Terminal value</span></div>
    <div class="stat"><b>${fmt(v.equity, 1)}</b><span>Equity value</span></div>
    <div class="stat"><b>${fmt(v.ev, 1)}</b><span>Enterprise value</span></div>
    <div class="stat"><b>${fmt(v.npv, 1)}</b><span>NPV vs ₹300 cr ask</span></div>
    <div class="stat"><b>${pct(v.irr)}</b><span>IRR at ₹300 cr</span></div>
    <div class="stat"><b>${fmt(v.upside, 1)} / ${fmt(v.downside, 1)}</b><span>Upside / downside</span></div>
  </div>
  ${quiz('q5', Q5)}${footer('s5')}`;
};
R.s5.after = () => { mountSheet($('#sh-dcf'), () => dcfDef(CN)); bindQuiz('q5', Q5); };

/* Sprint 6 */
R.s6 = () => `<h1>Sprint 6 · Extras: other valuation methods</h1>
  <p class="lead">Not tested in this exam, but useful context (and in the case file). About 5 minutes.</p>
  <h2>Relative valuation</h2>
  <div class="card">Value a company off what the market pays for similar ones: <b>Market cap ÷ revenue</b> (revenue multiple) or <b>P/E</b> (price ÷ profit). Use a revenue multiple when the company is profitable but margins aren’t at industry level yet. A P/E on tiny profits would undervalue it.</div>
  <h2>Sum of the parts (SOTP)</h2>
  <div class="card">Different parts behave differently, so they get different multiples. Class example (Prop): enterprise ₹700 cr × 4× + government ₹300 cr × 2× = <b>₹3,400 cr</b>.<br><br>
  <b>Cool Nomad rule:</b> chosen multiple on bags revenue, 0.8 × that multiple on accessories (more crowded category).
  <div class="inputs"><label class="f">Multiple (×)<select id="sp-m"><option value="3.4">3.4× Safari / Tapestry</option><option value="2.3">2.3× VIP</option><option value="0.6">0.6× Samsonite</option></select></label>
  <label class="f">Bags revenue (₹ cr)<input id="sp-b" type="number" value="113"></label><label class="f">Accessories revenue (₹ cr)<input id="sp-a" type="number" value="37"></label></div><div id="sp-out"></div>
  <p class="fb">Defaults are FY26 actuals (113 / 37). Use whichever year your professor specifies.</p></div>
  <h2>The rest, in one line each</h2>
  <div class="card"><ul class="tight">
  <li><b>Exit-pegged:</b> estimate the exit value in N years, then work back at your target return (e.g. 30%) to today’s price.</li>
  <li><b>First Chicago:</b> blend several scenarios/methods into one value.</li>
  <li><b>Berkus:</b> value idea-stage companies on idea potential and founder potential.</li>
  <li><b>Football field:</b> chart every method’s range side by side to settle on a value.</li></ul></div>
  ${footer('s6')}`;
R.s6.after = () => {
  const calc = () => { const m = +$('#sp-m').value, b = +$('#sp-b').value, a = +$('#sp-a').value;
    $('#sp-out').innerHTML = `${b} × ${m} + ${a} × ${fmt(m * .8)} = <b>₹${fmt(b * m + a * m * .8, 1)} cr</b>`; };
  $$('#sp-m,#sp-b,#sp-a').forEach(i => i.oninput = calc); calc();
};

/* Practice & test */
function qRows(mode, m, ans) {
  return QS.map(([q, get, hint, kind], i) => {
    const t = get(m), a = ans[i] ?? '', graded = mode === 'review';
    const ok = close(a, t, kind);
    const show = kind === 'pct' ? fmt(t * 100, 2) + '%' : kind === 'df' ? fmt(t, 4) : fmt(t);
    return `<div class="qrow"><span class="num">${i + 1}.</span><span>${q} <span class="pill">2 marks</span></span>
      <input data-q="${i}" value="${a}" placeholder="${kind === 'pct' ? '%' : '₹ cr'}" ${graded ? 'disabled' : ''} class="${graded ? (ok ? 'ok' : 'no') : ''}">
      <span class="acts">${mode === 'practice' ? `<button data-chk="${i}">Check</button><button data-hint="${i}">Hint</button>` : ''}
      ${graded ? `<span class="pill ${ok ? 'good' : 'bad'}">${ok ? '✓' : '✗ ' + show}</span>` : ''}</span>
      <div class="hint" id="h-${i}" ${graded ? '' : 'hidden'}>${graded ? 'Answer ' + show + ' · ' : ''}How: ${hint}</div></div>`;
  }).join('');
}
const PM = run(CASES.practice), TM = run(CASES.test);
R.practice = () => `<h1>Practice test · ${PM.c.name}</h1>
  <p class="lead">Same structure as Cool Nomad, new numbers. Build it in Google Sheets (copy the Cool Nomad practice file and swap the assumptions), then enter your answers. Hints are on. Answers are saved in this browser.</p>
  ${caseBrief(PM.c)}
  <h2>Questions (50 marks)</h2>
  <div class="card" id="pq">${qRows('practice', PM, store.get('pans', {}))}</div>
  <div class="toolbar"><button id="p-score" class="primary">Score me</button><button id="p-reset">Clear answers</button><button id="p-key">Show full model (answer key)</button><span id="p-res" class="pill"></span></div>
  <div id="p-model"></div>${footer('practice')}`;
R.practice.after = () => {
  bindCopy(PM.c);
  const ans = store.get('pans', {});
  $$('#pq input').forEach(inp => inp.oninput = () => { ans[inp.dataset.q] = inp.value; store.set('pans', ans); inp.classList.remove('ok', 'no'); });
  $$('[data-chk]').forEach(b => b.onclick = () => { const i = +b.dataset.chk, inp = $(`#pq input[data-q="${i}"]`); inp.classList.remove('ok', 'no'); inp.classList.add(close(inp.value, QS[i][1](PM), QS[i][3]) ? 'ok' : 'no'); });
  $$('[data-hint]').forEach(b => b.onclick = () => { const h = $('#h-' + b.dataset.hint); h.hidden = !h.hidden; });
  $('#p-score').onclick = () => { let s = 0; QS.forEach((q, i) => { const inp = $(`#pq input[data-q="${i}"]`), ok = close(inp.value, q[1](PM), q[3]); inp.classList.remove('ok', 'no'); inp.classList.add(ok ? 'ok' : 'no'); if (ok) s += 2; }); $('#p-res').textContent = `Score: ${s} / 50`; };
  $('#p-reset').onclick = () => { store.set('pans', {}); render(); };
  $('#p-key').onclick = () => fullModel(PM, $('#p-model'));
};

let timerInt;
R.test = () => {
  const st = store.get('test', {});
  const m = TM;
  if (!st.start) return `<h1>Mock exam · ${m.c.name}</h1>
    <p class="lead">Timed, no hints, scored out of 50 at the end, just like Thursday. Read the case, build the model in Google Sheets, then fill in the answers.</p>
    <div class="card"><div class="inputs"><label class="f">Time limit<select id="t-len"><option value="150">2 h 30 min (real exam)</option><option value="90">1 h 30 min</option><option value="60" selected>1 h (speed run)</option></select></label></div>
    <button class="primary" id="t-go">Start the clock</button></div>${footer('test')}`;
  const graded = !!st.submitted;
  return `<h1>Mock exam · ${m.c.name}</h1>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <span class="timer" id="t-clock">${graded ? `Score: ${st.score} / 50` : ''}</span>
      <span>${graded ? '<button id="t-again">Retake</button>' : '<button class="primary" id="t-sub">Submit and grade</button>'}</span></div>
    ${caseBrief(m.c)}
    <h2>Answer sheet (50 marks)</h2>
    <div class="card" id="tq">${qRows(graded ? 'review' : 'test', m, st.ans || {})}</div>
    ${graded ? '<div class="toolbar"><button id="t-key">Show full model (answer key)</button></div><div id="t-model"></div>' : ''}${footer('test')}`;
};
R.test.after = () => {
  clearInterval(timerInt);
  const st = store.get('test', {});
  bindCopy(TM.c);
  if (!st.start) { $('#t-go').onclick = () => { store.set('test', { start: Date.now(), len: +$('#t-len').value, ans: {} }); render(); }; return; }
  const submit = () => {
    const s = store.get('test', {}); let score = 0;
    QS.forEach((q, i) => { if (close((s.ans || {})[i], q[1](TM), q[3])) score += 2; });
    s.submitted = true; s.score = score; store.set('test', s); render();
  };
  if (st.submitted) {
    $('#t-again').onclick = () => { store.set('test', {}); render(); };
    $('#t-key').onclick = () => fullModel(TM, $('#t-model'));
    return;
  }
  $$('#tq input').forEach(inp => inp.oninput = () => { const s = store.get('test', {}); s.ans = s.ans || {}; s.ans[inp.dataset.q] = inp.value; store.set('test', s); });
  $('#t-sub').onclick = () => { if (confirm('Submit and see your score?')) submit(); };
  const tick = () => {
    const left = st.start + st.len * 6e4 - Date.now();
    if (left <= 0) { clearInterval(timerInt); submit(); return; }
    const h = Math.floor(left / 36e5), mi = Math.floor(left % 36e5 / 6e4), s = Math.floor(left % 6e4 / 1e3);
    const el = $('#t-clock'); if (el) el.textContent = `⏱ ${h}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  tick(); timerInt = setInterval(tick, 1000);
};

R.cheat = () => `<h1>Cheat sheet</h1>
  <p class="lead">Printed cheat sheets are allowed. Press <b>Ctrl/Cmd + P</b> to print this page.</p>
  <div class="toolbar"><button onclick="print()">Print</button></div>
  <div class="card"><b>Forecast sheets</b> (FY27 = column F, Assumptions FY27 = column C)<ul class="tight">
  <li>Revenue line: <code>=E6*(1+Assumptions!C6)</code> → total <code>=F6+F7</code></li>
  <li>COGS: <code>=F8*(1-Assumptions!C8)</code> (GM% given) · GM <code>=F8-F9</code></li>
  <li>% of revenue costs: <code>=F$8*Assumptions!C9</code> (packaging, gateway, shipping, perf. mktg)</li>
  <li>CM1 = GM − packaging − gateway (− shipping in D2C) · CM2 = CM1 − perf. mktg</li>
  <li>Fixed costs (rent, staff, HO salaries, brand, tech, G&amp;A): <code>=E16*(1+Assumptions!C12)</code>. Never % of revenue.</li>
  <li>Offline contribution = CM2 − rent − staff · D2C contribution = CM2</li>
  <li>Consolidated: link <code>='Offline retail'!F8</code>, <code>=D2C!F8</code>. EBITDA <code>=F11-SUM(F12:F15)</code></li>
  <li>Depreciation <code>=Assumptions!$C$34</code> (+ <code>Assumptions!$C$38</code> from capex year; capex ÷ life)</li>
  <li>EBIT = EBITDA − dep · Interest <code>=Assumptions!$C$42*Assumptions!$C$43</code> · PBT = EBIT − interest</li>
  <li>Tax <code>=MAX(0,F20*Assumptions!$C$41)</code> (on PBT!) · PAT = PBT − tax</li></ul></div>
  <div class="card"><b>DCF (FCFE) sheet</b> (FY27 = column C here; Consolidated FY27 = F)<ul class="tight">
  <li>C4 required return, C5 terminal growth (inputs)</li>
  <li>PAT <code>='Consolidated '!F22</code> · Add dep <code>='Consolidated '!F17</code> · Cash profit <code>=C9+C10</code></li>
  <li>WC working: C44 <code>=Assumptions!C40</code>; D44 <code>=Assumptions!$C$39*'Consolidated '!F8</code>; increase D45 <code>=D44-C44</code></li>
  <li>Less ΔWC <code>=D45</code> · Less capex (input) · FCFE <code>=C11-C12-C13</code></li>
  <li>TV <code>=F14*(1+C5)/(C4-C5)</code> (last year’s FCFE, brackets!)</li>
  <li>Years 1,2,3,4 · DF <code>=1/(1+$C$4)^C17</code> · PV <code>=C14*C18</code> · PV TV <code>=F15*F18</code></li>
  <li>Equity value <code>=C20+D20+E20+F20+F21</code> · EV = equity + debt − cash</li>
  <li>NPV <code>=C27-C28</code> (investor value − founder ask)</li>
  <li>IRR cash flows: <code>-ask</code>, then <code>=C14+C15</code> … last year FCFE + TV · <code>=IRR(C33:G33)</code></li>
  <li>Upside <code>=D39*1.2</code> · Base <code>=C23</code> · Downside <code>=D39*0.8</code></li></ul></div>
  <div class="card"><b>Concepts in one line</b><ul class="tight">
  <li>PV = FV ÷ (1+r)ⁿ · DF = 1 ÷ (1+r)ⁿ · TV = CF<sub>n</sub>(1+g) ÷ (r−g), discounted n years</li>
  <li>NPV &gt; 0 → IRR &gt; r → good deal · NPV = 0 → IRR = r · NPV &lt; 0 → IRR &lt; r</li>
  <li>Higher r → lower value · higher g → higher value · g must be &lt; r</li>
  <li>Non-cash (depreciation) is added back · only the <i>increase</i> in WC is cash out · capex is cash out in the year bought</li>
  <li>Pre-money ÷ shares = price/share · new shares = investment ÷ price · post-money = pre + investment</li></ul></div>
  <div class="card"><b>Cool Nomad check figures</b> (₹ cr): FCFE ${CN.v.fcfe.map(x => fmt(x, 1)).join(' / ')} · TV ${fmt(CN.v.tv, 1)} · PV TV ${fmt(CN.v.pvTV, 1)} · Equity ${fmt(CN.v.equity, 1)} · EV ${fmt(CN.v.ev, 1)} · NPV ${fmt(CN.v.npv, 1)} · IRR ${pct(CN.v.irr)}</div>
  <div class="card"><b>Exam workflow (2.5 h)</b><ol class="tight">
  <li>Read the case and assumptions (10 min). Note the capex year, debt, cash, r, g and the ask.</li>
  <li>Offline → D2C → Consolidated: write the formula in FY27, check it, drag right.</li>
  <li>Check that FY26 figures tie to the case (e.g. EBITDA) before moving on.</li>
  <li>DCF sheet top to bottom. Lock $ cells. Brackets in TV.</li>
  <li>Answer the blanks from your model. Re-read the units (₹ cr, %, decimals).</li>
  <li>Download the completed sheet and upload it to the LMS.</li></ol></div>`;

/* ---------------- Router ---------------- */
function render() {
  clearInterval(timerInt);
  const id = location.hash.slice(1) || 'home';
  const page = R[id] ? id : 'home';
  nav();
  $('#app').innerHTML = R[page]();
  $('#app').className = page;
  hero(page);
  R[page].after && R[page].after();
  bindFooter(page);
  window.scrollTo(0, 0);
}
const theme = store.get('theme', null); if (theme) document.documentElement.dataset.theme = theme;
addEventListener('hashchange', render);
render();

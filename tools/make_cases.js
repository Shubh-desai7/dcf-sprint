// Builds the practice and mock-exam case documents in the professor's case-guidelines format.
// Head, CSS and tab script come from tools/case-base.html (the class Cool Nomad file); the locked
// relative-valuation section is left out. Numbers come from model.js, so they match the templates.
// Run: node tools/make_cases.js   → files/<id>-case.html
const fs = require('fs'), path = require('path');
const D = require('../model.js');
const ROOT = path.join(__dirname, '..');
const base = fs.readFileSync(path.join(__dirname, 'case-base.html'), 'utf8');

const STORY = {
  practice: {
    legal: 'TrekLite Outdoor Gear Private Limited', founded: 'April 2023 (FY24)', stores: 'eighteen', storesN: 18,
    founder: 'Meera Iyer', bio: 'Meera spent eight years in sourcing and product at a global sportswear company before starting TrekLite in April 2023. She leads product, sourcing and capital strategy.',
    lede: 'TrekLite is an Indian outdoor gear brand founded in April 2023. It sells hiking backpacks and outdoor accessories through eighteen of its own stores and its own website and app.',
    h1: 'Packs built for the trail, sold two ways',
    product: 'TrekLite designs technical hiking backpacks, from 20-litre day packs to 65-litre trekking rucksacks, priced between ₹2,499 and ₹8,999, alongside a growing accessories line of hydration bladders, rain covers, trekking poles and dry bags.',
    where: 'in hill-station high streets and metro malls', investor: ['Nisha Kapoor', 'Summit Ridge Capital'], sent: 'Monday, 26 October 2026, 19:10',
    machine: 'Ten bag-stitching machines at ₹0.5 crore each'
  },
  test: {
    legal: 'Wanderly Travel Essentials Private Limited', founded: 'April 2023 (FY24)', stores: 'twenty-six', storesN: 26,
    founder: 'Aditya Sen', bio: 'Aditya spent ten years in retail operations at a large Indian fashion retailer before starting Wanderly in April 2023. He leads stores, brand and capital strategy.',
    lede: 'Wanderly is an Indian travel essentials brand founded in April 2023. It sells premium duffels and travel organisers through twenty-six of its own stores and its own website and app.',
    h1: 'Duffels for the weekend, sold two ways',
    product: 'Wanderly makes premium canvas and leather duffels, weekenders and garment bags priced between ₹2,999 and ₹11,999, alongside a fast-growing organiser line of packing cubes, toiletry kits, tech pouches and passport wallets.',
    where: 'in airport terminals and premium malls', investor: ['Rohan Mehta', 'Northstar Ventures'], sent: 'Tuesday, 27 October 2026, 21:05',
    machine: 'A warehouse racking and automated packing line'
  }
};

const n1 = x => Math.abs(x) < 0.05 ? '-' : x < 0 ? `(${(-x).toFixed(1)})` : x.toFixed(1);
const neg = x => n1(-x);
const p1 = x => x < 0 ? `(${(-x * 100).toFixed(1)}%)` : `${(x * 100).toFixed(1)}%`;
const pc = x => { const v = Math.round(x * 1000) / 10; return Number.isInteger(v) && v >= 10 ? `${v}%` : `${v.toFixed(1)}%`; };
const pg = x => `+${Math.round(x * 100)}%`;
const word = n => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
const row = (cls, cells) => `<tr class="${cls}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
const table = (heads, rows) => `<div class="tbl-wrap"><table class=""><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const Y3 = ['FY24', 'FY25', 'FY26'], Y4 = D.YEARS;

function build(id) {
  const c = D.CASES[id], s = STORY[id], h = D.hist(c), m = D.run(c), o = h.off, d = h.dc, k = h.con;
  const rev = k[8], [inv, fund] = s.investor, cy = Y4[c.capexYear];
  const r3 = (label, a, cls = '', f = n1) => row(cls, [label, ...a.map(f)]);
  const ratio = (a, b) => a.map((x, i) => x / b[i]);
  const bagsAll = o[6].map((x, i) => x + d[6][i]), accAll = o[7].map((x, i) => x + d[7][i]);
  const bagShare = Math.round(bagsAll[2] / rev[2] * 100);
  const commonTot = k[12].map((x, i) => x + k[13][i] + k[14][i] + k[15][i]);
  const fcTot = Y4.map((_, i) => m.con.sal[i] + m.con.brand[i] + m.con.tech[i] + m.con.oth[i]);
  const wcInv = Math.round(c.wc0 * 1.2), wcRec = Math.round(c.wc0 * 0.3), wcPay = wcInv + wcRec - c.wc0;

  const about = `<section id="about" class="on">
  <p class="crumb">Case / 1. About ${c.name}</p>
  <h1>${s.h1}</h1>
  <hr class="rule">
  <p class="lede">${s.lede} FY26 closed at ₹${n1(rev[2])} crore of revenue and ₹${n1(k[16][2])} crore of EBITDA.</p>
  <dl class="facts">
    <div><dt>FY26 revenue</dt><dd>₹${n1(rev[2])} Cr</dd></div>
    <div><dt>Offline stores</dt><dd>₹${n1(o[8][2])} Cr</dd></div>
    <div><dt>D2C</dt><dd>₹${n1(d[8][2])} Cr</dd></div>
    <div><dt>FY26 EBITDA</dt><dd>₹${n1(k[16][2])} Cr</dd></div>
    <div><dt>Stores open</dt><dd>${s.storesN}</dd></div>
  </dl>
  <div class="two">
    <div>
      <h2>The business</h2>
      <p>${s.product} Bags are about ${bagShare}% of revenue and accessories the rest, and accessories are growing faster.</p>
      <h2>Two verticals</h2>
      <p><b>Offline retail stores.</b> ${s.stores[0].toUpperCase() + s.stores.slice(1)} stores that the company owns and runs, ${s.where}. Walk-in customers cost nothing to acquire, so performance marketing is light. Against that, every store pays rent and staff whether it sells or not.</p>
      <p><b>D2C website and app.</b> It carries no rent, but it pays for every order it wins through performance marketing, and it pays to ship, pack and collect the money.</p>
      <p>There is no third vertical. ${c.name} does not sell on marketplaces, does not distribute through multi-brand outlets and does not franchise.</p>
      ${table(['Revenue, ₹ crore', ...Y3], [r3('<b>Offline retail stores</b>', o[8], 'key'), r3('Bags', o[6], 'sub'), r3('Accessories', o[7], 'sub'),
        r3('<b>D2C website and app</b>', d[8], 'key'), r3('Bags', d[6], 'sub'), r3('Accessories', d[7], 'sub'),
        r3('Total revenue', rev, 'total'), r3('of which bags', bagsAll, 'sub'), r3('of which accessories', accAll, 'sub')])}
    </div>
    <div>
      <h2>Founder</h2>
      <div class="panel">
        <h3>${s.founder}</h3>
        <div class="note" style="margin-bottom:12px">Founder and Chief Executive Officer</div>
        <p style="margin:0">${s.bio}</p>
      </div>
      <h2>Company details</h2>
      <div class="panel" style="font-size:15px">
        <p style="margin:0 0 6px"><span class="note">Legal entity</span><br>${s.legal}</p>
        <p style="margin:0 0 6px"><span class="note">Founded</span><br>${s.founded}</p>
        <p style="margin:0 0 6px"><span class="note">Category</span><br>${c.biz}</p>
        <p style="margin:0 0 6px"><span class="note">Funding</span><br>Equity, plus a ₹${c.debt} crore term loan drawn on 31 March 2026 at ${pct0(c.intRate)}</p>
        <p style="margin:0"><span class="note">Financial year</span><br>April to March</p>
      </div>
    </div>
  </div>
</section>`;

  const lo = Math.round((c.r - .02) * 100), hi = Math.round((c.r + .02) * 100), r = Math.round(c.r * 100), g = Math.round(c.g * 100);
  const mandate = `<section id="mandate">
  <p class="crumb">Case / 2. The mandate</p>
  <h1>What the investor wants</h1>
  <hr class="rule">
  <div class="email">
    <dl class="head">
      <dt>From</dt><dd>${inv}, Managing Partner, ${fund}</dd>
      <dt>To</dt><dd>Investment team</dd>
      <dt>Subject</dt><dd>${c.name} - how I want this one valued</dd>
    </dl>
    <div class="body">
<p>Team,</p>
<p>${c.name} is a three-year-old Indian brand: ${c.biz.toLowerCase()}. It sells through two verticals it owns outright - ${s.stores} <b>retail stores</b> and its <b>D2C website and app</b>. No marketplaces, no distributors, no franchise. FY26 closed at &#8377;${n1(rev[2])} crore of revenue, &#8377;${n1(o[8][2])} crore offline and &#8377;${n1(d[8][2])} crore D2C, with &#8377;${n1(k[16][2])} crore of EBITDA. Founder ${s.founder} is raising equity and wants a valuation of <b>&#8377;${c.ask} crore</b>.</p>
<p><b>Discount rate.</b> Our required return is <b>${r}%</b> a year. Run the sensitivity at <b>${lo}%, ${r}% and ${hi}%</b>, against terminal growth of <b>${g - 1}%, ${g}% and ${g + 1}%</b>. ${g === 5 ? 'Five' : word(g)[0].toUpperCase() + word(g).slice(1)} percent is the base.</p>
<p><b>Forecast FY27 to FY30</b> and value the company as at 31 March 2026. Four years, no more.</p>
<p><b>Model the two verticals separately, and split each into bags and accessories.</b> They behave differently. Assumptions for each are in the pack.</p>
<p><b>The margin stack, in both verticals.</b> Revenue less cost of goods sold gives gross margin. Take off packaging and payment gateway charges - and shipping in D2C, which the stores do not carry - and that gives <b>CM1</b>. Take off performance marketing and that gives <b>CM2</b>. In the stores, rent and staff sit <b>below CM2</b>, and taking them off gives the <b>store contribution</b>.</p>
<p><b>Rent and staff are fixed costs.</b> Do not run them as a percentage of revenue - grow the FY26 rupee amount year on year. They grow slower than revenue, which is what makes the store margin expand.</p>
<p><b>Common costs, line by line.</b> Salaries, brand marketing, technology and administration each have their own growth rate in the pack. No single blanket rate for the head office.</p>
<p><b>Working capital moves with revenue, one for one.</b> Hold it at ${pct0(c.wcPct)} of revenue and treat the increase as cash out. Working capital at 31 March 2026 was &#8377;${c.wc0} crore.</p>
<p><b>One lump of capex.</b> ${s.machine}, &#8377;${c.capex} crore in total, all in ${cy}, depreciated over ${word(c.life)} years. Depreciation on the existing fit-outs continues at &#8377;${c.dep0} crore a year.</p>
<p><b>Debt.</b> The company carries a &#8377;${c.debt} crore term loan at ${pct0(c.intRate)} a year. Hold it constant across the forecast. EBITDA less depreciation is EBIT; less interest is profit before tax. Tax at ${pct0(c.tax)}, and no tax in a loss year. Cash on the balance sheet is &#8377;${c.cash} crore.</p>
<p><b>Value the equity with free cash flow to equity.</b> Then give me the <b>enterprise value</b>, the <b>NPV</b> against the founder's ask of &#8377;${c.ask} crore, and the <b>IRR</b> we earn if we pay the ask.</p>
<p><b>Three cases.</b> Your cash flow model is the <b>base</b>. The <b>upside</b> is 1.2 times it and the <b>downside</b> is 0.8 times it.</p>
<p>Come back with the equity valuation of the company using the discounted cash flow.</p>
<p class="sig">${inv}<br>Managing Partner, ${fund}<br>Sent ${s.sent}</p>
</div>
  </div>
</section>`;

  const hist = `<section id="hist">
  <p class="crumb">Case / 3. Historicals</p>
  <h1>Three years of actuals</h1>
  <hr class="rule">
  <h2>Vertical one: offline retail stores</h2>
  ${table(['Offline retail stores, ₹ crore', ...Y3], [r3('Bags revenue', o[6]), r3('Accessories revenue', o[7]), r3('Total revenue', o[8], 'key'),
    r3('Cost of goods sold', o[9], '', neg), r3('Gross margin', o[10], 'mar'), r3('Gross margin %', ratio(o[10], o[8]), 'sub', p1),
    r3('Packaging', o[11], '', neg), r3('Payment gateway charges', o[12], '', neg), r3('CM1', o[13], 'mar'), r3('CM1 %', ratio(o[13], o[8]), 'sub', p1),
    r3('Performance marketing', o[14], '', neg), r3('CM2', o[15], 'mar'), r3('CM2 %', ratio(o[15], o[8]), 'sub', p1),
    r3('Store rent', o[16], '', neg), r3('Store staff', o[17], '', neg), r3('Store contribution', o[18], 'key'), r3('Store contribution %', ratio(o[18], o[8]), 'sub', p1)])}
  <h2>Vertical two: D2C website and app</h2>
  ${table(['D2C website and app, ₹ crore', ...Y3], [r3('Bags revenue', d[6]), r3('Accessories revenue', d[7]), r3('Total revenue', d[8], 'key'),
    r3('Cost of goods sold', d[9], '', neg), r3('Gross margin', d[10], 'mar'), r3('Gross margin %', ratio(d[10], d[8]), 'sub', p1),
    r3('Packaging', d[11], '', neg), r3('Payment gateway charges', d[12], '', neg), r3('Shipping', d[13], '', neg), r3('CM1', d[14], 'mar'), r3('CM1 %', ratio(d[14], d[8]), 'sub', p1),
    r3('Performance marketing', d[15], '', neg), r3('CM2, and the D2C contribution', d[16], 'key'), r3('CM2 %', ratio(d[16], d[8]), 'sub', p1)])}
  <h2>Consolidated</h2>
  ${table(['Consolidated, ₹ crore', ...Y3], [r3('Total revenue', rev, 'key'), r3('Store contribution, offline', o[18]), r3('CM2, D2C', d[16]),
    r3('Total vertical contribution', k[11], 'mar'), r3('as % of revenue', ratio(k[11], rev), 'sub', p1), row('head', ['<b>Common costs</b>', '', '', '']),
    r3('Head office salaries', k[12], 'sub', neg), r3('Brand marketing', k[13], 'sub', neg), r3('Technology and platform', k[14], 'sub', neg), r3('Other general and administrative', k[15], 'sub', neg),
    r3('Total common costs', commonTot, '', neg), r3('as % of revenue', ratio(commonTot, rev), 'sub', p1), r3('EBITDA', k[16], 'key'), r3('EBITDA margin', ratio(k[16], rev), 'sub', p1),
    r3('Depreciation', k[17], '', neg), r3('Profit before tax', k[20], 'key'), r3(`Tax at ${pct0(c.tax)}`, k[21], '', neg), r3('Profit after tax', k[22], 'total')])}
  <p class="note">The term loan was drawn on 31 March 2026, so FY24-FY26 carry no interest. Interest starts in FY27.</p>
  <h2>Balance sheet items the model needs</h2>
  ${table(['Balance sheet at 31 March 2026', '₹ crore'], [row('', ['Inventory', n1(wcInv)]), row('', ['Trade receivables', n1(wcRec)]), row('', ['Trade payables', neg(wcPay)]),
    row('key', ['Net working capital', n1(c.wc0)]), row('sub', ['Working capital as % of FY26 revenue', p1(c.wc0 / rev[2])]), row('', ['Cash', n1(c.cash)]),
    row('', ['Debt (term loan)', n1(c.debt)]), row('sub', ['Interest rate on debt', pct0(c.intRate)])])}
</section>`;

  const a4 = (label, arr, cls = '', f = pc) => row(cls, [label, ...arr.map(f)]);
  const cm1o = c.off.gm.map((x, i) => x - c.off.pack[i] - c.off.pg[i]), cm2o = cm1o.map((x, i) => x - c.off.pm[i]);
  const cm1d = c.d2c.gm.map((x, i) => x - c.d2c.pack[i] - c.d2c.pg[i] - c.d2c.ship[i]), cm2d = cm1d.map((x, i) => x - c.d2c.pm[i]);
  const H = t => row('head', [`<b>${t}</b>`, '', '', '', '']);
  const cc = (label, b0, gr, why) => row('', [label, `₹${n1(b0)} Cr`, ...gr.map(pg), why]);
  const assum = `<section id="assum">
  <p class="crumb">Case / 4. Assumptions</p>
  <h1>The assumptions to model with</h1>
  <hr class="rule">
  <h2>Sheet one: offline retail stores</h2>
  ${table(['Offline retail stores', ...Y4], [H('Revenue'), a4('Bags revenue growth', c.off.gB), a4('Accessories revenue growth', c.off.gA),
    H('Variable costs, % of vertical revenue'), a4('Gross margin', c.off.gm), a4('Packaging', c.off.pack), a4('Payment gateway charges', c.off.pg), a4('CM1 margin', cm1o, 'key'),
    a4('Performance marketing', c.off.pm), a4('CM2 margin', cm2o, 'key'), H('Fixed costs, grown year on year in rupees'),
    a4(`Store rent, FY26 base ₹${n1(c.off.rent0)} Cr`, c.off.gRent, '', pg), a4(`Store staff, FY26 base ₹${n1(c.off.staff0)} Cr`, c.off.gStaff, '', pg)])}
  <h2>Sheet two: D2C website and app</h2>
  ${table(['D2C website and app', ...Y4], [H('Revenue'), a4('Bags revenue growth', c.d2c.gB), a4('Accessories revenue growth', c.d2c.gA),
    H('Variable costs, % of vertical revenue'), a4('Gross margin', c.d2c.gm), a4('Packaging', c.d2c.pack), a4('Payment gateway charges', c.d2c.pg), a4('Shipping', c.d2c.ship),
    a4('CM1 margin', cm1d, 'key'), a4('Performance marketing', c.d2c.pm), a4('CM2 margin, and the D2C contribution', cm2d, 'key')])}
  <h2>Common costs, line by line</h2>
  ${table(['Common cost line', 'FY26 actual', ...Y4, 'Why'], [cc('Head office salaries', c.common.sal0, c.common.gSal, 'Increments plus hiring; tapers as functions fill out'),
    cc('Brand marketing', c.common.brand0, c.common.gBrand, 'Fastest line; spend leads the new-city store openings'), cc('Technology and platform', c.common.tech0, c.common.gTech, 'Platform built once; only licences scale'),
    cc('Other general and administrative', c.common.oth0, c.common.gOth, 'Audit, legal, insurance, office rent, travel'),
    row('key', ['Total common costs', `₹${n1(commonTot[2])} Cr`, ...fcTot.map(x => `₹${n1(x)} Cr`), 'Sum of the four lines']),
    row('sub', ['as % of revenue', p1(commonTot[2] / rev[2]), ...fcTot.map((x, i) => p1(x / m.con.rev[i])), 'Falls every year: no line grows as fast as revenue'])])}
  <h2>Corporate</h2>
  ${table(['Particulars', 'Value'], [row('', ['Depreciation on existing fit-outs p.a. (₹ cr), FY26 onwards', n1(c.dep0)]),
    row('', [`${c.asset[0].toUpperCase() + c.asset.slice(1)}, total cost (₹ cr)`, n1(c.capex)]), row('', ['Year of purchase', cy]), row('', ['Machine life (years)', n1(c.life)]),
    row('', [`Additional depreciation (${cy} onwards)`, (c.capex / c.life).toFixed(2)]), row('', ['Working capital (% of revenue)', pct0(c.wcPct)]),
    row('', ['Working capital at 31 Mar 2026 (₹ cr)', n1(c.wc0)]), row('', ['Tax rate', pct0(c.tax)]),
    row('', ['Debt as on 31/3/2026 (₹ cr)', n1(c.debt)]), row('', ['Interest cost (%)', pct0(c.intRate)]), row('', ['Cash as on 31/3/2026 (₹ cr)', n1(c.cash)]),
    row('', ["Founder's preferred value (₹ cr)", n1(c.ask)])])}
</section>`;

  const nav = `<nav aria-label="Case sections"><ol>
    <li><button data-s="about" aria-current="true">About ${c.name}<small>Company and verticals</small></button></li>
    <li><button data-s="mandate">The mandate<small>Investor&#39;s email</small></button></li>
    <li><button data-s="hist">Historicals<small>FY24-FY26 actuals</small></button></li>
    <li><button data-s="assum">Assumptions<small>Offline, D2C and common</small></button></li>
  </ol></nav>`;
  const head = base.slice(0, base.indexOf('<body')).replace(/<title>.*?<\/title>/, `<title>${c.name} - Valuation Case</title>`)
    .replace('</style>', '.wordmark{font-family:var(--serif);font-weight:700;font-size:30px;text-align:center;letter-spacing:.02em;padding:14px 6px;color:var(--ink);border-bottom:2px solid var(--gold-soft)}\n@media (max-width:900px){.wordmark{font-size:20px;padding:4px}}\n</style>');
  const script = base.match(/<script>[\s\S]*?<\/script>/)[0].replace(/var KEY[\s\S]*?(?=<\/script>)/, '\n');
  return `${head}<body>
<div class="app">
<aside>
  <div class="logo-wrap"><div class="wordmark">${c.name}</div></div>
  ${nav}
  <div class="aside-foot"><div class="room-meta" style="margin-bottom:10px"><strong>Valuation case study</strong><br>${s.legal.replace(' Private Limited', ' Pvt. Ltd.')}<br>All figures in ₹ crore unless stated</div>Practice material for the DCF exam. Figures are illustrative.</div>
</aside>

<main>

${about}

${mandate}

${hist}

${assum}

</main>
</div>
${script}
</body>
</html>
`;
}
function pct0(x) { return `${Math.round(x * 100)}%`; }

for (const id of Object.keys(STORY)) {
  const out = path.join(ROOT, 'files', `${id}-case.html`);
  fs.writeFileSync(out, build(id));
  console.log(path.relative(ROOT, out));
}

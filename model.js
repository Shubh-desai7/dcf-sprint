// DCF engine: mirrors the class "Cool Nomad" Google Sheet line by line.
// All money in ₹ crore. Arrays are FY27..FY30 (index 0..3).
(function (root) {
  const YEARS = ['FY27', 'FY28', 'FY29', 'FY30'];

  function grow(base, rates) {
    const out = [];
    let prev = base;
    rates.forEach(r => { prev = prev * (1 + r); out.push(prev); });
    return out;
  }
  const mul = (a, b) => a.map((x, i) => x * (Array.isArray(b) ? b[i] : b));
  const sub = (a, ...bs) => a.map((x, i) => bs.reduce((s, b) => s - b[i], x));
  const add = (a, ...bs) => a.map((x, i) => bs.reduce((s, b) => s + b[i], x));

  function irr(flows) {
    const npv = r => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 5;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npv(mid) > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function run(c) {
    const o = c.off, d = c.d2c, k = c.common;
    const off = {};
    off.bags = grow(o.bags0, o.gB);
    off.acc = grow(o.acc0, o.gA);
    off.rev = add(off.bags, off.acc);
    off.cogs = off.rev.map((r, i) => r * (1 - o.gm[i]));
    off.gm = sub(off.rev, off.cogs);
    off.pack = mul(off.rev, o.pack);
    off.pg = mul(off.rev, o.pg);
    off.cm1 = sub(off.gm, off.pack, off.pg);
    off.pm = mul(off.rev, o.pm);
    off.cm2 = sub(off.cm1, off.pm);
    off.rent = grow(o.rent0, o.gRent);
    off.staff = grow(o.staff0, o.gStaff);
    off.contrib = sub(off.cm2, off.rent, off.staff);

    const dc = {};
    dc.bags = grow(d.bags0, d.gB);
    dc.acc = grow(d.acc0, d.gA);
    dc.rev = add(dc.bags, dc.acc);
    dc.cogs = dc.rev.map((r, i) => r * (1 - d.gm[i]));
    dc.gm = sub(dc.rev, dc.cogs);
    dc.pack = mul(dc.rev, d.pack);
    dc.pg = mul(dc.rev, d.pg);
    dc.ship = mul(dc.rev, d.ship);
    dc.cm1 = sub(dc.gm, dc.pack, dc.pg, dc.ship);
    dc.pm = mul(dc.rev, d.pm);
    dc.contrib = sub(dc.cm1, dc.pm);

    const con = {};
    con.offRev = off.rev; con.d2cRev = dc.rev;
    con.rev = add(off.rev, dc.rev);
    con.offContrib = off.contrib; con.d2cContrib = dc.contrib;
    con.contrib = add(off.contrib, dc.contrib);
    con.sal = grow(k.sal0, k.gSal);
    con.brand = grow(k.brand0, k.gBrand);
    con.tech = grow(k.tech0, k.gTech);
    con.oth = grow(k.oth0, k.gOth);
    con.ebitda = sub(con.contrib, con.sal, con.brand, con.tech, con.oth);
    const addDep = c.capex / c.life;
    con.dep = YEARS.map((_, i) => c.dep0 + (i >= c.capexYear ? addDep : 0));
    con.ebit = sub(con.ebitda, con.dep);
    con.interest = YEARS.map(() => c.debt * c.intRate);
    con.pbt = sub(con.ebit, con.interest);
    con.tax = con.pbt.map(p => Math.max(0, p * c.tax));
    con.pat = sub(con.pbt, con.tax);

    const v = {};
    v.wcLevel = con.rev.map(r => r * c.wcPct);
    v.wc0 = c.wc0;
    v.dWC = v.wcLevel.map((w, i) => w - (i ? v.wcLevel[i - 1] : c.wc0));
    v.capex = YEARS.map((_, i) => (i === c.capexYear ? c.capex : 0));
    v.cashProfit = add(con.pat, con.dep);
    v.fcfe = sub(v.cashProfit, v.dWC, v.capex);
    v.tv = v.fcfe[3] * (1 + c.g) / (c.r - c.g);
    v.t = [1, 2, 3, 4];
    v.df = v.t.map(t => 1 / Math.pow(1 + c.r, t));
    v.pv = mul(v.fcfe, v.df);
    v.pvTV = v.tv * v.df[3];
    v.equity = v.pv.reduce((a, b) => a + b, 0) + v.pvTV;
    v.ev = v.equity + c.debt - c.cash;
    v.netDebt = c.debt - c.cash;
    v.npv = v.equity - c.ask;
    v.flows = [-c.ask, v.fcfe[0], v.fcfe[1], v.fcfe[2], v.fcfe[3] + v.tv];
    v.irr = irr(v.flows);
    v.upside = v.equity * 1.2;
    v.downside = v.equity * 0.8;
    v.sens = [c.r - 0.02, c.r, c.r + 0.02].map(r => [c.g - 0.01, c.g, c.g + 0.01].map(g => {
      const tv = v.fcfe[3] * (1 + g) / (r - g);
      return v.fcfe.reduce((s, f, i) => s + f / Math.pow(1 + r, i + 1), 0) + tv / Math.pow(1 + r, 4);
    }));
    return { c, off, dc, con, v, addDep };
  }

  const CASES = {
    coolnomad: {
      id: 'coolnomad', name: 'Cool Nomad', biz: 'Hard-shell luggage and travel accessories', asset: 'engraving machines',
      off: { bags0: 53, acc0: 17, gB: [.45, .35, .28, .22], gA: [.55, .45, .35, .28], gm: [.5, .5, .5, .5],
        pack: [.012, .01, .012, .012], pg: [.008, .008, .008, .008], pm: [.05, .05, .05, .05],
        rent0: 9.1, staff0: 7, gRent: [.32, .26, .2, .16], gStaff: [.34, .28, .22, .18] },
      d2c: { bags0: 60, acc0: 20, gB: [.4, .32, .25, .2], gA: [.5, .4, .32, .25], gm: [.53, .53, .53, .53],
        pack: [.015, .015, .015, .015], pg: [.015, .015, .015, .015], ship: [.025, .025, .025, .025], pm: [.26, .25, .24, .23] },
      common: { sal0: 6, brand0: 3.4, tech0: 1.5, oth0: 1.5, gSal: [.3, .25, .2, .16], gBrand: [.4, .35, .3, .25],
        gTech: [.3, .25, .2, .15], gOth: [.25, .22, .18, .15] },
      dep0: 3, capex: 6, capexYear: 1, life: 5, wcPct: .18, wc0: 27, tax: .25,
      debt: 40, intRate: .10, cash: 18, r: .20, g: .05, ask: 300
    },
    practice: {
      id: 'practice', name: 'TrekLite', biz: 'Hiking backpacks and outdoor accessories', asset: 'bag-stitching machines',
      off: { bags0: 40, acc0: 10, gB: [.40, .30, .25, .20], gA: [.50, .40, .30, .25], gm: [.52, .52, .52, .52],
        pack: [.01, .01, .01, .01], pg: [.008, .008, .008, .008], pm: [.06, .06, .06, .06],
        rent0: 7, staff0: 5, gRent: [.30, .25, .20, .15], gStaff: [.30, .25, .20, .15] },
      d2c: { bags0: 50, acc0: 20, gB: [.35, .30, .25, .20], gA: [.45, .35, .30, .25], gm: [.55, .55, .55, .55],
        pack: [.015, .015, .015, .015], pg: [.015, .015, .015, .015], ship: [.03, .03, .03, .03], pm: [.28, .27, .26, .25] },
      common: { sal0: 5, brand0: 3, tech0: 1.2, oth0: 1, gSal: [.30, .25, .20, .15], gBrand: [.35, .30, .25, .20],
        gTech: [.25, .20, .18, .15], gOth: [.20, .18, .15, .12] },
      dep0: 2.5, capex: 5, capexYear: 2, life: 5, wcPct: .15, wc0: 18, tax: .25,
      debt: 30, intRate: .12, cash: 15, r: .21, g: .05, ask: 170
    },
    test: {
      id: 'test', name: 'Wanderly', biz: 'Premium travel duffels and organisers', asset: 'warehouse racking and packing line',
      off: { bags0: 60, acc0: 15, gB: [.38, .30, .24, .18], gA: [.48, .38, .30, .24], gm: [.48, .49, .50, .50],
        pack: [.012, .012, .012, .012], pg: [.01, .01, .01, .01], pm: [.045, .045, .045, .045],
        rent0: 11, staff0: 8, gRent: [.28, .22, .18, .14], gStaff: [.30, .24, .20, .16] },
      d2c: { bags0: 45, acc0: 25, gB: [.42, .34, .26, .20], gA: [.52, .40, .30, .24], gm: [.54, .54, .54, .54],
        pack: [.015, .015, .015, .015], pg: [.012, .012, .012, .012], ship: [.028, .028, .028, .028], pm: [.27, .26, .25, .24] },
      common: { sal0: 7, brand0: 4, tech0: 2, oth0: 1.6, gSal: [.28, .24, .20, .16], gBrand: [.38, .32, .26, .22],
        gTech: [.28, .22, .18, .14], gOth: [.22, .20, .16, .14] },
      dep0: 3.5, capex: 8, capexYear: 0, life: 4, wcPct: .20, wc0: 29, tax: .25,
      debt: 25, intRate: .11, cash: 12, r: .22, g: .04, ask: 115
    }
  };

  // FY24..FY26 actuals keyed by sheet row (same rows as the class file). Cool Nomad's are the case's own
  // numbers; the other cases get history derived from their FY26 bases so the FY26 column ties out.
  const r1 = x => Math.round(x * 10) / 10;
  const HIST_CN = {
    off: { 6: [8, 23, 53], 7: [2, 7, 17], 9: [5.5, 15.6, 35], 11: [.2, .4, .8], 12: [.1, .3, .6], 14: [.7, 1.8, 3.5], 16: [2.4, 5.4, 9.1], 17: [1.8, 4.2, 7] },
    dc: { 6: [16, 35, 60], 7: [4, 10, 20], 9: [10.2, 22.1, 37.6], 11: [.3, .7, 1.2], 12: [.3, .7, 1.2], 13: [.6, 1.3, 2], 15: [7.6, 14, 22] },
    con: { 12: [2.6, 4, 6], 13: [1.4, 2.2, 3.4], 14: [.5, .9, 1.5], 15: [.5, .9, 1.5], 17: [.5, 1.5, 3] }
  };
  function histInputs(c) {
    if (c.id === 'coolnomad') return HIST_CN;
    const back = (v, a, b) => [r1(v / b / a), r1(v / b), v];       // a = FY25 growth factor, b = FY26 growth factor
    const pctOf = (rev, p, lift) => rev.map((x, i) => r1(x * p * [lift, (1 + lift) / 2, 1][i]));
    const vert = (s, extra) => {
      const bags = back(s.bags0, 2.6, 2.0), acc = back(s.acc0, 2.9, 2.2), rev = bags.map((b, i) => b + acc[i]);
      const gm = [s.gm[0] - .05, s.gm[0] - .02, s.gm[0]];
      const h = { 6: bags, 7: acc, 9: rev.map((x, i) => r1(x * (1 - gm[i]))), 11: pctOf(rev, s.pack[0], 1.3), 12: pctOf(rev, s.pg[0], 1.3) };
      return Object.assign(h, extra(rev));
    };
    return {
      off: vert(c.off, rev => ({ 14: pctOf(rev, c.off.pm[0], 1.4), 16: back(c.off.rent0, 2.0, 1.6), 17: back(c.off.staff0, 2.2, 1.7) })),
      dc: vert(c.d2c, rev => ({ 13: pctOf(rev, c.d2c.ship[0], 1.3), 15: pctOf(rev, c.d2c.pm[0], 1.45) })),
      con: { 12: back(c.common.sal0, 1.5, 1.5), 13: back(c.common.brand0, 1.6, 1.55), 14: back(c.common.tech0, 1.8, 1.65), 15: back(c.common.oth0, 1.8, 1.65), 17: [r1(c.dep0 / 6), r1(c.dep0 / 2), c.dep0] }
    };
  }
  // Full historical columns, with subtotal rows computed the way the sheet's formulas would.
  function hist(c) {
    const h = histInputs(c), o = Object.assign({}, h.off), d = Object.assign({}, h.dc), k = Object.assign({}, h.con);
    const z = [0, 1, 2], s = (f) => z.map(f);
    o[8] = s(i => o[6][i] + o[7][i]); o[10] = s(i => o[8][i] - o[9][i]); o[13] = s(i => o[10][i] - o[11][i] - o[12][i]);
    o[15] = s(i => o[13][i] - o[14][i]); o[18] = s(i => o[15][i] - o[16][i] - o[17][i]);
    d[8] = s(i => d[6][i] + d[7][i]); d[10] = s(i => d[8][i] - d[9][i]); d[14] = s(i => d[10][i] - d[11][i] - d[12][i] - d[13][i]); d[16] = s(i => d[14][i] - d[15][i]);
    k[6] = o[8]; k[7] = d[8]; k[8] = s(i => o[8][i] + d[8][i]); k[9] = o[18]; k[10] = d[16]; k[11] = s(i => o[18][i] + d[16][i]);
    k[16] = s(i => k[11][i] - k[12][i] - k[13][i] - k[14][i] - k[15][i]); k[18] = s(i => k[16][i] - k[17][i]);
    k[19] = [0, 0, 0]; k[20] = k[18]; k[21] = s(i => Math.max(0, k[20][i] * c.tax)); k[22] = s(i => k[20][i] - k[21][i]);
    return { off: o, dc: d, con: k, inputs: h };
  }

  const api = { run, CASES, YEARS, irr, hist };
  if (typeof module !== 'undefined') module.exports = api; else root.DCF = api;
})(this);

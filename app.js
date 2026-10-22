/* ---------- ข้อมูลหลัก (ตัวอย่าง) ---------- */
const MIN = 60000;
const TYPES = { general: 'ทั่วไป', recycle: 'รีไซเคิล', organic: 'อินทรีย์', hazard: 'อันตราย' };
const TYPE_COLOR = { general: 'น้ำเงิน', recycle: 'เหลือง', organic: 'เขียว', hazard: 'แดง' };
const PROBLEMS = ['ขยะล้น', 'ถังเต็ม', 'ขยะตกพื้น', 'มีกลิ่น'];
const STATUS = { wait: 'รอดำเนินการ', doing: 'กำลังดำเนินการ', done: 'ดำเนินการแล้ว' };
const ESC_MIN = 30, REMIND_MIN = 20;

const BUILDINGS = ['อาคารเรียน A', 'โรงอาหารกลาง', 'ห้องสมุด', 'ลานกิจกรรม', 'หอพัก 2'];
const ZONE_OF = { 'อาคารเรียน A': 'Z-A', 'โรงอาหารกลาง': 'Z-A', 'ห้องสมุด': 'Z-A', 'ลานกิจกรรม': 'Z-B', 'หอพัก 2': 'Z-B' };
const BIN_ZONE_LABEL = { 'Z-A': 'โซน A', 'Z-B': 'โซน B' };

/* x,y คือตำแหน่งบนแผนที่จำลอง (1 หน่วย ≈ 1 เมตร) */
const BINS = [
  { id: 'BIN-A01-G', b: 'อาคารเรียน A', spot: 'ชั้น 1 หน้าลิฟต์', type: 'general', x: 112, y: 312 },
  { id: 'BIN-A02-Y', b: 'อาคารเรียน A', spot: 'ชั้น 1 หน้าห้องน้ำ', type: 'recycle', x: 138, y: 336 },
  { id: 'BIN-C01-O', b: 'โรงอาหารกลาง', spot: 'ทางเข้า', type: 'organic', x: 252, y: 214 },
  { id: 'BIN-C02-G', b: 'โรงอาหารกลาง', spot: 'ลานนั่งด้านหลัง', type: 'general', x: 292, y: 248 },
  { id: 'BIN-L01-Y', b: 'ห้องสมุด', spot: 'ชั้น 1', type: 'recycle', x: 120, y: 128 },
  { id: 'BIN-L02-R', b: 'ห้องสมุด', spot: 'ชั้น 2 มุมแบตเตอรี่', type: 'hazard', x: 160, y: 96 },
  { id: 'BIN-E01-G', b: 'ลานกิจกรรม', spot: 'เวทีกลางแจ้ง', type: 'general', x: 236, y: 372 },
  { id: 'BIN-D02-G', b: 'หอพัก 2', spot: 'ชั้น 1 หน้าตู้ไปรษณีย์', type: 'general', x: 300, y: 92 },
];
const ME = { x: 120, y: 330 }; /* ตำแหน่งผู้ใช้ในแผนที่จำลอง */
const binById = id => BINS.find(b => b.id === id);
const binsOf = b => BINS.filter(x => x.b === b);

const state = {
  role: 'reporter', tab: 'home', zone: 'Z-A',
  offset: 0, seq: 42, seqStart: 42,
  draft: null, lastId: null, filter: 'all', mapFilter: 'all', mapSel: null, mapQ: '',
  jobId: null, jobStatus: null, jobNote: '', jobAfter: null, jobErr: '',
  period: 'day', chat: [], csv: false,
  reports: [], notifs: [],
};
const now = () => Date.now() + state.offset;

/* ---------- ฟังก์ชันช่วย ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const mmss = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
const THAI_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const dayLabel = t => {
  const d = new Date(t), n = new Date(now());
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return 'วันนี้ ' + hhmm(t);
  if (diff === 1) return 'เมื่อวาน';
  return d.getDate() + ' ' + THAI_M[d.getMonth()] + ' ' + hhmm(t);
};
const ago = t => Math.max(0, Math.floor((now() - t) / MIN));
const dist = b => Math.round(Math.hypot(b.x - ME.x, b.y - ME.y) / 5) * 5 || 5;
const idFor = n => 'SW-2610-' + String(n).padStart(4, '0');
const typeDot = t => `<span class="dot ${t}"></span>`;
const pill = s => `<span class="pill ${s}">${STATUS[s]}</span>`;
const SAMPLE_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#cfe3df"/><rect x="22" y="30" width="36" height="38" rx="4" fill="#2f6bb5"/><rect x="18" y="26" width="44" height="8" rx="3" fill="#24558f"/><circle cx="30" cy="22" r="7" fill="#e9b824"/><rect x="40" y="14" width="14" height="12" rx="2" fill="#e08a12"/></svg>');

const ICON = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  map: 'M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  chat: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4',
  chart: 'M5 20V10M12 20V4M19 20v-7',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1.2 1.2L7 5M4 12l1.2 1.2L7 11M4 18l1.2 1.2L7 17',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z',
};
const ico = (n, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

/* ---------- ข้อมูลตัวอย่างเริ่มต้น ---------- */
function seed() {
  const t = now();
  const mk = (n, bin, prob, detail, ago_min, status, extra = {}) => ({
    id: idFor(n), bin, problem: prob, detail, created: t - ago_min * MIN, status,
    mine: true, count: 1, photo: null, after: null, assignee: null, accepted: null, resolved: null,
    escalated: false, reminded: false, live: false, by: 'นักศึกษา',
    log: [{ s: 'wait', by: 'นักศึกษา', at: t - ago_min * MIN, note: 'แจ้งเรื่อง' }], ...extra });
  const r42 = mk(42, 'BIN-A01-G', 'ขยะล้น', 'ถังขยะเต็ม มีขยะวางด้านข้าง', 12, 'wait');
  const r40 = mk(40, 'BIN-C01-O', 'ถังเต็ม', 'เศษอาหารล้นถัง มีแมลงวัน', 21, 'wait', { mine: false, reminded: true, by: 'บุคลากร' });
  const r31 = mk(31, 'BIN-L01-Y', 'ถังเต็ม', 'ขวดพลาสติกเต็มถัง', 55, 'doing',
    { accepted: t - 46 * MIN, assignee: 'สมชาย (เจ้าหน้าที่โซน A)' });
  r31.log.push({ s: 'doing', by: 'สมชาย', at: t - 46 * MIN, note: 'รับงานแล้ว' });
  const r19 = mk(19, 'BIN-L01-Y', 'ขยะตกพื้น', 'ขยะตกรอบถัง', 24 * 60 + 40, 'done',
    { accepted: t - 24 * 60 * MIN + 12 * MIN, resolved: t - 24 * 60 * MIN + 30 * MIN, assignee: 'สมชาย (เจ้าหน้าที่โซน A)' });
  const r117 = mk(117, 'BIN-D02-G', 'ขยะล้น', 'ขยะล้นหน้าตู้ไปรษณีย์', 3 * 24 * 60 + 90, 'done',
    { accepted: t - 3 * 24 * 60 * MIN, resolved: t - 3 * 24 * 60 * MIN + 20 * MIN, assignee: 'มาลี (เจ้าหน้าที่โซน B)' });
  r117.id = 'SW-2609-0117';
  state.reports = [r42, r40, r31, r19, r117];
  state.notifs = [
    { k: 'N1', rid: r42.id, at: r42.created }, { k: 'N1', rid: r40.id, at: r40.created },
    { k: 'N2', rid: r40.id, at: r40.created + REMIND_MIN * MIN },
    { k: 'N1', rid: r31.id, at: r31.created }, { k: 'N5', rid: r31.id, at: r31.accepted },
  ];
}
/* ---------- ตรรกะธุรกิจ ---------- */
const remaining = r => r.created + ESC_MIN * MIN - now();
const zoneOf = r => ZONE_OF[binById(r.bin).b];
const staffName = () => state.role === 'supervisor' ? 'ผู้ดูแลพื้นที่' : 'เจ้าหน้าที่โซน ' + (state.zone === 'Z-B' ? 'B' : 'A') + ' (คุณ)';

function timerSpan(r, mode) {
  if (r.status !== 'wait') return '';
  const rem = remaining(r);
  const cls = r.escalated ? 'esc' : rem < 10 * MIN ? 'late' : '';
  const txt = r.escalated ? 'เกินเวลา ส่งต่อผู้ดูแลแล้ว' : mode === 's' ? 'เหลือ ' + mmss(rem) : 'เหลือ ' + Math.ceil(rem / MIN) + ' น. ก่อนแจ้งผู้ดูแล';
  return `<span class="timer ${cls}" data-cd="${r.id}" data-mode="${mode}">${txt}</span>`;
}
function setStatus(r, s, by, note) {
  const t = now();
  r.status = s;
  if (s === 'doing') { r.accepted = r.accepted || t; r.assignee = by; }
  if (s === 'done') { r.resolved = t; r.accepted = r.accepted || t; r.assignee = r.assignee || by; }
  if (s === 'wait') { r.accepted = null; r.assignee = null; r.resolved = null; }
  r.log.push({ s, by, at: t, note });
  if (s === 'doing') state.notifs.push({ k: 'N5', rid: r.id, at: t });
  if (s === 'done') state.notifs.push({ k: 'N4', rid: r.id, at: t });
}
function acceptJob(r, by) { setStatus(r, 'doing', by || staffName(), 'รับงานแล้ว'); toast('รับงานแล้ว หยุดนับเวลา และแจ้งผู้แจ้งทันที'); }

function submitReport() {
  const d = state.draft, t = now();
  const bin = binById(d.bin);
  if (!d.photo) { d.err = 'ต้องแนบรูปอย่างน้อย 1 รูป เพื่อให้เจ้าหน้าที่เห็นสภาพจริง'; render(); return; }
  const dup = state.reports.find(r => r.bin === d.bin && r.status !== 'done' && t - r.created < ESC_MIN * MIN);
  if (dup) {
    dup.count++;
    dup.log.push({ s: dup.status, by: 'นักศึกษา', at: t, note: 'มีผู้แจ้งซ้ำ รวมเป็นเรื่องเดียว' });
    state.lastId = dup.id; state.tab = 'done'; state.draft = null;
    toast('ถังนี้มีผู้แจ้งแล้ว ระบบรวมเป็นเรื่องเดียว (ผู้แจ้ง ' + dup.count + ' คน)');
    render(); return;
  }
  state.seq++;
  const r = {
    id: idFor(state.seq), bin: d.bin, problem: d.problem, detail: d.detail.trim(), created: t, status: 'wait',
    mine: true, count: 1, photo: d.photo, after: null, assignee: null, accepted: null, resolved: null,
    escalated: false, reminded: false, live: true, by: 'นักศึกษา',
    log: [{ s: 'wait', by: 'นักศึกษา', at: t, note: 'แจ้งเรื่อง' }],
  };
  state.reports.unshift(r);
  state.notifs.push({ k: 'N1', rid: r.id, at: t });
  state.lastId = r.id; state.tab = 'done'; state.draft = null;
  render(); window.scrollTo(0, 0);
}

/* ---------- มุมมอง ---------- */
function itemHtml(r) {
  const b = binById(r.bin);
  return `<button type="button" class="item" data-act="open" data-id="${r.id}">
    <span class="thumb"><img src="${r.photo || SAMPLE_PHOTO}" alt=""></span>
    <span style="min-width:0"><span class="id">${r.id}</span><br>
      <span class="meta">${esc(b.b)} · ${typeDot(b.type)}${TYPES[b.type]}${r.count > 1 ? ' · ผู้แจ้ง ' + r.count + ' คน' : ''}</span></span>
    <span style="text-align:right">${pill(r.status)}<br><span class="meta small muted">${dayLabel(r.created)}</span></span></button>`;
}
const mine = () => state.reports.filter(r => r.mine).sort((a, b) => b.created - a.created);

function viewHome() {
  const m = mine().slice(0, 2);
  return `<div class="grid2"><div class="stack">
    <section class="card hero">
      <div class="small" style="opacity:.7">ถังเต็ม?</div>
      <h1 class="big">สแกน <em>ถ่าย</em> ส่ง<br>ภายใน 5 วินาที</h1>
      <p>เจอถังขยะเต็มหรือขยะล้น สแกน QR บนถัง ถ่ายรูป แล้วส่ง เจ้าหน้าที่ประจำโซนจะได้รับแจ้งทันที</p>
      <div style="margin-top:18px;max-width:340px"><button type="button" class="btn primary lg" data-act="tab" data-tab="report">${ico('camera')} แจ้งขยะล้นเลย</button></div>
    </section>
    <div class="tiles">
      <button type="button" class="tile" data-act="tab" data-tab="list">${ico('list')}รายการแจ้งปัญหา</button>
      <button type="button" class="tile" data-act="tab" data-tab="map">${ico('map')}แผนที่จุดขยะ</button>
      <button type="button" class="tile" data-act="tab" data-tab="dash">${ico('chart')}Dashboard</button>
      <button type="button" class="tile" data-act="tab" data-tab="chat">${ico('chat')}Chatbot</button>
    </div>
    <section class="card"><div class="h">เรื่องล่าสุดของฉัน</div>
      <div class="list">${m.length ? m.map(itemHtml).join('') : '<p class="muted">ยังไม่มีเรื่องที่แจ้ง</p>'}</div></section>
  </div>
  <aside class="stack">
    <section class="card"><div class="h">ปัญหาที่พบ</div>
      <p class="small">ถังขยะเต็มหรือขยะล้นเกิดขึ้นบ่อย แต่ยังไม่มีช่องทางแจ้งที่สะดวกและเป็นระบบ เจ้าหน้าที่จึงไม่รู้ตำแหน่งและเก็บขยะล่าช้า ระบบนี้ทำให้การแจ้งเหลือแค่สแกน ถ่ายรูป และส่ง</p></section>
    <div class="kpis">
      <div class="kpi"><b>≤ 5 วิ</b><span>เวลาแจ้งหลังสแกน QR</span></div>
      <div class="kpi"><b>30 นาที</b><span>รับงานก่อนส่งต่อผู้ดูแล</span></div>
      <div class="kpi"><b>3 สถานะ</b><span>รอ · กำลังทำ · เสร็จ แยกด้วยสี</span></div>
    </div>
    <section class="card flat"><div class="h">SDG ที่เกี่ยวข้อง</div><div class="stack">
      <div class="sdg"><b style="background:#f59a23">11</b><span>ทำให้เมืองและการตั้งถิ่นฐานของมนุษย์มีความครอบคลุม ปลอดภัย ยืดหยุ่น และยั่งยืน</span></div>
      <div class="sdg"><b style="background:#b8862b">12</b><span>สร้างหลักประกันให้มีแบบแผนการผลิตและการบริโภคที่ยั่งยืน</span></div></div></section>
  </aside></div>`;
}

function qrSvg(seedN) {
  let s = seedN, cells = '';
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) {
    const finder = (x < 5 && y < 5) || (x > 11 && y < 5) || (x < 5 && y > 11);
    if (finder || rnd() > .52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="0 0 17 17" fill="currentColor" aria-hidden="true">${cells}</svg>`;
}
function viewScan() {
  const sc = state.scanned ? binById(state.scanned) : null;
  return `<div class="grid2"><div class="stack">
    <section class="card"><div class="h">สแกน QR ที่ถังขยะ</div>
      <div class="cam ${sc ? 'ok' : ''}"><div class="frame">${qrSvg(7)}<div class="line"></div></div>
        ${sc ? `<div class="scanok"><b style="color:var(--green-ink)">✓ อ่าน QR สำเร็จ</b><br><span class="mono">${sc.id}</span> · ${esc(sc.b)}<br><span class="small muted">${esc(sc.spot)} · ถัง${TYPES[sc.type]} (${TYPE_COLOR[sc.type]})</span></div>`
          : '<div class="hint">เล็ง QR ให้อยู่ในกรอบ ระบบอ่านให้อัตโนมัติ</div>'}</div>
      <p class="small muted" style="margin-top:12px;text-align:center">เว็บต้นแบบนี้ไม่เปิดกล้องจริง เลือกถังจากรายการด้านขวาเพื่อจำลองการสแกน</p>
      <div style="margin-top:12px"><button type="button" class="btn lg" data-act="manual">ไม่มี QR หรือ QR ชำรุด เลือกสถานที่เอง</button></div></section></div>
    <section class="card"><div class="h">จำลองการสแกน QR ของถัง</div><div class="list">
      ${BINS.map(b => `<button type="button" class="binrow" data-act="scan" data-bin="${b.id}"><span class="qr">${ico('qr')}</span>
        <span style="min-width:0"><b class="mono">${b.id}</b><br><span class="small muted">${esc(b.b)} · ${esc(b.spot)} · ${typeDot(b.type)}${TYPES[b.type]}</span></span></button>`).join('')}
    </div></section></div>`;
}

function viewReport() {
  const d = state.draft;
  const bin = binById(d.bin);
  const spots = binsOf(d.building);
  return `<div class="grid2"><form class="card" id="reportForm" novalidate>
    <h2 class="title" style="margin-bottom:2px">แจ้งขยะล้น</h2><p class="muted small" style="margin-bottom:16px">กรอกให้ครบแล้วกดส่ง</p>
    ${d.qr ? `<div class="autofill field"><small>ดึงจาก QR อัตโนมัติ</small><b class="mono">${bin.id}</b> · ถัง${TYPES[bin.type]} (${TYPE_COLOR[bin.type]})<small>${esc(bin.b)} ${esc(bin.spot)}</small></div>` : ''}
    <div class="field"><span class="lab" id="lp">ประเภทปัญหา</span>
      <div class="chips" role="group" aria-labelledby="lp">${PROBLEMS.map(p => `<button type="button" class="chip sel" data-act="problem" data-p="${p}" aria-pressed="${d.problem === p}">${p}</button>`).join('')}</div></div>
    <div class="field"><label for="fBuilding">สถานที่</label>
      <select class="input" id="fBuilding">${BUILDINGS.map(b => `<option ${b === d.building ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
    <div class="field"><label for="fBin">ถัง / จุดที่พบ</label>
      <select class="input" id="fBin">${spots.map(b => `<option value="${b.id}" ${b.id === d.bin ? 'selected' : ''}>${b.id} · ${esc(b.spot)} (${TYPES[b.type]})</option>`).join('')}</select></div>
    <div class="field"><label for="fDetail">รายละเอียดเพิ่มเติม <span class="muted" style="font-weight:400">(ไม่บังคับ)</span></label>
      <textarea class="input" id="fDetail" maxlength="200" placeholder="เช่น ถังขยะเต็ม มีขยะวางด้านข้าง">${esc(d.detail)}</textarea>
      <span class="small muted num" id="fCount" style="text-align:right">${d.detail.length}/200</span></div>
    <div class="field"><span class="lab">รูปภาพ <span style="color:var(--red-ink)">*</span></span>
      <div class="photo"><span class="pv" id="fPv">${d.photo ? `<img src="${d.photo}" alt="รูปที่แนบ">` : ico('camera')}</span>
        <label class="drop" for="fPhoto">+ แนบรูป หรือถ่ายใหม่</label>
        <input type="file" id="fPhoto" accept="image/*" capture="environment" hidden>
        <button type="button" class="btn sm" data-act="samplePhoto" style="align-self:center">ใช้รูปตัวอย่าง</button></div></div>
    <div class="field"><span class="lab">ตำแหน่ง</span>
      <div class="gps">${ico('pin')}<span>ระบุตำแหน่งแล้ว ±8 ม. <span class="muted">(จำลอง)</span></span></div></div>
    <p class="err" role="alert" id="fErr">${esc(d.err)}</p>
    <button type="submit" class="btn primary lg">ส่งแจ้งปัญหา</button></form>
    <aside class="stack"><section class="card flat"><div class="h">ขั้นตอนหลังส่ง</div>
      <ol class="small" style="margin:0;padding-left:18px;display:grid;gap:6px">
        <li>ระบบสร้างรหัสเรื่อง และตั้งสถานะ รอดำเนินการ</li><li>ส่ง LINE ถึงเจ้าหน้าที่ประจำโซนทันที</li>
        <li>เตือนซ้ำที่นาทีที่ 20 ถ้ายังไม่มีผู้รับงาน</li><li>ครบ ${ESC_MIN} นาที ส่งต่อผู้ดูแลพื้นที่อัตโนมัติ</li></ol></section>
      <section class="card flat small muted">ถังเดียวกันที่ถูกแจ้งซ้ำภายใน ${ESC_MIN} นาที จะรวมเป็นเรื่องเดียวและนับจำนวนผู้แจ้ง</section></aside></div>`;
}

function viewDone() {
  const r = state.reports.find(x => x.id === state.lastId);
  if (!r) return '<p class="muted">ไม่พบเรื่องที่เลือก</p>';
  const b = binById(r.bin);
  const step = (cls, label, t) => `<li class="${cls}"><span>${label}</span><span class="small muted num">${t || ''}</span></li>`;
  const fresh = r.live && r.log.length === 1 && now() - r.created < 2 * MIN;
  return `<div class="grid2"><div class="stack">
    <section class="ok-hero">${fresh ? `<div class="ck">${ico('check', 3)}</div><h2 class="title">ส่งแจ้งปัญหาแล้ว</h2>` : `<h2 class="title">ติดตามเรื่องที่แจ้ง</h2>`}
      <p class="small" style="margin-top:4px">${esc(b.b)} · ${esc(b.spot)} · ${typeDot(b.type)}${TYPES[b.type]}</p></section>
    <section class="card"><div class="row" style="margin-bottom:14px"><div><div class="small muted">รหัสเรื่อง</div><div class="title mono">${r.id}</div></div><span class="sp"></span>${pill(r.status)}</div>
      <ul class="tl">
        ${step('done', 'ส่งเรื่องเข้าระบบ', hhmm(r.created))}
        ${step('done', 'แจ้งเจ้าหน้าที่' + BIN_ZONE_LABEL[zoneOf(r)], hhmm(r.created))}
        ${r.escalated ? step('done', 'ส่งต่อผู้ดูแลพื้นที่', hhmm(r.created + ESC_MIN * MIN)) : ''}
        ${r.accepted ? step('done', 'เจ้าหน้าที่รับงาน', hhmm(r.accepted)) : step('now', 'เจ้าหน้าที่รับงาน', 'รอ')}
        ${r.resolved ? step('done', 'ดำเนินการแล้ว', hhmm(r.resolved)) : step('off', 'ดำเนินการแล้ว', '')}
      </ul>
      ${r.count > 1 ? `<p class="small" style="margin-top:10px">มีผู้แจ้งเรื่องนี้ ${r.count} คน ระบบรวมเป็นเรื่องเดียว</p>` : ''}
    </section>
    ${r.status === 'wait' ? `<section class="card" style="background:var(--amber-soft);border-color:transparent"><div class="row"><b style="color:var(--amber-ink)">เหลือเวลารับงาน</b><span class="sp"></span>${timerSpan(r, 's')}</div>
        <p class="small" style="margin-top:6px">ครบ ${ESC_MIN} นาทีแล้วยังไม่มีผู้รับงาน ระบบแจ้งผู้ดูแลพื้นที่อัตโนมัติ</p></section>` : ''}
    ${r.status === 'doing' ? `<section class="card flat small">รับงานโดย <b>${esc(r.assignee)}</b> เมื่อ ${hhmm(r.accepted)} จะแจ้งให้ทราบเมื่อเสร็จ</section>` : ''}
    ${r.status === 'done' ? `<section class="card flat"><div class="h">รูปหลังเก็บ</div><div class="thumb" style="width:120px;height:120px"><img src="${r.after || SAMPLE_PHOTO}" alt="รูปหลังเก็บ"></div><p class="small" style="margin-top:8px">ขอบคุณที่ช่วยแจ้งให้มหาวิทยาลัยสะอาดขึ้น</p></section>` : ''}
    <div class="row"><button type="button" class="btn dark" style="flex:1" data-act="tab" data-tab="list">ดูรายการ</button>
      <button type="button" class="btn" style="flex:1" data-act="tab" data-tab="report">แจ้งเรื่องอื่น</button></div></div></div>`;
}

function viewList() {
  const f = state.filter;
  const rows = mine().filter(r => f === 'all' || r.status === f);
  const chip = (k, t) => `<button type="button" class="chip" data-act="filter" data-f="${k}" aria-pressed="${f === k}">${t}</button>`;
  return `<div class="stack" style="max-width:720px;margin:0 auto">
    <div class="row"><div><h2 class="title">รายการแจ้งปัญหา</h2><span class="small muted">ของฉัน ${mine().length} เรื่อง</span></div><span class="sp"></span>
      <button type="button" class="btn primary" data-act="tab" data-tab="report">+ แจ้งเรื่องใหม่</button></div>
    <div class="chips">${chip('all', 'ทั้งหมด')}${chip('wait', 'รอ')}${chip('doing', 'กำลัง')}${chip('done', 'เสร็จ')}</div>
    <div class="list">${rows.length ? rows.map(itemHtml).join('') : '<p class="muted card flat">ไม่มีเรื่องในสถานะนี้</p>'}</div></div>`;
}

/* ---------- ฝั่งเจ้าหน้าที่ ---------- */
function scopeReports() {
  return state.reports.filter(r => state.zone === 'all' || zoneOf(r) === state.zone);
}
function viewJobs() {
  const rs = scopeReports();
  const today = new Date(now()).toDateString();
  const doneToday = rs.filter(r => r.status === 'done' && new Date(r.resolved).toDateString() === today);
  const base = state.zone === 'Z-A' ? 13 : state.zone === 'Z-B' ? 4 : 17;
  const wait = rs.filter(r => r.status === 'wait').sort((a, b) => a.created - b.created);
  const doing = rs.filter(r => r.status === 'doing').sort((a, b) => a.created - b.created);
  const sup = state.role === 'supervisor';
  const card = r => {
    const b = binById(r.bin);
    return `<article class="job ${r.status}"><div class="top"><span class="mono" style="font-weight:500">${r.id}</span>${pill(r.status)}</div>
      <div><b>${esc(b.b)} ${esc(b.spot)}</b><div class="small muted">${typeDot(b.type)}${TYPES[b.type]} · ${r.status === 'doing' ? 'รับเมื่อ ' + hhmm(r.accepted) : r.status === 'done' ? 'เสร็จ ' + hhmm(r.resolved) : 'รอมา ' + ago(r.created) + ' น.'}${r.count > 1 ? ' · ผู้แจ้ง ' + r.count + ' คน' : ''}</div></div>
      ${timerSpan(r, 'm')}
      <div class="row">
        ${r.status === 'wait' ? `<button type="button" class="btn primary sm" style="flex:1" data-act="accept" data-id="${r.id}">รับงาน</button>` : ''}
        ${r.status === 'doing' ? `<button type="button" class="btn sm" style="flex:1;background:var(--green);color:#fff;border-color:var(--green)" data-act="finish" data-id="${r.id}">เสร็จแล้ว</button>` : ''}
        ${sup && r.status === 'wait' ? `<button type="button" class="btn sm" data-act="reassign" data-id="${r.id}">มอบหมายใหม่</button>` : ''}
        <button type="button" class="btn sm" data-act="open" data-id="${r.id}">รายละเอียด</button></div></article>`;
  };
  return `<div class="stack">
    <div class="row"><div><h2 class="title">${sup ? 'ภาพรวมงานในพื้นที่' : 'งาน' + (state.zone === 'Z-B' ? 'โซน B' : 'โซน A')}</h2><span class="small muted">${sup ? 'ผู้ดูแลพื้นที่' : 'เจ้าหน้าที่เก็บขยะ'}</span></div><span class="sp"></span>
      <label class="small muted" for="zoneSel">โซน</label><select class="input" id="zoneSel" style="width:auto">
        <option value="Z-A" ${state.zone === 'Z-A' ? 'selected' : ''}>โซน A</option><option value="Z-B" ${state.zone === 'Z-B' ? 'selected' : ''}>โซน B</option>
        ${sup ? `<option value="all" ${state.zone === 'all' ? 'selected' : ''}>ทุกโซน</option>` : ''}</select></div>
    <div class="kpis" style="max-width:520px"><div class="kpi red"><b class="num">${wait.length}</b><span>รอ</span></div>
      <div class="kpi amber"><b class="num">${doing.length}</b><span>กำลังทำ</span></div>
      <div class="kpi green"><b class="num">${doneToday.length + base}</b><span>เสร็จวันนี้ (รวมตัวอย่าง ${base})</span></div></div>
    <div class="jobs">${[...wait, ...doing, ...doneToday].map(card).join('') || '<p class="muted">ไม่มีงานค้างในโซนนี้</p>'}</div></div>`;
}

function viewJob() {
  const r = state.reports.find(x => x.id === state.jobId);
  if (!r) return '<p class="muted">ไม่พบงาน</p>';
  const b = binById(r.bin), s = state.jobStatus;
  const seg = (k, t) => `<button type="button" class="s-${k}" data-act="jstatus" data-s="${k}" aria-pressed="${s === k}">${t}</button>`;
  const dx = b.x - ME.x, dy = b.y - ME.y;
  return `<div class="grid2"><div class="stack">
    <button type="button" class="btn sm" data-act="back" style="justify-self:start">← กลับ</button>
    <section class="card"><div class="row" style="margin-bottom:12px"><h2 class="title mono">${r.id}</h2>${pill(r.status)}${timerSpan(r, 'm')}</div>
      <div class="thumb" style="width:100%;height:210px;border-radius:12px"><img src="${r.photo || SAMPLE_PHOTO}" alt="รูปจากผู้แจ้ง" style="object-fit:cover"></div>
      <p class="small muted" style="margin:6px 0 14px">รูปจากผู้แจ้ง · 1 รูป</p>
      <dl style="display:grid;grid-template-columns:76px minmax(0,1fr);gap:8px 12px;margin:0">
        <dt class="muted">ที่ตั้ง</dt><dd style="margin:0"><b>${esc(b.b)} ${esc(b.spot)}</b></dd>
        <dt class="muted">ถัง</dt><dd style="margin:0" class="mono">${b.id} · ${TYPES[b.type]} (${TYPE_COLOR[b.type]})</dd>
        <dt class="muted">ปัญหา</dt><dd style="margin:0">${esc(r.problem)}${r.detail ? ' · ' + esc(r.detail) : ''}</dd>
        <dt class="muted">เวลาแจ้ง</dt><dd style="margin:0">${dayLabel(r.created)} · ${esc(r.by)}${r.count > 1 ? ' และอีก ' + (r.count - 1) + ' คน' : ''}</dd>
        ${r.assignee ? `<dt class="muted">ผู้รับงาน</dt><dd style="margin:0">${esc(r.assignee)}</dd>` : ''}</dl></section></div>
    <div class="stack"><section class="card">
      <div class="mapbox" style="margin-bottom:12px"><svg viewBox="0 0 360 100" role="img" aria-label="แผนที่ย่อ ห่างจากคุณ ${dist(b)} เมตร">
        <rect width="360" height="100" class="road"/><rect x="20" y="14" width="90" height="26" rx="4" class="bld"/><rect x="170" y="58" width="150" height="28" rx="4" class="bld"/>
        <line x1="40" y1="70" x2="${Math.max(60, Math.min(320, 180 + dx))}" y2="40" stroke="var(--teal)" stroke-width="3" stroke-dasharray="6 5"/>
        <circle cx="40" cy="70" r="7" fill="#2f6bb5" stroke="#fff" stroke-width="2"/>
        <circle cx="${Math.max(60, Math.min(320, 180 + dx))}" cy="40" r="9" fill="var(--red)" stroke="#fff" stroke-width="2.5"/>
        <text x="52" y="90">คุณ</text></svg></div>
      <div class="row" style="margin-bottom:16px"><span class="small muted">ห่างจากคุณประมาณ ${dist(b)} ม.</span><span class="sp"></span>
        <button type="button" class="btn sm primary" data-act="navigate">นำทาง</button></div>
      <div class="field"><span class="lab">เปลี่ยนสถานะ</span><div class="seg" role="group" aria-label="สถานะงาน">${seg('wait', 'รอ')}${seg('doing', 'กำลังทำ')}${seg('done', 'เสร็จ')}</div></div>
      <div class="field"><label for="jNote">หมายเหตุ</label><textarea class="input" id="jNote" placeholder="เช่น เก็บขยะเสร็จ เปลี่ยนถุงใหม่">${esc(state.jobNote)}</textarea></div>
      <div class="field"><span class="lab">รูปหลังเก็บ ${s === 'done' ? '<span style="color:var(--red-ink)">* ต้องแนบก่อนปิดงาน</span>' : ''}</span>
        <div class="photo"><span class="pv" id="jPv">${state.jobAfter ? `<img src="${state.jobAfter}" alt="รูปหลังเก็บ">` : ico('camera')}</span>
          <label class="drop" for="jPhoto">แนบรูปหลังเก็บ</label><input type="file" id="jPhoto" accept="image/*" capture="environment" hidden>
          <button type="button" class="btn sm" data-act="sampleAfter" style="align-self:center">ใช้รูปตัวอย่าง</button></div></div>
      <p class="err" role="alert">${esc(state.jobErr)}</p>
      <button type="button" class="btn dark lg" data-act="saveJob">บันทึกสถานะ</button>
      <p class="small muted" style="margin-top:8px">บันทึกแล้วระบบแจ้งผู้แจ้งทันที และเก็บผู้เปลี่ยน เวลา หมายเหตุไว้ใน status_log</p></section>
      <section class="card flat"><div class="h">ประวัติสถานะ (status_log)</div><ul class="tl">${r.log.map(l => `<li class="done"><span>${STATUS[l.s]} <span class="muted small">· ${esc(l.by)}${l.note ? ' · ' + esc(l.note) : ''}</span></span><span class="small muted num">${hhmm(l.at)}</span></li>`).join('')}</ul></section></div></div>`;
}
/* ---------- แผนที่ ---------- */
const BLOCKS = [
  { n: 'อาคารเรียน A', x: 66, y: 286, w: 118, h: 72 }, { n: 'โรงอาหารกลาง', x: 222, y: 188, w: 108, h: 84 },
  { n: 'ห้องสมุด', x: 84, y: 66, w: 112, h: 82 }, { n: 'ลานกิจกรรม', x: 200, y: 342, w: 130, h: 56 },
  { n: 'หอพัก 2', x: 256, y: 54, w: 88, h: 62 },
];
function binState(bin) {
  const r = state.reports.filter(x => x.bin === bin.id && x.status !== 'done').sort((a, b) => a.created - b.created)[0];
  return r ? r.status : 'done';
}
const SCOL = { wait: 'var(--red)', doing: 'var(--amber)', done: 'var(--green)' };
function viewMap() {
  const f = state.mapFilter, q = state.mapQ.trim().toLowerCase();
  const sel = state.mapSel ? binById(state.mapSel) : null;
  const chip = (k, t) => `<button type="button" class="chip" data-act="mfilter" data-f="${k}" aria-pressed="${f === k}">${t}</button>`;
  const pins = BINS.map(b => {
    const st = binState(b);
    const match = (f === 'all' || f === st) && (!q || b.b.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
    return `<g class="pin ${match ? '' : 'dim'} ${sel && sel.id === b.id ? 'sel' : ''}" data-act="pin" data-bin="${b.id}" tabindex="0" role="button" aria-label="${b.id} ${esc(b.b)} ${STATUS[st]}">
      <circle class="ring" cx="${b.x}" cy="${b.y}" r="15"/><circle class="c" cx="${b.x}" cy="${b.y}" r="9.5" fill="${SCOL[st]}"/></g>`;
  }).join('');
  const act = sel ? state.reports.find(x => x.bin === sel.id && x.status !== 'done') : null;
  const card = sel ? `<section class="card"><div class="row"><b class="mono">${sel.id}</b><span class="sp"></span>${pill(act ? act.status : 'done')}</div>
      <p style="margin:6px 0">${esc(sel.b)} · ${esc(sel.spot)}</p><p class="small muted">${typeDot(sel.type)}ถัง${TYPES[sel.type]} (${TYPE_COLOR[sel.type]}) · ห่างจากคุณ ${dist(sel)} ม. ${act ? '· ล่าสุด ' + act.id : '· ไม่มีเรื่องค้าง'}</p>
      <div class="row" style="margin-top:12px">
        ${state.role === 'reporter' ? `<button type="button" class="btn primary sm" data-act="scan" data-bin="${sel.id}">แจ้งปัญหาที่ถังนี้</button>` : ''}
        ${act && state.role !== 'reporter' ? `<button type="button" class="btn primary sm" data-act="open" data-id="${act.id}">ดูงาน</button>` : ''}
        <button type="button" class="btn sm" data-act="navigate">นำทาง</button></div></section>`
    : `<section class="card flat small muted">แตะหมุดบนแผนที่เพื่อดูข้อมูลถังและสถานะล่าสุด</section>`;
  return `<div class="grid2"><div class="stack"><div class="row"><h2 class="title">แผนที่จุดขยะ</h2><span class="sp"></span>
      <label class="small muted" for="mapQ">ค้นหา</label><input class="input" id="mapQ" style="width:min(240px,100%)" placeholder="อาคาร หรือรหัสถัง" value="${esc(state.mapQ)}"></div>
    <div class="chips">${chip('all', 'ทั้งหมด')}${chip('wait', 'รอ')}${chip('doing', 'กำลังทำ')}${chip('done', 'เรียบร้อย')}</div>
    <div class="mapbox"><svg viewBox="0 0 360 420" role="group" aria-label="แผนที่จำลองของมหาวิทยาลัย">
      <rect width="360" height="420" class="road"/>
      ${BLOCKS.map(k => `<rect class="bld" x="${k.x}" y="${k.y}" width="${k.w}" height="${k.h}" rx="6"/><text x="${k.x + k.w / 2}" y="${k.y + k.h / 2 + 3}" text-anchor="middle">${k.n}</text>`).join('')}
      ${pins}
      <circle cx="${ME.x}" cy="${ME.y}" r="6" fill="#2f6bb5" stroke="#fff" stroke-width="2.5"/><text x="${ME.x + 10}" y="${ME.y + 18}">คุณ</text></svg></div></div>
    <aside class="stack">${card}
      <section class="card flat"><div class="h">สัญลักษณ์</div><div class="chips small">
        <span class="pill wait">รอดำเนินการ</span><span class="pill doing">กำลังดำเนินการ</span><span class="pill done">เรียบร้อย</span></div>
        <p class="small muted" style="margin-top:10px">ใช้ร่วมกันทั้งผู้แจ้งและเจ้าหน้าที่ ต่างกันที่เมนูด้านบน แผนที่นี้เป็นภาพจำลอง</p></section></aside></div>`;
}

/* ---------- Dashboard ---------- */
const SAMPLE = {
  day: { labels: ['08', '09', '10', '11', '12', '13', '14', '15', '16'], vals: [2, 3, 3, 4, 6, 3, 1, 1, 0], total: 23, done: 20, acc: 11,
    spots: { 'โรงอาหารกลาง': 8, 'อาคารเรียน A': 5, 'ลานกิจกรรม': 4, 'ห้องสมุด': 3, 'หอพัก 2': 3 }, title: 'จำนวนเรื่องตามช่วงเวลา (08:00–16:00)' },
  week: { labels: ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'], vals: [18, 16, 15, 17, 14, 9, 7], total: 96, done: 89, acc: 12,
    spots: { 'โรงอาหารกลาง': 31, 'อาคารเรียน A': 18, 'ลานกิจกรรม': 12, 'ห้องสมุด': 10, 'หอพัก 2': 8 }, title: 'จำนวนเรื่องรายวัน (7 วันล่าสุด)' },
  month: { labels: ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'], vals: [88, 96, 102, 91], total: 377, done: 351, acc: 13,
    spots: { 'โรงอาหารกลาง': 121, 'อาคารเรียน A': 74, 'ลานกิจกรรม': 52, 'ห้องสมุด': 41, 'หอพัก 2': 33 }, title: 'จำนวนเรื่องรายสัปดาห์ (เดือนนี้)' },
};
function metrics() {
  const p = SAMPLE[state.period];
  const vals = p.vals.slice(), spots = { ...p.spots };
  let total = p.total, done = p.done, accSum = p.acc * p.done, accN = p.done;
  state.reports.filter(r => r.live).forEach(r => {
    total++; spots[binById(r.bin).b] = (spots[binById(r.bin).b] || 0) + 1;
    let i;
    if (state.period === 'day') { i = Math.min(8, Math.max(0, new Date(r.created).getHours() - 8)); }
    else if (state.period === 'week') { i = (new Date(r.created).getDay() + 6) % 7; } else i = 3;
    vals[i]++;
    if (r.status === 'done') done++;
    if (r.accepted) { accSum += Math.round((r.accepted - r.created) / MIN); accN++; }
  });
  return { p, vals, spots, total, pct: Math.round(done / total * 100), acc: Math.round(accSum / accN) };
}
function viewDash() {
  const m = metrics(), per = state.period, reporter = state.role === 'reporter';
  const W = 520, H = 220, L = 30, B = 26, T = 18, n = m.vals.length, max = Math.max(...m.vals) || 1;
  const top = Math.ceil(max / 5) * 5 || 5, bw = (W - L - 10) / n;
  const pk = m.vals.indexOf(max);
  const grid = [0, .5, 1].map(g => { const y = T + (H - T - B) * (1 - g); return `<line class="grid" x1="${L}" x2="${W - 6}" y1="${y}" y2="${y}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${Math.round(top * g)}</text>`; }).join('');
  const bars = m.vals.map((v, i) => { const h = (H - T - B) * v / top, x = L + i * bw + bw * .18, y = H - B - h;
    return `<rect class="${i === pk ? 'bar-pk' : 'bar-n'}" x="${x}" y="${y}" width="${bw * .64}" height="${h}" rx="3"/>
      <text x="${x + bw * .32}" y="${y - 4}" text-anchor="middle">${v}</text><text x="${x + bw * .32}" y="${H - 8}" text-anchor="middle">${m.p.labels[i]}</text>`; }).join('');
  const spots = Object.entries(m.spots).sort((a, b) => b[1] - a[1]).slice(0, 5), sm = spots[0][1];
  const chip = (k, t) => `<button type="button" class="chip" data-act="period" data-p="${k}" aria-pressed="${per === k}">${t}</button>`;
  const csv = 'จุด,จำนวน\n' + spots.map(s => s.join(',')).join('\n');
  return `<div class="stack"><div class="row"><div><h2 class="title">Dashboard</h2><span class="small muted">${reporter ? 'ภาพรวมสำหรับผู้แจ้ง' : 'โซน A · ข้อมูลตัวอย่างรวมกับเรื่องที่แจ้งในหน้านี้'}</span></div><span class="sp"></span>
      <div class="chips">${chip('day', 'วันนี้')}${chip('week', '7 วัน')}${chip('month', 'เดือนนี้')}</div></div>
    <div class="kpis" style="max-width:560px"><div class="kpi"><b class="num">${m.total}</b><span>เรื่องทั้งหมด</span></div>
      <div class="kpi amber"><b class="num">${m.acc} น.</b><span>รับงานเฉลี่ย</span></div><div class="kpi green"><b class="num">${m.pct}%</b><span>แก้ไขแล้ว</span></div></div>
    <div class="${reporter ? '' : 'grid2'}"><section class="card"><div class="h">${m.p.title}</div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${m.p.title} ค่าสูงสุด ${max}">${grid}${bars}</svg>
      <p class="small muted">แท่งสีแดงคือช่วงที่เกิดเรื่องมากที่สุด</p></section>
      ${reporter ? '' : `<section class="card"><div class="h">จุดที่ล้นบ่อยที่สุด</div>
        ${spots.map(([k, v]) => `<div class="rank"><span>${esc(k)}</span><span class="tr"><i style="width:${v / sm * 100}%"></i></span><b class="num">${v}</b></div>`).join('')}
        <div style="margin-top:12px"><button type="button" class="btn sm" data-act="csv">ส่งออกรายงาน CSV</button></div>
        ${state.csv ? `<textarea class="input codebox" id="csvBox" readonly style="margin-top:10px">${esc(csv)}</textarea>
          <div class="row" style="margin-top:8px"><button type="button" class="btn sm primary" data-act="copycsv">คัดลอกข้อมูล</button><span class="small muted">วางลง Excel หรือ Google Sheets ได้</span></div>` : ''}</section>`}</div></div>`;
}

/* ---------- Chatbot ---------- */
function botReply(text) {
  const t = text.trim(), low = t.toLowerCase();
  const id = (t.match(/SW-\d{4}-\d{4}/i) || [])[0];
  if (id) {
    const r = state.reports.find(x => x.id.toLowerCase() === id.toLowerCase());
    if (!r) return `ไม่พบเรื่อง ${id.toUpperCase()} ลองตรวจรหัสอีกครั้ง`;
    const b = binById(r.bin);
    return `${r.id} · ${b.b}\nสถานะ: ${STATUS[r.status]}\n` + (r.status === 'wait' ? (r.escalated ? 'เกินเวลา ส่งต่อผู้ดูแลพื้นที่แล้ว' : 'ยังไม่มีผู้รับงาน เหลือเวลาอีก ' + Math.ceil(remaining(r) / MIN) + ' นาที ก่อนส่งต่อผู้ดูแล') : r.status === 'doing' ? `เจ้าหน้าที่รับงานแล้วเมื่อ ${hhmm(r.accepted)} จะแจ้งให้ทราบเมื่อเสร็จ` : `ปิดงานเมื่อ ${hhmm(r.resolved)}`);
  }
  if (/สถานะ|เช็ก|เช็ค/.test(low)) { const r = mine()[0]; return r ? botReply(r.id) : 'ยังไม่มีเรื่องที่คุณแจ้ง'; }
  const kinds = [['รีไซเคิล', 'recycle'], ['อินทรีย์', 'organic'], ['อันตราย', 'hazard'], ['ทั่วไป', 'general']];
  if (/ถัง|ใกล้|อยู่ไหน/.test(low)) {
    const k = kinds.find(x => low.includes(x[0]));
    const list = BINS.filter(b => !k || b.type === k[1]).sort((a, b) => dist(a) - dist(b));
    const b = list[0];
    return `ใกล้สุดคือ ${b.id} ${b.spot} ${b.b} ห่างประมาณ ${dist(b)} ม.\n(ดูตำแหน่งได้ที่เมนู แผนที่)`;
  }
  if (/แจ้ง|ล้น|เต็ม/.test(low)) return 'แตะปุ่ม "แจ้ง" ที่เมนูด้านบน แล้วสแกน QR ที่ถัง ถ่ายรูป และกดส่ง ใช้เวลาไม่เกิน 5 วินาที';
  return 'ผมตอบได้ 3 เรื่อง: แจ้งขยะล้น เช็กสถานะ (พิมพ์รหัส SW-...) และหาถังใกล้คุณ (เช่น ถังรีไซเคิลใกล้ฉันอยู่ไหน)';
}
function viewChat() {
  if (!state.chat.length) state.chat.push({ me: false, t: 'สวัสดีครับ ผมช่วยแจ้งขยะล้น เช็กสถานะ และหาถังขยะใกล้คุณได้' });
  const q = (t, v) => `<button type="button" data-act="quick" data-q="${v}">${t}</button>`;
  return `<div style="max-width:620px;margin:0 auto"><section class="card chat"><div class="ch"><b>Chatbot ช่วยเหลือ</b><div class="small" style="opacity:.7">ตอบทันที ตลอด 24 ชั่วโมง · ตอบตามกฎที่กำหนด</div></div>
    <div class="log" id="chatLog">${state.chat.map(m => `<div class="bub ${m.me ? 'me' : ''}">${esc(m.t).replace(/\n/g, '<br>')}</div>`).join('')}
      <div class="qr-row">${q('แจ้งขยะล้น', 'แจ้งขยะล้น')}${q('เช็กสถานะ', 'เช็กสถานะ')}${q('หาถังใกล้ฉัน', 'หาถังใกล้ฉัน')}${q('ถังรีไซเคิลใกล้ฉันอยู่ไหน', 'ถังรีไซเคิลใกล้ฉันอยู่ไหน')}</div></div>
    <form id="chatForm" autocomplete="off"><input class="input" id="chatIn" placeholder="พิมพ์ข้อความ..." aria-label="พิมพ์ข้อความ"><button class="btn primary" type="submit">ส่ง</button></form></section></div>`;
}

/* ---------- ข้อความแจ้งเตือน ---------- */
function notifHtml(n) {
  const r = state.reports.find(x => x.id === n.rid); if (!r) return '';
  const b = binById(r.bin), where = `${b.b} ${b.spot}`;
  const dl = rows => `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const when = `<span class="small muted" style="margin-left:auto;font-weight:400;opacity:.9">${hhmm(n.at)}</span>`;
  const head = (cls, t) => `<div class="mh row" style="gap:8px">${t}${when}</div>`;
  if (n.k === 'N1') return `<article class="msg n1">${head('', 'LINE · N1 งานใหม่')}<div class="mb"><b>งานใหม่ ${r.id}</b>${dl([['สถานที่', esc(where)], ['ถัง', `<span class="mono">${b.id}</span> · ขยะ${TYPES[b.type]}`], ['ปัญหา', esc(r.problem) + (r.detail ? ' · ' + esc(r.detail) : '')], ['เวลา', hhmm(r.created) + ' · มีรูปแนบ 1 รูป']])}
    <div class="acts">${r.status === 'wait' ? `<button type="button" class="btn sm primary" data-act="accept" data-id="${r.id}">รับงาน</button>` : `<span class="pill ${r.status}">${STATUS[r.status]}</span>`}<button type="button" class="btn sm" data-act="pinopen" data-bin="${b.id}">ดูแผนที่</button></div>
    <div class="cond">เงื่อนไข: ทันทีที่ส่งเรื่อง · ผู้รับ: กลุ่มเจ้าหน้าที่โซน</div></div></article>`;
  if (n.k === 'N2') return `<article class="msg n2">${head('', 'LINE · N2 เตือนก่อนครบเวลา')}<div class="mb"><b>ยังไม่มีผู้รับงาน ${r.id}</b>${dl([['เหลือเวลา', `${ESC_MIN - REMIND_MIN} นาที ก่อนแจ้งผู้ดูแลพื้นที่`], ['สถานที่', esc(where)]])}
    <div class="acts">${r.status === 'wait' ? `<button type="button" class="btn sm primary" data-act="accept" data-id="${r.id}">รับงาน</button>` : `<span class="pill ${r.status}">${STATUS[r.status]}</span>`}</div>
    <div class="cond">เงื่อนไข: นาทีที่ ${REMIND_MIN} ยังไม่มีผู้รับงาน · ผู้รับ: กลุ่มเจ้าหน้าที่โซน</div></div></article>`;
  if (n.k === 'N3') return `<article class="msg n3">${head('', 'LINE · N3 Escalation')}<div class="mb"><b>เกินเวลา ${r.id} ยังไม่มีผู้รับงาน</b>${dl([['รอมา', ESC_MIN + ' นาที'], ['โซน', 'A · เจ้าหน้าที่ 3 คน ได้รับแจ้งแล้ว'], ['สถานที่', esc(where)]])}
    <div class="acts">${r.status === 'wait' ? `<button type="button" class="btn sm red" data-act="reassign" data-id="${r.id}">มอบหมายใหม่</button>` : `<span class="pill ${r.status}">${STATUS[r.status]}</span>`}<button type="button" class="btn sm" data-act="call">โทรติดตาม</button></div>
    <div class="cond">เงื่อนไข: ครบ ${ESC_MIN} นาทียังไม่มีผู้รับงาน · ผู้รับ: ผู้ดูแลพื้นที่</div></div></article>`;
  if (n.k === 'N4') return `<article class="msg n4">${head('', 'Push Notification · N4 งานเสร็จ')}<div class="mb"><b>เรื่องของคุณดำเนินการแล้ว</b>${dl([['รหัสเรื่อง', `<span class="mono">${r.id}</span>`], ['ปิดงาน', hhmm(r.resolved || n.at) + ' · ใช้เวลา ' + Math.max(1, Math.round(((r.resolved || n.at) - r.created) / MIN)) + ' นาที'], ['ขอบคุณ', 'ที่ช่วยแจ้งให้มหาวิทยาลัยสะอาดขึ้น']])}
    <div class="cond">เงื่อนไข: เมื่อสถานะเป็นดำเนินการแล้ว · ผู้รับ: ผู้แจ้ง</div></div></article>`;
  return `<article class="msg n5">${head('', 'Push Notification · เจ้าหน้าที่รับงานแล้ว')}<div class="mb"><b>เรื่อง ${r.id} มีผู้รับงานแล้ว</b>${dl([['ผู้รับงาน', esc(r.assignee || '')], ['เวลา', hhmm(r.accepted || n.at)]])}
    <div class="cond">เงื่อนไข: เมื่อเจ้าหน้าที่กดรับงาน · ผู้รับ: ผู้แจ้ง</div></div></article>`;
}
function viewNotif() {
  const role = state.role;
  const ok = n => { const r = state.reports.find(x => x.id === n.rid); if (!r) return false;
    if (role === 'reporter') return r.mine && (n.k === 'N4' || n.k === 'N5');
    if (role === 'staff') return n.k === 'N1' || n.k === 'N2';
    return n.k === 'N3'; };
  const list = state.notifs.filter(ok).sort((a, b) => b.at - a.at);
  const empty = role === 'supervisor' ? 'ยังไม่มีเรื่องที่เกินเวลา ลองกด "เร่งเวลา +10 นาที" ด้านบนเพื่อดูการส่งต่อเมื่อครบ 30 นาที' : role === 'reporter' ? 'ยังไม่มีการแจ้งเตือน เมื่อเจ้าหน้าที่รับงานหรือทำเสร็จ ข้อความจะขึ้นที่นี่' : 'ยังไม่มีงานใหม่';
  return `<div class="grid2"><div class="stack"><h2 class="title">ข้อความแจ้งเตือน</h2>
    ${list.length ? list.map(notifHtml).join('') : `<p class="card flat muted">${empty}</p>`}</div>
    <aside class="stack"><section class="card flat"><div class="h">ช่องทางและการส่งซ้ำ</div><ol class="small" style="margin:0;padding-left:18px;display:grid;gap:6px">
      <li>LINE Messaging API เป็นช่องทางหลักสำหรับเจ้าหน้าที่และผู้ดูแล</li><li>Telegram Bot เป็นช่องทางสำรอง</li><li>Web Push สำหรับผู้แจ้ง</li></ol>
      <p class="small muted" style="margin-top:10px">ถ้าส่งไม่สำเร็จ ลองซ้ำทุก 1 นาทีสูงสุด 3 ครั้ง แล้วสลับไปช่องทางสำรอง และบันทึกผลในตาราง notifications</p></section>
      <section class="card flat small muted">LINE Notify ปิดให้บริการตั้งแต่เดือนมีนาคม 2568 ระบบจึงออกแบบให้ใช้ LINE Messaging API แทน</section></aside></div>`;
}
/* ---------- แอป: เมนู, render, เหตุการณ์ ---------- */
const TABS = {
  reporter: [['home', 'หน้าหลัก', 'home'], ['list', 'รายการ', 'list'], ['report', 'แจ้ง', 'camera'], ['map', 'แผนที่', 'map'], ['dash', 'Dashboard', 'chart'], ['chat', 'Chatbot', 'chat'], ['notif', 'แจ้งเตือน', 'bell']],
  staff: [['jobs', 'งานของโซน', 'tasks'], ['map', 'แผนที่', 'map'], ['dash', 'Dashboard', 'chart'], ['notif', 'ข้อความ LINE', 'bell']],
  supervisor: [['jobs', 'ภาพรวมงาน', 'tasks'], ['map', 'แผนที่', 'map'], ['dash', 'Dashboard', 'chart'], ['notif', 'Escalation', 'bell']],
};
const NAV_KEY = { scan: 'report', report: 'report', done: 'list', job: 'jobs' };
const VIEWS = { home: viewHome, scan: viewScan, report: viewReport, done: viewDone, list: viewList, jobs: viewJobs, job: viewJob, map: viewMap, dash: viewDash, chat: viewChat, notif: viewNotif };

function newDraft(binId, qr) {
  const b = binById(binId);
  return { bin: b.id, building: b.b, qr, problem: 'ขยะล้น', detail: '', photo: null, err: '' };
}
function go(tab) { state.tab = tab; state.scanned = null; render(); window.scrollTo(0, 0); }

function badges() {
  const waiting = scopeReports().filter(r => r.status === 'wait').length;
  const esc_ = state.reports.filter(r => r.status === 'wait' && r.escalated).length;
  return { jobs: waiting, notif: state.role === 'supervisor' ? esc_ : 0 };
}
function render() {
  const ae = document.activeElement, keep = ae && ae.id && $('#app').contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
  const cur = NAV_KEY[state.tab] || state.tab, bd = badges();
  $('#tabs').innerHTML = TABS[state.role].map(([k, t, i]) =>
    `<button type="button" data-act="nav" data-tab="${k}" ${k === cur ? 'aria-current="page"' : ''}>${ico(i)}${t}${bd[k] ? `<span class="badge">${bd[k]}</span>` : ''}</button>`).join('');
  $$('.roles button').forEach(b => b.setAttribute('aria-pressed', b.dataset.role === state.role));
  if (state.tab === 'report' && !state.draft) state.draft = newDraft(BINS[0].id, false);
  $('#app').innerHTML = VIEWS[state.tab]();
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (_) {} } }
  const lg = $('#chatLog'); if (lg) lg.scrollTop = lg.scrollHeight;
}

/* ---------- เวลา: เตือน, Escalation ---------- */
function process() {
  let changed = false;
  state.reports.forEach(r => {
    if (r.status !== 'wait') return;
    const el = now() - r.created;
    if (!r.reminded && el >= REMIND_MIN * MIN) { r.reminded = true; state.notifs.push({ k: 'N2', rid: r.id, at: r.created + REMIND_MIN * MIN }); changed = true; }
    if (!r.escalated && el >= ESC_MIN * MIN) {
      r.escalated = true; changed = true;
      state.notifs.push({ k: 'N3', rid: r.id, at: r.created + ESC_MIN * MIN });
      r.log.push({ s: 'wait', by: 'ระบบ', at: r.created + ESC_MIN * MIN, note: 'ครบ 30 นาที ส่งต่อผู้ดูแลพื้นที่' });
      toast('ครบ 30 นาที ระบบแจ้งผู้ดูแลพื้นที่แล้ว (' + r.id + ')');
    }
  });
  return changed;
}
function tickUi() {
  $$('[data-cd]').forEach(el => {
    const r = state.reports.find(x => x.id === el.dataset.cd); if (!r || r.status !== 'wait') return;
    const rem = remaining(r);
    el.className = 'timer ' + (r.escalated ? 'esc' : rem < 10 * MIN ? 'late' : '');
    el.textContent = r.escalated ? 'เกินเวลา ส่งต่อผู้ดูแลแล้ว' : el.dataset.mode === 's' ? 'เหลือ ' + mmss(rem) : 'เหลือ ' + Math.ceil(rem / MIN) + ' น. ก่อนแจ้งผู้ดูแล';
  });
}
setInterval(() => {
  const ch = process();
  if (ch && !['report', 'job', 'chat', 'scan'].includes(state.tab)) render(); else if (ch) { render_tabsOnly(); }
  tickUi();
}, 1000);
function render_tabsOnly() {
  const cur = NAV_KEY[state.tab] || state.tab, bd = badges();
  $$('#tabs button').forEach(b => { const k = b.dataset.tab; let sp = $('.badge', b); if (bd[k]) { if (!sp) { sp = document.createElement('span'); sp.className = 'badge'; b.appendChild(sp); } sp.textContent = bd[k]; } else if (sp) sp.remove(); });
}

/* ---------- เหตุการณ์ ---------- */
let scanTok = 0;
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const d = el.dataset, find = id => state.reports.find(r => r.id === id);
  switch (d.act) {
    case 'nav': if (d.tab === 'report') { state.draft = null; } go(d.tab === 'report' ? 'scan' : d.tab); break;
    case 'tab': if (d.tab === 'report') { state.draft = null; go('scan'); } else go(d.tab); break;
    case 'scan': {
      const tok = ++scanTok; state.tab = 'scan'; state.scanned = d.bin; render(); window.scrollTo(0, 0);
      setTimeout(() => { if (tok !== scanTok || state.tab !== 'scan') return; state.draft = newDraft(d.bin, true); state.scanned = null; state.tab = 'report'; render(); window.scrollTo(0, 0); }, 900);
      break; }
    case 'manual': scanTok++; state.draft = newDraft(BINS[0].id, false); go('report'); break;
    case 'problem': state.draft.problem = d.p; render(); break;
    case 'samplePhoto': state.draft.photo = SAMPLE_PHOTO; state.draft.err = ''; render(); break;
    case 'open': {
      const r = find(d.id); if (!r) break;
      if (state.role === 'reporter') { state.lastId = r.id; go('done'); }
      else { state.jobId = r.id; state.jobStatus = r.status; state.jobNote = ''; state.jobAfter = null; state.jobErr = ''; go('job'); }
      break; }
    case 'back': go(state.role === 'reporter' ? 'list' : 'jobs'); break;
    case 'accept': { const r = find(d.id); if (r && r.status === 'wait') { acceptJob(r); render(); } break; }
    case 'finish': { const r = find(d.id); if (!r) break; state.jobId = r.id; state.jobStatus = 'done'; state.jobNote = ''; state.jobAfter = null; state.jobErr = ''; go('job'); break; }
    case 'reassign': { const r = find(d.id); if (r && r.status === 'wait') { setStatus(r, 'doing', 'ทีมสำรอง (ผู้ดูแลมอบหมายใหม่)', 'ผู้ดูแลมอบหมายใหม่'); toast('มอบหมายใหม่แล้ว แจ้งผู้แจ้งและบันทึกใน status_log'); render(); } break; }
    case 'jstatus': state.jobStatus = d.s; render(); break;
    case 'navigate': toast('เปิดเส้นทางเดินไปยังถัง (จำลอง)'); break;
    case 'call': toast('บันทึกการโทรติดตามแล้ว (จำลอง)'); break;
    case 'sampleAfter': state.jobAfter = SAMPLE_PHOTO; state.jobErr = ''; render(); break;
    case 'saveJob': {
      const r = find(state.jobId), s = state.jobStatus; if (!r) break;
      if (s === 'done' && !state.jobAfter && !r.after) { state.jobErr = 'ปิดงานต้องมีรูปหลังเก็บ'; render(); break; }
      if (state.jobAfter) r.after = state.jobAfter;
      if (s !== r.status) setStatus(r, s, staffName(), state.jobNote.trim());
      else if (state.jobNote.trim()) r.log.push({ s: r.status, by: staffName(), at: now(), note: state.jobNote.trim() });
      toast('บันทึกแล้ว ระบบแจ้งผู้แจ้งทันที'); go('jobs'); break; }
    case 'filter': state.filter = d.f; render(); break;
    case 'mfilter': state.mapFilter = d.f; render(); break;
    case 'pin': state.mapSel = d.bin; render(); break;
    case 'pinopen': state.mapSel = d.bin; go('map'); break;
    case 'period': state.period = d.p; render(); break;
    case 'csv': state.csv = !state.csv; render(); break;
    case 'copycsv': {
      const box = $('#csvBox'); if (!box) break; box.select();
      (navigator.clipboard ? navigator.clipboard.writeText(box.value) : Promise.reject()).then(() => toast('คัดลอกแล้ว'), () => toast('เลือกข้อความแล้ว กด Ctrl+C เพื่อคัดลอก'));
      break; }
    case 'quick': chatSend(d.q); break;
  }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g.pin')) { e.preventDefault(); state.mapSel = e.target.dataset.bin; render(); }
});
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'fDetail') { state.draft.detail = e.target.value; $('#fCount').textContent = e.target.value.length + '/200'; }
  else if (id === 'jNote') state.jobNote = e.target.value;
  else if (id === 'mapQ') { state.mapQ = e.target.value; render(); }
});
function readPhoto(file, cb) {
  if (!file) return;
  const rd = new FileReader(); rd.onload = () => cb(rd.result); rd.readAsDataURL(file);
}
document.addEventListener('change', e => {
  const id = e.target.id, d = state.draft;
  if (id === 'fBuilding') { d.building = e.target.value; d.bin = binsOf(d.building)[0].id; d.qr = false; render(); }
  else if (id === 'fBin') { d.bin = e.target.value; d.qr = false; render(); }
  else if (id === 'fPhoto') readPhoto(e.target.files[0], u => { d.photo = u; d.err = ''; render(); });
  else if (id === 'jPhoto') readPhoto(e.target.files[0], u => { state.jobAfter = u; state.jobErr = ''; render(); });
  else if (id === 'zoneSel') { state.zone = e.target.value; render(); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'reportForm') submitReport();
  if (e.target.id === 'chatForm') { const i = $('#chatIn'); const v = i.value.trim(); if (v) chatSend(v); }
});
function chatSend(text) {
  state.chat.push({ me: true, t: text });
  state.chat.push({ me: false, t: botReply(text) });
  render();
}
$$('.roles button').forEach(b => b.addEventListener('click', () => {
  state.role = b.dataset.role; state.mapSel = null;
  state.zone = state.role === 'supervisor' ? 'all' : 'Z-A';
  state.tab = state.role === 'reporter' ? 'home' : 'jobs'; render(); window.scrollTo(0, 0);
}));
$('#skip').addEventListener('click', () => {
  state.offset += 10 * MIN; const ch = process(); render(); if (!ch) toast('เร่งเวลาไปข้างหน้า 10 นาที');
});

seed();
process();
render();

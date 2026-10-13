(() => {
  'use strict';

  /* ========== Konfigurasi ========== */
  const KEY = 'absensi_sekolah_v1';
  const SESSION_KEY = 'absensi_sekolah_session_v1';
  const GURU = { username: 'admin', password: 'guru123' };

  const STATUS = {
    H: { label: 'Hadir', badge: 'bg-emerald-100 text-emerald-800', on: 'bg-emerald-600 text-white' },
    I: { label: 'Izin',  badge: 'bg-yellow-100 text-yellow-800',  on: 'bg-yellow-500 text-white' },
    S: { label: 'Sakit', badge: 'bg-orange-100 text-orange-800',  on: 'bg-orange-500 text-white' },
    A: { label: 'Alpa',  badge: 'bg-red-100 text-red-800',        on: 'bg-red-600 text-white' }
  };
  const ORDER = ['H', 'I', 'S', 'A'];

  /* ========== Helper ========== */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDate = (iso, opt) => new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', opt || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const uid = p => p + Math.random().toString(36).slice(2, 9);

  /* ========== Data (LocalStorage) ========== */
  function seed() {
    const classes = [{ id: 'k1', name: 'X IPA 1' }, { id: 'k2', name: 'X IPA 2' }, { id: 'k3', name: 'XI IPS 1' }];
    const names = {
      k1: ['Aisyah Putri', 'Bima Pratama', 'Citra Lestari', 'Dimas Saputra', 'Eka Wulandari'],
      k2: ['Farhan Hidayat', 'Gita Maharani', 'Hendra Wijaya', 'Intan Permata', 'Joko Susilo'],
      k3: ['Kirana Dewi', 'Lukman Hakim', 'Maya Anggraini', 'Naufal Rizky', 'Olivia Handayani']
    };
    let n = 1;
    const students = [];
    classes.forEach(c => names[c.id].forEach(nm => students.push({ id: uid('s'), nis: '2026' + String(n++).padStart(3, '0'), name: nm, classId: c.id })));
    return { classes, students, attendance: {} };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && d.classes && d.students && d.attendance) return d; }
    } catch (e) { /* abaikan, buat data baru */ }
    const d = seed();
    localStorage.setItem(KEY, JSON.stringify(d));
    return d;
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const loadSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } };
  const saveSession = () => session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY);

  let db = load();
  let session = loadSession();
  if (session && session.role === 'siswa' && !db.students.some(s => s.id === session.id)) session = null;

  const ui = { tab: 'beranda', classId: null, date: todayISO(), q: '', month: todayISO().slice(0, 7), filterClass: 'all', loginRole: 'guru', loginError: '' };

  const studentById = id => db.students.find(s => s.id === id);
  const classById = id => db.classes.find(c => c.id === id);
  function ensureClass() { if (!classById(ui.classId)) ui.classId = db.classes[0] ? db.classes[0].id : null; }

  /* ========== Komponen kecil ========== */
  const badge = code => code
    ? `<span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS[code].badge}">${STATUS[code].label}</span>`
    : `<span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Belum diisi</span>`;
  const classOptions = (sel, withAll) =>
    (withAll ? `<option value="all" ${sel === 'all' ? 'selected' : ''}>Semua kelas</option>` : '') +
    db.classes.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500';
  const btnPrimary = 'rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 text-sm';
  const btnGhost = 'rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 text-sm';

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  const app = $('#app');

  /* ========== Login ========== */
  function viewLogin() {
    const guru = ui.loginRole === 'guru';
    const tabCls = on => `flex-1 py-2 rounded-md text-sm font-semibold ${on ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`;
    app.innerHTML = `
    <main class="min-h-screen grid lg:grid-cols-2">
      <section class="bg-indigo-950 text-white p-8 lg:p-14 flex flex-col justify-between login-panel">
        <div class="relative z-10">
          <p class="text-indigo-200 font-semibold">Absensi Sekolah</p>
          <div class="py-12">
            <p class="text-indigo-300 text-lg">${fmtDate(todayISO(), { weekday: 'long' })}</p>
            <p class="text-8xl sm:text-9xl font-extrabold tracking-tight leading-none mt-2">${new Date().getDate()}</p>
            <p class="text-2xl font-semibold mt-3 text-indigo-100">${fmtDate(todayISO(), { month: 'long', year: 'numeric' })}</p>
          </div>
          <p class="text-indigo-300 max-w-sm">Guru mencatat kehadiran per kelas. Siswa bisa check-in sendiri dan melihat riwayatnya.</p>
        </div>
        <img class="login-photo" src="assets/student-reading-outdoors.jpg" alt="Siswa memegang buku di luar kelas">
      </section>
      <section class="flex items-center justify-center p-6 sm:p-12">
        <form id="loginForm" class="w-full max-w-sm space-y-5" novalidate>
          <h1 class="text-2xl font-bold text-slate-900">Masuk</h1>
          <div class="flex gap-1 p-1 bg-slate-200 rounded-lg" role="group" aria-label="Peran">
            <button type="button" data-action="role" data-role="guru" aria-pressed="${guru}" class="${tabCls(guru)}">Guru</button>
            <button type="button" data-action="role" data-role="siswa" aria-pressed="${!guru}" class="${tabCls(!guru)}">Siswa</button>
          </div>
          ${guru ? `
            <label class="block text-sm font-medium">Username<input name="username" autocomplete="username" class="${inputCls} mt-1"></label>
            <label class="block text-sm font-medium">Password<input name="password" type="password" autocomplete="current-password" class="${inputCls} mt-1"></label>
          ` : `
            <label class="block text-sm font-medium">NIS<input name="nis" inputmode="numeric" class="${inputCls} mt-1"></label>
          `}
          <p class="text-sm text-red-600 min-h-[1.25rem]" role="alert">${esc(ui.loginError)}</p>
          <button class="${btnPrimary} w-full py-2.5">Masuk</button>
        </form>
      </section>
    </main>`;
  }

  /* ========== Kerangka halaman ========== */
  function render() {
    if (!session) return viewLogin();
    const guru = session.role === 'guru';
    const me = guru ? 'Guru ' : (studentById(session.id) || {}).name;
    const tabs = [['beranda', 'Kelas'], ['absensi', 'Absensi'], ['rekap', 'Rekap'], ['siswa', 'Siswa']];
    app.innerHTML = `
    <header class="bg-white border-b border-slate-200">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <p class="font-extrabold text-indigo-700 text-lg">Absensi Sekolah</p>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-600 hidden sm:inline">${esc(me)}</span>
          ${guru ? `<button data-action="download-excel" class="${btnPrimary}" title="Unduh seluruh data absensi untuk Excel">Download Excel</button>` : ''}
          <button data-action="logout" class="${btnGhost}">Keluar</button>
        </div>
      </div>
      ${guru ? `<nav class="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto" aria-label="Menu">
        ${tabs.map(([k, l]) => `<button data-action="tab" data-tab="${k}" ${ui.tab === k ? 'aria-current="page"' : ''}
          class="px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap ${ui.tab === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">${l}</button>`).join('')}
      </nav>` : ''}
    </header>
    <main class="max-w-5xl mx-auto px-4 py-6">${guru ? guruBody() : siswaBody()}</main>`;
    if (guru) {
      if (ui.tab === 'absensi') refreshAbsensi();
      if (ui.tab === 'rekap') refreshRekap();
      if (ui.tab === 'siswa') refreshSiswa();
    }
  }

  function guruBody() {
    ensureClass();
    switch (ui.tab) {
      case 'absensi': return tabAbsensi();
      case 'rekap': return tabRekap();
      case 'siswa': return tabSiswa();
      default: return tabBeranda();
    }
  }

  /* ========== Guru: Kelas ========== */
  function tabBeranda() {
    const day = db.attendance[todayISO()] || {};
    const cards = db.classes.map(c => {
      const st = db.students.filter(s => s.classId === c.id);
      const filled = st.filter(s => day[s.id]).length;
      const hadir = st.filter(s => day[s.id] && day[s.id].status === 'H').length;
      const pct = st.length ? Math.round(filled / st.length * 100) : 0;
      return `<button data-action="open-class" data-id="${c.id}" class="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-400">
        <span class="flex items-baseline justify-between"><span class="text-lg font-bold">${esc(c.name)}</span><span class="text-sm text-slate-500">${st.length} siswa</span></span>
        <span class="block h-2 rounded-full bg-slate-100 mt-4 overflow-hidden"><span class="block h-full bg-indigo-500" style="width:${pct}%"></span></span>
        <span class="block text-sm text-slate-600 mt-2">${filled} dari ${st.length} sudah diisi hari ini</span>
        <span class="block text-sm text-slate-600">${hadir} hadir</span>
      </button>`;
    }).join('');
    return `
      <h1 class="text-2xl font-bold text-slate-900">Kelas hari ini</h1>
      <p class="text-slate-500 mt-1">${fmtDate(todayISO())}</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">${cards || '<p class="text-slate-500">Belum ada kelas. Tambahkan kelas pertama di bawah.</p>'}</div>
      <form id="classForm" class="mt-8 bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap gap-3 items-end">
        <label class="flex-1 min-w-[12rem] text-sm font-medium">Tambah kelas<input name="name" placeholder="Contoh: XII IPA 1" class="${inputCls} mt-1" required></label>
        <button class="${btnPrimary}">Tambah kelas</button>
      </form>`;
  }

  /* ========== Guru: Absensi harian ========== */
  function tabAbsensi() {
    return `
      <h1 class="text-2xl font-bold text-slate-900">Absensi harian</h1>
      <div class="flex flex-wrap gap-3 items-end mt-4">
        <label class="text-sm font-medium">Kelas<select id="selClass" class="${inputCls} mt-1">${classOptions(ui.classId)}</select></label>
        <label class="text-sm font-medium">Tanggal<input id="selDate" type="date" value="${ui.date}" class="${inputCls} mt-1"></label>
        <label class="text-sm font-medium flex-1 min-w-[12rem]">Cari siswa<input id="q" value="${esc(ui.q)}" placeholder="Nama atau NIS" class="${inputCls} mt-1"></label>
      </div>
      <div id="summary" class="mt-5"></div>
      <ul id="list" class="mt-3 space-y-2"></ul>`;
  }
  function refreshAbsensi() {
    const day = db.attendance[ui.date] || {};
    const all = db.students.filter(s => s.classId === ui.classId);
    const q = ui.q.trim().toLowerCase();
    const list = all.filter(s => !q || s.name.toLowerCase().includes(q) || s.nis.includes(q));
    const count = k => all.filter(s => day[s.id] && day[s.id].status === k).length;
    const unfilled = all.filter(s => !day[s.id]).length;
    $('#summary').innerHTML = `<div class="flex flex-wrap gap-2 items-center">
      ${ORDER.map(k => `<span class="inline-flex gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${STATUS[k].badge}">${STATUS[k].label} <span>${count(k)}</span></span>`).join('')}
      <span class="inline-flex gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-600">Belum diisi <span>${unfilled}</span></span>
      <button data-action="mark-all" class="${btnGhost} ml-auto" ${unfilled ? '' : 'disabled'}>Tandai sisanya hadir</button>
    </div>`;
    $('#list').innerHTML = list.length ? list.map(s => {
      const r = day[s.id];
      const meta = [`NIS ${esc(s.nis)}`];
      if (r && r.by === 'siswa') meta.push(`check-in mandiri pukul ${r.time}`);
      if (r && r.note) meta.push(`catatan: ${esc(r.note)}`);
      return `<li class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex-1 min-w-0"><p class="font-semibold truncate">${esc(s.name)}</p><p class="text-sm text-slate-500">${meta.join(', ')}</p></div>
        <div class="flex gap-1.5" role="group" aria-label="Status ${esc(s.name)}">
          ${ORDER.map(k => `<button data-action="set" data-id="${s.id}" data-s="${k}" aria-pressed="${!!r && r.status === k}"
            class="px-3 py-1.5 rounded-lg text-sm font-semibold ${r && r.status === k ? STATUS[k].on : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${STATUS[k].label}</button>`).join('')}
        </div></li>`;
    }).join('') : `<li class="text-slate-500 py-8 text-center">${all.length ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Kelas ini belum punya siswa. Tambahkan di menu Siswa.'}</li>`;
  }
  function setStatus(id, code) {
    const day = (db.attendance[ui.date] ||= {});
    const prev = day[id];
    if (prev && prev.status === code) delete day[id];
    else day[id] = { status: code, note: prev ? prev.note : '', time: prev ? prev.time : nowHM(), by: prev ? prev.by : 'guru' };
    if (!Object.keys(day).length) delete db.attendance[ui.date];
    save(); refreshAbsensi();
  }

  /* ========== Guru: Rekap ========== */
  function rekapData() {
    const ids = new Set(db.students.filter(s => s.classId === ui.classId).map(s => s.id));
    const dates = Object.keys(db.attendance).filter(d => d.startsWith(ui.month) && Object.keys(db.attendance[d]).some(id => ids.has(id))).sort();
    const q = ui.q.trim().toLowerCase();
    const rows = db.students.filter(s => s.classId === ui.classId && (!q || s.name.toLowerCase().includes(q) || s.nis.includes(q))).map(s => {
      const c = { H: 0, I: 0, S: 0, A: 0 };
      dates.forEach(d => { const r = db.attendance[d][s.id]; if (r) c[r.status]++; });
      return { s, c, pct: dates.length ? Math.round(c.H / dates.length * 100) : 0 };
    });
    return { rows, days: dates.length };
  }
  function tabRekap() {
    return `
      <h1 class="text-2xl font-bold text-slate-900">Rekap kehadiran</h1>
      <div class="flex flex-wrap gap-3 items-end mt-4">
        <label class="text-sm font-medium">Kelas<select id="selClass" class="${inputCls} mt-1">${classOptions(ui.classId)}</select></label>
        <label class="text-sm font-medium">Bulan<input id="selMonth" type="month" value="${ui.month}" class="${inputCls} mt-1"></label>
        <label class="text-sm font-medium flex-1 min-w-[12rem]">Cari siswa<input id="q" value="${esc(ui.q)}" placeholder="Nama atau NIS" class="${inputCls} mt-1"></label>
        <button data-action="export" class="${btnGhost}">Unduh CSV</button>
      </div>
      <p id="rekapInfo" class="text-sm text-slate-500 mt-4"></p>
      <div class="mt-2 overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table class="w-full text-sm"><thead class="bg-slate-50 text-slate-600"><tr>
          <th class="text-left font-semibold p-3">Nama</th>
          ${ORDER.map(k => `<th class="font-semibold p-3 text-center">${STATUS[k].label}</th>`).join('')}
          <th class="font-semibold p-3 text-right">% Hadir</th></tr></thead>
        <tbody id="rekapBody" class="divide-y divide-slate-100"></tbody></table>
      </div>`;
  }
  function refreshRekap() {
    const { rows, days } = rekapData();
    $('#rekapInfo').textContent = days ? `${days} hari tercatat pada ${fmtDate(ui.month + '-01', { month: 'long', year: 'numeric' })}.` : 'Belum ada absensi tercatat pada bulan ini.';
    $('#rekapBody').innerHTML = rows.length ? rows.map(({ s, c, pct }) => `<tr>
      <td class="p-3"><p class="font-semibold">${esc(s.name)}</p><p class="text-slate-500">NIS ${esc(s.nis)}</p></td>
      ${ORDER.map(k => `<td class="p-3 text-center">${c[k] ? `<span class="inline-flex min-w-[1.75rem] justify-center px-2 py-0.5 rounded-full font-semibold ${STATUS[k].badge}">${c[k]}</span>` : '<span class="text-slate-300">0</span>'}</td>`).join('')}
      <td class="p-3 text-right font-semibold">${pct}%</td></tr>`).join('')
      : '<tr><td colspan="6" class="p-8 text-center text-slate-500">Tidak ada siswa untuk ditampilkan.</td></tr>';
  }
  function exportCSV() {
    const { rows } = rekapData();
    const cls = (classById(ui.classId) || {}).name || 'kelas';
    const lines = [['Nama', 'NIS', 'Hadir', 'Izin', 'Sakit', 'Alpa', '% Hadir']].concat(rows.map(({ s, c, pct }) => [s.name, s.nis, c.H, c.I, c.S, c.A, pct]));
    const csv = '\ufeff' + lines.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `rekap-${cls.replace(/\s+/g, '-')}-${ui.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadAttendanceCSV() {
    const rows = [];
    Object.keys(db.attendance).sort().forEach(date => {
      Object.entries(db.attendance[date]).forEach(([studentId, record]) => {
        const student = studentById(studentId);
        if (!student) return;
        rows.push([
          date,
          (classById(student.classId) || {}).name || '',
          student.name,
          student.nis,
          STATUS[record.status] ? STATUS[record.status].label : record.status,
          record.note || '',
          record.time || '',
          record.by === 'siswa' ? 'Siswa' : 'Guru'
        ]);
      });
    });
    const headers = ['Tanggal', 'Kelas', 'Nama siswa', 'NIS', 'Status', 'Catatan', 'Waktu', 'Diisi oleh'];
    const escXml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const cell = (value, style = 'Cell') => `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escXml(value)}</Data></Cell>`;
    const xmlRows = [
      `<Row ss:AutoFitHeight="0" ss:Height="30"><Cell ss:MergeAcross="7" ss:StyleID="Title"><Data ss:Type="String">DATA ABSENSI SEKOLAH</Data></Cell></Row>`,
      `<Row><Cell ss:MergeAcross="7" ss:StyleID="Subtitle"><Data ss:Type="String">Diunduh pada ${escXml(fmtDate(todayISO()))}</Data></Cell></Row>`,
      '<Row ss:AutoFilter="1" ss:Height="24">' + headers.map(h => cell(h, 'Header')).join('') + '</Row>',
      ...rows.map(row => `<Row>${row.map((value, index) => cell(value, index === 4 ? `Status${value}` : 'Cell')).join('')}</Row>`)
    ].join('');
    const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/><Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
<Style ss:ID="Title"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#312E81" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
<Style ss:ID="Subtitle"><Font ss:Italic="1" ss:Color="#64748B"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#312E81"/></Borders></Style>
<Style ss:ID="Cell"><Alignment ss:Vertical="Center"/><NumberFormat ss:Format="@"/></Style>
<Style ss:ID="StatusHadir"><Font ss:Bold="1" ss:Color="#166534"/><Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/></Style><Style ss:ID="StatusIzin"><Font ss:Bold="1" ss:Color="#854D0E"/><Interior ss:Color="#FEF9C3" ss:Pattern="Solid"/></Style><Style ss:ID="StatusSakit"><Font ss:Bold="1" ss:Color="#9A3412"/><Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/></Style><Style ss:ID="StatusAlpa"><Font ss:Bold="1" ss:Color="#991B1B"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
</Styles><Worksheet ss:Name="Data Absensi"><Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="${rows.length + 3}" x:FullColumns="1" x:FullRows="1"><Column ss:Width="85"/><Column ss:Width="105"/><Column ss:Width="150"/><Column ss:Width="75"/><Column ss:Width="90"/><Column ss:Width="220"/><Column ss:Width="65"/><Column ss:Width="80"/>${xmlRows}</Table><AutoFilter x:Range="R3C1:R${rows.length + 3}C8" xmlns="urn:schemas-microsoft-com:office:excel"/></Worksheet></Workbook>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.ms-excel' }));
    a.download = `data-absensi-${todayISO()}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(rows.length ? 'Data Excel berhasil diunduh' : 'Belum ada data absensi untuk diunduh');
  }

  /* ========== Guru: Kelola siswa ========== */
  function tabSiswa() {
    return `
      <h1 class="text-2xl font-bold text-slate-900">Data siswa</h1>
      <form id="studentForm" class="mt-4 bg-white rounded-xl border border-slate-200 p-5 grid sm:grid-cols-4 gap-3 items-end">
        <label class="text-sm font-medium sm:col-span-2">Nama lengkap<input name="name" class="${inputCls} mt-1" required></label>
        <label class="text-sm font-medium">NIS<input name="nis" inputmode="numeric" class="${inputCls} mt-1" required></label>
        <label class="text-sm font-medium">Kelas<select name="classId" class="${inputCls} mt-1">${classOptions(ui.classId)}</select></label>
        <div class="sm:col-span-4"><button class="${btnPrimary}">Tambah siswa</button> <span id="formError" class="text-sm text-red-600 ml-2"></span></div>
      </form>
      <div class="flex flex-wrap gap-3 items-end mt-6">
        <label class="text-sm font-medium">Tampilkan<select id="selFilter" class="${inputCls} mt-1">${classOptions(ui.filterClass, true)}</select></label>
        <label class="text-sm font-medium flex-1 min-w-[12rem]">Cari siswa<input id="q" value="${esc(ui.q)}" placeholder="Nama atau NIS" class="${inputCls} mt-1"></label>
      </div>
      <ul id="list" class="mt-3 space-y-2"></ul>`;
  }
  function refreshSiswa() {
    const q = ui.q.trim().toLowerCase();
    const list = db.students.filter(s => (ui.filterClass === 'all' || s.classId === ui.filterClass) && (!q || s.name.toLowerCase().includes(q) || s.nis.includes(q)));
    $('#list').innerHTML = list.length ? list.map(s => `<li class="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
      <div class="flex-1 min-w-0"><p class="font-semibold truncate">${esc(s.name)}</p><p class="text-sm text-slate-500">NIS ${esc(s.nis)}, ${esc((classById(s.classId) || {}).name || '-')}</p></div>
      <button data-action="del-student" data-id="${s.id}" class="text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5">Hapus</button></li>`).join('')
      : '<li class="text-slate-500 py-8 text-center">Tidak ada siswa yang cocok.</li>';
  }

  /* ========== Siswa ========== */
  function siswaBody() {
    const st = studentById(session.id);
    const kelas = classById(st.classId);
    const today = todayISO();
    const rec = (db.attendance[today] || {})[st.id];
    const dates = Object.keys(db.attendance).filter(d => db.attendance[d][st.id]).sort().reverse();
    const counts = { H: 0, I: 0, S: 0, A: 0 };
    dates.forEach(d => counts[db.attendance[d][st.id].status]++);

    const todayCard = rec ? `
      <div class="flex items-center gap-3 flex-wrap">${badge(rec.status)}<span class="text-slate-600 text-sm">tercatat pukul ${esc(rec.time)}${rec.by === 'guru' ? ' oleh guru' : ''}</span></div>
      ${rec.note ? `<p class="text-sm text-slate-600 mt-3">Catatan: ${esc(rec.note)}</p>` : ''}`
      : `<label class="block text-sm font-medium">Catatan (boleh dikosongkan)
          <textarea id="note" rows="2" maxlength="200" class="${inputCls} mt-1" placeholder="Contoh: masuk dari ruang lab"></textarea></label>
         <button data-action="checkin" class="${btnPrimary} mt-3 px-5 py-2.5">Check-in hadir</button>`;

    return `
      <h1 class="text-2xl font-bold text-slate-900">Halo, ${esc(st.name.split(' ')[0])}</h1>
      <p class="text-slate-500 mt-1">${esc(kelas ? kelas.name : '')}, NIS ${esc(st.nis)}</p>
      <section class="mt-5 bg-white rounded-xl border border-slate-200 p-5">
        <h2 class="font-bold text-lg">Hari ini, ${fmtDate(today)}</h2>
        <div class="mt-3">${todayCard}</div>
      </section>
      <section class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${ORDER.map(k => `<div class="rounded-xl p-4 ${STATUS[k].badge}"><p class="text-3xl font-extrabold">${counts[k]}</p><p class="text-sm font-semibold">${STATUS[k].label}</p></div>`).join('')}
      </section>
      <section class="mt-5">
        <h2 class="font-bold text-lg">Riwayat kehadiran</h2>
        <ul class="mt-3 space-y-2">
          ${dates.length ? dates.map(d => { const r = db.attendance[d][st.id]; return `<li class="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div class="flex-1 min-w-0"><p class="font-semibold">${fmtDate(d)}</p><p class="text-sm text-slate-500">pukul ${esc(r.time)}${r.note ? `, ${esc(r.note)}` : ''}</p></div>${badge(r.status)}</li>`; }).join('')
            : '<li class="text-slate-500 py-8 text-center">Belum ada riwayat. Check-in pertamamu akan muncul di sini.</li>'}
        </ul>
      </section>`;
  }

  /* ========== Event ========== */
  app.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'role') { ui.loginRole = el.dataset.role; ui.loginError = ''; viewLogin(); }
    else if (a === 'logout') { session = null; saveSession(); ui.tab = 'beranda'; ui.loginError = ''; render(); }
    else if (a === 'download-excel') downloadAttendanceCSV();
    else if (a === 'tab') { ui.tab = el.dataset.tab; ui.q = ''; render(); }
    else if (a === 'open-class') { ui.classId = el.dataset.id; ui.tab = 'absensi'; ui.q = ''; render(); }
    else if (a === 'set') setStatus(el.dataset.id, el.dataset.s);
    else if (a === 'mark-all') {
      const day = (db.attendance[ui.date] ||= {});
      db.students.filter(s => s.classId === ui.classId && !day[s.id]).forEach(s => { day[s.id] = { status: 'H', note: '', time: nowHM(), by: 'guru' }; });
      save(); refreshAbsensi(); toast('Sisa siswa ditandai hadir');
    }
    else if (a === 'del-student') {
      const s = studentById(el.dataset.id);
      if (!s || !confirm(`Hapus ${s.name}? Riwayat absensinya ikut terhapus.`)) return;
      db.students = db.students.filter(x => x.id !== s.id);
      Object.keys(db.attendance).forEach(d => { delete db.attendance[d][s.id]; if (!Object.keys(db.attendance[d]).length) delete db.attendance[d]; });
      save(); refreshSiswa(); toast('Siswa dihapus');
    }
    else if (a === 'export') exportCSV();
    else if (a === 'checkin') {
      const st = studentById(session.id);
      const day = (db.attendance[todayISO()] ||= {});
      if (day[st.id]) return;
      day[st.id] = { status: 'H', note: ($('#note').value || '').trim().slice(0, 200), time: nowHM(), by: 'siswa' };
      save(); render(); toast('Check-in berhasil');
    }
  });

  app.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'selClass') { ui.classId = e.target.value; ui.tab === 'rekap' ? refreshRekap() : refreshAbsensi(); }
    else if (id === 'selDate') { ui.date = e.target.value || todayISO(); refreshAbsensi(); }
    else if (id === 'selMonth') { ui.month = e.target.value || todayISO().slice(0, 7); refreshRekap(); }
    else if (id === 'selFilter') { ui.filterClass = e.target.value; refreshSiswa(); }
  });

  app.addEventListener('input', e => {
    if (e.target.id !== 'q') return;
    ui.q = e.target.value;
    if (ui.tab === 'absensi') refreshAbsensi();
    else if (ui.tab === 'rekap') refreshRekap();
    else if (ui.tab === 'siswa') refreshSiswa();
  });

  app.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const v = n => (f.elements[n] ? f.elements[n].value.trim() : '');
    if (f.id === 'loginForm') {
      if (ui.loginRole === 'guru') {
        if (v('username') === GURU.username && v('password') === GURU.password) { session = { role: 'guru' }; ui.tab = 'beranda'; }
        else { ui.loginError = 'Username atau password salah.'; return viewLogin(); }
      } else {
        const st = db.students.find(s => s.nis === v('nis'));
        if (!st) { ui.loginError = 'NIS tidak ditemukan. Hubungi guru kelasmu.'; return viewLogin(); }
        session = { role: 'siswa', id: st.id };
      }
      ui.loginError = ''; saveSession(); render();
    }
    else if (f.id === 'classForm') {
      const name = v('name');
      if (!name) return;
      if (db.classes.some(c => c.name.toLowerCase() === name.toLowerCase())) return toast('Kelas sudah ada');
      db.classes.push({ id: uid('k'), name }); save(); render(); toast('Kelas ditambahkan');
    }
    else if (f.id === 'studentForm') {
      const name = v('name'), nis = v('nis');
      if (!name || !nis) return;
      if (db.students.some(s => s.nis === nis)) { $('#formError').textContent = 'NIS sudah dipakai siswa lain.'; return; }
      db.students.push({ id: uid('s'), nis, name, classId: v('classId') });
      save(); f.reset(); $('#formError').textContent = ''; refreshSiswa(); toast('Siswa ditambahkan');
    }
  });

  render();
})();

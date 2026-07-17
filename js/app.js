/* ============================================================
   VISUAL LIBRARY — Core App v2
   Cloud: ewsylug3 | Fonts: Sora + ClashDisplay
   ============================================================ */

const CLOUD = 'ewsylug3';
const CDN   = `https://res.cloudinary.com/${CLOUD}/image/upload`;

function img(id, w=480, h=720) {
  return `${CDN}/c_fill,w_${w},h_${h},f_auto,q_auto/${id}`;
}
function imgFull(id) {
  return `${CDN}/f_auto,q_auto/${id}`;
}

let DATA = { categories:[], wallpapers:[] };
let state = { filter:'all', query:'', visible:24 };
const PAGE = 24;

/* ── BOOT ── */
async function boot() {
  try {
    const r = await fetch('/wallpapers.json');
    DATA = await r.json();
  } catch(e) { console.warn('Data load failed', e); }

  const page = document.body.dataset.page;
  setupHeader();
  if (page === 'home')      initHome();
  if (page === 'wallpaper') initWallpaper();
  if (page === 'category')  initCategory();
  if (page === 'search')    initSearch();
  if (page === 'static')    initStatic();
  if (page === 'admin')     initAdmin();
  document.querySelector('main')?.classList.add('page-transition');
}

/* ── HEADER ── */
function setupHeader() {
  // Scroll shadow
  window.addEventListener('scroll', () => {
    document.querySelector('.site-header')?.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive:true });

  // Mobile menu
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('mobileNav')?.classList.toggle('open');
  });

  // Search autocomplete (all search boxes)
  document.querySelectorAll('.vl-search').forEach(setupSearch);
}

function setupSearch(form) {
  const input    = form.querySelector('input[name="q"]');
  const dropdown = form.querySelector('.search-dropdown');
  if (!input) return;

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderSuggestions(input.value.trim(), dropdown), 160);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = input.value.trim();
      if (q) { dropdown?.classList.remove('open'); navigate(`/search.html?q=${encodeURIComponent(q)}`); }
    }
    if (e.key === 'Escape') dropdown?.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!form.contains(e.target)) dropdown?.classList.remove('open');
  });

  form.querySelector('.search-submit')?.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) navigate(`/search.html?q=${encodeURIComponent(q)}`);
  });
}

function renderSuggestions(q, dropdown) {
  if (!dropdown) return;
  if (!q || q.length < 1) { dropdown.classList.remove('open'); return; }

  const ql = q.toLowerCase();
  const catMatches = DATA.categories.filter(c => c.name.toLowerCase().includes(ql)).slice(0, 2);
  const wpMatches  = DATA.wallpapers.filter(w =>
    w.title.toLowerCase().includes(ql) ||
    (w.tags||[]).some(t => t.includes(ql))
  ).slice(0, 6);

  if (!catMatches.length && !wpMatches.length) { dropdown.classList.remove('open'); return; }

  dropdown.innerHTML = '';

  catMatches.forEach(cat => {
    const el = document.createElement('div');
    el.className = 'search-item';
    el.innerHTML = `
      <div class="search-item-img" style="background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:18px;">🗂</div>
      <div class="search-item-info">
        <div class="search-item-title">${cat.name}</div>
        <div class="search-item-cat">Category</div>
      </div>
      <span class="search-item-tag">Category</span>`;
    el.addEventListener('click', () => navigate(`/category.html?id=${cat.id}`));
    dropdown.appendChild(el);
  });

  wpMatches.forEach(wp => {
    const cat = DATA.categories.find(c => c.id === wp.category);
    const el  = document.createElement('div');
    el.className = 'search-item';
    el.innerHTML = `
      <img class="search-item-img" src="${img(wp.cloudinary_id, 72, 108)}" alt="${wp.title}" loading="lazy"/>
      <div class="search-item-info">
        <div class="search-item-title">${highlight(wp.title, q)}</div>
        <div class="search-item-cat">${cat?.name || ''}</div>
      </div>
      ${wp.resolution ? `<span class="search-item-tag">${wp.resolution}</span>` : ''}`;
    el.addEventListener('click', () => navigate(`/wallpaper.html?id=${wp.id}`));
    dropdown.appendChild(el);
  });

  dropdown.classList.add('open');
}

function highlight(text, q) {
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background:var(--accent-dim);color:var(--accent);border-radius:3px;padding:0 2px">$1</mark>');
}

function navigate(url) {
  document.querySelector('main')?.classList.remove('page-transition');
  setTimeout(() => window.location.href = url, 80);
}

/* ── HOME ── */
function initHome() {
  buildCatChips();
  buildGrid('wp-grid', filtered());
  updateHeroStats();
  buildFooterCats();

  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    state.visible += PAGE;
    buildGrid('wp-grid', filtered());
  });
}

function buildCatChips() {
  const wrap = document.getElementById('catScroll');
  if (!wrap) return;
  wrap.innerHTML = '';
  const all = chip('All', 'all', true);
  wrap.appendChild(all);
  DATA.categories.forEach(c => wrap.appendChild(chip(c.name, c.id, false)));
}

function chip(name, id, active) {
  const el = document.createElement('button');
  el.className = 'cat-chip' + (active ? ' active' : '');
  el.textContent = name;
  el.onclick = () => {
    state.filter = id; state.visible = PAGE;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    buildGrid('wp-grid', filtered());
  };
  return el;
}

function filtered() {
  let list = DATA.wallpapers;
  if (state.filter !== 'all') list = list.filter(w => w.category === state.filter || w.subcategory?.startsWith(state.filter));
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter(w => w.title.toLowerCase().includes(q) || (w.tags||[]).some(t=>t.includes(q)));
  }
  return list;
}

function buildGrid(id, wallpapers) {
  const grid = document.getElementById(id);
  if (!grid) return;
  const slice = wallpapers.slice(0, state.visible);
  grid.innerHTML = '';

  if (!slice.length) {
    grid.innerHTML = `<div class="empty-state">
      <svg fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
      <h3>Nothing found</h3><p>Try a different search or category.</p></div>`;
    return;
  }

  slice.forEach(wp => {
    const cat = DATA.categories.find(c => c.id === wp.category);
    const a   = document.createElement('a');
    a.className = 'wp-card';
    a.href      = `/wallpaper.html?id=${wp.id}`;
    a.innerHTML = `
      <div class="wp-thumb">
        <img src="${img(wp.cloudinary_id)}" alt="${wp.title}" loading="lazy"/>
        <div class="wp-overlay">
          <span class="wp-quick-dl">
            <svg style="width:13px;height:13px;fill:none;stroke:#fff;stroke-width:2.5" viewBox="0 0 24 24"><path d="M12 3v13m0 0l-5-5m5 5l5-5M5 21h14" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Download
          </span>
        </div>
        <span class="wp-badge">${cat?.name || wp.category}</span>
        ${wp.resolution ? `<span class="wp-res">${wp.resolution}</span>` : ''}
      </div>
      <div class="wp-info">
        <div class="wp-title">${wp.title}</div>
        <div class="wp-cat">${cat?.name || ''}</div>
      </div>`;
    grid.appendChild(a);
  });

  const btn = document.getElementById('loadMoreBtn');
  if (btn) btn.style.display = wallpapers.length > state.visible ? 'inline-flex' : 'none';
}

function updateHeroStats() {
  const totalEl = document.getElementById('statTotal');
  const catEl   = document.getElementById('statCats');
  if (totalEl) totalEl.textContent = DATA.wallpapers.length + '+';
  if (catEl)   catEl.textContent   = DATA.categories.length;
}

function buildFooterCats() {
  const ul = document.getElementById('footerCats');
  if (!ul) return;
  DATA.categories.forEach(c => {
    ul.innerHTML += `<li><a href="/category.html?id=${c.id}">${c.name}</a></li>`;
  });
}

/* ── WALLPAPER PAGE ── */
function initWallpaper() {
  const id = new URLSearchParams(location.search).get('id');
  const wp = DATA.wallpapers.find(w => w.id === id);
  if (!wp) return;

  const cat = DATA.categories.find(c => c.id === wp.category);
  document.title = `${wp.title} — Visual Library`;

  const imgEl = document.getElementById('wpImg');
  if (imgEl) { imgEl.src = imgFull(wp.cloudinary_id); imgEl.alt = wp.title; }

  const titleEl = document.getElementById('wpTitle');
  if (titleEl) titleEl.textContent = wp.title;

  const tagsEl = document.getElementById('wpTags');
  if (tagsEl) {
    if (cat) tagsEl.innerHTML += `<a class="tag cat-tag" href="/category.html?id=${cat.id}">${cat.name}</a>`;
    if (wp.resolution) tagsEl.innerHTML += `<span class="tag">${wp.resolution}</span>`;
    (wp.tags||[]).forEach(t => tagsEl.innerHTML += `<span class="tag">#${t}</span>`);
  }

  const dlBtn = document.getElementById('dlBtn');
  if (dlBtn) dlBtn.href = imgFull(wp.cloudinary_id);

  const related = DATA.wallpapers.filter(w => w.category === wp.category && w.id !== wp.id).slice(0, 12);
  state.visible = 12;
  buildGrid('relatedGrid', related);
}

/* ── CATEGORY PAGE ── */
function initCategory() {
  const id  = new URLSearchParams(location.search).get('id');
  const cat = DATA.categories.find(c => c.id === id);
  if (!cat) return;

  document.title = `${cat.name} Wallpapers — Visual Library`;
  document.getElementById('catTitle').textContent = `${cat.name} Wallpapers`;
  document.getElementById('catDesc').textContent  = cat.description || '';

  const subWrap = document.getElementById('subCats');
  if (subWrap && cat.subcategories?.length) {
    cat.subcategories.forEach(s => {
      const a = document.createElement('a');
      a.className = 'cat-chip'; a.href = `/category.html?id=${s.id}`;
      a.textContent = s.name; subWrap.appendChild(a);
      if (s.subcategories?.length) {
        s.subcategories.forEach(ss => {
          const b = document.createElement('a');
          b.className = 'cat-chip'; b.href = `/category.html?id=${ss.id}`;
          b.textContent = ss.name; subWrap.appendChild(b);
        });
      }
    });
  }

  const list = DATA.wallpapers.filter(w => w.category === id || w.subcategory === id || w.subcategory?.startsWith(id + '/'));
  state.visible = PAGE;
  buildGrid('wp-grid', list);
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    state.visible += PAGE; buildGrid('wp-grid', list);
  });
}

/* ── SEARCH PAGE ── */
function initSearch() {
  const q = new URLSearchParams(location.search).get('q') || '';
  state.query = q.toLowerCase();

  document.title = `"${q}" — Visual Library`;
  const h = document.getElementById('searchTitle');
  const p = document.getElementById('searchCount');
  const results = filtered();
  if (h) h.textContent = `Results for "${q}"`;
  if (p) p.textContent = `${results.length} wallpaper${results.length !== 1 ? 's' : ''} found`;

  const input = document.querySelector('.vl-search input[name="q"]');
  if (input) input.value = q;

  state.visible = PAGE;
  buildGrid('wp-grid', results);
  document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
    state.visible += PAGE; buildGrid('wp-grid', results);
  });
}

/* ── STATIC (privacy/disclaimer) ── */
function initStatic() {}

/* ── ADMIN ── */
function initAdmin() {
  const PASS = 'vl2024admin';
  const lockEl  = document.getElementById('adminLock');
  const dashEl  = document.getElementById('adminDash');
  const passIn  = document.getElementById('adminPass');
  const passBtn = document.getElementById('adminSubmit');

  function unlock() {
    lockEl.style.display = 'none';
    dashEl.style.display = 'block';
    buildAdminDash();
  }

  if (sessionStorage.getItem('vl_admin') === '1') unlock();

  passBtn?.addEventListener('click', () => {
    if (passIn?.value === PASS) {
      sessionStorage.setItem('vl_admin', '1');
      unlock();
    } else {
      passIn.style.borderColor = 'var(--cta)';
      passIn.value = '';
      passIn.placeholder = 'Wrong password';
    }
  });

  passIn?.addEventListener('keydown', e => { if (e.key === 'Enter') passBtn?.click(); });
}

function buildAdminDash() {
  const total    = document.getElementById('statWallpapers');
  const cats     = document.getElementById('statCategories');
  const lastEl   = document.getElementById('statLast');
  const catList  = document.getElementById('adminCatList');

  if (total) total.textContent = DATA.wallpapers.length;
  if (cats)  cats.textContent  = DATA.categories.length;

  const last = DATA.wallpapers[DATA.wallpapers.length - 1];
  if (lastEl && last) lastEl.textContent = last.title;

  if (!catList) return;
  const max = Math.max(...DATA.categories.map(c =>
    DATA.wallpapers.filter(w => w.category === c.id).length
  ));

  DATA.categories.forEach(c => {
    const count = DATA.wallpapers.filter(w => w.category === c.id).length;
    const pct   = max ? Math.round((count / max) * 100) : 0;
    catList.innerHTML += `
      <div class="cat-stat-row">
        <span class="cat-name">${c.name}</span>
        <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%"></div></div>
        <span class="cat-count">${count}</span>
      </div>`;
  });
}

document.addEventListener('DOMContentLoaded', boot);

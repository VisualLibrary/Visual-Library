(function(){
'use strict';

var C='ewsylug3';
var B='https://res.cloudinary.com/'+C+'/image/upload';
var PG=24;
var _d={categories:[],wallpapers:[]};
var _s={filter:'all',query:'',visible:PG};

/* ── Image helpers ─────────────────────────────────────────────────────── */
function _img(id,w,h){
  w=w||480;h=h||720;
  return B+'/c_fill,w_'+w+',h_'+h+',f_auto,q_auto/'+id;
}
function _imgFull(id){return B+'/fl_attachment,f_auto,q_auto/'+id;}
function _imgPreview(id){return B+'/f_auto,q_auto/'+id;}

/* ── XSS helpers ───────────────────────────────────────────────────────── */
function _esc(str){
  return String(str).replace(/[&<>"']/g,function(c){
    return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}
function _sanitize(str){
  return String(str).replace(/[<>]/g,'').substring(0,120);
}

/* ── Navigation helper ─────────────────────────────────────────────────── */
function _navigate(url){
  var m=document.querySelector('main');
  if(m){m.style.opacity='0';m.style.transform='translateY(10px)';}
  setTimeout(function(){window.location.href=url;},120);
}

/* ── Data load ─────────────────────────────────────────────────────────── */
async function _load(){
  try{
    var r=await fetch('/wallpapers.json');
    if(!r.ok)throw new Error('fetch failed');
    _d=await r.json();
    if(_d.wallpapers)_d.wallpapers=_d.wallpapers.slice().reverse();
  }catch(e){}
  var pg=document.body.getAttribute('data-page');
  _header();
  if(pg==='home')_home();
  else if(pg==='wallpaper')_wallpaper();
  else if(pg==='category')_category();
  else if(pg==='search')_search();
  else if(pg==='admin')_admin();
  var m=document.querySelector('main');
  if(m){
    m.style.transition='opacity 0.35s ease,transform 0.35s ease';
    m.style.opacity='1';m.style.transform='translateY(0)';
  }
}

/* ── Header (scroll + mobile nav + search) ─────────────────────────────── */
function _header(){
  window.addEventListener('scroll',function(){
    var h=document.querySelector('.site-header');
    if(h)h.classList.toggle('scrolled',window.scrollY>8);
  },{passive:true});

  var t=document.getElementById('menuToggle');
  var n=document.getElementById('mobileNav');
  if(t&&n){
    t.addEventListener('click',function(){
      var o=n.classList.toggle('open');
      t.setAttribute('aria-expanded',o?'true':'false');
    });
  }

  document.addEventListener('click',function(e){
    document.querySelectorAll('.search-dropdown').forEach(function(d){
      if(!d.closest('.vl-search').contains(e.target))d.classList.remove('open');
    });
  });

  document.querySelectorAll('.vl-search').forEach(_bindSearch);
}

function _bindSearch(form){
  var input=form.querySelector('input[name="q"]');
  var drop=form.querySelector('.search-dropdown');
  var btn=form.querySelector('.search-submit');
  if(!input)return;
  var timer;
  input.addEventListener('input',function(){
    clearTimeout(timer);
    timer=setTimeout(function(){_suggest(_sanitize(input.value.trim()),drop);},180);
  });
  input.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      var q=_sanitize(input.value.trim());
      if(q){if(drop)drop.classList.remove('open');_navigate('/search.html?q='+encodeURIComponent(q));}
    }
    if(e.key==='Escape'&&drop)drop.classList.remove('open');
  });
  if(btn){
    btn.addEventListener('click',function(){
      var q=_sanitize(input.value.trim());
      if(q)_navigate('/search.html?q='+encodeURIComponent(q));
    });
  }
}

function _suggest(q,drop){
  if(!drop)return;
  if(!q||q.length<1){drop.classList.remove('open');return;}
  var ql=q.toLowerCase();
  var cats=_d.categories.filter(function(c){return c.name.toLowerCase().includes(ql);}).slice(0,2);
  var wps=_d.wallpapers.filter(function(w){
    return w.title.toLowerCase().includes(ql)||(w.tags||[]).some(function(t){return t.includes(ql);});
  }).slice(0,5);
  if(!cats.length&&!wps.length){drop.classList.remove('open');return;}
  var html='';
  cats.forEach(function(c){
    html+='<div class="search-item" role="option" tabindex="0" data-href="/category.html?id='+_esc(c.id)+'">'
      +'<div class="search-item-thumb" aria-hidden="true">🗂</div>'
      +'<div class="search-item-info"><div class="search-item-title">'+_esc(c.name)+'</div>'
      +'<div class="search-item-sub">Category</div></div>'
      +'<span class="search-item-badge">Browse</span></div>';
  });
  wps.forEach(function(w){
    var cat=_d.categories.find(function(c){return c.id===w.category;});
    html+='<div class="search-item" role="option" tabindex="0" data-href="/wallpaper.html?id='+_esc(w.id)+'">'
      +'<img class="search-item-thumb" src="'+_img(w.cloudinary_id,72,108)+'" alt="'+_esc(w.title)+'" loading="lazy"/>'
      +'<div class="search-item-info"><div class="search-item-title">'+_hl(_esc(w.title),q)+'</div>'
      +'<div class="search-item-sub">'+(cat?_esc(cat.name):'')+'</div></div>'
      +(w.resolution?'<span class="search-item-badge">'+_esc(w.resolution)+'</span>':'')
      +'</div>';
  });
  drop.innerHTML=html;
  drop.classList.add('open');
  drop.querySelectorAll('.search-item').forEach(function(el){
    el.addEventListener('click',function(){_navigate(el.getAttribute('data-href'));});
    el.addEventListener('keydown',function(e){if(e.key==='Enter')_navigate(el.getAttribute('data-href'));});
  });
}

function _hl(text,q){
  try{
    var re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
    return text.replace(re,'<mark>$1</mark>');
  }catch(e){return text;}
}

/* ── In-grid AdSense card builder ──────────────────────────────────────── */
/* Inserts a native ad card every AD_EVERY wallpapers in the grid.         */
/* adSlot: the data-ad-slot ID for this page.                              */
/* layoutKey: only needed for in-feed (fluid) ads.                         */
function _adCard(adSlot,layoutKey){
  var wrap=document.createElement('div');
  wrap.className='wp-card ad-ingrid-card';

  var ins=document.createElement('ins');
  ins.className='adsbygoogle';
  ins.style.display='block';
  if(layoutKey){
    ins.setAttribute('data-ad-format','fluid');
    ins.setAttribute('data-ad-layout-key',layoutKey);
  }else{
    ins.setAttribute('data-ad-format','auto');
    ins.setAttribute('data-full-width-responsive','true');
  }
  ins.setAttribute('data-ad-client','ca-pub-4473438283681618');
  ins.setAttribute('data-ad-slot',adSlot);

  wrap.appendChild(ins);
  return wrap;
}

/* ── Grid renderer ─────────────────────────────────────────────────────── */
/*
 * APPEND-ONLY on load more — never wipes and re-renders the whole grid.
 * This prevents duplicate ad injection on every Load More click.
 * adOpts: {slot, layoutKey, every}
 * _s.rendered tracks how many wallpaper cards are already in the DOM.
 */
function _grid(id,list,adOpts,append){
  var el=document.getElementById(id);
  if(!el)return;

  /* Full reset (filter change, page init) */
  if(!append){
    el.innerHTML='';
    _s.rendered=0;
  }

  if(!list.length&&!append){
    el.innerHTML='<div class="empty-state" style="grid-column:1/-1">'
      +'<svg fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>'
      +'<h3>Nothing found</h3><p>Try a different search or category.</p></div>';
    return;
  }

  var AD_EVERY=adOpts&&adOpts.every?adOpts.every:24;
  /* Only render new items since last render */
  var from=_s.rendered||0;
  var to=Math.min(_s.visible,list.length);
  var slice=list.slice(from,to);

  if(!slice.length){
    var btn=document.getElementById('loadMoreBtn');
    if(btn)btn.style.display=list.length>_s.visible?'inline-flex':'none';
    return;
  }

  var frag=document.createDocumentFragment();
  var newAds=[];

    var adDoneThisBatch=false;
  slice.forEach(function(wp,idx){
    var globalIdx=from+idx;
    if(adOpts&&!adDoneThisBatch&&globalIdx>0&&globalIdx%AD_EVERY===0){
      var card=_adCard(adOpts.slot,adOpts.layoutKey);
      frag.appendChild(card);
      newAds.push(card.querySelector('ins'));
      adDoneThisBatch=true;/* hard stop — max 1 ad per batch, ever */
    }
    var cat=_d.categories.find(function(c){return c.id===wp.category;});
    var a=document.createElement('a');
    a.className='wp-card';
    a.href='/wallpaper.html?id='+_esc(wp.id);
    a.setAttribute('aria-label',_esc(wp.title)+' wallpaper');
    a.innerHTML='<div class="wp-thumb">'
      +'<img src="'+_img(wp.cloudinary_id)+'" alt="'+_esc(wp.title)+' HD wallpaper" loading="lazy" width="480" height="720"/>'
      +'<div class="wp-overlay" aria-hidden="true"><span class="wp-quick-dl">'
      +'<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M12 3v13m0 0l-5-5m5 5l5-5M5 21h14" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>'
      +'Download</span></div>'
      +'<span class="wp-badge">'+_esc(cat?cat.name:wp.category)+'</span>'
      +(wp.resolution?'<span class="wp-res">'+_esc(wp.resolution)+'</span>':'')
      +'</div>'
      +'<div class="wp-info"><div class="wp-title">'+_esc(wp.title)+'</div>'
      +'<div class="wp-cat">'+_esc(cat?cat.name:'')+'</div></div>';
    frag.appendChild(a);
  });

  el.appendChild(frag);
  _s.rendered=to;

  /* Push AdSense only for newly added ins elements */
  if(newAds.length){
    try{
      newAds.forEach(function(){
        (window.adsbygoogle=window.adsbygoogle||[]).push({});
      });
    }catch(e){}
  }

  var btn=document.getElementById('loadMoreBtn');
  if(btn)btn.style.display=list.length>_s.visible?'inline-flex':'none';
}

/* ── Filter helper ─────────────────────────────────────────────────────── */
function _filtered(){
  var list=_d.wallpapers;
  if(_s.filter!=='all'){
    list=list.filter(function(w){return w.category===_s.filter;});
  }
  if(_s.query){
    var q=_s.query;
    list=list.filter(function(w){
      return w.title.toLowerCase().includes(q)||(w.tags||[]).some(function(t){return t.includes(q);});
    });
  }
  return list;
}

/* ── Home page ─────────────────────────────────────────────────────────── */
function _home(){
  var wrap=document.getElementById('catScroll');
  if(wrap){
    wrap.innerHTML='';
    var all=document.createElement('button');
    all.className='cat-chip active';
    all.textContent='All';
    all.setAttribute('aria-pressed','true');
    all.onclick=function(){_filter('all',all);};
    wrap.appendChild(all);
    _d.categories.forEach(function(c){
      var ch=document.createElement('button');
      ch.className='cat-chip';
      ch.textContent=c.name;
      ch.setAttribute('aria-pressed','false');
      ch.onclick=function(){_filter(c.id,ch);};
      wrap.appendChild(ch);
    });
  }

  var tot=document.getElementById('statTotal');
  var cats=document.getElementById('statCats');
  if(tot)tot.textContent=_d.wallpapers.length.toLocaleString();
  if(cats)cats.textContent=_d.categories.length;

  var ul=document.getElementById('footerCats');
  if(ul){
    _d.categories.forEach(function(c){
      ul.innerHTML+='<li><a href="/category.html?id='+_esc(c.id)+'">'+_esc(c.name)+'</a></li>';
    });
  }

  /* In-grid ad: slot 4496886386, in-feed layout, every 12 cards */
  _grid('wp-grid',_filtered(),null,false);

  var lm=document.getElementById('loadMoreBtn');
  if(lm){
    lm.addEventListener('click',function(){
      _s.visible+=PG;
      _grid('wp-grid',_filtered(),null,true);/* append only */
    });
  }
}

function _filter(id,el){
  _s.filter=id;_s.visible=PG;_s.rendered=0;
  document.querySelectorAll('.cat-chip').forEach(function(c){
    c.classList.remove('active');c.setAttribute('aria-pressed','false');
  });
  el.classList.add('active');el.setAttribute('aria-pressed','true');
  _grid('wp-grid',_filtered(),{slot:'4496886386',layoutKey:'-6s+ea+2i-1i-4k',every:12},false);
}

/* ── Wallpaper detail page ─────────────────────────────────────────────── */
function _wallpaper(){
  var id=new URLSearchParams(location.search).get('id')||'';
  id=_sanitize(id);
  var wp=_d.wallpapers.find(function(w){return w.id===id;});
  if(!wp){_navigate('/404.html');return;}

  var cat=_d.categories.find(function(c){return c.id===wp.category;});

  document.title=_esc(wp.title)+' HD Wallpaper — Visual Library';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.setAttribute('content','Download '+_esc(wp.title)+' in '+(wp.resolution||'HD')+' quality. Free '+(cat?_esc(cat.name)+' ':'')+'wallpaper for desktop and mobile at Visual Library.');

  var og=document.querySelector('meta[property="og:title"]');
  if(og)og.setAttribute('content',_esc(wp.title)+' — Visual Library');
  var ogImg=document.querySelector('meta[property="og:image"]');
  if(ogImg)ogImg.setAttribute('content',_imgPreview(wp.cloudinary_id));

  /* Update canonical to wallpaper URL */
  var canon=document.querySelector('link[rel="canonical"]');
  if(canon)canon.href='https://visuallibrary.netlify.app/wallpaper.html?id='+encodeURIComponent(wp.id);

  var imgEl=document.getElementById('wpImg');
  if(imgEl){imgEl.src=_imgPreview(wp.cloudinary_id);imgEl.alt=_esc(wp.title)+' HD wallpaper';}

  var titleEl=document.getElementById('wpTitle');
  if(titleEl)titleEl.textContent=wp.title;

  var tagsEl=document.getElementById('wpTags');
  if(tagsEl){
    if(cat)tagsEl.innerHTML+='<a class="tag cat-tag" href="/category.html?id='+_esc(cat.id)+'">'+_esc(cat.name)+'</a>';
    if(wp.resolution)tagsEl.innerHTML+='<span class="tag">'+_esc(wp.resolution)+'</span>';
  }

  var dl=document.getElementById('dlBtn');
  if(dl)dl.href=_imgFull(wp.cloudinary_id);

  var schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.textContent=JSON.stringify({
    '@context':'https://schema.org',
    '@type':'ImageObject',
    'name':wp.title,
    'description':'Free '+(wp.resolution||'HD')+' wallpaper - '+wp.title,
    'contentUrl':_imgPreview(wp.cloudinary_id),
    'thumbnailUrl':_img(wp.cloudinary_id,480,720),
    'license':'https://visuallibrary.netlify.app/privacy.html',
    'acquireLicensePage':'https://visuallibrary.netlify.app/wallpaper.html?id='+wp.id
  });
  document.head.appendChild(schema);

  var related=_d.wallpapers.filter(function(w){return w.category===wp.category&&w.id!==wp.id;}).slice(0,12);
  var sv=_s.visible;_s.visible=12;
  _grid('relatedGrid',related);
  _s.visible=sv;
}

/* ── Category page ─────────────────────────────────────────────────────── */
function _category(){
  var id=new URLSearchParams(location.search).get('id')||'';
  id=_sanitize(id);
  var cat=_d.categories.find(function(c){return c.id===id;});
  if(!cat){_navigate('/404.html');return;}

  document.title=_esc(cat.name)+' Wallpapers — Free HD & 4K — Visual Library';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.setAttribute('content','Download free '+(cat.description||_esc(cat.name)+' wallpapers in HD and 4K. Browse the full collection at Visual Library.'));

  /* Fix canonical per-category */
  var canon=document.querySelector('link[rel="canonical"]');
  if(canon)canon.href='https://visuallibrary.netlify.app/category.html?id='+encodeURIComponent(id);

  var h=document.getElementById('catTitle');
  var p=document.getElementById('catDesc');
  if(h)h.textContent=cat.name+' Wallpapers';
  if(p)p.textContent=cat.description||'';

  /* Subcategory chips intentionally removed — caused 404s */

  var list=_d.wallpapers.filter(function(w){return w.category===id;});
  _s.visible=PG;

  /* In-grid ad: slot 5821576347, in-feed layout, every 12 cards */
  _grid('wp-grid',list,null,false);

  var lm=document.getElementById('loadMoreBtn');
  if(lm){
    lm.addEventListener('click',function(){
      _s.visible+=PG;
      _grid('wp-grid',list,null,true);/* append only */
    });
  }

  var schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.textContent=JSON.stringify({
    '@context':'https://schema.org',
    '@type':'CollectionPage',
    'name':cat.name+' Wallpapers',
    'description':cat.description||cat.name+' wallpapers collection',
    'url':'https://visuallibrary.netlify.app/category.html?id='+cat.id
  });
  document.head.appendChild(schema);
}

/* ── Search page ───────────────────────────────────────────────────────── */
function _search(){
  var raw=new URLSearchParams(location.search).get('q')||'';
  var q=_sanitize(raw);
  _s.query=q.toLowerCase();

  document.title='"'+_esc(q)+'" Wallpapers — Visual Library';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.setAttribute('content','Search results for '+_esc(q)+' wallpapers. Browse HD and 4K '+_esc(q)+' wallpapers free to download at Visual Library.');

  var h=document.getElementById('searchTitle');
  var p=document.getElementById('searchCount');
  var inp=document.querySelector('.vl-search input[name="q"]');
  if(inp)inp.value=q;

  var results=_filtered();
  if(h)h.textContent='Results for "'+q+'"';
  if(p)p.textContent=results.length+' wallpaper'+(results.length!==1?'s':'')+' found';

  _s.visible=PG;
  _grid('wp-grid',results);

  var lm=document.getElementById('loadMoreBtn');
  if(lm){
    lm.addEventListener('click',function(){
      _s.visible+=PG;_grid('wp-grid',results);
    });
  }
}

/* ── Admin — secure login with rate limiting ───────────────────────────── */
/*
 * Password is hashed client-side with djb2 variant.
 * Hash stored here — actual password is NEVER in the code.
 * Rate limit: 5 wrong attempts → 60s lockout stored in sessionStorage.
 * Each failed attempt increments a counter; counter resets on success.
 */
function _admin(){
  /* djb2-variant hash — same algorithm as before */
  var H=function(s){
    var h=0;
    for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
    return h;
  };

  /* ⚠️  Only the HASH lives here — not the password */
  var T=-1383325609;

  /* Rate-limit keys */
  var ATTEMPTS_KEY='_vl_att';
  var LOCKOUT_KEY='_vl_lock';
  var MAX_ATT=5;
  var LOCKOUT_MS=60000; /* 60 seconds */

  var lock=document.getElementById('adminLock');
  var dash=document.getElementById('adminDash');
  var inp=document.getElementById('adminPass');
  var btn=document.getElementById('adminSubmit');
  var errEl=document.getElementById('adminError');

  function unlock(){
    sessionStorage.setItem('_vl',T);
    sessionStorage.setItem(ATTEMPTS_KEY,'0');
    if(lock)lock.style.display='none';
    if(dash){dash.style.display='block';_buildDash();}
  }

  function showError(msg){
    if(errEl){errEl.textContent=msg;errEl.style.display='block';}
    if(inp){inp.style.borderColor='#FF5C35';inp.value='';}
    setTimeout(function(){
      if(inp)inp.style.borderColor='';
      if(errEl)errEl.style.display='none';
    },2500);
  }

  function isLockedOut(){
    var lockUntil=parseInt(sessionStorage.getItem(LOCKOUT_KEY)||'0');
    return Date.now()<lockUntil;
  }

  function getRemainingLock(){
    var lockUntil=parseInt(sessionStorage.getItem(LOCKOUT_KEY)||'0');
    return Math.ceil((lockUntil-Date.now())/1000);
  }

  function startCountdown(){
    if(!errEl)return;
    var iv=setInterval(function(){
      if(isLockedOut()){
        errEl.textContent='Too many attempts. Try again in '+getRemainingLock()+'s';
        errEl.style.display='block';
        if(btn)btn.disabled=true;
      }else{
        clearInterval(iv);
        errEl.style.display='none';
        if(btn)btn.disabled=false;
      }
    },1000);
  }

  /* Check existing valid session */
  var sess=sessionStorage.getItem('_vl');
  if(sess&&parseInt(sess)===T){unlock();return;}

  /* Check if already locked out on page load */
  if(isLockedOut()){startCountdown();}

  if(btn){
    btn.addEventListener('click',function(){
      if(isLockedOut()){showError('Too many attempts. Wait '+getRemainingLock()+'s');return;}
      if(!inp)return;

      var att=parseInt(sessionStorage.getItem(ATTEMPTS_KEY)||'0');

      if(H(inp.value)===T){
        unlock();
      }else{
        att++;
        sessionStorage.setItem(ATTEMPTS_KEY,att);
        if(att>=MAX_ATT){
          sessionStorage.setItem(LOCKOUT_KEY,Date.now()+LOCKOUT_MS);
          sessionStorage.setItem(ATTEMPTS_KEY,'0');
          showError('Too many attempts. Locked for 60s');
          startCountdown();
        }else{
          showError('Incorrect password. '+(MAX_ATT-att)+' attempt'+(MAX_ATT-att!==1?'s':'')+' left');
        }
      }
    });
  }
  if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&btn)btn.click();});
}

/* ── Admin dashboard ───────────────────────────────────────────────────── */
function _buildDash(){
  var tw=document.getElementById('statWallpapers');
  var tc=document.getElementById('statCategories');
  var tl=document.getElementById('statLast');
  var cl=document.getElementById('adminCatList');
  var chart=document.getElementById('adminCatChart');

  if(tw)tw.textContent=_d.wallpapers.length.toLocaleString();
  if(tc)tc.textContent=_d.categories.length;
  var last=_d.wallpapers[0]; /* reversed array so [0] is newest */
  if(tl&&last)tl.textContent=last.title;

  /* Newest category stat */
  var sn=document.getElementById('statNewest');
  if(sn&&last){
    var lcat=_d.categories.find(function(c){return c.id===last.category;});
    sn.textContent=lcat?lcat.name:'—';
  }

  /* Category reference cards */
  var ref=document.getElementById('adminCatRef');
  if(ref){
    ref.innerHTML='';
    _d.categories.forEach(function(c){
      var count=_d.wallpapers.filter(function(w){return w.category===c.id;}).length;
      var div=document.createElement('div');
      div.className='ref-card';
      div.innerHTML='<h4>'+_esc(c.name)+'</h4>'
        +'<code>'+_esc(c.id)+'</code>'
        +'<p>'+count+' wallpaper'+(count!==1?'s':'')+'</p>';
      ref.appendChild(div);
    });
  }

  /* Category breakdown — bar rows */
  if(cl){
    cl.innerHTML='';
    var max=Math.max.apply(null,_d.categories.map(function(c){
      return _d.wallpapers.filter(function(w){return w.category===c.id;}).length;
    }));
    _d.categories.forEach(function(c){
      var count=_d.wallpapers.filter(function(w){return w.category===c.id;}).length;
      var pct=max?Math.round(count/max*100):0;
      var row=document.createElement('div');
      row.className='cat-stat-row';
      row.innerHTML='<span class="cat-name">'+_esc(c.name)+'</span>'
        +'<div class="cat-bar-wrap"><div class="cat-bar" style="width:0%" data-pct="'+pct+'"></div></div>'
        +'<span class="cat-count">'+count+'</span>';
      cl.appendChild(row);
    });
    /* Animate bars after paint */
    requestAnimationFrame(function(){
      setTimeout(function(){
        cl.querySelectorAll('.cat-bar').forEach(function(b){
          b.style.width=b.getAttribute('data-pct')+'%';
        });
      },80);
    });
  }

  /* SVG donut chart of category distribution */
  if(chart){
    _drawDonut(chart);
  }
}

/* Simple SVG donut chart — no external library needed */
function _drawDonut(container){
  var data=_d.categories.map(function(c){
    return{
      name:c.name,
      count:_d.wallpapers.filter(function(w){return w.category===c.id;}).length
    };
  }).filter(function(d){return d.count>0;});

  var total=data.reduce(function(s,d){return s+d.count;},0);
  if(!total)return;

  var COLORS=['#00C6FF','#FF5C35','#0088FF','#FFB800','#9B59B6','#2ECC71','#E74C3C','#1ABC9C'];
  var SIZE=200;var R=80;var IR=52;var CX=SIZE/2;var CY=SIZE/2;

  var svg='<svg viewBox="0 0 '+SIZE+' '+SIZE+'" width="'+SIZE+'" height="'+SIZE+'" style="overflow:visible">';
  var angle=-Math.PI/2;
  data.forEach(function(d,i){
    var slice=(d.count/total)*Math.PI*2;
    var x1=CX+R*Math.cos(angle);var y1=CY+R*Math.sin(angle);
    angle+=slice;
    var x2=CX+R*Math.cos(angle);var y2=CY+R*Math.sin(angle);
    var xi1=CX+IR*Math.cos(angle-slice);var yi1=CY+IR*Math.sin(angle-slice);
    var xi2=CX+IR*Math.cos(angle);var yi2=CY+IR*Math.sin(angle);
    var large=slice>Math.PI?1:0;
    var col=COLORS[i%COLORS.length];
    svg+='<path d="M'+xi1+' '+yi1+' L'+x1+' '+y1+' A'+R+' '+R+' 0 '+large+' 1 '+x2+' '+y2+' L'+xi2+' '+yi2+' A'+IR+' '+IR+' 0 '+large+' 0 '+xi1+' '+yi1+' Z"'
      +' fill="'+col+'" opacity="0.9"><title>'+d.name+': '+d.count+'</title></path>';
  });
  /* Centre label */
  svg+='<text x="'+CX+'" y="'+(CY-8)+'" text-anchor="middle" fill="#F0F2F5" font-size="22" font-weight="900" font-family="Sora,sans-serif">'+total+'</text>';
  svg+='<text x="'+CX+'" y="'+(CY+12)+'" text-anchor="middle" fill="#8892A4" font-size="10" font-family="Sora,sans-serif">WALLPAPERS</text>';
  svg+='</svg>';

  /* Legend */
  var legend='<div class="donut-legend">';
  data.forEach(function(d,i){
    var pct=Math.round(d.count/total*100);
    legend+='<div class="donut-leg-item">'
      +'<span class="donut-leg-dot" style="background:'+COLORS[i%COLORS.length]+'"></span>'
      +'<span class="donut-leg-name">'+_esc(d.name)+'</span>'
      +'<span class="donut-leg-pct">'+pct+'%</span>'
      +'</div>';
  });
  legend+='</div>';

  container.innerHTML='<div class="donut-wrap">'+svg+legend+'</div>';
}

document.addEventListener('DOMContentLoaded',_load);
})();

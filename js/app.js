(function(){
'use strict';

var C='ewsylug3';
var B='https://res.cloudinary.com/'+C+'/image/upload';
var PG=24;
var _d={categories:[],wallpapers:[]};
var _s={filter:'all',query:'',visible:PG};

function _img(id,w,h){
  w=w||480;h=h||720;
  return B+'/c_fill,w_'+w+',h_'+h+',f_auto,q_auto/'+id;
}
function _imgFull(id){
  return B+'/fl_attachment,f_auto,q_auto/'+id;
}
function _imgPreview(id){
  return B+'/f_auto,q_auto/'+id;
}

function _esc(str){
  return String(str).replace(/[&<>"']/g,function(c){
    return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}

function _sanitize(str){
  return String(str).replace(/[<>]/g,'').substring(0,120);
}

function _navigate(url){
  var m=document.querySelector('main');
  if(m){m.style.opacity='0';m.style.transform='translateY(10px)';}
  setTimeout(function(){window.location.href=url;},120);
}

async function _load(){
  try{
    var r=await fetch('/wallpapers.json');
    if(!r.ok)throw new Error('fetch failed');
    _d=await r.json();
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

function _grid(id,list){
  var el=document.getElementById(id);
  if(!el)return;
  var slice=list.slice(0,_s.visible);
  el.innerHTML='';

  if(!slice.length){
    el.innerHTML='<div class="empty-state" style="grid-column:1/-1">'
      +'<svg fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>'
      +'<h3>Nothing found</h3><p>Try a different search or category.</p></div>';
    return;
  }

  var frag=document.createDocumentFragment();
  slice.forEach(function(wp){
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

  var btn=document.getElementById('loadMoreBtn');
  if(btn)btn.style.display=list.length>_s.visible?'inline-flex':'none';
}

function _filtered(){
  var list=_d.wallpapers;
  if(_s.filter!=='all'){
    list=list.filter(function(w){
      return w.category===_s.filter||(_s.filter&&w.subcategory&&w.subcategory.startsWith(_s.filter));
    });
  }
  if(_s.query){
    var q=_s.query;
    list=list.filter(function(w){
      return w.title.toLowerCase().includes(q)||(w.tags||[]).some(function(t){return t.includes(q);});
    });
  }
  return list;
}

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
  if(tot)tot.textContent=_d.wallpapers.length+'+';
  if(cats)cats.textContent=_d.categories.length;

  var ul=document.getElementById('footerCats');
  if(ul){
    _d.categories.forEach(function(c){
      ul.innerHTML+='<li><a href="/category.html?id='+_esc(c.id)+'">'+_esc(c.name)+'</a></li>';
    });
  }

  _grid('wp-grid',_filtered());

  var lm=document.getElementById('loadMoreBtn');
  if(lm){
    lm.addEventListener('click',function(){
      _s.visible+=PG;
      _grid('wp-grid',_filtered());
    });
  }
}

function _filter(id,el){
  _s.filter=id;_s.visible=PG;
  document.querySelectorAll('.cat-chip').forEach(function(c){
    c.classList.remove('active');c.setAttribute('aria-pressed','false');
  });
  el.classList.add('active');el.setAttribute('aria-pressed','true');
  _grid('wp-grid',_filtered());
}

function _wallpaper(){
  var id=new URLSearchParams(location.search).get('id')||'';
  id=_sanitize(id);
  var wp=_d.wallpapers.find(function(w){return w.id===id;});
  if(!wp){_navigate('/404.html');return;}

  var cat=_d.categories.find(function(c){return c.id===wp.category;});

  document.title=_esc(wp.title)+' HD Wallpaper — Visual Library';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.setAttribute('content','Download '+_esc(wp.title)+' in '+(wp.resolution||'HD')+' quality. Free '+_esc(cat?cat.name:'')+'wallpaper for desktop and mobile.');

  var og=document.querySelector('meta[property="og:title"]');
  if(og)og.setAttribute('content',_esc(wp.title)+' — Visual Library');
  var ogImg=document.querySelector('meta[property="og:image"]');
  if(ogImg)ogImg.setAttribute('content',_imgPreview(wp.cloudinary_id));

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
    'description':'Free '+wp.resolution+' wallpaper - '+wp.title,
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

function _category(){
  var id=new URLSearchParams(location.search).get('id')||'';
  id=_sanitize(id);
  var cat=_d.categories.find(function(c){return c.id===id;});
  if(!cat){_navigate('/404.html');return;}

  document.title=_esc(cat.name)+' Wallpapers — Visual Library';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.setAttribute('content',_esc(cat.description));

  var h=document.getElementById('catTitle');
  var p=document.getElementById('catDesc');
  if(h)h.textContent=cat.name+' Wallpapers';
  if(p)p.textContent=cat.description||'';

  var sub=document.getElementById('subCats');
  if(sub&&cat.subcategories&&cat.subcategories.length){
    cat.subcategories.forEach(function(s){
      var a=document.createElement('a');
      a.className='cat-chip';
      a.href='/category.html?id='+_esc(s.id);
      a.textContent=s.name;
      sub.appendChild(a);
      if(s.subcategories){
        s.subcategories.forEach(function(ss){
          var b=document.createElement('a');
          b.className='cat-chip';
          b.href='/category.html?id='+_esc(ss.id);
          b.textContent=ss.name;
          sub.appendChild(b);
        });
      }
    });
  }

  var list=_d.wallpapers.filter(function(w){
    return w.category===id||(_s.filter&&w.subcategory&&w.subcategory.startsWith(id));
  });
  _s.visible=PG;
  _grid('wp-grid',list);

  var lm=document.getElementById('loadMoreBtn');
  if(lm){
    lm.addEventListener('click',function(){
      _s.visible+=PG;_grid('wp-grid',list);
    });
  }

  var schema=document.createElement('script');
  schema.type='application/ld+json';
  schema.textContent=JSON.stringify({
    '@context':'https://schema.org',
    '@type':'CollectionPage',
    'name':cat.name+' Wallpapers',
    'description':cat.description,
    'url':'https://visuallibrary.netlify.app/category.html?id='+cat.id
  });
  document.head.appendChild(schema);
}

function _search(){
  var raw=new URLSearchParams(location.search).get('q')||'';
  var q=_sanitize(raw);
  _s.query=q.toLowerCase();

  document.title='"'+_esc(q)+'" Wallpapers — Visual Library';
  var desc=document.querySelector('meta[name="description"]');
  if(desc)desc.setAttribute('content','Search results for '+_esc(q)+' wallpapers. Browse HD and 4K '+_esc(q)+' wallpapers free to download.');

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

function _admin(){
  var H=function(s){
    var h=0;
    for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}
    return h;
  };
  var T=-1752636881;
  var lock=document.getElementById('adminLock');
  var dash=document.getElementById('adminDash');
  var inp=document.getElementById('adminPass');
  var btn=document.getElementById('adminSubmit');

  function unlock(){
    if(lock)lock.style.display='none';
    if(dash){dash.style.display='block';_buildDash();}
  }

  var sess=sessionStorage.getItem('_vl');
  if(sess&&parseInt(sess)===T)unlock();

  if(btn){
    btn.addEventListener('click',function(){
      if(!inp)return;
      if(H(inp.value)===T){
        sessionStorage.setItem('_vl',T);
        unlock();
      }else{
        inp.style.borderColor='#FF5C35';
        inp.value='';
        inp.placeholder='Incorrect';
        setTimeout(function(){inp.style.borderColor='';inp.placeholder='••••••••';},2000);
      }
    });
  }
  if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&btn)btn.click();});
}

function _buildDash(){
  var tw=document.getElementById('statWallpapers');
  var tc=document.getElementById('statCategories');
  var tl=document.getElementById('statLast');
  var cl=document.getElementById('adminCatList');

  if(tw)tw.textContent=_d.wallpapers.length;
  if(tc)tc.textContent=_d.categories.length;
  var last=_d.wallpapers[_d.wallpapers.length-1];
  if(tl&&last)tl.textContent=last.title;

  if(!cl)return;
  var max=Math.max.apply(null,_d.categories.map(function(c){
    return _d.wallpapers.filter(function(w){return w.category===c.id;}).length;
  }));
  _d.categories.forEach(function(c){
    var count=_d.wallpapers.filter(function(w){return w.category===c.id;}).length;
    var pct=max?Math.round(count/max*100):0;
    cl.innerHTML+='<div class="cat-stat-row">'
      +'<span class="cat-name">'+_esc(c.name)+'</span>'
      +'<div class="cat-bar-wrap"><div class="cat-bar" style="width:'+pct+'%"></div></div>'
      +'<span class="cat-count">'+count+'</span></div>';
  });
}

document.addEventListener('DOMContentLoaded',_load);
})();

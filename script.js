(function(){
'use strict';

// ============ UTILITIES ============
function throttle(fn, delay) { var last = 0; return function() { var now = Date.now(); if (now - last >= delay) { fn.apply(this, arguments); last = now; } }; }
function debounce(fn, delay) { var timer; return function() { var ctx = this, args = arguments; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, delay); }; }
function gSI(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } }
function sSI(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }

// ============ PRELOADER ============
var preloader = document.getElementById('preloader');
var pageLoaded = false;
window.addEventListener('load', function() {
  pageLoaded = true;
  setTimeout(function() { preloader.classList.add('hidden'); }, 300);
});
setTimeout(function() {
  if (!pageLoaded) { preloader.classList.add('hidden'); }
}, 5000);

// ============ CONFIG ============
var CACHE_VERSION = 'v4';
var CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_qE54KuCx8nQlZnFJNZwacHgp1ohgFl-dAj5kcDrjWwO7npYtuUAIRdTFgUSqEDLbVps2qgOEOO29/pub?output=csv&v=' + CACHE_VERSION;
var IMAGES_PATH = 'images/';
var LETTER_SIZES = ['XXS','XS','S','M','L','XL','XXL','2XL','3XL','4XL','5XL'];
var IMAGE_FALLBACKS = ['jpg', 'jfif', 'png', 'webp'];
var CAT_RU = { shoes:'кроссовки', tshirts:'футболки', hoodies:'худи', jackets:'куртки', pants:'штаны', shorts:'шорты', suits:'костюмы', accessories:'аксессуары' };
var CATS = [
  { id:'all', name:'Все товары', e:'🦍' },
  { id:'favorites', name:'Избранное', e:'⭐' },
  { id:'shorts', name:'Шорты', e:'🩳' },
  { id:'suits', name:'Спорт. костюмы', e:'🏃' },
  { id:'shoes', name:'Кроссовки', e:'👟' },
  { id:'accessories', name:'Аксессуары', e:'🧢' },
  { id:'tshirts', name:'Футболки / Рубашки', e:'👕' },
  { id:'jackets', name:'Куртки / Ветровки', e:'🧥' },
  { id:'hoodies', name:'Худи / Свитшоты', e:'🦍' },
  { id:'pants', name:'Штаны / Брюки / Джинсы', e:'👖' }
];

// ============ MATCH RULES ============
var MATCH_RULES = {
  tshirts:   ['shoes', 'shorts', 'pants'],
  hoodies:   ['shoes', 'pants'],
  shoes:     ['tshirts', 'hoodies', 'pants', 'shorts'],
  jackets:   ['hoodies', 'tshirts', 'pants', 'shoes'],
  pants:     ['tshirts', 'hoodies', 'shoes'],
  shorts:    ['tshirts', 'shoes'],
  suits:     ['shoes'],
  accessories: ['tshirts', 'hoodies']
};

// ============ DOM ============
var D = {
  hBg: document.getElementById('hero-bg'),
  hCnt: document.getElementById('hero-content'),
  gT: document.getElementById('glitch-title'),
  mH: document.getElementById('main-header'),
  pC: document.getElementById('particles-canvas'),
  cG: document.getElementById('catalogGrid'),
  cM: document.getElementById('categoriesMenu'),
  cScr: document.getElementById('categoriesScroll'),
  sFC: document.getElementById('sizeFilterContent'),
  sFR: document.getElementById('sizeFilterReset'),
  sI: document.getElementById('searchInput'),
  cSB: document.getElementById('clearSearchBtn'),
  sS: document.getElementById('sortSelect'),
  mO: document.getElementById('modalOverlay'),
  mB: document.getElementById('modalBox'),
  mCl: document.getElementById('modalClose'),
  mGC: document.getElementById('modalGalleryContainer'),
  mFv: document.getElementById('modalFavorite'),
  mT: document.getElementById('modalTitle'),
  mP: document.getElementById('modalPrice'),
  mC: document.getElementById('modalColor'),
  mSz: document.getElementById('modalSizes'),
  mD: document.getElementById('modalDesc'),
  mSt: document.getElementById('modalStock'),
  mSimilar: document.getElementById('modalSimilar'),
  lB: document.getElementById('lightbox'),
  lI: document.getElementById('lightboxImg'),
  lCl: document.getElementById('lightboxClose'),
  sT: document.getElementById('scrollTop'),
  t: document.getElementById('toast'),
  oT: document.getElementById('omskTime'),
  mTt: document.getElementById('mskTime'),
  lI2: document.getElementById('logoImg'),
  mSB: document.getElementById('modalShareBtn')
};

// ============ STATE ============
var P = [], F = gSI('gorillaFavorites', []), aC = 'all', aS = null, cP = null, sS2 = null, cS = 0, cSo = 'default', sQ = '', cI, gI;
var viewCounts = gSI('gorillaViews', {});
var isMobile = window.innerWidth <= 768;
window.addEventListener('resize', debounce(function() { isMobile = window.innerWidth <= 768; }, 200));

// ============ VIEWS ============
function incrementView(pid) { if (!viewCounts[pid]) viewCounts[pid] = Math.floor(Math.random() * 50) + 10; viewCounts[pid]++; sSI('gorillaViews', viewCounts); }
function getViewCount(pid) { if (!viewCounts[pid]) { viewCounts[pid] = Math.floor(Math.random() * 50) + 10; sSI('gorillaViews', viewCounts); } return viewCounts[pid]; }

// ============ SHARE ============
window.shareProduct = function() {
  if (!cP) return;
  var text = '🦍 ' + cP.name + ' — ' + cP.price.toLocaleString() + ' ₽\n\nСмотри на GORILLA STREETWEAR:\nhttps://gorilla-omsk.github.io';
  if (navigator.share) { navigator.share({ title: cP.name, text: text, url: 'https://gorilla-omsk.github.io' }).catch(function() {}); }
  else { navigator.clipboard.writeText(text).then(function() { showToast('🔗 Ссылка скопирована!'); }).catch(function() { showToast('📋 ' + text); }); }
};
window.shareProductCard = function(pid, event) {
  event.stopPropagation();
  var p = P.find(function(x) { return x.id === pid; });
  if (!p) return;
  var text = '🦍 ' + p.name + ' — ' + p.price.toLocaleString() + ' ₽\n\nСмотри на GORILLA STREETWEAR:\nhttps://gorilla-omsk.github.io';
  if (navigator.share) { navigator.share({ title: p.name, text: text, url: 'https://gorilla-omsk.github.io' }).catch(function() {}); }
  else { navigator.clipboard.writeText(text).then(function() { showToast('🔗 Ссылка скопирована!'); }).catch(function() { showToast('📋 ' + text); }); }
};

// ============ SCHEMA ============
function generateProductSchema(p) {
  return {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.name, description: p.description || '',
    image: p.photo_id ? IMAGES_PATH + p.photo_id.split(';')[0].trim() + '.jpg' : '',
    offers: { '@type': 'Offer', price: p.price, priceCurrency: 'RUB', availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' }
  };
}

// ============ IMAGES ============
function gPU(pid, ext) {
  if (!pid || !pid.trim()) return null;
  pid = pid.trim();
  if (ext) {
    return IMAGES_PATH + pid + '.' + ext + '?v=' + CACHE_VERSION;
  }
  return IMAGES_PATH + pid + '.jpg?v=' + CACHE_VERSION;
}

window.iE = function(img, pid) {
  if (!pid) {
    img.style.display = 'none';
    showPlaceholder(img);
    return;
  }
  
  var currentSrc = img.src.split('?v=')[0];
  var currentExt = '';
  
  for (var i = 0; i < IMAGE_FALLBACKS.length; i++) {
    if (currentSrc.endsWith('.' + IMAGE_FALLBACKS[i])) {
      currentExt = IMAGE_FALLBACKS[i];
      break;
    }
  }
  
  if (!currentExt) {
    img.src = IMAGES_PATH + pid + '.' + IMAGE_FALLBACKS[0] + '?v=' + CACHE_VERSION;
    img.setAttribute('data-lightbox-src', img.src);
    return;
  }
  
  var currentIdx = IMAGE_FALLBACKS.indexOf(currentExt);
  var nextIdx = currentIdx + 1;
  
  if (nextIdx < IMAGE_FALLBACKS.length) {
    img.src = IMAGES_PATH + pid + '.' + IMAGE_FALLBACKS[nextIdx] + '?v=' + CACHE_VERSION;
    img.setAttribute('data-lightbox-src', img.src);
  } else {
    img.style.display = 'none';
    showPlaceholder(img);
  }
};

function showPlaceholder(img) {
  var parent = img.parentNode;
  if (!parent) return;
  var existing = parent.querySelector('.img-placeholder');
  if (!existing) {
    var p = document.createElement('span');
    p.className = 'img-placeholder';
    p.textContent = '🦍';
    p.setAttribute('aria-hidden', 'true');
    parent.appendChild(p);
  }
}

function showToast(msg) { D.t.textContent = msg; D.t.classList.add('show'); setTimeout(function() { D.t.classList.remove('show'); }, 3000); }

// ============ CLOCKS ============
function uC() {
  var n = new Date();
  var m = new Date(n.getTime() + 3 * 3600000);
  var o = new Date(n.getTime() + 6 * 3600000);
  D.mTt.textContent = m.getUTCHours().toString().padStart(2, '0') + ':' + m.getUTCMinutes().toString().padStart(2, '0');
  D.oT.textContent = o.getUTCHours().toString().padStart(2, '0') + ':' + o.getUTCMinutes().toString().padStart(2, '0');
}
uC(); cI = setInterval(uC, 1000);

// ============ HERO 3D ============
var hero = document.querySelector('.hero');
if (hero && D.gT) {
  hero.addEventListener('mousemove', throttle(function(e) {
    var rect = hero.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) - 0.5;
    var y = ((e.clientY - rect.top) / rect.height) - 0.5;
    D.gT.style.transform = 'translate(' + (x * 15) + 'px,' + (y * 15) + 'px)';
    D.gT.style.textShadow = x * 20 + 'px ' + y * 20 + 'px 0 rgba(255,0,0,.7),' + (-x * 20) + 'px ' + (-y * 20) + 'px 0 rgba(0,255,255,.7)';
  }, 16));
  hero.addEventListener('mouseleave', function() { D.gT.style.transform = 'translate(0,0)'; D.gT.style.textShadow = 'none'; });
}

// ============ GLITCH ============
function tG() { if (!D.gT) return; D.gT.classList.add('glitch-active'); setTimeout(function() { D.gT.classList.remove('glitch-active'); }, 300); }
if (D.gT) { gI = setInterval(tG, 4000); D.gT.addEventListener('click', tG); }

document.addEventListener('visibilitychange', function() {
  if (document.hidden) { clearInterval(cI); clearInterval(gI); }
  else { uC(); cI = setInterval(uC, 1000); if (D.gT) gI = setInterval(tG, 4000); }
});
window.addEventListener('scroll', throttle(function() {
  var s = window.pageYOffset || document.documentElement.scrollTop;
  if (D.hBg) D.hBg.style.transform = 'translateY(' + (s * 0.4) + 'px)';
  if (D.hCnt) D.hCnt.style.transform = 'translateY(' + (s * 0.2) + 'px)';
  if (D.mH) D.mH.classList.toggle('scrolled', window.scrollY > 50);
}, 16));

// ============ PARTICLES ============
if (!isMobile) {
  (function() {
    var c = D.pC; if (!c) return;
    var ctx = c.getContext('2d');
    var particles = [];
    var MAX = 60;
    function resize() { c.width = c.parentElement.offsetWidth; c.height = c.parentElement.offsetHeight; }
    window.addEventListener('resize', debounce(resize, 100));
    resize();
    function Particle() {
      this.reset = function() { this.x = Math.random() * c.width; this.y = Math.random() * c.height; this.size = Math.random() * 2 + 0.5; this.speedY = Math.random() * 0.5 + 0.2; this.opacity = Math.random() * 0.5 + 0.2; };
      this.update = function() { this.y -= this.speedY; if (this.y < -10) { this.y = c.height + 10; this.x = Math.random() * c.width; } };
      this.draw = function() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,' + this.opacity + ')'; ctx.fill(); };
      this.reset();
    }
    while (particles.length < MAX) particles.push(new Particle());
    var animFrame;
    function animate() { ctx.clearRect(0, 0, c.width, c.height); for (var i = 0; i < particles.length; i++) { particles[i].update(); particles[i].draw(); } animFrame = requestAnimationFrame(animate); }
    var observer = new IntersectionObserver(function(e) { if (e[0].isIntersecting) { animate(); } else if (animFrame) { cancelAnimationFrame(animFrame); } }, { threshold: 0.1 });
    observer.observe(c);
  })();
}

// ============ OBSERVER ============
function oC() {
  requestAnimationFrame(function() {
    var observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { entries[i].target.classList.add('revealed'); observer.unobserve(entries[i].target); }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.card:not(.revealed)').forEach(function(card) { observer.observe(card); });
  });
}

// ============ SKELETONS ============
function rSkeletons() { var count = isMobile ? 4 : 6; var h = ''; for (var i = 0; i < count; i++) { h += '<div class="skeleton-card"><div class="skeleton-img"></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-line short"></div><div class="skeleton-line price"></div></div></div>'; } D.cG.innerHTML = h; }

// ============ CSV PARSER ============
function pL(line) { var r = [], c = '', q = false; for (var i = 0; i < line.length; i++) { var ch = line[i]; if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(c.trim()); c = ''; } else c += ch; } r.push(c.trim()); return r; }
function pCSV(csv) {
  var lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  var headers = pL(lines[0]).map(function(h) { return h.toLowerCase(); });
  var colorIdx = headers.indexOf('colors');
  if (colorIdx === -1) colorIdx = headers.indexOf('color');
  if (colorIdx !== -1) headers[colorIdx] = 'color';
  return lines.slice(1).map(function(line) {
    var values = pL(line);
    if (values.length < headers.length) return null;
    var item = {};
    headers.forEach(function(h, idx) { item[h] = values[idx] || ''; });
    item.price = parseInt(item.price) || 0;
    item.stock = parseInt(item.stock) || 0;
    item.sizes = item.sizes ? item.sizes.split(';').map(function(s) { return s.trim(); }).filter(function(s) { return s; }) : [];
    item.category = (item.category || '').toLowerCase();
    if (!item.id || !item.name || isNaN(item.price) || isNaN(item.stock)) return null;
    return item;
  }).filter(Boolean);
}

// ============ COMPLETE THE LOOK ============
function getSimilarProducts(product, max) {
  max = max || 4;
  var targetCategories = MATCH_RULES[product.category] || [];
  
  var matches = [];
  targetCategories.forEach(function(cat) {
    var catProducts = P.filter(function(p) {
      return p.id !== product.id && p.category === cat && p.stock > 0;
    });
    matches = matches.concat(catProducts);
  });
  
  matches.sort(function() { return Math.random() - 0.5; });
  return matches.slice(0, max);
}

function renderSimilarProducts(product) {
  if (!D.mSimilar) return;
  var similar = getSimilarProducts(product);
  if (!similar.length) { D.mSimilar.innerHTML = ''; return; }
  var h = '<div class="similar-section"><div class="similar-title">👕 С чем носить</div><div class="similar-grid">';
  similar.forEach(function(p) {
    var pu = gPU(p.photo_id ? p.photo_id.split(';')[0].trim() : '', IMAGE_FALLBACKS[0]);
    h += '<div class="similar-item" role="button" tabindex="0" aria-label="' + p.name + '" onclick="event.stopPropagation();document.getElementById(\'modalOverlay\').classList.remove(\'active\');document.body.style.overflow=\'\';setTimeout(function(){openModalById(\'' + p.id + '\')},100)"><img src="' + (pu || '') + '" alt="' + p.name + '" loading="lazy" onerror="iE(this,\'' + (p.photo_id ? p.photo_id.split(';')[0].trim() : '') + '\')"><div class="similar-name">' + p.name + '</div><div class="similar-price">' + p.price.toLocaleString() + ' ₽</div></div>';
  });
  h += '</div></div>';
  D.mSimilar.innerHTML = h;
}
window.openModalById = function(id) { var product = P.find(function(p) { return p.id === id; }); if (product) oM(product); };

// ============ LOAD ============
async function lP() {
  rSkeletons();
  try {
    var r = await fetch(CSV_URL);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    P = await pCSV(await r.text());
    rC(); rSF(); rCat(); rMobCats(); setTimeout(oC, 100); setTimeout(init3DCards, 300);
  } catch(e) { D.cG.innerHTML = '<div class="no-products">⚠️ Не удалось загрузить товары</div>'; }
}

// ============ FAVORITES ============
function sF() { sSI('gorillaFavorites', F); }
function tF(id) {
  var idx = F.indexOf(id);
  if (idx !== -1) F.splice(idx, 1); else F.push(id);
  sF();
  document.querySelectorAll('.favorite-btn[data-id="' + id + '"]').forEach(function(btn) { var isFav = F.includes(id); btn.innerHTML = isFav ? '❤️' : '🤍'; btn.classList.toggle('active', isFav); });
  if (cP && cP.id === id) uMF();
  rC(); rMobCats(); rCat(); setTimeout(oC, 100); setTimeout(init3DCards, 200);
}
function tFFM() { if (cP) tF(cP.id); }
function uMF() { if (!cP) return; var isFav = F.includes(cP.id); D.mFv.textContent = isFav ? '❤️' : '🤍'; D.mFv.classList.toggle('active', isFav); }

// ============ SIZE FILTER ============
function gSFC(catId) { var f = catId === 'all' ? P : P.filter(function(p) { return p.category === catId; }); var s = new Set(); f.forEach(function(p) { if (p.sizes) p.sizes.forEach(function(x) { s.add(x.trim()); }); }); return Array.from(s); }
function cSizes(sizes) {
  var g = { shoe:[], waist:[], letter:[], other:[] };
  var isShoes = aC === 'shoes';
  var isClothing = ['tshirts','hoodies','jackets','shorts','suits','pants'].includes(aC);
  
  sizes.forEach(function(size) {
    var u = size.toUpperCase();
    
    if (LETTER_SIZES.includes(u) || /^[A-Z]+$/.test(u)) {
      g.letter.push(size);
    }
    else if (/^\d+$/.test(size)) {
      var n = parseInt(size);
      if (isShoes && n >= 35 && n <= 52) {
        g.shoe.push(size);
      } else if (isClothing) {
        g.other.push(size);
      } else if (n >= 35 && n <= 52) {
        g.shoe.push(size);
      } else if (n >= 26 && n <= 38) {
        g.waist.push(size);
      } else {
        g.other.push(size);
      }
    } else {
      g.other.push(size);
    }
  });
  
  g.shoe.sort(function(a,b) { return parseInt(a) - parseInt(b); });
  g.waist.sort(function(a,b) { return parseInt(a) - parseInt(b); });
  g.letter.sort(function(a,b) {
    var aN = /^\d+$/.test(a), bN = /^\d+$/.test(b);
    if (aN && bN) return parseInt(a) - parseInt(b);
    if (aN) return 1; if (bN) return -1;
    var ia = LETTER_SIZES.indexOf(a.toUpperCase()), ib = LETTER_SIZES.indexOf(b.toUpperCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1; if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
  g.other.sort();
  return g;
}
function rSF() {
  if (aC === 'all' || aC === 'favorites') { D.sFC.innerHTML = '<span style="color:#aaa;font-size:12px;">Выберите категорию</span>'; return; }
  var sizes = gSFC(aC);
  if (!sizes.length) { D.sFC.innerHTML = '<span style="color:#aaa;font-size:12px;">Нет размеров</span>'; return; }
  var g = cSizes(sizes);
  var h = '';
  if (g.shoe.length) { h += '<div class="size-filter-group"><span class="size-filter-label">👟 Обувь</span><div class="size-filter-buttons">'; g.shoe.forEach(function(s) { h += '<button class="size-filter-btn' + (aS === s ? ' active' : '') + '" data-size="' + s + '" aria-label="Размер ' + s + '">' + s + '</button>'; }); h += '</div></div>'; }
  if (g.waist.length) { h += '<div class="size-filter-group"><span class="size-filter-label">👖 Пояс</span><div class="size-filter-buttons">'; g.waist.forEach(function(s) { h += '<button class="size-filter-btn' + (aS === s ? ' active' : '') + '" data-size="' + s + '" aria-label="Размер ' + s + '">' + s + '</button>'; }); h += '</div></div>'; }
  if (g.letter.length) { h += '<div class="size-filter-group"><span class="size-filter-label">📏 Одежда</span><div class="size-filter-buttons">'; g.letter.forEach(function(s) { h += '<button class="size-filter-btn' + (aS === s ? ' active' : '') + '" data-size="' + s + '" aria-label="Размер ' + s + '">' + s + '</button>'; }); h += '</div></div>'; }
  if (g.other.length) { h += '<div class="size-filter-group"><span class="size-filter-label">📐 Другое</span><div class="size-filter-buttons">'; g.other.forEach(function(s) { h += '<button class="size-filter-btn' + (aS === s ? ' active' : '') + '" data-size="' + s + '" aria-label="Размер ' + s + '">' + s + '</button>'; }); h += '</div></div>'; }
  D.sFC.innerHTML = h;
  D.sFC.querySelectorAll('.size-filter-btn').forEach(function(btn) { btn.addEventListener('click', function() { sSF(btn.getAttribute('data-size')); }); });
}
function sSF(size) { aS = aS === size ? null : size; rSF(); rCat(); setTimeout(oC, 100); setTimeout(init3DCards, 200); }
function cSF() { aS = null; rSF(); rCat(); setTimeout(oC, 100); setTimeout(init3DCards, 200); }

// ============ CATEGORIES ============
function rC() {
  var h = '<h4>Категории</h4>';
  CATS.forEach(function(cat) { var count = cat.id === 'all' ? P.length : cat.id === 'favorites' ? F.length : P.filter(function(p) { return p.category === cat.id; }).length; h += '<button class="category-btn' + (aC === cat.id ? ' active' : '') + '" data-category="' + cat.id + '" aria-label="' + cat.name + ': ' + count + ' товаров">' + cat.e + ' ' + cat.name + ' <span class="count">' + count + '</span></button>'; });
  D.cM.innerHTML = h;
  D.cM.querySelectorAll('.category-btn').forEach(function(btn) { btn.addEventListener('click', function() { sC(btn.getAttribute('data-category')); }); });
}
function rMobCats() {
  if (!D.cScr) return;
  var h = '';
  CATS.forEach(function(cat) { var count = cat.id === 'all' ? P.length : cat.id === 'favorites' ? F.length : P.filter(function(p) { return p.category === cat.id; }).length; h += '<button class="category-btn' + (aC === cat.id ? ' active' : '') + '" data-category="' + cat.id + '" aria-label="' + cat.name + '">' + cat.e + ' ' + cat.name + ' (' + count + ')</button>'; });
  D.cScr.innerHTML = h;
  D.cScr.querySelectorAll('.category-btn').forEach(function(btn) { btn.addEventListener('click', function() { sC(btn.getAttribute('data-category')); }); });
}
function sC(catId) { aC = catId; rC(); rMobCats(); rSF(); rCat(); if (isMobile) { document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' }); } setTimeout(oC, 100); setTimeout(init3DCards, 200); }

// ============ SORT & SEARCH ============
function sCat() { cSo = D.sS.value; rCat(); setTimeout(oC, 100); setTimeout(init3DCards, 200); }
function sCat2() { sQ = D.sI.value.toLowerCase().trim(); D.cSB.style.display = sQ ? 'block' : 'none'; rCat(); setTimeout(oC, 100); setTimeout(init3DCards, 200); }
function cS2() { D.sI.value = ''; sQ = ''; D.cSB.style.display = 'none'; rCat(); setTimeout(oC, 100); setTimeout(init3DCards, 200); }

// ============ GALLERY ============
function nS() { var s = document.querySelectorAll('#modalBox .modal-gallery-img'); if (!s.length) return; cS = (cS + 1) % s.length; uG(); }
function pS() { var s = document.querySelectorAll('#modalBox .modal-gallery-img'); if (!s.length) return; cS = (cS - 1 + s.length) % s.length; uG(); }
function gTS(i) { cS = i; uG(); }
function uG() { document.querySelectorAll('#modalBox .modal-gallery-img').forEach(function(img, i) { img.classList.toggle('active', i === cS); }); document.querySelectorAll('#modalBox .modal-dot').forEach(function(dot, i) { dot.classList.toggle('active', i === cS); }); }
function oL(src) { D.lI.src = src; D.lB.classList.add('active'); D.lB.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function cL() { D.lB.classList.remove('active'); D.lB.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

// ============ MODAL ============
function oM(product) {
  cP = product; sS2 = (product.sizes && product.sizes.length === 1) ? product.sizes[0] : null; cS = 0; incrementView(product.id);
  var pids = product.photo_id ? product.photo_id.split(';').map(function(s) { return s.trim(); }) : [];
  var photos = [];
  pids.forEach(function(id) {
    var url = gPU(id, IMAGE_FALLBACKS[0]);
    if (url) photos.push({ url: url, pid: id });
  });
  var g = '';
  if (photos.length > 1) {
    g = '<div class="modal-gallery"><div class="modal-gallery-slides">' + photos.map(function(photo, i) { return '<img src="' + photo.url + '" class="modal-gallery-img' + (i === 0 ? ' active' : '') + '" loading="lazy" alt="' + product.name + '" onerror="iE(this,\'' + photo.pid + '\')" data-lightbox-src="' + photo.url + '">'; }).join('') + '</div><div class="modal-gallery-dots">' + photos.map(function(_, i) { return '<span class="modal-dot' + (i === 0 ? ' active' : '') + '" data-slide="' + i + '"></span>'; }).join('') + '</div><button class="modal-gallery-prev" aria-label="Предыдущее фото">‹</button><button class="modal-gallery-next" aria-label="Следующее фото">›</button></div>';
  } else if (photos.length === 1) {
    g = '<img class="modal-img" src="' + photos[0].url + '" loading="lazy" alt="' + product.name + '" style="width:100%;height:450px;object-fit:contain;object-position:center;border-radius:8px;margin-bottom:15px;background:#080808;cursor:zoom-in" data-lightbox-src="' + photos[0].url + '" onerror="iE(this,\'' + photos[0].pid + '\')">';
  } else {
    g = '<span style="width:100%;height:450px;display:flex;align-items:center;justify-content:center;font-size:60px" aria-hidden="true">🦍</span>';
  }
  D.mGC.innerHTML = g;
  D.mT.textContent = product.name;
  D.mP.textContent = product.price.toLocaleString() + ' ₽';
  D.mC.innerHTML = product.color ? 'Цвет: <span style="display:inline-block;width:16px;height:16px;background-color:' + product.color + ';border-radius:50%;vertical-align:middle;margin-right:4px;"></span> ' + product.color : '';
  D.mD.textContent = product.description || '';
  D.mSt.textContent = product.stock > 0 ? 'В наличии: ' + product.stock + ' шт' : 'Нет в наличии';
  uMF();
  D.mSz.innerHTML = '';
  if (product.sizes && product.sizes.length) {
    product.sizes.forEach(function(size) {
      var btn = document.createElement('button');
      btn.className = 'size-btn' + (size === sS2 ? ' selected' : '');
      btn.textContent = size;
      btn.setAttribute('aria-label', 'Размер ' + size);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', size === sS2 ? 'true' : 'false');
      btn.addEventListener('click', function() {
        D.mSz.querySelectorAll('.size-btn').forEach(function(b) { b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); });
        btn.classList.add('selected');
        btn.setAttribute('aria-checked', 'true');
        sS2 = size;
      });
      D.mSz.appendChild(btn);
    });
  } else { D.mSz.innerHTML = '<span style="color:#aaa;">Без размеров</span>'; }
  renderSimilarProducts(product);
  D.mO.classList.add('active');
  D.mO.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  var schema = generateProductSchema(product);
  var scriptEl = document.getElementById('productSchema');
  if (scriptEl) scriptEl.remove();
  var newScript = document.createElement('script');
  newScript.type = 'application/ld+json';
  newScript.id = 'productSchema';
  newScript.textContent = JSON.stringify(schema);
  document.head.appendChild(newScript);
  setTimeout(function() {
    var prevBtn = D.mB.querySelector('.modal-gallery-prev');
    var nextBtn = D.mB.querySelector('.modal-gallery-next');
    var dots = D.mB.querySelectorAll('.modal-dot');
    if (prevBtn) prevBtn.onclick = pS;
    if (nextBtn) nextBtn.onclick = nS;
    dots.forEach(function(dot) { var slide = parseInt(dot.getAttribute('data-slide')); dot.onclick = function() { gTS(slide); }; });
    
    var galleryContainer = D.mB.querySelector('.modal-gallery, .modal-img');
    if (galleryContainer) {
      galleryContainer.addEventListener('click', function(e) {
        var target = e.target;
        if (target.tagName === 'IMG' && target.src && !target.src.includes('placeholder')) {
          oL(target.src.split('?v=')[0]);
        }
      });
    }
  }, 0);
}
function closeModal() { D.mO.classList.remove('active'); D.mO.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; cP = null; }

// ============ CATALOG RENDER ============
function rCat() {
  var f = aC === 'favorites' ? P.filter(function(p) { return F.includes(p.id); }) : aC === 'all' ? P : P.filter(function(p) { return p.category === aC; });
  if (aS) f = f.filter(function(p) { return p.sizes && p.sizes.includes(aS); });
  if (sQ) f = f.filter(function(p) { var nm = p.name.toLowerCase().includes(sQ); var cm = CAT_RU[p.category] ? CAT_RU[p.category].includes(sQ) : false; var cem = p.category.toLowerCase().includes(sQ); return nm || cm || cem; });
  if (cSo === 'price-asc') f.sort(function(a, b) { return a.price - b.price; });
  else if (cSo === 'price-desc') f.sort(function(a, b) { return b.price - a.price; });
  else if (cSo === 'newest') f.reverse();
  if (!f.length) { D.cG.innerHTML = '<div class="no-products">Товаров пока нет</div>'; return; }
  D.cG.innerHTML = f.map(function(p) {
    var so = p.stock === 0, ls = p.stock > 0 && p.stock <= 3;
    var st = so ? 'SOLD OUT' : ls ? 'Осталось: ' + p.stock + ' шт' : 'В наличии: ' + p.stock + ' шт';
    var catName = CATS.find(function(c) { return c.id === p.category; }) ? CATS.find(function(c) { return c.id === p.category; }).name : '';
    var sizes = p.sizes ? p.sizes.join(', ') : '';
    var pid = p.photo_id ? p.photo_id.split(';')[0].trim() : '';
    var pu = gPU(pid, IMAGE_FALLBACKS[0]);
    var isFav = F.includes(p.id);
    var hfd = p.price >= 3000;
    var fd = hfd ? '<span class="free-delivery-badge">🚚 Бесплатная доставка 5Post</span>' : '';
    var views = getViewCount(p.id);
    return '<div class="card' + (so ? ' sold-out' : '') + '" data-product-id="' + p.id + '" role="listitem"><div class="card-img">' + (pu ? '<img src="' + pu + '" alt="' + p.name + '" loading="lazy" onerror="iE(this,\'' + pid + '\')">' : '<span class="img-placeholder" aria-hidden="true">🦍</span>') + '<div class="card-tag' + (so ? ' sold' : '') + '">' + (so ? 'SOLD OUT' : (p.tag || '')) + '</div><button class="favorite-btn' + (isFav ? ' active' : '') + '" data-id="' + p.id + '" aria-label="' + (isFav ? 'Убрать из избранного' : 'Добавить в избранное') + '">' + (isFav ? '❤️' : '🤍') + '</button><button class="share-btn" data-share-id="' + p.id + '" title="Поделиться" aria-label="Поделиться товаром">🔗</button><span class="stock-badge' + (ls ? ' low' : '') + (so ? ' out' : '') + '">' + st + '</span>' + (hfd ? '<span class="free-delivery-tag">БЕСПЛАТНАЯ ДОСТАВКА</span>' : '') + '</div><div class="card-body"><h3>' + p.name + ' <span class="view-counter">' + views + '</span>' + (p.color ? '<span style="display:inline-block;width:12px;height:12px;background-color:' + p.color + ';border-radius:50%;vertical-align:middle;margin-left:6px;" title="' + p.color + '" aria-hidden="true"></span>' : '') + '</h3><p class="category">' + catName + '</p>' + (sizes ? '<div class="sizes-block"><span class="sizes-label">Размеры:</span><span class="sizes-values">' + sizes + '</span></div>' : '') + '<p class="price">' + p.price.toLocaleString() + ' ₽</p>' + fd + '<div class="card-actions"><a href="https://vk.com/gorillaomsk" target="_blank" rel="noopener noreferrer" class="btn-order btn-order-vk" onclick="event.stopPropagation();" aria-label="Заказать в VK (откроется в новом окне)">📱 VK</a><a href="https://t.me/gorillaomsk" target="_blank" rel="noopener noreferrer" class="btn-order btn-order-tg" onclick="event.stopPropagation();" aria-label="Заказать в Telegram (откроется в новом окне)">✈️ TG</a></div></div></div>';
  }).join('');
  D.cG.querySelectorAll('.card').forEach(function(card) { card.addEventListener('click', function(e) { if (e.target.closest('.favorite-btn') || e.target.closest('.btn-order') || e.target.closest('.share-btn')) return; var pid = card.getAttribute('data-product-id'); var product = P.find(function(p) { return p.id === pid; }); if (product) oM(product); }); });
  D.cG.querySelectorAll('.favorite-btn').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); var id = btn.getAttribute('data-id'); tF(id); }); });
  D.cG.querySelectorAll('.share-btn').forEach(function(btn) { btn.addEventListener('click', function(e) { var id = btn.getAttribute('data-share-id'); shareProductCard(id, e); }); });
  setTimeout(init3DCards, 200);
}

// ============ 3D CARDS ============
function init3DCards() {
  document.querySelectorAll('.card:not(.card-3d)').forEach(function(card) {
    if (!isMobile) { var smoke = document.createElement('div'); smoke.className = 'card-smoke'; smoke.setAttribute('aria-hidden', 'true'); card.appendChild(smoke); }
    card.classList.add('card-3d');
    if (!isMobile) {
      card.addEventListener('mousemove', throttle(function(e) { var rect = card.getBoundingClientRect(); var x = ((e.clientX - rect.left) / rect.width) - 0.5; var y = ((e.clientY - rect.top) / rect.height) - 0.5; var rx = y * -8; var ry = x * 8; var img = card.querySelector('.card-img'); var body = card.querySelector('.card-body'); if (img) img.style.transform = 'scale(1.05) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)'; if (body) body.style.transform = 'rotateX(' + (rx * 0.5) + 'deg) rotateY(' + (ry * 0.3) + 'deg)'; }, 16));
      card.addEventListener('mouseleave', function() { var img = card.querySelector('.card-img'); var body = card.querySelector('.card-body'); if (img) img.style.transform = 'scale(1) rotateX(0deg) rotateY(0deg)'; if (body) body.style.transform = 'rotateX(0deg) rotateY(0deg)'; });
    }
  });
}

// ============ BIND ============
function bE() {
  D.sI.addEventListener('input', debounce(sCat2, 150));
  D.cSB.addEventListener('click', cS2);
  D.sS.addEventListener('change', sCat);
  D.sFR.addEventListener('click', cSF);
  D.mCl.addEventListener('click', closeModal);
  D.mO.addEventListener('click', function(e) { if (e.target === D.mO) closeModal(); });
  if (D.mFv) D.mFv.addEventListener('click', tFFM);
  D.lB.addEventListener('click', cL);
  D.lCl.addEventListener('click', cL);
  D.lI.addEventListener('click', function(e) { e.stopPropagation(); });
  D.sT.addEventListener('click', function(e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  if (D.lI2) D.lI2.addEventListener('error', function() { this.style.display = 'none'; });
  if (D.mSB) D.mSB.addEventListener('click', shareProduct);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { cL(); if (D.mO.classList.contains('active')) closeModal(); } });
}
bE();
lP();
})();

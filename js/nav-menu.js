/* ──────────────────────────────────────────────────────────────────
   nav-menu.js  ·  Pill dropdown menu — shared across all pages
   ──────────────────────────────────────────────────────────────────
   Sits alongside the existing dial system without modifying it.
   The dial owns the theme state (localStorage 'gd-t', 0/1/2).
   This file reads from it and writes data-theme as 'light'/'dark'/'fun'
   so theme-aware menu pill colours stay in sync with the dial.
                                                                       */

(function(){
'use strict';

/* ── THEME SYNC ───────────────────────────────────────────────────── */
/* Map 0/1/2 → light/dark/fun, run on load and whenever dial changes.   */
var THEMES = ['light','dark','fun'];
function readThemeNum(){ return +(localStorage.getItem('gd-t')) || 0; }
function syncTheme(){
  var t = THEMES[readThemeNum()] || 'light';
  /* Guard: avoid retriggering MutationObserver if value hasn't changed */
  if(document.documentElement.getAttribute('data-theme') !== t){
    document.documentElement.setAttribute('data-theme', t);
  }
  /* If menu is open, repaint pills to follow new theme */
  try{ if(S && S.open) paintPills(); }catch(e){}
}
syncTheme();
/* Re-sync when the dial mutates the DOM (it sets data-theme="dark" or
   removes it). Observe attribute changes and also listen for storage  */
new MutationObserver(syncTheme).observe(document.documentElement,
  {attributes:true, attributeFilter:['data-theme']});
window.addEventListener('storage', function(e){ if(e.key==='gd-t') syncTheme(); });
/* The dial system uses click handlers, not storage events, so also
   patch a hook: every time someone calls window.setTheme or advTheme,
   re-sync after they run. We can't override their internals safely,
   so we monkey-patch when they exist.                                 */
function hookDial(){
  if(typeof window.setTheme === 'function' && !window.setTheme._hooked){
    var orig = window.setTheme;
    window.setTheme = function(n){ orig(n); setTimeout(syncTheme,0); };
    window.setTheme._hooked = true;
  }
  if(typeof window.advTheme === 'function' && !window.advTheme._hooked){
    var orig2 = window.advTheme;
    window.advTheme = function(){ orig2(); setTimeout(syncTheme,0); };
    window.advTheme._hooked = true;
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', hookDial);
} else { hookDial(); }


/* ── MENU CONFIG ──────────────────────────────────────────────────── */
/* Each item has theme-specific colours and a target URL (or isArchive)  */
var NAV_ITEMS = [
  {label:'Full Archive', fun:'#9D0877', dark:'#F0EDE8',              light:'#E85D00', url:'archive.html'},
  {label:'Portfolio',    fun:'#B87BA2', dark:'#F0EDE8',              light:'#C84800', url:'portfolio.html'},
  {label:'Home',         fun:'#1BAA8A', dark:'#F0EDE8',              light:'#E89400', url:'index.html'},
  {label:'About',        fun:'#C1721F', dark:'#F0EDE8',              light:'#D05000', url:'about.html'},
  {label:'Contact',      fun:'#C86874', dark:'#F0EDE8',              light:'#E86040', url:'contact.html'},
  {label:'Shop',         fun:'#8CA5B9', dark:'rgba(240,237,232,.35)',light:'#F0B870', future:true},
];

var S = {open:false, pills:[], lock:false};

function curTheme(){ return document.documentElement.getAttribute('data-theme') || 'light'; }
function pillCol(item){ var t = curTheme(); return item[t] || item.fun; }


/* ── BUILD MENU DOM ───────────────────────────────────────────────── */
/* Injected once, lazily, so pages don't need to add markup themselves */
function ensureMenuDOM(){
  if(document.getElementById('menu-overlay')) return;

  /* Backdrop overlay (semi-transparent background colour) */
  var ov = document.createElement('div');
  ov.id = 'menu-overlay';
  document.body.appendChild(ov);

  /* Pill list container */
  var list = document.createElement('div');
  list.id = 'menu-list';
  document.body.appendChild(list);

  NAV_ITEMS.forEach(function(item){
    var p = document.createElement('div');
    p.className = 'mpill' + (item.future ? ' future' : '');
    var wrap = document.createElement('div'); wrap.className = 'mpill-wrap';
    var body = document.createElement('div'); body.className = 'mpill-body';
    var lbl = document.createElement('span'); lbl.className = 'mpill-lbl'; lbl.textContent = item.label;
    var cap = document.createElement('div'); cap.className = 'mpill-cap';
    body.appendChild(lbl); body.appendChild(cap); wrap.appendChild(body); p.appendChild(wrap);

    if(!item.future){
      p.style.cursor = 'pointer';
      p.addEventListener('click', function(){
        if(S.lock) return;
        if(item.url) window.location.href = item.url;
      });
    }
    list.appendChild(p);
    S.pills.push(p);
  });

  /* ESC to close */
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && S.open) menuClose();
  });

  /* Click overlay to close */
  ov.addEventListener('click', menuClose);
}


/* ── COLOUR REFRESH ───────────────────────────────────────────────── */
function paintPills(){
  S.pills.forEach(function(p, i){
    var item = NAV_ITEMS[i];
    var body = p.querySelector('.mpill-body');
    if(body) body.style.background = pillCol(item);
  });
}


/* ── OPEN / CLOSE ─────────────────────────────────────────────────── */
function menuToggle(){ ensureMenuDOM(); if(S.open) menuClose(); else menuOpen(); }
function menuOpen(){
  if(S.open || S.lock) return;
  ensureMenuDOM();
  S.open = true; S.lock = true;
  paintPills();

  var ov = document.getElementById('menu-overlay');
  var list = document.getElementById('menu-list');
  ov.classList.add('open');
  list.classList.add('open');

  /* Stagger pills in from the left, end-first (closest to nav appears last) */
  if(window.gsap){
    var off = -(window.innerWidth * 0.6);
    gsap.fromTo(S.pills,
      {x: off, opacity: 0},
      {x: 0, opacity: 1, duration: 0.42, ease: 'power3.out',
        stagger: {each: 0.045, from: 'end'},
        onComplete: function(){ S.lock = false; }
      });
  } else {
    S.pills.forEach(function(p){ p.style.transform = 'translateX(0)'; p.style.opacity = '1'; });
    S.lock = false;
  }

  /* Update menu button label */
  var btn = document.getElementById('btn-menu');
  if(btn) btn.textContent = 'close';
}

function menuClose(){
  if(!S.open || S.lock) return;
  S.lock = true;
  var ov = document.getElementById('menu-overlay');
  var list = document.getElementById('menu-list');

  function finish(){
    ov.classList.remove('open');
    list.classList.remove('open');
    S.open = false; S.lock = false;
    var btn = document.getElementById('btn-menu');
    if(btn) btn.textContent = 'menu';
  }

  if(window.gsap){
    var off = -(window.innerWidth * 0.6);
    gsap.to(S.pills, {x: off, opacity: 0, duration: 0.32, ease: 'power3.in',
      stagger: {each: 0.035, from: 'start'},
      onComplete: finish});
  } else { finish(); }
}


/* ── EXPOSE ───────────────────────────────────────────────────────── */
window.menuToggle = menuToggle;
window.menuOpen = menuOpen;
window.menuClose = menuClose;
window._navSyncTheme = syncTheme;  /* exported for archive.html to call */

})();

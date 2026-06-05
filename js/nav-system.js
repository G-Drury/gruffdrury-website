/* ════════════════════════════════════════════════════════════════
   NAV SYSTEM  ·  Menu + Archive overlay  ·  Shared across all pages
   ════════════════════════════════════════════════════════════════ */

/* ── THEME SYNC: bridge dial state (gd-t 0/1/2) → data-theme string ── */
(function(){
  var THEMES=['light','dark','fun'];
  function readNum(){ return +(localStorage.getItem('gd-t')) || 0; }
  function syncTheme(){
    var t = THEMES[readNum()] || 'light';
    if(document.documentElement.getAttribute('data-theme') !== t){
      document.documentElement.setAttribute('data-theme', t);
    }
  }
  syncTheme();
  /* Listen for dial mutations and storage changes */
  new MutationObserver(syncTheme).observe(document.documentElement,
    {attributes:true, attributeFilter:['data-theme']});
  window.addEventListener('storage', function(e){ if(e.key==='gd-t') syncTheme(); });
  /* Hook dial functions when they're available so they trigger re-sync */
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
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hookDial);
  } else { hookDial(); }
  window._navSyncTheme = syncTheme;
})();


/* ════════════════════════════════════════════════════════════════
   DOM INJECTION  ·  Add menu-overlay + archive-area to the page
   These elements exist on every site page (injected here so each
   HTML file doesn't have to repeat the markup).
   ════════════════════════════════════════════════════════════════ */
(function(){
  function injectOverlays(){
    if(document.getElementById('menu-overlay')) return;
    /* Inject at body level — high z-indexes via CSS keep these above page content */
    var html = ''
      + '<div id="menu-overlay">'
      +   '<div id="nav-pills-wrap"></div>'
      + '</div>'
      + '<div id="archive-area">'
      +   '<div id="pin-bar"></div>'
      +   '<div id="go-wrap"><div class="action-pill go-pill" onclick="handleGo()">go</div></div>'
      +   '<div id="archive-scroll">'
      +     '<div id="nav-stage">'
      +       '<button id="btn-close" onclick="archiveClose()">✕ close</button>'
      +       '<div class="disc-canvas" id="canvas"></div>'
      +       '<div class="arc-layer" id="arc"></div>'
      +     '</div>'
      +     '<div id="project-stage">'
      +       '<button class="btn-back" onclick="screenLower()">← back to archive</button>'
      +       '<div id="project-display">'
      +         '<div class="proj-cat"></div>'
      +         '<div class="proj-name"></div>'
      +         '<div class="proj-placeholder"></div>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    /* Insert as siblings of .top-nav so they share its stacking context.
       Homepage nav is inside #fg (stacking context); overlays must too,
       else nav z-index can't beat body-level overlays.                  */
    var nav = document.querySelector('.top-nav');
    var host = nav ? nav.parentNode : document.body;
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    while(tmp.firstChild) host.appendChild(tmp.firstChild);
  }
  /* Body exists by the time this script runs (it's at end of body) */
  if(document.body){ injectOverlays(); }
  else if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectOverlays);
  } else { injectOverlays(); }
})();


/* ═══════════════════════════════════════════════════════════
   gruffdrury.website — v24 — GSAP navigation system

   ANIMATION FLUIDITY FIX:
   Multi-keyframe GSAP arrays pulse because each segment has
   its own ease — power2.out ends at v=0, power2.in starts
   at v=0, creating a stall at every waypoint.

   Fix: animate X and Y as SEPARATE concurrent tweens.
   Each is a single smooth ease on one axis. The path is
   their combination — x pauses at the overshoot while y
   continues, forming a true physical arc with no stalls.
   ═══════════════════════════════════════════════════════════ */

gsap.defaults({overwrite:'auto'});
/* ── PILL COLOUR SYSTEM ─────────────────────────────────────────────
   Pill A, B, C colours + B-list sub-pill colours per theme.
   Never duplicates a colour within the same list.                    */
function getNavPillColors(){
  var t=document.documentElement.dataset.theme||'fun';
  if(t==='dark')  return {A:'#F0EDE8',B:'#C8C2B8',C:'rgba(240,237,232,.15)'};
  if(t==='light') return {A:'#E85D00',B:'#C8A060',C:'rgba(232,93,0,.12)'};
  return {A:'#9D0877',B:'#4A6880',C:'#F5EFE0'}; /* fun — B darker than Material&Object disc */
}
function getBListColors(n,discIdx){
  /* Explicit per-disc palettes — never duplicates within a disc, no pastels.
     8 colours per disc per theme; n<=8 for any real project list.         */
  var t=document.documentElement.dataset.theme||'fun';
  var P={
    /* FUN — vivid, each disc in its category colour family */
    fun:[
      ['#C04490','#92176A','#E060A8','#A82878','#D04898','#7A1060','#B83888','#8C1E70'],
      ['#129C78','#1DC898','#0A8060','#22B084','#18A86E','#0E7258','#20BC90','#16946C'],
      ['#6080A0','#90AABF','#4A6E8E','#7898B0','#527095','#88A4BC','#5A7A9E','#3C5E80'],
      ['#A85890','#CC88A8','#8A3C78','#BE70A0','#9A4882','#D090B0','#B06098','#784068'],
      ['#C04858','#E07080','#A03848','#D05868','#B84058','#E07888','#AA4050','#904858']
    ],
    /* DARK — bright, high-contrast against near-black archive */
    dark:[
      ['#F080C8','#D040A0','#FF90D0','#E055B0','#F868BC','#C83090','#EE70C0','#D848A8'],
      ['#30E0A8','#18C888','#50F0B8','#28D898','#40E8B0','#20C890','#60F0C0','#18C080'],
      ['#90B8D8','#B0D0E8','#70A0C8','#A0C4DE','#80ACCE','#B8D4EC','#6898BE','#C0DAEE'],
      ['#E898C8','#CC70A8','#F8A8D8','#DA80B8','#EE90C4','#C06898','#F0A0CC','#D878B0'],
      ['#F08090','#D85868','#FF9098','#E06878','#F07080','#DE5865','#FF9898','#E87080']
    ],
    /* LIGHT — warm mid-tones, readable on warm-white archive background */
    light:[
      ['#C03880','#A82068','#D84898','#B03070','#CA4088','#903060','#E05098','#A82878'],
      ['#0A8858','#188848','#1AA068','#0E9858','#168050','#22A870','#0C7850','#189860'],
      ['#486888','#607898','#385878','#587090','#405870','#6880A0','#305070','#506888'],
      ['#985078','#B86888','#804068','#A85878','#906070','#C07090','#785870','#A06080'],
      ['#B03840','#CC5050','#A02838','#BA4848','#A83040','#C84848','#983040','#B84040']
    ]
  };
  var palette=(P[t]||P.fun)[discIdx%5];
  var out=[];
  for(var i=0;i<n;i++) out.push(palette[i%palette.length]);
  return out;
}
function darken(hex,amt){
  amt=amt||0.3;
  hex=String(hex||'#000000').replace('#','');
  if(hex.length===3) hex=hex.split('').map(function(c){return c+c;}).join('');
  var r=parseInt(hex.substr(0,2),16)||0;
  var g=parseInt(hex.substr(2,2),16)||0;
  var b=parseInt(hex.substr(4,2),16)||0;
  var f=1-amt;
  r=Math.max(0,Math.min(255,Math.round(r*f)));
  g=Math.max(0,Math.min(255,Math.round(g*f)));
  b=Math.max(0,Math.min(255,Math.round(b*f)));
  var hx=function(n){var s=n.toString(16);return s.length<2?'0'+s:s;};
  return '#'+hx(r)+hx(g)+hx(b);
}
function getHz(el){while(el&&!el.classList.contains('pill-hover'))el=el.parentElement;return el;}



/* ── CONFIG ──────────────────────────────────────────── */
var C={};
/* Pill geometry — exact ×2 from original v23 proportions (SW=63,PH=14,PR=7) */
C.SW=126; C.PH=28; C.PR=14; C.NUM=5;
C.PILL_VIS=C.SW+(C.NUM-1)*(C.SW-2*C.PR)-C.PR;  /* 332 */
C.CAP_CTR=C.PILL_VIS-C.PR;                       /* 323 */
C.PILL_A_W=400; C.SUB_W=224; C.PILL_C_W=360;
C.ROW_GAP=C.PH+1;  /* 29px — same 1px gap as original (was 15 = 14+1) */
/* Layout computed dynamically in computeLayout() */
C.ROW_FIRST=480; C.LANDING_Y=700;
C.SCALE_EXT=1.20;
C.BG='#E0AA32'; C.COL_A='#9D0877'; C.COL_B='#8CA5B9'; C.COL_C='#F5EFE0';
C.INTRO='INTRO';
/* Durations in SECONDS */
C.T_FOLD=0.20; C.T_FOLD_PAUSE=0.02; C.T_STAGGER=0.255;
C.T_EXTEND=0.17; C.T_EMERGE_A=0.30; C.T_WOBBLE=0.42; C.T_ARC=0.90;
C.T_SLEEP=0.06; C.T_EMERGE_B=0.27; C.T_LABEL=0.18;
C.T_RETRACT=0.22; C.T_FALL=0.52;
C.T_SUB_ARC=0.34; C.T_SUB_STAG=0.08;
C.T_RET_SUB=0.20; C.T_RET_STAG=0.05;
C.T_EMERGE_C=0.22; C.T_ARC_C=0.74;

/* Apply disc nav CSS custom properties */
function applyNavVars(){
  document.documentElement.style.setProperty('--ph',C.PH+'px');
  document.documentElement.style.setProperty('--pr',C.PR+'px');
}
applyNavVars();

/* Adapt layout to viewport height — rows below centre */
function computeLayout(){
  var h=window.innerHeight;
  C.ROW_GAP=C.PH+1;   /* recalc — PH may have been set after module init */
  C.ROW_FIRST=Math.round(h*0.50+30);      /* just below vertical centre */
  C.LANDING_Y=C.ROW_FIRST+C.NUM*C.ROW_GAP+62; /* below disc rows */
}
computeLayout();

C.NAV_ITEMS=[
  /* fun: vibrant; dark: white (minimal); light: bold oranges */
  {label:'Full Archive', fun:'#9D0877', dark:'#F0EDE8',             light:'#E85D00', isArchive:true},
  {label:'Portfolio',    fun:'#B87BA2', dark:'#F0EDE8',             light:'#C84800', url:'portfolio.html'},
  {label:'Home',         fun:'#1BAA8A', dark:'#F0EDE8',             light:'#E89400', url:'index.html'},
  {label:'About',        fun:'#C1721F', dark:'#F0EDE8',             light:'#D05000', url:'about.html'},
  {label:'Contact',      fun:'#C86874', dark:'#F0EDE8',             light:'#E86040', url:'contact.html'},
  {label:'Shop',         fun:'#8CA5B9', dark:'rgba(240,237,232,.35)',light:'#F0B870', future:true},
];

C.DISCS=[
  {label:'Graphic &amp; Brand',   col:'#9D0877',cap:'#7A0660',
   proj:[{s:'ESCAPE',f:"Escape — The Londoner's Underground"},{s:'RELIEF',f:'Real Relief — Safepad'},
         {s:'CORE',f:'Core — Brand Strategy'},{s:'HONEY',f:'Honey Labels'},
         {s:'POSTERS',f:'Graphic Poster Series'},{s:'YOKE',f:'Yoke — All About Eggs'},
         {s:'SKY',f:'4 the Love of Skydiving'}]},
  {label:'UX &amp; Digital',      col:'#1BAA8A',cap:'#129776',
   proj:[{s:'SITE',f:'gruffdrury.website'},{s:'APP A',f:'App Design A'},{s:'APP B',f:'App Design B'}]},
  {label:'Material &amp; Object', col:'#8CA5B9',cap:'#6B8499',
   proj:[{s:'RIPE',f:'Ripe for Revival'},{s:'BBCUBE',f:'BBcube — Portable BBQ'}]},
  {label:'Research &amp; Writing',col:'#B87BA2',cap:'#8A567E',
   proj:[{s:'YOKE',f:'Yoke — All About Eggs'},{s:'SKY',f:'4 the Love of Skydiving'},
         {s:'BEES',f:'The Plight of Our Pollinators'},{s:'ETHNO',f:'Speculative Report'},
         {s:'BUILD',f:'The Construction Reconstruction'},{s:'WASTE',f:'Waste Not, Want Not'},
         {s:'DAILY',f:'Observing the Everyday'},{s:'COLLECT',f:'Questioning the Collection'}]},
  {label:'Drawing Practice',      col:'#C86874',cap:'#8E4052',
   proj:[{s:'BEES',f:'Pollinators — Bee Drawings'},{s:'ARCH',f:'Architecture Sketches'},
         {s:'FIGURE',f:'Human Figure Series'},{s:'ILLUS',f:'Graphic Illustration Series'},
         {s:'ALGAE',f:'Micro Algae Facemask'}]},
];

/* ── STATE ───────────────────────────────────────────── */
var S={sel:null,busy:false,slow:false,projBusy:false,menuOpen:false,archiveOpen:false,risen:false,menuPills:[]};

/* ── HELPERS ─────────────────────────────────────────── */
function genPastels(n,h){var c=[],hh=h%360;
  for(var i=0;i<n;i++){c.push('hsl('+Math.round(hh)+',54%,71%)');hh=(hh+137.508)%360;}return c;}
function sleep(s){return new Promise(function(r){gsap.delayedCall(s,r);});}
function docPos(el){var r=el.getBoundingClientRect();
  return{left:r.left+(window.pageXOffset||0),top:r.top+(window.pageYOffset||0)};}

/* ══════════════════════════════════════════════════════════
   GLOBAL NAV
   ══════════════════════════════════════════════════════════ */
var NAV_DROP='33vh';
function menuToggle(){ if(S.menuOpen) menuClose(); else if(!S.archiveOpen) menuOpen(); }

function menuOpen(){
  if(S.menuOpen||S.archiveOpen) return;
  S.menuOpen=true;
  document.body.classList.add('menu-state');
  document.getElementById('btn-menu').textContent='close';

  var wrap=document.getElementById('nav-pills-wrap');
  wrap.innerHTML=''; S.menuPills=[];

  C.NAV_ITEMS.forEach(function(item){
    var p=document.createElement('div');
    p.className='mpill'+(item.future?' future':'');
    var theme=document.documentElement.dataset.theme||'fun';
    p.style.background=item[theme]||item.fun;
    var lbl=document.createElement('span'); lbl.className='mpill-lbl'; lbl.textContent=item.label;
    var cap=document.createElement('div'); cap.className='mpill-cap';
    p.appendChild(lbl); p.appendChild(cap);
    wrap.appendChild(p); S.menuPills.push(p);

    if(!item.future){
      p.addEventListener('click',function(){
        if(item.isArchive) archiveOpen(); else menuClose();
      });
      /* Hover: scale right from left anchor */
      p.addEventListener('mouseenter',function(){
        gsap.to(p,{scaleX:1.02,duration:0.22,ease:'power2.out',transformOrigin:'0% 50%'});
      });
      p.addEventListener('mouseleave',function(){
        gsap.to(p,{scaleX:1,duration:0.28,ease:'power2.out',transformOrigin:'0% 50%'});
      });
    }

    /* off-screen x is applied after the forEach loop once offLeft is calculated */
  });

  /* offLeft: translateX that puts the pill's right edge just off the left of the screen.
     Pill right edge in viewport = nav_pills_wrap_left (-170) + pill_width (50vw+170) = 50vw.
     So x < -50vw puts it completely off-screen.                                          */
  var offLeft=Math.round(window.innerWidth*0.52+10);

  /* Apply off-screen start (set here since offLeft is now defined) */
  S.menuPills.forEach(function(p){gsap.set(p,{x:-offLeft});});

  /* Nav drops, overlay expands, then pills SLIDE in from off-screen left */
  gsap.timeline()
    .to('.top-nav',{y:NAV_DROP,duration:0.4,ease:'power3.inOut'},'<')
    .to('#dial-float',{y:NAV_DROP,duration:0.4,ease:'power3.inOut'},'<')
    .to('#menu-overlay',{height:'calc('+NAV_DROP+' + 44px)',duration:0.4,ease:'power3.inOut'},'<')
    .to(S.menuPills,{x:0,duration:0.30,ease:'power2.out',stagger:0.07},'-=0.08');
}

function menuClose(){
  if(!S.menuOpen) return;
  S.menuOpen=false;
  document.getElementById('btn-menu').textContent='menu';
  var offL=Math.round(window.innerWidth*0.52+10);
  gsap.timeline()
    .to(S.menuPills,{x:-offL,duration:0.20,ease:'power2.in',stagger:{each:0.05,from:'end'}},'<')
    .to('.top-nav',{y:0,duration:0.38,ease:'power3.inOut'},'-=0.06')
    .to('#dial-float',{y:4,duration:0.38,ease:'power3.inOut'},'-=0.38')
    .to('#menu-overlay',{height:0,duration:0.38,ease:'power3.inOut'},'-=0.38')
    .call(function(){document.getElementById('nav-pills-wrap').innerHTML='';S.menuPills=[];document.body.classList.remove('menu-state');});
}

function archiveOpen(){
  if(S.archiveOpen) return;
  S.archiveOpen=true;
  document.body.classList.remove('menu-state');
  document.body.classList.add('archive-state');

  /* Pills slide back off to the left */
  var offLA=Math.round(window.innerWidth*0.52+10);
  gsap.to(S.menuPills,{x:-offLA,duration:0.18,ease:'power2.in',stagger:{each:0.04,from:'end'}});

  /* Move site dial (#dial-float) to bottom-right archive corner.
     Dial is 80px square; 28px viewport margin = (innerWidth-108, innerHeight-108).
     Override CSS transform: translate(-50%,4px) by setting xPercent:0 x:0 y:0. */
  gsap.timeline()
    .to('#menu-overlay',{height:'100vh',duration:0.50,ease:'power3.inOut'},0.08)
    .to('.top-nav',{y:'110vh',duration:0.50,ease:'power3.inOut'},0.08)
    .to('#dial-float',{left:(window.innerWidth-160)+'px',top:(window.innerHeight-108)+'px',xPercent:0,x:0,y:0,duration:0.50,ease:'power3.inOut'},0.08)
    .call(function(){
      computeLayout();
      document.getElementById('archive-area').classList.add('live');
      gsap.to('#archive-area',{opacity:1,duration:0.28});
      S.menuOpen=false;
      document.getElementById('btn-menu').textContent='menu';
      gsap.set('#archive-scroll',{y:0}); S.risen=false;
      gsap.set('#pin-bar',{opacity:0}); document.getElementById('pin-bar').classList.remove('live');
      gsap.set('#go-wrap',{opacity:0}); document.getElementById('go-wrap').classList.remove('active');
      gsap.delayedCall(0.20,navReset);
    },null,0.42);
}

function archiveClose(){
  if(!S.archiveOpen) return;
  /* Lower project screen if risen, then tear down */
  var doClose=function(){
    /* Return site dial (#dial-float) from corner to top-centre with the nav */
    gsap.killTweensOf('#dial-float');
    if(S.sel){gsap.killTweensOf([S.sel.pillA,S.sel.pillB]);}
    document.getElementById('canvas').innerHTML='';
    document.getElementById('arc').innerHTML='';
    S.sel=null; S.busy=false; S.projBusy=false; S.risen=false;
    gsap.set('#archive-scroll',{y:0});
    gsap.timeline()
      .to('#archive-area',{opacity:0,duration:0.22})
      .call(function(){document.getElementById('archive-area').classList.remove('live');})
      .to('.top-nav',{y:0,duration:0.42,ease:'power3.inOut'},'-=0.08')
      .to('#dial-float',{left:'50%',top:'0px',xPercent:-50,x:0,y:4,duration:0.42,ease:'power3.inOut'},'-=0.42')
      .to('#menu-overlay',{height:0,duration:0.42,ease:'power3.inOut'},'-=0.42')
      .call(function(){S.archiveOpen=false;document.body.classList.remove('archive-state');});
  };
  if(S.risen) screenLower().then(doClose); else doClose();
}

/* ══════════════════════════════════════════════════════════
   DISC NAV — GSAP v24

   ARC FLUIDITY: X and Y animated as separate concurrent tweens.

   For Pill A arc:
     Y → single power1.in tween: smooth parabolic fall.
     X → two-phase timeline: power2.out to overshoot (ends v→0),
         then power3.in to landing (starts v=0). Velocities match
         at boundary (both zero) — physical apex, no stall felt.
         Combined X+Y path = smooth curved trajectory. ✓

   Same principle applied to Pill C arc and B-list opening arcs.
   ══════════════════════════════════════════════════════════ */

/* ── DISC COLOUR THEMES ───────────────────────────────────
   Fun mode: archive's new palette (kept, also applied to home nav fun)
   Dark mode: same as home nav dark (white pills — minimalist)
   Light mode: same as home nav light (bold oranges)              */
function getDiscColors(){
  var th=document.documentElement.dataset.theme||'fun';
  if(th==='dark') return [
    {col:'#F0EDE8',cap:'rgba(240,237,232,.55)'},
    {col:'#F0EDE8',cap:'rgba(240,237,232,.55)'},
    {col:'#F0EDE8',cap:'rgba(240,237,232,.55)'},
    {col:'#F0EDE8',cap:'rgba(240,237,232,.55)'},
    {col:'#F0EDE8',cap:'rgba(240,237,232,.55)'},
  ];
  if(th==='light') return [
    {col:'#E85D00',cap:'#C84800'},
    {col:'#E89400',cap:'#C87200'},
    {col:'#C84800',cap:'#A03600'},
    {col:'#D05000',cap:'#A83800'},
    {col:'#E86040',cap:'#C04020'},
  ];
  /* fun — the current archive palette */
  return [
    {col:'#9D0877',cap:'#7A0660'},
    {col:'#1BAA8A',cap:'#129776'},
    {col:'#8CA5B9',cap:'#6B8499'},
    {col:'#B87BA2',cap:'#8A567E'},
    {col:'#C86874',cap:'#A84F60'},
  ];
}
/* Home nav fun-mode pill colours now match the archive fun palette above.
   (NAV_ITEMS fun values #9D0877,#1BAA8A,etc. are already correct.)   */

/* ── GO / BACK: ACTUAL PILL RISE ────────────────────────
   Pill A and C stay inside archive-scroll. A GSAP y counter-
   animation exactly offsets the scroll rise minus the pin-bar
   stop position — they appear to rise with the golden background
   and settle at the top bar. Same pills, seamless motion.

   viewport_y = -scrollRise + cssTop + gsapY
   At full rise: -innerHeight + aTop + pillYTarget = pinTop
   pillYTarget = pinTop - aTop + innerHeight                    */

var PIN_BAR_H = 56;
var _goData = {top:0,aLeft:0,cLeft:0,projFull:'',catLabel:''};

function showGoPill(aTop,aLeft,cLeft,projFull,catLabel){
  _goData = {top:aTop,aLeft:aLeft,cLeft:cLeft,projFull:projFull,catLabel:catLabel};
  var wrap = document.getElementById('go-wrap');
  var pill = wrap.querySelector('.action-pill');
  if(pill){ pill.className='action-pill go-pill'; pill.textContent='go'; pill.onclick=handleGo; }
  wrap.style.top = aTop+'px';
  gsap.set(wrap,{opacity:0,y:8});
  gsap.to(wrap,{opacity:1,y:0,duration:0.32,ease:'power2.out'});
  wrap.classList.add('active');
}

function handleGo(){
  if(S.risen||!S.sel) return;
  S.risen = true;
  document.querySelector('.proj-name').textContent = _goData.projFull||'';
  document.querySelector('.proj-cat').textContent  = _goData.catLabel||'';

  var hh = window.innerHeight;
  var pinTop = Math.round((PIN_BAR_H - C.PH) / 2);   /* 14px */
  var pillYTarget = pinTop - _goData.top + hh;

  function risePin(p, clickFn){
    if(!p) return;
    p.style.zIndex = '50';
    p.style.pointerEvents = 'all';
    p.style.cursor = 'pointer';
    gsap.to(p,{y:pillYTarget,duration:0.9,ease:'power3.inOut'});
    p.onclick = clickFn;
  }

  var selSnap = S.sel;
  risePin(S.sel.pillA, function(){
    if(!S.risen||!S.sel) return;
    handleBack();
    gsap.delayedCall(0.72, function(){ if(S.sel===selSnap) deselect(selSnap); });
  });
  risePin(S.sel.pillC, function(){
    if(!S.risen||!S.sel) return;
    handleBack();
    gsap.delayedCall(0.72, function(){
      if(S.sel&&S.sel.pillC){
        var oldC=S.sel.pillC; S.sel.pillC=null;
        fallPillCOnly(oldC,S.sel.pillA);  /* hides GO automatically */
      }
    });
  });

  gsap.to('#archive-scroll',{y:'-50%',duration:0.9,ease:'power3.inOut'});
  gsap.to('#pin-bar',{opacity:1,duration:0.2,delay:0.55});
  document.getElementById('pin-bar').classList.add('live');
  gsap.to('#go-wrap',{top:pinTop,duration:0.9,ease:'power3.inOut'});
  gsap.delayedCall(0.52, function(){
    var wrap=document.getElementById('go-wrap');
    var pill=wrap.querySelector('.action-pill');
    if(pill){
      gsap.to(pill,{backgroundColor:'#C8200C',duration:0.22,ease:'power2.inOut'});
      pill.style.color='#1A0402'; pill.textContent='back'; /* no arrow — matches pill width */
      pill.className='action-pill back-pill'; pill.onclick=handleBack;
    }
  });
  moveDial('pin');
}

function handleBack(){
  if(!S.risen) return;
  S.risen = false;
  var pills = [S.sel&&S.sel.pillA, S.sel&&S.sel.pillC];
  pills.forEach(function(p){
    if(!p) return;
    gsap.to(p,{y:0,duration:0.65,ease:'power3.inOut',onComplete:function(){
      p.style.zIndex=''; p.style.pointerEvents='none'; p.style.cursor=''; p.onclick=null;
    }});
  });
  gsap.to('#archive-scroll',{y:0,duration:0.65,ease:'power3.inOut'});
  gsap.to('#pin-bar',{opacity:0,duration:0.18});
  document.getElementById('pin-bar').classList.remove('live');
  gsap.to('#go-wrap',{top:_goData.top,duration:0.65,ease:'power3.inOut'});
  gsap.delayedCall(0.30, function(){
    var wrap=document.getElementById('go-wrap');
    var pill=wrap.querySelector('.action-pill');
    if(pill){
      gsap.to(pill,{backgroundColor:'#2CB919',duration:0.22});
      pill.style.color='#0A1A08'; pill.textContent='go';
      pill.className='action-pill go-pill'; pill.onclick=handleGo;
    }
  });
  moveDial('corner');
}

function buildPinBar(){}  /* pills are real — no clones needed */
function screenRise(){}
function screenLower(){
  if(!S.risen) return Promise.resolve();
  handleBack();
  return new Promise(function(r){ gsap.delayedCall(0.72,r); });
}

function moveDial(dest){
  /* Targets the site dial (#dial-float). Dial is 80px square; 28px margin.
     xPercent:0 overrides CSS transform: translate(-50%,4px) so the dial's
     top-left corner sits exactly at (left, top) — no half-self-width offset. */
  var dial = document.getElementById('dial-float');
  if(!dial) return;
  if(dest==='pin')
    gsap.to(dial,{left:(window.innerWidth-160)+'px',top:'0px',xPercent:0,x:0,y:4,duration:0.9,ease:'power3.inOut'});
  else
    gsap.to(dial,{left:(window.innerWidth-160)+'px',top:(window.innerHeight-108)+'px',
      xPercent:0,x:0,y:0,duration:0.65,ease:'power3.inOut'});
}



/* ── BUILD ───────────────────────────────────────────── */
function navReset(){
  S.sel=null; S.busy=false; S.projBusy=false; S.risen=false;
  gsap.set('#go-wrap',{opacity:0}); document.getElementById('go-wrap').classList.remove('active');
  gsap.set('#pin-bar',{opacity:0}); document.getElementById('pin-bar').classList.remove('live');
  /* Reset any pills left with zIndex/pointerEvents from risen state */
  document.querySelectorAll('.float-pill,.cpill').forEach(function(p){
    p.style.zIndex='';p.style.pointerEvents='';p.onclick=null;
    gsap.set(p,{y:0});
  });
  document.getElementById('canvas').innerHTML='';
  document.getElementById('arc').innerHTML='';

  C.DISCS.forEach(function(disc,i){
    disc.colors=getBListColors(disc.proj.length,i);
    var row=document.createElement('div');
    row.className='pill-row';
    row.style.top=(C.ROW_FIRST+i*C.ROW_GAP)+'px';
    var dc=getDiscColors()[i]||{col:disc.col,cap:disc.cap};
    row.style.setProperty('--col',dc.col);
    row.style.setProperty('--cap',dc.cap);
    var hz=document.createElement('div');
    hz.className='pill-hover'; hz.style.width=C.PILL_VIS+'px';
    hz.addEventListener('click',(function(d,idx,h){return function(){navClick(d,idx,h);};})(disc,i,hz));
    hz.addEventListener('mouseenter',(function(lc){return function(){
      if(!hz.classList.contains('locked')){
        gsap.to(hz,{scaleX:1.045,duration:0.28,ease:'power2.out',transformOrigin:'0% 50%'});
        if(lc)gsap.to(lc,{scaleX:1/1.045,duration:0.28,ease:'power2.out',transformOrigin:'50% 50%'});
      }
    };})(lcap));
    hz.addEventListener('mouseleave',(function(lc){return function(){
      if(!hz.classList.contains('locked')){
        gsap.to(hz,{scaleX:1,duration:0.28,ease:'power2.out',transformOrigin:'0% 50%'});
        if(lc)gsap.to(lc,{scaleX:1,duration:0.28,ease:'power2.out'});
      }
    };})(lcap));
    var lcap=document.createElement('div'); lcap.className='hz-lcap'; hz.appendChild(lcap);
    gsap.set(hz,{opacity:0}); gsap.set(lcap,{opacity:0});  /* both hidden */
    var an=document.createElement('div'); an.className='pill-anchor';
    hz.appendChild(an); row.appendChild(hz);
    document.getElementById('canvas').appendChild(row);
    gsap.delayedCall(i*C.T_STAGGER,function(){foldSegs(an,1,disc.label);});
  });
}

/* ── FOLD ────────────────────────────────────────────── */
function foldSegs(parent,idx,label){
  var seg=document.createElement('div');
  seg.className='seg'; seg.style.width=C.SW+'px';
  if(idx>1){
    seg.style.position='absolute';
    seg.style.left=(C.SW-2*C.PR)+'px'; seg.style.top='0';
    gsap.set(seg,{transformOrigin:C.PR+'px 50%'});
  }
  var lbl=null;
  if(idx===C.NUM){
    lbl=document.createElement('span');
    lbl.className='seg-lbl'; lbl.innerHTML=label;
    gsap.set(lbl,{opacity:0}); seg.appendChild(lbl);
    var cap=document.createElement('div'); cap.className='seg-cap'; seg.appendChild(cap);
  }
  var dir=(idx%2===1)?-1:1;
  if(idx>1) gsap.set(seg,{transformOrigin:C.PR+'px 50%'});

  if(idx===1){
    /* First segment slides in from off-screen left, folding as it enters.
       disc-canvas overflow:hidden clips it until it crosses x=0.          */
    var offX = -(C.PR + C.SW + 4);  /* fully past canvas left edge */
    gsap.set(seg,{rotation:dir*180, x:offX, opacity:1});
    parent.appendChild(seg);
    gsap.set(parent.parentElement,{opacity:1});  /* hz visible — seg off-screen */
    gsap.fromTo(seg,
      {rotation:dir*180, x:offX},
      {rotation:0, x:0, duration:C.T_FOLD*2.8, ease:'power2.out',
        onComplete:function(){
          gsap.delayedCall(C.T_FOLD_PAUSE,function(){foldSegs(seg,2,label);});
        }
      }
    );
  } else {
    /* Segments 2-5 fold in-place from their hinge point */
    gsap.set(seg,{rotation:dir*180, opacity:1});
    parent.appendChild(seg);
    gsap.fromTo(seg,
      {rotation:dir*180},
      {rotation:0, duration:C.T_FOLD, ease:'back.out(1.1)',
        onComplete:function(){
          if(idx<C.NUM){
            gsap.delayedCall(C.T_FOLD_PAUSE,function(){foldSegs(seg,idx+1,label);});
          } else if(lbl){
            gsap.to(lbl,{opacity:1,duration:C.T_LABEL,ease:'power2.inOut'});
            var _hz=getHz(seg);
            if(_hz){var _lc=_hz.querySelector('.hz-lcap');
              if(_lc)gsap.to(_lc,{opacity:1,duration:C.T_LABEL,ease:'power2.inOut'});}
          }
        }
      }
    );
  }
}

/* ── CLICK ───────────────────────────────────────────── */
async function navClick(disc,rowIdx,hz){
  if(S.busy) return;
  if(S.sel&&S.sel.hz===hz) return;
  S.busy=true;
  try{
    if(S.sel) await deselect(S.sel);
    await select(disc,rowIdx,hz);
    stackBList(disc,S.sel);
  } finally{S.busy=false;}
}

/* ── DESELECT ────────────────────────────────────────── */
async function deselect(sel){
  /* If project panel is showing, lower the screen first
     (handleBack inside screenLower morphs BACK back to GO during the lower) */
  if(S.risen) await screenLower();

  /* Hide GO/BACK — bound to Pill C presence. Once deselect runs, Pill C is
     being removed below; the button must follow it out. */
  gsap.to('#go-wrap',{opacity:0,duration:0.22,ease:'power2.out'});
  document.getElementById('go-wrap').classList.remove('active');

  var pillA=sel.pillA,pillB=sel.pillB,hz=sel.hz;
  var bList=sel.bList||[],pillC=sel.pillC;

  bList.forEach(function(p){p.style.pointerEvents='none';});
  if(pillB) pillB.style.pointerEvents='none';
  gsap.killTweensOf(pillB); gsap.set(pillB,{scaleX:1,x:0,y:0});

  var retractDone=retractBList(bList);
  fallPillAandC(pillA,pillC);

  await retractDone;
  if(pillB){
    gsap.set(pillB,{clipPath:'inset(0 0% 0 0 round '+C.PR+'px)'});
    await gsap.to(pillB,{clipPath:'inset(0 100% 0 0 round '+C.PR+'px)',
      duration:C.T_RETRACT,ease:'power2.in'});
    pillB.remove();
  }
  resetHz(hz);
  S.sel=null;
}

/* ── RETRACT B-LIST ──────────────────────────────────── */
/* Rectangular path (right → down → left) is intentional here.
   Short duration (0.20s) means pulsing is imperceptible.      */
function retractBList(bList){
  if(!bList||!bList.length) return Promise.resolve();
  var n=bList.length;
  var proms=bList.map(function(sp,listIdx){
    var stackIdx=n-1-listIdx;
    var dY_r=(stackIdx+1)*(C.PH+1);
    var bulge=18+stackIdx*7;
    return new Promise(function(resolve){
      gsap.delayedCall(listIdx*C.T_RET_STAG,function(){
        if(!sp.parentNode){resolve();return;}
        /* Matched exit velocities at corners to minimise speed bumps */
        gsap.timeline({onComplete:function(){if(sp.parentNode)sp.remove();resolve();}})
          .to(sp,{x:bulge,duration:C.T_RET_SUB*.28,ease:'power2.in'})
          .to(sp,{y:dY_r, duration:C.T_RET_SUB*.36,ease:'power2.in'})
          .to(sp,{x:0,    duration:C.T_RET_SUB*.36,ease:'power2.out'});
      });
    });
  });
  return Promise.all(proms);
}

/* ── FALL ────────────────────────────────────────────── */
function fallPillAandC(pillA,pillC){
  function doFall(pill,rotDir){
    if(!pill) return;
    var dp=docPos(pill);
    gsap.killTweensOf(pill);
    if(pill.parentNode) pill.parentNode.removeChild(pill);
    gsap.set(pill,{position:'absolute',left:dp.left,top:dp.top,
      x:0,y:0,rotation:0,transformOrigin:'50% 50%',clipPath:'none',opacity:1,zIndex:9999});
    document.body.appendChild(pill);
    gsap.to(pill,{y:460,rotation:rotDir*-20,duration:C.T_FALL,ease:'power2.in',
      onComplete:function(){if(pill.parentNode)pill.remove();}});
  }
  doFall(pillA,1); doFall(pillC,-1);
}
function fallPillCOnly(pillC,pillA){
  if(!pillC) return;
  /* GO button is bound to Pill C — Pill C goes, GO goes */
  gsap.to('#go-wrap',{opacity:0,duration:0.18,ease:'power2.out'});
  document.getElementById('go-wrap').classList.remove('active');
  if(pillA){gsap.killTweensOf(pillA);gsap.set(pillA,{scaleX:1,clearProps:'transformOrigin'});}
  var dp=docPos(pillC);
  gsap.killTweensOf(pillC);
  if(pillC.parentNode) pillC.parentNode.removeChild(pillC);
  gsap.set(pillC,{position:'absolute',left:dp.left,top:dp.top,
    x:0,y:0,rotation:0,transformOrigin:'50% 50%',clipPath:'none',opacity:1,zIndex:9998});
  document.body.appendChild(pillC);
  gsap.to(pillC,{y:380,rotation:16,duration:C.T_FALL*.85,ease:'power2.in',
    onComplete:function(){if(pillC.parentNode)pillC.remove();}});
}

/* ── RESET HZ ────────────────────────────────────────── */
function resetHz(hz){
  hz.classList.remove('locked');
  gsap.killTweensOf(hz); gsap.set(hz,{scaleX:1,clearProps:'transform'});
  hz.style.removeProperty('--lbl-sx');
  var sc=hz.querySelector('.seg-cap');
  if(sc){gsap.killTweensOf(sc);gsap.set(sc,{scaleX:1,clearProps:'transform'});}
  var lc=hz.querySelector('.hz-lcap');
  if(lc){gsap.killTweensOf(lc);gsap.set(lc,{scaleX:1,clearProps:'transform'});}
}

/* ── SELECT ──────────────────────────────────────────── */
async function select(disc,rowIdx,hz){
  hz.classList.add('locked'); gsap.killTweensOf(hz);
  var row_y=C.ROW_FIRST+rowIdx*C.ROW_GAP;
  var segCap=hz.querySelector('.seg-cap');
  var s=C.SCALE_EXT, inv=(1/s).toFixed(4);

  gsap.set(hz,{transformOrigin:'0% 50%'});
  if(segCap) gsap.set(segCap,{transformOrigin:'50% 50%'});
  var lcap=hz.querySelector('.hz-lcap');
  if(lcap) gsap.set(lcap,{transformOrigin:'50% 50%'});

  /* Extend — lcap counter-scales to stay circular */
  if(segCap) gsap.to(segCap,{scaleX:1/1.045,duration:C.T_EXTEND,ease:'power2.out'});
  if(lcap)   gsap.to(lcap,  {scaleX:1/s,    duration:C.T_EXTEND,ease:'power2.out'});
  await gsap.to(hz,{scaleX:s,duration:C.T_EXTEND,ease:'power2.out'});

  /* Pill A emerges — colour = disc's cap (the dark circle this pill grew from) */
  var pillALeft=Math.round(C.CAP_CTR*s-C.PR);
  var _dcA=(getDiscColors()[rowIdx]||{}).cap||disc.cap;
  var pillA=makePill(_dcA,disc.label,pillALeft,row_y,false,C.PILL_A_W);
  document.getElementById('arc').appendChild(pillA);
  var clipR='inset(0 100% 0 0 round '+C.PR+'px)';
  var clipO='inset(0 0% 0 0 round '+C.PR+'px)';
  gsap.set(pillA,{clipPath:clipR});
  await gsap.to(pillA,{clipPath:clipO,duration:C.T_EMERGE_A,ease:'power2.inOut'});
  gsap.set(pillA,{clipPath:'none'});

  /* Wobble LEFT snap-back + Pill A arc (separate X/Y for smooth path) */
  if(segCap){
    gsap.to(segCap,{scaleX:1/(s*0.88),duration:C.T_WOBBLE*0.30,ease:'power3.in',
      onComplete:function(){
        gsap.to(segCap,{scaleX:parseFloat(inv),duration:C.T_WOBBLE*0.70,ease:'elastic.out(1,0.4)'});
      }});
  }
  var wobbleDone=new Promise(function(res){
    gsap.to(hz,{scaleX:s*0.88,duration:C.T_WOBBLE*0.30,ease:'power3.in',
      onComplete:function(){
        gsap.to(hz,{scaleX:s,duration:C.T_WOBBLE*0.70,ease:'elastic.out(1,0.4)',onComplete:res});
        if(lcap)gsap.to(lcap,{scaleX:1/s,duration:C.T_WOBBLE*0.70,ease:'elastic.out(1,0.4)'});
      }});
    if(lcap)gsap.to(lcap,{scaleX:1/(s*0.88),duration:C.T_WOBBLE*0.30,ease:'power3.in'});
  });

  /* FLUIDITY FIX: separate X and Y tweens for Pill A arc.
     Y: single smooth fall (power1.in = parabolic gravity feel).
     X: right overshoot (power2.out ends v→0) + hard left sweep
        (power3.in starts v=0). Velocities match at apex — no stall. */
  var dX=-C.PR-pillALeft, dY=C.LANDING_Y-row_y;
  gsap.to(pillA,{y:dY, duration:C.T_ARC, ease:'power1.in'});  /* Y: smooth fall */
  gsap.timeline()                                               /* X: apex then sweep */
    .to(pillA,{x:18,         duration:C.T_ARC*0.30, ease:'power2.out'})
    .to(pillA,{x:dX,         duration:C.T_ARC*0.70, ease:'power3.in'});

  await wobbleDone;
  gsap.killTweensOf(hz); gsap.set(hz,{scaleX:s});
  hz.style.setProperty('--lbl-sx',inv);
  if(segCap){gsap.killTweensOf(segCap);gsap.set(segCap,{scaleX:parseFloat(inv)});}
  if(lcap){gsap.killTweensOf(lcap);gsap.set(lcap,{scaleX:1/s});}

  /* Pill B */
  await sleep(C.T_SLEEP);
  var pillBLeft=Math.round(C.CAP_CTR*s-C.PR);
  var pillB=makePill(getNavPillColors().B,C.INTRO,pillBLeft,row_y,true,C.PILL_VIS);
  gsap.set(pillB,{transformOrigin:'0% 50%'});
  document.getElementById('arc').appendChild(pillB);
  gsap.set(pillB,{clipPath:clipR});
  await gsap.to(pillB,{clipPath:clipO,duration:C.T_EMERGE_B,ease:'power2.inOut'});
  gsap.set(pillB,{clipPath:'none'});  /* no boxShadow — removes bottom-of-stack highlight */

  S.sel={hz,pillA,pillB,disc,rowIdx,pillBLeft,row_y,bList:[],pillC:null};
}

/* ── STACK B-LIST ────────────────────────────────────── */
/* FLUIDITY FIX: separate X and Y for smooth arc.
   Y: smooth rise (power2.out). X: right bulge then settle
   (power2.out to bulge v→0, power2.in back v=0). */
function stackBList(disc,sel){
  if(!sel||!sel.pillB) return;
  var pillB=sel.pillB,pillBLeft=sel.pillBLeft,row_y=sel.row_y;
  var projs=disc.proj,colors=disc.colors,n=projs.length;
  var rightEdge=pillBLeft+C.PILL_VIS, subLeft=rightEdge-C.SUB_W;

  projs.forEach(function(proj,i){
    var stackIdx=n-1-i;
    var delay=stackIdx*C.T_SUB_STAG;
    var finalTop=row_y-(stackIdx+1)*(C.PH+1);
    var dY_r=(stackIdx+1)*(C.PH+1);
    var bulge=18+stackIdx*7;

    var sp=makeSubPill(proj.s,proj.f,colors[i],subLeft,finalTop);
    gsap.set(sp,{y:dY_r});
    document.getElementById('arc').appendChild(sp);
    sel.bList.push(sp);

    gsap.delayedCall(delay,function(){
      if(!S.sel||S.sel.pillB!==pillB){if(sp.parentNode)sp.parentNode.removeChild(sp);return;}
      /* Y: smooth rise from PillB level to stack position */
      gsap.to(sp,{y:0, duration:C.T_SUB_ARC, ease:'power2.out'});
      /* X: right bulge then settle back — apex at peak right, no stall */
      gsap.timeline()
        .to(sp,{x:bulge, duration:C.T_SUB_ARC*0.35, ease:'power2.out'})
        .to(sp,{x:0,     duration:C.T_SUB_ARC*0.65, ease:'power2.in'});
    });
  });

  /* Enable INTRO after stack settles */
  var allDone=(n-1)*C.T_SUB_STAG+C.T_SUB_ARC+0.14;
  gsap.delayedCall(allDone,function(){
    if(!S.sel||S.sel.pillB!==pillB) return;
    pillB.style.pointerEvents='all'; pillB.style.cursor='pointer';
    pillB.addEventListener('click',function(e){
      e.stopPropagation();
      if(!S.projBusy&&S.sel)
        selectProject(S.sel,{s:'INTRO',f:'Category Introduction'},
          pillBLeft+C.PILL_VIS, row_y+C.PH/2);
    },{once:true});
  });
}

/* ── SELECT PROJECT ──────────────────────────────────── */
async function selectProject(sel,proj,capX,capY){
  if(!sel||!S.sel||S.projBusy) return;
  S.projBusy=true;
  try{
    if(sel.pillC){
      var oldC=sel.pillC; sel.pillC=null;
      fallPillCOnly(oldC,sel.pillA);
      await sleep(0.08);
    }

    var cLeft=capX-2*C.PR, cTop=capY-C.PH/2;
    /* Pill C colour = the dark cap of the B-list pill that spawned it */
    var pillC=makeCPill(proj.s,cLeft,cTop,proj.capCol);
    document.getElementById('arc').appendChild(pillC);
    sel.pillC=pillC;

    /* Emerge */
    var clipR='inset(0 100% 0 0 round '+C.PR+'px)';
    gsap.set(pillC,{clipPath:clipR});
    await gsap.to(pillC,{clipPath:'inset(0 0% 0 0 round '+C.PR+'px)',
      duration:C.T_EMERGE_C,ease:'power2.inOut'});
    gsap.set(pillC,{clipPath:'none'});

    /* Exact landing from Pill A's actual position */
    var archEl=document.getElementById('archive-area');
    var dr=archEl.getBoundingClientRect();
    var prA=sel.pillA.getBoundingClientRect();
    var aLeft=Math.round(prA.left-dr.left);
    var aTop =Math.round(prA.top -dr.top);
    var exactX=aLeft+C.PILL_A_W-C.PR;
    var dX=exactX-cLeft, dY=aTop-cTop;

    /* FLUIDITY FIX: separate X and Y for Pill C arc.
       Y: smooth fall (power1.in).
       X: right overshoot (power2.out) then magnetic left sweep (power3.in). */
    var yDone=gsap.to(pillC,{y:dY, duration:C.T_ARC_C, ease:'power1.in'});
    gsap.timeline()
      .to(pillC,{x:38,  duration:C.T_ARC_C*0.22, ease:'power2.out'})
      .to(pillC,{x:dX,  duration:C.T_ARC_C*0.78, ease:'power3.in'});
    await yDone;  /* await Y — same total duration as X timeline */

    if(sel&&S.sel&&sel.pillA&&sel.pillC===pillC){
      impactAndLink(sel.pillA,pillC,aLeft,aTop,proj,sel.disc);
    }
  } finally{S.projBusy=false;}
}

/* ── IMPACT AND LINK ─────────────────────────────────── */
function impactAndLink(pillA,pillC,aLeft,aTop,proj,disc){
  gsap.killTweensOf([pillA,pillC]);
  gsap.set(pillA,{left:aLeft,top:aTop,x:0,y:0,
    transformOrigin:'0% 50%',clipPath:'none',opacity:1});
  var cLeft_i=aLeft+C.PILL_A_W-C.PR;
  gsap.set(pillC,{left:cLeft_i,top:aTop,x:0,y:0,
    transformOrigin:'-'+(cLeft_i-aLeft)+'px 50%',clipPath:'none',opacity:1});
  gsap.to([pillA,pillC],{keyframes:[
    {scaleX:0.78,  duration:0.50*0.13, ease:'power3.in'},
    {scaleX:1.015, duration:0.50*0.39, ease:'power1.out'},
    {scaleX:1.0,   duration:0.50*0.48, ease:'sine.inOut'}
  ]});
  /* Show GO pill — user triggers rise by clicking it */
  var pFull=proj?(proj.f||proj.s||''):'';  var cLbl=disc?disc.label.replace(/&amp;/g,'&'):'';
  var _cL=aLeft+C.PILL_A_W-C.PR;
  gsap.delayedCall(0.52,function(){if(S.sel)showGoPill(aTop,aLeft,_cL,pFull,cLbl);});
}

/* ── MAKE PILLS ──────────────────────────────────────── */
function makePill(col,label,left,top,hasCap,width){
  var p=document.createElement('div'); p.className='float-pill';
  p.style.background=col; p.style.width=width+'px';
  p.style.left=left+'px'; p.style.top=top+'px';
  var lbl=document.createElement('span'); lbl.className='fpill-lbl'; lbl.innerHTML=label;
  p.appendChild(lbl);
  if(hasCap){var c=document.createElement('div');c.className='fcap';p.appendChild(c);}
  return p;
}
function makeSubPill(short,full,col,left,top){
  var p=document.createElement('div'); p.className='spill';
  p.style.width=C.SUB_W+'px'; p.style.left=left+'px'; p.style.top=top+'px';
  p.setAttribute('data-full',full);
  /* Cap = darkened body colour — this is also what Pill C will become */
  var capCol=darken(col,0.32);
  p.dataset.col=col;
  p.dataset.capcol=capCol;
  var body=document.createElement('div'); body.className='spill-body'; body.style.background=col;
  var lbl=document.createElement('span'); lbl.className='spill-lbl'; lbl.textContent=short;
  var cap=document.createElement('div'); cap.className='scap';
  cap.style.background=capCol;  /* override generic rgba — use exact dark shade */
  body.appendChild(lbl); body.appendChild(cap); p.appendChild(body);
  var capX=left+C.SUB_W, capY=top+C.PH/2;
  p.addEventListener('click',function(e){
    e.stopPropagation();
    if(S.sel&&!S.projBusy) selectProject(S.sel,{s:short,f:full,capCol:capCol},capX,capY);
  });
  return p;
}
function makeCPill(label,left,top,col){
  var p=document.createElement('div'); p.className='cpill';
  p.style.background=col||getNavPillColors().C||C.COL_C; p.style.width=C.PILL_C_W+'px';
  p.style.left=left+'px'; p.style.top=top+'px';
  var lbl=document.createElement('span'); lbl.className='cpill-lbl'; lbl.textContent=label;
  p.appendChild(lbl);
  return p;
}

/* ── CONTROLS ────────────────────────────────────────── */
function toggleSlow(){
  S.slow=!S.slow;
  gsap.globalTimeline.timeScale(S.slow?0.2:1);
  var btn=document.getElementById('btnSlow');
  btn.textContent='slow-mo: '+(S.slow?'on':'off');
  btn.classList.toggle('on',S.slow);
}

function toggleTheme(){
  /* On the live site, the dial owns theme cycling. Delegate to advTheme()
     which advances the dial through Light → Dark → Fun. The MutationObserver
     in our overrides re-renders the disc nav whenever data-theme changes. */
  if(typeof window.advTheme === 'function') window.advTheme();
  /* Replay menu if it's open so pills get the new theme's colours */
  if(S.menuOpen){ menuClose(); gsap.delayedCall(0.55,menuOpen); }
  if(S.archiveOpen && !S.risen && !S.busy){
    if(S.sel) deselect(S.sel).then(navReset); else navReset();
  }
}

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if(S.archiveOpen) archiveClose();
    else if(S.menuOpen) menuClose();
  }
});


/* ════════════════════════════════════════════════════════════════
   PAGE OVERRIDES  ·  Replace demo-specific behaviour with site-mode.
   Defined AFTER demo functions so they win.
   ════════════════════════════════════════════════════════════════ */

/* The demo's NAV_ITEMS expect 'isArchive' for Full Archive and 'url' for
   page items. The default NAV_ITEMS in demo.js are already set up correctly:
   - Full Archive: isArchive:true → opens archive overlay
   - Portfolio:    url:'portfolio.html'
   - Home:         url:'index.html'
   - About:        url:'about.html'
   - Contact:      url:'contact.html'
   - Shop:         future:true
   We override the pill-click handler in menuOpen so non-archive items navigate. */

/* ── Pill click: capture-phase handler routes to wrapped functions
   The demo's menuOpen adds click handlers that reference LOCAL archiveOpen.
   Those bypass our wrappers, so we intercept in capture phase and call
   window.archiveOpen (our wrapped version) instead. */
(function(){
  document.addEventListener('click', function(e){
    var p = e.target.closest && e.target.closest('.mpill');
    if(!p) return;
    if(p.classList.contains('future')){ e.stopImmediatePropagation(); return; }
    var wrap = document.getElementById('nav-pills-wrap');
    if(!wrap) return;
    var idx = Array.prototype.indexOf.call(wrap.children, p);
    if(idx < 0 || !C || !C.NAV_ITEMS || !C.NAV_ITEMS[idx]) return;
    var item = C.NAV_ITEMS[idx];
    /* In all cases we stop the demo's bubble-phase handler and route ourselves */
    e.stopImmediatePropagation();
    if(item.isArchive){
      window.archiveOpen();
    } else if(item.url){
      window.location.href = item.url;
    }
  }, true);  /* capture phase */
})();


/* ── DIAL ANIMATION HOOKS ─────────────────────────────────────
   The dial (#dial-float) is OUTSIDE the nav element. We need to:
   - Slide it DOWN with the nav when menu opens
   - Move it to bottom-right corner when archive opens
   - Animate it back to centre-top when closing
                                                                  */
function _dialMenuDown(){
  if(window.gsap) gsap.to('#dial-float', {y: NAV_DROP, duration: 0.4, ease: 'power3.inOut'});
}
function _dialMenuUp(){
  if(window.gsap) gsap.to('#dial-float', {y: 0, duration: 0.38, ease: 'power3.inOut'});
}
function _dialToCorner(){
  if(!window.gsap) return;
  /* #dial-float CSS: top:0; left:50%; transform:translate(-50%, 4px); width:80px; height:80px
     Move to bottom-right: target left = innerWidth - 28 - 80 = innerWidth - 108,
                            target top  = innerHeight - 28 - 80 = innerHeight - 108
     Since dial centre is currently at viewport horizontal centre,
     x-offset = (innerWidth - 108) - (innerWidth/2 - 40) = innerWidth/2 - 68
     y-offset = (innerHeight - 108) - 0 = innerHeight - 108                          */
  var targetX = window.innerWidth/2 - 68;
  var targetY = window.innerHeight - 108;
  gsap.to('#dial-float', {x: targetX, y: targetY, duration: 0.5, ease: 'power3.inOut'});
}
function _dialToHome(){
  if(window.gsap) gsap.to('#dial-float', {x: 0, y: 0, duration: 0.5, ease: 'power3.inOut'});
}

/* Demo functions now handle dial animation directly (edited in-place above).
   These window assignments keep the names available for onclick handlers. */
if(typeof menuOpen === 'function')     window.menuOpen     = menuOpen;
if(typeof menuClose === 'function')    window.menuClose    = menuClose;
if(typeof archiveOpen === 'function')  window.archiveOpen  = archiveOpen;
if(typeof archiveClose === 'function') window.archiveClose = archiveClose;


/* ── menuToggle: ensure window points at our wrapped menuOpen/Close ── */
window.menuToggle = function(){
  if(S.menuOpen) window.menuClose();
  else if(!S.archiveOpen) window.menuOpen();
};


/* ── THEME CHANGE → re-render menu pills + disc nav with new colours ── */
new MutationObserver(function(){
  if(!S) return;
  /* Menu open: replay so pills get new theme colours (matches demo behaviour) */
  if(S.menuOpen && typeof menuClose === 'function' && typeof menuOpen === 'function'){
    menuClose();
    gsap.delayedCall(0.55, menuOpen);
  }
  /* Archive open: re-render the disc nav for current selection */
  if(S.archiveOpen && !S.risen && !S.busy && typeof navReset === 'function'){
    if(S.sel && typeof deselect === 'function') deselect(S.sel).then(navReset);
    else navReset();
  }
}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});




/* ── DIAL RESIZE HANDLER ─────────────────────────────────
   When the archive is open, keep the dial pinned to the right wall
   regardless of viewport size. Without this, the dial stays at the
   pixel position set when archive opened, and a smaller window after
   resize would put the dial off-screen or obscure its label.        */
window.addEventListener('resize', function(){
  if(!window.S || !window.S.archiveOpen) return;
  var dial = document.getElementById('dial-float');
  if(!dial || !window.gsap) return;
  var targetLeft = (window.innerWidth - 160) + 'px';
  var targetTop  = window.S.risen ? '0px' : (window.innerHeight - 160) + 'px';
  /* When risen (project view), dial pins to top-right with y:4 to align with
     nav-text baseline. Otherwise sits in bottom-right corner.               */
  if(window.S.risen){
    gsap.set(dial, {left: targetLeft, top: '0px', xPercent: 0, x: 0, y: 4});
  } else {
    gsap.set(dial, {left: targetLeft, top: (window.innerHeight - 108) + 'px',
                    xPercent: 0, x: 0, y: 0});
  }
});

/* Make S a window property so the resize handler can find it */
window.S = S;

/* ── toggleTheme bridge: demo's function cycles theme; we use the site dial ── */
window.toggleTheme = function(){
  if(typeof window.advTheme === 'function') window.advTheme();
};

# Gruff Drury · Pill Nav Integration (v2)

This is the **v2 rebuild** of the menu+archive integration after the first attempt missed the demo's design.

## What changed from v1

**The diagnosis.** Every `gsap.to('#site-nav', …)` call in `nav-system.js` was targeting a selector that doesn't exist on the live site (`.top-nav` is the live nav class, not `#site-nav`). That single mismatch caused all three faults you reported:

- Dropdown beneath the nav → nav wasn't actually moving, so the overlay just poked out below a stationary nav
- Archive didn't animate in from the menu → same selector miss in `archiveOpen`
- Top bar + dial stayed during archive → same selector miss again

**What's now fixed**

1. **Selectors** — all gsap calls target `.top-nav`. Zero `#site-nav` and zero `#archive-dial` references remain.
2. **Demo functions edited in-place** — `menuOpen`, `menuClose`, `archiveOpen`, `archiveClose`, and `moveDial` now animate the live site's `.top-nav` and `#dial-float` directly, matching v24's exact durations (0.4s / 0.38s / 0.5s / 0.42s / 0.65s / 0.9s), easings (power3.inOut throughout), and waypoints (`NAV_DROP='33vh'`, archive `100vh`, off-screen `110vh`, corner offset `108px`).
3. **Overlay height** — `calc(33vh + 44px)` for menu (demo's exact value, so the overlay colour flows BEHIND the lowered nav).
4. **Dial sliding with nav** — added `gsap.to('#dial-float', {y: NAV_DROP})` alongside the nav animation in `menuOpen` (and reverse in `menuClose`), so the dial follows the nav down/up like it did in the demo (where the dial was a child of the nav).
5. **Dial corner movement** — `archiveOpen` animates `#dial-float` to `(innerWidth-108, innerHeight-108)` with `xPercent:0, x:0, y:0` to override the CSS `translate(-50%, 4px)` centering. `archiveClose` returns it with `xPercent:-50, y:4`. Same pattern in `moveDial('pin'|'corner')` for the disc-nav project rise/fall.
6. **Stacking context** — overlays are injected as **siblings of `.top-nav`** instead of at body level, so on the homepage they live inside `#fg` and can be ordered with the nav. `.top-nav { z-index: 9300 !important }` is now scoped to `body.menu-state .top-nav, body.archive-state .top-nav` — it kicks in ONLY while the menu/archive is open, so floating cards on the homepage retain their normal stacking during regular browsing.
7. **Nav transparent during menu/archive** — `body.menu-state` and `body.archive-state` strip the nav's background and backdrop-filter so the menu-overlay colour shows through it (matching demo). Body classes are added/removed by `menuOpen`/`menuClose`/`archiveOpen`/`archiveClose`.
8. **Theme change replays menu** — when you change theme while the menu is open, the MutationObserver closes and reopens the menu so pills get their new colours (matches demo's `toggleTheme` behaviour). Disc nav also re-renders if the archive is open.

## How to test locally (no GitHub upload needed)

The site is pure HTML/CSS/JS — no build step, no fetch, no modules. You can test it by opening the files directly in a browser.

1. Extract this zip to a folder anywhere on your Mac (Downloads is fine).
2. Open `index.html` by double-clicking it (or right-click → Open With → Chrome). The URL will be `file:///Users/gruff…/index.html`.
3. Test the menu and archive there.

If something looks off due to `file://` restrictions (rare — your existing v24 demo runs from `file://` so this should be fine), run a one-line local server instead:

```bash
cd /path/to/extracted/folder
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## What to test

**Menu (works on every page):**
- Click the "menu" button — nav should slide DOWN by 33vh; menu overlay should expand from the top to where the nav now sits; pills should slide in from the left, staggered; dial should slide down with the nav.
- Click "Home" / "About" / "Contact" / "Portfolio" pills — navigates to that page.
- Click "Shop" — does nothing (future).
- Click "menu" again (now reads "close") — everything reverses.
- Change theme via dial while menu open — pills should re-colour.

**Archive (full overlay):**
- From any page, open menu, then click "Full Archive" — pills slide off; nav slides further down off the bottom of the viewport; menu overlay expands to fill viewport; dial moves to bottom-right corner; archive's disc-nav appears.
- Click a pill (A-list discipline) — disc breaks open, B-list pills appear in an arc.
- Click a project pill (B-list) — project screen rises; dial moves to top-right corner ("pin").
- Click "← back to archive" — project lowers; dial returns to bottom-right corner.
- Click "✕ close" — archive closes; nav slides back in from the bottom; dial returns to top-centre; menu overlay collapses.

**Direct archive URL:**
- Navigate to `archive.html` directly — the archive overlay auto-opens with the same animation as if you'd clicked "Full Archive" from the menu.
- The close button on this page navigates back (history) or to `index.html` if there's no history, since this URL has no underlying page to return to.

**Theme dial (untouched):**
- Click the dial — cycles Light → Dark → Fun.
- Click any of the three dots — jumps to that theme.
- Dial functionality is exactly as before in all states — including during menu/archive.

**Homepage parallax (untouched):**
- Scroll through the homepage normally.
- The new menu/archive system only "activates" `z-index: 9300` on the nav while menu/archive is open. During regular browsing, the floating cards (`.pcw.floating` z:500) behave exactly as before, above the resting nav.

## File structure

```
/
├── index.html         # parallax homepage with menu integration
├── portfolio.html     # renamed from old archive.html (the horizontal-scroll columns)
├── about.html         # standard page with menu integration
├── contact.html       # standard page with menu integration
├── archive.html       # NEW: auto-opens the archive overlay; close → back to index.html
├── css/
│   └── main.css       # site styles + demo's menu/archive overlay styles + state transitions
└── js/
    └── nav-system.js  # theme sync, DOM injection, demo's v24 menu/archive (edited), pill click routing
```

## Migration to Claude Code

When you're ready to move further work to Claude Code (real photography, individual project pages, light-mode parallax, fun-mode homepage visuals, about/contact content), the architecture in this v2 is what you'll inherit. Key facts for the handoff:

- `nav-system.js` runs once per page; it injects `#menu-overlay` and `#archive-area` as siblings of `.top-nav` on `DOMContentLoaded`.
- Theme is owned by the existing dial (`#dial-float`), which writes `gd-t` (0/1/2) to localStorage and toggles `data-theme="dark"` on `<html>`. `nav-system.js` bridges this to `data-theme="light"|"dark"|"fun"` (3-value) for the archive's theme CSS.
- All demo animations are direct-edited in `nav-system.js` rather than wrapped — search for `.top-nav` and `#dial-float` in that file to find every animation point.
- `body.menu-state` and `body.archive-state` are the only CSS hooks for "state-aware" styling.

## Known trade-off

When the menu or archive is open, the `.top-nav` z-index is bumped to 9300 via `body.menu-state .top-nav, body.archive-state .top-nav { z-index: 9300 !important }`. This means while the menu or archive is open on the homepage, the nav sits above floating cards (which have z:500). During normal browsing, nothing changes — floating cards retain their original layering. If you ever open the menu or archive WHILE a card is floating, the floating card will go behind the nav for the duration of the menu/archive state. This is unavoidable without restructuring the homepage's stacking, which you asked me not to touch.

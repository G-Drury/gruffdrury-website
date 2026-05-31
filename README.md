# Gruff Drury — Pill Nav Integration

This package adds the new pill-based navigation system to the existing site
without touching the homepage parallax, the portfolio (formerly archive) page
content, or the dial system.

## What changed

### File renames
- `archive.html` → `portfolio.html` (content unchanged; this is the existing
  discipline-based two-axis archive you've been using)

### New files
- `archive.html` — the new disc-nav archive (built from `fun-mode-demo-v24.html`)
- `js/nav-menu.js` — shared menu logic + theme sync between dial and disc-nav

### Modified files
- `index.html` — nav-right now has `<button id="btn-menu">menu</button>` instead
  of the Work/About/Contact links. Old `#w-overlay` markup removed. Dial
  IIFE, parallax, cards, and everything else untouched.
- `portfolio.html` — same nav swap. All page content preserved verbatim.
- `about.html`, `contact.html` — same nav swap.
- `css/main.css` — appended `.mpill`, `#menu-overlay`, `#btn-menu` styles.

## How it works

### Dial + menu coexistence
The dial owns the theme state via `localStorage['gd-t']` (0/1/2). It sets
`data-theme="dark"` for state 1 and removes the attribute for states 0/2.

`nav-menu.js` reads `gd-t` and writes `data-theme` as `light` / `dark` / `fun`
on every load and whenever the dial mutates the attribute. This keeps the
disc-nav archive's theme-aware colours in sync without any change to the dial
IIFE. The sync is guarded against MutationObserver loops by only setting the
attribute when its value would actually change.

### Pill menu
Clicking `#btn-menu` calls `menuToggle()` from `nav-menu.js`. The menu DOM
(`#menu-overlay`, `#menu-list`) is injected lazily on first open so pages
don't need any extra markup beyond the trigger button.

Pill colours come from `NAV_ITEMS` in `nav-menu.js` — each entry has
`fun`/`dark`/`light` hex values. Pills repaint live when the theme changes.

### Archive page
`archive.html` is a self-contained page hosting the disc-nav from
`fun-mode-demo-v24.html`. Differences from the demo:
- Site nav (G.Drury + dial + menu) at top instead of demo's placeholder
- Archive area sits below the nav (`top: 44px`) instead of full-viewport overlay
- `archiveOpen` / `archiveClose` overridden — the archive is always open on
  this page; `close ✕` navigates back via `history.back()`
- Demo's own menu logic stubbed out; `nav-menu.js` owns the menu
- `toggleTheme` bridges to the dial's `advTheme()`

The demo JS is kept verbatim. All differences are appended at the end of the
script block as overrides (last function declaration wins in JavaScript).

## Deployment

1. Drop the entire contents of this folder into your repo, preserving the
   `css/` and `js/` subdirectories.
2. Commit and push. GitHub Pages will rebuild in ~60s.
3. Hard refresh (Cmd-Shift-R) to bypass cache.

## Notes for Claude Code handover

When you move to Claude Code for longer file/media work, the priorities are:
- Real photography to replace placeholder colour blocks across the site
- Individual project pages (`projects/escape.html` etc.) — link from sub-pills
  in the new archive
- Light mode styling for the homepage parallax (currently dark-first)
- Fun mode visual design for index.html (currently uses light-mode visuals)
- About and Contact page content

The disc-nav data lives in `C.DISCS` inside `archive.html` (around line 580).
Adding a project = adding an entry to one of the `proj` arrays.

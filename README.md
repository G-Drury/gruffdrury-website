# Gruff Drury · Pill Nav Integration (v2.1)

This version fixes the bugs reported in v2 testing.

## Fixes since v2

1. **Homepage content was hidden / menu button didn't work** — root cause was three orphan `</div>` tags left over from incomplete work-overlay removal. They prematurely closed `#fg` and `#site`, dumping all the homepage sections (hero, projects, collaborators, manifesto, thinking, about) outside the parallax scroll container. The fixed-position `#site` then visually masked them. Now removed properly via bracket-counting (DOM is exactly balanced: 114 `<div>` / 114 `</div>`).

2. **Dial label cut off at viewport edge during archive** — dial container is 80px wide, plus an 8px gap plus the "LIGHT"/"DARK"/"FUN" label (up to ~39px) to its right. Old corner position `left: innerWidth - 108` put the label off-screen. New corner position `left: innerWidth - 160` gives the label ~33px clearance from the right edge of the viewport at all themes.

3. **Dial position survived window resize** — added a resize handler that re-pins the dial to its corner (or pin position during a project view) whenever the viewport changes while the archive is open. The dial now stays at a fixed offset from the right and bottom walls regardless of window size.

4. **Dial returned 4px too high after menu close** — the dial's CSS uses `transform: translate(-50%, 4px)`. menuClose was resetting `y` to 0 instead of 4. The dial now returns to its exact CSS default position.

## Testing locally

The same as before — extract the zip and double-click `index.html`. No web server needed. If you've already extracted v2, just replace the four changed files:

- `index.html` (47.6KB → balanced DOM, homepage content restored)
- `js/nav-system.js` (dial corner/pin offset 108 → 160, added resize handler, fixed 4px return)

The other files (`css/main.css`, `about.html`, `contact.html`, `portfolio.html`, `archive.html`) are unchanged from v2.

## What to verify on the homepage

- Parallax background ("Gruff Drury", "Escape", etc. labels) visible behind the foreground
- Hero section, project cards, collaborators bar, manifesto, thinking, about sections all present and scrolling works
- "menu" button in top-right opens the pill menu with nav sliding down

## What to verify in archive view

- Open menu, click "Full Archive"
- Dial lands at bottom-right corner with all of "FUN"/"LIGHT"/"DARK" label readable
- Resize the window narrower and wider — dial repositions to stay at the same distance from the right wall
- Click any A-list pill, then any B-list pill — dial pins to top-right; label still readable
- Click "← back to archive" — dial returns to bottom-right corner, still readable
- Click ✕ close — dial smoothly returns to top centre

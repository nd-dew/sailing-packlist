# Spec: Keyboard Navigation & Shortcuts (desktop)

Status: draft · Scope: desktop / physical keyboard only. Mobile gestures are untouched.

## 1. Goal

Give PC users the same speed that mobile users get from swipes: move through the
list and pack, hide, re-bag and open items without the mouse. Also fix the
undo shortcut so it no longer steals Ctrl+Z from text fields.

## 2. Concepts

### 2.1 Focused item
- A single app-level `focusedItemId: string | null` lives in `PacklistContext`.
- The focused row gets the class `kb-focused`, a visible ring in the theme's accent
  color that works in both light and dark themes.
- This is **not** DOM focus. Rows do not become tab stops. The ring is a visual
  cursor, so that typing elsewhere never moves it.
- **Ring visibility:** the ring shows only in "keyboard mode". Keyboard mode starts
  with the first navigation/action key press. It ends on `mousemove` past a small
  threshold or on any `touchstart`; then the ring hides, but `focusedItemId` is kept.
- **Mouse interplay:** clicking a row (its name or checkbox) sets `focusedItemId` to
  that row, so keyboard use carries on from where the mouse was.

### 2.2 Navigable rows
- Every rendered `ItemRow` `<li>` gets `data-item-id={item.id}`.
- Navigation reads rows **from the DOM** at key-press time, one ordered list per
  `.checklist-column`:
  ```ts
  const columns = [...document.querySelectorAll('.checklist-grid > .checklist-column')]
    .map(col => [...col.querySelectorAll<HTMLElement>('li.list-item[data-item-id]')]);
  ```
  - This automatically respects the column balancing in `App.tsx`, hidden items,
    the priority `filter`, `itemViewFilter` (which unrolls sub-items) and empty
    categories. Nothing is duplicated.
  - Rows inside modals (for example the sub-item list in `ItemModal`) are excluded
    because the query is scoped to `.checklist-grid`.
  - Grayed-out rows from "show hidden" mode (`li.grayed-out`) are **excluded in v1**.
    They don't render through `ItemRow` and have different actions.
- **Single-column mode:** below 850px the grid collapses to one column visually, but
  the DOM still has two `.checklist-column` elements. Detect it with
  `matchMedia('(max-width: 850px)')`. In that mode, concatenate the two columns into
  one list, so ↓ at the end of column 1 continues into column 2, and treat ←/→ as
  no-ops.

## 3. Key map

### 3.1 Global (list view: no modal, menu or overlay open)

| Key | Action | Notes |
|---|---|---|
| `↓` / `j` | Focus the next row in the same column | Crosses category boundaries. Stops at the end of the column (no wrap). |
| `↑` / `k` | Focus the previous row in the same column | Stops at the top. |
| `→` / `l` | Focus the row in the **right** column closest to the current row's vertical center | Compares `getBoundingClientRect()` centers. No-op if already in the right column or in single-column mode. |
| `←` / `h` | Same, toward the **left** column | |
| `Home` / `End` | First / last row in the current column | |
| `Space` | Pack / unpack the focused item | Item with sub-items → `toggleParentItem(id, !isParentChecked)`. Otherwise → `toggleCheck(id)`. Plays `playPopSound('click')`. |
| `x` | Pack & hide (same as swipe right) | Same logic as `ItemRow` `handleTouchEnd` with dx > 0: pack if unpacked (parent → `toggleParentItem(id, true)`), then `hideItem(id)`. |
| `b` | Next bag (same as swipe left) | `cycleLuggage(id, 1)` + `playPopSound('pop')`. |
| `Shift+B` | Previous bag | `cycleLuggage(id, -1)`. |
| `Enter` / `e` | Open the item modal | `setSelectedItemId(id)`. |
| `n` | New item in the focused item's category, or the first visible category if nothing is focused | `handleCreateItem(catId)`. Opens `ItemModal` with the name autofocused. |
| `p` | Toggle the "packed" filter | Same as clicking the green header stat. |
| `u` | Toggle the "unpacked" filter | Same as clicking the red header stat. |
| `[` | Open the Settings menu (left) | `setActiveMenu('settings')`. |
| `]` | Open the Baggage menu (right) | `setActiveMenu('baggage')`. |
| `?` | Toggle the shortcut cheat sheet | See §5. |
| `Esc` | Clear `itemViewFilter` if one is set; otherwise clear the focus ring | |
| `Ctrl/⌘+Z` | Undo | Fixed behavior, see §4. |
| `Ctrl/⌘+Y`, `Ctrl/⌘+Shift+Z` | Redo | |

**First key press with nothing focused:** any navigation key focuses the first row
whose top is below the fixed header, in the left column (or the single column). The
key's own action is not applied on this press. Action keys do nothing when no row
is focused.

**Repeat:** navigation keys honour key repeat (holding ↓ scrolls through the list).
Action keys ignore `e.repeat` so that holding Space doesn't toggle repeatedly.

### 3.2 When a modal or menu is open

| Context | Key | Action |
|---|---|---|
| `ItemModal` | `Esc` | Close, using the same path as ✕ (`closeItemModal`, which deletes the item if its name is empty). |
| `ItemModal` name input | `Enter` | Close (save is implicit, since edits are live). |
| `ItemModal` name input | `Ctrl/⌘+Enter` | Close, then `handleCreateItem` in the same category, for fast bulk entry. |
| `CategoryModal`, `BagModal` | `Esc` | Close. |
| Settings / Baggage menu | `Esc` | `setActiveMenu('main')`. |
| Settings menu | `]` | Back to main. |
| Baggage menu | `[` | Back to main. |
| Share / preset confirm cards | `Esc` | Cancel. `Enter` is **not** bound, because these actions destroy data. |
| Any of the above | anything else | List shortcuts are disabled while something is open. |

## 4. Guards & fixes

1. **Typing guard.** Skip every shortcut except `Esc` and the modal-specific
   `Enter` bindings when `e.target` is an `input`, `textarea`, `select` or
   `[contenteditable]`.
   - **Bug fix:** today the Ctrl+Z/Y handler in `PacklistContext.tsx` (~L442) runs
     inside text fields. Undoing a typo in an item name currently undoes the last
     *app* action instead. Move that handler under the same guard.
2. **Modifier guard.** Ignore single-key shortcuts when Ctrl, Meta or Alt is held,
   so browser shortcuts like Ctrl+N or Ctrl+B keep working. Shift is allowed only
   where it's listed.
3. **IME.** Ignore events with `e.isComposing`.
4. **preventDefault** only for keys that were handled, notably Space and the arrow
   keys, which would otherwise scroll the page.
5. **Stale focus.** If the focused row is no longer in the DOM after an action
   (hidden, or filtered out by packing while the "unpacked" filter is on), focus
   moves to the row that was **next** in the same column, or the previous one if it
   was last. Compute the neighbour *before* dispatching the action. This makes
   `x x x` move down the list naturally.

## 5. Visual details

- **Scrolling:** keep the focused row visible with
  `el.scrollIntoView({ block: 'nearest' })`. Add `scroll-margin-top` to `.list-item`
  equal to the fixed header height (~60px), so rows don't end up under the header.
  The header's auto-hide on scroll is unchanged.
- **Particles:** `toggleCheck` and `toggleParentItem` take the particle origin from
  `clientX/clientY` on the event. For keyboard actions, pass a synthetic
  `{ clientX, clientY }` built from the row checkbox's bounding rect, so the
  "fly to counter" animation still plays.
- **Swipe-hint flash (optional):** on `x` / `b`, briefly (~150ms) apply the
  `bg-pack` / `bg-cycle` background to the row, so the effect matches the mobile
  gesture.
- **Cheat sheet (`?`):** a centered card in the style of `share-confirm-card`, with
  a two-column table of the keys in §3. It closes on `?` or `Esc`, or by clicking
  outside it. A small "Press ? for keyboard shortcuts" hint in the footer is shown
  only under `@media (hover: hover) and (pointer: fine)`.
- **Tooltips:** add shortcut hints to the existing `title`s, for example
  "Undo (Ctrl+Z)", "Baggage (])", "Filter by Packed (P)".

## 6. Implementation outline

- `src/hooks/useKeyboardShortcuts.ts`: one `keydown` listener on `window`, mounted
  once in `AppContent`. It reads context state and dispatches existing actions. All
  the actions it needs already exist in the context.
- `src/utils/keyboardNav.ts`: pure helpers (`getColumns()`, `nextInColumn()`,
  `nearestInOtherColumn()`, `firstVisibleRow()`) so they can be tested apart from
  the hook.
- `PacklistContext`: add `focusedItemId`, `setFocusedItemId`, `keyboardMode`, and
  `showShortcuts` with its setter. Move the undo/redo listener into the new hook.
- `ItemRow`: add `data-item-id`, set the `kb-focused` class, and call
  `setFocusedItemId` on click.
- Modals and menus: add the Esc and Enter handling from §3.2. This could be a small
  `useEscape(handler, active)` helper.
- `App.css`: `.list-item.kb-focused` ring (light and dark), `scroll-margin-top`,
  and the cheat-sheet styles.

## 7. Tests (Playwright, `tests/keyboard.spec.ts`, desktop viewport ≥ 1000px)

- ↓/↑ move within a column and cross category boundaries. They stop at the ends.
- →/← jump to the row in the other column at the nearest vertical position.
- Narrow viewport (≤ 850px): ↓ continues from column 1 into column 2, and ←/→ do
  nothing.
- Space toggles the packed state, and the header counters update.
- `x` packs and hides the row, and focus moves to the next row.
- `b` / `Shift+B` change the row's luggage badge.
- Enter opens `ItemModal`. Esc closes it, and Esc on an empty-named new item deletes it.
- `n` creates an item in the focused row's category, with the modal open and the
  name focused.
- Ctrl+Z inside the item-name input does **not** undo the last checkbox toggle.
- With the settings menu open, Space and the arrow keys do not affect the list.
- `?` opens and closes the cheat sheet.

## 8. Out of scope (v1)

- Keyboard navigation of hidden (grayed-out) rows and of sub-items inside `ItemModal`.
- Search (`/`), drag & drop, a docked baggage panel, hover action buttons. These are
  tracked as separate follow-ups.
- User-configurable keybindings.

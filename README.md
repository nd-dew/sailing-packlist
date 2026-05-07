# PackList

Overengineered tool to list stuff to pack when going sailing. 
This repository is made public to allow people to contribute new pack lists.

## How to contribute a new pack list

Pack lists are driven by YAML files. To add a new one:

1. Create a new `.yaml` file in `src/presets/` (e.g., `caribbean_cruise.yaml`). Use `src/presets/med_blueward_26.yaml` as a reference.
2. That's it. The app will automatically discover and add it to the settings menu.

## Development

```bash
npm install
npm run dev
npm run test  # Run Playwright E2E tests
npm run build
```

## Roadmap

### Completed ✅
- [x] **Dynamic Header Stats**: The main "PackList" title transitions into live progress indicators (Packed vs Unpacked) after load.
- [x] **Quick Filters**: Clicking header stats toggles a filtered view with a subtle glowing edge frame.
- [x] **Style Checked Items**: Checked items are distinctly styled with green highlights.
- [x] **Save/Export State to File**: Settings menu allows exporting and importing the entire packing list state to/from a YAML file.
- [x] **Sub-Items**: Complex items (like "Tech Kit") can contain nested sub-items that can be individually packed, hidden, and tracked.
- [x] **Category & Bag Modals**: Aggregate bulk actions (Pack All, Hide All, Assign Bag) are available by tapping category titles or editing bags.
- [x] **Luggage Management**: Assign items to multiple bags, complete with custom styleable SVG micro-icons (e.g., Duffel, Backpack).
- [x] **Action History & Undo/Redo**: Full undo/redo stack and visible action history in the settings menu.
- [x] **Dark Theme**: Support for Light/Dark mode, automatically inherited from system preferences or toggled manually.
- [x] **Added Missing Essentials**: Driving License, Diving License, Credit Card, etc.
- [x] **Playwright Test Suite**: Fast, reliable E2E tests covering core gestures and UI.

### Planned 🚀
- [ ] **Shareable List States**: Generate a unique URL to save and share the current state of a packing list, including checked items and custom additions.
- [ ] **Live Weather Integration**: Fetch 7-day marine forecasts (temperature, wind, waves) using an open API (like Open-Meteo) based on destination and dates.
- [ ] **Dynamic Packing Rules**: Automatically adjust suggested items or quantities based on the forecast. Extend YAML items with rules (e.g., `min_temp: 15`) to dynamically flag items for the user.


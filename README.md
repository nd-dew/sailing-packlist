# ⛵ PackList: The Ultimate Sailing Companion

A professional, mobile-optimized Progressive Web App (PWA) for sailors to manage their packing lists, driven by customizable YAML presets. Designed for the Belgian Sailing Community and beyond.

## 🚀 Features
- **Offline First:** PWA support means it works at sea without a connection.
- **Smart History:** Full Undo/Redo (Ctrl+Z/Y) with an action log.
- **Swipe Gestures:** Right-swipe to pack/hide, Left-swipe to cycle luggage.
- **YAML Driven:** Fully customizable categories, items, and warnings via simple YAML files.
- **Luggage Management:** Track multiple bags with visual badges and photo uploads.

## 🛠️ Architecture
The project is built with **React (TypeScript) + Vite** and follows a modular architecture:
- `src/context/`: Global state management and business logic.
- `src/presets/`: YAML files containing the packing list templates.
- `src/components/`: Isolated, reusable UI components (Layout, Core, Modals).
- `src/types/`: Centralized TypeScript interfaces.

## 🤝 Contributing New Presets
We encourage sailors to contribute their own packing lists for different regions (e.g., Caribbean, North Sea, Baltic).

### How to add a new PackList:
1. Create a new `.yaml` file in `src/presets/` (e.g., `caribbean_cruise.yaml`).
2. Follow the structure of `med_blueward_26.yaml`:
   ```yaml
   id: "my_unique_id"
   name: "Display Name"
   showers: 7
   warnings: [...]
   luggages: [...]
   categories: [...]
   ```
3. Register your new preset in `src/context/PacklistContext.tsx`:
   ```typescript
   import myNewPresetRaw from '../presets/my_new_preset.yaml?raw';
   // ... add to the PRESETS object
   ```
4. Add it to the selection dropdown in `src/components/layout/SettingsMenu.tsx`.

## 📦 Development
```bash
npm install
npm run dev    # Start local development server
npm run build  # Generate production-ready PWA build
```

## 📜 License
MIT

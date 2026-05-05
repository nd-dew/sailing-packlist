# Contributing to BSC Packing List

Thank you for your interest in contributing to the Belgian Sailing Community (BSC) Packing List application! 

This app uses a highly flexible, data-driven preset system. This means non-developers can easily add new cruise templates, custom luggage structures, and default packing items just by writing a simple text file.

## Adding a New Cruise Preset

All default lists and templates are defined in easy-to-read YAML files located in `src/presets/`.

### Step 1: Create a YAML File
Create a new file in `src/presets/` named after your cruise, for example: `north_sea_26.yaml`.

### Step 2: Define the Structure
Use the following format (you can copy the structure from `med_blueward_26.yaml` to get started):

```yaml
id: "north_sea_26"
name: "North Sea Explorer '26"

warnings:
  - id: "warn_1"
    text: "Heavy weather expected. Bring your best sea legs."

luggages:
  - id: "lug_1"
    name: "Main Duffel Bag"
    description: "Standard 80L duffel."
  - id: "lug_2"
    name: "Day Backpack"

categories:
  - id: "tough"
    title: "Get Dressed: Tough Weather"
    priority: "must-have" # options: "must-have", "should-have", "nice-to-have"
    items:
      - id: "out_drysuit"
        name: "Drysuit"
        description: "Mandatory for North Sea crossings."
        defaultBag: "lug_1"
      - id: "docs_logbook"
        name: "Printed Sailing Logbook"
        captainOnly: true # This hides the item for standard crew members
        defaultBag: "lug_2"
```

### Supported Item Properties:
*   `id`: Unique identifier (string).
*   `name`: Display name (string).
*   `description`: (Optional) Advice or warning text.
*   `qty`: (Optional) Default number.
*   `captainOnly`: (Optional) Set to `true` to restrict this item to the Captain preset.
*   `defaultBag`: (Optional) The `id` of the luggage this item should automatically be assigned to.

### Step 3: Register the Preset
Once your YAML file is ready, open `src/App.tsx` and add your preset to the `PRESETS` registry near the top of the file:

```typescript
import northSeaRaw from './presets/north_sea_26.yaml?raw';

// ...
const PRESETS: Record<string, any> = {
  'med_blueward_26': parse(medBlueward26Raw),
  'north_sea_26': parse(northSeaRaw) // <--- Add it here!
};
```

Your preset will now automatically appear in the Settings dropdown menu!

## Development
If you are contributing code (React/TypeScript):
1. `npm install`
2. `npm run dev`
3. Please ensure you do not break the mobile-first styling or the gesture (swipe) functionality. Ensure changes are tested on a mobile viewport.
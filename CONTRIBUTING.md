# Contributing to BSC Packing List

Thank you for your interest in contributing to the Belgian Sailing Community (BSC) Packing List application! 

This app uses a highly flexible, data-driven preset system. This means non-developers can easily add new cruise templates, custom luggage structures, and default packing items just by writing a simple text file.

## Adding a New Cruise Preset

All default lists and templates are defined in easy-to-read YAML files located in `src/presets/`.

### Easiest: build it in the app
1. In the app, tap the list title at the top and start a new packlist (an **Empty packlist**, or from a preset).
2. Edit the list until it's right: add, remove and drag items, set bags, add notes and sub-items.
3. Open the title menu again and tap **⬇ Export**. You get a `.yaml` file in the preset format.
4. Put that file in `src/presets/` (rename it and its `id` if you like) and open a pull request.

### By hand

### Step 1: Create a YAML File
Create a new file in `src/presets/` named after your cruise, for example: `north_sea_26.yaml`.

### Step 2: Define the Structure
Use the following format (you can copy the structure from `med_blueward_26.yaml` to get started):

```yaml
id: "north_sea_26"            # must match the file name
name: "North Sea Explorer '26"
description: "Week-long crossing, early June."  # shown under the title
showers: 7                    # expected showers: drives the underwear / socks / t-shirt counts
# hideShowers: true           # hide the showers setting (e.g. day sails)
# disableRoles: true          # one list for everyone, no crew / captain choice

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
*   `subItems`: (Optional) A list of `{ id, name }` items packed as part of this one (e.g. the chargers in "Charging & Cables").

### Step 3: That's it
Presets are picked up automatically from `src/presets/`, nothing needs registering. Yours appears in the title menu under **New packlist**, and has its own link: `/sailing-packlist/north_sea_26`.

## Development
If you are contributing code (React/TypeScript):
1. `npm install`
2. `npm run dev`
3. Please ensure you do not break the mobile-first styling or the gesture (swipe) functionality. Ensure changes are tested on a mobile viewport.
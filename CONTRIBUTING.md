# Contributing to BSC Packing List

Thank you for your interest in contributing to the Belgian Sailing Community (BSC) Packing List application! 

This app uses a highly flexible, data-driven preset system. This means non-developers can easily add new cruise templates, custom luggage structures, and default packing items just by writing a simple text file.

## Adding a New Cruise Preset

All default lists and templates are defined in easy-to-read YAML files located in `src/presets/`.

Presets are **packlist files**: the same format the app's **Export** writes and **Import** reads. A file says which version of the format it uses (`schema: 1`).

### Easiest: build it in the app
1. In the app, tap the list title at the top and start a new packlist (an **Empty packlist**, or from a preset).
2. Edit the list until it's right: add, remove and drag items, set bags, add notes and sub-items.
3. Open the title menu again and tap **⬇ Export**. You get a packlist file (`.yaml`).
4. Put that file in `src/presets/` (the file name becomes the preset's id) and open a pull request. Anything you ticked in the app is saved in the file as `packed:`; presets ignore it.

### By hand

#### Step 1: Create a YAML file
Create a new file in `src/presets/` named after your cruise, for example `north_sea_26.yaml`. The file name is the preset's id.

#### Step 2: Write the list
Use the following format (or copy `med_blueward_26.yaml` to get started):

```yaml
schema: 1                     # format version, always first
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
    icon: "duffel"            # duffel, backpack, briefcase, on_person
    color: "#0074D9"
  - id: "lug_2"
    name: "Day Backpack"
    icon: "backpack"

categories:
  - id: "tough"
    title: "🧥 Tough weather"
    priority: "must-have"     # must-have, should-have, nice-to-have (or leave it out)
    items:
      - id: "out_drysuit"
        name: "Drysuit"
        description: "Mandatory for North Sea crossings."
        bag: "lug_1"
      - id: "docs_logbook"
        name: "Printed Sailing Logbook"
        captainOnly: true     # only in the captain's list
        bag: "lug_2"
```

#### Item properties
*   `id`: unique identifier, across the whole file.
*   `name`: what's shown.
*   `description`: (optional) a note: advice, which one to bring…
*   `qty`: (optional) how many.
*   `bag`: (optional) the `id` of the bag it goes in. Leave it out for no bag.
*   `captainOnly`: (optional) `true` to show it only in the captain's list.
*   `subItems`: (optional) a list of `{ id, name }` packed as part of this item (e.g. the chargers in "Charging & Cables").

#### Step 3: That's it
Presets are picked up automatically from `src/presets/`, nothing needs registering. Yours appears in the title menu under **Start a new packlist**, and has its own link: `/sailing-packlist/north_sea_26`. If a preset has a mistake (a missing name, an id used twice…), it is left out and the browser console says why.

## Changing the file format

Old files must keep loading: presets in forks, files people exported months ago. So the format is versioned and upgraded on the way in (`src/utils/packFile.ts`):

1. Bump `CURRENT_SCHEMA` and change the types to the new shape.
2. Add `MIGRATIONS[n]`: a function that turns a version-`n` document into version `n + 1`.
3. Keep a sample of the old version in `tests/fixtures/` (like `packlist-schema-1.yaml`) with a test that imports it.

Every file is upgraded step by step to the current version before the app looks at it, so the rest of the code only knows the current format. Convert the presets in `src/presets/` to the new version in the same change.

## Development
If you are contributing code (React/TypeScript):
1. `npm install`
2. `npm run dev`
3. Please ensure you do not break the mobile-first styling or the gesture (swipe) functionality. Ensure changes are tested on a mobile viewport.
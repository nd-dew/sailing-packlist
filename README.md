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
npm run build
```

## Roadmap

- **Dynamic Header Stats**: The main "PackList" title transitions into a live progress indicator (e.g., "15/42 Packed") a second after the app loads.
- **Shareable List States**: Generate a unique URL to save and share the current state of a packing list, including checked items and custom additions.
- **Live Weather Integration**: Fetch 7-day marine forecasts (temperature, wind, waves) using an open API (like Open-Meteo) based on destination and dates.
- **Dynamic Packing Rules**: Automatically adjust suggested items or quantities based on the forecast. Extend YAML items with rules (e.g., `min_temp: 15`) to dynamically flag items for the user.
- Provide some global visible stats
    - maybe like green 3 means done red 18, means still todo
    - or maybe clicking on stat button will change it's display? (percentage done, left to be done, done ?)
    - maybe put that on the top bar instead of the PackList
- Style checked items as green

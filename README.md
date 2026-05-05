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

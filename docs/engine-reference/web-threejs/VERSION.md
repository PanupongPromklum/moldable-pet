# Engine Reference — Web (Three.js)

| Item | Pinned |
|---|---|
| Runtime | Mobile web browsers (Safari iOS 16+, Chrome Android), portrait, served over https |
| Renderer | Three.js **0.162.0** (ES modules via import map from `https://cdn.jsdelivr.net/npm/three@0.162.0/`) |
| Addons used | `RoomEnvironment`, `BufferGeometryUtils.mergeVertices`, `DecalGeometry` (from `three/addons/`) |
| Hand tracking (optional) | `@mediapipe/tasks-vision@0.10.14` Hand Landmarker (from the prototype) |
| Language | JavaScript (ES2020 modules), no build step yet |
| Hosting | GitHub Pages |

Before using a Three.js API, check it exists in 0.162 (the prototype in `prototypes/squish-pet/index.html` is known to work). Upgrade only through an ADR (`/architecture-decision`).

# Technical Preferences

<!-- project.yaml at the repo root is the machine-readable source of truth for
     engine, specialists, naming, performance, platform, and testing.framework.
     This file is the human-readable LEGACY FALLBACK: agents and skills resolve
     each key from project.yaml first and fall back here only when the
     project.yaml key is absent. /setup-engine dual-writes both.
     Forbidden patterns and allowed libraries are NOT migrated — they live only
     in this file. Populated by /setup-engine; updated as decisions are made. -->

## Engine & Language

- **Engine**: Web — Three.js 0.162.0
- **Language**: JavaScript (ES2020 modules)
- **Rendering**: WebGL2 via Three.js, MeshPhysicalMaterial (sheen) for characters, matte MeshStandardMaterial for props, NeutralToneMapping
- **Physics**: none (custom spring/soft-body deformers from the prototype)

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: Mobile web (iOS Safari 16+, Android Chrome) and desktop browsers
- **Input Methods**: Touch, mouse, webcam hand tracking (optional), microphone (talk-back)
- **Primary Input**: Touch on phones, mouse on desktop
- **Gamepad Support**: None
- **Touch Support**: Full
- **Platform Notes**: Portrait 390×844 reference, desktop ≥1280 wide must also work; safe-area insets; camera/mic need https and a user tap; in-app browsers (LINE, Facebook) may block camera/mic

## Naming Conventions

- **Classes**: PascalCase
- **Variables**: camelCase
- **Signals/Events**: kebab-case event names (e.g. `need-changed`)
- **Files**: kebab-case `.js` modules
- **Scenes/Prefabs**: rooms as modules in `src/rooms/`
- **Constants**: UPPER_SNAKE_CASE

## Performance Budgets

- **Target Framerate**: 60 fps (30 fps floor on older phones)
- **Frame Budget**: 16.6 ms
- **Draw Calls**: ≤ 60 per room
- **Memory Ceiling**: 250 MB

## Testing

- **Framework**: Playwright smoke test at 390×844 and 1280×800; pure-logic tests later
- **Minimum Coverage**: needs, save/load and economy formulas
- **Required Tests**: Balance formulas, gameplay systems, networking (if applicable)

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- [None configured yet — add as architectural decisions are made]

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- three@0.162.0 (CDN import map)
- @mediapipe/tasks-vision@0.10.14 (optional hand tracking)

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

- **Primary**: [TO BE CONFIGURED — run /setup-engine]
- **Language/Code Specialist**: [TO BE CONFIGURED]
- **Shader Specialist**: [TO BE CONFIGURED]
- **UI Specialist**: [TO BE CONFIGURED]
- **Additional Specialists**: [TO BE CONFIGURED]
- **Routing Notes**: [TO BE CONFIGURED]

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (primary language) | [TO BE CONFIGURED] |
| Shader / material files | [TO BE CONFIGURED] |
| UI / screen files | [TO BE CONFIGURED] |
| Scene / prefab / level files | [TO BE CONFIGURED] |
| Native extension / plugin files | [TO BE CONFIGURED] |
| General architecture review | Primary |

- **Code**: wire (method: gameplay-programmer)
- **UI**: glaze → ui-programmer
- **Shader / materials**: clay (method: technical-artist)

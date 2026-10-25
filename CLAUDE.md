# Moldable Pet — Moldable Studio's virtual pet game

A My Talking Tom–style pet game starring the Moldable blob characters. Mobile web
first (portrait, https) and playable on desktop with a mouse, Three.js, clay-style
3D rooms built in code, light pastel theme, in-game HUD with no side panel, optional
webcam hand interaction. Thai is the main language.

**Sources of truth (read before work):**
- `design/gdd/game-concept.md` — scope, decisions, needs, rooms, HUD, roadmap
- `docs/architecture/module-contracts.md` — how the code modules talk to each other
- `design/art/moldable-design.md` — Moldable brand guideline. Never guess a value it lacks; ask.
- `design/narrative/character-bible.md` — the characters
- Figma design system (read only — never edit the main DS file): https://www.figma.com/design/8XeyTmHdA7oBI78xAahgsv/Moldable-Design-system

**Team leads (call by name):** `kiln` producer · `loop` game design · `clay` characters ·
`prop` rooms & props · `glaze` UI/UX · `wire` code · `echo` audio. They use the
specialist agents below as their method. See `MOLDABLE-README.md` (Thai).

**Fixed rules:** Prompt for Thai, Poppins for English/numbers · brand gradient is the
single accent · primary button #5A68B5 · muted pink for bad/low states, never bright
red/green · soft motion, no hard bounce · the pet never dies or gets sick · gameplay
numbers live in `assets/data/*.json` · only free tools and services unless the user
approves spending.

---

# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: Web — Three.js 0.162 (ES modules via import map, no build step yet)
- **Language**: JavaScript (ES2020 modules)
- **Version Control**: Git with trunk-based development
- **Build System**: none (static files). Hosting: GitHub Pages
- **Asset Pipeline**: procedural clay props in code; outside .glb only per `design/art/asset-style-sheet.md`

> **Note**: This project is Web/Three.js. The Godot/Unity/Unreal specialist agents were
> moved to `docs/ccgs-unused-agents/`. Code root is `src/`, entry `index.html`.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line below is engine-specific. /setup-engine
     rewrites it to @docs/engine-reference/<engine>/VERSION.md for the chosen
     engine, so a Unity or Unreal project stops loading the Godot reference every
     session. It defaults to Godot (the template's example engine); skills that
     need the pinned version read docs/engine-reference/<engine>/VERSION.md on
     demand regardless of this import. -->
@docs/engine-reference/web-threejs/VERSION.md


## Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** Concept and engine are already set. Read
> `production/session-state/active.md`, then run `/help` or ask `kiln`.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)

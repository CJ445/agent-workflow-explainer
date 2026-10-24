# Agent Workflow Explainer

![Hero: a live Chat Trigger → AI Agent → Gemini canvas](docs/screenshots/desktop-01-hero.png)

## A tour

The page is a build guide. The left column gives each step (a numbered click path in n8n, or a test to run). The right side holds a sticky stage with the workflow canvas, a simulated chat, and the matching node configuration pane. Every scroll step is labelled **Build** or **Test**.

| | |
|---|---|
| ![Setup](docs/screenshots/desktop-02-setup.png) **Setup.** n8n workspace and Gemini API key. | ![Agent config](docs/screenshots/desktop-03-agent-config.png) **Phase 01.** Chat Trigger, AI Agent, system message. |
| ![Memory test](docs/screenshots/desktop-04-memory-test.png) **Phase 02.** Simple Memory, and a test that shows what is stored. | ![Sheets tool](docs/screenshots/desktop-05-sheets-tool.png) **Phase 03.** The `get_board_members` Google Sheets tool. |
| ![Tool call](docs/screenshots/desktop-06-tool-call.png) **Phase 03 test.** The model chooses the tool, then n8n runs it. | ![Approval](docs/screenshots/desktop-07-email-approval.png) **Phase 04 test.** The draft → revised → approval → sent loop. |
| ![Sent](docs/screenshots/desktop-08-email-sent.png) **Phase 04 test.** The simulated send. | ![Final](docs/screenshots/desktop-09-final.png) **Reference.** The finished six-node workflow. |

### Mobile

The diagram is recomposed vertically on phones, with a Chat / Node toggle for the lower pane.

<p>
  <img src="docs/screenshots/mobile-01-hero.png" alt="Mobile hero" width="260">
  <img src="docs/screenshots/mobile-02-sheets-tool.png" alt="Mobile Sheets tool step" width="260">
</p>

A scroll-driven, single-page explainer of the n8n AI agent built in [`docs/project.md`](docs/project.md):
Chat Trigger → AI Agent (Gemini model, Simple Memory) → Google Sheets tool → Gmail tool with explicit approval.

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build → dist/
npm test           # content/consistency tests (vitest)
npm run preview    # serve dist/ on :4173, then:
node scripts/e2e.mjs   # browser checks (system Chrome via puppeteer-core; CHROME=/path to override)
```

## How it works

- **`src/data.ts`**: the single source of truth. Each scroll step is a full, declarative snapshot of the scene (visible nodes, active nodes, packet route, chat messages, side panel, email state). Forward scroll, reverse scroll and anchor jumps therefore always resolve to the same state.
- **`src/workflow.ts`**: one SVG workflow renderer reused for the hero, the sticky stage and the final diagram. It has a desktop n8n-style layout and a recomposed compact layout for phones.
- **`src/panels.ts`**: the simulated chat (diffed by message id), system prompt, model config, memory store, spreadsheet and Gmail compose.
- **`src/main.ts`**: GSAP ScrollTrigger, with one trigger per step. The stage is CSS `position: sticky`, so native scrolling isn't hijacked.

## Decisions & honesty notes

- **No framework.** One page and one state model don't need React. The stack is Vite + TypeScript + GSAP/ScrollTrigger + Lucide, with fonts self-hosted through Fontsource, so the page makes no third-party requests.
- **Everything is simulated.** No n8n, Gemini, Sheets or Gmail calls are made, and all records use fictional `@example.com` addresses. Tests and the e2e script check this.
- **The Phase 4 draft uses `get_board_members` to find recipients.** The spec says "inform the board", and the sheet is where board emails live. This is an illustrative choice.
- **Approval is described as prompt-level.** In the spec it lives in the Gmail tool description, so the site says plainly that this is guidance, not a hard lock, and suggests a deterministic approval step for guaranteed sign-off.
- **Memory is described as a per-session window** that a session reset clears. The site doesn't claim a specific window size.
- The "forgets without memory" exchange in Phase 1 is an illustrative simulation of stateless behaviour.
- `prefers-reduced-motion` turns off packets, transitions and the hero loop. All content stays present as text.

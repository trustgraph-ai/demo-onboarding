# TrustGraph UX Plugin Template

Starter template for building TrustGraph UI plugins. Includes a hello world
page, an interactive graph explorer, a Graph RAG query view, and an
explainable RAG view — all in under 80 lines of code.

## Prerequisites

- Node.js 20+
- A checkout of [trustgraph-ui](https://github.com/trustgraph-ai/trustgraph-ui) at `../trustgraph-ui`
  (the `devDependencies` link to it via `file:` references)

## Quick start

```bash
# Install dependencies
npm install

# Build the IIFE bundle
npm run build
```

This produces `dist/template.iife.js`.

## Loading into the demo app

1. Symlink the built file into the demo's public directory:

   ```bash
   ln -s $(pwd)/dist/template.iife.js ../trustgraph-ui/packages/demo/public/plugins/template.iife.js
   ```

2. Add the plugin entry to `packages/demo/public/config/plugins.json`.
   Copy the entry from `plugin-config.json` in this repo into the `demos`
   array:

   ```json
   {
     "id": "template",
     "title": "Plugin Template",
     "icon": "\u25b3",
     "paletteKey": "cyan",
     "description": "Starter template for building TrustGraph plugins.",
     "url": "/plugins/template.iife.js",
     "globalName": "TemplatePlugin"
   }
   ```

3. Start (or restart) the demo app and open the Demos page. Your plugin
   should appear as a card.

> After rebuilding the plugin, hard-refresh the browser (Ctrl+Shift+R)
> because IIFE scripts loaded via `<script>` tags are not handled by
> Vite HMR.

## Project structure

```
ux-plugin-template/
  src/
    index.ts              # Default export (entry point)
    TemplateExplorer.tsx   # Main component with tabbed views
  vite.config.js          # IIFE build config
  tsconfig.json           # TypeScript config
  plugin-config.json      # Manifest entry for plugins.json
  package.json
```

## How it works

Plugins are built as IIFE bundles that export a single React component as
their default export. The demo app loads them via `<script>` tags and
resolves the component from `window[globalName].default`.

Shared dependencies (React, trustkit, react-provider, react-state) are
**not** bundled into the plugin. They are mapped to `window.TrustKitShared.*`
globals that the host app provides at runtime. This keeps plugin bundles
small and avoids duplicate React instances.

## Making it your own

1. **Rename the plugin** — update `name` in `package.json`, `name` and
   `fileName` in `vite.config.js`, and the entry in `plugin-config.json`.

2. **Add your views** — create new components under `src/` and add tabs
   in `TemplateExplorer.tsx`. The template shows the pattern.

3. **Use trustkit components** — everything exported from `@trustgraph/trustkit`
   is available. Some useful ones:

   | Component | What it does |
   |---|---|
   | `RawGraphExplorer` | Full graph explorer (search + canvas + detail panel) |
   | `SimpleRagView` | Graph RAG query with streaming response |
   | `RagExplainView` | Split-pane RAG with explainability events |
   | `SimpleAgentView` | Agent query with streaming response |
   | `AgentExplainView` | Split-pane agent with explainability events |
   | `SimpleDocRagView` | Document RAG query |
   | `useTheme()` | Access theme colors and scalable font sizing |
   | `useRawGraphState()` | Low-level graph state if you need custom layout |
   | `LoadingState` | Consistent loading/error display |
   | `SplitPane` | Collapsible side panel layout |

4. **Query the knowledge graph** — use `useSocket()` from
   `@trustgraph/react-provider` to access the WebSocket API:

   ```tsx
   import { useSocket } from "@trustgraph/react-provider";
   import { useSessionStore, useSettings } from "@trustgraph/react-state";

   const socket = useSocket();
   const flowId = useSessionStore((s) => s.flowId);
   const { settings } = useSettings();

   const api = socket.flow(flowId);
   const triples = await api.triplesQuery(
     subject, predicate, object, limit, settings.collection, ""
   );
   ```

5. **Add npm dependencies** — any package you add to `dependencies` will be
   bundled into the IIFE. Keep it lean for fast loads.

## License

See [LICENSE](LICENSE).

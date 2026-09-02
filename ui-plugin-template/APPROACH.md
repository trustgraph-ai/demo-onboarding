# Building TrustGraph Plugins with a Code Assistant

Practical guidance for using an AI code assistant (Claude Code, Cursor, etc.)
to build plugins on the TrustGraph platform.

## Start with the problem, not the code

Before writing any code, describe what you want to build in terms of
the user experience. What questions will users ask? What answers do they
expect? What data exists in the knowledge graph to support those answers?

A good opening prompt describes the domain and the use-cases, not the
implementation:

> We're building a plugin that helps new joiners find their way around
> an organisation. They need to find out who owns a service, what tools
> they need for their role, who to escalate to, and how spend approvals
> work. The data is in a knowledge graph with people, roles, teams,
> services, and processes.

This gives the assistant enough context to make architectural suggestions
rather than just writing boilerplate.

## Provide the ontology early

The knowledge graph schema is the most important context the assistant
needs. Share your ontology (TTL, or even just the class and property
list) early in the conversation. The assistant can't guess your
predicates, and getting them wrong wastes rounds of debugging.

A sample entity instance is even more useful than the schema alone —
it shows how the data actually looks, including literal types and URI
patterns:

> Here's a sample from the data:
>
>     :Person_AlexHernandez a :Person ;
>         rdfs:label "Alex Hernandez" ;
>         :hasRole :Role_TechnicalPm ;
>         :memberOf :Team_ProductManagement ;
>         :reportsTo :Person_KendallWilson .

## Iterate in small steps with a running build

Keep a test server running. After each meaningful change, build and
check the result in a browser. The assistant can verify that code
compiles, but only you can verify that the feature looks and feels
right. Screenshots are worth more than descriptions — paste them into
the conversation when something doesn't look right.

The cycle that works best:

1. Describe what you want (one feature at a time)
2. Let the assistant implement it
3. Build and test
4. Share what you see (screenshots, error messages)
5. Refine

Resist the urge to specify multiple features in one prompt. Small
iterations catch problems early and keep the assistant's context
focused.

## Tell the assistant what APIs exist

TrustGraph's platform APIs are not in the assistant's training data.
You need to explain what's available. The key things to communicate:

- **How to get a socket/API handle**: `useSocket()` returns `BaseApi`,
  and `socket.flow(flowId)` returns `FlowApi` with the real methods.
- **What methods exist**: `triplesQuery`, `textCompletion`, `graphRag`,
  `graphRagStreaming`, `embeddings`, `graphEmbeddingsQuery`.
- **How data comes back**: Triple objects with `s`, `p`, `o` fields,
  where each is a `Term` (`{t: "i", i: "..."}` for IRIs,
  `{t: "l", v: "..."}` for literals).
- **What shared components exist**: `useTheme`, `Card`, `Badge`,
  `SearchInput`, `LoadingState` from `@trustgraph/trustkit`.

You don't need to provide full type definitions. A brief description
of each method's signature and purpose is enough. The assistant will
ask if it needs more detail.

## Use "don't code yet" for design discussions

When you're exploring an approach, say so explicitly. Without this,
the assistant will start implementing immediately. Phrases that work:

> I'm thinking about a triage step that classifies questions first.
> Don't code this yet, we're just kicking ideas around.

> What if we used streaming for the GraphRAG responses? How would
> that work with the message state?

This keeps the conversation collaborative. You can steer the
architecture before any code is written, which is far cheaper than
refactoring afterwards.

## Describe the experience, not the implementation

Prompts that describe what the user should see tend to produce better
results than prompts that prescribe specific code:

Less effective:
> Add a useEffect that calls graphRagStreaming and updates state
> on each chunk.

More effective:
> The answer should stream in progressively so the user sees text
> appearing as it's generated, like a chat assistant.

The assistant knows how to implement streaming. What it doesn't know
is whether you want streaming in the first place.

## Share errors exactly as they appear

When something breaks, paste the exact error message. The assistant
can usually diagnose the problem from the error alone:

> TypeError: o.split is not a function

This immediately told us that an object was being treated as a string —
the `Term` type issue. Paraphrasing errors ("it's broken" or "the
search doesn't work") forces the assistant to guess.

## Point the assistant at existing code

When the platform has existing patterns (other plugins, library
source), point the assistant at them:

> Look at how the GraphRAG module in trustkit handles streaming.
> There's a lot in there, most of which you can ignore, but the
> response parsing is what we need.

The assistant can read code faster than you can explain it, and it
will pick up patterns and conventions automatically.

## Prompt patterns that work well

**Feature request with context:**
> Could we see a set of process steps to follow to buy something?
> The data has Process entities with hasStep relationships to
> ApprovalStep entities, each with a spendLimit.

**Visual refinement:**
> Could it be more visual? Like connected step cards with arrows
> instead of a numbered list.

**Bug report with evidence:**
> The presets menu drops off the bottom of the screen.
> [screenshot]

**Gentle correction:**
> Those buttons look very dark.

**Architectural nudge:**
> At the moment it feels quite search-y. I'm thinking a more
> conversational approach where the user can scroll back.

**Scope guard:**
> I don't think we need to handle that case. It's not a user error
> if someone asks about a role that doesn't exist — the system should
> still handle it gracefully.

## Common pitfalls

**Letting the assistant over-engineer.** A code assistant will happily
add error boundaries, retry logic, and abstraction layers you don't
need for a demo. Keep it simple. If you notice unnecessary complexity
creeping in, say so.

**Not explaining the runtime environment.** TrustGraph plugins run as
IIFE bundles with externals mapped to shared globals. The assistant
needs to know this to configure the build correctly. Vite config,
external dependencies, and the plugin config file are all things
worth sharing early.

**Assuming the assistant knows your API.** It doesn't. Every time you
hit a "not a function" error, it's usually because the assistant
guessed at an API that doesn't exist. Front-load the API surface.

**Trying to do too much at once.** A prompt like "build me an
onboarding assistant with triage, streaming, entity cards, process
visualisation, and portraits" will produce a mess. Build one layer
at a time. Get search working, then add triage, then add structured
routes, then add visual components.

## The conversation arc

A typical plugin-building session follows this arc:

1. **Vision** — describe the domain and use-cases
2. **Skeleton** — get a basic UI rendering with the plugin framework
3. **Data connection** — wire up the first API call, see real data
4. **Core features** — build each route/feature one at a time
5. **Polish** — visual refinements, edge cases, error handling
6. **Integration** — connect features together (e.g. clicking a card
   shows detail)

Each stage builds on confirmed working code from the previous stage.
The assistant maintains context across the session, so earlier
decisions inform later ones naturally.

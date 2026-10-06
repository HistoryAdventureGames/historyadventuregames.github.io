# Prompt template — generate a new Adventure Game story

Paste everything in the **"PROMPT TO COPY"** box below into a Claude chat (or any
capable chatbot). Fill in the five `<< ... >>` blanks at the top first. The model
will return (1) a complete, drop-in story JSON file and (2) the one manifest entry
to paste into `content/adventure-manifest.json`.

This template encodes the exact structure the live engine (`adventures/app.js`)
reads, so a correctly-filled response runs with no code changes — **except vocab
popovers** (see the note at the very bottom).

---

## PROMPT TO COPY

> You are helping me author a branching, choose-your-path **history adventure
> game** for a classroom website. Produce it as a single JSON file that exactly
> matches the schema and rules below, plus one manifest entry.
>
> ### What I want this story to be
> - **Topic:** `<< e.g. The French Revolution >>`
> - **Student plays as:** `<< e.g. a Parisian bread baker in 1789 >>`
> - **Desired learning outcomes (what students should understand by the end):**
>   `<< e.g. why ordinary people joined the revolution; the trade-offs between order and liberty; how the Revolution slid into the Terror >>`
> - **Grade / reading level:** `<< e.g. 9th-grade Global History, ~7th-grade reading level >>`
> - **Central question the whole story explores:** `<< e.g. how did the French Revolution change who held power in France? >>`
>
> ### The shape of a story (how it works)
> The player reads a scene, then clicks one choice, which loads the next scene.
> This repeats until they reach an **ending** (a scene with no choices). The story
> is a **deep branching tree**: aim for **60–100 scenes**, choices **5–9 steps**
> deep before most endings, and **many distinct endings** labelled good / bad /
> neutral. Choices must lead to *genuinely different* branches and consequences —
> not all roads leading to the same place. Endings should feel earned by the
> choices made, and each should teach something historically grounded.
>
> Tone: second person ("You are…"), vivid but clear, historically accurate, no
> anachronisms. Every branch should carry real history — causes, trade-offs, and
> consequences people actually faced.
>
> ### Exact JSON schema (field names are case-sensitive)
>
> **Top level:**
> ```json
> {
>   "id": "kebab-case-unique-id",
>   "title": "Display Title: A Subtitle",
>   "description": "One or two sentences shown on the library card.",
>   "topicQuestion": "the central question (lowercase ok; the site adds a '?')",
>   "coverImage": { "src": "public/images/YourImage.jpg", "alt": "description for screen readers" },
>   "startingSceneId": "start",
>   "branchingPathCount": 120,
>   "keyTerms": ["term one", "term two", "..."],
>   "termDefinitions": { "term one": "kid-friendly definition.", "term two": "..." },
>   "curriculumTags": ["NYS Global 9", "French Revolution", "..."],
>   "teacherNotes": "A paragraph for teachers: what the story covers and how to use it.",
>   "reviewFocus": "One sentence naming the big ideas students should review.",
>   "scenes": { "start": { ... }, "another-scene-id": { ... } }
> }
> ```
>
> **A normal (branching) scene** — note choices use `nextSceneId`, body is an
> array of paragraph strings:
> ```json
> "start": {
>   "title": "Scene Title",
>   "step": 1,
>   "pathFocus": "Optional one-line framing or the key terms in focus on this route.",
>   "body": [
>     "First paragraph of narrative.",
>     "Second paragraph that sets up the decision."
>   ],
>   "classroomPrompt": "Optional discussion question shown in a highlighted box.",
>   "choices": [
>     { "text": "What the player clicks.", "nextSceneId": "scene-id-it-leads-to" },
>     { "text": "A different, meaningfully distinct choice.", "nextSceneId": "other-scene-id" }
>   ]
> }
> ```
>
> **An ending scene** — it simply has **no `choices`**, and adds ending fields:
> ```json
> "good-republic-saved": {
>   "title": "Ending Title",
>   "step": 7,
>   "body": ["What happens, and why it matters historically."],
>   "ending": "good",
>   "teachingSummary": "Plain-language 'what this teaches' summary of this outcome.",
>   "keyTermReview": "One paragraph recapping the vocabulary this path used in context.",
>   "reflectionQuestions": [
>     "A question tying the choices to the history.",
>     "A question asking students to weigh a trade-off."
>   ]
> }
> ```
>
> ### Hard rules (the site enforces these)
> 1. There **must** be a scene whose key is `"start"` (it matches `startingSceneId`).
> 2. **Every** `nextSceneId` must exactly match a key that exists in `scenes`.
>    No dangling links — the engine flags them and shows a teacher error.
> 3. Scene keys and `id` are **kebab-case** (lowercase, hyphens), unique, descriptive
>    (e.g. `flee-to-the-countryside`, `bad-captured-by-the-mob`).
> 4. A scene is an **ending if and only if** it has no `choices`. Give every ending
>    an `ending` value of exactly `"good"`, `"bad"`, or `"neutral"`.
> 5. `step` is an integer = how many steps deep the scene is (start = 1, its choices'
>    targets = 2, and so on). It's shown to students as "Step N".
> 6. `body` is an **array of strings** (each string is one paragraph).
> 7. Put every vocabulary word you use in **both** `keyTerms` (array) **and**
>    `termDefinitions` (object: term → definition).
>
> ### Deliver two things
> 1. The complete story JSON (nothing omitted — include every scene so there are no
>    broken links).
> 2. The manifest entry to paste into `content/adventure-manifest.json`:
> ```json
> {
>   "id": "same-id-as-the-file",
>   "title": "Same title",
>   "topic": "Short topic label, e.g. The French Revolution",
>   "description": "Same one-line description.",
>   "file": "content/adventures/your-file-name.json"
> }
> ```
> Also tell me what to name the `.json` file (kebab-case, in `content/adventures/`).

---

## After the model responds — how to install the story

1. Save the JSON as `content/adventures/<your-file-name>.json`.
2. Add the manifest entry to the array in `content/adventure-manifest.json`.
3. Put the cover image at the `coverImage.src` path (e.g. `public/images/YourImage.jpg`).
   Existing images you can reuse: `AncientRome.jpg`, `GreecePolis.jpg`,
   `PlagueDoctor.jpg`, `Feudal-Japan.jpg`, `Feudal-Lord.jpg`, `Paleolithic.jpg`.
4. Open the Adventures page — the new story appears as a card automatically.

## Field reference (what the engine actually uses)

| Field | Where | Used for |
| --- | --- | --- |
| `id`, `title`, `description` | top level | library card + routing (`id` must be unique) |
| `topicQuestion` | top level | italic question on the card |
| `coverImage.src` / `.alt` | top level | **the only image shown** (card + every scene background) |
| `startingSceneId` | top level | which scene opens first (use `"start"`) |
| `curriculumTags` | top level | tag chips on the card |
| `keyTerms` | top level | which words *can* get vocab popovers (see note below) |
| `scenes` | top level | the whole story; keys are scene ids |
| `title`, `step` | scene | heading + "Step N" label |
| `pathFocus` | scene | optional framing box above the narrative |
| `body` | scene | narrative paragraphs (array of strings) |
| `classroomPrompt` | scene | optional "Classroom Discussion" box (`discussionQuestion` also works) |
| `choices[].text` / `.nextSceneId` | scene | the buttons and where they lead |
| `ending` | ending scene | badge color: `good` / `bad` / `neutral` (`endingType` also works) |
| `teachingSummary` | ending scene | "What did this teach me?" (`whatDidThisTeachMe` also works) |
| `reflectionQuestions` | ending scene | numbered reflection list |
| `keyTermReview` | ending scene | vocabulary recap paragraph |

### ⚠️ Important limitation: vocabulary popovers
The clickable vocab-term popovers are driven by a **hardcoded global glossary**
inside `adventures/app.js`, **not** by each story's `termDefinitions`. So for a
**new topic**, the terms in `termDefinitions` will *not* become clickable popovers
on their own — they'll just read as normal text. To get working popovers you must
either (a) add each new term + definition to the `glossaryDefinitions` object in
`adventures/app.js`, or (b) have the engine updated once to read each story's own
`termDefinitions` (recommended — then every future story is self-contained). The
template still has you include `termDefinitions` so the data is ready either way.

Fields the engine currently ignores (safe to include, but they won't render):
per-scene `image`, and top-level `termDefinitions` (until the engine change above).

const manifestPath = "content/adventure-manifest.json";
const app = document.querySelector("#app");
const libraryButton = document.querySelector("#libraryButton");

const glossaryDefinitions = {
  agriculture: "Growing crops and raising animals for food, which allowed communities to settle in one place.",
  "anti-Semitism": "Hostility, prejudice, or discrimination against Jewish people.",
  artisan: "A skilled craftworker who makes goods by hand.",
  "Black Death": "The devastating plague pandemic that spread through Afro-Eurasia in the 1300s.",
  "bubonic plague": "A deadly form of plague often spread by fleas carried by rodents.",
  bushido: "The warrior code associated with samurai values such as loyalty, honor, and discipline.",
  "castle town": "A town that grew around a castle and served as a center of military, political, and economic life.",
  Christendom: "The community of Christian kingdoms and peoples in medieval Europe.",
  civilization: "A complex society with cities, government, specialized jobs, social classes, and shared culture.",
  "cross-cultural contact": "Interaction between different societies that can spread goods, ideas, beliefs, and disease.",
  Crusades: "Medieval military campaigns promoted by the Church, especially to control holy sites in the eastern Mediterranean.",
  daimyo: "A powerful Japanese landholding lord who controlled warriors and territory.",
  domestication: "The process of adapting plants or animals for human use.",
  "Edo period": "The era of Tokugawa rule in Japan from 1603 to 1868.",
  feudalism: "A political and social system based on land, loyalty, protection, and service.",
  fief: "Land granted by a lord to a vassal in exchange for loyalty and service.",
  flagellants: "Religious groups who whipped themselves publicly during crises such as the Black Death.",
  hierarchy: "A ranked social order where some people have more power or status than others.",
  "Holy Land": "The region around Jerusalem considered sacred by Jews, Christians, and Muslims.",
  homage: "A formal act of loyalty given by a vassal to a lord.",
  irrigation: "Moving water to fields to help crops grow.",
  Islam: "A monotheistic religion founded in Arabia and based on the teachings of the Prophet Muhammad.",
  isolation: "Separating people or places to reduce contact and slow the spread of disease.",
  "job specialization": "When people focus on different kinds of work instead of everyone doing the same tasks.",
  knight: "A mounted warrior in medieval Europe who often served a lord.",
  "labor shortage": "A lack of available workers, often causing wages or bargaining power to rise.",
  lord: "A person with power over land and people in a feudal system.",
  manorialism: "The economic system of medieval manors, where peasants worked land controlled by a lord.",
  merchant: "A person who buys and sells goods.",
  monastery: "A religious community where monks live, work, pray, and preserve learning.",
  "Neo-Confucianism": "A revived form of Confucian thought that shaped social order and government in East Asia.",
  "Neolithic Revolution": "The major shift from hunting and gathering to farming and settled life.",
  nomad: "A person or group that moves from place to place rather than living permanently in one location.",
  Paleolithic: "The Old Stone Age, when humans lived mostly by hunting, gathering, and foraging.",
  pandemic: "An outbreak of disease that spreads across many regions or continents.",
  pilgrimage: "A journey to a sacred or important religious place.",
  pope: "The leader of the Roman Catholic Church.",
  "population decline": "A decrease in the number of people living in a place.",
  "public health": "Actions communities take to protect people from disease and improve well-being.",
  quarantine: "Keeping people, animals, or goods apart for a period of time to prevent disease from spreading.",
  "rice economy": "An economy where rice production is central to wealth, taxes, and social power.",
  "river valley": "Land around a river that often supports farming, trade, and early settlement.",
  sakoku: "Japan's Tokugawa-era policy of tightly limiting foreign contact and trade.",
  samurai: "A warrior class in feudal Japan expected to serve a lord.",
  scapegoating: "Blaming a person or group unfairly for a problem.",
  "self-sufficient": "Able to provide most needed goods or food without outside help.",
  serf: "A peasant legally tied to a lord's land in medieval Europe.",
  shogun: "The military ruler of Japan who held real political power under the emperor.",
  "Silk Roads": "Trade routes connecting East Asia, Central Asia, the Middle East, and Europe.",
  "social hierarchy": "A ranked structure of social classes or groups.",
  "social mobility": "The ability to move up or down in social status.",
  surplus: "Extra production beyond what is immediately needed.",
  tithe: "A payment, often one-tenth of income or produce, given to the Church.",
  "Tokugawa shogunate": "The military government that ruled Japan during the Edo period.",
  "trade network": "Connected routes and relationships used to exchange goods, ideas, and information.",
  urbanization: "The growth of towns and cities.",
  vassal: "A person who receives land or protection from a lord in exchange for loyalty and service.",
};

const state = {
  manifest: [],
  adventures: new Map(),
  backgroundImages: [],
  homeBackgroundImage: "",
  loadErrors: [],
  loadWarnings: [],
  currentAdventureId: null,
  currentSceneId: null,
};

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("hashchange", routeFromHash);
libraryButton.addEventListener("click", showLibrary);

async function init() {
  renderLoading();

  try {
    state.manifest = await fetchJson(manifestPath);

    if (!Array.isArray(state.manifest)) {
      throw new Error("The adventure manifest should be a JSON array.");
    }

    await loadAdventuresFromManifest(state.manifest);
    routeFromHash();
  } catch (error) {
    renderFatalError(
      "The adventure library could not load.",
      [
        "Ask your teacher to check that content/adventure-manifest.json exists.",
        error.message,
      ],
    );
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}.`);
  }

  return response.json();
}

async function loadAdventuresFromManifest(manifest) {
  const results = await Promise.allSettled(
    manifest.map(async (entry) => {
      if (!entry.file) {
        throw new Error(`${entry.title || entry.id || "A manifest entry"} is missing a file path.`);
      }

      const rawAdventure = await fetchJson(normalizeContentPath(entry.file));
      const repaired = repairMissingSceneLinks(rawAdventure);
      const adventure = normalizeAdventure({
        ...entry,
        ...repaired.adventure,
        file: entry.file,
        topic: entry.topic || repaired.adventure.topic,
        estimatedTime: entry.estimatedTime || repaired.adventure.estimatedTime,
      });
      const validationErrors = validateAdventure(adventure);

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(" "));
      }

      if (repaired.warnings.length > 0) {
        state.loadWarnings.push({ entry, messages: repaired.warnings });
      }

      return { entry, adventure };
    }),
  );

  results.forEach((result, index) => {
    const entry = manifest[index];

    if (result.status === "fulfilled") {
      state.adventures.set(result.value.adventure.id, result.value.adventure);
      state.backgroundImages.push(...getAdventureImageSources(result.value.adventure));
      return;
    }

    state.loadErrors.push({
      entry,
      message: result.reason.message,
    });
  });
}

function validateAdventure(adventure) {
  const errors = [];

  if (!adventure || typeof adventure !== "object") {
    return ["The file is not a valid adventure object."];
  }

  if (!adventure.id) errors.push("It is missing an id.");
  if (!adventure.title) errors.push("It is missing a title.");
  const startingSceneId = getStartingSceneId(adventure);
  if (!startingSceneId) errors.push("It is missing a startingScene or startingSceneId.");
  if (!adventure.scenes || typeof adventure.scenes !== "object") {
    errors.push("It is missing a scenes object.");
    return errors;
  }

  if (startingSceneId && !adventure.scenes[startingSceneId]) {
    errors.push(`The starting scene "${startingSceneId}" does not exist.`);
  }

  Object.entries(adventure.scenes).forEach(([sceneId, scene]) => {
    if (!scene || typeof scene !== "object") {
      errors.push(`Scene "${sceneId}" is not a valid object.`);
      return;
    }

    if (scene.choices && !Array.isArray(scene.choices)) {
      errors.push(`Scene "${sceneId}" has choices that are not an array.`);
      return;
    }

    (scene.choices || []).forEach((choice, choiceIndex) => {
      const target = getChoiceTarget(choice);

      if (!target) {
        errors.push(`Scene "${sceneId}" choice ${choiceIndex + 1} is missing a target.`);
      } else if (!adventure.scenes[target]) {
        errors.push(`Scene "${sceneId}" points to missing scene "${target}".`);
      }
    });
  });

  return errors;
}

function routeFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const adventureId = params.get("adventure");
  const sceneId = params.get("scene");

  if (!adventureId) {
    renderLibrary();
    return;
  }

  const adventure = state.adventures.get(adventureId);

  if (!adventure) {
    renderFatalError(
      "This adventure is not available.",
      [
        "Return to the library and choose a different adventure.",
        `Adventure id: ${adventureId}`,
      ],
    );
    return;
  }

  const savedSceneId = getSavedScene(adventure.id);
  renderGame(adventure, getFirstPlayableSceneId(adventure, sceneId || savedSceneId));
}

function renderLoading() {
  app.innerHTML = `
    <section class="status-panel">
      <h2>Loading adventures...</h2>
      <p>Getting the classroom library ready.</p>
    </section>
  `;
}

function renderLibrary() {
  state.currentAdventureId = null;
  state.currentSceneId = null;
  libraryButton.classList.add("hidden");
  document.body.classList.remove("is-playing");
  document.body.classList.add("is-home");
  setRandomHomeBackground();

  const loadedCards = Array.from(state.adventures.values()).map(renderAdventureCard).join("");
  const failedCards = state.loadErrors.map(renderFailedCard).join("");

  app.innerHTML = `
    <section aria-labelledby="libraryHeading">
      <h2 id="libraryHeading">Choose an adventure</h2>
      <p class="subtitle">
        Each game is a branching Global History story. Read carefully, make a choice, and think about the historical consequences.
      </p>
      ${renderWarnings()}
      <div class="library-grid">
        ${loadedCards}
        ${failedCards}
      </div>
      ${state.adventures.size === 0 ? renderNoGamesMessage() : ""}
    </section>
  `;
}

function renderAdventureCard(adventure) {
  const savedScene = getSavedScene(adventure.id);
  const actionText = savedScene ? "Continue Adventure" : "Start Adventure";

  return `
    <article class="adventure-card">
      ${renderAdventureImage(adventure.coverImage, adventure.title)}
      <div class="adventure-card-body">
        <div class="card-meta">${escapeHtml(adventure.topic || "Global History")}</div>
        <h3>${escapeHtml(adventure.title)}</h3>
        <p class="card-description">${escapeHtml(adventure.description || "A branching historical adventure.")}</p>
        ${adventure.topicQuestion ? `<p class="topic-question">${escapeHtml(formatTopicQuestion(adventure.topicQuestion))}</p>` : ""}
        ${renderTagList(adventure.curriculumTags)}
        <div class="card-actions">
          <button class="primary-button" type="button" data-start="${escapeAttribute(adventure.id)}">
            ${actionText}
          </button>
          ${savedScene ? `
            <button class="secondary-button" type="button" data-reset="${escapeAttribute(adventure.id)}">
              Reset progress
            </button>
          ` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderWarnings() {
  if (state.loadWarnings.length === 0) return "";

  return `
    <section class="warning-panel">
      <h3>Teacher Note</h3>
      <p>The library loaded, but one or more imported stories needed automatic repairs.</p>
      <ul>
        ${state.loadWarnings
          .flatMap((warning) => warning.messages)
          .map((message) => `<li>${escapeHtml(message)}</li>`)
          .join("")}
      </ul>
    </section>
  `;
}

function renderFailedCard(error) {
  const entry = error.entry || {};

  return `
    <article class="adventure-card failed">
      <div class="card-meta">${escapeHtml(entry.topic || "Adventure unavailable")}</div>
      <h3>${escapeHtml(entry.title || entry.id || "Adventure failed to load")}</h3>
      <p class="card-description">
        This game could not load. Ask your teacher to check the file path in the manifest.
      </p>
      <p class="card-meta">${escapeHtml(entry.file || "Missing file path")}</p>
      <p>${escapeHtml(error.message)}</p>
    </article>
  `;
}

function renderNoGamesMessage() {
  return `
    <section class="error-panel">
      <h2>No adventures are ready yet.</h2>
      <p>
        Ask your teacher to check the manifest and the files in /public/content/adventures/.
      </p>
    </section>
  `;
}

function renderGame(adventure, sceneId) {
  const scene = adventure.scenes[sceneId];

  if (!scene) {
    renderFatalError(
      "This scene could not be found.",
      [
        "The adventure is still open, but this scene id does not exist in the JSON file.",
        `Missing scene: ${sceneId}`,
      ],
    );
    return;
  }

  state.currentAdventureId = adventure.id;
  state.currentSceneId = sceneId;
  libraryButton.classList.remove("hidden");
  document.body.classList.remove("is-home");
  document.body.classList.add("is-playing");
  setAdventureBackground(scene.image || adventure.coverImage);

  saveProgress(adventure.id, sceneId);
  updateHash(adventure.id, sceneId);

  const choices = Array.isArray(scene.choices) ? scene.choices : [];
  const isEnding = choices.length === 0;

  app.innerHTML = `
    <article class="game-panel" aria-labelledby="sceneTitle">
      ${renderAdventureImage(scene.image || adventure.coverImage, scene.title || adventure.title, "scene-image")}
      <div class="game-layout">
        <div class="scene-content">
          <div class="scene-title-row">
            <div>
              <p class="scene-meta">${escapeHtml(adventure.title)}${scene.step ? ` | Step ${escapeHtml(scene.step)}` : ""}</p>
              <h2 id="sceneTitle">${escapeHtml(scene.title || "Untitled Scene")}</h2>
            </div>
            ${getEndingType(scene) ? renderEndingBadge(getEndingType(scene)) : ""}
          </div>

          ${scene.pathFocus ? `<section class="path-focus">${renderVocabularyText(scene.pathFocus, adventure)}</section>` : ""}
          <p class="scene-text">${renderVocabularyText(getSceneText(scene), adventure)}</p>

          ${getClassroomPrompt(scene) ? `
            <section class="classroom-box" aria-labelledby="classroomHeading">
              <h3 id="classroomHeading">Classroom Discussion</h3>
              <p>${renderVocabularyText(getClassroomPrompt(scene), adventure)}</p>
            </section>
          ` : ""}

          ${isEnding ? renderEndingDetails(scene, adventure) : ""}
        </div>
        <aside class="decision-panel" aria-label="${isEnding ? "Adventure actions" : "Choices"}">
          ${isEnding ? `<h3>Ready for another path?</h3>` : renderChoices(adventure, scene, sceneId)}
          <div class="game-actions">
            <button class="secondary-button" type="button" data-restart="${escapeAttribute(adventure.id)}">
              Restart adventure
            </button>
            <button class="secondary-button" type="button" data-reset="${escapeAttribute(adventure.id)}">
              Reset progress
            </button>
            <button class="secondary-button" type="button" data-library>
              Return to library
            </button>
          </div>
        </aside>
      </div>
    </article>
  `;

  scrollToAppStart();
}

function renderChoices(adventure, scene, sceneId) {
  const buttons = scene.choices.map((choice, index) => {
    const target = getChoiceTarget(choice);
    const targetExists = Boolean(adventure.scenes[target]);

    return `
      <button
        class="choice-button"
        type="button"
        data-choice-target="${escapeAttribute(target || "") }"
        data-choice-index="${index}"
        ${targetExists ? "" : "disabled"}
      >
        ${escapeHtml(choice.text || `Choice ${index + 1}`)}
        ${targetExists ? "" : " This choice is missing its next scene."}
      </button>
    `;
  }).join("");

  return `
    <section aria-labelledby="choicesHeading">
      <h3 id="choicesHeading">What will you do?</h3>
      <div class="choice-list">${buttons}</div>
      ${scene.choices.some((choice) => !adventure.scenes[getChoiceTarget(choice)]) ? `
        <div class="error-panel">
          <p>
            One choice from scene "${escapeHtml(sceneId)}" points to a missing scene. Tell your teacher which choice caused the issue.
          </p>
        </div>
      ` : ""}
    </section>
  `;
}

function renderEndingBadge(endingType) {
  const normalized = String(endingType).toLowerCase();
  const badgeClass = normalized === "good"
    ? "ending-good"
    : normalized === "bad"
      ? "ending-bad"
      : "ending-neutral";

  return `<span class="ending-badge ${badgeClass}">${escapeHtml(toTitleCase(endingType))} Ending</span>`;
}

function renderEndingDetails(scene, adventure) {
  const reflectionQuestions = Array.isArray(scene.reflectionQuestions) ? scene.reflectionQuestions : [];
  const keyTerms = Array.isArray(scene.keyTerms)
    ? scene.keyTerms
    : Array.isArray(scene.keyTermReview)
      ? scene.keyTermReview
      : [];
  const keyTermReview = typeof scene.keyTermReview === "string" ? scene.keyTermReview : "";
  const teachingSummary = scene.whatDidThisTeachMe || scene.teachingSummary || "";

  return `
    <section class="ending-details" aria-labelledby="endingHeading">
      <h3 id="endingHeading">End of Adventure</h3>
      ${teachingSummary ? `
        <p><strong>What did this teach me?</strong> ${renderVocabularyText(teachingSummary, adventure)}</p>
      ` : ""}
      ${reflectionQuestions.length > 0 ? `
        <h3>Reflection Questions</h3>
        <ol>${reflectionQuestions.map((question) => `<li>${renderVocabularyText(question, adventure)}</li>`).join("")}</ol>
      ` : ""}
      ${keyTermReview ? `
        <h3>Key Terms</h3>
        <p>${renderVocabularyText(keyTermReview, adventure)}</p>
      ` : ""}
      ${keyTerms.length > 0 ? `
        <h3>Key Terms</h3>
        <ul>${keyTerms.map((term) => `<li>${renderVocabularyText(term, adventure)}</li>`).join("")}</ul>
      ` : ""}
    </section>
  `;
}

function renderVocabularyText(value, adventure) {
  const text = String(value || "");
  const terms = getVocabularyTerms(adventure);

  if (terms.length === 0) return escapeHtml(text);

  const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join("|")})\\b`, "gi");

  return escapeHtml(text).replace(pattern, (match) => {
    const definition = getDefinitionForTerm(match);
    if (!definition) return match;

    return `<span class="vocab-term" tabindex="0" role="button" aria-label="${escapeAttribute(`${match}: ${definition}`)}">${match}<span class="vocab-popover" role="tooltip">${escapeHtml(definition)}</span></span>`;
  });
}

function getVocabularyTerms(adventure) {
  return (Array.isArray(adventure.keyTerms) ? adventure.keyTerms : [])
    .filter((term) => getDefinitionForTerm(term))
    .sort((a, b) => b.length - a.length);
}

function getDefinitionForTerm(term) {
  const normalized = String(term).toLowerCase();
  const glossaryKey = Object.keys(glossaryDefinitions).find((key) => key.toLowerCase() === normalized);
  return glossaryKey ? glossaryDefinitions[glossaryKey] : "";
}

function getStartingSceneId(adventure) {
  return adventure.startingScene || adventure.startingSceneId;
}

function getFirstPlayableSceneId(adventure, preferredSceneId) {
  if (preferredSceneId && adventure.scenes[preferredSceneId]) return preferredSceneId;
  return getStartingSceneId(adventure);
}

function getChoiceTarget(choice) {
  return choice.target || choice.nextSceneId;
}

function getSceneText(scene) {
  if (scene.text) return scene.text;
  if (Array.isArray(scene.body)) return scene.body.join("\n\n");
  if (typeof scene.body === "string") return scene.body;
  return "This scene does not include narrative text yet.";
}

function getClassroomPrompt(scene) {
  return scene.classroomPrompt || scene.discussionQuestion || scene.classroomDiscussion || "";
}

function getEndingType(scene) {
  return scene.endingType || scene.ending || "";
}

function toTitleCase(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeAdventure(adventure) {
  return {
    ...adventure,
    branchingPathCount: Number(adventure.branchingPathCount) || null,
    keyTerms: Array.isArray(adventure.keyTerms) ? adventure.keyTerms.filter(isNonEmptyString) : [],
    curriculumTags: Array.isArray(adventure.curriculumTags) ? adventure.curriculumTags.filter(isNonEmptyString) : [],
  };
}

function repairMissingSceneLinks(adventure) {
  const scenes = { ...(adventure.scenes || {}) };
  const missingSceneIds = new Set();

  Object.values(scenes).forEach((scene) => {
    (scene.choices || []).forEach((choice) => {
      const target = getChoiceTarget(choice);
      if (isNonEmptyString(target) && !scenes[target]) {
        missingSceneIds.add(target);
      }
    });
  });

  if (missingSceneIds.size === 0) {
    return { adventure, warnings: [] };
  }

  const maxStep = Math.max(
    1,
    ...Object.values(scenes)
      .map((scene) => Number(scene.step) || 1)
      .filter(Number.isFinite),
  );

  missingSceneIds.forEach((missingSceneId) => {
    scenes[missingSceneId] = {
      title: `Missing Scene: ${titleFromId(missingSceneId)}`,
      step: maxStep + 1,
      body: [
        `This placeholder was created because an imported choice points to "${missingSceneId}", but that scene was not included in the JSON.`,
        "Tell your teacher this branch needs the intended historical scene before students use it for assessment.",
      ],
      ending: "neutral",
      teachingSummary:
        "This placeholder marks a broken branch in the imported story. Replace it with the intended historical scene before publishing.",
      reflectionQuestions: [
        "What should students learn from this missing branch?",
        "Which scene should this choice connect to if this placeholder is not needed?",
      ],
    };
  });

  return {
    adventure: { ...adventure, scenes },
    warnings: [
      `Created ${missingSceneIds.size} placeholder scene${missingSceneIds.size === 1 ? "" : "s"} for missing choice target${missingSceneIds.size === 1 ? "" : "s"}: ${Array.from(missingSceneIds).join(", ")}.`,
    ],
  };
}

function renderAdventureImage(image, fallbackTitle, className = "card-image") {
  if (!image || !image.src) return "";

  return `
    <img
      class="${className}"
      src="${escapeAttribute(normalizeAssetPath(image.src))}"
      alt="${escapeAttribute(image.alt || fallbackTitle || "Adventure image")}"
      loading="lazy"
    >
  `;
}

function normalizeAssetPath(src) {
  return String(src).replace(/^public\//, "").replace(/^\//, "");
}

function normalizeContentPath(src) {
  return String(src).replace(/^\//, "");
}

function renderTagList(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "";

  return `
    <div class="tag-list" aria-label="Curriculum tags">
      ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function formatTopicQuestion(question) {
  const trimmed = String(question).trim();
  if (!trimmed) return "";
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith("?") ? capitalized : `${capitalized}?`;
}

function titleFromId(id) {
  return String(id)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function renderFatalError(title, details) {
  libraryButton.classList.toggle("hidden", state.adventures.size === 0);
  app.innerHTML = `
    <section class="error-panel" role="alert">
      <h2>${escapeHtml(title)}</h2>
      <p>No worries. This usually means a file path or scene id needs to be fixed.</p>
      <ul class="error-list">
        ${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
      </ul>
      ${state.adventures.size > 0 ? `
        <button class="secondary-button" type="button" data-library>Return to library</button>
      ` : ""}
    </section>
  `;
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.start) {
    const adventure = state.adventures.get(button.dataset.start);
    renderGame(adventure, getFirstPlayableSceneId(adventure, getSavedScene(adventure.id)));
  }

  if (button.dataset.choiceTarget) {
    const adventure = state.adventures.get(state.currentAdventureId);
    const target = button.dataset.choiceTarget;

    if (!adventure.scenes[target]) {
      renderFatalError(
        "This choice points to a missing scene.",
        [
          "Tell your teacher which button you clicked.",
          `Missing scene: ${target}`,
        ],
      );
      return;
    }

    renderGame(adventure, target);
  }

  if (button.dataset.restart) {
      const adventure = state.adventures.get(button.dataset.restart);
      clearProgress(adventure.id);
      renderGame(adventure, getStartingSceneId(adventure));
  }

  if (button.dataset.reset) {
    clearProgress(button.dataset.reset);
    if (state.currentAdventureId === button.dataset.reset) {
      const adventure = state.adventures.get(button.dataset.reset);
      renderGame(adventure, getStartingSceneId(adventure));
    } else {
      renderLibrary();
    }
  }

  if (button.dataset.library !== undefined) {
    showLibrary();
  }
});

function showLibrary() {
  history.pushState("", document.title, window.location.pathname);
  renderLibrary();
  scrollToAppStart();
}

function scrollToAppStart() {
  app.scrollIntoView({ block: "start" });
}

function setAdventureBackground(image) {
  const src = getImageSrc(image);
  if (!src) return;

  document.body.style.setProperty(
    "--adventure-bg-image",
    `url("${normalizeAssetPath(src)}")`,
  );
}

function setRandomHomeBackground() {
  if (!state.homeBackgroundImage) {
    const supportedImages = Array.from(new Set(state.backgroundImages.filter(isSupportedImageFile)));
    state.homeBackgroundImage = supportedImages[Math.floor(Math.random() * supportedImages.length)] || "";
  }

  if (state.homeBackgroundImage) {
    document.body.style.setProperty(
      "--adventure-bg-image",
      `url("${normalizeAssetPath(state.homeBackgroundImage)}")`,
    );
  }
}

function getAdventureImageSources(adventure) {
  const sources = [getImageSrc(adventure.coverImage)];

  Object.values(adventure.scenes || {}).forEach((scene) => {
    sources.push(getImageSrc(scene.image));
  });

  return sources.filter(isSupportedImageFile);
}

function getImageSrc(image) {
  if (typeof image === "string") return image;
  return image && typeof image === "object" ? image.src : "";
}

function isSupportedImageFile(src) {
  const path = normalizeAssetPath(src || "").split("?")[0].toLowerCase();
  return /\.(svg|png|jpe?g)$/.test(path);
}

function updateHash(adventureId, sceneId) {
  const nextHash = `#adventure=${encodeURIComponent(adventureId)}&scene=${encodeURIComponent(sceneId)}`;

  if (window.location.hash !== nextHash) {
    history.replaceState(null, "", nextHash);
  }
}

function storageKey(adventureId) {
  return `global-history-adventure:${adventureId}`;
}

function getSavedScene(adventureId) {
  return localStorage.getItem(storageKey(adventureId));
}

function saveProgress(adventureId, sceneId) {
  localStorage.setItem(storageKey(adventureId), sceneId);
}

function clearProgress(adventureId) {
  localStorage.removeItem(storageKey(adventureId));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

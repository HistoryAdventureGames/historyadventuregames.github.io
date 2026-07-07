// Authoring tool for Historical Map Challenge. Click a map to drop points,
// name them, and it emits the challenge JSON + manifest entry. Plain script,
// no build step, no dependencies — matches the rest of the site.
(() => {
  const el = (id) => document.getElementById(id);

  const stage = el("stage");
  const mapImage = el("mapImage");
  const pointsList = el("pointsList");
  const output = el("output");
  const statusEl = el("status");

  const state = {
    points: [], // { label, hint, x, y }  (x/y are 0–1 fractions)
    mapWidth: 0,
    mapHeight: 0,
  };

  // ---------- Loading a map ----------

  el("loadUrlButton").addEventListener("click", () => {
    const url = el("mapUrl").value.trim();
    if (!url) return;
    loadMap(url);
    if (!el("fMapSrc").value.trim()) el("fMapSrc").value = filenameFrom(url);
  });

  el("mapFile").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    loadMap(URL.createObjectURL(file));
    // A local object URL can't ship — suggest the real filename for map.src.
    if (!el("fMapSrc").value.trim()) el("fMapSrc").value = file.name;
    setStatus(`Previewing “${file.name}”. Remember to also copy the file into the maps/ folder.`);
  });

  function loadMap(src) {
    mapImage.onload = () => {
      state.mapWidth = mapImage.naturalWidth;
      state.mapHeight = mapImage.naturalHeight;
      stage.hidden = false;
      el("stageHint").textContent = "Click on the map to add a point; drag a point to move it.";
      el("dims").textContent = `Map is ${state.mapWidth} × ${state.mapHeight}px.`;
      renderMarkers();
      updateOutput();
    };
    mapImage.onerror = () => setStatus("Could not load that image URL.", true);
    mapImage.src = src;
  }

  // ---------- Adding / moving points ----------

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".author-marker")) return; // handled per-marker below
    const point = pointFrom(event);
    if (!point) return;
    state.points.push({ label: "", hint: "", x: point.x, y: point.y });
    renderMarkers();
    renderList();
    updateOutput();
    const lastLabel = pointsList.querySelector(".author-point:last-child .author-point-label");
    if (lastLabel) lastLabel.focus();
  });

  function beginMarkerDrag(index, startEvent) {
    startEvent.stopPropagation();
    startEvent.preventDefault();

    const onMove = (event) => {
      const point = pointFrom(event);
      if (!point) return;
      state.points[index].x = point.x;
      state.points[index].y = point.y;
      positionMarker(index);
      updateCoordLabel(index);
      updateOutput();
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  function pointFrom(event) {
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  }

  // ---------- Rendering ----------

  function renderMarkers() {
    stage.querySelectorAll(".author-marker").forEach((node) => node.remove());
    state.points.forEach((_, index) => {
      const marker = document.createElement("span");
      marker.className = "author-marker";
      marker.dataset.index = String(index);
      marker.innerHTML = `<span class="author-marker-num">${index + 1}</span>`;
      marker.addEventListener("pointerdown", (event) => beginMarkerDrag(index, event));
      stage.appendChild(marker);
      positionMarker(index, marker);
    });
  }

  function positionMarker(index, marker) {
    const node = marker || stage.querySelector(`.author-marker[data-index="${index}"]`);
    if (!node) return;
    node.style.left = `${state.points[index].x * 100}%`;
    node.style.top = `${state.points[index].y * 100}%`;
  }

  function renderList() {
    el("pointCount").textContent = `(${state.points.length})`;
    pointsList.innerHTML = "";
    state.points.forEach((point, index) => {
      const li = document.createElement("li");
      li.className = "author-point";
      li.innerHTML = `
        <span class="author-point-num">${index + 1}</span>
        <div class="author-point-inputs">
          <input type="text" class="author-point-label" placeholder="Term label" value="${escapeAttr(point.label)}">
          <input type="text" class="author-point-hint" placeholder="Hint (optional)" value="${escapeAttr(point.hint)}">
          <span class="author-point-coords" data-coord-for="${index}">${coordText(point)}</span>
        </div>
        <button type="button" class="author-point-remove" data-remove="${index}">Delete</button>
      `;
      li.querySelector(".author-point-label").addEventListener("input", (event) => {
        state.points[index].label = event.target.value;
        updateOutput();
      });
      li.querySelector(".author-point-hint").addEventListener("input", (event) => {
        state.points[index].hint = event.target.value;
        updateOutput();
      });
      li.querySelector("[data-remove]").addEventListener("click", () => {
        state.points.splice(index, 1);
        renderMarkers();
        renderList();
        updateOutput();
      });
      pointsList.appendChild(li);
    });
  }

  function updateCoordLabel(index) {
    const span = pointsList.querySelector(`[data-coord-for="${index}"]`);
    if (span) span.textContent = coordText(state.points[index]);
  }

  function coordText(point) {
    return `x ${round(point.x)}, y ${round(point.y)}`;
  }

  // ---------- Output ----------

  function buildChallenge() {
    const id = slug(el("fId").value) || "untitled-challenge";
    const title = el("fTitle").value.trim() || "Untitled Challenge";
    return {
      id,
      title,
      category: el("fCategory").value.trim() || "landmarks",
      era: el("fEra").value,
      map: {
        src: el("fMapSrc").value.trim() || "map.png",
        width: state.mapWidth,
        height: state.mapHeight,
        alt: `Blank map for ${title}`,
        attribution: el("fAttribution").value.trim(),
      },
      items: state.points.map((point, index) => {
        const item = {
          id: slug(point.label) || `item-${index + 1}`,
          label: point.label.trim() || `Term ${index + 1}`,
          x: round(point.x),
          y: round(point.y),
        };
        if (point.hint.trim()) item.hint = point.hint.trim();
        return item;
      }),
    };
  }

  function buildManifestEntry(challenge) {
    return {
      id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      era: challenge.era,
      file: `challenges/${challenge.id}.json`,
    };
  }

  function updateOutput() {
    output.value = JSON.stringify(buildChallenge(), null, 2);
  }

  el("copyJson").addEventListener("click", () => {
    copy(output.value, "Challenge JSON copied.");
  });

  el("copyManifest").addEventListener("click", () => {
    copy(JSON.stringify(buildManifestEntry(buildChallenge()), null, 2), "Manifest entry copied — paste it into data/manifest.json.");
  });

  el("clearPoints").addEventListener("click", () => {
    if (state.points.length && !confirm("Remove all points?")) return;
    state.points = [];
    renderMarkers();
    renderList();
    updateOutput();
  });

  // Rebuild output whenever the metadata fields change.
  ["fId", "fTitle", "fCategory", "fEra", "fMapSrc", "fAttribution"].forEach((id) => {
    el(id).addEventListener("input", updateOutput);
  });

  function copy(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => setStatus(message)).catch(() => fallbackCopy(text, message));
    } else {
      fallbackCopy(text, message);
    }
  }

  function fallbackCopy(text, message) {
    output.value = text;
    output.select();
    try {
      document.execCommand("copy");
      setStatus(message);
    } catch {
      setStatus("Select the JSON box and copy manually.", true);
    }
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#b42318" : "#137a4b";
  }

  // ---------- Helpers ----------

  function slug(value) {
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function round(value) {
    return Number(value.toFixed(4));
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function filenameFrom(url) {
    const clean = url.split(/[?#]/)[0];
    return clean.substring(clean.lastIndexOf("/") + 1) || clean;
  }

  function escapeAttr(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  }

  updateOutput();
})();

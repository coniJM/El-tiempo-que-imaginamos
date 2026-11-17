const RUN_KEYS = [
  "elTiempoRespuestaFuturo",
  "elTiempoRespuestaCambio",
  "elTiempoReflexionFinal",
  "elTiempoDatosVisualizacion",
  "elTiempoSessionId",
  "elTiempoNubePalabras"
];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const screens = [...document.querySelectorAll(".screen")];

function clearRunData() {
  RUN_KEYS.forEach((key) => sessionStorage.removeItem(key));
  try { localStorage.removeItem("elTiempoNubePalabras"); } catch {}
  document.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
  const reflection = document.querySelector("#remain-answer");
  if (reflection) reflection.value = "";
  ["#continue-button", "#change-button"].forEach((selector) => {
    const button = document.querySelector(selector);
    if (button) button.disabled = true;
  });
  ["#answer-status", "#change-status", "#remain-status"].forEach((selector) => {
    const status = document.querySelector(selector);
    if (status) status.textContent = "";
  });
}

const navigation = performance.getEntriesByType("navigation")[0];
const startsFromBeginning = navigation?.type === "reload" || !window.location.hash || window.location.hash === "#top";
if (startsFromBeginning) {
  clearRunData();
  window.history.replaceState({ step: "#top" }, "", "#top");
}

function showStep(selector, updateHistory = true) {
  const nextScreen = document.querySelector(selector);
  const currentScreen = document.querySelector(".screen--active");
  if (!nextScreen || nextScreen === currentScreen) return;

  if (currentScreen) {
    currentScreen.classList.remove("screen--active");
    currentScreen.classList.add("screen--leaving");
    currentScreen.setAttribute("aria-hidden", "true");
    currentScreen.inert = true;
    window.setTimeout(() => currentScreen.classList.remove("screen--leaving"), reducedMotion.matches ? 0 : 780);
  }

  nextScreen.classList.remove("screen--leaving");
  nextScreen.classList.add("screen--active");
  nextScreen.setAttribute("aria-hidden", "false");
  nextScreen.inert = false;

  if (updateHistory && window.location.hash !== selector) {
    window.history.pushState({ step: selector }, "", selector);
  }
}

const initialScreen = startsFromBeginning
  ? document.querySelector("#top")
  : screens.find((screen) => `#${screen.id}` === window.location.hash)
    || document.querySelector("#top")
    || screens[0];

screens.forEach((screen) => {
  const isInitial = screen === initialScreen;
  screen.classList.toggle("screen--active", isInitial);
  screen.classList.remove("screen--leaving");
  screen.setAttribute("aria-hidden", String(!isInitial));
  screen.inert = !isInitial;
});

window.addEventListener("popstate", () => {
  const target = document.querySelector(window.location.hash) ? window.location.hash : "#top";
  showStep(target, false);
});

document.querySelectorAll("a[data-step-next]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showStep(link.getAttribute("href"));
  });
});

document.querySelector("a[data-restart]")?.addEventListener("click", (event) => {
  event.preventDefault();
  clearRunData();
  showStep("#top");
});

const questionFlows = [
  {
    form: "#future-form", button: "#continue-button", status: "#answer-status",
    inputName: "future", storageKey: "elTiempoRespuestaFuturo",
    next: "#pregunta-cambio", savedMessage: "Tu respuesta quedó guardada para continuar."
  },
  {
    form: "#change-form", button: "#change-button", status: "#change-status",
    inputName: "time-change", storageKey: "elTiempoRespuestaCambio",
    next: "#pregunta-permanece", savedMessage: "Tu respuesta quedó guardada para continuar."
  }
];

questionFlows.forEach((flow) => {
  const form = document.querySelector(flow.form);
  const button = document.querySelector(flow.button);
  const status = document.querySelector(flow.status);
  if (!form || !button) return;

  const savedAnswer = sessionStorage.getItem(flow.storageKey);
  const savedOption = savedAnswer
    ? [...form.querySelectorAll(`input[name="${flow.inputName}"]`)]
        .find((option) => option.value === savedAnswer)
    : null;
  if (savedOption) {
    savedOption.checked = true;
    button.disabled = false;
  }

  form.addEventListener("change", (event) => {
    if (event.target.matches(`input[name="${flow.inputName}"]`)) {
      button.disabled = false;
      if (status) status.textContent = "";
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = form.querySelector(`input[name="${flow.inputName}"]:checked`);
    if (!selected) return;
    sessionStorage.setItem(flow.storageKey, selected.value);
    window.dispatchEvent(new CustomEvent("respuestaTiempoGuardada", {
      detail: { pregunta: flow.inputName, respuesta: selected.value }
    }));
    if (status) status.textContent = flow.savedMessage;
    showStep(flow.next);
  });
});

const remainForm = document.querySelector("#remain-form");
const remainAnswer = document.querySelector("#remain-answer");
const remainStatus = document.querySelector("#remain-status");
const ignoredWords = new Set([
  "a", "al", "algo", "como", "con", "cuando", "de", "del", "desde", "e",
  "el", "ella", "ellas", "ellos", "en", "entre", "era", "es", "esa", "esas",
  "ese", "eso", "esos", "esta", "estaba", "están", "este", "esto", "estos",
  "fue", "ha", "hace", "hacia", "hay", "la", "las", "le", "les", "lo", "los",
  "más", "me", "mi", "mis", "muy", "no", "o", "para", "pero", "por", "que",
  "se", "sin", "sobre", "su", "sus", "te", "ti", "todo", "tu", "tus", "un",
  "una", "uno", "unos", "unas", "y", "ya"
]);

function getReflectionWords(text) {
  return (text.toLocaleLowerCase("es").match(/[\p{L}\p{M}]+/gu) || [])
    .filter((word) => word.length > 2 && !ignoredWords.has(word));
}

function getSessionId() {
  let id = sessionStorage.getItem("elTiempoSessionId");
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `tiempo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("elTiempoSessionId", id);
  }
  return id;
}

if (remainForm && remainAnswer) {
  remainForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const words = getReflectionWords(remainAnswer.value.trim());
    const payload = {
      type: "experience.completed",
      version: 1,
      sessionId: getSessionId(),
      completedAt: new Date().toISOString(),
      responses: {
        future: sessionStorage.getItem("elTiempoRespuestaFuturo"),
        timeChange: sessionStorage.getItem("elTiempoRespuestaCambio"),
        words
      }
    };
    sessionStorage.setItem("elTiempoDatosVisualizacion", JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("tiempo:experience-complete", { detail: payload }));
    if (remainStatus) remainStatus.textContent = "Gracias por compartir tu reflexión.";
    showStep("#cierre");
  });
}

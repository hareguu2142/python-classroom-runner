import { exampleGroups, examples } from "./examples.js?v=1";

const PYODIDE_VERSION = "0.29.3";
const STORAGE_KEY = "python-classroom-runner:code";
const FILE_NAME_STORAGE_KEY = "python-classroom-runner:file-name";
const FONT_SIZE_STORAGE_KEY = "python-classroom-runner:font-size";
const DEFAULT_FILE_NAME = "main.py";
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 20;
const MAX_TEXT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PYTHON_FILE_SIZE = 1024 * 1024;
const THEME_STORAGE_KEY = "python-classroom-runner:theme";
const OUTPUT_PLACEHOLDER = "";


const output = document.querySelector("#output");
const outputPanel = document.querySelector("#output-panel");
const runButton = document.querySelector("#run-button");
const stopButton = document.querySelector("#stop-button");
const resetButton = document.querySelector("#reset-button");
const stepButton = document.querySelector("#step-button");
const cursorButton = document.querySelector("#cursor-button");
const backButton = document.querySelector("#back-button");
const copyButton = document.querySelector("#copy-button");
const clearButton = document.querySelector("#clear-button");
const exampleSelect = document.querySelector("#example-select");
const runtimeState = document.querySelector("#runtime-state");
const runtimeLabel = document.querySelector("#runtime-label");
const elapsedTime = document.querySelector("#elapsed-time");
const debugLocation = document.querySelector("#debug-location");
const variables = document.querySelector("#variables");
const terminalInputForm = document.querySelector("#terminal-input");
const terminalInputValue = document.querySelector("#terminal-input-value");
const fontSizeDecrease = document.querySelector("#font-size-decrease");
const fontSizeIncrease = document.querySelector("#font-size-increase");
const fontSizeValue = document.querySelector("#font-size-value");
const fileButton = document.querySelector("#file-button");
const fileInput = document.querySelector("#file-input");
const openButton = document.querySelector("#open-button");
const pyFileInput = document.querySelector("#py-file-input");
const saveButton = document.querySelector("#save-button");
const saveStatus = document.querySelector("#save-status");
const fileNameElement = document.querySelector("#file-name");
const fileShelf = document.querySelector("#file-shelf");
const fileMenu = document.querySelector("#file-menu");
const themeToggle = document.querySelector("#theme-toggle");
const loadedFilesElement = document.querySelector("#loaded-files");

let worker;
let workerReady = false;
let running = false;
let waitingForInput = false;
let startedAt = 0;
let fontSize = getSavedFontSize();
let fileName = localStorage.getItem(FILE_NAME_STORAGE_KEY) || DEFAULT_FILE_NAME;
let previousVariables = new Map();
let saveStatusTimer;
const loadedTextFiles = new Map();

// 실행 중 조금씩 도착하는 출력입니다. 한 줄 실행·입력 재개는 처음부터 다시
// 실행하므로, 이미 화면에 보이던 길이를 넘어설 때만 화면을 바꿉니다.
const liveOutput = { text: "", shownLength: 0 };
let currentOutputText = "";

const editor = createEditor(document.querySelector("#code-editor"));
let session = freshSession("");

function freshSession(code) {
  return {
    code,
    inputs: [],
    executedCount: 0,
    currentLine: null,
    request: null,
    // 입력·한 줄 실행 때 처음부터 다시 실행해도 같은 난수가 나오도록 고정합니다.
    seed: Math.floor(Math.random() * 2 ** 31),
    started: false,
    complete: false,
  };
}

function createEditor(textarea) {
  if (!window.CodeMirror) {
    // 편집기 라이브러리를 불러오지 못해도 기본 입력창으로 계속 쓸 수 있게 합니다.
    textarea.classList.add("plain-editor");
    textarea.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || event.shiftKey || textarea.selectionStart !== textarea.selectionEnd) return;
      event.preventDefault();
      textarea.setRangeText("    ", textarea.selectionStart, textarea.selectionEnd, "end");
      textarea.dispatchEvent(new Event("input"));
    });
    return {
      getValue: () => textarea.value,
      setValue: (value) => { textarea.value = value; textarea.dispatchEvent(new Event("input")); },
      getCursorLine: () => textarea.value.slice(0, textarea.selectionStart).split("\n").length,
      focus: () => textarea.focus(),
      setReadOnly: (readOnly) => { textarea.readOnly = readOnly; },
      onChange: (listener) => textarea.addEventListener("input", listener),
      markLine: () => {},
      revealLine: () => {},
      refresh: () => {},
    };
  }

  const cm = window.CodeMirror.fromTextArea(textarea, {
    mode: { name: "python", version: 3 },
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    smartIndent: true,
    electricChars: true,
    matchBrackets: true,
    autoCloseBrackets: "()[]{}''\"\"",
    spellcheck: false,
    autocorrect: false,
    autocapitalize: false,
    screenReaderLabel: "Python 코드 입력",
    extraKeys: {
      Tab: (instance) => {
        if (instance.somethingSelected()) instance.indentSelection("add");
        else instance.execCommand("insertSoftTab");
      },
      "Shift-Tab": (instance) => instance.indentSelection("subtract"),
      Backspace: (instance) => {
        // 줄 앞 공백에서는 들여쓰기 한 단계(4칸)씩 지웁니다.
        if (instance.somethingSelected()) return window.CodeMirror.Pass;
        const cursor = instance.getCursor();
        const before = instance.getLine(cursor.line).slice(0, cursor.ch);
        if (!cursor.ch || !/^ +$/.test(before)) return window.CodeMirror.Pass;
        const remove = ((cursor.ch - 1) % 4) + 1;
        instance.replaceRange("", { line: cursor.line, ch: cursor.ch - remove }, cursor);
        return undefined;
      },
    },
  });

  const lineClasses = { next: "cm-line-next", error: "cm-line-error" };
  const markedLines = { next: null, error: null };

  return {
    getValue: () => cm.getValue(),
    setValue: (value) => cm.setValue(value),
    getCursorLine: () => cm.getCursor().line + 1,
    focus: () => cm.focus(),
    setReadOnly: (readOnly) => {
      cm.setOption("readOnly", readOnly);
      cm.getWrapperElement().classList.toggle("is-readonly", readOnly);
    },
    onChange: (listener) => cm.on("changes", listener),
    markLine(kind, line) {
      const className = lineClasses[kind];
      if (markedLines[kind]) {
        cm.removeLineClass(markedLines[kind], "background", className);
        cm.removeLineClass(markedLines[kind], "gutter", `${className}-gutter`);
        markedLines[kind] = null;
      }
      if (!line || line > cm.lineCount()) return;
      const handle = cm.getLineHandle(line - 1);
      cm.addLineClass(handle, "background", className);
      cm.addLineClass(handle, "gutter", `${className}-gutter`);
      markedLines[kind] = handle;
    },
    revealLine: (line) => {
      if (line) cm.scrollIntoView({ line: line - 1, ch: 0 }, 80);
    },
    refresh: () => cm.refresh(),
  };
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "밝게" : "어둡게";
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* 저장하지 못해도 화면은 바뀝니다. */ }
}

function getSavedFontSize() {
  const savedSize = Number.parseInt(localStorage.getItem(FONT_SIZE_STORAGE_KEY), 10);
  return Number.isFinite(savedSize)
    ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, savedSize))
    : DEFAULT_FONT_SIZE;
}

function applyFontSize(nextSize) {
  fontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, nextSize));
  document.documentElement.style.fontSize = `${fontSize}px`;
  fontSizeValue.textContent = `${Math.round(fontSize / DEFAULT_FONT_SIZE * 100)}%`;
  fontSizeDecrease.disabled = fontSize === MIN_FONT_SIZE;
  fontSizeIncrease.disabled = fontSize === MAX_FONT_SIZE;
  localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSize));
  editor.refresh();
}

function createWorker() {
  workerReady = false;
  setRuntimeState("loading", "준비 중…");
  updateControls();
  worker = new Worker("./python-worker.js?v=8", { type: "module" });

  worker.addEventListener("message", handleWorkerMessage);
  worker.addEventListener("error", (event) => {
    running = false;
    waitingForInput = false;
    setRuntimeState("error", "불러오기 실패");
    renderOutput({ error: `Python을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침하세요.\n(${event.message})` });
    updateControls();
  });

  worker.postMessage({ type: "init", version: PYODIDE_VERSION });
}

function handleWorkerMessage({ data }) {
  if (data.type === "ready") {
    workerReady = true;
    setRuntimeState("ready", "준비됨");
    runtimeState.title = `Python ${data.pythonVersion}`;
    updateControls();
    return;
  }

  if (data.type === "status") {
    runtimeLabel.textContent = data.message;
    return;
  }

  if (data.type === "stdout") {
    if (!running) return;
    liveOutput.text += data.text;
    if (liveOutput.text.length > liveOutput.shownLength) {
      renderOutput({ text: liveOutput.text });
      liveOutput.shownLength = liveOutput.text.length;
    }
    return;
  }

  if (data.type === "result") {
    handleExecutionResult(data.result);
    return;
  }

  if (data.type === "error") {
    renderOutput({ error: data.message });
    finishExecution(true, "오류");
  }
}

function handleExecutionResult(result) {
  session.started = true;
  renderVariables(result.variables || []);

  if (result.status === "input") {
    running = false;
    waitingForInput = true;
    session.currentLine = result.line || null;
    renderOutput({ text: result.output || "" });
    debugLocation.textContent = result.line ? `${result.line}번 줄` : "";
    setRuntimeState("loading", "입력 대기");
    terminalInputForm.hidden = false;
    terminalInputValue.value = "";
    terminalInputValue.placeholder = "입력 후 Enter";
    updateEditorMarks();
    updateControls();
    requestAnimationFrame(() => terminalInputValue.focus());
    return;
  }

  session.executedCount = result.executedCount ?? session.executedCount;
  session.currentLine = result.line || null;
  terminalInputForm.hidden = true;

  if (result.status === "paused") {
    session.complete = false;
    renderOutput({ text: result.output || "" });
    debugLocation.textContent = result.scope && result.scope !== "<module>"
      ? `다음 ${result.line}번 줄 · ${result.scope}()`
      : `다음 ${result.line}번 줄`;
    finishExecution(false, "멈춤");
    editor.revealLine(result.line);
    return;
  }

  if (result.status === "done") {
    session.complete = true;
    session.currentLine = null;
    renderOutput({ text: result.output || "", placeholder: "(출력 없음)" });
    debugLocation.textContent = "끝";
    finishExecution(false, "완료");
    return;
  }

  if (result.status === "error") {
    session.complete = false;
    renderOutput({ text: result.output || "", error: result.error, hint: result.hint });
    debugLocation.textContent = result.line ? `${result.line}번 줄 오류` : "오류";
    finishExecution(true, "오류");
    editor.revealLine(result.line);
  }
}

function setRuntimeState(state, label) {
  runtimeState.dataset.state = state;
  runtimeLabel.textContent = label;
}

function createSpan(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function renderOutput({ text = "", error = "", hint = "", note = "", placeholder = OUTPUT_PLACEHOLDER } = {}) {
  currentOutputText = text;
  const separator = text && !text.endsWith("\n") ? "\n" : "";
  const nodes = [];
  if (text) nodes.push(document.createTextNode(text));
  if (error) nodes.push(createSpan("output-error", separator + error));
  if (hint) nodes.push(createSpan("output-hint", hint));
  if (note) nodes.push(createSpan("output-note", separator + note));
  if (!nodes.length) nodes.push(createSpan("muted", placeholder));
  output.replaceChildren(...nodes);
  output.scrollTop = output.scrollHeight;
}

function isIdle() {
  return workerReady && !running && !waitingForInput;
}

function ensureSession() {
  const code = editor.getValue().trimEnd();
  if (session.code !== code) resetDebugSession(code, false);
  return code;
}

function resetDebugSession(code = editor.getValue().trimEnd(), clearOutput = true) {
  session = freshSession(code);
  running = false;
  waitingForInput = false;
  terminalInputForm.hidden = true;
  debugLocation.textContent = "";
  renderVariables([]);
  if (clearOutput) renderOutput();
  elapsedTime.textContent = "";
  updateEditorMarks();
  updateControls();
}

function startExecution(request, resume = false) {
  const code = ensureSession();
  if (!workerReady || running || (!resume && waitingForInput)) return;
  if (!code.trim()) {
    renderOutput({ error: "코드가 비어 있어요." });
    return;
  }

  session.request = request;
  running = true;
  waitingForInput = false;
  terminalInputForm.hidden = true;
  liveOutput.text = "";
  if (resume) {
    liveOutput.shownLength = currentOutputText.length;
  } else {
    liveOutput.shownLength = 0;
    startedAt = performance.now();
  }
  if (request.mode === "full" && !resume) {
    renderOutput({ placeholder: "실행 중…" });
  }
  setRuntimeState("loading", "실행 중…");
  updateControls();

  worker.postMessage({
    type: "execute",
    code,
    inputs: session.inputs,
    request: { ...request, stream: request.mode === "full", seed: session.seed },
    files: Array.from(loadedTextFiles, ([name, content]) => ({ name, content })),
  });
}

function runFull() {
  if (!isIdle()) return;
  resetDebugSession(editor.getValue().trimEnd(), false);
  startExecution({ mode: "full" });
  revealOutputOnSmallScreen();
}

function stepForward() {
  if (!isIdle()) return;
  const code = ensureSession();
  if (!code.trim() || session.complete) return;
  // 처음 누르면 1번 줄을 실행하기 전에 멈춰서 시작 위치를 보여 줍니다.
  startExecution({
    mode: "step",
    targetExecuted: session.started ? session.executedCount + 1 : 0,
  });
}

function stepBack() {
  if (!isIdle()) return;
  ensureSession();
  if (session.executedCount <= 0) return;
  startExecution({
    mode: "step",
    targetExecuted: Math.max(0, session.executedCount - 1),
  });
}

function runToCursor() {
  if (!isIdle()) return;
  const code = ensureSession();
  if (!code.trim()) return;
  if (session.complete) resetDebugSession(code, false);
  startExecution({
    mode: "cursor",
    targetLine: editor.getCursorLine(),
    minimumEvents: session.executedCount,
  });
}

function finishExecution(hasError, label) {
  running = false;
  waitingForInput = false;
  const seconds = (performance.now() - startedAt) / 1000;
  elapsedTime.textContent = `${seconds.toFixed(2)}초`;
  setRuntimeState(hasError ? "error" : "ready", label);
  updateEditorMarks(hasError);
  updateControls();
}

function stopCode() {
  if (!running && !waitingForInput) return;
  worker.terminate();
  renderOutput({ text: currentOutputText, note: "[중지됨]" });
  session = freshSession(editor.getValue().trimEnd());
  running = false;
  waitingForInput = false;
  terminalInputForm.hidden = true;
  debugLocation.textContent = "";
  renderVariables([]);
  updateEditorMarks();
  createWorker();
}

function submitTerminalInput(event) {
  event.preventDefault();
  if (!waitingForInput || !session.request) return;
  session.inputs.push(terminalInputValue.value);
  startExecution(session.request, true);
}

function updateEditorMarks(hasError = false) {
  editor.markLine("next", hasError ? null : session.currentLine);
  editor.markLine("error", hasError ? session.currentLine : null);
}

function revealOutputOnSmallScreen() {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  const rect = outputPanel.getBoundingClientRect();
  if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
    outputPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderVariables(items) {
  // 한 줄씩 실행할 때만 직전 상태와 비교해 바뀐 변수를 강조합니다.
  const highlight = session.started && session.request?.mode !== "full";
  const previous = previousVariables;
  previousVariables = new Map(items.map((item) => [item.name, item.value]));

  if (!items.length) {
    variables.innerHTML = '<span class="muted">한 줄 실행하면 여기에 보여요.</span>';
    return;
  }

  variables.innerHTML = items.map((item) => {
    const changed = highlight && previous.get(item.name) !== item.value;
    return `
    <div class="variable-row${changed ? " changed" : ""}" title="${escapeHtml(item.name)} = ${escapeHtml(item.value)}${changed ? " (방금 바뀜)" : ""}">
      <span class="variable-name">${escapeHtml(item.name)} <small class="variable-type">${escapeHtml(item.type)}</small></span>
      <span class="variable-value">${escapeHtml(item.value)}</span>
    </div>
  `;
  }).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateControls() {
  const idle = isIdle();
  const busy = running || waitingForInput;
  runButton.disabled = !idle;
  stepButton.disabled = !idle || session.complete;
  cursorButton.disabled = !idle;
  backButton.disabled = !idle || session.executedCount <= 0;
  stopButton.disabled = !busy;
  resetButton.disabled = busy;
  exampleSelect.disabled = busy;
  fileButton.disabled = busy;
  fileInput.disabled = busy;
  openButton.disabled = busy;
  pyFileInput.disabled = busy;
  loadedFilesElement.querySelectorAll(".file-remove").forEach((button) => {
    button.disabled = busy;
  });
  editor.setReadOnly(busy);
}

function replaceCode(code) {
  editor.setValue(code);
  saveDraft();
  resetDebugSession(code.trimEnd(), true);
  editor.focus();
}

function renderExampleOptions() {
  for (const group of exampleGroups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    for (const example of group.examples) {
      optgroup.append(new Option(example.title, example.id));
    }
    exampleSelect.append(optgroup);
  }
}

function loadExample(name) {
  exampleSelect.value = "";
  const example = examples[name];
  if (!example) return;
  let { code } = example;
  if (name === "read" && loadedTextFiles.size) {
    const textFileName = loadedTextFiles.keys().next().value;
    code = `# 추가한 파일을 read()로 읽습니다\nwith open(${JSON.stringify(textFileName)}, "r", encoding="utf-8") as file:\n    content = file.read()\n\nprint(content)`;
  }
  if (editor.getValue().trim() && editor.getValue() !== code
    && !window.confirm("지금 코드를 예제로 바꿀까요?")) {
    return;
  }
  replaceCode(code);

  // 예제에 필요한 데이터 파일이 있으면 함께 추가합니다.
  const files = Object.entries(example.files || {});
  if (files.length) {
    for (const [fileName, content] of files) loadedTextFiles.set(fileName, content);
    renderLoadedFiles();
    renderOutput({ note: `${files.map(([fileName]) => fileName).join(", ")} 추가됨` });
  }
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, editor.getValue());
}

function setFileName(name) {
  fileName = name || DEFAULT_FILE_NAME;
  fileNameElement.textContent = fileName;
  localStorage.setItem(FILE_NAME_STORAGE_KEY, fileName);
}

function flashSaveStatus(message) {
  saveStatus.textContent = message;
  saveStatus.hidden = false;
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => { saveStatus.hidden = true; }, 2000);
}

function downloadCode() {
  const blob = new Blob([editor.getValue()], { type: "text/x-python;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.toLowerCase().endsWith(".py") ? fileName : `${fileName}.py`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flashSaveStatus(`${link.download} 저장됨`);
}

async function openPythonFile() {
  const file = pyFileInput.files?.[0];
  pyFileInput.value = "";
  if (!file) return;
  if (file.size > MAX_PYTHON_FILE_SIZE) {
    renderOutput({ error: `${file.name}: 1MB 이하만 열 수 있어요.` });
    return;
  }

  let code;
  try {
    code = await file.text();
  } catch {
    renderOutput({ error: `${file.name}: 읽지 못했어요.` });
    return;
  }

  if (editor.getValue().trim() && !window.confirm(`지금 코드를 ${file.name}(으)로 바꿀까요?`)) return;
  replaceCode(code.replaceAll("\r\n", "\n").replaceAll("\t", "    "));
  setFileName(file.name);
  renderOutput({ note: `${file.name} 열림` });
}

async function loadTextFiles() {
  const selectedFiles = Array.from(fileInput.files || []);
  fileInput.value = "";
  if (!selectedFiles.length) return;

  const errors = [];
  let loadedCount = 0;

  for (const file of selectedFiles) {
    const textFileName = file.name.replaceAll("\\", "/").split("/").pop().replaceAll("\0", "");
    if (!/\.(txt|csv)$/i.test(textFileName)) {
      errors.push(`${file.name}: TXT·CSV 파일만 추가할 수 있어요.`);
      continue;
    }
    if (file.size > MAX_TEXT_FILE_SIZE) {
      errors.push(`${textFileName}: 5MB 이하만 추가할 수 있어요.`);
      continue;
    }

    try {
      loadedTextFiles.set(textFileName, await file.text());
      loadedCount += 1;
    } catch {
      errors.push(`${textFileName}: 읽지 못했어요.`);
    }
  }

  renderLoadedFiles();
  resetDebugSession(editor.getValue().trimEnd(), false);

  const note = loadedCount
    ? `파일 ${loadedCount}개 추가됨 · open("파일 이름")으로 읽을 수 있어요.`
    : "";
  renderOutput({ note, error: errors.join("\n") });
}

function renderLoadedFiles() {
  loadedFilesElement.replaceChildren();
  fileShelf.hidden = !loadedTextFiles.size;
  if (!loadedTextFiles.size) {
    updateControls();
    return;
  }

  for (const textFileName of loadedTextFiles.keys()) {
    const chip = createSpan("file-chip", "");

    const name = createSpan("file-chip-name", textFileName);
    name.title = textFileName;

    const removeButton = document.createElement("button");
    removeButton.className = "file-remove";
    removeButton.type = "button";
    removeButton.dataset.fileName = textFileName;
    removeButton.title = `${textFileName} 제거`;
    removeButton.setAttribute("aria-label", `${textFileName} 제거`);
    removeButton.textContent = "×";

    chip.append(name, removeButton);
    loadedFilesElement.append(chip);
  }
  updateControls();
}

function handleShortcut(event) {
  if (event.target === terminalInputValue || event.target instanceof HTMLSelectElement) return;
  const ctrl = event.ctrlKey || event.metaKey;
  let action = null;

  if (event.key === "F10") {
    if (event.shiftKey) action = stepBack;
    else if (ctrl) action = runToCursor;
    else action = stepForward;
  } else if (event.altKey && !ctrl && !event.shiftKey) {
    // 크롬북처럼 F10 키가 없는 키보드를 위한 단축키입니다.
    if (event.key === "ArrowDown") action = stepForward;
    else if (event.key === "ArrowUp") action = stepBack;
    else if (event.key === "ArrowRight") action = runToCursor;
  } else if (ctrl && event.key === "Enter") {
    action = runFull;
  } else if (ctrl && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "s") {
    // 습관적으로 누르는 Ctrl+S가 웹페이지 저장 창을 띄우지 않게 합니다.
    action = () => flashSaveStatus("자동 저장돼요");
  }

  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

editor.onChange(() => {
  saveDraft();
  resetDebugSession(editor.getValue().trimEnd(), false);
});
document.addEventListener("keydown", handleShortcut, true);

runButton.addEventListener("click", runFull);
stopButton.addEventListener("click", stopCode);
stepButton.addEventListener("click", stepForward);
cursorButton.addEventListener("click", runToCursor);
backButton.addEventListener("click", stepBack);
resetButton.addEventListener("click", () => loadExample("hello"));
fileMenu.addEventListener("click", (event) => {
  if (event.target.closest(".menu-list button")) fileMenu.open = false;
});
document.addEventListener("click", (event) => {
  if (fileMenu.open && !fileMenu.contains(event.target)) fileMenu.open = false;
});
themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
exampleSelect.addEventListener("change", () => loadExample(exampleSelect.value));
fileButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", loadTextFiles);
openButton.addEventListener("click", () => pyFileInput.click());
pyFileInput.addEventListener("change", openPythonFile);
saveButton.addEventListener("click", downloadCode);
loadedFilesElement.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".file-remove");
  if (!removeButton || running || waitingForInput) return;
  loadedTextFiles.delete(removeButton.dataset.fileName);
  renderLoadedFiles();
  resetDebugSession(editor.getValue().trimEnd(), false);
  renderOutput({ note: "TXT 제거됨" });
});
terminalInputForm.addEventListener("submit", submitTerminalInput);
fontSizeDecrease.addEventListener("click", () => applyFontSize(fontSize - 1));
fontSizeIncrease.addEventListener("click", () => applyFontSize(fontSize + 1));
clearButton.addEventListener("click", () => {
  if (running) return;
  renderOutput();
  elapsedTime.textContent = "";
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.textContent);
    copyButton.textContent = "복사됨";
  } catch {
    copyButton.textContent = "실패";
  }
  setTimeout(() => { copyButton.textContent = "복사"; }, 1200);
});

renderExampleOptions();
editor.setValue(localStorage.getItem(STORAGE_KEY) ?? examples.hello.code);
setFileName(fileName);
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
renderLoadedFiles();
session = freshSession(editor.getValue().trimEnd());
applyFontSize(fontSize);
renderVariables([]);
updateEditorMarks();
createWorker();

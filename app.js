const PYODIDE_VERSION = "0.29.3";
const STORAGE_KEY = "python-classroom-runner:code";

const examples = {
  hello: `# 첫 번째 Python 프로그램\nname = "파이썬 교실"\nprint(f"안녕하세요, {name}!")\nprint("3 + 4 =", 3 + 4)`,
  loop: `# 1부터 10까지 짝수의 합\ntotal = 0\n\nfor number in range(1, 11):\n    if number % 2 == 0:\n        print("짝수:", number)\n        total += number\n\nprint("합계:", total)`,
  function: `# 함수 안으로도 한 줄씩 들어갈 수 있습니다\ndef celsius_to_fahrenheit(celsius):\n    result = celsius * 9 / 5 + 32\n    return result\n\nfor temperature in [0, 10, 25]:\n    converted = celsius_to_fahrenheit(temperature)\n    print(f"{temperature}°C → {converted:.1f}°F")`,
  input: `# input()을 만나면 터미널 입력창이 나타납니다\nname = input("이름: ")\nage = int(input("나이: "))\n\nprint(f"반가워요, {name}님!")\nprint(f"내년에는 {age + 1}살이 됩니다.")`,
};

const codeEditor = document.querySelector("#code-editor");
const lineNumbers = document.querySelector("#line-numbers");
const output = document.querySelector("#output");
const runButton = document.querySelector("#run-button");
const stopButton = document.querySelector("#stop-button");
const resetButton = document.querySelector("#reset-button");
const stepButton = document.querySelector("#step-button");
const cursorButton = document.querySelector("#cursor-button");
const backButton = document.querySelector("#back-button");
const copyButton = document.querySelector("#copy-button");
const exampleSelect = document.querySelector("#example-select");
const runtimeState = document.querySelector("#runtime-state");
const runtimeLabel = document.querySelector("#runtime-label");
const elapsedTime = document.querySelector("#elapsed-time");
const debugLocation = document.querySelector("#debug-location");
const debugMode = document.querySelector("#debug-mode");
const debugStepCount = document.querySelector("#debug-step-count");
const variables = document.querySelector("#variables");
const terminalInputForm = document.querySelector("#terminal-input");
const terminalInputValue = document.querySelector("#terminal-input-value");

let worker;
let workerReady = false;
let running = false;
let waitingForInput = false;
let startedAt = 0;

let session = freshSession("");

function freshSession(code) {
  return {
    code,
    inputs: [],
    executedCount: 0,
    currentLine: null,
    request: null,
    complete: false,
  };
}

function createWorker() {
  workerReady = false;
  setRuntimeState("loading", "Python 준비 중…");
  updateControls();
  worker = new Worker("./python-worker.js?v=2", { type: "module" });

  worker.addEventListener("message", handleWorkerMessage);
  worker.addEventListener("error", (event) => {
    running = false;
    waitingForInput = false;
    setRuntimeState("error", "Python을 불러오지 못했습니다");
    showOutput(`실행 환경 오류: ${event.message}\n\n인터넷 연결을 확인한 뒤 새로고침해 주세요.`, true);
    updateControls();
  });

  worker.postMessage({ type: "init", version: PYODIDE_VERSION });
}

function handleWorkerMessage({ data }) {
  if (data.type === "ready") {
    workerReady = true;
    setRuntimeState("ready", `Python ${data.pythonVersion} 준비됨`);
    updateControls();
    return;
  }

  if (data.type === "status") {
    runtimeLabel.textContent = data.message;
    return;
  }

  if (data.type === "result") {
    handleExecutionResult(data.result);
    return;
  }

  if (data.type === "error") {
    showOutput(data.message, true);
    finishExecution(true, "오류 발생");
  }
}

function handleExecutionResult(result) {
  renderVariables(result.variables || []);

  if (result.status === "input") {
    running = false;
    waitingForInput = true;
    session.currentLine = result.line || null;
    showOutput(result.output || result.prompt || "입력을 기다리는 중…");
    debugMode.textContent = "입력 대기";
    debugLocation.textContent = result.line ? `${result.line}번 줄` : "input()";
    setRuntimeState("loading", "프로그램 입력 대기 중…");
    terminalInputForm.hidden = false;
    terminalInputValue.value = "";
    terminalInputValue.placeholder = result.prompt ? `${result.prompt} 입력` : "값을 입력하고 Enter";
    updateLineNumbers();
    updateControls();
    requestAnimationFrame(() => terminalInputValue.focus());
    return;
  }

  session.executedCount = result.executedCount ?? session.executedCount;
  session.currentLine = result.line || null;
  terminalInputForm.hidden = true;

  if (result.status === "paused") {
    session.complete = false;
    showOutput(result.output || `[${result.line}번 줄을 실행하기 전에 멈췄습니다]`);
    debugMode.textContent = result.scope ? `${result.scope}에서 일시 정지` : "일시 정지";
    debugLocation.textContent = result.line ? `${result.line}번 줄` : "일시 정지";
    finishExecution(false, `${result.line}번 줄에서 멈춤`);
    revealLine(result.line);
    return;
  }

  if (result.status === "done") {
    session.complete = true;
    showOutput(result.output || "실행이 완료되었습니다. 출력 내용은 없습니다.");
    debugMode.textContent = "실행 완료";
    debugLocation.textContent = "끝";
    finishExecution(false, "실행 완료");
    return;
  }

  if (result.status === "error") {
    session.complete = false;
    const errorText = [result.output, result.error].filter(Boolean).join(result.output ? "\n" : "");
    showOutput(errorText, true);
    debugMode.textContent = "오류 발생";
    debugLocation.textContent = result.line ? `${result.line}번 줄` : "오류";
    finishExecution(true, "오류 발생");
  }
}

function setRuntimeState(state, label) {
  runtimeState.dataset.state = state;
  runtimeLabel.textContent = label;
}

function showOutput(text, isError = false) {
  output.textContent = text;
  output.classList.toggle("error", isError);
  output.scrollTop = output.scrollHeight;
}

function ensureSession() {
  const code = codeEditor.value.trimEnd();
  if (session.code !== code) resetDebugSession(code, false);
  return code;
}

function resetDebugSession(code = codeEditor.value.trimEnd(), clearOutput = true) {
  session = freshSession(code);
  running = false;
  waitingForInput = false;
  terminalInputForm.hidden = true;
  debugMode.textContent = "준비됨";
  debugLocation.textContent = "실행 전";
  renderVariables([]);
  if (clearOutput) showOutput("실행 버튼을 누르면 결과가 여기에 표시됩니다.");
  elapsedTime.textContent = "";
  updateLineNumbers();
  updateControls();
}

function startExecution(request, resume = false) {
  const code = ensureSession();
  if (!workerReady || running || (!resume && waitingForInput)) return;
  if (!code.trim()) {
    showOutput("실행할 코드를 입력해 주세요.", true);
    return;
  }

  session.request = request;
  running = true;
  waitingForInput = false;
  terminalInputForm.hidden = true;
  if (!resume) startedAt = performance.now();
  setRuntimeState("loading", "코드 실행 중…");
  debugMode.textContent = request.mode === "full" ? "전체 실행 중" : "디버그 실행 중";
  updateControls();

  worker.postMessage({
    type: "execute",
    code,
    inputs: session.inputs,
    request,
  });
}

function runFull() {
  resetDebugSession(codeEditor.value.trimEnd(), false);
  startExecution({ mode: "full" });
}

function stepForward() {
  const code = ensureSession();
  if (!code.trim() || session.complete) return;
  startExecution({
    mode: "step",
    targetExecuted: session.executedCount + 1,
  });
}

function stepBack() {
  ensureSession();
  if (session.executedCount <= 0) return;
  startExecution({
    mode: "step",
    targetExecuted: Math.max(0, session.executedCount - 1),
  });
}

function runToCursor() {
  const code = ensureSession();
  if (!code.trim()) return;
  if (session.complete) resetDebugSession(code, false);
  startExecution({
    mode: "cursor",
    targetLine: getCursorLine(),
    minimumEvents: session.executedCount,
  });
}

function finishExecution(hasError, label) {
  running = false;
  waitingForInput = false;
  const seconds = (performance.now() - startedAt) / 1000;
  elapsedTime.textContent = `${seconds.toFixed(2)}초`;
  debugStepCount.textContent = `${session.executedCount}줄 실행`;
  setRuntimeState(hasError ? "error" : "ready", label);
  updateLineNumbers();
  updateControls();
}

function stopCode() {
  if (!running && !waitingForInput) return;
  worker.terminate();
  const previousOutput = output.textContent;
  showOutput(`${previousOutput && !previousOutput.includes("실행 버튼") ? `${previousOutput}\n` : ""}[사용자가 실행을 중지했습니다]`, true);
  session = freshSession(codeEditor.value.trimEnd());
  running = false;
  waitingForInput = false;
  terminalInputForm.hidden = true;
  debugMode.textContent = "실행 중지";
  debugLocation.textContent = "중지됨";
  renderVariables([]);
  updateLineNumbers();
  createWorker();
}

function submitTerminalInput(event) {
  event.preventDefault();
  if (!waitingForInput || !session.request) return;
  session.inputs.push(terminalInputValue.value);
  startExecution(session.request, true);
}

function getCursorLine() {
  return codeEditor.value.slice(0, codeEditor.selectionStart).split("\n").length;
}

function updateLineNumbers() {
  const count = codeEditor.value.split("\n").length;
  const cursorLine = getCursorLine();
  lineNumbers.innerHTML = Array.from({ length: count }, (_, index) => {
    const line = index + 1;
    const classes = ["line-number"];
    if (line === session.currentLine) classes.push("active");
    if (line === cursorLine) classes.push("target");
    return `<span class="${classes.join(" ")}">${line}</span>`;
  }).join("");
  lineNumbers.scrollTop = codeEditor.scrollTop;
  debugStepCount.textContent = `${session.executedCount}줄 실행`;
}

function revealLine(line) {
  if (!line) return;
  const lineHeight = 23.8;
  const targetTop = (line - 1) * lineHeight;
  const visibleTop = codeEditor.scrollTop;
  const visibleBottom = visibleTop + codeEditor.clientHeight - lineHeight;
  if (targetTop < visibleTop || targetTop > visibleBottom) {
    codeEditor.scrollTop = Math.max(0, targetTop - codeEditor.clientHeight / 2);
  }
  updateLineNumbers();
}

function renderVariables(items) {
  if (!items.length) {
    variables.innerHTML = '<span class="muted">현재 표시할 변수가 없습니다.</span>';
    return;
  }

  variables.innerHTML = items.map((item) => `
    <div class="variable-row" title="${escapeHtml(item.name)} = ${escapeHtml(item.value)}">
      <span class="variable-name">${escapeHtml(item.name)} <small class="variable-type">${escapeHtml(item.type)}</small></span>
      <span class="variable-value">${escapeHtml(item.value)}</span>
    </div>
  `).join("");
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
  const idle = workerReady && !running && !waitingForInput;
  runButton.disabled = !idle;
  stepButton.disabled = !idle || session.complete;
  cursorButton.disabled = !idle;
  backButton.disabled = !idle || session.executedCount <= 0;
  stopButton.disabled = !running && !waitingForInput;
  resetButton.disabled = running || waitingForInput;
  exampleSelect.disabled = running || waitingForInput;
  codeEditor.readOnly = running || waitingForInput;
}

function loadExample(name, force = false) {
  const example = examples[name];
  if (!example) return;
  if (!force && codeEditor.value.trim() && !window.confirm("작성 중인 코드를 예제로 바꿀까요?")) {
    exampleSelect.value = "";
    return;
  }
  codeEditor.value = example;
  saveDraft();
  resetDebugSession(example, true);
  codeEditor.focus();
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, codeEditor.value);
}

codeEditor.addEventListener("input", () => {
  saveDraft();
  resetDebugSession(codeEditor.value.trimEnd(), false);
});
codeEditor.addEventListener("scroll", () => { lineNumbers.scrollTop = codeEditor.scrollTop; });
codeEditor.addEventListener("click", updateLineNumbers);
codeEditor.addEventListener("keyup", updateLineNumbers);
codeEditor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.setRangeText("    ", start, end, "end");
    codeEditor.dispatchEvent(new Event("input"));
    return;
  }

  if (event.key === "F10") {
    event.preventDefault();
    if (event.shiftKey) stepBack();
    else if (event.ctrlKey || event.metaKey) runToCursor();
    else stepForward();
    return;
  }

  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runFull();
  }
});

runButton.addEventListener("click", runFull);
stopButton.addEventListener("click", stopCode);
stepButton.addEventListener("click", stepForward);
cursorButton.addEventListener("click", runToCursor);
backButton.addEventListener("click", stepBack);
resetButton.addEventListener("click", () => loadExample("hello"));
exampleSelect.addEventListener("change", () => loadExample(exampleSelect.value));
terminalInputForm.addEventListener("submit", submitTerminalInput);

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.textContent);
    copyButton.textContent = "복사됨";
    setTimeout(() => { copyButton.textContent = "복사"; }, 1200);
  } catch {
    copyButton.textContent = "실패";
  }
});

codeEditor.value = localStorage.getItem(STORAGE_KEY) ?? examples.hello;
session = freshSession(codeEditor.value.trimEnd());
updateLineNumbers();
renderVariables([]);
createWorker();

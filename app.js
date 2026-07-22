const PYODIDE_VERSION = "0.29.3";
const STORAGE_KEY = "python-classroom-runner:code";
const STDIN_KEY = "python-classroom-runner:stdin";

const examples = {
  hello: {
    code: `# 첫 번째 Python 프로그램\nname = "파이썬 교실"\nprint(f"안녕하세요, {name}!")\nprint("3 + 4 =", 3 + 4)`,
    stdin: "",
  },
  loop: {
    code: `# 1부터 10까지 짝수의 합\ntotal = 0\n\nfor number in range(1, 11):\n    if number % 2 == 0:\n        print("짝수:", number)\n        total += number\n\nprint("합계:", total)`,
    stdin: "",
  },
  function: {
    code: `# 함수를 만들고 호출해 봅시다\ndef celsius_to_fahrenheit(celsius):\n    return celsius * 9 / 5 + 32\n\nfor temperature in [0, 10, 25, 30]:\n    result = celsius_to_fahrenheit(temperature)\n    print(f"{temperature}°C → {result:.1f}°F")`,
    stdin: "",
  },
  input: {
    code: `# 오른쪽 입력값 칸의 내용을 사용합니다\nname = input("이름: ")\nage = int(input("나이: "))\n\nprint(f"반가워요, {name}님!")\nprint(f"내년에는 {age + 1}살이 됩니다.")`,
    stdin: "홍길동\n15",
  },
};

const codeEditor = document.querySelector("#code-editor");
const stdinEditor = document.querySelector("#stdin-editor");
const lineNumbers = document.querySelector("#line-numbers");
const output = document.querySelector("#output");
const runButton = document.querySelector("#run-button");
const stopButton = document.querySelector("#stop-button");
const resetButton = document.querySelector("#reset-button");
const copyButton = document.querySelector("#copy-button");
const exampleSelect = document.querySelector("#example-select");
const runtimeState = document.querySelector("#runtime-state");
const runtimeLabel = document.querySelector("#runtime-label");
const elapsedTime = document.querySelector("#elapsed-time");

let worker;
let workerReady = false;
let running = false;
let startedAt = 0;
let runOutput = "";

function createWorker() {
  workerReady = false;
  setRuntimeState("loading", "Python 준비 중…");
  runButton.disabled = true;
  worker = new Worker("./python-worker.js", { type: "module" });

  worker.addEventListener("message", handleWorkerMessage);
  worker.addEventListener("error", (event) => {
    finishRun(true);
    setRuntimeState("error", "Python을 불러오지 못했습니다");
    showOutput(`실행 환경 오류: ${event.message}\n\n인터넷 연결을 확인한 뒤 새로고침해 주세요.`, true);
  });

  worker.postMessage({ type: "init", version: PYODIDE_VERSION });
}

function handleWorkerMessage({ data }) {
  if (data.type === "ready") {
    workerReady = true;
    runButton.disabled = false;
    setRuntimeState("ready", `Python ${data.pythonVersion} 준비됨`);
    return;
  }

  if (data.type === "status") {
    runtimeLabel.textContent = data.message;
    return;
  }

  if (data.type === "stream") {
    runOutput += data.text;
    showOutput(runOutput || " ", data.stream === "stderr");
    output.scrollTop = output.scrollHeight;
    return;
  }

  if (data.type === "done") {
    if (!runOutput) showOutput("실행이 완료되었습니다. 출력 내용은 없습니다.");
    finishRun(false);
    return;
  }

  if (data.type === "error") {
    runOutput += `${runOutput && !runOutput.endsWith("\n") ? "\n" : ""}${data.message}`;
    showOutput(runOutput, true);
    finishRun(true);
  }
}

function setRuntimeState(state, label) {
  runtimeState.dataset.state = state;
  runtimeLabel.textContent = label;
}

function showOutput(text, isError = false) {
  output.textContent = text;
  output.classList.toggle("error", isError);
}

function runCode() {
  if (!workerReady || running) return;
  const code = codeEditor.value.trimEnd();
  if (!code.trim()) {
    showOutput("실행할 코드를 입력해 주세요.", true);
    return;
  }

  running = true;
  startedAt = performance.now();
  runOutput = "";
  elapsedTime.textContent = "";
  showOutput("실행 중…");
  runButton.disabled = true;
  stopButton.disabled = false;
  resetButton.disabled = true;
  exampleSelect.disabled = true;
  setRuntimeState("loading", "코드 실행 중…");
  worker.postMessage({ type: "run", code, stdin: stdinEditor.value });
}

function finishRun(hasError) {
  if (!running) return;
  running = false;
  const seconds = (performance.now() - startedAt) / 1000;
  elapsedTime.textContent = `${seconds.toFixed(2)}초`;
  runButton.disabled = !workerReady;
  stopButton.disabled = true;
  resetButton.disabled = false;
  exampleSelect.disabled = false;
  setRuntimeState(hasError ? "error" : "ready", hasError ? "오류 발생" : "실행 완료");
}

function stopCode() {
  if (!running) return;
  worker.terminate();
  runOutput += `${runOutput && !runOutput.endsWith("\n") ? "\n" : ""}\n[사용자가 실행을 중지했습니다]`;
  showOutput(runOutput, true);
  finishRun(true);
  createWorker();
}

function updateLineNumbers() {
  const count = codeEditor.value.split("\n").length;
  lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
  lineNumbers.scrollTop = codeEditor.scrollTop;
}

function loadExample(name, force = false) {
  const example = examples[name];
  if (!example) return;
  if (!force && codeEditor.value.trim() && !window.confirm("작성 중인 코드를 예제로 바꿀까요?")) {
    exampleSelect.value = "";
    return;
  }
  codeEditor.value = example.code;
  stdinEditor.value = example.stdin;
  saveDraft();
  updateLineNumbers();
  codeEditor.focus();
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, codeEditor.value);
  localStorage.setItem(STDIN_KEY, stdinEditor.value);
}

codeEditor.addEventListener("input", () => {
  saveDraft();
  updateLineNumbers();
});

codeEditor.addEventListener("scroll", () => { lineNumbers.scrollTop = codeEditor.scrollTop; });
codeEditor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.setRangeText("    ", start, end, "end");
    codeEditor.dispatchEvent(new Event("input"));
  }
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runCode();
  }
});

stdinEditor.addEventListener("input", saveDraft);
runButton.addEventListener("click", runCode);
stopButton.addEventListener("click", stopCode);
resetButton.addEventListener("click", () => loadExample("hello"));
exampleSelect.addEventListener("change", () => loadExample(exampleSelect.value));

copyButton.addEventListener("click", async () => {
  const text = output.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "복사됨";
    setTimeout(() => { copyButton.textContent = "복사"; }, 1200);
  } catch {
    copyButton.textContent = "실패";
  }
});

const savedCode = localStorage.getItem(STORAGE_KEY);
codeEditor.value = savedCode ?? examples.hello.code;
stdinEditor.value = localStorage.getItem(STDIN_KEY) ?? "";
updateLineNumbers();
createWorker();

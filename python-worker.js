let pyodide;
let initialized = false;

self.addEventListener("message", async ({ data }) => {
  if (data.type === "init") {
    await initialize(data.version);
    return;
  }

  if (data.type === "run" && initialized) {
    await execute(data.code, data.stdin);
  }
});

async function initialize(version) {
  try {
    const indexURL = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;
    const { loadPyodide } = await import(`${indexURL}pyodide.mjs`);
    pyodide = await loadPyodide({ indexURL });
    const pythonVersion = pyodide.runPython("import sys; '.'.join(map(str, sys.version_info[:3]))");
    initialized = true;
    self.postMessage({ type: "ready", pythonVersion });
  } catch (error) {
    self.postMessage({ type: "error", message: formatError(error) });
  }
}

async function execute(code, stdinText = "") {
  const inputLines = String(stdinText).replace(/\r\n/g, "\n").split("\n");
  let inputIndex = 0;

  pyodide.setStdout({ batched: (text) => emit("stdout", `${text}\n`) });
  pyodide.setStderr({ batched: (text) => emit("stderr", `${text}\n`) });
  pyodide.setStdin({
    stdin: () => inputLines[inputIndex++] ?? "",
    isatty: false,
  });

  try {
    self.postMessage({ type: "status", message: "필요한 패키지 확인 중…" });
    await pyodide.loadPackagesFromImports(code, {
      messageCallback: (message) => self.postMessage({ type: "status", message }),
      errorCallback: (message) => emit("stderr", `${message}\n`),
    });
    self.postMessage({ type: "status", message: "코드 실행 중…" });
    await pyodide.runPythonAsync(code);
    self.postMessage({ type: "done" });
  } catch (error) {
    self.postMessage({ type: "error", message: formatError(error) });
  }
}

function emit(stream, text) {
  self.postMessage({ type: "stream", stream, text });
}

function formatError(error) {
  const message = error?.message || String(error);
  return message.replace(/^PythonError:\s*/, "");
}

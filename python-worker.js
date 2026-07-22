let pyodide;
let initialized = false;
let busy = false;
let mountedTextFileNames = new Set();

const PYTHON_RUNNER = String.raw`
import builtins as _builtins
import contextlib as _contextlib
import inspect as _inspect
import io as _io
import json as _json
import sys as _sys
import traceback as _traceback
import types as _types

_code = str(__runner_code)
_inputs = _json.loads(str(__runner_inputs_json))
_request = _json.loads(str(__runner_request_json))
_output = _io.StringIO()
_input_index = 0
_trace_count = 0

class _PauseExecution(BaseException):
    def __init__(self, frame):
        self.frame = frame

class _InputNeeded(BaseException):
    def __init__(self, prompt, frame):
        self.prompt = prompt
        self.frame = frame

def _safe_repr(value):
    try:
        text = repr(value)
    except BaseException:
        text = "<표시할 수 없는 값>"
    if len(text) > 180:
        text = text[:177] + "..."
    return text

def _snapshot(mapping):
    rows = []
    for name in sorted(mapping):
        if name.startswith("__") or name.startswith("_classroom_"):
            continue
        try:
            value = mapping[name]
            if isinstance(value, _types.ModuleType) or _inspect.isfunction(value) or _inspect.isclass(value):
                continue
            rows.append({
                "name": str(name),
                "type": type(value).__name__,
                "value": _safe_repr(value),
            })
        except BaseException:
            continue
        if len(rows) >= 60:
            break
    return rows

def _student_line_from_exception(error):
    line = None
    tb = error.__traceback__
    while tb:
        if tb.tb_frame.f_code.co_filename == "<student>":
            line = tb.tb_lineno
        tb = tb.tb_next
    if line is None and isinstance(error, SyntaxError):
        line = error.lineno
    return line

def _format_exception(error):
    if isinstance(error, SyntaxError):
        return "".join(_traceback.format_exception_only(type(error), error))
    tb = error.__traceback__
    while tb and tb.tb_frame.f_code.co_filename != "<student>":
        tb = tb.tb_next
    return "".join(_traceback.format_exception(type(error), error, tb))

def _classroom_input(prompt=""):
    global _input_index
    prompt_text = str(prompt)
    _output.write(prompt_text)
    if _input_index < len(_inputs):
        value = str(_inputs[_input_index])
        _input_index += 1
        _output.write(value + "\n")
        return value
    raise _InputNeeded(prompt_text, _sys._getframe(1))

def _tracer(frame, event, arg):
    global _trace_count
    if event == "line" and frame.f_code.co_filename == "<student>":
        _trace_count += 1
        mode = _request.get("mode")
        should_pause = False
        if mode == "step":
            should_pause = _trace_count > int(_request.get("targetExecuted", 0))
        elif mode == "cursor":
            minimum = int(_request.get("minimumEvents", 0))
            target_line = int(_request.get("targetLine", 0))
            should_pause = _trace_count > minimum and frame.f_lineno == target_line
        if should_pause:
            raise _PauseExecution(frame)
    return _tracer

_environment = {
    "__name__": "__main__",
    "__file__": "main.py",
}
_student_builtins = dict(vars(_builtins))
_student_builtins["input"] = _classroom_input
_environment["__builtins__"] = _student_builtins

_result = None
try:
    _compiled = compile(_code, "<student>", "exec")
    with _contextlib.redirect_stdout(_output), _contextlib.redirect_stderr(_output):
        _sys.settrace(_tracer)
        try:
            exec(_compiled, _environment, _environment)
        finally:
            _sys.settrace(None)
    _result = {
        "status": "done",
        "output": _output.getvalue(),
        "executedCount": _trace_count,
        "line": None,
        "scope": "__main__",
        "variables": _snapshot(_environment),
    }
except _PauseExecution as paused:
    _sys.settrace(None)
    _result = {
        "status": "paused",
        "output": _output.getvalue(),
        "executedCount": max(0, _trace_count - 1),
        "line": paused.frame.f_lineno,
        "scope": paused.frame.f_code.co_name,
        "variables": _snapshot(paused.frame.f_locals),
    }
except _InputNeeded as needed:
    _sys.settrace(None)
    _result = {
        "status": "input",
        "output": _output.getvalue(),
        "executedCount": max(0, _trace_count - 1),
        "line": needed.frame.f_lineno if needed.frame.f_code.co_filename == "<student>" else None,
        "scope": needed.frame.f_code.co_name,
        "prompt": needed.prompt,
        "variables": _snapshot(needed.frame.f_locals),
    }
except BaseException as error:
    _sys.settrace(None)
    _result = {
        "status": "error",
        "output": _output.getvalue(),
        "executedCount": _trace_count,
        "line": _student_line_from_exception(error),
        "scope": None,
        "variables": [],
        "error": _format_exception(error),
    }

_json.dumps(_result, ensure_ascii=False)
`;

self.addEventListener("message", async ({ data }) => {
  if (data.type === "init") {
    await initialize(data.version);
    return;
  }

  if (data.type === "execute" && initialized && !busy) {
    await execute(data.code, data.inputs, data.request, data.files);
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

async function execute(code, inputs = [], request = { mode: "full" }, files = []) {
  busy = true;
  try {
    self.postMessage({ type: "status", message: "필요한 패키지 확인 중…" });
    await pyodide.loadPackagesFromImports(code);
    self.postMessage({ type: "status", message: "코드 실행 중…" });

    mountTextFiles(files);

    pyodide.globals.set("__runner_code", code);
    pyodide.globals.set("__runner_inputs_json", JSON.stringify(inputs));
    pyodide.globals.set("__runner_request_json", JSON.stringify(request));

    const resultJson = await pyodide.runPythonAsync(PYTHON_RUNNER);
    const result = JSON.parse(resultJson);
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", message: formatError(error) });
  } finally {
    busy = false;
  }
}

function mountTextFiles(files) {
  for (const fileName of mountedTextFileNames) {
    try {
      pyodide.FS.unlink(fileName);
    } catch {
      // 학생 코드가 파일을 지웠거나 옮긴 경우에는 이미 없는 상태입니다.
    }
  }

  const nextFileNames = new Set();
  for (const file of files || []) {
    const fileName = safeTextFileName(file?.name);
    if (!fileName) continue;
    pyodide.FS.writeFile(fileName, String(file.content ?? ""), { encoding: "utf8" });
    nextFileNames.add(fileName);
  }
  mountedTextFileNames = nextFileNames;
}

function safeTextFileName(value) {
  const fileName = String(value ?? "").replaceAll("\\", "/").split("/").pop().replaceAll("\0", "");
  return fileName && fileName.toLowerCase().endsWith(".txt") ? fileName : "";
}

function formatError(error) {
  const message = error?.message || String(error);
  return message.replace(/^PythonError:\s*/, "");
}

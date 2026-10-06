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
import linecache as _linecache
import sys as _sys
import time as _time
import traceback as _traceback
import types as _types

_FILENAME = "main.py"
_OUTPUT_LIMIT = 500_000
_FLUSH_INTERVAL = 0.05

_code = str(__runner_code)
_inputs = _json.loads(str(__runner_inputs_json))
_request = _json.loads(str(__runner_request_json))
_stream = bool(_request.get("stream"))
_emit = __runner_emit
_input_index = 0
_trace_count = 0

# 오류 메시지에 학생 코드 줄이 함께 보이도록 소스를 등록합니다.
_linecache.cache[_FILENAME] = (len(_code), None, _code.splitlines(True), _FILENAME)

class _StreamOutput(_io.TextIOBase):
    """출력을 모아 두었다가 실행 중에도 조금씩 화면으로 보냅니다."""

    def __init__(self):
        self._parts = []
        self._pending = []
        self._size = 0
        self._last_flush = 0.0
        self._truncated = False

    def writable(self):
        return True

    def write(self, text):
        text = str(text)
        length = len(text)
        if self._truncated:
            return length
        if self._size + length > _OUTPUT_LIMIT:
            text = text[: max(0, _OUTPUT_LIMIT - self._size)] + "\n[출력이 너무 많아 이후 내용은 생략합니다]\n"
            self._truncated = True
        self._parts.append(text)
        self._pending.append(text)
        self._size += len(text)
        if self._truncated or ("\n" in text and _time.monotonic() - self._last_flush >= _FLUSH_INTERVAL):
            self.flush()
        return length

    def flush(self):
        if _stream and self._pending:
            _emit("".join(self._pending))
        self._pending = []
        self._last_flush = _time.monotonic()

    def getvalue(self):
        return "".join(self._parts)

_output = _StreamOutput()
_original_sleep = _time.sleep

def _classroom_sleep(seconds):
    # 기다리기 전에 지금까지의 출력을 먼저 보여 줍니다.
    _output.flush()
    return _original_sleep(seconds)

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
        if tb.tb_frame.f_code.co_filename == _FILENAME:
            line = tb.tb_lineno
        tb = tb.tb_next
    if line is None and isinstance(error, SyntaxError):
        line = error.lineno
    return line

def _format_exception(error):
    if isinstance(error, SyntaxError):
        return "".join(_traceback.format_exception_only(type(error), error))
    tb = error.__traceback__
    while tb and tb.tb_frame.f_code.co_filename != _FILENAME:
        tb = tb.tb_next
    return "".join(_traceback.format_exception(type(error), error, tb))

def _error_hint(error):
    message = str(error.msg if isinstance(error, SyntaxError) else error)

    if isinstance(error, TabError):
        return "탭과 스페이스가 섞였어요. 스페이스 4칸으로 맞춰 보세요."
    if isinstance(error, IndentationError):
        if "expected an indented block" in message:
            return "콜론(:) 다음 줄은 4칸 들여써야 해요."
        if "unexpected indent" in message:
            return "들여쓰지 않아도 되는 줄이에요. 앞 공백을 지워 보세요."
        if "unindent does not match" in message:
            return "같은 블록의 줄은 들여쓰기 칸 수가 같아야 해요."
        return "들여쓰기 칸 수를 확인해 보세요."
    if isinstance(error, SyntaxError):
        if "expected ':'" in message:
            return "줄 끝에 콜론(:)이 빠졌어요."
        if "was never closed" in message:
            return "괄호가 닫히지 않았어요. 윗줄도 확인해 보세요."
        if "unmatched" in message or "does not match opening" in message:
            return "괄호 짝이 맞지 않아요."
        if "unterminated" in message:
            return "따옴표가 닫히지 않았어요."
        if "invalid character" in message or "non-printable" in message:
            return "쓸 수 없는 문자가 있어요. 전각 기호(“ ” （ ）)가 섞였는지 보세요."
        if "Missing parentheses in call to 'print'" in message:
            return "print 뒤에 괄호가 필요해요. 예: print(\"안녕\")"
        if "Maybe you meant '=='" in message:
            return "비교할 때는 = 대신 == 를 써요."
        if "forgot a comma" in message:
            return "쉼표(,)가 빠진 것 같아요."
        if "invalid decimal literal" in message:
            return "이름은 숫자로 시작할 수 없어요."
        if "outside function" in message:
            return "return은 함수 안에서만 쓸 수 있어요."
        if "outside loop" in message:
            return "break와 continue는 반복문 안에서만 쓸 수 있어요."
        return "오타나 빠진 괄호·따옴표·콜론이 있는지 보세요. 윗줄이 원인일 때도 많아요."

    if isinstance(error, UnboundLocalError):
        return "함수 안에서 값을 넣기 전에 변수를 썼어요."
    if isinstance(error, NameError):
        name = getattr(error, "name", None) or "이 이름"
        return f"'{name}'이(가) 없어요. 철자를 확인하거나, 글자라면 따옴표로 감싸세요."
    if isinstance(error, TypeError):
        if "can only concatenate str" in message or ("unsupported operand" in message and "'str'" in message):
            return "글자와 숫자는 바로 계산할 수 없어요. int()나 str()로 맞춰 보세요."
        if "not supported between instances" in message:
            return "글자와 숫자는 비교할 수 없어요. int()로 바꿔 보세요."
        if "required positional argument" in message:
            return "함수에 넘길 값이 빠졌어요."
        if "positional argument" in message and "given" in message:
            return "함수에 넘긴 값의 개수가 맞지 않아요."
        if "is not callable" in message:
            return "함수가 아닌 것을 호출했어요. 변수 이름이 함수 이름과 겹치는지 보세요."
        if "not subscriptable" in message:
            return "[ ]로 꺼낼 수 없는 값이에요."
        if "not iterable" in message:
            return "for로 반복할 수 없는 값이에요. 숫자라면 range()를 쓰세요."
        if "indices must be integers" in message:
            return "인덱스는 정수여야 해요. int()로 바꿔 보세요."
        if "can't multiply sequence" in message:
            return "글자에는 정수만 곱할 수 있어요. int()로 바꿔 보세요."
        return "자료형이 맞지 않아요. type()으로 확인해 보세요."
    if isinstance(error, UnicodeDecodeError):
        return "인코딩이 달라요. encoding=\"cp949\"로 바꿔 보세요."
    if isinstance(error, ValueError):
        if "invalid literal for int()" in message:
            return "숫자가 아닌 값은 int()로 바꿀 수 없어요."
        if "could not convert string to float" in message:
            return "숫자가 아닌 값은 float()로 바꿀 수 없어요."
        if "values to unpack" in message:
            return "= 양쪽의 개수가 맞지 않아요."
        return None
    if isinstance(error, ZeroDivisionError):
        return "0으로 나눌 수 없어요."
    if isinstance(error, IndexError):
        return "범위를 벗어났어요. 인덱스는 0부터 len()-1까지예요."
    if isinstance(error, KeyError):
        return f"딕셔너리에 {message} 키가 없어요."
    if isinstance(error, AttributeError):
        if "'NoneType'" in message:
            return "값이 None이에요. 결과를 돌려주지 않는 함수의 결과를 썼는지 보세요."
        return "이 자료형에는 그런 기능이 없어요. 철자를 확인해 보세요."
    if isinstance(error, FileNotFoundError):
        return "파일이 없어요. [파일 → TXT 추가]로 먼저 추가하세요."
    if isinstance(error, ModuleNotFoundError):
        return "여기서는 쓸 수 없는 모듈이에요."
    if isinstance(error, RecursionError):
        return "함수가 끝없이 자기 자신을 불렀어요. 멈추는 조건을 확인하세요."
    return None

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
    if event == "line" and frame.f_code.co_filename == _FILENAME:
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
    _compiled = compile(_code, _FILENAME, "exec")
    with _contextlib.redirect_stdout(_output), _contextlib.redirect_stderr(_output):
        _time.sleep = _classroom_sleep
        _sys.settrace(_tracer)
        try:
            exec(_compiled, _environment, _environment)
        finally:
            _sys.settrace(None)
            _time.sleep = _original_sleep
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
        "line": needed.frame.f_lineno if needed.frame.f_code.co_filename == _FILENAME else None,
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
        "hint": _error_hint(error),
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
    self.postMessage({ type: "status", message: "패키지 확인 중…" });
    await pyodide.loadPackagesFromImports(code);
    self.postMessage({ type: "status", message: "실행 중…" });

    mountTextFiles(files);

    pyodide.globals.set("__runner_code", code);
    pyodide.globals.set("__runner_inputs_json", JSON.stringify(inputs));
    pyodide.globals.set("__runner_request_json", JSON.stringify(request));
    pyodide.globals.set("__runner_emit", (text) => self.postMessage({ type: "stdout", text }));

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

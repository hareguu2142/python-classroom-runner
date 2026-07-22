# 파이썬 교실

설치 없이 브라우저에서 Python 코드를 작성하고 실행하는 수업용 실습기입니다. Python은 [Pyodide](https://pyodide.org/)를 통해 학생의 브라우저 안에서 실행됩니다.

## 주요 기능

- Python 3 코드 작성 및 실행
- `print()` 출력과 오류 메시지 표시
- 줄 단위 입력값을 이용한 `input()` 지원
- 무한 반복 등 장시간 실행 중지
- 예제 코드 제공
- 작성 중인 코드를 브라우저에 자동 저장
- 모바일 화면 대응

## 로컬 실행

ES module과 Web Worker를 사용하므로 HTML 파일을 직접 열지 말고 간단한 웹 서버로 실행합니다.

```powershell
python -m http.server 8000
```

브라우저에서 <http://localhost:8000>을 엽니다.

## 배포

별도의 백엔드 없이 GitHub Pages에서 동작합니다. 최초 로딩과 일부 패키지 사용에는 인터넷 연결이 필요합니다.

## 라이선스

[MIT](./LICENSE)

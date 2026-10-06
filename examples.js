// 예제 코드 목록입니다. 수업 PPT(비상교육 고등 정보 Ⅲ-2)의 프로그램 예제를 실행할 수 있게 옮겼습니다.
// py`...` 안의 내용은 그대로 Python 코드가 됩니다(백슬래시도 그대로 유지).
const py = (strings) => strings.raw[0].replace(/^\n/, "").replace(/\n$/, "");

const CLIMATE_NOTE = "# 먼저 [파일 → TXT·CSV 추가]로 '대한민국 기후 통계.csv'를 추가하세요.";

export const exampleGroups = [
  {
    label: "기본",
    examples: [
      {
        id: "hello",
        title: "첫 프로그램",
        code: py`
# 첫 번째 Python 프로그램
name = "파이썬 교실"
print(f"안녕하세요, {name}!")
print("3 + 4 =", 3 + 4)
`,
      },
      {
        id: "loop",
        title: "반복문",
        code: py`
# 1부터 10까지 짝수의 합
total = 0

for number in range(1, 11):
    if number % 2 == 0:
        print("짝수:", number)
        total += number

print("합계:", total)
`,
      },
      {
        id: "function",
        title: "함수",
        code: py`
# 함수 안으로도 한 줄씩 들어갈 수 있습니다
def celsius_to_fahrenheit(celsius):
    result = celsius * 9 / 5 + 32
    return result

for temperature in [0, 10, 25]:
    converted = celsius_to_fahrenheit(temperature)
    print(f"{temperature}°C → {converted:.1f}°F")
`,
      },
      {
        id: "input",
        title: "입력받기",
        code: py`
# input()을 만나면 터미널 입력창이 나타납니다
name = input("이름: ")
age = int(input("나이: "))

print(f"반가워요, {name}님!")
print(f"내년에는 {age + 1}살이 됩니다.")
`,
      },
      {
        id: "read",
        title: "TXT 읽기",
        code: py`
# 먼저 [파일 → TXT·CSV 추가]로 sample.txt 파일을 추가하세요
with open("sample.txt", "r", encoding="utf-8") as file:
    content = file.read()

print(content)
`,
      },
    ],
  },
  {
    label: "3-2-1 자료형",
    examples: [
      {
        id: "1-str",
        title: "문자 자료형",
        code: py`
print('computer')           # 문자열로 인식
print("안녕하세요!")         # 문자열로 인식
print(type("안녕하세요!"))
print("1024")               # 숫자지만 문자열로 인식
print(type("1024"))
print(type(""))             # 내용 없는 문자열로 인식
`,
      },
      {
        id: "1-str-error",
        title: "따옴표 오류 (오류 예제)",
        code: py`
# 오류가 나는 코드입니다. 한 줄씩 # 을 지우고 실행해 보세요.
# print(안녕하세요!)                   # 따옴표 미사용으로 인한 구문 오류
# print('안녕하세요!")                 # 따옴표를 혼용하여 구문 오류
# print('그가 '사랑해'라고 말했다.')   # 문자열 안의 따옴표와 충돌
`,
      },
      {
        id: "1-quote",
        title: "따옴표 충돌 해결",
        code: py`
print("그가 '사랑해'라고 말했다.")       # 따옴표를 구분하여 사용하기
print('그가 \'사랑해\'라고 말했다.')     # 이스케이프 문자 사용하기
print('''그가 '사랑해'라고 말했다.''')   # """ """ 또는 ''' ''' 사용하기
`,
      },
      {
        id: "1-number",
        title: "숫자 자료형",
        code: py`
print(12)
print(type(12))         # 정수형으로 인식
print(21.4)
print(type(21.4))       # 실수형으로 인식
print(type(-7))         # 정수형으로 인식
print(type(3.14))       # 실수형으로 인식
`,
      },
      {
        id: "1-float-error",
        title: "실수의 반올림 오차",
        code: py`
print(0.3)
print(0.1 + 0.2)
`,
      },
      {
        id: "1-str-op",
        title: "문자열 연산",
        code: py`
print('안녕' + '하세요')    # 문자열 연결
print('안녕!' * 3)          # 문자열 반복
print(2 * '반가워!')        # 문자열 반복

# 아래는 오류가 나는 코드입니다. 한 줄씩 # 을 지우고 실행해 보세요.
# print(7 + '월')           # 숫자 연결 불가
# print('오류!' * 3.0)      # 실수형 입력
`,
      },
      {
        id: "1-num-op",
        title: "숫자 연산자",
        code: py`
print(7 + 5)      # 덧셈
print(12 * 3)     # 곱셈
print(12 - 3)     # 뺄셈
print(11 / 4)     # 나눗셈
print(12 // 3)    # 나눗셈 몫
print(15 % 7)     # 나눗셈 나머지
print(2 ** 4)     # 거듭제곱
`,
      },
      {
        id: "1-num-op2",
        title: "숫자 연산과 우선순위",
        code: py`
print(7.1 + 2.9)    # 실수형 덧셈
print(75.2 // 3)    # 실수형이 포함된 몫
print(11 / 4)       # 결과는 실수형
print(2 ** 4 - 6)   # 연산자 우선순위
print(10 / 2 - 1)

# 아래는 오류가 나는 코드입니다. # 을 지우고 실행해 보세요.
# print(-78 / 0)    # 나누는 수가 0
`,
      },
      {
        id: "1-practice",
        title: "연산 결과 확인해 보기",
        code: py`
print('com' + 'puter')
print(3 + 1.0)
print(3.5 * 2)
print(14 - 22)
print(12 / 3)
print(11.5 // 2)
print(-14 % 5)
print(3 ** 2)

# 아래는 오류가 나는 연산입니다. 한 줄씩 # 을 지우고 실행해 보세요.
# print('좋아' * '4')
# print(1 + '학년')
# print('12' / 3)
# print(59 / 0)
`,
      },
      {
        id: "1-operator",
        title: "실행 결과에 맞는 연산자",
        code: py`
print('자' + '료')     # 자료
print('컴' * 4)        # 컴컴컴컴
print(45 + 7)          # 52
print(3 ** 4)          # 81
print(3 / 1)           # 3.0
print(15 // 2.0)       # 7.0
`,
      },
      {
        id: "1-convert",
        title: "자료형 변환",
        code: py`
print(type(str(12.5)))
print(type(int('3')))
print(type(float('1.2')))

print(str(1) + '학년')       # 문자열로 변환
print(int(3.141592))         # 정수형으로 변환
print(float(57))             # 실수형으로 변환
print(str(11.0) * 3)         # 문자열로 변환
print(int(32.41 / 2.3))      # 정수형으로 변환
`,
      },
      {
        id: "1-score",
        title: "점수에 10점 더하기",
        code: py`
score = '81.2'              # score에 문자열 81.2가 저장
print(score + '점')         # 변경 전 score 출력
score = float(score)        # score에 저장된 값을 실수형으로 변경
score = score + 10          # score에 저장된 값을 10 증가
score = str(score)          # score에 저장된 값을 문자열로 변경
print(score + '점')         # 변경 후 score 출력
`,
      },
      {
        id: "1-real-data",
        title: "실생활 자료의 자료형",
        code: py`
# 검색한 자료를 넣어 자료형을 확인해 보세요.
print(type(21.2))      # 기온
print(type(23))        # 순위
print(type('콩고'))    # 국가명
print(type(676.6))     # 탄소 배출량
`,
      },
    ],
  },
  {
    label: "3-2-2 다차원 데이터 구조",
    examples: [
      {
        id: "2-variable",
        title: "변수",
        code: py`
pi = 3          # pi라는 변수를 선언하고 3을 저장한다.
print(pi)       # pi에 저장된 값 3을 출력
pi = 3.14       # 변수 pi에 저장된 값을 3.14로 변경
print(pi)       # pi에 저장된 값 3.14를 출력
`,
      },
      {
        id: "2-index",
        title: "인덱싱과 슬라이싱",
        code: py`
ex_list = ['KANG', 'W', 158.7, 103, 1.4]
print(ex_list[1])               # 1번 요소 인덱싱
print(ex_list[1:4])             # 1번부터 3번까지 슬라이싱
ex_list[4] = 1.3                # 인덱싱을 이용한 요소 변경
print(ex_list)
ex_list[2:4] = [160.1, 98]      # 다수의 요소 변경
print(ex_list)
`,
      },
      {
        id: "2-index-practice",
        title: "인덱싱·슬라이싱 적용하기",
        code: py`
list_a = ['별', 9, '바람', 15, '시인', 3, '노래', 2]
list_b = ['어쩌면', '별들이', '너의', '슬픔을', '가져갈지도', '몰라']
print(list_a[2])        # 바람
print(list_a[5:8])      # [3, '노래', 2]
print(list_b[3])        # 슬픔을
print(list_b[3:5])      # ['슬픔을', '가져갈지도']
`,
      },
      {
        id: "2-add-remove",
        title: "요소 추가와 삭제",
        code: py`
ex_list = [2, 'blue', 0.3, '태양', -35]
ex_list.append('노을')     # 리스트에 요소 '노을' 추가하기
print(ex_list)
ex_list.insert(3, 2)       # 3번 인덱스에 요소 2 추가하기
print(ex_list)

ex_list.pop(2)             # 2번 인덱스의 요소 삭제
print(ex_list)
ex_list.remove(2)          # 처음 나오는 요소 2 삭제
print(ex_list)
del ex_list[4]             # 4번 인덱스의 요소 삭제
print(ex_list)
`,
      },
      {
        id: "2-list-func",
        title: "리스트 함수",
        code: py`
ex_list = [1, 27, -8.0, 1, -25, 0, 6.8, 1, 0]
print(ex_list.count(1))       # 요소 1이 몇 개 있는지 조사하기
ex_list.reverse()             # 요소들을 역순으로 나열하기
print(ex_list)
ex_list.sort()                # 요소들을 오름차순으로 정렬하기
print(ex_list)
print(ex_list.index(6.8))     # 요소 6.8의 인덱스 조사하기
print(len(ex_list))           # 리스트의 요소 개수 조사하기
`,
      },
      {
        id: "2-predict",
        title: "실행 결과 예측하기",
        code: py`
list_a = [1, -8.1, 92, 0, -47, 3, 5, 1, 0, 41.3]
list_a.insert(2, 5)
print(list_a[3])
list_a.remove(0)
print(list_a[:4])
list_a.sort()
print(list_a[2:5])
`,
      },
      {
        id: "2-2d",
        title: "2차원 리스트 (탄소 배출량)",
        code: py`
# 2019~2021년 탄소 배출량
list_2d = [
    ['CHN', 10740.99, 10956.21, 11472.36],
    ['JPN', 1106.01, 1042.22, 1067.39],
    ['KOR', 646.10, 597.63, 616.07],
    ['RUS', 1692.36, 1624.22, 1755.54],
    ['USA', 5259.14, 4715.69, 5007.33]]

print(list_2d[0][2])       # 0번 리스트의 2번 요소 확인
# 새로운 리스트 추가
list_2d.append(['THA', 251.51, 241.45, 247.70])
print(list_2d[5][0])       # 5번 리스트 0번 요소 확인
print(list_2d[3:5])        # 3, 4번 리스트 확인

list_2d[0][2] = 11562.30   # 0번 리스트의 2번 요소 변경
print(list_2d[0])          # 0번 리스트 전체 확인
list_2d[0].pop()           # 0번 리스트의 마지막 요소 삭제
print(list_2d[0])          # 0번 리스트 전체 확인
list_2d[0].append(12475.74)  # 0번 리스트에 요소 추가
print(list_2d[0])
# 슬라이싱을 이용한 요소 변경
list_2d[2][2:] = [602.12, 620.14]
print(list_2d[2])          # 2번 리스트 전체 확인
list_2d.pop(3)             # 3번 리스트 삭제
print(list_2d)
`,
      },
      {
        id: "2-2d-practice",
        title: "2차원 리스트 적용하기",
        code: py`
list_2d = [
    [1, 'apple', 1.2, 'A'],
    [2, 'banana', 2.5, 'B'],
    [3, 'orange', 3.7, 'C'],
    [4, 'kiwi', 0.8, 'A'],
    [5, 'grape', 1.1, 'A'],
    [6, 'mango', 2.2, 'C'],
    [7, 'peach', 4.4, 'B']]

print(list_2d[1][2])       # 2.5
print(list_2d[5][1])       # mango
print(list_2d[6][0])       # 7
print(list_2d[0])          # [1, 'apple', 1.2, 'A']
print(list_2d[4][0:2])     # [5, 'grape']
print(list_2d[2][1:4])     # ['orange', 3.7, 'C']
print(list_2d[3][0:3])     # [4, 'kiwi', 0.8]
`,
      },
      {
        id: "2-image",
        title: "이미지 데이터 다루기",
        code: py`
mouse = [[0, 0, 0, 0, 0, 0, 0, 0],
         [0, 1, 1, 0, 0, 1, 1, 0],
         [1, 1, 1, 0, 0, 1, 1, 1],
         [1, 1, 1, 1, 1, 1, 1, 1],
         [0, 1, 0, 1, 1, 0, 1, 0],
         [0, 1, 1, 1, 1, 1, 1, 0],
         [0, 1, 1, 0, 0, 1, 1, 0],
         [0, 0, 1, 1, 1, 1, 0, 0]]
print(mouse[3][3])
print(mouse[4][:2])
print(mouse[7][2:6])

# 맨 윗줄 삭제하기
mouse.pop(0)
print(mouse)
`,
      },
    ],
  },
  {
    label: "3-2-3 입력과 출력",
    examples: [
      {
        id: "3-print",
        title: "print의 sep와 end",
        code: py`
print('총 수량은', 3, '잔입니다.')
print('총 수량은', 3, '잔입니다.', sep='_')
print('총 수량은', 3, '잔입니다.', end='!')
print('확인')
`,
      },
      {
        id: "3-order",
        title: "음료 주문",
        code: py`
price = 3000
amount = input('몇 잔 주문하겠습니까?')
total = price * int(amount)    # 숫자 연산을 위한 자료형 변환
print(amount, '잔의 총 금액은', total, '원입니다.')
print('추가 주문하겠습니까?')
`,
      },
      {
        id: "3-exchange",
        title: "환율 변환",
        code: py`
usd_in = input("달러($) 단위의 숫자 입력: ")
usd = int(usd_in)
print(usd, "달러($)는", 1258 * usd, "원(￦)입니다.")
`,
      },
      {
        id: "3-cafe",
        title: "메뉴 파일 읽고 주문 저장",
        files: { "cafemenu.csv": "메뉴, 가격\n콜라, 1000원\n사이다, 1000원\n" },
        code: py`
# cafemenu.csv 파일을 읽고 출력하기 (예제를 고르면 파일이 자동으로 추가됩니다)
menufile = open('cafemenu.csv', 'r', encoding='UTF-8')    # 메뉴 파일 열기
print('메뉴 목록입니다. \n', menufile.read())              # 파일 읽기
menufile.close()                                           # 파일 닫기
# 음료 주문 받고 receipt.txt 파일에 주문 내역 저장하기
order = input('주문하실 음료를 입력해 주세요.')
quantity = input('몇 잔 주문하시겠습니까?')
print(order, quantity, '잔 주문 받았습니다.')
file = open('receipt.txt', 'w', encoding='UTF-8')         # 주문 내역 파일 열기
file.write('주문 내역\n음료:' + order + '\t수량:' + quantity)  # 파일 쓰기
file.close()
`,
      },
      {
        id: "3-event",
        title: "이벤트 참여 명단",
        code: py`
print('우리 가게를 이용해 주셔서 감사합니다. 이벤트에 참여해 주세요!')
name = input('성명을 입력해 주세요.>> ')
number = input('전화번호를 입력해 주세요.>> ')
mail = input('메일 주소를 입력해 주세요.>> ')
print('참여해 주셔서 감사합니다. 안녕히 가세요.')
# 파일 객체 file로 event.txt 파일에 내용 추가하기
file = open('event.txt', 'a', encoding='UTF-8')
file.write('성명: ' + name + '\t 전화번호: ' + number + '\t 메일 주소: ' + mail + '\n')
file.close()

# 파일 객체 event로 event.txt 파일의 내용 읽기
event = open('event.txt', 'r', encoding='UTF-8')
print('<현재까지 참여 명단>')
print(event.read())
event.close()
`,
      },
      {
        id: "3-diary",
        title: "일기장",
        code: py`
diary = open('diary.txt', 'a', encoding='UTF-8')           # 파일 열기
date = input('오늘의 날짜를 입력해 주세요>>')               # 표준 입력 받기
content = input('어떤 일이 있었나요?\n>>')                  # 표준 입력 받기
diary.write(date + ', ' + content + '\n')                  # 파일 쓰기
diary.close()                                              # 파일 닫기
diary = open('diary.txt', 'r', encoding='UTF-8')           # 파일 열기
print(diary.read())                                        # 파일 읽기
`,
      },
      {
        id: "3-diary-todo",
        title: "일기장 + 내일 할 일",
        code: py`
diary = open('diary.txt', 'a', encoding='UTF-8')
date = input('오늘의 날짜를 입력해 주세요>>')
content = input('어떤 일이 있었나요?\n>>')
diary.write(date + ', ' + content + '\n')
# '내일 할 일' 추가하기
work = input('내일 할 일을 입력해 주세요>>')
diary.write("내일 할 일: " + work + '\n')
diary.close()
diary = open('diary.txt', 'r', encoding='UTF-8')
print(diary.read())
`,
      },
    ],
  },
  {
    label: "3-2-4 다양한 제어 구조",
    examples: [
      {
        id: "4-compare",
        title: "비교 연산자",
        code: py`
print('안녕' == 5)
print([1, 3] != '13')
print(48 >= 34)

print(13 == '13')                 # 자료형이 서로 다르다.
print(True != False)
print(92.78 < 25)
print('가을' < '봄')              # 문자열은 사전 순서로 비교
print([2, 4, 2] >= [1, 5, 1])     # 같은 인덱스 요소를 비교
`,
      },
      {
        id: "4-logic",
        title: "논리 연산자",
        code: py`
print(not True)
print(False and True)
print(3 > 0 and 'a' < 'f')
print(True or False)
print(1 < -2 or 3 == 0)

print(not ('안녕' == 5))             # not False
print((11 > 2) and True)             # True and True
print((11 == 2) or '강' < '산')      # False or True
`,
      },
      {
        id: "4-if",
        title: "단순 조건문",
        code: py`
# 현재 시간과 비용에 따라 교통수단을 결정하는 프로그램
시간 = 21
돈 = 2500
if 시간 < 22:
    print('버스를 탑니다.')
if 돈 > 6000:
    print('택시를 탑니다.')
else:
    print('걸어갑니다.')
`,
      },
      {
        id: "4-elif",
        title: "다중 조건문",
        code: py`
# 현재 시간과 비용에 따라 교통수단을 결정하는 프로그램
시간 = 21
돈 = 2500
if 시간 < 22:
    print('버스를 탑니다.')
elif 돈 > 6000:
    print('택시를 탑니다.')
else:
    print('걸어갑니다.')
`,
      },
      {
        id: "4-zodiac",
        title: "별자리 프로그램",
        code: py`
month = int(input("태어난 월을 적어 주세요. >>"))
day = int(input("태어난 일을 적어 주세요. >>"))
birthday = [month, day]
result = ""
if [3, 21] <= birthday < [4, 20]:
    result = '양자리'
elif [4, 20] <= birthday < [5, 21]:
    result = '황소자리'
elif [5, 21] <= birthday < [6, 22]:
    result = '쌍둥이자리'
elif [6, 22] <= birthday < [7, 23]:
    result = '게자리'
elif [7, 23] <= birthday < [8, 23]:
    result = '사자자리'
elif [8, 23] <= birthday < [9, 24]:
    result = '처녀자리'
elif [9, 24] <= birthday < [10, 23]:
    result = '천칭자리'
elif [10, 23] <= birthday < [11, 23]:
    result = '전갈자리'
elif [11, 23] <= birthday < [12, 25]:
    result = '사수자리'
elif [12, 25] <= birthday <= [12, 31] or [1, 1] <= birthday < [1, 20]:
    result = '염소자리'
elif [1, 20] <= birthday < [2, 19]:
    result = '물병자리'
elif [2, 19] <= birthday < [3, 21]:
    result = '물고기자리'
print("당신의 별자리는", result, "입니다!")
`,
      },
      {
        id: "4-in",
        title: "in과 not in",
        code: py`
print(3 in [1, 3, 5, 7])
print('th' not in 'Python')

ex_str = "Say 'hi' to my friends. They are really nice people."
if 'all' in ex_str:      # all이 ex_str에 있는지 확인한다.
    print('all', end=' ')
if 'apple' in ex_str:    # apple이 ex_str에 있는지 확인한다.
    print('apple', end=' ')
`,
      },
      {
        id: "4-shopping",
        title: "장보기 목록",
        code: py`
shopping_list = ['밀가루', '딸기', '우유', '요구르트', '닭고기', '식용유']
product = input('확인할 상품을 적어 주세요.')
if product in shopping_list:
    print('해당 상품은 리스트에 포함되어 있습니다.')
else:
    print('리스트에 없는 상품이므로 리스트에 추가합니다.')
    shopping_list.append(product)
print(shopping_list)
`,
      },
      {
        id: "4-for",
        title: "for 반복문",
        code: py`
count = 0
for number in [95, 90, 14, 56]:
    count = count + 1
    print(count, '번째 숫자는', number, '입니다.')
`,
      },
      {
        id: "4-range",
        title: "range() 함수",
        code: py`
print(list(range(4)))
print(list(range(2, 7)))
print(list(range(2, 15, 3)))
print(list(range(10, 5, -2)))
`,
      },
      {
        id: "4-divisor",
        title: "약수 구하기",
        code: py`
num = int(input('정수를 입력하세요.: '))
if num <= 0:
    print('잘못된 입력입니다.')
else:                               # 입력한 숫자가 양수일 때 실행
    print(num, '의 약수: ', end='')
    for i in range(1, num + 1):     # [1, 2 … num]과 동일
        if num % i == 0:
            print(i, end=' ')
`,
      },
      {
        id: "4-sales",
        title: "매출 계산기",
        code: py`
name = ['초코칩', '감자칩', '젤리', '이온 음료', '주스', '생수', '우유']
prices = [1200, 2000, 900, 1400, 1500, 600, 700]    # 상품별 판매 가격
quantities = [10, 7, 20, 12, 16, 11, 6]             # 상품별 판매 수량
product_sales = []                                  # 상품별 매출
total_sales = 0                                     # 총매출
for i in range(7):
    sales = prices[i] * quantities[i]               # 상품별 판매 가격과 판매 수량 곱하기
    product_sales.append(sales)
print('상품별 매출은 다음과 같습니다.', product_sales, sep='\n')   # 상품별 매출 출력
max_sales = max(product_sales)                      # product_sales의 최댓값 계산
max_index = product_sales.index(max_sales)          # 최대 매출을 낸 상품의 인덱스 찾기
max_product = name[max_index]                       # 인덱스를 사용하여 최대 매출을 낸 상품명 찾기
print('최대 매출을 낸 상품은', max_product, '입니다.')
for num in product_sales:
    total_sales = total_sales + num
print('총매출은', total_sales, '원입니다.')          # 총매출 출력하기
`,
      },
      {
        id: "4-while",
        title: "while 반복문",
        code: py`
cookie = 3
while cookie > 1:
    cookie = cookie - 1
    print('쿠키를 판매합니다. 남은 쿠키: ', cookie)
print('남은 쿠키가 없습니다.')
`,
      },
      {
        id: "4-lcm",
        title: "최소 공배수",
        code: py`
num1 = int(input('첫 번째 자연수: '))
num2 = int(input('두 번째 자연수: '))
lcm = 1
while not (lcm % num1 == 0 and lcm % num2 == 0):
    lcm = lcm + 1
print('최소 공배수:', lcm)
`,
      },
      {
        id: "4-nested-1",
        title: "중첩 반복 비교 1",
        code: py`
list_population = [['ROK', 51.6],
                   ['JPN', 123.3],
                   ['CHN', 1425.7],
                   ['TWN', 23.4]]

count1 = 0
count2 = 0
for row in list_population:
    count1 = count1 + 1
for num in row:
    print(num, end=" ")
    count2 = count2 + 1
print()

print('첫 번째 반복문 실행 횟수:', count1)
print('두 번째 반복문 실행 횟수:', count2)
`,
      },
      {
        id: "4-nested-2",
        title: "중첩 반복 비교 2",
        code: py`
list_population = [['ROK', 51.6],
                   ['JPN', 123.3],
                   ['CHN', 1425.7],
                   ['TWN', 23.4]]

count1 = 0
count2 = 0
for row in list_population:
    count1 = count1 + 1
    for num in row:
        print(num, end=" ")
        count2 = count2 + 1
    print()

print('첫 번째 반복문 실행 횟수:', count1)
print('두 번째 반복문 실행 횟수:', count2)
`,
      },
      {
        id: "4-break",
        title: "break",
        code: py`
list = [52, 74, 14, 65, 19, 33, 22, 10]
for number in list:
    if number < 20:
        break
    print(number)
print('반복이 끝났습니다.')
`,
      },
      {
        id: "4-continue",
        title: "continue",
        code: py`
list = [52, 74, 14, 65, 19, 33, 22, 10]
for number in list:
    if number < 20:
        continue
    print(number)
print('반복이 끝났습니다.')
`,
      },
      {
        id: "4-quiz",
        title: "난센스 퀴즈 게임",
        code: py`
quiz1 = '슬그머니'
answer = ""
print("넌센스 퀴즈 게임을 시작합니다!")
answer = input("첫 번째 문제: 도둑이 훔친 돈을 네 글자로 말하면?")
while answer != quiz1:
    answer = input("오답입니다! 정답을 다시 말씀해 주세요.")
else:
    print("정답입니다!")
`,
      },
      {
        id: "4-updown",
        title: "업다운 게임",
        code: py`
import random
num = random.randint(1, 100)    # 1~100 임의의 정수를 변수 num에 저장
answer = 0
while answer != num:
    answer = int(input('숫자를 입력해 주세요.>> '))
    if answer > num:
        print('다운')
    elif answer < num:
        print('업')
    else:
        print('정답입니다!')
`,
      },
      {
        id: "4-alphabet",
        title: "알파벳 개수 찾기",
        code: py`
string = 'Change has a considerable psychological impact on the human mind. To the fearful it is threatening because it means that things may get worse. To the hopeful it is encouraging because things may get better. To the confident it is inspiring because the challenge exists to make things better. - King Whitney Jr. -'
alphabet = input('검색할 알파벳을 입력해주세요. ')
count = 0
for char in string:
    if alphabet == char:
        count = count + 1
print(alphabet, '의 개수:', count, '개')
`,
      },
      {
        id: "4-csv-line",
        title: "CSV 한 줄 읽기 (기후 통계)",
        code: `${CLIMATE_NOTE}\n${py`
file = open('대한민국 기후 통계.csv', 'r')
line_str = file.readline()
print(line_str)
line_list = line_str.strip().split(',')
print(line_list)
`}`,
      },
      {
        id: "4-csv-2d",
        title: "CSV를 2차원 리스트로 (기후 통계)",
        code: `${CLIMATE_NOTE}\n${py`
file = open('대한민국 기후 통계.csv', 'r')
lines = file.readlines()
data = []
for line in lines:
    data.append(line.strip().split(','))
print(data)
`}`,
      },
      {
        id: "4-csv-search",
        title: "연도·지역 기후 조회 (기후 통계)",
        code: `${CLIMATE_NOTE}\n${py`
file = open('대한민국 기후 통계.csv', 'r')
lines = file.readlines()
data = []
for line in lines:
    data.append(line.strip().split(','))

year = input("연도를 입력해 주세요.>> ")
num = input("지역 번호를 입력해 주세요.>> ")
print(year, "년", num, "번 지역의 정보입니다.")
for a in data:
    if a[:2] == [year, num]:
        print("평균 기온:", a[2], "최고 기온:", a[3],
              "최저 기온:", a[4], "강수량:", a[5])
`}`,
      },
      {
        id: "4-csv-max-rain",
        title: "강수량 최고 연도 (기후 통계)",
        code: `${CLIMATE_NOTE}\n${py`
file = open('대한민국 기후 통계.csv', 'r')
lines = file.readlines()
data = []
for line in lines:
    data.append(line.strip().split(','))

num = input("지역 번호를 입력해 주세요.>> ")
max = 0
index = 0
for a in data:
    if a[1] == num and max < float(a[5]):
        max = float(a[5])
        index = data.index(a)
print(num, "번 지역의 강수량이 가장 높은 연도는", data[index][0], "년입니다.")
print(data[index][0], "년 해당 지역 최고 기온은", data[index][3], "(℃)입니다.")
`}`,
      },
      {
        id: "4-csv-rain-increase",
        title: "강수량 증가 지역 (기후 통계)",
        code: `${CLIMATE_NOTE}\n${py`
file = open('대한민국 기후 통계.csv', 'r')
lines = file.readlines()
data = []
for line in lines:
    data.append(line.strip().split(','))

year = int(input("연도를 입력해 주세요.>> "))
print(year - 1, "년에 비해", year, "년에 강수량이 가장 많이 증가한 지역을 계산합니다.")
result_list = []
for a in data:
    if a[0] == str(year - 1):
        num = a[1]
        rain_am = float(a[5])
    if a[0] == str(year) and a[1] == num:
        rain_inc = float(a[5]) - rain_am
        result_list.append([num, rain_inc])
index = 0
max = 0
for b in result_list:
    if max < b[1]:
        max = b[1]
        index = result_list.index(b)
print(result_list[index][0], "번 지역의 강수량이", max, "mm로 가장 많이 증가하였습니다.")
`}`,
      },
    ],
  },
];

export const examples = Object.fromEntries(
  exampleGroups.flatMap((group) => group.examples.map((example) => [example.id, example])),
);

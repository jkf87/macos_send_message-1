# 🍎 MacOS Send Message

[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)
[![macOS](https://img.shields.io/badge/macOS-Required-lightgrey.svg)](https://www.apple.com/macos/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

맥북에서 실행되는 웹 기반 SMS 발송 애플리케이션입니다. AppleScript를 통해 macOS Messages 앱과 연동하여 여러 명에게 동시에 문자 메시지를 보낼 수 있습니다.

## 📸 스크린샷

### 메인 인터페이스
![메인 화면](screenshot1.png)

### SMS 전송 결과
![전송 결과](screenshot2.png)

## ✨ 주요 기능

- 📱 **연락처 관리**: 이름과 전화번호로 연락처 추가/삭제
- 📨 **일괄 SMS 발송**: 여러 명에게 동시에 메시지 전송
- 📁 **파일 업로드**: CSV 파일에서 대량 연락처 가져오기 (30개 샘플 포함)
- 🎨 **모던한 웹 UI**: Bootstrap 기반의 반응형 인터페이스
- 🔗 **macOS 메시지 앱 연동**: AppleScript를 통한 네이티브 연동
- 📊 **전송 결과 확인**: 성공/실패 현황을 실시간으로 확인

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/jvisualschool/macos_send_message.git
cd macos_send_message
```

### 2. 자동 실행 (권장)
```bash
chmod +x run.sh
./run.sh
```

### 3. 웹 브라우저 접속
```
http://127.0.0.1:5001
```

## 🖥️ 시스템 요구사항

- **운영체제**: macOS 10.14 (Mojave) 이상
- **Python**: 3.7 이상
- **Messages 앱**: macOS 기본 설치
- **iPhone 연동**: SMS 전송을 위한 iPhone 필요

## 📋 사용 방법

### 연락처 추가
1. **직접 입력**: 좌측 "연락처 추가" → "직접 입력" 탭
2. **파일 업로드**: CSV 파일에서 대량 가져오기 (sample_contacts.csv 참조)

### SMS 발송
1. 수신자 선택
2. 메시지 작성 (최대 1000자)
3. "SMS 전송" 버튼 클릭

### 지원 파일 형식
- **CSV**: 첫 번째 열 이름, 두 번째 열 전화번호 (30개 샘플 포함)

## 🔒 보안 특징

- ✅ **로컬 데이터 저장**: 모든 연락처 정보는 로컬에만 저장
- ✅ **외부 전송 없음**: 민감한 데이터가 외부로 전송되지 않음
- ✅ **입력 검증**: XSS 방지 및 파일 업로드 보안
- ✅ **권한 최소화**: Messages 앱에만 접근하는 제한된 권한

## 📁 프로젝트 구조

```
macos_send_message/
├── app.py                 # Flask 메인 애플리케이션
├── requirements.txt       # Python 의존성
├── run.sh                # 실행 스크립트
├── .env.example          # 환경 변수 설정 예시
├── README.md             # 프로젝트 소개
├── README_DEPLOY.md      # 상세 배포 가이드
├── SECURITY_AUDIT.md     # 보안 감사 리포트
├── screenshot1.png       # 앱 스크린샷 1
├── screenshot2.png       # 앱 스크린샷 2
├── templates/
│   └── index.html        # 메인 웹 페이지
├── static/
│   ├── css/style.css     # 커스텀 스타일
│   └── js/app.js         # 클라이언트 JavaScript
└── sample_contacts.csv   # 샘플 연락처 파일 (30개)
```

## 🛠️ 기술 스택

- **백엔드**: Python Flask, AppleScript
- **프론트엔드**: HTML5, CSS3, JavaScript (ES6+)
- **UI 프레임워크**: Bootstrap 5, Font Awesome
- **시스템 연동**: macOS Messages 앱

## ⚠️ 주의사항

1. **macOS 전용**: AppleScript 의존성으로 macOS에서만 동작
2. **Messages 앱 필요**: 실제 SMS 전송을 위해 Messages 앱 실행 필요
3. **권한 설정**: 처음 실행 시 AppleScript 권한 허용 필요
4. **SMS 요금**: 실제 SMS 요금이 발생할 수 있습니다

## 📚 문서

- **[상세 사용 가이드](README_DEPLOY.md)**: 완전한 설치 및 사용 가이드
- **[보안 감사 리포트](SECURITY_AUDIT.md)**: 보안 점검 및 개선사항
- **[환경 변수 설정](.env.example)**: 환경 설정 예시

## 🐛 문제 해결

### "Messages 앱에 연결할 수 없습니다"
- **시스템 환경설정** → **보안 및 개인정보보호** → **개인정보보호**
- **자동화** 선택 → **터미널** → **Messages** 체크

### "ModuleNotFoundError: No module named 'flask'"
```bash
source venv/bin/activate
pip install -r requirements.txt
```

더 자세한 문제 해결 방법은 [README_DEPLOY.md](README_DEPLOY.md)를 참조하세요.

## 🤝 기여하기

1. Fork 후 feature 브랜치 생성
2. 코드 작성 및 테스트
3. Pull Request 생성

버그 리포트나 기능 제안은 [Issues](https://github.com/jvisualschool/macos_send_message/issues)에서 환영합니다!

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**⚡ 즐거운 SMS 발송 되세요! 🚀**
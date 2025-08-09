# 🔒 MacOS Send Message 보안 감사 리포트

**감사 일자**: 2024년 8월 9일  
**감사 범위**: 전체 애플리케이션 코드베이스  
**감사자**: AI Assistant  

## 📋 감사 요약

### 전체 보안 등급: **B+ (양호)**

- ✅ **양호한 점**: 12개 항목
- ⚠️ **개선 필요**: 5개 항목  
- ❌ **심각한 취약점**: 0개 항목

## 🔍 상세 감사 결과

### ✅ 보안 강점

#### 1. 데이터 보안
- **로컬 데이터 저장**: 모든 연락처 데이터가 로컬 `contacts.json`에만 저장
- **외부 전송 없음**: 민감한 데이터가 외부 서버로 전송되지 않음
- **세션 격리**: 브라우저별 독립적인 세션 관리

#### 2. 입력 검증
- **파일 형식 제한**: TXT/CSV 파일만 업로드 허용
- **파일명 보안**: `secure_filename()` 사용으로 경로 조작 방지
- **전화번호 정규화**: 입력 데이터 자동 정규화 및 검증

#### 3. XSS 방지
- **HTML 이스케이프**: `escapeHtml()` 함수로 사용자 입력 이스케이프 처리
- **안전한 DOM 조작**: innerHTML 사용 시 이스케이프된 데이터만 사용

#### 4. 시스템 보안
- **권한 최소화**: Messages 앱에만 접근하는 제한된 AppleScript
- **프로세스 격리**: subprocess를 통한 안전한 시스템 명령 실행
- **타임아웃 설정**: AppleScript 실행 시 30초 타임아웃

### ⚠️ 개선 필요 사항

#### 1. 파일 업로드 보안 (중간 위험도)

**현재 상태:**
```python
# 파일 크기 제한 없음
file = request.files['file']
content = file.read().decode('utf-8')
```

**권장 개선사항:**
```python
# 파일 크기 제한 추가
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
if len(file.read()) > MAX_FILE_SIZE:
    return jsonify({'error': '파일 크기가 너무 큽니다'}), 413
file.seek(0)  # 파일 포인터 리셋
```

#### 2. CORS 설정 (낮은 위험도)

**현재 상태:**
```python
CORS(app)  # 모든 도메인 허용
```

**권장 개선사항:**
```python
CORS(app, origins=['http://localhost:5001'])  # 특정 도메인만 허용
```

#### 3. 디버그 모드 (중간 위험도)

**현재 상태:**
```python
app.run(debug=True, host='0.0.0.0', port=5001)
```

**권장 개선사항:**
```python
import os
debug_mode = os.environ.get('FLASK_ENV') == 'development'
app.run(debug=debug_mode, host='127.0.0.1', port=5001)
```

#### 4. 오류 정보 노출 (낮은 위험도)

**현재 상태:**
```python
except Exception as e:
    return jsonify({'success': False, 'message': f'오류: {str(e)}'}), 500
```

**권장 개선사항:**
```python
except Exception as e:
    logger.error(f"Upload error: {e}")
    return jsonify({'success': False, 'message': '파일 처리 중 오류가 발생했습니다'}), 500
```

#### 5. 로깅 보안 (낮은 위험도)

**현재 상태:**
```python
print(f"🔍 [DEBUG] 전화번호: {phone_number}, 메시지: {message}")
```

**권장 개선사항:**
```python
# 민감한 정보 마스킹
print(f"🔍 [DEBUG] 전화번호: {phone_number[:3]}***{phone_number[-4:]}, 메시지 길이: {len(message)}")
```

## 🛡️ 보안 개선 권장사항

### 즉시 적용 권장 (High Priority)

#### 1. 파일 업로드 보안 강화
```python
# app.py에 추가
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.txt', '.csv'}

def validate_file_upload(file):
    if not file or file.filename == '':
        return False, '파일이 선택되지 않았습니다.'
    
    # 파일 크기 검사
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    
    if size > MAX_FILE_SIZE:
        return False, '파일 크기는 10MB를 초과할 수 없습니다.'
    
    # 확장자 검사
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        return False, 'TXT 또는 CSV 파일만 업로드 가능합니다.'
    
    return True, 'OK'
```

#### 2. 프로덕션 설정 분리
```python
# config.py 생성
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    DEBUG = False
    HOST = '127.0.0.1'

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    HOST = '127.0.0.1'  # 로컬 접근만 허용

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

#### 3. 로깅 시스템 개선
```python
import logging
from logging.handlers import RotatingFileHandler

# 로깅 설정
if not app.debug:
    file_handler = RotatingFileHandler('logs/sms_app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

### 중기 적용 권장 (Medium Priority)

#### 1. 입력 검증 강화
```python
import re
from html import escape

def validate_phone_number(phone):
    # 더 엄격한 전화번호 검증
    pattern = r'^(\+82|0)?(10|11|16|17|18|19)\d{7,8}$'
    clean_phone = re.sub(r'[^\d+]', '', phone)
    return bool(re.match(pattern, clean_phone))

def sanitize_input(text, max_length=1000):
    # 입력 데이터 정리 및 검증
    if not isinstance(text, str):
        return ''
    text = escape(text.strip())
    return text[:max_length]
```

#### 2. 세션 보안 강화
```python
from flask import session
import secrets

app.secret_key = secrets.token_hex(16)
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS에서만
app.config['SESSION_COOKIE_HTTPONLY'] = True  # XSS 방지
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF 방지
```

#### 3. 레이트 리미팅
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/send-sms', methods=['POST'])
@limiter.limit("10 per minute")  # SMS 전송 제한
def send_sms():
    # 기존 코드
```

### 장기 적용 권장 (Low Priority)

#### 1. 데이터베이스 암호화
```python
from cryptography.fernet import Fernet
import base64

class EncryptedContactStorage:
    def __init__(self, key=None):
        if key is None:
            key = Fernet.generate_key()
        self.cipher = Fernet(key)
    
    def save_contacts(self, contacts):
        encrypted_data = self.cipher.encrypt(json.dumps(contacts).encode())
        with open('contacts.enc', 'wb') as f:
            f.write(encrypted_data)
```

#### 2. 감사 로그
```python
def audit_log(action, user_ip, details):
    timestamp = datetime.now().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'action': action,
        'ip': user_ip,
        'details': details
    }
    
    with open('audit.log', 'a') as f:
        f.write(json.dumps(log_entry) + '\n')
```

## 🔧 보안 설정 체크리스트

### 시스템 레벨
- [ ] macOS 방화벽 활성화
- [ ] Messages 앱 권한 최소화
- [ ] 터미널 접근성 권한 검토
- [ ] 자동 업데이트 활성화

### 애플리케이션 레벨
- [ ] 파일 업로드 크기 제한 설정
- [ ] CORS 정책 제한적 적용
- [ ] 디버그 모드 프로덕션에서 비활성화
- [ ] 오류 메시지 일반화
- [ ] 민감한 정보 로깅 방지

### 네트워크 레벨
- [ ] 로컬 접근만 허용 (127.0.0.1)
- [ ] HTTPS 적용 (필요시)
- [ ] 레이트 리미팅 구현
- [ ] 세션 보안 강화

## 📊 위험도 매트릭스

| 취약점 | 위험도 | 영향도 | 발생 가능성 | 우선순위 |
|--------|--------|--------|-------------|----------|
| 파일 업로드 크기 제한 없음 | 중간 | 중간 | 높음 | High |
| 디버그 모드 활성화 | 중간 | 높음 | 중간 | High |
| CORS 전체 허용 | 낮음 | 낮음 | 중간 | Medium |
| 오류 정보 노출 | 낮음 | 낮음 | 높음 | Medium |
| 민감한 정보 로깅 | 낮음 | 중간 | 낮음 | Low |

## 🎯 보안 개선 로드맵

### Phase 1 (즉시 - 1주일)
1. 파일 업로드 크기 제한 구현
2. 프로덕션/개발 환경 분리
3. 디버그 모드 조건부 활성화
4. 기본 로깅 시스템 구현

### Phase 2 (1-4주)
1. CORS 정책 제한적 적용
2. 입력 검증 강화
3. 오류 처리 개선
4. 레이트 리미팅 구현

### Phase 3 (1-3개월)
1. 데이터 암호화 구현
2. 감사 로그 시스템
3. 보안 헤더 추가
4. 정기 보안 점검 자동화

## 📋 보안 모니터링

### 일일 점검 항목
- [ ] 비정상적인 파일 업로드 시도
- [ ] 과도한 SMS 전송 요청
- [ ] 시스템 리소스 사용량
- [ ] 오류 로그 검토

### 주간 점검 항목
- [ ] 보안 패치 업데이트
- [ ] 로그 파일 정리
- [ ] 권한 설정 검토
- [ ] 백업 데이터 확인

### 월간 점검 항목
- [ ] 전체 보안 감사
- [ ] 의존성 취약점 스캔
- [ ] 침투 테스트 수행
- [ ] 보안 정책 업데이트

## 🚨 보안 사고 대응 절차

### 1단계: 탐지 및 격리
1. 의심스러운 활동 탐지
2. 영향 범위 파악
3. 시스템 격리 (필요시)
4. 증거 보전

### 2단계: 분석 및 평가
1. 공격 벡터 분석
2. 피해 규모 평가
3. 데이터 유출 여부 확인
4. 복구 계획 수립

### 3단계: 복구 및 개선
1. 시스템 복구
2. 보안 패치 적용
3. 모니터링 강화
4. 재발 방지 대책 수립

## 📞 보안 연락처

- **GitHub Issues**: [https://github.com/jvisualschool/macos_send_message/issues](https://github.com/jvisualschool/macos_send_message/issues)
- **GitHub Repository**: [https://github.com/jvisualschool/macos_send_message](https://github.com/jvisualschool/macos_send_message)
- **보안 관련 문의**: GitHub Issues에 "security" 라벨로 등록

---

**다음 감사 예정일**: 2024년 11월 9일  
**감사 주기**: 분기별 (3개월)

*이 보고서는 현재 코드베이스를 기준으로 작성되었으며, 코드 변경 시 재검토가 필요합니다.*
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import subprocess
import json
import os
import re
import csv
from io import StringIO
from werkzeug.utils import secure_filename
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
# CORS 설정을 더 제한적으로 변경
CORS(app, origins=['http://localhost:5001', 'http://127.0.0.1:5001'])

# 파일 업로드 보안 설정
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.csv'}

# 연락처 데이터 저장 파일
CONTACTS_FILE = 'contacts.json'

def load_contacts():
    """연락처 데이터 로드"""
    if os.path.exists(CONTACTS_FILE):
        with open(CONTACTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_contacts(contacts):
    """연락처 데이터 저장"""
    with open(CONTACTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(contacts, f, ensure_ascii=False, indent=2)



def parse_csv_file(content):
    """CSV 파일 파싱"""
    contacts = []
    
    try:
        # CSV 파싱
        csv_reader = csv.reader(StringIO(content))
        rows = list(csv_reader)
        
        if not rows:
            return contacts
        
        # 헤더 감지 (첫 번째 행이 헤더인지 확인)
        first_row = rows[0]
        has_header = False
        
        # 헤더로 추정되는 키워드들
        header_keywords = ['이름', '성명', 'name', '전화', '번호', 'phone', 'tel', 'mobile']
        if any(keyword.lower() in str(cell).lower() for cell in first_row for keyword in header_keywords):
            has_header = True
            rows = rows[1:]  # 헤더 제외
        
        # 데이터 파싱
        for row_num, row in enumerate(rows, 1):
            if len(row) >= 2:
                name = str(row[0]).strip()
                phone = str(row[1]).strip()
                
                if name and phone:
                    # 전화번호 검증
                    phone_clean = re.sub(r'[^\d+\-]', '', phone)
                    if re.match(r'^[\d+\-]{10,}$', phone_clean):
                        contacts.append({
                            'name': name,
                            'phone': phone_clean,
                            'source': f'CSV 행 {row_num + (1 if has_header else 0)}'
                        })
    
    except Exception as e:
        print(f"🔍 [DEBUG] CSV 파싱 오류: {e}")
    
    return contacts

def validate_phone_number(phone):
    """전화번호 유효성 검사"""
    # 숫자, +, - 만 허용
    phone_clean = re.sub(r'[^\d+\-]', '', phone)
    
    # 최소 10자리 이상의 숫자 필요
    digits_only = re.sub(r'[^\d]', '', phone_clean)
    if len(digits_only) < 10:
        return False, "전화번호는 최소 10자리 숫자여야 합니다."
    
    # 한국 전화번호 패턴 검사
    patterns = [
        r'^010[\-]?\d{4}[\-]?\d{4}$',  # 010-1234-5678
        r'^01[1-9][\-]?\d{3,4}[\-]?\d{4}$',  # 011, 016, 017, 018, 019
        r'^02[\-]?\d{3,4}[\-]?\d{4}$',  # 서울 02
        r'^0[3-6][1-9][\-]?\d{3,4}[\-]?\d{4}$',  # 지역번호
        r'^\+82[\-]?10[\-]?\d{4}[\-]?\d{4}$',  # 국제번호
    ]
    
    for pattern in patterns:
        if re.match(pattern, phone_clean):
            return True, phone_clean
    
    return True, phone_clean  # 패턴이 맞지 않아도 일단 허용 (해외번호 등)

def send_message_via_applescript(phone_number, message):
    """AppleScript를 사용하여 메시지 앱으로 SMS 전송"""
    # 민감한 정보 마스킹하여 로깅
    masked_phone = phone_number[:3] + '***' + phone_number[-4:] if len(phone_number) > 7 else '***'
    app.logger.info(f"SMS 전송 시작 - 번호: {masked_phone}, 메시지 길이: {len(message)}자")
    
    # 전화번호 형식 정리
    original_phone = phone_number
    phone_number = re.sub(r'[^\d+]', '', phone_number)
    app.logger.debug(f"전화번호 정리 완료")
    
    # Messages 앱이 실행 중인지 확인
    try:
        check_messages = subprocess.run(
            ['osascript', '-e', 'tell application "System Events" to (name of processes) contains "Messages"'],
            capture_output=True,
            text=True,
            timeout=5
        )
        messages_running = "true" in check_messages.stdout.lower()
        print(f"🔍 [DEBUG] Messages 앱 실행 상태: {messages_running}")
        
        if not messages_running:
            print("🔍 [DEBUG] Messages 앱을 실행하는 중...")
            subprocess.run(['open', '-a', 'Messages'], timeout=10)
            import time
            time.sleep(3)
    except Exception as e:
        print(f"🔍 [DEBUG] Messages 앱 상태 확인 실패: {e}")
    
    # 더 안전한 AppleScript 사용 (단계별 접근)
    applescript = f'''
    tell application "Messages"
        try
            activate
            delay 1
            set targetBuddy to buddy "{phone_number}"
            send "{message}" to targetBuddy
            return "SUCCESS"
        on error errMsg number errNum
            try
                -- 대안 방법 시도
                set targetService to service "SMS"
                set targetBuddy to buddy "{phone_number}" of targetService
                send "{message}" to targetBuddy
                return "SUCCESS"
            on error errMsg2 number errNum2
                return "ERROR: " & errMsg & " (Code: " & errNum & ") / Alt: " & errMsg2 & " (Code: " & errNum2 & ")"
            end try
        end try
    end tell
    '''
    
    print(f"🔍 [DEBUG] AppleScript 실행 중...")
    
    try:
        result = subprocess.run(
            ['osascript', '-e', applescript],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        app.logger.debug(f"AppleScript 실행 완료 - 반환코드: {result.returncode}")
        if result.stderr:
            app.logger.warning(f"AppleScript 경고: {result.stderr.strip()}")
        
        if result.returncode == 0:
            if "SUCCESS" in result.stdout:
                return True, "메시지가 성공적으로 전송되었습니다."
            elif "ERROR:" in result.stdout:
                return False, f"AppleScript 오류: {result.stdout.strip()}"
            else:
                return True, f"전송 완료 (응답: {result.stdout.strip()})"
        else:
            return False, f"메시지 전송 실패 (코드: {result.returncode}): {result.stderr}"
    
    except subprocess.TimeoutExpired:
        print("🔍 [DEBUG] AppleScript 실행 시간 초과")
        return False, "메시지 전송 시간 초과 (30초)"
    except Exception as e:
        print(f"🔍 [DEBUG] 예외 발생: {e}")
        return False, f"오류 발생: {str(e)}"

@app.route('/')
def index():
    """메인 페이지"""
    return render_template('index.html')

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """연락처 목록 조회"""
    contacts = load_contacts()
    return jsonify(contacts)

@app.route('/api/contacts', methods=['POST'])
def add_contact():
    """연락처 추가 (수신자 목록용)"""
    data = request.json
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    
    if not name or not phone:
        return jsonify({'success': False, 'message': '이름과 전화번호를 모두 입력해주세요.'}), 400
    
    # 전화번호 유효성 검사 및 정규화
    is_valid, clean_phone = validate_phone_number(phone)
    if not is_valid:
        return jsonify({'success': False, 'message': clean_phone}), 400
    
    # 새 연락처 생성 (수신자 목록용, 실제 저장하지 않음)
    new_contact = {
        'id': clean_phone,  # 전화번호를 ID로 사용
        'name': name,
        'phone': clean_phone
    }
    
    return jsonify({'success': True, 'contact': new_contact})

@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    """연락처 삭제"""
    contacts = load_contacts()
    contacts = [c for c in contacts if c['id'] != contact_id]
    save_contacts(contacts)
    
    return jsonify({'success': True})

@app.route('/api/upload-contacts', methods=['POST'])
def validate_file_upload(file):
    """파일 업로드 보안 검증"""
    if not file or file.filename == '':
        return False, '파일이 선택되지 않았습니다.'
    
    # 파일 크기 검사
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    
    if size > MAX_FILE_SIZE:
        return False, f'파일 크기는 {MAX_FILE_SIZE // (1024*1024)}MB를 초과할 수 없습니다.'
    
    if size == 0:
        return False, '빈 파일은 업로드할 수 없습니다.'
    
    # 확장자 검사
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        return False, 'CSV 파일만 업로드 가능합니다.'
    
    return True, 'OK'

def upload_contacts():
    """파일에서 연락처 업로드"""
    app.logger.info("파일 업로드 API 호출됨")
    
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': '파일이 선택되지 않았습니다.'}), 400
        
        file = request.files['file']
        
        # 파일 검증
        is_valid, message = validate_file_upload(file)
        if not is_valid:
            app.logger.warning(f"파일 업로드 검증 실패: {message}")
            return jsonify({'success': False, 'message': message}), 400
        
        original_filename = file.filename.lower()
        filename = secure_filename(file.filename)
        app.logger.info(f"파일 업로드 시작: {filename} (크기: {file.tell()} bytes)")
        file.seek(0)  # 파일 포인터 리셋
        
        # 파일 내용 읽기
        try:
            content = file.read().decode('utf-8')
        except UnicodeDecodeError:
            try:
                # UTF-8로 읽기 실패시 CP949 시도
                file.seek(0)
                content = file.read().decode('cp949')
            except UnicodeDecodeError:
                return jsonify({'success': False, 'message': '파일 인코딩을 읽을 수 없습니다. UTF-8 또는 CP949로 저장해주세요.'}), 400
        
        print(f"🔍 [DEBUG] 파일 내용 길이: {len(content)} 문자")
        
        # CSV 파일 파싱
        parsed_contacts = parse_csv_file(content)
        
        print(f"🔍 [DEBUG] 파싱된 연락처 수: {len(parsed_contacts)}")
        
        if not parsed_contacts:
            return jsonify({
                'success': False, 
                'message': '유효한 연락처를 찾을 수 없습니다. 파일 형식을 확인해주세요.'
            }), 400
        
        # 기존 연락처와 중복 체크
        existing_contacts = load_contacts()
        existing_phones = {contact['phone'] for contact in existing_contacts}
        
        # 새로운 연락처만 필터링
        new_contacts = []
        duplicates = []
        
        for contact in parsed_contacts:
            if contact['phone'] in existing_phones:
                duplicates.append(contact)
            else:
                new_contacts.append(contact)
                existing_phones.add(contact['phone'])
        
        print(f"🔍 [DEBUG] 새로운 연락처: {len(new_contacts)}, 중복: {len(duplicates)}")
        
        return jsonify({
            'success': True,
            'parsed_contacts': parsed_contacts,
            'new_contacts': new_contacts,
            'duplicates': duplicates,
            'total_parsed': len(parsed_contacts),
            'total_new': len(new_contacts),
            'total_duplicates': len(duplicates)
        })
    
    except Exception as e:
        app.logger.error(f"파일 업로드 오류: {e}")
        return jsonify({'success': False, 'message': '파일 처리 중 오류가 발생했습니다. 파일 형식을 확인해주세요.'}), 500

@app.route('/api/import-contacts', methods=['POST'])
def import_contacts():
    """파싱된 연락처를 실제로 추가"""
    print("🔍 [DEBUG] 연락처 가져오기 API 호출됨")
    
    try:
        data = request.json
        contacts_to_import = data.get('contacts', [])
        
        if not contacts_to_import:
            return jsonify({'success': False, 'message': '가져올 연락처가 없습니다.'}), 400
        
        # 기존 연락처 로드
        existing_contacts = load_contacts()
        max_id = max([contact.get('id', 0) for contact in existing_contacts], default=0)
        
        # 새로운 연락처 추가
        imported_count = 0
        for contact_data in contacts_to_import:
            max_id += 1
            new_contact = {
                'id': max_id,
                'name': contact_data['name'],
                'phone': contact_data['phone']
            }
            existing_contacts.append(new_contact)
            imported_count += 1
        
        # 저장
        save_contacts(existing_contacts)
        
        print(f"🔍 [DEBUG] {imported_count}개 연락처 가져오기 완료")
        
        return jsonify({
            'success': True,
            'imported_count': imported_count,
            'message': f'{imported_count}개의 연락처를 성공적으로 가져왔습니다.'
        })
    
    except Exception as e:
        print(f"🔍 [DEBUG] 연락처 가져오기 오류: {e}")
        return jsonify({'success': False, 'message': f'연락처 가져오기 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/api/test-applescript', methods=['GET'])
def test_applescript():
    """AppleScript 연동 테스트"""
    print("🔍 [DEBUG] AppleScript 테스트 시작")
    
    try:
        # 1. Messages 앱 실행 상태 확인
        check_result = subprocess.run(
            ['osascript', '-e', 'tell application "System Events" to (name of processes) contains "Messages"'],
            capture_output=True,
            text=True,
            timeout=5
        )
        messages_running = "true" in check_result.stdout.lower()
        
        # 2. Messages 앱 계정 정보 확인 (더 간단한 방식)
        account_result = subprocess.run(
            ['osascript', '-e', '''
            tell application "Messages"
                try
                    return "Messages 앱 접근 가능"
                on error errMsg
                    return "ERROR: " & errMsg
                end try
            end tell
            '''],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        return jsonify({
            'success': True,
            'messages_running': messages_running,
            'check_output': check_result.stdout.strip(),
            'account_info': account_result.stdout.strip(),
            'account_error': account_result.stderr.strip() if account_result.stderr else None
        })
        
    except Exception as e:
        print(f"🔍 [DEBUG] AppleScript 테스트 오류: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/send-sms', methods=['POST'])
def send_sms():
    """SMS 전송"""
    print("🔍 [DEBUG] SMS 전송 API 호출됨")
    
    try:
        data = request.json
        recipients = data.get('recipients', [])
        message = data.get('message', '').strip()
        
        print(f"🔍 [DEBUG] 수신자 수: {len(recipients)}")
        print(f"🔍 [DEBUG] 메시지 길이: {len(message)}")
        
        if not message:
            print("🔍 [DEBUG] 메시지 내용 없음")
            return jsonify({'success': False, 'message': '메시지 내용을 입력해주세요.'}), 400
        
        if not recipients:
            print("🔍 [DEBUG] 수신자 없음")
            return jsonify({'success': False, 'message': '수신자를 선택해주세요.'}), 400
        
        results = []
        
        for i, recipient in enumerate(recipients):
            phone = recipient.get('phone')
            name = recipient.get('name')
            
            print(f"🔍 [DEBUG] 전송 중 ({i+1}/{len(recipients)}): {name} ({phone})")
            
            success, result_message = send_message_via_applescript(phone, message)
            
            result = {
                'name': name,
                'phone': phone,
                'success': success,
                'message': result_message
            }
            
            results.append(result)
            print(f"🔍 [DEBUG] 전송 결과: {success} - {result_message}")
        
        print(f"🔍 [DEBUG] 전체 전송 완료. 성공: {sum(1 for r in results if r['success'])}/{len(results)}")
        
        return jsonify({
            'success': True,
            'results': results
        })
    
    except Exception as e:
        print(f"🔍 [DEBUG] SMS API 오류: {e}")
        return jsonify({'success': False, 'message': f'서버 오류: {str(e)}'}), 500

if __name__ == '__main__':
    # 로깅 설정
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/sms_app.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('SMS 웹앱 시작')
    
    # 초기 연락처 파일이 없으면 빈 배열로 생성
    if not os.path.exists(CONTACTS_FILE):
        save_contacts([])
    
    # 환경 변수로 디버그 모드 제어
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    host = '127.0.0.1'  # 보안을 위해 로컬 접근만 허용
    
    print("🚀 MacOS SMS 웹앱이 시작되었습니다!")
    print(f"📱 웹 브라우저에서 http://{host}:5001 으로 접속하세요.")
    print("⚠️  메시지 앱이 실행되어 있는지 확인하세요.")
    
    app.run(debug=debug_mode, host=host, port=5001)

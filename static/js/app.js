// MacOS SMS 웹앱 JavaScript

class SMSApp {
    constructor() {
        this.contacts = [];
        this.selectedRecipients = new Set();
        this.uploadResult = null; // 파일 업로드 결과 저장
        this._loadingGuard = null; // 로딩 모달 안전 종료 타이머
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadContacts();
        this.updateCharCount();
        
        // 페이지 로드 시 모든 모달 닫기
        setTimeout(() => {
            this.closeAllModals();
            this.validateTabContent(); // 탭 상태 확인
        }, 500);
    }

    bindEvents() {
        // 모든 모달 hidden 이벤트에 스크롤 복구 연결
        const modalIds = ['loadingModal', 'uploadResultModal'];
        modalIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('hidden.bs.modal', () => {
                    console.log('🔍 [DEBUG] 모달 hidden 이벤트:', id);
                    this.restoreScroll();
                });
                el.addEventListener('hide.bs.modal', () => {
                    console.log('🔍 [DEBUG] 모달 hide 이벤트:', id);
                    // 트랜지션 동안도 스크롤 막히지 않도록 선제 복구
                    this.restoreScroll();
                });
            }
        });

        // 연락처 추가 폼
        const addContactForm = document.getElementById('addContactForm');
        console.log('🔍 [DEBUG] 연락처 추가 폼 요소:', !!addContactForm);
        
        if (addContactForm) {
            addContactForm.addEventListener('submit', (e) => {
                console.log('🔍 [DEBUG] 폼 제출 이벤트 발생');
                e.preventDefault();
                this.addContact();
            });
        } else {
            console.error('🔍 [DEBUG] addContactForm 요소를 찾을 수 없음');
        }

        // 표 연락처 폼
        const tableContactForm = document.getElementById('tableContactForm');
        console.log('🔍 [DEBUG] 표 연락처 폼 요소:', !!tableContactForm);
        
        if (tableContactForm) {
            tableContactForm.addEventListener('submit', (e) => {
                console.log('🔍 [DEBUG] 표 폼 제출 이벤트 발생');
                e.preventDefault();
                this.submitTableContacts();
            });
        } else {
            console.error('🔍 [DEBUG] tableContactForm 요소를 찾을 수 없음');
        }

        // 표 행 추가 버튼
        const addTableRowBtn = document.getElementById('addTableRowBtn');
        if (addTableRowBtn) {
            addTableRowBtn.addEventListener('click', () => {
                this.addTableRow();
            });
        }

        // 표 전체 삭제 버튼
        const clearTableBtn = document.getElementById('clearTableBtn');
        if (clearTableBtn) {
            clearTableBtn.addEventListener('click', () => {
                this.clearTable();
            });
        }

        // 표의 동적 이벤트 리스너 (이벤트 위임 사용)
        const contactsTableBody = document.getElementById('contactsTableBody');
        if (contactsTableBody) {
            // 행 삭제 버튼
            contactsTableBody.addEventListener('click', (e) => {
                if (e.target.closest('.delete-row-btn')) {
                    this.deleteTableRow(e.target.closest('tr'));
                }
            });

            // 붙여넣기 감지 (첫 번째 이름 입력 필드에서)
            contactsTableBody.addEventListener('paste', (e) => {
                if (e.target.classList.contains('contact-name')) {
                    e.preventDefault();
                    this.handleTablePaste(e, e.target);
                }
            });

            // Enter 키로 새 행 추가
            contactsTableBody.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    const currentRow = e.target.closest('tr');
                    const isLastRow = !currentRow.nextElementSibling;
                    const nameInput = currentRow.querySelector('.contact-name');
                    const phoneInput = currentRow.querySelector('.contact-phone');
                    
                    if (isLastRow && (nameInput.value.trim() || phoneInput.value.trim())) {
                        e.preventDefault();
                        this.addTableRow();
                        // 새로 추가된 행의 첫 번째 입력 필드로 포커스 이동
                        setTimeout(() => {
                            const newRow = currentRow.nextElementSibling;
                            if (newRow) {
                                newRow.querySelector('.contact-name').focus();
                            }
                        }, 10);
                    }
                }
            });
        }

        // 파일 업로드 폼
        document.getElementById('uploadContactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadContactFile();
        });

        // 연락처 가져오기 버튼
        document.getElementById('importContactsBtn').addEventListener('click', () => {
            this.importContacts();
        });

        // 전체 선택/해제 버튼
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAllRecipients();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllRecipients();
        });

        // SMS 전송 버튼
        document.getElementById('sendSmsBtn').addEventListener('click', () => {
            this.sendSMS();
        });

        // AppleScript 테스트 버튼
        document.getElementById('testAppleScriptBtn').addEventListener('click', () => {
            this.testAppleScript();
        });

        // 모달 강제 닫기 버튼
        document.getElementById('closeModalsBtn').addEventListener('click', () => {
            console.log('🔍 [DEBUG] 수동 모달 닫기 버튼 클릭');
            this.closeAllModals();
            this.showToast('모든 모달을 닫았습니다.', 'info');
        });

        // 메시지 글자 수 카운트
        document.getElementById('messageText').addEventListener('input', () => {
            this.updateCharCount();
        });

        // 전화번호 입력 포맷팅
        document.getElementById('contactPhone').addEventListener('input', (e) => {
            this.formatPhoneNumber(e.target);
        });

        // 페이지 언로드 시 모든 모달 닫기
        window.addEventListener('beforeunload', () => {
            this.closeAllModals();
        });

        // 페이지 숨김/표시 시 모달 상태 확인
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // 페이지가 다시 표시될 때 모달 상태 확인
                setTimeout(() => {
                    const openModals = document.querySelectorAll('.modal.show');
                    if (openModals.length === 0) {
                        this.closeAllModals(); // 혹시 남은 backdrop 등 정리
                    }
                }, 100);
            }
        });

        // 탭 전환 이벤트 처리
        const tabButtons = document.querySelectorAll('#addContactTabs button[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (event) => {
                console.log('🔍 [DEBUG] 탭 전환됨:', event.target.id);
                // 탭 전환 후 폼 상태 확인
                this.validateTabContent();
            });
        });
    }

    async loadContacts() {
        try {
            const response = await fetch('/api/contacts');
            this.contacts = await response.json();
            this.renderContacts();
            this.renderRecipients();
        } catch (error) {
            this.showToast('연락처 로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async addContact() {
        console.log('🔍 [DEBUG] 연락처 추가 함수 호출됨');
        
        const nameElement = document.getElementById('contactName');
        const phoneElement = document.getElementById('contactPhone');
        
        console.log('🔍 [DEBUG] 입력 요소들:', {
            nameElement: !!nameElement,
            phoneElement: !!phoneElement
        });
        
        if (!nameElement || !phoneElement) {
            console.error('🔍 [DEBUG] 입력 요소를 찾을 수 없음');
            this.showToast('입력 폼을 찾을 수 없습니다.', 'error');
            return;
        }
        
        const name = nameElement.value.trim();
        const phone = phoneElement.value.trim();
        
        console.log('🔍 [DEBUG] 입력값:', { name, phone });

        if (!name || !phone) {
            console.log('🔍 [DEBUG] 입력값이 비어있음');
            this.showToast('이름과 전화번호를 모두 입력해주세요.', 'warning');
            return;
        }

        try {
            console.log('🔍 [DEBUG] API 요청 시작');
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, phone })
            });

            console.log('🔍 [DEBUG] API 응답 상태:', response.status);
            const result = await response.json();
            console.log('🔍 [DEBUG] API 응답 결과:', result);

            if (result.success) {
                // 중복 체크 (정규화된 전화번호 기준)
                const normalizedNewPhone = this.normalizePhoneNumber(result.contact.phone);
                const existingRecipient = Array.from(this.selectedRecipients).find(r => 
                    this.normalizePhoneNumber(r.phone) === normalizedNewPhone
                );
                
                if (existingRecipient) {
                    this.showToast('이미 수신자 목록에 있는 전화번호입니다.', 'warning');
                } else {
                    // 수신자 리스트에 추가
                    const newRecipient = {
                        id: result.contact.id,
                        name: result.contact.name,
                        phone: result.contact.phone
                    };
                    this.selectedRecipients.add(newRecipient);
                    this.renderRecipients();
                    this.showToast('수신자 목록에 추가되었습니다.', 'success');
                }
                
                document.getElementById('addContactForm').reset();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('🔍 [DEBUG] API 요청 오류:', error);
            this.showToast('연락처 추가 중 오류가 발생했습니다.', 'error');
        }
    }

    async uploadContactFile() {
        const fileInput = document.getElementById('contactFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('파일을 선택해주세요.', 'warning');
            return;
        }

        // 로딩 모달 표시
        const loadingModalElRef = document.getElementById('loadingModal');
        const loadingModal = bootstrap.Modal.getOrCreateInstance(loadingModalElRef, { backdrop: 'static', keyboard: false });
        document.getElementById('loadingTitle').textContent = '파일 업로드 중...';
        document.getElementById('loadingMessage').textContent = '파일을 분석하고 있습니다.';
        loadingModal.show();
        console.log('🔍 [DEBUG] 로딩 모달 표시 (업로드)');
        // 안전 종료 타이머 (최대 10초 후 강제 종료)
        clearTimeout(this._loadingGuard);
        this._loadingGuard = setTimeout(() => {
            console.warn('🔍 [DEBUG] 로딩 모달 강제 종료 (타임아웃 10s)');
            this.closeAllModals();
            this.showToast('파일 업로드 시간이 초과되었습니다. 페이지를 새로고침해주세요.', 'warning');
        }, 10000);

        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('🔍 [DEBUG] 파일 업로드 시작:', file.name);

            const response = await fetch('/api/upload-contacts', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // 로딩 모달 우선 닫기
            clearTimeout(this._loadingGuard);
            this.closeAllModals();
            
            // 약간의 지연 후 결과 처리 (모달 정리 완료 대기)
            setTimeout(() => {

                console.log('🔍 [DEBUG] 업로드 결과:', result);

                if (result.success) {
                    this.uploadResult = result;
                    // 모든 파싱된 연락처를 수신자에 추가 (정규화된 전화번호 기준 중복 방지)
                    const existingPhones = new Set(Array.from(this.selectedRecipients).map(r => this.normalizePhoneNumber(r.phone)));
                    (result.parsed_contacts || []).forEach(c => {
                        const normalizedPhone = this.normalizePhoneNumber(c.phone);
                        if (!existingPhones.has(normalizedPhone)) {
                            this.selectedRecipients.add({ id: c.phone, name: c.name, phone: c.phone });
                            existingPhones.add(normalizedPhone);
                        }
                    });
                    this.renderRecipients();
                    // 미리보기 모달은 유지 (원하면 수동 닫기)
                    this.showUploadResult(result);
                    // 파일 입력은 여기서 초기화하지 않음 (성공 후에 초기화)
                } else {
                    this.showToast(result.message, 'error');
                    fileInput.value = ''; // 실패시에만 파일 입력 초기화
                }
            }, 300); // 300ms 지연
        } catch (error) {
            // 오류 발생시 로딩 모달 닫기 및 강제 정리
            clearTimeout(this._loadingGuard);
            this.closeAllModals();
            console.error('🔍 [DEBUG] 파일 업로드 오류:', error);
            this.showToast(`파일 업로드 중 오류: ${error.message}`, 'error');
            fileInput.value = ''; // 오류시 파일 입력 초기화
        }
    }

    showUploadResult(result) {
        // 통계 업데이트
        document.getElementById('totalParsed').textContent = result.total_parsed;
        document.getElementById('totalNew').textContent = result.total_new;
        document.getElementById('totalDuplicates').textContent = result.total_duplicates;

        // 새로운 연락처 미리보기
        const contactPreview = document.getElementById('contactPreview');
        if (result.new_contacts.length > 0) {
            contactPreview.innerHTML = result.new_contacts.slice(0, 20).map(contact => `
                <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                        <strong>${this.escapeHtml(contact.name)}</strong><br>
                        <small class="text-muted">${this.escapeHtml(contact.phone)}</small>
                    </div>
                    <small class="text-info">${this.escapeHtml(contact.source)}</small>
                </div>
            `).join('');

            if (result.new_contacts.length > 20) {
                contactPreview.innerHTML += `
                    <div class="text-center text-muted py-2">
                        <small>... 그리고 ${result.new_contacts.length - 20}개 더</small>
                    </div>
                `;
            }
        } else {
            contactPreview.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-3"></i>
                    <p>새로운 연락처가 없습니다.</p>
                </div>
            `;
        }

        // 중복 연락처 표시
        const duplicateCard = document.getElementById('duplicateCard');
        const duplicatePreview = document.getElementById('duplicatePreview');
        
        if (result.duplicates.length > 0) {
            duplicateCard.style.display = 'block';
            duplicatePreview.innerHTML = result.duplicates.slice(0, 10).map(contact => `
                <div class="d-flex justify-content-between align-items-center py-1">
                    <div>
                        <strong>${this.escapeHtml(contact.name)}</strong>
                        <small class="text-muted ms-2">${this.escapeHtml(contact.phone)}</small>
                    </div>
                </div>
            `).join('');

            if (result.duplicates.length > 10) {
                duplicatePreview.innerHTML += `
                    <div class="text-center text-muted py-2">
                        <small>... 그리고 ${result.duplicates.length - 10}개 더</small>
                    </div>
                `;
            }
        } else {
            duplicateCard.style.display = 'none';
        }

        // 가져오기 버튼 텍스트 업데이트
        const importBtn = document.getElementById('importBtnText');
        // 사용성 향상: 수신자에 이미 추가되므로 항상 가져오기 가능하게 표시
        importBtn.textContent = `${result.new_contacts.length}개 저장 (이미 수신자에 추가됨)`;
        document.getElementById('importContactsBtn').disabled = result.new_contacts.length === 0;

        // 모달 표시
        const uploadModal = new bootstrap.Modal(document.getElementById('uploadResultModal'));
        uploadModal.show();
    }

    async importContacts() {
        if (!this.uploadResult || this.uploadResult.new_contacts.length === 0) {
            this.showToast('가져올 연락처가 없습니다.', 'warning');
            return;
        }

        const importBtn = document.getElementById('importContactsBtn');
        const originalText = importBtn.innerHTML;
        importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 가져오는 중...';
        importBtn.disabled = true;

        // 업로드 결과 모달 먼저 닫기 (중첩 모달로 인한 스크롤 잠김 방지)
        const uploadResultModalEl = document.getElementById('uploadResultModal');
        if (uploadResultModalEl) {
            try {
                const inst = bootstrap.Modal.getInstance(uploadResultModalEl) || new bootstrap.Modal(uploadResultModalEl);
                inst.hide();
            } catch (e) {
                console.warn('🔍 [DEBUG] 업로드 결과 모달 닫기 실패, 수동 정리 시도', e);
            } finally {
                uploadResultModalEl.classList.remove('show');
                uploadResultModalEl.style.display = 'none';
                uploadResultModalEl.setAttribute('aria-hidden', 'true');
                uploadResultModalEl.removeAttribute('aria-modal');
                uploadResultModalEl.removeAttribute('role');
            }
        }

        // 로딩 모달 표시
        const loadingModalEl = document.getElementById('loadingModal');
        const loadingModal = bootstrap.Modal.getOrCreateInstance(loadingModalEl, { backdrop: 'static', keyboard: false });
        document.getElementById('loadingTitle').textContent = '연락처 가져오는 중...';
        document.getElementById('loadingMessage').textContent = '연락처를 저장하고 있습니다.';
        loadingModal.show();
        console.log('🔍 [DEBUG] 로딩 모달 표시 (가져오기)');
        clearTimeout(this._loadingGuard);
        this._loadingGuard = setTimeout(() => {
            console.warn('🔍 [DEBUG] 로딩 모달 강제 종료 (타임아웃 15s)');
            try { bootstrap.Modal.getOrCreateInstance(loadingModalEl).hide(); } catch (_) {}
            this.closeAllModals();
        }, 15000);

        try {
            const response = await fetch('/api/import-contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contacts: this.uploadResult.new_contacts
                })
            });

            const result = await response.json();

            console.log('🔍 [DEBUG] 연락처 가져오기 응답:', result);

            if (result.success) {
                console.log('🔍 [DEBUG] 연락처 가져오기 성공, 모달 닫기 시작');
                
                // 모든 모달 즉시 닫기
                try { loadingModal.hide(); } catch (_) {}
                clearTimeout(this._loadingGuard);
                this.closeAllModals();
                this.restoreScroll();
                
                // 연락처 목록 새로고침
                // this.loadContacts(); // 연락처 목록 기능 비활성화
                
                // 업로드 결과 초기화
                this.uploadResult = null;
                
                // 파일 입력 초기화
                document.getElementById('contactFile').value = '';
                
                // 모달이 완전히 닫힌 후 토스트 표시
                setTimeout(() => {
                    // 혹시 남아있는 로딩 모달 상태 재확인 후 마지막으로 강제 정리
                    this.closeAllModals();
                    this.showToast(result.message, 'success');
                }, 200);
                
            } else {
                console.log('🔍 [DEBUG] 연락처 가져오기 실패, 모달 닫기');
                try { loadingModal.hide(); } catch (_) {}
                clearTimeout(this._loadingGuard);
                this.closeAllModals();
                this.restoreScroll();
                setTimeout(() => {
                    this.closeAllModals();
                    this.showToast(result.message, 'error');
                }, 200);
            }
        } catch (error) {
            console.error('🔍 [DEBUG] 연락처 가져오기 오류:', error);
            try { loadingModal.hide(); } catch (_) {}
            clearTimeout(this._loadingGuard);
            this.closeAllModals();
            this.restoreScroll();
            this.showToast(`연락처 가져오기 중 오류: ${error.message}`, 'error');
        } finally {
            importBtn.innerHTML = originalText;
            importBtn.disabled = false;
        }
    }

    async deleteContact(contactId) {
        if (!confirm('정말로 이 연락처를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/contacts/${contactId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('연락처가 삭제되었습니다.', 'success');
                this.loadContacts();
            } else {
                this.showToast('연락처 삭제 중 오류가 발생했습니다.', 'error');
            }
        } catch (error) {
            this.showToast('연락처 삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    renderContacts() {
        // 연락처 목록은 숨김 처리 상태이므로 렌더링을 최소화
        const contactsCard = document.getElementById('contactsCard');
        if (contactsCard) contactsCard.style.display = 'none';
    }

    renderRecipients() {
        const recipientsList = document.getElementById('recipientsList');
        const recipients = Array.from(this.selectedRecipients);

        if (recipients.length === 0) {
            recipientsList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-users fa-2x mb-3"></i>
                    <p>수신자를 추가해주세요. (직접 입력 또는 파일 업로드)</p>
                </div>
            `;
            this.updateSelectedCount();
            return;
        }

        recipientsList.innerHTML = recipients.map(recipient => `
            <div class="recipient-item">
                <div class="form-check">
                    <input class="form-check-input recipient-checkbox" type="checkbox" 
                           checked
                           value="${recipient.id || ''}" id="recipient-${recipient.id || recipient.phone}"
                           onchange="app.toggleRecipientByKey('${recipient.id || recipient.phone}')">
                    <label class="form-check-label" for="recipient-${recipient.id || recipient.phone}">
                        <strong>${this.escapeHtml(recipient.name)}</strong><br>
                        <small class="text-muted">${this.escapeHtml(recipient.phone)}</small>
                    </label>
                </div>
            </div>
        `).join('');

        this.updateSelectedCount();
    }

    toggleRecipientByKey(key) {
        const checkbox = document.getElementById(`recipient-${key}`);
        const recipients = Array.from(this.selectedRecipients);
        const found = recipients.find(r => (r.id || r.phone) == key);
        if (!found) return;
        if (!checkbox.checked) {
            this.selectedRecipients.delete(found);
        }
        this.renderRecipients();
    }

    selectAllRecipients() {
        // 이미 선택된 수신자만 체크 유지
        this.renderRecipients();
    }

    clearAllRecipients() {
        this.selectedRecipients.clear();
        this.renderRecipients();
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        const count = this.selectedRecipients.size;
        countElement.innerHTML = `선택된 수신자: <span class="fw-bold">${count}</span>명`;
    }

    async testAppleScript() {
        console.log('🔍 [DEBUG] AppleScript 테스트 시작');
        
        try {
            const response = await fetch('/api/test-applescript');
            const result = await response.json();
            
            console.log('🔍 [DEBUG] 테스트 결과:', result);
            
            if (result.success) {
                let message = `AppleScript 테스트 결과:\n\n`;
                message += `Messages 앱 실행 중: ${result.messages_running ? '✅ 예' : '❌ 아니오'}\n`;
                message += `프로세스 확인: ${result.check_output}\n`;
                message += `계정 정보: ${result.account_info}\n`;
                if (result.account_error) {
                    message += `계정 오류: ${result.account_error}\n`;
                }
                
                alert(message);
                this.showToast('AppleScript 테스트 완료', 'info');
            } else {
                alert(`테스트 실패: ${result.error}`);
                this.showToast('AppleScript 테스트 실패', 'error');
            }
        } catch (error) {
            console.error('🔍 [DEBUG] 테스트 오류:', error);
            alert(`테스트 중 오류 발생: ${error.message}`);
            this.showToast('테스트 중 오류가 발생했습니다.', 'error');
        }
    }

    async sendSMS() {
        console.log('🔍 [DEBUG] SMS 전송 시작');
        
        const message = document.getElementById('messageText').value.trim();
        const recipients = Array.from(this.selectedRecipients);

        console.log(`🔍 [DEBUG] 메시지: "${message}"`);
        console.log(`🔍 [DEBUG] 수신자:`, recipients);

        if (!message) {
            this.showToast('메시지 내용을 입력해주세요.', 'warning');
            return;
        }

        if (recipients.length === 0) {
            this.showToast('수신자를 선택해주세요.', 'warning');
            return;
        }

        // 로딩 모달 표시
        const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
        loadingModal.show();

        try {
            console.log('🔍 [DEBUG] API 요청 전송 중...');
            
            const response = await fetch('/api/send-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients: recipients,
                    message: message
                })
            });

            console.log(`🔍 [DEBUG] API 응답 상태: ${response.status}`);
            
            const result = await response.json();
            console.log('🔍 [DEBUG] API 응답 데이터:', result);
            
            loadingModal.hide();

            if (result.success) {
                this.displaySendResults(result.results);
                document.getElementById('messageText').value = '';
                this.updateCharCount();
                this.clearAllRecipients();
                this.showToast('SMS 전송 완료', 'success');
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('🔍 [DEBUG] SMS 전송 오류:', error);
            loadingModal.hide();
            this.showToast(`SMS 전송 중 오류: ${error.message}`, 'error');
        }
    }

    displaySendResults(results) {
        const resultsContainer = document.getElementById('sendResults');
        const resultsContent = document.getElementById('resultsContent');

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        let html = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="card border-success">
                        <div class="card-body text-center">
                            <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                            <h5 class="text-success">성공</h5>
                            <h3 class="mb-0">${successCount}건</h3>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-danger">
                        <div class="card-body text-center">
                            <i class="fas fa-exclamation-circle fa-2x text-danger mb-2"></i>
                            <h5 class="text-danger">실패</h5>
                            <h3 class="mb-0">${failCount}건</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div class="results-list">
        `;

        results.forEach(result => {
            html += `
                <div class="result-item ${result.success ? 'result-success' : 'result-error'}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${this.escapeHtml(result.name)}</strong>
                            <small class="d-block text-muted">${this.escapeHtml(result.phone)}</small>
                        </div>
                        <div class="text-end">
                            <i class="fas fa-${result.success ? 'check' : 'times'} me-2"></i>
                            ${result.success ? '전송 완료' : '전송 실패'}
                        </div>
                    </div>
                    ${!result.success ? `<small class="text-muted mt-1 d-block">${this.escapeHtml(result.message)}</small>` : ''}
                </div>
            `;
        });

        html += '</div>';
        resultsContent.innerHTML = html;
        resultsContainer.style.display = 'block';

        // 결과 영역으로 스크롤
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    updateCharCount() {
        const messageText = document.getElementById('messageText');
        const charCount = document.getElementById('charCount');
        const count = messageText.value.length;
        
        charCount.textContent = count;
        
        if (count > 1000) {
            charCount.style.color = '#dc3545';
        } else if (count > 800) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#6c757d';
        }
    }

    formatPhoneNumber(input) {
        let value = input.value.replace(/[^\d]/g, '');
        
        if (value.length >= 11) {
            value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (value.length >= 7) {
            value = value.replace(/(\d{3})(\d{4})/, '$1-$2');
        } else if (value.length >= 4) {
            value = value.replace(/(\d{3})/, '$1-');
        }
        
        input.value = value;
    }

    normalizePhoneNumber(phone) {
        // 전화번호에서 숫자만 추출하여 정규화
        return phone.replace(/[^\d]/g, '');
    }

    isValidPhone(phone) {
        // 전화번호 유효성 검사
        const cleanPhone = phone.replace(/[^\d]/g, '');
        
        console.log('🔍 [DEBUG] 전화번호 검증:', { original: phone, clean: cleanPhone });
        
        // 한국 휴대폰 번호 (010, 011, 016, 017, 018, 019)
        const mobilePattern = /^01[0-9]\d{7,8}$/;
        
        // 일반 전화번호 (지역번호 포함)
        const landlinePattern = /^0[2-9]\d{7,9}$/;
        
        const isValid = mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone);
        console.log('🔍 [DEBUG] 전화번호 검증 결과:', { cleanPhone, isValid });
        
        return isValid;
    }

    formatPhone(phone) {
        // 전화번호 포맷팅 (하이픈 추가)
        const cleanPhone = phone.replace(/[^\d]/g, '');
        
        if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
            // 휴대폰 번호: 010-1234-5678
            return cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
            // 지역번호 + 8자리: 02-1234-5678
            return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (cleanPhone.length === 9 && cleanPhone.startsWith('0')) {
            // 지역번호 + 7자리: 031-123-4567
            return cleanPhone.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
        }
        
        // 기본 포맷팅 시도
        if (cleanPhone.length >= 11) {
            return cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (cleanPhone.length >= 7) {
            return cleanPhone.replace(/(\d{3})(\d{4})/, '$1-$2');
        }
        
        return cleanPhone;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastBody = document.getElementById('toastBody');
        const toastHeader = toast.querySelector('.toast-header i');
        
        // 아이콘과 색상 설정
        const icons = {
            success: 'fa-check-circle text-success',
            error: 'fa-exclamation-circle text-danger',
            warning: 'fa-exclamation-triangle text-warning',
            info: 'fa-info-circle text-primary'
        };
        
        toastHeader.className = `fas ${icons[type] || icons.info} me-2`;
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    validateTabContent() {
        console.log('🔍 [DEBUG] 탭 콘텐츠 검증 중...');
        
        // 직접 입력 탭 요소들 확인
        const manualPane = document.getElementById('manual-pane');
        const filePane = document.getElementById('file-pane');
        
        if (manualPane) {
            const nameInput = document.getElementById('contactName');
            const phoneInput = document.getElementById('contactPhone');
            console.log('🔍 [DEBUG] 직접 입력 요소들:', {
                nameInput: !!nameInput,
                phoneInput: !!phoneInput
            });
        }
        
        if (filePane) {
            const fileInput = document.getElementById('contactFile');
            console.log('🔍 [DEBUG] 파일 업로드 요소들:', {
                fileInput: !!fileInput
            });
        }
        
        // 활성 탭 확인
        const activeTab = document.querySelector('#addContactTabs .nav-link.active');
        const activePane = document.querySelector('.tab-pane.show.active');
        
        console.log('🔍 [DEBUG] 활성 탭:', {
            activeTabId: activeTab?.id,
            activePaneId: activePane?.id
        });
    }

    // 모든 모달을 강제로 닫는 유틸리티 함수
    closeAllModals() {
        console.log('🔍 [DEBUG] 모든 모달 강제 닫기 시작');

        // 모든 모달 요소 찾기
        const allModals = document.querySelectorAll('.modal');
        
        allModals.forEach(modalEl => {
            try {
                // Bootstrap 모달 인스턴스가 있으면 정상적으로 닫기
                const instance = bootstrap.Modal.getInstance(modalEl);
                if (instance) {
                    instance.hide();
                }
            } catch (e) {
                console.warn('🔍 [DEBUG] 모달 인스턴스 닫기 실패:', modalEl.id, e);
            }
            
            // 강제 DOM 상태 정리
            modalEl.classList.remove('show', 'fade');
            modalEl.style.display = 'none';
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.removeAttribute('aria-modal');
            modalEl.removeAttribute('role');
            modalEl.removeAttribute('tabindex');
        });

        // 모든 backdrop 제거
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            backdrop.remove();
        });

        // body 클래스 및 스타일 강제 정리
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.style.position = '';
        document.body.style.top = '';
        
        // html 요소도 정리
        document.documentElement.style.overflow = '';
        document.documentElement.style.paddingRight = '';
        
        console.log('🔍 [DEBUG] 모든 모달 강제 닫기 완료');
    }

    addTableRow() {
        const tableBody = document.getElementById('contactsTableBody');
        const newRow = document.createElement('tr');
        
        newRow.innerHTML = `
            <td><input type="text" class="form-control form-control-sm contact-name" placeholder="이름 입력"></td>
            <td><input type="tel" class="form-control form-control-sm contact-phone" placeholder="010-1234-5678"></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger delete-row-btn">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(newRow);
        console.log('🔍 [DEBUG] 새 행 추가됨');
    }

    deleteTableRow(row) {
        const tableBody = document.getElementById('contactsTableBody');
        
        // 최소 1개 행은 유지
        if (tableBody.children.length > 1) {
            row.remove();
            console.log('🔍 [DEBUG] 행 삭제됨');
        } else {
            // 마지막 행이면 내용만 초기화
            const nameInput = row.querySelector('.contact-name');
            const phoneInput = row.querySelector('.contact-phone');
            nameInput.value = '';
            phoneInput.value = '';
            nameInput.focus();
            console.log('🔍 [DEBUG] 마지막 행 내용 초기화됨');
        }
    }

    clearTable() {
        const tableBody = document.getElementById('contactsTableBody');
        
        // 모든 행 삭제 후 빈 행 하나 추가
        tableBody.innerHTML = `
            <tr>
                <td><input type="text" class="form-control form-control-sm contact-name" placeholder="이름 입력"></td>
                <td><input type="tel" class="form-control form-control-sm contact-phone" placeholder="010-1234-5678"></td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger delete-row-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
        
        console.log('🔍 [DEBUG] 표 전체 초기화됨');
    }

    handleTablePaste(event, targetInput) {
        console.log('🔍 [DEBUG] 붙여넣기 이벤트 발생');
        
        // 클립보드에서 데이터 가져오기
        const clipboardData = event.clipboardData || window.clipboardData;
        const pastedData = clipboardData.getData('text');
        
        console.log('🔍 [DEBUG] 붙여넣기 데이터:', pastedData);
        
        // 멀티라인 또는 탭 구분 데이터인지 확인
        if (pastedData.includes('\t') || pastedData.includes('\n')) {
            console.log('🔍 [DEBUG] 표 형식 데이터 감지 - 자동 파싱 시작');
            this.processPastedTableData(targetInput, pastedData);
        } else {
            // 단일 값인 경우 그대로 입력
            targetInput.value = pastedData;
            console.log('🔍 [DEBUG] 단일 값 입력 완료');
        }
    }

    processPastedTableData(targetInput, pastedData) {
        try {
            const lines = pastedData.split('\n').filter(line => line.trim());
            const tableBody = document.getElementById('contactsTableBody');
            const currentRow = targetInput.closest('tr');
            let processedCount = 0;
            
            console.log('🔍 [DEBUG] 처리할 줄 수:', lines.length);
            
            // 현재 행 초기화
            currentRow.querySelector('.contact-name').value = '';
            currentRow.querySelector('.contact-phone').value = '';
            
            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;
                
                console.log('🔍 [DEBUG] 처리 중인 줄:', trimmedLine);
                
                // 다양한 구분자로 분리 시도
                let parts;
                if (trimmedLine.includes('\t')) {
                    // 탭으로 구분
                    parts = trimmedLine.split('\t').map(part => part.trim()).filter(part => part);
                } else if (trimmedLine.includes('  ')) {
                    // 여러 스페이스로 구분 (2개 이상)
                    parts = trimmedLine.split(/\s{2,}/).map(part => part.trim()).filter(part => part);
                } else {
                    // 단일 스페이스로 구분
                    parts = trimmedLine.split(/\s+/).map(part => part.trim()).filter(part => part);
                }
                
                console.log('🔍 [DEBUG] 분리된 부분:', parts);
                
                if (parts.length >= 2) {
                    let name = parts[0];
                    let phone = parts[parts.length - 1]; // 마지막 부분을 전화번호로 사용
                    
                    // 중간 부분들을 이름에 포함 (회사명 등)
                    if (parts.length > 2) {
                        name = parts.slice(0, -1).join(' ');
                    }
                    
                    // 전화번호에서 숫자와 하이픈만 추출
                    const cleanPhone = phone.replace(/[^\d-]/g, '');
                    
                    if (name && cleanPhone && cleanPhone.replace(/[^\d]/g, '').length >= 10) {
                        if (processedCount === 0) {
                            // 첫 번째 줄은 현재 행에 처리
                            currentRow.querySelector('.contact-name').value = name;
                            currentRow.querySelector('.contact-phone').value = cleanPhone;
                            console.log('🔍 [DEBUG] 현재 행에 입력:', name, cleanPhone);
                        } else {
                            // 나머지 줄들은 새 행에 추가
                            this.addTableRow();
                            const newRow = tableBody.lastElementChild;
                            newRow.querySelector('.contact-name').value = name;
                            newRow.querySelector('.contact-phone').value = cleanPhone;
                            console.log('🔍 [DEBUG] 새 행에 입력:', name, cleanPhone);
                        }
                        processedCount++;
                    } else {
                        console.log('🔍 [DEBUG] 무효한 데이터 건너뜀:', { name, phone, cleanPhone });
                    }
                } else {
                    console.log('🔍 [DEBUG] 충분한 데이터가 없는 줄 건너뜀:', trimmedLine);
                }
            });
            
            if (processedCount > 0) {
                console.log('🔍 [DEBUG] 붙여넣기 데이터 처리 완료, 처리된 행:', processedCount);
                this.showSuccess(`${processedCount}개 연락처가 표에 입력되었습니다.`);
            } else {
                console.log('🔍 [DEBUG] 처리 가능한 데이터가 없음');
                this.showError('붙여넣기 데이터에서 유효한 이름과 전화번호를 찾을 수 없습니다.\n각 줄에 이름과 전화번호가 포함되어 있는지 확인해 주세요.');
            }
            
        } catch (error) {
            console.error('🔍 [DEBUG] 붙여넣기 데이터 처리 오류:', error);
            this.showError('붙여넣기 데이터 처리 중 오류가 발생했습니다.');
        }
    }

    async submitTableContacts() {
        console.log('🔍 [DEBUG] submitTableContacts 함수 호출됨');
        
        const tableBody = document.getElementById('contactsTableBody');
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const contacts = [];
        const errors = [];
        
        console.log('🔍 [DEBUG] 테이블 행 수:', rows.length);
        
        rows.forEach((row, index) => {
            const nameInput = row.querySelector('.contact-name');
            const phoneInput = row.querySelector('.contact-phone');
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();
            
            // 빈 행은 건너뛰기
            if (!name && !phone) return;
            
            // 이름 또는 전화번호 중 하나만 입력된 경우 오류
            if (!name || !phone) {
                errors.push(`${index + 1}번째 행: 이름과 전화번호를 모두 입력해주세요.`);
                return;
            }
            
            // 전화번호 유효성 검사
            if (!this.isValidPhone(phone)) {
                errors.push(`${index + 1}번째 행: "${phone}" - 유효하지 않은 전화번호입니다.`);
                return;
            }
            
            contacts.push({
                name: name,
                phone: this.formatPhone(phone)
            });
        });
        
        console.log('🔍 [DEBUG] 표에서 수집한 연락처:', contacts.length);
        console.log('🔍 [DEBUG] 오류:', errors.length);
        
        if (errors.length > 0) {
            this.showError('입력 오류:\n' + errors.slice(0, 5).join('\n') + 
                (errors.length > 5 ? `\n... 외 ${errors.length - 5}개 더` : ''));
            return;
        }
        
        if (contacts.length === 0) {
            this.showError('추가할 연락처를 입력해주세요.');
            return;
        }
        
        try {
            // 중복 체크
            const existingPhones = new Set(this.contacts.map(contact => contact.phone));
            const newContacts = contacts.filter(contact => !existingPhones.has(contact.phone));
            const duplicates = contacts.filter(contact => existingPhones.has(contact.phone));
            
            if (newContacts.length === 0) {
                this.showError('모든 연락처가 이미 존재합니다.');
                return;
            }
            
            // 서버에 연락처 추가하고 수신자 목록에도 추가
            for (const contact of newContacts) {
                const response = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(contact)
                });

                if (!response.ok) {
                    throw new Error('연락처 추가 실패');
                }
                
                const result = await response.json();
                if (result.success && result.contact) {
                    // 수신자 목록에 추가
                    const newRecipient = {
                        id: result.contact.id,
                        name: result.contact.name,
                        phone: result.contact.phone
                    };
                    this.selectedRecipients.add(newRecipient);
                }
            }
            
            // 수신자 목록 업데이트
            this.renderRecipients();
            
            // 성공 메시지
            let message = `${newContacts.length}명의 연락처가 추가되고 수신자 목록에 포함되었습니다.`;
            if (duplicates.length > 0) {
                message += `\n(${duplicates.length}명은 중복으로 제외되었습니다.)`;
            }
            
            this.showSuccess(message);
            
            // 표 초기화
            this.clearTable();
            
            // 연락처 목록 새로고침
            this.loadContacts();
            
        } catch (error) {
            console.error('🔍 [DEBUG] 표 연락처 추가 오류:', error);
            this.showError('연락처 추가 중 오류가 발생했습니다.');
        }
    }

    restoreScroll() {
        // body/html 스크롤 상태 복구 (강제)
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.paddingRight = '';
        
        // 혹시 남아있는 모달 관련 클래스들도 정리
        document.body.classList.remove('modal-backdrop');
        
        console.log('🔍 [DEBUG] 스크롤 상태 복구 완료');
    }
}

// 앱 초기화
const app = new SMSApp();

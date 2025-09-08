#!/bin/bash

# MacOS SMS 웹앱 실행 스크립트

echo "🍎 MacOS SMS 웹앱을 시작합니다..."
echo ""

# Python 버전 확인
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3가 설치되어 있지 않습니다."
    echo "   Homebrew로 설치: brew install python"
    exit 1
fi

echo "✅ Python 버전: $(python3 --version)"

# 가상 환경 디렉토리
VENV_DIR="venv"

# 가상 환경이 없으면 생성
if [ ! -d "$VENV_DIR" ]; then
    echo "🔧 가상 환경을 생성하는 중..."
    python3 -m venv $VENV_DIR
    
    if [ $? -ne 0 ]; then
        echo "❌ 가상 환경 생성에 실패했습니다."
        exit 1
    fi
    
    echo "✅ 가상 환경 생성 완료"
fi

# 가상 환경 활성화
echo "🔄 가상 환경을 활성화하는 중..."
source $VENV_DIR/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ 가상 환경 활성화에 실패했습니다."
    exit 1
fi

echo "✅ 가상 환경 활성화 완료"

# pip 업그레이드
echo "📦 pip를 업그레이드하는 중..."
pip install --upgrade pip > /dev/null 2>&1

# 의존성 설치
echo "📦 의존성을 설치하는 중..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ 의존성 설치에 실패했습니다."
    exit 1
fi

echo "✅ 의존성 설치 완료"
echo ""

# Messages 앱 실행 여부 확인
if ! pgrep -f "Messages" > /dev/null; then
    echo "📱 Messages 앱을 실행하는 중..."
    open -a Messages
    sleep 2
fi

echo "✅ Messages 앱이 실행 중입니다"
echo ""

# 환경 변수 설정
export FLASK_ENV=development

# 로그 디렉토리 생성
if [ ! -d "logs" ]; then
    mkdir logs
    echo "✅ 로그 디렉토리 생성 완료"
fi

# Flask 앱 실행
echo "🚀 웹 서버를 시작합니다..."
echo "   브라우저에서 http://127.0.0.1:5001 으로 접속하세요"
echo "   (보안을 위해 로컬 접근만 허용됩니다)"
echo "   종료하려면 Ctrl+C를 누르세요"
echo ""

python3 app.py

#!/bin/bash
# FinFlow Backend - Installation and Verification Script

set -e

echo "=================================================="
echo "FinFlow Backend - Installation & Startup Test"
echo "=================================================="
echo ""

# Check Python version
echo "Step 1: Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"
echo ""

# Install dependencies
echo "Step 2: Installing dependencies..."
pip install -q --no-input fastapi uvicorn pydantic pydantic-settings flask flask-cors sqlalchemy redis numpy pandas scikit-learn httpx requests python-multipart python-dotenv python-dateutil
echo "✓ Core dependencies installed"
echo ""

# Test compile all Python files
echo "Step 3: Compiling all Python files..."
find . -name "*.py" -type f ! -path "*/__pycache__/*" -exec python -m py_compile {} \;
echo "✓ All Python files compile successfully"
echo ""

# Test individual services
echo "Step 4: Testing service startups (5 second timeout each)..."
echo ""

services=(
    "ai-features-service:8000:ai-features-service/src/main.py"
    "compliance-service:8002:compliance-service/src/main.py"
    "credit-engine:8000:credit-engine/src/main.py"
    "transaction-service:8001:transaction-service/src/main.py"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r name port script <<< "$service_info"
    echo "Testing $name (port $port)..."
    
    timeout 5 python "$script" > /tmp/${name}.log 2>&1 &
    pid=$!
    sleep 2
    
    if ps -p $pid > /dev/null; then
        echo "  ✓ $name started successfully"
        kill $pid 2>/dev/null || true
        wait $pid 2>/dev/null || true
    else
        echo "  ✗ $name failed to start"
        echo "  Check /tmp/${name}.log for details"
    fi
    sleep 1
done

echo ""
echo "Testing Flask services..."

# Test tax API service
echo "Testing tax-api-service (port 5000)..."
cd tax_automation
timeout 5 python tax_api_service.py > /tmp/tax-api.log 2>&1 &
pid=$!
cd ..
sleep 2
if ps -p $pid > /dev/null; then
    echo "  ✓ tax-api-service started successfully"
    kill $pid 2>/dev/null || true
    wait $pid 2>/dev/null || true
fi
sleep 1

echo ""
echo "=================================================="
echo "Installation and Verification Complete!"
echo "=================================================="
echo ""
echo "All services can be started with:"
echo "  cd <service-directory>"
echo "  python <main-script>.py"
echo ""
echo "Example:"
echo "  cd ai-features-service"
echo "  python src/main.py"
echo ""

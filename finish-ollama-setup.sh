#!/bin/bash
# Complete Ollama setup after download finishes

echo "🔍 Checking Ollama download status..."
echo ""

# Check if llama3.1:8b is available
if ollama list | grep -q "llama3.1:8b"; then
    echo "✅ llama3.1:8b is already downloaded!"
else
    echo "⏳ llama3.1:8b not found. Starting download..."
    echo ""

    # Start download
    echo "📥 Downloading llama3.1:8b (4.9GB)..."
    ollama pull llama3.1:8b

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Download complete!"
    else
        echo ""
        echo "❌ Download failed. Please try again or check your internet connection."
        exit 1
    fi
fi

echo ""
echo "🔍 Checking for embedding model..."

# Check if nomic-embed-text is available
if ollama list | grep -q "nomic-embed-text"; then
    echo "✅ nomic-embed-text is already downloaded!"
else
    echo "⏳ Downloading nomic-embed-text for Perplexica..."
    ollama pull nomic-embed-text

    if [ $? -eq 0 ]; then
        echo "✅ Embedding model downloaded!"
    else
        echo "⚠️  Embedding model download failed. You can retry later."
    fi
fi

echo ""
echo "🧪 Testing Ollama..."
echo ""

# Test llama3.1:8b
TEST_RESPONSE=$(ollama run llama3.1:8b "What is 2+2? Answer in one word." 2>&1)

if [[ $TEST_RESPONSE == *"4"* ]]; then
    echo "✅ Ollama is working perfectly!"
    echo ""
    echo "Test query: 'What is 2+2?'"
    echo "Response: $TEST_RESPONSE"
else
    echo "⚠️  Ollama test returned unexpected result:"
    echo "$TEST_RESPONSE"
fi

echo ""
echo "📊 Current models:"
ollama list

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Make sure these are in your apps/backend/.env:"
echo "   OLLAMA_URL=http://localhost:11434"
echo "   PERPLEXICA_URL=http://localhost:3030"
echo ""
echo "2. Restart your backend server"
echo ""
echo "3. Test Deep mode in your AI Agent: http://localhost:5174/?tab=agent"
echo ""
echo "4. Enable 'High Privacy' mode to use 100% local AI!"

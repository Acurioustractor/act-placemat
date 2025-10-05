#!/bin/bash
# Check Ollama download progress

echo "🔍 Checking Ollama status..."
echo ""

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "❌ Ollama service not running"
    echo "   Start with: brew services start ollama"
    exit 1
fi

echo "✅ Ollama service is running"
echo ""

# Check download progress
echo "📥 Download status:"
tail -1 /tmp/ollama-download.log 2>/dev/null || echo "   No active download"
echo ""

# List available models
echo "📦 Available models:"
ollama list
echo ""

# If llama3.1:8b is available, test it
if ollama list | grep -q "llama3.1:8b"; then
    echo "🎉 llama3.1:8b is ready!"
    echo ""
    echo "✅ Next steps:"
    echo "   1. Add to your .env: OLLAMA_URL=http://localhost:11434"
    echo "   2. Restart your backend"
    echo "   3. Test Deep mode with High Privacy in the AI Agent"
else
    echo "⏳ llama3.1:8b still downloading..."
    echo ""
    echo "   Check progress with: tail -f /tmp/ollama-download.log"
    echo "   Or run this script again: ./check-ollama-progress.sh"
fi

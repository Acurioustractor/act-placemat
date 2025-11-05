#!/bin/bash

echo "🌱 A Curious Tractor - Research Progress Monitor"
echo "================================================"
echo ""

# Check if research is running
if pgrep -f "run-curious-tractor-research.js" > /dev/null; then
    echo "✅ Research is RUNNING"
    echo ""
else
    echo "❌ Research is NOT running"
    echo ""
    echo "Start it with: node run-curious-tractor-research.js"
    exit 1
fi

# Check which phase files exist
echo "📋 Completed Phases:"
echo ""

if [ -f ".taskmaster/docs/phase1-entity-structure.md" ]; then
    echo "  ✅ Phase 1: Entity Structure (COMPLETE)"
    PHASE1_SIZE=$(wc -l < ".taskmaster/docs/phase1-entity-structure.md")
    echo "     Lines: $PHASE1_SIZE"
else
    echo "  🔄 Phase 1: Entity Structure (in progress...)"
fi

if [ -f ".taskmaster/docs/phase2-rnd-tax-credits.md" ]; then
    echo "  ✅ Phase 2: R&D Tax Credits (COMPLETE)"
    PHASE2_SIZE=$(wc -l < ".taskmaster/docs/phase2-rnd-tax-credits.md")
    echo "     Lines: $PHASE2_SIZE"
else
    echo "  ⏳ Phase 2: R&D Tax Credits (pending)"
fi

if [ -f ".taskmaster/docs/phase3-triday-integration.md" ]; then
    echo "  ✅ Phase 3: Triday Integration (COMPLETE)"
    PHASE3_SIZE=$(wc -l < ".taskmaster/docs/phase3-triday-integration.md")
    echo "     Lines: $PHASE3_SIZE"
else
    echo "  ⏳ Phase 3: Triday Integration (pending)"
fi

if [ -f ".taskmaster/docs/phase4-innovation-economics.md" ]; then
    echo "  ✅ Phase 4: Innovation Economics (COMPLETE)"
    PHASE4_SIZE=$(wc -l < ".taskmaster/docs/phase4-innovation-economics.md")
    echo "     Lines: $PHASE4_SIZE"
else
    echo "  ⏳ Phase 4: Innovation Economics (pending)"
fi

if [ -f ".taskmaster/docs/phase5-ai-assistant.md" ]; then
    echo "  ✅ Phase 5: AI Network Assistant (COMPLETE)"
    PHASE5_SIZE=$(wc -l < ".taskmaster/docs/phase5-ai-assistant.md")
    echo "     Lines: $PHASE5_SIZE"
else
    echo "  ⏳ Phase 5: AI Network Assistant (pending)"
fi

if [ -f ".taskmaster/docs/curious-tractor-research-report.md" ]; then
    echo ""
    echo "  🎉 FINAL REPORT: COMPLETE!"
    REPORT_SIZE=$(wc -l < ".taskmaster/docs/curious-tractor-research-report.md")
    echo "     Lines: $REPORT_SIZE"
fi

echo ""
echo "📊 Latest Research Activity:"
echo ""
tail -20 /tmp/curious-tractor-research.log | sed 's/^/  /'

echo ""
echo "================================================"
echo "Commands:"
echo "  Watch live: tail -f /tmp/curious-tractor-research.log"
echo "  Stop research: pkill -f run-curious-tractor-research"
echo "  View results: cat .taskmaster/docs/curious-tractor-research-report.md"
echo ""

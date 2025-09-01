#!/bin/bash

# Script to track subtask progress for Task 1

echo "📊 Tracking Subtask Progress for Task #1"
echo "========================================"

# Show current task status
echo "📋 Current Task Status:"
task-master show 1

echo ""
echo "🔧 Mark a subtask as complete:"
echo "Usage: ./scripts/track-subtask-progress.sh <subtask-id>"
echo "Example: ./scripts/track-subtask-progress.sh 1.1"
echo ""

# If subtask ID is provided, mark it as done
if [ $# -eq 1 ]; then
    SUBTASK_ID=$1
    echo "✅ Marking subtask $SUBTASK_ID as done..."
    task-master set-status --id=$SUBTASK_ID --status=done
    
    echo ""
    echo "📊 Updated Task Status:"
    task-master show 1
    
    echo ""
    echo "🎉 Subtask $SUBTASK_ID marked as complete!"
    
    # Check if all subtasks are done
    PENDING_COUNT=$(task-master show 1 | grep "pending" | wc -l)
    if [ $PENDING_COUNT -eq 0 ]; then
        echo ""
        echo "🎊 All subtasks completed! Consider marking Task #1 as done:"
        echo "   task-master set-status --id=1 --status=done"
        echo "   Then proceed to Task #2: Implement LangGraph Multi-Agent Framework"
    fi
else
    echo "💡 To mark a subtask as complete, run:"
    echo "   ./scripts/track-subtask-progress.sh <subtask-id>"
    echo ""
    echo "📝 Example subtask IDs:"
    echo "   1.1 - Initialize Nx 19 monorepo workspace"
    echo "   1.2 - Configure Yarn v4 workspaces"
    echo "   1.3 - Create Next.js 14 app template"
    echo "   1.4 - Create Expo 51 React Native app template"
    echo "   1.5 - Create NestJS 10 backend app template"
fi

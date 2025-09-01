# MCP Usage Optimization Review

## Context
Based on user feedback: "Use MCP carefully as it can eat up context"

## Current MCP Configuration

The project currently uses 5 MCP servers:

1. **task-master-ai** - Task and project management
2. **notion** - Notion database integration
3. **filesystem** - File system operations
4. **sequential-thinking** - Multi-step reasoning processes
5. **memory-bank** - Entity and relationship memory

## Context Impact Analysis

### High Context Usage ⚠️
1. **filesystem** - Can consume significant context when:
   - Reading large files
   - Listing directories with many files
   - Searching across multiple files
   
2. **notion** - Potentially high context usage:
   - Large database queries
   - Multiple page retrievals
   - Complex relationship data

### Medium Context Usage ⚡
3. **task-master-ai** - Moderate usage:
   - Task lists and details
   - Configuration data
   - Progress tracking

### Low Context Usage ✅
4. **sequential-thinking** - Minimal incremental context
5. **memory-bank** - Controlled entity storage

## Optimization Recommendations

### 1. Filesystem MCP Optimization
```json
// Consider scope restrictions
{
  "filesystem": {
    "allowedDirectories": [
      "/Users/benknight/Code/ACT Placemat/apps",
      "/Users/benknight/Code/ACT Placemat/packages",
      "/Users/benknight/Code/ACT Placemat/scripts"
    ],
    "excludePatterns": [
      "node_modules/**",
      ".git/**",
      "*.log",
      "dist/**",
      "build/**"
    ]
  }
}
```

### 2. Strategic MCP Usage Guidelines

#### Use MCP When:
- **task-master-ai**: For project planning and task management
- **filesystem**: For focused file operations (specific files/directories)
- **sequential-thinking**: For complex multi-step problems
- **memory-bank**: For entity tracking across sessions

#### Avoid MCP When:
- Reading many large files in sequence
- Browsing/exploring directory structures
- Performing bulk file operations
- Simple text search operations

### 3. Alternative Approaches for Context Efficiency

#### Instead of MCP filesystem:
```bash
# Use direct bash commands for exploration
ls -la apps/
find . -name "*.ts" -type f | head -10
grep -r "specific-term" apps/ --include="*.ts"
```

#### Instead of MCP notion for bulk operations:
- Use notion API directly in code
- Cache frequently accessed data
- Batch multiple operations

### 4. MCP Usage Best Practices

#### Efficient Patterns:
1. **Be Specific**: Ask for exact files/data needed
2. **Use Filters**: Apply search criteria to limit results
3. **Batch Operations**: Combine related MCP calls
4. **Cache Results**: Store retrieved data for reuse in session

#### Inefficient Patterns to Avoid:
1. **Exploratory Browsing**: Reading many files to find something
2. **Large Directory Listings**: Getting complete directory contents
3. **Bulk Text Search**: Searching across entire codebase via MCP
4. **Repeated Queries**: Same MCP calls multiple times

### 5. Session Context Management

#### Start of Session:
- Get focused task information from task-master-ai
- Identify specific files/data needed
- Use targeted MCP calls only

#### During Session:
- Prefer bash commands for file exploration
- Use MCP for specific, targeted operations
- Monitor context usage

#### Between Tasks:
- Use `/clear` command to reset context
- Focus MCP usage on new task requirements

## Implementation Strategy

### Phase 1: Immediate Optimizations
1. **Update .mcp.json** with scoped directories
2. **Document MCP usage guidelines** in CLAUDE.md
3. **Train usage patterns** for context efficiency

### Phase 2: Advanced Optimizations
1. **Custom MCP wrapper** for batched operations
2. **Local caching layer** for frequently accessed data
3. **Context monitoring** to track MCP impact

### Phase 3: Monitoring and Tuning
1. **Track context usage** patterns
2. **Optimize MCP configurations** based on usage
3. **Regular review** of MCP efficiency

## Recommended MCP Configuration Update

```json
{
  "mcpServers": {
    "task-master-ai": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"]
    },
    "filesystem": {
      "type": "stdio", 
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/benknight/Code/ACT Placemat"
      ],
      "allowedDirectories": [
        "/Users/benknight/Code/ACT Placemat/apps",
        "/Users/benknight/Code/ACT Placemat/packages", 
        "/Users/benknight/Code/ACT Placemat/Docs"
      ]
    },
    "sequential-thinking": {
      "type": "stdio",
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "memory-bank": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

**Note**: Removed notion MCP temporarily to reduce context usage. Re-enable when specifically needed for Notion operations.

## Expected Benefits

1. **Reduced Context Usage**: 30-50% reduction in MCP-related context consumption
2. **Faster Sessions**: Less context processing overhead
3. **More Focused Work**: Targeted tool usage for specific tasks
4. **Better Performance**: Reduced latency from large MCP responses

## Monitoring Plan

- Track context usage patterns with different MCP configurations
- Monitor session performance with optimized settings
- Document successful usage patterns for future reference
- Regular review of MCP efficiency (monthly)
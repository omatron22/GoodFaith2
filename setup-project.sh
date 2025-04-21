#!/bin/bash

# Good Faith Project Structure Setup Script
# This script creates the directory structure for the Good Faith project
# It checks if directories/files exist before creating them

echo "Setting up Good Faith project structure..."

# Create base directories first
[ ! -d "src" ] && mkdir -p src
[ ! -d "scripts" ] && mkdir -p scripts
[ ! -d "data" ] && mkdir -p data
[ ! -d "tests" ] && mkdir -p tests
[ ! -d "docs" ] && mkdir -p docs

# App directory structure
[ ! -d "src/app" ] && mkdir -p src/app
[ ! -d "src/app/api/question" ] && mkdir -p src/app/api/question
[ ! -d "src/app/api/answer" ] && mkdir -p src/app/api/answer
[ ! -d "src/app/api/resolution" ] && mkdir -p src/app/api/resolution
[ ! -d "src/app/api/analysis" ] && mkdir -p src/app/api/analysis
[ ! -d "src/app/api/stage" ] && mkdir -p src/app/api/stage

# API endpoint files
[ ! -f "src/app/api/question/route.ts" ] && touch src/app/api/question/route.ts
[ ! -f "src/app/api/answer/route.ts" ] && touch src/app/api/answer/route.ts
[ ! -f "src/app/api/resolution/route.ts" ] && touch src/app/api/resolution/route.ts
[ ! -f "src/app/api/analysis/route.ts" ] && touch src/app/api/analysis/route.ts
[ ! -f "src/app/api/stage/route.ts" ] && touch src/app/api/stage/route.ts

# App files
[ ! -f "src/app/page.tsx" ] && touch src/app/page.tsx
[ ! -f "src/app/layout.tsx" ] && touch src/app/layout.tsx
[ ! -f "src/app/globals.css" ] && touch src/app/globals.css

# Lib directory structure
[ ! -d "src/lib" ] && mkdir -p src/lib
[ ! -d "src/lib/graph" ] && mkdir -p src/lib/graph
[ ! -d "src/lib/graph/nodes" ] && mkdir -p src/lib/graph/nodes
[ ! -d "src/lib/graph/relationships" ] && mkdir -p src/lib/graph/relationships
[ ! -d "src/lib/graph/queries" ] && mkdir -p src/lib/graph/queries

# Graph files
[ ! -f "src/lib/graph/index.ts" ] && touch src/lib/graph/index.ts
[ ! -f "src/lib/graph/neo4j-client.ts" ] && touch src/lib/graph/neo4j-client.ts

# Node files
[ ! -f "src/lib/graph/nodes/question.ts" ] && touch src/lib/graph/nodes/question.ts
[ ! -f "src/lib/graph/nodes/answer.ts" ] && touch src/lib/graph/nodes/answer.ts
[ ! -f "src/lib/graph/nodes/principle.ts" ] && touch src/lib/graph/nodes/principle.ts
[ ! -f "src/lib/graph/nodes/framework.ts" ] && touch src/lib/graph/nodes/framework.ts
[ ! -f "src/lib/graph/nodes/stage.ts" ] && touch src/lib/graph/nodes/stage.ts

# Relationship files
[ ! -f "src/lib/graph/relationships/index.ts" ] && touch src/lib/graph/relationships/index.ts
[ ! -f "src/lib/graph/relationships/contradicts.ts" ] && touch src/lib/graph/relationships/contradicts.ts
[ ! -f "src/lib/graph/relationships/belongs-to.ts" ] && touch src/lib/graph/relationships/belongs-to.ts
[ ! -f "src/lib/graph/relationships/aligns-with.ts" ] && touch src/lib/graph/relationships/aligns-with.ts
[ ! -f "src/lib/graph/relationships/follows.ts" ] && touch src/lib/graph/relationships/follows.ts
[ ! -f "src/lib/graph/relationships/precedes.ts" ] && touch src/lib/graph/relationships/precedes.ts

# Query files
[ ! -f "src/lib/graph/queries/traversal.ts" ] && touch src/lib/graph/queries/traversal.ts
[ ! -f "src/lib/graph/queries/contradiction.ts" ] && touch src/lib/graph/queries/contradiction.ts
[ ! -f "src/lib/graph/queries/stage.ts" ] && touch src/lib/graph/queries/stage.ts
[ ! -f "src/lib/graph/queries/principle.ts" ] && touch src/lib/graph/queries/principle.ts

# LLM directory structure
[ ! -d "src/lib/llm" ] && mkdir -p src/lib/llm
[ ! -d "src/lib/llm/prompts" ] && mkdir -p src/lib/llm/prompts

# LLM files
[ ! -f "src/lib/llm/ollama-client.ts" ] && touch src/lib/llm/ollama-client.ts
[ ! -f "src/lib/llm/question-generator.ts" ] && touch src/lib/llm/question-generator.ts
[ ! -f "src/lib/llm/contradiction-analyzer.ts" ] && touch src/lib/llm/contradiction-analyzer.ts
[ ! -f "src/lib/llm/framework-analyzer.ts" ] && touch src/lib/llm/framework-analyzer.ts

# Prompt files
[ ! -f "src/lib/llm/prompts/question-generation.ts" ] && touch src/lib/llm/prompts/question-generation.ts
[ ! -f "src/lib/llm/prompts/contradiction-analysis.ts" ] && touch src/lib/llm/prompts/contradiction-analysis.ts
[ ! -f "src/lib/llm/prompts/framework-analysis.ts" ] && touch src/lib/llm/prompts/framework-analysis.ts

# Core directory structure
[ ! -d "src/lib/core" ] && mkdir -p src/lib/core

# Core files
[ ! -f "src/lib/core/session-manager.ts" ] && touch src/lib/core/session-manager.ts
[ ! -f "src/lib/core/stage-progression.ts" ] && touch src/lib/core/stage-progression.ts
[ ! -f "src/lib/core/principle-extractor.ts" ] && touch src/lib/core/principle-extractor.ts
[ ! -f "src/lib/core/contradiction-resolver.ts" ] && touch src/lib/core/contradiction-resolver.ts
[ ! -f "src/lib/core/analysis-engine.ts" ] && touch src/lib/core/analysis-engine.ts

# Types directory structure
[ ! -d "src/lib/types" ] && mkdir -p src/lib/types

# Type files
[ ! -f "src/lib/types/index.ts" ] && touch src/lib/types/index.ts
[ ! -f "src/lib/types/graph.ts" ] && touch src/lib/types/graph.ts
[ ! -f "src/lib/types/llm.ts" ] && touch src/lib/types/llm.ts
[ ! -f "src/lib/types/session.ts" ] && touch src/lib/types/session.ts

# Utils directory structure
[ ! -d "src/lib/utils" ] && mkdir -p src/lib/utils

# Util files
[ ! -f "src/lib/utils/validators.ts" ] && touch src/lib/utils/validators.ts
[ ! -f "src/lib/utils/formatters.ts" ] && touch src/lib/utils/formatters.ts
[ ! -f "src/lib/utils/error-handlers.ts" ] && touch src/lib/utils/error-handlers.ts

# Hooks directory structure
[ ! -d "src/hooks" ] && mkdir -p src/hooks

# Hook files
[ ! -f "src/hooks/useQuestion.ts" ] && touch src/hooks/useQuestion.ts
[ ! -f "src/hooks/useContradiction.ts" ] && touch src/hooks/useContradiction.ts
[ ! -f "src/hooks/useAnalysis.ts" ] && touch src/hooks/useAnalysis.ts
[ ! -f "src/hooks/useStageProgression.ts" ] && touch src/hooks/useStageProgression.ts
[ ! -f "src/hooks/useSession.ts" ] && touch src/hooks/useSession.ts

# Scripts directory
[ ! -f "scripts/init-neo4j.ts" ] && touch scripts/init-neo4j.ts
[ ! -f "scripts/seed-graph.ts" ] && touch scripts/seed-graph.ts
[ ! -f "scripts/clean-graph.ts" ] && touch scripts/clean-graph.ts

# Data directory structure
[ ! -d "data/seed" ] && mkdir -p data/seed

# Seed files
[ ! -f "data/seed/frameworks.json" ] && touch data/seed/frameworks.json
[ ! -f "data/seed/kohlberg-stages.json" ] && touch data/seed/kohlberg-stages.json
[ ! -f "data/seed/initial-questions.json" ] && touch data/seed/initial-questions.json

# Test directory structure
[ ! -d "tests/graph" ] && mkdir -p tests/graph
[ ! -d "tests/llm" ] && mkdir -p tests/llm
[ ! -d "tests/core" ] && mkdir -p tests/core

# Documentation files
[ ! -f "docs/architecture.md" ] && touch docs/architecture.md
[ ! -f "docs/api.md" ] && touch docs/api.md
[ ! -f "docs/development.md" ] && touch docs/development.md

# Root level files
[ ! -f ".env.example" ] && touch .env.example

echo "Project structure setup complete!"
echo "All directories and files have been created or were already present."
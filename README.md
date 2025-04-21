# Good Faith - Intelligent Moral Framework Analysis

A philosophical application that evaluates the consistency of users' moral reasoning through dynamic, LLM-generated questioning based on Kohlberg's stages of moral development.

## Project Overview

Good Faith is a Next.js application that uses a Neo4j-backed graph system to explore users' moral reasoning. The application leverages LLMs to generate intelligent, personalized questions that probe for contradictions and provide deep analysis of users' moral frameworks.

## Core Architecture

### 1. GraphRAG System (Neo4j-based)

The Graph-based RAG system is the core engine that:
- Dynamically generates questions using LLM based on user responses and current stage
- Represents moral questions, answers, principles, and stages in a connected graph
- Detects contradictions through logical analysis and graph relationships
- Maintains conversation continuity while exploring potential blind spots
- Tracks user progression through Kohlberg's stages

### 2. Knowledge Graph Structure

**Node Types:**
- **Question Nodes**: LLM-generated questions with properties:
  - id: unique identifier
  - text: the question content
  - stage: Kohlberg stage (1-6)
  - type: 'generated' or 'seed' (initial questions)
  - context: array of previous answers that influenced this question
  - generatedForUser: userId
  
- **Answer Nodes**: User responses with properties:
  - id: unique identifier
  - text: the answer content
  - userId: user who provided the answer
  - timestamp: when the answer was submitted
  - modified: boolean indicating if this was modified after a contradiction
  - previousVersion: link to previous answer if modified
  
- **Principle Nodes**: Extracted moral principles from answers
  - id: unique identifier
  - text: the principle description
  - derivedFrom: array of answer ids
  
- **Framework Nodes**: Philosophical frameworks (deontological, utilitarian, etc.)
  - id: unique identifier
  - name: framework name
  - description: brief explanation
  - keyThinkers: array of philosopher names
  
- **Stage Nodes**: Kohlberg's moral development stages (1-6)
  - id: stage number
  - name: stage name
  - description: stage characteristics
  - requiredAnswers: minimum answers needed to progress

**Relationship Types:**
- **ANSWERS**: Links user's answer to a question
- **CONTRADICTS**: Links two contradictory answers with properties:
  - explanation: why they contradict
  - resolved: boolean
  - resolution: explanation if resolved
- **BELONGS_TO**: Links questions to Kohlberg stages
- **ALIGNS_WITH**: Links answers to philosophical frameworks/principles
- **FOLLOWS**: Sequential relationship between stages
- **PRECEDES**: Links question to answers that influenced its generation
- **MODIFIES**: Links updated answer to its previous version

### 3. LLM Integration

**DeepSeek Coder Model** handles:
- Dynamic question generation based on conversation context
- Contradiction detection through logical analysis
- Framework alignment analysis
- Feedback generation

**Question Generation Strategy:**
- Analyze user's previous answers to identify patterns
- Consider current Kohlberg stage requirements
- Target potential blind spots and inconsistencies
- Use simple, digestible language and relatable scenarios
- Avoid redundancy while covering comprehensive moral ground

### 4. Contradiction Detection System

- Uses truth table logic to identify direct and implied contradictions
- Considers transitive relationships (A→B, B→C, therefore A→C)
- Allows users to explain or modify their positions
- Tracks all modifications for final analysis

## Project Structure

```
/good-faith
  /src
    /app                       # Next.js application
      /api                     # API endpoints 
        /question              # Get LLM-generated question
        /answer                # Submit answer & check contradictions
        /resolution            # Resolve contradiction
        /analysis              # Get moral framework analysis
        /stage                 # Manage stage progression
      page.tsx                 # Main application page
    /lib                       # Core library code
      /graph                   # GraphRAG system
        index.ts               # Main GraphRAG orchestrator
        neo4j-client.ts        # Neo4j connection and queries
        nodes/                 # Node type definitions
          question.ts
          answer.ts
          principle.ts
          framework.ts
          stage.ts
        relationships/         # Relationship definitions
          index.ts
          contradicts.ts
          belongs-to.ts
          aligns-with.ts
        queries/               # Neo4j query templates
          traversal.ts         # Graph traversal queries
          contradiction.ts     # Contradiction detection queries
          stage.ts            # Stage progression queries
      /llm                     # LLM integration
        ollama-client.ts       # Ollama API client
        question-generator.ts  # Dynamic question generation
        contradiction-analyzer.ts # Contradiction detection
        framework-analyzer.ts  # Framework alignment analysis
      /core                    # Core business logic
        session-manager.ts     # User session management
        stage-progression.ts   # Stage advancement logic
        principle-extractor.ts # Extract principles from answers
      /types                   # TypeScript definitions
        index.ts
    /hooks                     # React hooks
      useQuestion.ts           # Question generation hook
      useContradiction.ts      # Contradiction handling hook
      useAnalysis.ts          # Analysis hook
  /scripts                     # Utility scripts
    init-neo4j.ts             # Initialize Neo4j schema
    seed-graph.ts             # Seed initial questions/frameworks
  /data                        # Data storage
    /seed                      # Initial data
      frameworks.json          # Philosophical frameworks
      kohlberg-stages.json     # Stage definitions
```

## Key Features

### 1. Dynamic Question Generation
- LLM generates personalized questions based on:
  - User's previous answers
  - Current moral development stage
  - Identified patterns and blind spots
  - Contradiction potential
- Questions avoid jargon, focusing on relatable scenarios

### 2. Intelligent Contradiction Detection
- Identifies direct contradictions
- Detects implied contradictions through logical inference
- Provides explanation in accessible language
- Allows resolution through explanation or answer modification

### 3. Stage Progression System
- Minimum 3 answers per stage (more if needed)
- Must resolve all contradictions before advancing
- Evaluates consistency within each stage
- Provides feedback on progression

### 4. Comprehensive Analysis
- Alignment with philosophical frameworks
- Key moral principles identification
- Consistency score
- Growth areas and strengths
- Philosophical reading recommendations

## Development Phases

### Phase 1: Core Engine (Current Priority)
1. Set up Neo4j database and connection
2. Implement basic graph structure
3. Create LLM integration for question generation
4. Build contradiction detection system
5. Develop stage progression logic

### Phase 2: Intelligence Enhancement
1. Refine question generation algorithms
2. Improve contradiction detection accuracy
3. Enhance framework analysis
4. Add principle extraction

### Phase 3: UI and User Experience (Later)
1. Create intuitive user interface
2. Add graph visualizations
3. Implement user profiles and sessions
4. Build collaborative features

### Phase 4: Scale and Optimization (Future)
1. Optimize for concurrent users
2. Add caching mechanisms
3. Implement analytics
4. Support multiple languages

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Neo4j Database (v4.4 or higher)
- Ollama with DeepSeek Coder model

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Neo4j database
4. Configure environment variables
5. Initialize the graph: `npm run init-graph`
6. Start development server: `npm run dev`

## Technical Notes

### Neo4j Integration
- Use official Neo4j driver for Node.js
- Implement connection pooling for performance
- Use parameterized queries to prevent injection
- Create indexes for frequently accessed properties

### LLM Strategy
- Cache frequently generated questions
- Use temperature control for consistency
- Implement retry logic for failed generations
- Monitor token usage for cost control

### Performance Considerations
- Lazy loading of graph data
- Efficient traversal algorithms
- Optimized contradiction detection queries
- Session-based caching

## Future Enhancements
- Multi-language support
- Cultural context adaptation
- Collaborative features
- Advanced visualization tools
- Mobile application

## Contributing
Contributions welcome! Focus areas:
1. Question generation algorithms
2. Contradiction detection logic
3. Framework analysis improvements
4. Performance optimizations

## License
MIT License
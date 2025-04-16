# Good Faith

A philosophical application that evaluates the consistency of your moral framework.

## Project Overview

Good Faith is a Next.js application that allows users to explore and test the consistency of their moral reasoning. Based on Lawrence Kohlberg's stages of moral development, the application presents users with moral questions and dilemmas, detects contradictions in their responses, and provides an analysis of their moral framework.

## Core Components

### GraphRAG System

The Graph-based Retrieval-Augmented Generation (GraphRAG) system is the core of the application. It:

1. Represents moral questions, frameworks, and user responses as a knowledge graph
2. Utilizes graph relationships to find contradictions and connections between responses
3. Navigates through Kohlberg's stages using graph traversal algorithms
4. Delegates complex reasoning tasks to the DeepSeek model
5. Uses Phi for lightweight operations like embedding generation

### Knowledge Graph Structure

The graph consists of the following nodes and relationships:

* **Question Nodes**: Represent individual moral questions
* **Answer Nodes**: User responses linked to questions
* **Framework Nodes**: Philosophical frameworks (deontological, utilitarian, etc.)
* **Principle Nodes**: Core moral principles connected to frameworks
* **Stage Nodes**: Kohlberg's moral development stages

Relationships include:
* **CONTRADICTS**: Links potentially contradictory questions/answers
* **BELONGS_TO**: Connects questions to moral stages
* **ALIGNS_WITH**: Links answers to frameworks or principles
* **FOLLOWS**: Indicates progression between stages

### Data Storage

The project uses a hybrid storage system:
* Graph database representation (in-memory for MVP)
* File-based persistence for portability
* Optional extension to Neo4j or other graph databases

### LLM Integration

The application integrates with Ollama to use:
* DeepSeek Coder model for complex reasoning tasks
* Phi model for lightweight operations like embeddings

## Project Structure

```
/good-faith
  /app                     # Next.js application
    /api                   # API endpoints 
      /question            # Get next question
      /answer              # Submit answer
      /resolution          # Resolve contradiction
      /analysis            # Get moral framework analysis
    page.tsx               # Main application page
  /lib                     # Core library code
    /graph                 # GraphRAG system
      index.ts             # Main GraphRAG implementation
      knowledge-graph.ts   # Graph data structure
      traversal.ts         # Graph traversal algorithms
      ollama.ts            # Ollama client for LLM integration
    /core                  # Core business logic
      contradictions.ts    # Contradiction detection
      analysis.ts          # Moral framework analysis
      storage.ts           # File-based storage
    /types                 # TypeScript definitions
  /hooks                   # React hooks
    useQuestions.ts        # Question retrieval hook
    useAnalysis.ts         # Analysis hook
  /data                    # Data storage
    /knowledge-base        # Static data
    /graph                 # Graph representation persistence
    /users                 # User session data
```

## Key Features

1. **Graph-Based Question Navigation**: Questions are recommended based on graph relationships, navigating through Kohlberg's stages of moral development.
2. **Semantic Contradiction Detection**: The system identifies logical inconsistencies between user's answers using both explicit graph relationships and reasoning model analysis.
3. **Resolution Process**: When contradictions are detected, users can resolve them by explaining their reasoning and choosing which answer to modify.
4. **Framework Analysis**: At the end, users receive an analysis of their moral framework, including alignment with established philosophical frameworks.

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* Ollama installed and running locally with the following models:
   * `deepseek-coder:latest` - For reasoning operations
   * `phi:latest` - For lightweight operations

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/good-faith.git
   cd good-faith
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure Ollama is running with the required models:
   ```bash
   ollama pull deepseek-coder:latest
   ollama pull phi:latest
   ```

4. Create the necessary directories:
   ```bash
   mkdir -p data/knowledge-base data/graph data/users
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application at `http://localhost:3000`

## Technical Implementation Details

### Graph Knowledge Representation

The application uses an in-memory graph structure with serialization/deserialization to JSON for persistence. Key components include:

1. **Node Types**: Different node types (Question, Answer, Framework, etc.) with properties
2. **Edge Types**: Various relationships between nodes with optional weights
3. **Graph Traversal**: Customized algorithms for finding paths, contradictions, and similar nodes

```typescript
// Example of how graph traversal is used for contradiction detection
const potentialContradictions = knowledgeGraph.findRelatedNodes(
  currentAnswerNode, 
  { 
    relationship: "POTENTIALLY_CONTRADICTS", 
    maxDepth: 2 
  }
);
```

### Contradiction Detection

Contradictions are detected in three ways:

1. **Explicit Graph Relationships**: Questions can be explicitly linked as potentially contradictory.
2. **Graph Traversal Analysis**: The system uses path finding to identify semantically related questions.
3. **LLM Analysis**: The DeepSeek model analyzes potential contradictions to determine if there's a genuine logical inconsistency.

### Stage Progression

Users progress through Kohlberg's stages as follows:

1. Start at Stage 1 (Punishment-Obedience)
2. Must answer at least 3 questions per stage
3. Must resolve any contradictions before advancing
4. Higher stages present more complex moral questions

## Future Enhancements

1. **External Graph Database**: Migrate from in-memory to Neo4j or other graph databases
2. **Enhanced UI**: Develop a more engaging user interface with graph visualization
3. **Additional Frameworks**: Incorporate more philosophical frameworks beyond the initial set
4. **Personalized Question Generation**: Generate tailored questions based on user's previous answers and graph positioning
5. **Social Sharing**: Allow users to share their moral framework analysis

## API Endpoints

### `/api/question`

- **Method**: GET
- **Query Parameters**:
  - `userId` (optional): User's ID, a new one is generated if not provided
- **Response**: Returns the next question for the user

### `/api/answer`

- **Method**: POST
- **Body**:
  - `userId`: User's ID
  - `questionId`: ID of the question being answered
  - `answer`: User's answer text
- **Response**: Returns the question and any detected contradictions

### `/api/resolution`

- **Method**: POST
- **Body**:
  - `userId`: User's ID
  - `contradictionId`: ID of the contradiction
  - `explanation`: User's explanation of the resolution
  - `overwrittenQuestionId`: ID of the question whose answer will be overwritten
  - `newAnswer` (optional): New answer if provided
- **Response**: Returns the resolved contradiction

### `/api/analysis`

- **Method**: GET
- **Query Parameters**:
  - `userId`: User's ID
- **Response**: Returns the analysis of the user's moral framework

## Contributing

Contributions are welcome! Here are some ways you can contribute:

1. Add new philosophical frameworks to the knowledge base
2. Improve graph algorithms for contradiction detection
3. Enhance the UI/UX
4. Add more sophisticated question generation
5. Implement unit tests

## License

This project is open source and available under the MIT License.
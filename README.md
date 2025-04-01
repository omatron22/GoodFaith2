# Good Faith

A philosophical application that evaluates the consistency of your moral framework.

## Project Overview

Good Faith is a Next.js application that allows users to explore and test the consistency of their moral reasoning. Based on Lawrence Kohlberg's stages of moral development, the application presents users with moral questions and dilemmas, detects contradictions in their responses, and provides an analysis of their moral framework.

## Core Components

### RAG System

The Retrieval-Augmented Generation (RAG) system is the core of the application. It:

1. Stores and retrieves questions based on Kohlberg's stages
2. Uses vector embeddings to find similar questions
3. Analyzes potential contradictions between answers
4. Delegates complex reasoning tasks to the DeepSeek model

### Data Storage

The project uses a file-based storage system for:

* Knowledge base (questions, moral frameworks, Kohlberg stages)
* User sessions (answers, contradictions, analysis)
* Vector embeddings for similarity search

### LLM Integration

The application integrates with Ollama to use:

* DeepSeek Coder model for complex reasoning tasks
* Mistral model for lightweight operations like embeddings

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
    /rag                   # RAG system
      index.ts             # Main RAG implementation
      embedding.ts         # Vector embedding utilities
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
    /embeddings            # Vector embeddings
    /users                 # User session data
```

## Key Features

1. **Progressive Question Generation**: Questions advance through Kohlberg's stages of moral development.
2. **Contradiction Detection**: The system identifies logical inconsistencies between user's answers using both explicit relationships and vector similarity.
3. **Resolution Process**: When contradictions are detected, users can resolve them by explaining their reasoning and choosing which answer to modify.
4. **Framework Analysis**: At the end, users receive an analysis of their moral framework, including alignment with established philosophical frameworks.

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* Ollama installed and running locally with the following models:
   * `deepseek-coder:latest`
   * `mistral:latest`

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
   ollama pull mistral:latest
   ```

4. Create the necessary directories:
   ```bash
   mkdir -p data/knowledge-base data/embeddings data/users
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application at `http://localhost:3000`

## Technical Implementation Details

### Vector Embedding System

The application uses a simple vector database with FAISS for similarity search. Questions are embedded using the Mistral model and stored in a local file for quick retrieval.

```typescript
// Example of how embeddings are used for contradiction detection
const queryEmbedding = await ollamaClient.getEmbeddings(query);
const searchResults = await index.search(queryEmbedding, count);
```

### Contradiction Detection

Contradictions are detected in two ways:

1. **Explicit Relationships**: Questions can be explicitly linked as potentially contradictory based on their tags or themes.
2. **Vector Similarity**: The system uses embedding similarity to identify semantically related questions that might contradict.
3. **LLM Analysis**: The DeepSeek model analyzes potential contradictions to determine if there's a genuine logical inconsistency.

### Stage Progression

Users progress through Kohlberg's stages as follows:

1. Start at Stage 1 (Punishment-Obedience)
2. Must answer at least 3 questions per stage
3. Must resolve any contradictions before advancing
4. Higher stages present more complex moral questions

## Future Enhancements

1. **Database Migration**: Move from file-based storage to Supabase for better scalability
2. **Enhanced UI**: Develop a more engaging user interface
3. **Additional Frameworks**: Incorporate more philosophical frameworks beyond the initial set
4. **Personalized Question Generation**: Generate tailored questions based on user's previous answers
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
2. Improve contradiction detection algorithms
3. Enhance the UI/UX
4. Add more sophisticated question generation
5. Implement unit tests

## License

This project is open source and available under the MIT License.
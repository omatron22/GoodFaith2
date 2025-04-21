// src/lib/types/graph.ts

/**
 * Core types for the Neo4j graph structure
 */

// Node Types
export interface BaseNode {
    id: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface QuestionNode extends BaseNode {
    text: string;
    stage: number;
    type: 'generated' | 'seed';
    context: string[]; // Array of answer IDs that influenced this question
    generatedForUser?: string;
    metadata?: {
      temperature?: number;
      promptVersion?: string;
    };
  }
  
  export interface AnswerNode extends BaseNode {
    text: string;
    userId: string;
    timestamp: string;
    modified: boolean;
    previousVersion?: string; // ID of the previous answer if modified
  }
  
  export interface PrincipleNode extends BaseNode {
    text: string;
    description: string;
    derivedFrom: string[]; // Array of answer IDs
    confidence: number; // 0-1 scale
  }
  
  export interface FrameworkNode extends BaseNode {
    name: string;
    description: string;
    keyThinkers: string[];
  }
  
  export interface StageNode extends BaseNode {
    stageNumber: number;
    name: string;
    description: string;
    reasoning: string;
    requiredAnswers: number;
    exampleDilemmas: string[];
  }
  
  // Relationship Types
  export interface BaseRelationship {
    type: string;
    createdAt: string;
    properties?: Record<string, unknown>;
  }
  
  export interface ContradictionRelationship extends BaseRelationship {
    type: 'CONTRADICTS';
    properties: {
      explanation: string;
      resolved: boolean;
      resolution?: {
        explanation: string;
        timestamp: string;
      };
      confidence: number; // 0-1 scale of how confident we are about the contradiction
    };
  }
  
  export interface BelongsToRelationship extends BaseRelationship {
    type: 'BELONGS_TO';
    properties: {
      order?: number; // For ordering within the stage
    };
  }
  
  export interface AlignsWithRelationship extends BaseRelationship {
    type: 'ALIGNS_WITH';
    properties: {
      strength: number; // 0-1 scale of alignment strength
      reasoning?: string;
    };
  }
  
  export interface FollowsRelationship extends BaseRelationship {
    type: 'FOLLOWS';
    properties: {
      order: number;
    };
  }
  
  export interface PrecedesRelationship extends BaseRelationship {
    type: 'PRECEDES';
    properties: {
      influenceType: 'direct' | 'indirect';
      weight: number; // How much this previous answer influenced the question
    };
  }
  
  export interface ModifiesRelationship extends BaseRelationship {
    type: 'MODIFIES';
    properties: {
      reason: string;
      timestamp: string;
    };
  }
  
  // Graph operation types
  export type NodeType = 'Question' | 'Answer' | 'Principle' | 'Framework' | 'Stage';
  export type RelationshipType = 'CONTRADICTS' | 'BELONGS_TO' | 'ALIGNS_WITH' | 'FOLLOWS' | 'PRECEDES' | 'MODIFIES';
  
  export interface GraphNode {
    identity: string;
    labels: NodeType[];
    properties: Record<string, unknown>;
  }
  
  export interface GraphRelationship {
    identity: string;
    start: string;
    end: string;
    type: RelationshipType;
    properties: Record<string, unknown>;
  }
  
  // Query types
  export interface GraphQuery {
    query: string;
    parameters?: Record<string, unknown>;
  }
  
  export interface GraphQueryResult<T = unknown> {
    records: T[];
    summary: {
      counters: {
        nodesCreated: number;
        nodesDeleted: number;
        relationshipsCreated: number;
        relationshipsDeleted: number;
        propertiesSet: number;
      };
      queryType: string;
    };
  }
  
  // Neo4j specific types
  export interface Neo4jConnectionConfig {
    uri: string;
    username: string;
    password: string;
    database?: string;
  }
  
  export interface Neo4jSession {
    run: (query: string, parameters?: Record<string, unknown>) => Promise<unknown>;
    close: () => Promise<void>;
  }
  
  // Traversal types
  export interface TraversalOptions {
    maxDepth?: number;
    relationshipTypes?: RelationshipType[];
    direction?: 'incoming' | 'outgoing' | 'both';
    filters?: Record<string, unknown>;
  }
  
  export interface Path {
    nodes: GraphNode[];
    relationships: GraphRelationship[];
    length: number;
  }
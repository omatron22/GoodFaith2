// src/lib/graph/neo4j-client.ts

import neo4j, { Driver, Session, Result, Transaction } from 'neo4j-driver';
import { 
  Neo4jConnectionConfig, 
  ErrorCode, 
  GraphNode, 
  GraphRelationship
} from '../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Neo4j Client for handling all database operations
 */
export class Neo4jClient {
  private driver: Driver | null = null;
  private config: Neo4jConnectionConfig;

  constructor(config: Neo4jConnectionConfig) {
    this.config = config;
  }

  /**
   * Initialize the Neo4j connection
   */
  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2000,
          connectionTimeout: 10000,
          maxTransactionRetryTime: 15000,
        }
      );

      // Verify connectivity
      await this.verifyConnectivity();
      
      console.log('Neo4j connected successfully');
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw {
        code: ErrorCode.DB_CONNECTION_ERROR,
        message: 'Failed to connect to Neo4j database',
        details: error,
      };
    }
  }

  /**
   * Verify database connectivity
   */
  private async verifyConnectivity(): Promise<void> {
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
    } finally {
      await session.close();
    }
  }

  /**
   * Get a new database session
   */
  getSession(accessMode: 'READ' | 'WRITE' = 'WRITE'): Session {
    if (!this.driver) {
      throw {
        code: ErrorCode.DB_CONNECTION_ERROR,
        message: 'Neo4j driver not initialized. Call connect() first.',
      };
    }

    return this.driver.session({
      database: this.config.database || 'neo4j',
      defaultAccessMode: accessMode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
    });
  }

  /**
   * Execute a query with optional parameters
   */
  async query<T = Result>(
    cypher: string,
    params: Record<string, unknown> = {},
    options: { 
      accessMode?: 'READ' | 'WRITE';
      transform?: (result: Result) => T;
    } = {}
  ): Promise<T> {
    const session = this.getSession(options.accessMode);
    
    try {
      const result = await session.run(cypher, params);
      
      // Apply custom transformation if provided
      if (options.transform) {
        // Convert QueryResult to Result using a type assertion through unknown
        return options.transform(result as unknown as Result);
      }
      
      // Default transformation: return the Result object
      return result as unknown as T;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw {
        code: ErrorCode.DB_QUERY_ERROR,
        message: 'Failed to execute Neo4j query',
        details: { query: cypher, error },
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a transaction with multiple queries
   */
  async transaction<T = unknown>(
    work: (tx: Transaction) => Promise<T>,
    options: { accessMode?: 'READ' | 'WRITE' } = {}
  ): Promise<T> {
    const session = this.getSession(options.accessMode);
    
    try {
      if (options.accessMode === 'READ') {
        return await session.readTransaction(work);
      } else {
        return await session.writeTransaction(work);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      throw {
        code: ErrorCode.DB_TRANSACTION_ERROR,
        message: 'Failed to execute Neo4j transaction',
        details: error,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create a node with given labels and properties
   */
  async createNode(labels: string[], properties: Record<string, unknown>): Promise<GraphNode> {
    const query = `
      CREATE (n:${labels.join(':')})
      SET n = $properties
      RETURN n
    `;

    const result = await this.query(query, { properties });
    const record = result.records[0];
    
    return this.extractNode(record.get('n'));
  }

  /**
   * Create a relationship between two nodes
   */
  async createRelationship(
    startNodeId: string,
    endNodeId: string,
    type: string,
    properties: Record<string, unknown> = {}
  ): Promise<GraphRelationship> {
    const query = `
      MATCH (a) WHERE id(a) = $startId
      MATCH (b) WHERE id(b) = $endId
      CREATE (a)-[r:${type}]->(b)
      SET r = $properties
      RETURN r
    `;

    const result = await this.query<Result>(query, {
      startId: neo4j.int(startNodeId),
      endId: neo4j.int(endNodeId),
      properties,
    });
    const record = result.records[0];
    
    return this.extractRelationship(record.get('r'));
  }

  /**
   * Find a node by ID
   */
  async findNodeById(id: string): Promise<GraphNode | null> {
    const query = `
      MATCH (n)
      WHERE id(n) = $id
      RETURN n
    `;

    const result = await this.query<Result>(query, { id: neo4j.int(id) });
    
    if (result.records.length === 0) {
      return null;
    }
    
    return this.extractNode(result.records[0].get('n'));
  }

  /**
   * Find nodes by label and properties
   */
  async findNodes(label: string, properties: Record<string, unknown> = {}): Promise<GraphNode[]> {
    const whereClause = Object.keys(properties).length > 0
      ? 'WHERE ' + Object.keys(properties).map(key => `n.${key} = $${key}`).join(' AND ')
      : '';

    const query = `
      MATCH (n:${label})
      ${whereClause}
      RETURN n
    `;

    const result = await this.query<Result>(query, properties);
    return result.records.map(record => this.extractNode(record.get('n')));
  }

  /**
   * Update a node's properties
   */
  async updateNode(id: string, properties: Record<string, unknown>): Promise<GraphNode> {
    const query = `
      MATCH (n)
      WHERE id(n) = $id
      SET n += $properties
      RETURN n
    `;

    const result = await this.query<Result>(query, {
      id: neo4j.int(id),
      properties,
    });
    
    if (result.records.length === 0) {
      throw {
        code: ErrorCode.DB_QUERY_ERROR,
        message: `Node with ID ${id} not found`,
      };
    }
    
    return this.extractNode(result.records[0].get('n'));
  }

  /**
   * Delete a node and its relationships
   */
  async deleteNode(id: string): Promise<void> {
    const query = `
      MATCH (n)
      WHERE id(n) = $id
      DETACH DELETE n
    `;

    await this.query(query, { id: neo4j.int(id) });
  }

  /**
   * Extract node data from Neo4j result
   */
  private extractNode(neo4jNode: unknown): GraphNode {
    const node = neo4jNode as { 
      identity: { toString: () => string }; 
      labels: string[]; 
      properties: Record<string, unknown>;
    };
    return {
      identity: node.identity.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      labels: node.labels as any, // Neo4j returns string[] but we need NodeType[]
      properties: node.properties,
    };
  }

  /**
   * Extract relationship data from Neo4j result
   */
  private extractRelationship(neo4jRelationship: unknown): GraphRelationship {
    const rel = neo4jRelationship as { 
      identity: { toString: () => string }; 
      start: { toString: () => string }; 
      end: { toString: () => string }; 
      type: string; 
      properties: Record<string, unknown>;
    };
    return {
      identity: rel.identity.toString(),
      start: rel.start.toString(),
      end: rel.end.toString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: rel.type as any, // Neo4j returns string but we need RelationshipType
      properties: rel.properties,
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('Neo4j connection closed');
    }
  }

  /**
   * Clear all data from the database (use with caution)
   */
  async clearDatabase(): Promise<void> {
    const query = `
      MATCH (n)
      DETACH DELETE n
    `;

    await this.query(query);
    console.log('Database cleared');
  }

  /**
   * Create indexes for better performance
   */
  async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX question_stage IF NOT EXISTS FOR (q:Question) ON (q.stage)',
      'CREATE INDEX answer_userId IF NOT EXISTS FOR (a:Answer) ON (a.userId)',
      'CREATE INDEX answer_timestamp IF NOT EXISTS FOR (a:Answer) ON (a.timestamp)',
      'CREATE INDEX principle_text IF NOT EXISTS FOR (p:Principle) ON (p.text)',
      'CREATE INDEX framework_name IF NOT EXISTS FOR (f:Framework) ON (f.name)',
      'CREATE INDEX stage_number IF NOT EXISTS FOR (s:Stage) ON (s.stageNumber)',
    ];

    for (const index of indexes) {
      await this.query(index);
    }
    
    console.log('Indexes created successfully');
  }

  /**
   * Create constraints for data integrity
   */
  async createConstraints(): Promise<void> {
    const constraints = [
      'CREATE CONSTRAINT question_id IF NOT EXISTS FOR (q:Question) REQUIRE q.id IS UNIQUE',
      'CREATE CONSTRAINT answer_id IF NOT EXISTS FOR (a:Answer) REQUIRE a.id IS UNIQUE',
      'CREATE CONSTRAINT principle_id IF NOT EXISTS FOR (p:Principle) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT framework_id IF NOT EXISTS FOR (f:Framework) REQUIRE f.id IS UNIQUE',
      'CREATE CONSTRAINT stage_id IF NOT EXISTS FOR (s:Stage) REQUIRE s.id IS UNIQUE',
    ];

    for (const constraint of constraints) {
      await this.query(constraint);
    }
    
    console.log('Constraints created successfully');
  }
}

// Export a singleton instance
export const neo4jClient = new Neo4jClient({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  database: process.env.NEO4J_DATABASE || 'neo4j',
});
// scripts/init-neo4j.ts

import { neo4jClient } from '../src/lib/graph/neo4j-client';

async function initializeDatabase() {
  console.log('Initializing Neo4j database...');
  
  try {
    // Connect to database
    await neo4jClient.connect();
    console.log('✓ Connected to Neo4j');

    // Clear existing data (optional, be careful!)
    if (process.argv.includes('--clear')) {
      await neo4jClient.clearDatabase();
      console.log('✓ Database cleared');
    }

    // Create indexes
    await neo4jClient.createIndexes();
    console.log('✓ Indexes created');

    // Create constraints
    await neo4jClient.createConstraints();
    console.log('✓ Constraints created');

    // Create initial Stage nodes for Kohlberg's stages
    console.log('Creating Kohlberg stage nodes...');
    
    const stages = [
      {
        id: 'stage-1',
        stageNumber: 1,
        name: 'Punishment-Obedience',
        description: 'Decisions based on avoiding punishment and obeying authority',
        reasoning: 'Actions are judged by their physical consequences',
        requiredAnswers: 3,
        exampleDilemmas: [
          'Should you steal food to avoid starving?',
          'Is it right to lie to avoid punishment?',
        ],
      },
      {
        id: 'stage-2',
        stageNumber: 2,
        name: 'Instrumental Exchange',
        description: 'Decisions based on self-interest and fair exchanges',
        reasoning: 'Actions are judged by their benefit to oneself',
        requiredAnswers: 3,
        exampleDilemmas: [
          'Should you help someone if they promise to help you later?',
          'Is it fair to share resources equally?',
        ],
      },
      {
        id: 'stage-3',
        stageNumber: 3,
        name: 'Interpersonal Conformity',
        description: 'Decisions based on social approval and relationships',
        reasoning: 'Actions are judged by how they affect relationships',
        requiredAnswers: 3,
        exampleDilemmas: [
          'Should you keep a promise to a friend even if it\'s costly?',
          'Is it right to follow group norms to maintain harmony?',
        ],
      },
      {
        id: 'stage-4',
        stageNumber: 4,
        name: 'Social Order',
        description: 'Decisions based on maintaining laws and social order',
        reasoning: 'Actions are judged by their impact on social systems',
        requiredAnswers: 3,
        exampleDilemmas: [
          'Should you follow an unjust law?',
          'Is it right to report a crime even if it harms someone you know?',
        ],
      },
      {
        id: 'stage-5',
        stageNumber: 5,
        name: 'Social Contract',
        description: 'Decisions based on democratic principles and individual rights',
        reasoning: 'Actions are judged by their consistency with social contracts',
        requiredAnswers: 3,
        exampleDilemmas: [
          'Should civil disobedience be allowed to change laws?',
          'How should conflicting rights be balanced?',
        ],
      },
      {
        id: 'stage-6',
        stageNumber: 6,
        name: 'Universal Principles',
        description: 'Decisions based on universal ethical principles',
        reasoning: 'Actions are judged by their consistency with universal principles',
        requiredAnswers: 3,
        exampleDilemmas: [
          'Should human rights be prioritized over national security?',
          'Is it right to break a promise to prevent greater harm?',
        ],
      },
    ];

    for (const stage of stages) {
      await neo4jClient.createNode(['Stage'], stage);
      console.log(`✓ Created stage ${stage.stageNumber}: ${stage.name}`);
    }

    // Create FOLLOWS relationships between stages
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];
      
      // Find the created nodes
      const current = await neo4jClient.findNodes('Stage', { stageNumber: currentStage.stageNumber });
      const next = await neo4jClient.findNodes('Stage', { stageNumber: nextStage.stageNumber });
      
      if (current.length && next.length) {
        await neo4jClient.createRelationship(
          current[0].identity,
          next[0].identity,
          'FOLLOWS',
          { order: i + 1 }
        );
        console.log(`✓ Created FOLLOWS relationship: Stage ${currentStage.stageNumber} -> Stage ${nextStage.stageNumber}`);
      }
    }

    console.log('\nDatabase initialization completed successfully!');
    
    // Close connection
    await neo4jClient.close();
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase();
}
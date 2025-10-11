import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';

/**
 * Sync Slack Messages to GitHub
 *
 * Scheduled Lambda that processes unprocessed Slack messages from DynamoDB
 * and syncs them to GitHub repositories.
 */

export const handler = async (event: EventBridgeEvent<string, any>) => {
  const startTime = Date.now();

  console.log('=== Sync Slack to GitHub Started ===');
  console.log('🕒 Event Time:', event.time);
  console.log('🔍 Environment:', process.env.ENV || 'unknown');

  try {
    // STEP 1: Initialize Amplify Data client with IAM authentication
    console.log('🔧 Initializing Amplify client...');
    const env = process.env as any;
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);

    const client = generateClient<Schema>({ authMode: 'iam' });
    console.log('✅ Amplify client initialized');

    // STEP 2: Query unprocessed Slack messages
    console.log('📬 Querying unprocessed Slack messages...');
    const { data: unprocessedMessages, errors } = await client.models.SlackEvent.list({
      filter: {
        processed: { eq: false },
      },
    });

    if (errors) {
      console.error('❌ Error querying SlackEvent:', errors);
      throw new Error('Failed to query SlackEvent table');
    }

    console.log(`📊 Found ${unprocessedMessages.length} unprocessed messages`);

    if (unprocessedMessages.length === 0) {
      console.log('✅ No messages to process');
      return {
        statusCode: 200,
        body: {
          message: 'No unprocessed messages',
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // STEP 3: Process each message
    let successCount = 0;
    let failureCount = 0;

    for (const message of unprocessedMessages) {
      try {
        console.log(`\n📝 Processing message ${message.id}...`);
        console.log(`   Channel: ${message.channelId}`);
        console.log(`   User: ${message.userId}`);
        console.log(`   Text: ${message.messageText?.substring(0, 50)}...`);

        // STEP 3a: Look up channel mapping
        if (!message.channelId) {
          console.warn(`⚠️  Message ${message.id} has no channelId`);
          await client.models.SlackEvent.update({
            id: message.id,
            processed: true,
          });
          failureCount++;
          continue;
        }

        const { data: mappings } = await client.models.ChannelMapping.list({
          filter: {
            slackChannelId: { eq: message.channelId },
          },
        });

        if (!mappings || mappings.length === 0) {
          console.warn(`⚠️  No channel mapping found for ${message.channelId}`);
          // Mark as processed even if no mapping (to avoid re-processing)
          await client.models.SlackEvent.update({
            id: message.id,
            processed: true,
          });
          failureCount++;
          continue;
        }

        const mapping = mappings[0];
        console.log(`   Mapped to: ${mapping.githubOwner}/${mapping.githubRepo}/${mapping.githubBranch}`);

        // STEP 3b: TODO - Create/update file in GitHub
        // For now, just log what we would do
        console.log(`   TODO: Write to GitHub repo`);
        console.log(`   File path: messages/${message.timestamp}.md`);

        // STEP 3c: Mark as processed
        await client.models.SlackEvent.update({
          id: message.id,
          processed: true,
        });

        console.log(`✅ Message ${message.id} processed successfully`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to process message ${message.id}:`, error.message);
        failureCount++;
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log('\n=== Sync Completed ===');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`⏱️  Total time: ${totalProcessingTime}ms`);

    return {
      statusCode: 200,
      body: {
        message: 'Sync completed',
        timestamp: new Date().toISOString(),
        messagesProcessed: unprocessedMessages.length,
        successCount,
        failureCount,
        processingTimeMs: totalProcessingTime,
      },
    };
  } catch (error: any) {
    const totalProcessingTime = Date.now() - startTime;
    console.error('❌ Sync failed:', error.message);
    console.error('Stack trace:', error.stack);

    return {
      statusCode: 500,
      body: {
        error: 'Sync failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        processingTimeMs: totalProcessingTime,
      },
    };
  }
};

import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../../data/resource';

/**
 * Educational Example: Scheduled Function with EventBridge
 * 
 * IMPORTANT TYPE FIX: We use EventBridgeEvent<string, any> instead of ScheduledHandler
 * because ScheduledHandler expects void return, but we want to return status codes
 * for proper monitoring and error handling in EventBridge.
 * 
 * This function demonstrates common patterns for scheduled Lambda functions:
 * 
 * 1. 🕒 EventBridge Scheduling - How to trigger functions on cron schedules
 * 2. 🌐 External API Integration - Fetching data from third-party services
 * 3. 💾 Database Operations - Storing results in DynamoDB via GraphQL
 * 4. 🔐 IAM Authentication - Secure Lambda-to-AppSync communication
 * 5. ⚠️  Error Handling - Graceful failure handling with comprehensive logging
 * 6. 📦 Batch Processing - Processing multiple items efficiently
 * 7. 🔄 Data Lifecycle - Managing active/inactive records
 * 8. 📊 Monitoring - Structured logging for CloudWatch insights
 * 
 * Common Use Cases:
 * - Daily data synchronization from external systems
 * - Periodic cleanup of expired records
 * - Automated report generation
 * - Health checks and monitoring
 * - Batch processing of queued items
 * 
 * Key EventBridge Patterns:
 * - EventBridge sends scheduled events to Lambda automatically
 * - Use IAM authorization for Lambda-to-AppSync communication (no tokens needed)
 * - Initialize Amplify client inside the handler for each execution
 * - Implement comprehensive error handling to prevent infinite retries
 */

// Generic interfaces for educational purposes
interface ExternalDataResponse {
  data: {
    id: string;
    content: string;
    timestamp: string;
  };
  metadata: {
    source: string;
    version: string;
  };
}

interface ProcessingRecord {
  date: string;
  source: string;
  data: string;
  status: 'success' | 'failed' | 'partial';
  recordCount?: number;
  executedAt: string;
  processingTime?: number;
}

export const handler = async (event: EventBridgeEvent<string, any>) => {
  const startTime = Date.now();
  
  console.log('=== Scheduled Function Started ===');
  console.log('🕒 Event Source:', event.source);
  console.log('🕒 Event Time:', event.time);
  console.log('🕒 Schedule ID:', event.id);
  console.log('🕒 Execution Time:', new Date().toISOString());
  console.log('🔍 Environment:', process.env.ENV || 'unknown');
  console.log('🌍 Region:', process.env.REGION || 'unknown');
  
  try {
    // STEP 1: Initialize Amplify Data client with IAM authentication
    // This pattern allows the Lambda function to communicate with AppSync securely
    // without managing tokens or credentials manually
    //
    // WHY THIS WORKS: The two-pass system provides everything needed:
    // - resourceGroupName: 'data' (in resource.ts) = IAM permissions to DynamoDB
    // - allow.resource(functionName) (in schema) = Injects AMPLIFY_DATA_GRAPHQL_ENDPOINT
    console.log('🔧 Initializing Amplify client...');
    const env = process.env as any;
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);
    
    // Use IAM auth mode - Lambda execution role automatically has AppSync permissions
    // (No API keys needed - IAM is more secure and rotates automatically)
    const client = generateClient<Schema>({ authMode: 'iam' });
    console.log('✅ Amplify client initialized successfully');

    // STEP 2: External Data Processing
    // Common pattern: Fetch data from external APIs, transform, and store
    console.log('=== Processing Daily Data Sync ===');
    const externalData = await processDaily();
    
    if (!externalData) {
      throw new Error('Daily processing failed - no data returned');
    }

    console.log('✅ Daily processing completed successfully');
    console.log('📊 Data summary:', {
      recordCount: externalData.recordCount,
      source: externalData.source,
      timestamp: externalData.timestamp
    });

    // STEP 3: Database Operations
    // Store processed data with metadata for tracking and monitoring
    console.log('=== Storing Processed Data ===');
    const processingTime = Date.now() - startTime;
    
    const syncRecord: ProcessingRecord = {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      source: externalData.source,
      data: JSON.stringify(externalData),
      status: 'success',
      recordCount: externalData.recordCount,
      executedAt: new Date().toISOString(),
      processingTime
    };

    // STEP 4: Data Lifecycle Management
    // Mark previous records as inactive (common pattern for "current" data)
    await cleanupExpiredRecords(client);

    // STEP 5: Create new processing record
    const createResult = await client.models.DailySync.create({
      date: syncRecord.date,
      source: syncRecord.source,
      data: syncRecord.data,
      status: syncRecord.status,
      recordCount: syncRecord.recordCount,
      executedAt: syncRecord.executedAt,
      isActive: true
    });

    console.log('✅ Data stored successfully');
    console.log('📝 Record ID:', createResult.data?.id);

    // STEP 6: Additional Processing (Optional)
    // Example of batch processing for multiple data sources
    if (process.env.ENABLE_BATCH_PROCESSING === 'true') {
      console.log('=== Running Batch Processing ===');
      await processBatchOperations(client);
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log('=== Scheduled Function Completed Successfully ===');
    console.log(`⏱️  Total processing time: ${totalProcessingTime}ms`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily sync completed successfully',
        timestamp: new Date().toISOString(),
        recordsProcessed: externalData.recordCount,
        processingTimeMs: totalProcessingTime,
        syncId: createResult.data?.id
      })
    };

  } catch (error: any) {
    console.error('=== SCHEDULED FUNCTION ERROR ===');
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('🔍 Event details:', JSON.stringify(event, null, 2));
    console.error('⏱️  Failed after:', Date.now() - startTime, 'ms');

    // Store error record in database for monitoring and debugging
    // This pattern helps track failure rates and patterns
    try {
      const env = process.env as any;
      const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
      Amplify.configure(resourceConfig, libraryOptions);
      const client = generateClient<Schema>({ authMode: 'iam' });

      await client.models.DailySync.create({
        date: new Date().toISOString().split('T')[0],
        source: 'scheduled-function-error',
        data: JSON.stringify({ 
          error: error.message,
          stack: error.stack,
          eventId: event.id,
          processingTime: Date.now() - startTime
        }),
        status: 'failed',
        executedAt: new Date().toISOString(),
        isActive: true
      });
      
      console.log('📝 Error record stored for debugging');
    } catch (dbError) {
      console.error('⚠️  Failed to store error record:', dbError);
    }

    // IMPORTANT: Don't throw errors in scheduled functions
    // This prevents infinite retries by EventBridge
    // Return error response instead for proper monitoring
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Scheduled processing failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime
      })
    };
  }
};

/**
 * EDUCATIONAL PATTERN: Daily Data Processing
 * 
 * This function simulates common daily processing tasks like:
 * - Fetching updated customer data from CRM systems
 * - Syncing inventory from external APIs
 * - Aggregating analytics data
 * - Processing overnight transactions
 */
async function processDaily(): Promise<{
  recordCount: number;
  source: string;
  timestamp: string;
  data: any;
} | null> {
  try {
    console.log('📊 Starting daily data processing...');
    
    // Simulate external API call for demonstration
    // In production, replace with your actual data source:
    // - CRM API (Salesforce, HubSpot)
    // - Payment processor (Stripe, Square)
    // - Analytics platform (Google Analytics, Mixpanel)
    // - Inventory system
    const externalData = await fetchExternalDataSource();
    
    if (!externalData) {
      throw new Error('External data source unavailable');
    }

    // Transform and validate data
    const processedData = transformData(externalData);
    
    console.log('✅ Daily processing completed');
    return {
      recordCount: processedData.length,
      source: 'daily-sync-api',
      timestamp: new Date().toISOString(),
      data: processedData
    };

  } catch (error: any) {
    console.error('❌ Daily processing failed:', error.message);
    return null;
  }
}

/**
 * EDUCATIONAL PATTERN: External Data Source Integration
 * 
 * Common patterns for external API integration:
 * - Authentication (API keys, OAuth tokens)
 * - Rate limiting and retry logic
 * - Data validation and transformation
 * - Error handling for network issues
 */
async function fetchExternalDataSource(): Promise<ExternalDataResponse | null> {
  try {
    console.log('🌐 Fetching from external data source...');
    
    // Example API call - replace with your actual endpoint
    // Common external services: Stripe, Salesforce, Google APIs, etc.
    const apiUrl = process.env.EXTERNAL_API_URL || 'https://jsonplaceholder.typicode.com/posts';
    
    const response = await fetch(`${apiUrl}/1`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Amplify-Scheduled-Function/1.0',
        'Accept': 'application/json',
        // 'Authorization': `Bearer ${process.env.API_TOKEN}`, // For authenticated APIs
        // 'X-API-Key': process.env.API_KEY, // For API key authentication
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    
    // Transform external data format to our standard format
    const transformedData: ExternalDataResponse = {
      data: {
        id: rawData.id?.toString() || 'unknown',
        content: rawData.title || rawData.body || 'No content',
        timestamp: new Date().toISOString()
      },
      metadata: {
        source: 'external-api',
        version: '1.0'
      }
    };
    
    console.log('✅ External API call successful');
    return transformedData;

  } catch (error: any) {
    console.error('❌ External API error:', error.message);
    return null;
  }
}

/**
 * EDUCATIONAL PATTERN: Data Transformation
 * 
 * Common transformation patterns:
 * - Normalizing data formats
 * - Validating required fields
 * - Converting data types
 * - Filtering and cleaning data
 */
function transformData(rawData: ExternalDataResponse): any[] {
  console.log('🔄 Transforming raw data...');
  
  // Example transformation - adapt to your data structure
  const transformed = [{
    id: rawData.data.id,
    processedContent: rawData.data.content.toLowerCase().trim(),
    processedAt: new Date().toISOString(),
    source: rawData.metadata.source,
    isValid: rawData.data.content.length > 0
  }];
  
  console.log(`📊 Transformed ${transformed.length} records`);
  return transformed;
}

/**
 * EDUCATIONAL PATTERN: Cleanup Expired Records
 * 
 * Common cleanup tasks for scheduled functions:
 * - Mark old records as inactive
 * - Delete expired sessions
 * - Archive old data
 * - Clean up temporary files
 */
async function cleanupExpiredRecords(
  client: ReturnType<typeof generateClient<Schema>>
): Promise<void> {
  try {
    console.log('🧹 Cleaning up expired records...');

    // Get retention period from environment (default 30 days)
    const retentionDays = parseInt(process.env.KEEP_RECORDS_DAYS || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    // Find old active records to mark as inactive
    const { data: oldRecords } = await client.models.DailySync.list({
      filter: {
        date: { lt: cutoffDateString },
        isActive: { eq: true }
      }
    });

    console.log(`🔍 Found ${oldRecords.length} expired records to cleanup`);

    // Mark old records as inactive (batch operation)
    const updatePromises = oldRecords.map(record => 
      client.models.DailySync.update({
        id: record.id,
        isActive: false
      })
    );

    await Promise.allSettled(updatePromises);
    console.log(`✅ Cleaned up ${oldRecords.length} expired records`);

  } catch (error: any) {
    console.error('⚠️ Cleanup error:', error.message);
    // Don't throw - cleanup failure shouldn't stop main processing
  }
}

/**
 * EDUCATIONAL PATTERN: Batch Processing Operations
 * 
 * Useful patterns for processing multiple items:
 * - Processing queued messages
 * - Batch updates to database
 * - Multi-source data aggregation
 * - Parallel API calls with concurrency limits
 */
async function processBatchOperations(
  client: ReturnType<typeof generateClient<Schema>>
): Promise<void> {
  try {
    console.log('📦 Starting batch operations...');

    // Get batch size from environment
    const batchSize = parseInt(process.env.BATCH_SIZE || '10');
    
    // Example: Process multiple data sources in parallel
    const dataSources = [
      'customer-data',
      'inventory-updates', 
      'analytics-metrics',
      'system-health'
    ];

    const batchPromises = dataSources.map(async (source, index) => {
      // Simulate processing each data source
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      return {
        source,
        status: Math.random() > 0.2 ? 'success' : 'failed', // 80% success rate
        recordsProcessed: Math.floor(Math.random() * 100) + 1,
        timestamp: new Date().toISOString()
      };
    });

    // Process all batches with proper error handling
    const results = await Promise.allSettled(batchPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Batch processing complete: ${successful} successful, ${failed} failed`);

    // Store batch processing summary
    await client.models.DailySync.create({
      date: new Date().toISOString().split('T')[0],
      source: 'batch-operations-summary',
      data: JSON.stringify({
        batchSize,
        totalOperations: dataSources.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'failed' }),
        timestamp: new Date().toISOString()
      }),
      status: failed === 0 ? 'success' : 'partial',
      recordCount: successful,
      executedAt: new Date().toISOString(),
      isActive: true
    });

  } catch (error: any) {
    console.error('⚠️ Batch processing error:', error.message);
    // Don't throw - this is optional processing
  }
}

/**
 * ===================================================================
 * EDUCATIONAL NOTES: Key Patterns and Best Practices
 * ===================================================================
 * 
 * 🕒 EVENTBRIDGE SCHEDULING PATTERNS:
 *    Configure in backend.ts with EventBridge Rules and cron expressions:
 *    
 *    Daily at 2 AM UTC:
 *    Schedule.cron({ hour: '2', minute: '0' })
 *    
 *    Every hour during business hours:
 *    Schedule.cron({ minute: '0', hour: '9-17', weekDay: 'MON-FRI' })
 *    
 *    First day of each month:
 *    Schedule.cron({ minute: '0', hour: '2', day: '1' })
 *    
 *    Every 15 minutes:
 *    Schedule.rate(Duration.minutes(15))
 * 
 * 🔐 IAM AUTHENTICATION PATTERN:
 *    Lambda functions automatically get IAM permissions for AppSync.
 *    Use authMode: 'iam' - no tokens or credentials needed.
 *    Function must be configured with allow.resource() in schema.
 * 
 * ⚠️  ERROR HANDLING BEST PRACTICES:
 *    - NEVER throw errors in scheduled functions (causes infinite retries)
 *    - Always return HTTP status codes (200 for success, 500 for error)
 *    - Log errors comprehensively with structured data
 *    - Store error records in database for debugging and monitoring
 *    - Use try/catch blocks around non-critical operations
 * 
 * 🌐 EXTERNAL API INTEGRATION PATTERNS:
 *    - Always set timeouts (use AbortSignal.timeout())
 *    - Include proper User-Agent headers
 *    - Handle authentication (API keys, OAuth tokens)
 *    - Implement retry logic for transient failures
 *    - Validate and transform response data
 *    - Use environment variables for configuration
 * 
 * 💾 DATABASE OPERATION PATTERNS:
 *    - Use date-based partitioning (YYYY-MM-DD) for time series data
 *    - Implement active/inactive flags for "current" data management
 *    - Store comprehensive metadata (timing, counts, sources)
 *    - Use batch operations for multiple updates
 *    - Handle partial failures gracefully
 * 
 * 📊 MONITORING AND OBSERVABILITY:
 *    - Use structured JSON logging for CloudWatch parsing
 *    - Include execution timing and performance metrics
 *    - Track success/failure rates in database
 *    - Monitor function duration and memory usage
 *    - Set up CloudWatch alarms for error rates
 *    - Use consistent log message formatting
 * 
 * 🔄 DATA LIFECYCLE MANAGEMENT:
 *    - Implement cleanup routines for expired data
 *    - Use retention policies based on business requirements
 *    - Archive rather than delete important historical data
 *    - Consider storage costs vs. data value over time
 * 
 * 📦 BATCH PROCESSING TECHNIQUES:
 *    - Process items in configurable batch sizes
 *    - Use Promise.allSettled() for parallel processing
 *    - Implement concurrency limits to avoid overwhelming external APIs
 *    - Track partial successes and failures separately
 *    - Consider memory usage with large datasets
 * 
 * ⚡ PERFORMANCE OPTIMIZATION:
 *    - Right-size memory allocation based on actual usage
 *    - Optimize timeout values (not too short, not too long)
 *    - Use efficient data structures and algorithms
 *    - Consider cold start impacts for infrequent schedules
 *    - Monitor and optimize external API call patterns
 * 
 * 🔒 SECURITY CONSIDERATIONS:
 *    - Store sensitive data (API keys) in AWS Secrets Manager
 *    - Use least-privilege IAM permissions
 *    - Validate and sanitize external data inputs
 *    - Avoid logging sensitive information
 *    - Use VPC endpoints for private resource access
 * 
 * 🧪 TESTING STRATEGIES:
 *    - Test functions manually using AWS Lambda console
 *    - Create test events that match EventBridge format
 *    - Use different schedules for dev/staging/prod environments
 *    - Monitor initial deployments closely
 *    - Test error conditions and recovery scenarios
 * 
 * 💰 COST OPTIMIZATION:
 *    - Schedule functions only as frequently as needed
 *    - Use ARM-based Lambda for cost savings (when compatible)
 *    - Monitor execution duration and optimize accordingly
 *    - Consider reserved capacity for predictable workloads
 *    - Review and clean up unused or redundant schedules
 */
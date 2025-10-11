import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Amplify } from 'aws-amplify';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Educational Example: User-Triggered Background Processing Handler
// This demonstrates common patterns for user-initiated background tasks:
// 1. File processing (resize, convert, analyze)
// 2. Report generation (usage, analytics, summaries)
// 3. Data export (JSON, CSV, PDF formats)
// 4. Async task management with progress tracking
// 5. Graceful error handling with user-friendly responses

const secretsClient = new SecretsManagerClient({ region: process.env.REGION });

// Handler type - in real usage, match your specific mutation
// Examples: processUserFile, generateReport, exportUserData
type Handler = Schema['processUserFile']['functionHandler'] | 
              Schema['generateReport']['functionHandler'] | 
              Schema['exportUserData']['functionHandler'];

export const handler: Handler = async (event, context) => {
  console.log('🚀 User-triggered background task handler called');
  console.log('Event arguments:', JSON.stringify(event.arguments, null, 2));
  
  try {
    // ✅ STEP 1: Extract authenticated user from context
    // This is automatically provided by Amplify when using authenticated mutations
    const userId = context.identity?.sub;
    
    if (!userId) {
      console.error('❌ No authenticated user found in context');
      throw new Error('Unauthorized - must be signed in');
    }
    
    console.log('👤 Authenticated user ID:', userId);
    
    // ✅ STEP 2: Extract and validate arguments based on task type
    // Different mutations will have different argument structures
    const args = event.arguments;
    
    // Determine task type from the mutation or arguments
    let taskType: string;
    if ('fileId' in args && 'processingType' in args) {
      taskType = 'PROCESS_FILE';
    } else if ('reportType' in args && 'dateRange' in args) {
      taskType = 'GENERATE_REPORT';
    } else if ('dataTypes' in args && 'format' in args) {
      taskType = 'EXPORT_DATA';
    } else {
      throw new Error('Unknown task type or missing required arguments');
    }
    
    console.log('📝 Task details:', { taskType, args });
    
    // ✅ STEP 3: Initialize Amplify data client with IAM authentication
    // Using IAM mode allows the function to access all data regardless of user permissions
    const env = process.env as any;
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    
    Amplify.configure(resourceConfig, libraryOptions);
    
    const client = generateClient<Schema>({
      authMode: 'iam', // Function runs with elevated permissions
    });
    
    // ✅ STEP 4: Validate user permissions
    console.log('🔍 Checking user permissions...');
    
    const user = await client.models.User.get({ id: userId });
    
    if (!user.data) {
      throw new Error('User not found in database');
    }
    
    if (!user.data.isActive) {
      throw new Error('User account is not active');
    }
    
    console.log('✅ User validation passed:', {
      email: user.data.email,
      isActive: user.data.isActive,
      userType: user.data.userType
    });
    
    // ✅ STEP 5: Additional permission checks based on task type
    if (taskType === 'GENERATE_REPORT' && user.data.userType !== 'ADMIN') {
      throw new Error('Insufficient permissions for report generation');
    }
    
    if (taskType === 'EXPORT_DATA' && !user.data.canExportData) {
      throw new Error('Data export not enabled for this user');
    }
    
    // File processing permissions based on file ownership
    if (taskType === 'PROCESS_FILE' && 'fileId' in args) {
      const file = await client.models.File.get({ id: args.fileId });
      if (!file.data || file.data.owner !== userId) {
        throw new Error('Cannot process file - not owned by user');
      }
    }
    
    // ✅ STEP 6: Get secrets for external service calls
    console.log('🔐 Retrieving service credentials...');
    const environment = process.env.ENV || 'dev';
    
    // Different services might need different credentials
    const secretId = `amplify-template/${environment}/processing-services`;
    const command = new GetSecretValueCommand({ SecretId: secretId });
    
    let serviceCredentials: any;
    try {
      const secretResponse = await secretsClient.send(command);
      if (!secretResponse.SecretString) {
        throw new Error('No secrets found');
      }
      serviceCredentials = JSON.parse(secretResponse.SecretString);
      console.log('✅ Service credentials retrieved successfully');
    } catch (error) {
      console.warn('⚠️ Could not retrieve credentials, using mock mode');
      serviceCredentials = {
        file_processor_key: 'mock-file-key',
        report_generator_key: 'mock-report-key',
        data_exporter_key: 'mock-export-key'
      };
    }
    
    // ✅ STEP 7: Call appropriate external service based on task type
    console.log('🌐 Calling external processing service...');
    
    let serviceEndpoint: string;
    let authKey: string;
    let servicePayload: any;
    
    // Configure service call based on task type
    switch (taskType) {
      case 'PROCESS_FILE':
        serviceEndpoint = 'https://file-processor.example.com/process';
        authKey = serviceCredentials.file_processor_key;
        servicePayload = {
          fileId: (args as any).fileId,
          processingType: (args as any).processingType,
          options: (args as any).options || {},
          userId,
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'GENERATE_REPORT':
        serviceEndpoint = 'https://report-generator.example.com/create';
        authKey = serviceCredentials.report_generator_key;
        servicePayload = {
          reportType: (args as any).reportType,
          dateRange: (args as any).dateRange,
          filters: (args as any).filters || {},
          userId,
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'EXPORT_DATA':
        serviceEndpoint = 'https://data-exporter.example.com/queue';
        authKey = serviceCredentials.data_exporter_key;
        servicePayload = {
          dataTypes: (args as any).dataTypes,
          format: (args as any).format,
          email: (args as any).email || user.data.email,
          userId,
          timestamp: new Date().toISOString()
        };
        break;
        
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
    
    let serviceResult;
    try {
      const serviceResponse = await fetch(serviceEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Amplify-Function/1.0'
        },
        body: JSON.stringify(servicePayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!serviceResponse.ok) {
        throw new Error(`Service failed: ${serviceResponse.status} ${serviceResponse.statusText}`);
      }
      
      serviceResult = await serviceResponse.json();
      console.log('✅ External service call successful:', serviceResult);
      
    } catch (error) {
      console.warn('⚠️ External service call failed, using mock response:', error);
      // Generate appropriate mock response based on task type
      serviceResult = {
        id: `mock-${taskType.toLowerCase()}-${Date.now()}`,
        status: 'queued',
        message: `Mock ${taskType.toLowerCase().replace('_', ' ')} service response`,
        estimatedTime: taskType === 'PROCESS_FILE' ? '2-5 minutes' : '5-15 minutes',
        ...(taskType === 'EXPORT_DATA' && { deliveryMethod: 'email' }),
        ...(taskType === 'GENERATE_REPORT' && { downloadUrl: `https://reports.example.com/download/mock-${Date.now()}` })
      };
    }
    
    // ✅ STEP 8: Record the task in database for tracking
    console.log('💾 Recording task in database...');
    
    const taskRecord = await client.models.UserTask.create({
      userId,
      taskType,
      taskData: JSON.stringify(args),
      externalId: serviceResult.id,
      externalStatus: serviceResult.status,
      status: serviceResult.status === 'completed' ? 'COMPLETED' : 'IN_PROGRESS',
      estimatedCompletion: serviceResult.estimatedTime,
      createdAt: new Date().toISOString(),
      owner: userId // Enables user to query their own tasks
    });
    
    if (!taskRecord.data) {
      throw new Error('Failed to create task record');
    }
    
    console.log('✅ Task recorded with ID:', taskRecord.data.id);
    
    // ✅ STEP 9: Update related records based on task type
    try {
      // Update user's last activity
      await client.models.User.update({
        id: userId,
        lastTaskAt: new Date().toISOString()
      });
      
      // Task-specific updates
      if (taskType === 'PROCESS_FILE' && 'fileId' in args) {
        await client.models.File.update({
          id: (args as any).fileId,
          status: 'PROCESSING',
          processingJobId: serviceResult.id,
          processingStartedAt: new Date().toISOString()
        });
      }
      
      if (taskType === 'GENERATE_REPORT') {
        await client.models.ReportRequest.create({
          userId,
          reportType: (args as any).reportType,
          status: 'GENERATING',
          jobId: serviceResult.id,
          owner: userId
        });
      }
      
      console.log('✅ Related records updated');
    } catch (updateError) {
      console.warn('⚠️ Could not update related records (non-critical):', updateError);
      // Don't fail the whole operation for secondary updates
    }
    
    // ✅ STEP 10: Invalidate relevant caches based on task type
    try {
      const cacheKeysToInvalidate = [];
      
      // Different task types affect different caches
      switch (taskType) {
        case 'PROCESS_FILE':
          cacheKeysToInvalidate.push('USER_FILES', 'FILE_THUMBNAILS');
          break;
        case 'GENERATE_REPORT':
          cacheKeysToInvalidate.push('USER_REPORTS', 'DASHBOARD_DATA');
          break;
        case 'EXPORT_DATA':
          cacheKeysToInvalidate.push('USER_EXPORTS', 'PRIVACY_REQUESTS');
          break;
      }
      
      for (const cacheType of cacheKeysToInvalidate) {
        await client.models.Cache.delete({ 
          userId: userId,
          cacheType
        });
      }
      
      console.log('✅ Caches invalidated:', cacheKeysToInvalidate);
    } catch (cacheError) {
      console.warn('⚠️ Cache invalidation failed (non-critical):', cacheError);
    }
    
    // ✅ STEP 11: Return structured success response based on task type
    let response: any = {
      success: true,
      taskId: taskRecord.data.id,
      externalId: serviceResult.id,
      message: `${taskType.replace('_', ' ').toLowerCase()} started successfully`,
      timestamp: new Date().toISOString()
    };
    
    // Add task-specific response fields
    switch (taskType) {
      case 'PROCESS_FILE':
        response.estimatedTime = serviceResult.estimatedTime;
        response.processingType = (args as any).processingType;
        break;
        
      case 'GENERATE_REPORT':
        response.downloadUrl = serviceResult.downloadUrl;
        response.reportType = (args as any).reportType;
        break;
        
      case 'EXPORT_DATA':
        response.deliveryMethod = serviceResult.deliveryMethod || 'email';
        response.format = (args as any).format;
        break;
    }
    
    console.log('🎉 Background task initiated successfully:', response);
    return response;
    
  } catch (error: any) {
    console.error('❌ Error in user action handler:', error);
    
    // ✅ STEP 12: Structured error handling with task-specific context
    // Return consistent error format instead of throwing
    return {
      success: false,
      taskId: null,
      externalId: null,
      message: error.message || 'Failed to process background task',
      timestamp: new Date().toISOString(),
      error: {
        type: error.constructor.name,
        code: error.code || 'UNKNOWN_ERROR',
        taskType: taskType || 'UNKNOWN_TASK'
      }
    };
  }
};

// 📚 Key Learning Points for User-Triggered Background Processing:
// 
// 1. USER CONTEXT: Always validate authenticated user from context.identity.sub
// 2. TASK IDENTIFICATION: Determine task type from mutation arguments or event structure
// 3. PERMISSION VALIDATION: Check user permissions for specific task types
// 4. RESOURCE OWNERSHIP: Validate user owns resources they're trying to process
// 5. SERVICE INTEGRATION: Route to appropriate external services based on task type
// 6. ASYNC PATTERNS: Start background jobs and return immediately with tracking info
// 7. PROGRESS TRACKING: Store task records for user to monitor progress
// 8. GRACEFUL DEGRADATION: Handle service failures with fallbacks and mock responses
// 9. CACHE MANAGEMENT: Invalidate relevant caches based on task type
// 10. STRUCTURED RESPONSES: Return consistent, task-specific response formats
// 11. ERROR CONTEXT: Include task type and details in error responses
// 12. SECURITY: Use AWS Secrets Manager, validate inputs, check ownership
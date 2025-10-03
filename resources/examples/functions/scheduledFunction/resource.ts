import { defineFunction } from '@aws-amplify/backend';

/**
 * Educational Example: Scheduled Lambda Function Configuration
 * 
 * This demonstrates how to configure a Lambda function for scheduled execution
 * with EventBridge. This is the resource definition - the actual scheduling
 * rules are configured in backend.ts.
 * 
 * Key Configuration Patterns:
 * 
 * 🏗️  Function Definition:
 *    - name: Unique identifier for the function
 *    - entry: Path to the handler file (TypeScript supported)
 *    - resourceGroupName: Groups related resources for organization
 * 
 * ⏱️  Timeout and Memory for Scheduled Functions:
 *    - Scheduled functions often need longer timeouts than API functions
 *    - Common timeout ranges: 300s (5min) for data sync, 900s (15min) for heavy processing
 *    - Memory allocation impacts both performance and cost
 *    - Monitor CloudWatch metrics to optimize settings
 * 
 * 🔧 Environment Variables:
 *    - Pass configuration without hardcoding values in code
 *    - Include environment identifiers (dev, staging, prod)
 *    - Add feature flags for conditional behavior
 *    - Store non-sensitive configuration (use AWS Secrets Manager for sensitive data)
 * 
 * 📅 EventBridge Integration:
 *    - Schedule configuration is added in backend.ts using EventBridge Rules
 *    - Uses cron expressions or rate expressions for flexible scheduling
 *    - Single function can have multiple schedules (e.g., hourly + daily)
 *    - Supports conditional scheduling based on environment
 */

export const scheduledFunctionExample = defineFunction({
  // Unique name - used in CloudFormation stack and AWS console
  name: 'scheduledFunctionExample',
  
  // Path to handler file (relative to resource.ts location)
  entry: './handler.ts',
  
  // CRITICAL FOR DYNAMODB ACCESS: resourceGroupName: 'data'
  // This grants the Lambda function IAM permissions to access your DynamoDB tables
  // Without this, the function will get AccessDeniedException when using the Amplify Data client
  // Must match the resource group name in your data schema authorization rules
  resourceGroupName: 'data',
  
  // TIMEOUT CONFIGURATION:
  // Choose based on expected processing time + buffer
  // - Light API calls: 60-180 seconds
  // - Data processing: 300-600 seconds  
  // - Heavy batch operations: 600-900 seconds (max for Lambda)
  timeoutSeconds: 300, // 5 minutes for typical data sync operations
  
  // MEMORY CONFIGURATION:
  // Impacts both performance and cost - monitor CloudWatch metrics
  // - Simple API calls: 512MB
  // - Data transformation: 1024MB
  // - Large dataset processing: 1536MB+
  memoryMB: 1024, // 1GB - good balance for most data processing tasks
  
  // ENVIRONMENT VARIABLES:
  // Configuration that varies between environments
  environment: {
    // Standard environment identification
    ENV: process.env.ENV || 'dev',
    REGION: process.env.AWS_REGION || 'us-east-1',
    
    // External service configuration
    EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || 'https://jsonplaceholder.typicode.com/posts',
    
    // Feature flags for conditional behavior
    ENABLE_BATCH_PROCESSING: 'true',
    BATCH_SIZE: '10',
    
    // Data management settings
    KEEP_RECORDS_DAYS: '30',
    
    // Performance tuning
    MAX_CONCURRENT_REQUESTS: '5',
    API_TIMEOUT_SECONDS: '30',
    
    // Monitoring and debugging
    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
    ENABLE_DETAILED_LOGGING: process.env.ENV === 'dev' ? 'true' : 'false',
  },
});

/**
 * ========================================================================
 * EVENTBRIDGE SCHEDULING EXAMPLES FOR BACKEND.TS
 * ========================================================================
 * 
 * Copy these patterns to your backend.ts file to create EventBridge rules.
 * Each rule creates a separate trigger for the same Lambda function.
 * 
 * Required imports in backend.ts:
 * ```typescript
 * import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
 * import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
 * import { Duration } from 'aws-cdk-lib';
 * ```
 * 
 * PATTERN 1: DAILY PROCESSING
 * Perfect for: Data synchronization, daily reports, cleanup tasks
 * 
 * new Rule(backend.scheduledFunctionExample.resources.lambda.stack, 'DailySync', {
 *   schedule: Schedule.cron({ 
 *     minute: '0', 
 *     hour: '2',     // 2 AM UTC (adjust for your timezone)
 *     day: '*',      // Every day
 *     month: '*',    // Every month
 *     year: '*'      // Every year
 *   }),
 *   description: 'Daily data synchronization at 2 AM UTC',
 *   targets: [new LambdaFunction(backend.scheduledFunctionExample.resources.lambda)]
 * });
 * 
 * PATTERN 2: BUSINESS HOURS PROCESSING
 * Perfect for: API syncing during active hours, monitoring checks
 * 
 * new Rule(backend.scheduledFunctionExample.resources.lambda.stack, 'BusinessHoursSync', {
 *   schedule: Schedule.cron({
 *     minute: '0',
 *     hour: '9-17',        // 9 AM to 5 PM UTC
 *     day: '*',
 *     month: '*',
 *     year: '*',
 *     weekDay: 'MON-FRI'   // Monday to Friday only
 *   }),
 *   description: 'Hourly sync during business hours (9 AM - 5 PM UTC, weekdays)',
 *   targets: [new LambdaFunction(backend.scheduledFunctionExample.resources.lambda)]
 * });
 * 
 * PATTERN 3: HIGH-FREQUENCY PROCESSING
 * Perfect for: Real-time data feeds, monitoring, health checks
 * 
 * new Rule(backend.scheduledFunctionExample.resources.lambda.stack, 'FrequentSync', {
 *   schedule: Schedule.rate(Duration.minutes(15)), // Every 15 minutes
 *   description: 'High-frequency data sync every 15 minutes',
 *   targets: [new LambdaFunction(backend.scheduledFunctionExample.resources.lambda)]
 * });
 * 
 * PATTERN 4: PERIODIC REPORTS
 * Perfect for: Monthly reports, billing cycles, archiving
 * 
 * new Rule(backend.scheduledFunctionExample.resources.lambda.stack, 'MonthlyReport', {
 *   schedule: Schedule.cron({
 *     minute: '0',
 *     hour: '1',           // 1 AM UTC
 *     day: '1',            // First day of month
 *     month: '*',
 *     year: '*'
 *   }),
 *   description: 'Monthly report generation on 1st of each month',
 *   targets: [new LambdaFunction(backend.scheduledFunctionExample.resources.lambda)]
 * });
 * 
 * PATTERN 5: WEEKEND MAINTENANCE
 * Perfect for: Heavy processing, data cleanup, backups
 * 
 * new Rule(backend.scheduledFunctionExample.resources.lambda.stack, 'WeekendMaintenance', {
 *   schedule: Schedule.cron({
 *     minute: '0',
 *     hour: '3',           // 3 AM UTC
 *     day: '*',
 *     month: '*',
 *     year: '*',
 *     weekDay: 'SUN'       // Sunday only
 *   }),
 *   description: 'Weekly maintenance tasks every Sunday at 3 AM',
 *   targets: [new LambdaFunction(backend.scheduledFunctionExample.resources.lambda)]
 * });
 * 
 * PATTERN 6: ENVIRONMENT-SPECIFIC SCHEDULING
 * Perfect for: Different schedules per environment
 * 
 * // Conditional scheduling based on environment
 * const scheduleConfig = {
 *   dev: { minute: '*/5' },                    // Every 5 minutes in dev
 *   staging: { minute: '0', hour: '*/2' },     // Every 2 hours in staging  
 *   prod: { minute: '0', hour: '2' }           // Daily at 2 AM in prod
 * };
 * 
 * const currentSchedule = scheduleConfig[process.env.ENV as keyof typeof scheduleConfig] || scheduleConfig.dev;
 * 
 * new Rule(backend.scheduledFunctionExample.resources.lambda.stack, 'EnvironmentSync', {
 *   schedule: Schedule.cron(currentSchedule),
 *   description: `Environment-specific sync for ${process.env.ENV}`,
 *   targets: [new LambdaFunction(backend.scheduledFunctionExample.resources.lambda)]
 * });
 */

/**
 * ========================================================================
 * CRON EXPRESSION REFERENCE GUIDE
 * ========================================================================
 * 
 * CRON FORMAT: minute hour day month weekDay year
 * 
 * FIELD RANGES:
 * - minute:  0-59
 * - hour:    0-23 (24-hour format, UTC timezone)
 * - day:     1-31 (day of month)
 * - month:   1-12 or JAN-DEC
 * - weekDay: 1-7 or SUN-SAT (1 = Sunday, 7 = Saturday)
 * - year:    1970-2199
 * 
 * SPECIAL CHARACTERS:
 * - *  : All values (any)
 * - ?  : Any value (used for day or weekDay when the other is specified)
 * - -  : Range (e.g., 1-5 for Monday to Friday)
 * - ,  : List (e.g., 1,3,5 for Monday, Wednesday, Friday)
 * - /  : Interval (e.g., 0/15 for every 15 minutes starting at minute 0)
 * 
 * COMMON SCHEDULING PATTERNS:
 * 
 * DAILY SCHEDULES:
 * - Every day at midnight UTC:     { minute: '0', hour: '0' }
 * - Every day at 9 AM UTC:         { minute: '0', hour: '9' }
 * - Every day at 2:30 PM UTC:      { minute: '30', hour: '14' }
 * - Twice daily (6 AM & 6 PM):     { minute: '0', hour: '6,18' }
 * 
 * WEEKDAY SCHEDULES:
 * - Weekdays at 9 AM:              { minute: '0', hour: '9', weekDay: 'MON-FRI' }
 * - Weekends only at 8 AM:         { minute: '0', hour: '8', weekDay: 'SAT,SUN' }
 * - Every Tuesday at 10:15 AM:     { minute: '15', hour: '10', weekDay: 'TUE' }
 * 
 * HOURLY AND FREQUENT SCHEDULES:
 * - Every hour on the hour:        { minute: '0' }
 * - Every 30 minutes:              { minute: '0,30' }
 * - Every 15 minutes:              { minute: '0,15,30,45' }
 * - Business hours only (9-5):     { minute: '0', hour: '9-17', weekDay: 'MON-FRI' }
 * 
 * WEEKLY AND MONTHLY SCHEDULES:
 * - Every Sunday at 3 AM:          { minute: '0', hour: '3', weekDay: 'SUN' }
 * - First day of month at 1 AM:    { minute: '0', hour: '1', day: '1' }
 * - Last workday of month:         { minute: '0', hour: '2', day: '28-31', weekDay: 'MON-FRI' }
 * 
 * RATE EXPRESSIONS (Alternative to Cron):
 * - Every 5 minutes:               Schedule.rate(Duration.minutes(5))
 * - Every hour:                    Schedule.rate(Duration.hours(1))
 * - Every day:                     Schedule.rate(Duration.days(1))
 * 
 * TIMEZONE CONVERSION EXAMPLES:
 * If you want 9 AM Eastern Time:
 * - EST (UTC-5): Schedule at 14:00 UTC (9 AM + 5 hours)
 * - EDT (UTC-4): Schedule at 13:00 UTC (9 AM + 4 hours)
 * 
 * Pro tip: Use different schedules for different environments to avoid
 * conflicts and reduce costs in development.
 */

/**
 * ========================================================================
 * CONFIGURATION BEST PRACTICES
 * ========================================================================
 * 
 * 🎯 MEMORY AND TIMEOUT OPTIMIZATION:
 * 
 * Memory Guidelines:
 * - Light API calls (JSON processing):     512MB - 768MB
 * - Data transformation:                   1024MB - 1536MB  
 * - Heavy computations/large datasets:     2048MB - 3008MB
 * - Memory affects both CPU and cost - monitor CloudWatch metrics
 * 
 * Timeout Guidelines:
 * - Simple API sync:                       60-120 seconds
 * - Data processing:                       300-600 seconds
 * - Heavy batch operations:                600-900 seconds (Lambda max)
 * - Set timeout = expected runtime + 30% buffer
 * 
 * 🔐 IAM PERMISSIONS:
 * 
 * Automatic Permissions (no configuration needed):
 * - CloudWatch Logs (for console.log output)
 * - AppSync API access (for database operations via IAM auth)
 * - Environment variable access
 * 
 * Additional Permissions (configure in backend.ts if needed):
 * - S3 bucket access
 * - SES email sending
 * - Secrets Manager access
 * - Other AWS service integrations
 * 
 * 🚨 ERROR HANDLING STRATEGY:
 * 
 * Important: EventBridge does NOT retry failed executions by default
 * - Always implement error handling in your function code
 * - Use try/catch blocks around all operations
 * - Return HTTP status codes instead of throwing errors
 * - Store error details in database for monitoring
 * - Consider Dead Letter Queues for critical processes
 * - Set up CloudWatch alarms for failure monitoring
 * 
 * 💰 COST OPTIMIZATION STRATEGIES:
 * 
 * Scheduling Optimization:
 * - Run functions only as frequently as needed
 * - Use different schedules per environment (less frequent in dev)
 * - Consider business hours vs. 24/7 scheduling needs
 * 
 * Performance Optimization:
 * - Monitor CloudWatch metrics regularly
 * - Right-size memory allocation (more memory = faster execution)
 * - Optimize code efficiency to reduce runtime
 * - Use ARM-based Lambda (Graviton2) for compatible workloads
 * 
 * 🕒 TIMEZONE CONSIDERATIONS:
 * 
 * Critical Points:
 * - EventBridge ALWAYS uses UTC time
 * - Convert local times to UTC for accurate scheduling
 * - Account for Daylight Saving Time changes
 * - Document expected execution times in local timezone
 * - Test schedules thoroughly across timezone changes
 * 
 * Example: If you want 9 AM Eastern Time daily:
 * - Winter (EST): Use hour: '14' (9 AM + 5 hours)
 * - Summer (EDT): Use hour: '13' (9 AM + 4 hours)
 * - Or create conditional schedules based on time of year
 * 
 * 🧪 TESTING AND DEPLOYMENT:
 * 
 * Testing Strategy:
 * - Test functions manually using AWS Lambda console
 * - Create EventBridge test events matching the expected format
 * - Use different schedules for different environments
 * - Monitor CloudWatch logs during initial deployment
 * - Test error scenarios and recovery patterns
 * 
 * Environment-Specific Schedules:
 * - Dev: More frequent (every 5-15 minutes) for rapid testing
 * - Staging: Less frequent (hourly) to simulate production
 * - Production: Business-appropriate frequency
 * 
 * 📊 MONITORING AND OBSERVABILITY:
 * 
 * Key Metrics to Monitor:
 * - Invocation count and frequency
 * - Duration and timeout rates  
 * - Error rate and types
 * - Memory utilization
 * - Cold start frequency
 * 
 * CloudWatch Alarms to Set Up:
 * - Function error rate > 5%
 * - Average duration > expected baseline
 * - Function timeout occurrences
 * - Memory utilization > 90%
 * 
 * 🔧 DEBUGGING TIPS:
 * 
 * Common Issues:
 * - Function not triggering: Check EventBridge rule status and cron syntax
 * - Permission errors: Verify IAM roles and resource policies
 * - Timeout errors: Increase timeout or optimize code performance
 * - Memory errors: Monitor usage and increase allocation as needed
 * - External API failures: Implement retry logic and error handling
 */
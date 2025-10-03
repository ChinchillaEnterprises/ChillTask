import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * 🎉 Post-Confirmation Setup Trigger
 * 
 * This trigger runs after a user confirms their email/phone.
 * Use it to:
 * - Create user profiles
 * - Assign default groups/roles
 * - Send welcome emails
 * - Initialize user data
 * - Trigger onboarding workflows
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('Post-confirmation trigger:', JSON.stringify(event, null, 2));

  try {
    // 1. Create user profile in DynamoDB
    await createUserProfile(event);

    // 2. Assign to default group
    await assignDefaultGroup(event);

    // 3. Send welcome email
    await sendWelcomeEmail(event);

    // 4. Initialize user preferences
    await initializeUserPreferences(event);

    // 5. Track analytics
    await trackUserSignup(event);

    // 6. Trigger external integrations
    await notifyExternalSystems(event);

  } catch (error) {
    console.error('Error in post-confirmation:', error);
    // Don't throw - user is already confirmed
    // Log error for monitoring
  }

  return event;
};

async function createUserProfile(event: any) {
  const profile = {
    userId: event.request.userAttributes.sub,
    email: event.request.userAttributes.email,
    phoneNumber: event.request.userAttributes.phone_number,
    givenName: event.request.userAttributes.given_name,
    familyName: event.request.userAttributes.family_name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingCompleted: false,
    profileCompleted: false,
    preferences: {
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      theme: 'light',
      language: 'en',
    },
    metadata: {
      source: event.request.clientMetadata?.source || 'organic',
      campaign: event.request.clientMetadata?.campaign,
      referrer: event.request.clientMetadata?.referrer,
    },
  };

  await docClient.send(
    new PutCommand({
      TableName: process.env.USER_PROFILE_TABLE!,
      Item: profile,
    })
  );
}

async function assignDefaultGroup(event: any) {
  const defaultGroup = process.env.DEFAULT_USER_GROUP || 'Users';
  
  // Check if user has custom role from invitation
  const invitedRole = event.request.clientMetadata?.role;
  const groupName = invitedRole || defaultGroup;

  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: groupName,
    })
  );
}

async function sendWelcomeEmail(event: any) {
  const email = event.request.userAttributes.email;
  if (!email) return;

  const emailParams = {
    Source: process.env.SENDER_EMAIL || 'noreply@myapp.com',
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Welcome to MyApp! 🎉',
      },
      Body: {
        Html: {
          Data: `
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>Welcome ${event.request.userAttributes.given_name || 'there'}!</h1>
                <p>We're excited to have you on board.</p>
                
                <h2>Get Started:</h2>
                <ul>
                  <li><a href="${process.env.APP_URL}/onboarding">Complete your profile</a></li>
                  <li><a href="${process.env.APP_URL}/docs">Read our getting started guide</a></li>
                  <li><a href="${process.env.APP_URL}/support">Get help from support</a></li>
                </ul>
                
                <p>If you have any questions, just reply to this email!</p>
                
                <p>Best regards,<br>The MyApp Team</p>
              </body>
            </html>
          `,
        },
        Text: {
          Data: `Welcome ${event.request.userAttributes.given_name || 'there'}! 
          
We're excited to have you on board.

Get Started:
- Complete your profile: ${process.env.APP_URL}/onboarding
- Read our getting started guide: ${process.env.APP_URL}/docs
- Get help from support: ${process.env.APP_URL}/support

Best regards,
The MyApp Team`,
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(emailParams));
}

async function initializeUserPreferences(event: any) {
  // Create default workspace
  await docClient.send(
    new PutCommand({
      TableName: process.env.WORKSPACE_TABLE!,
      Item: {
        workspaceId: `ws_${event.request.userAttributes.sub}`,
        userId: event.request.userAttributes.sub,
        name: 'My Workspace',
        type: 'personal',
        createdAt: new Date().toISOString(),
        settings: {
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD',
        },
      },
    })
  );
}

async function trackUserSignup(event: any) {
  // Track in analytics system
  const analyticsEvent = {
    eventType: 'user_signup',
    userId: event.request.userAttributes.sub,
    timestamp: new Date().toISOString(),
    properties: {
      email: event.request.userAttributes.email,
      source: event.request.clientMetadata?.source || 'organic',
      campaign: event.request.clientMetadata?.campaign,
      triggerSource: event.triggerSource,
    },
  };

  // In real app, send to analytics service
  console.log('Analytics event:', analyticsEvent);
}

async function notifyExternalSystems(event: any) {
  // Example: Add to CRM
  if (process.env.CRM_WEBHOOK_URL) {
    await fetch(process.env.CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRM_API_KEY}`,
      },
      body: JSON.stringify({
        email: event.request.userAttributes.email,
        firstName: event.request.userAttributes.given_name,
        lastName: event.request.userAttributes.family_name,
        userId: event.request.userAttributes.sub,
        source: 'app_signup',
      }),
    });
  }

  // Example: Add to mailing list
  if (process.env.MAILCHIMP_API_KEY) {
    // Add to Mailchimp
  }

  // Example: Create Stripe customer
  if (process.env.STRIPE_SECRET_KEY) {
    // Create customer in Stripe
  }
}

/**
 * 🔑 KEY POINTS:
 * 
 * 1. DON'T throw errors - user is already confirmed
 * 2. Log errors for monitoring instead
 * 3. Make operations idempotent
 * 4. Use try-catch for each operation
 * 5. Consider using Step Functions for complex workflows
 * 
 * TRIGGER SOURCES:
 * - PostConfirmation_ConfirmSignUp: Regular signup
 * - PostConfirmation_ConfirmForgotPassword: After password reset
 * - PostConfirmation_AdminCreateUser: Admin-created user
 * 
 * AVAILABLE DATA:
 * - event.request.userAttributes: All user attributes
 * - event.request.clientMetadata: Custom data from client
 * - event.userPoolId: User pool ID
 * - event.userName: Username
 */
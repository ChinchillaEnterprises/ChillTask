import type { Schema } from '../../data/resource';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

export const handler: Schema['getGitHubBranches']['functionHandler'] = async (event) => {
  try {
    const { repoFullName } = event.arguments;

    if (!repoFullName) {
      throw new Error('repoFullName is required');
    }

    // Fetch GitHub token from Secrets Manager
    const secretResponse = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.GITHUB_SECRET_NAME,
      })
    );

    const secrets = JSON.parse(secretResponse.SecretString || '{}');
    const githubToken = secrets.GITHUB_TOKEN || secrets.token;

    if (!githubToken) {
      throw new Error('GitHub token not found in secrets');
    }

    // Call GitHub API to get branches for the specified repo
    // Example: repoFullName = "ChinchillaEnterprises/ChillTask"
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status} - ${response.statusText}`);
    }

    const branches = await response.json();

    // Transform branches to simple format for dropdown
    const transformedBranches = branches.map((branch: any) => ({
      name: branch.name,
      commitSha: branch.commit.sha,
      isProtected: branch.protected || false,
    }));

    return transformedBranches;
  } catch (error: any) {
    console.error('Error fetching GitHub branches:', error);
    throw new Error(`Failed to fetch GitHub branches: ${error.message}`);
  }
};

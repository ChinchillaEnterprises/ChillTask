import type { Schema } from '../../data/resource';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

export const handler: Schema['getGitHubRepos']['functionHandler'] = async (event) => {
  try {
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

    const org = process.env.GITHUB_ORG || 'ChinchillaEnterprises';

    // Call GitHub API to get list of repos
    const response = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status}`);
    }

    const repos = await response.json();

    // Transform repos to simple format for dropdown
    const transformedRepos = repos.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
    }));

    return transformedRepos;
  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error);
    throw new Error(`Failed to fetch GitHub repos: ${error.message}`);
  }
};

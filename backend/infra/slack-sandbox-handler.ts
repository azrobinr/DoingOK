import { App } from '@slack/bolt';
import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const docker = new Docker();

interface SandboxInstance {
  id: string;
  userId: string;
  channelId: string;
  apiContainer: Docker.Container;
  dbContainer: Docker.Container;
  startedAt: Date;
  apiUrl: string;
}

const activeSandboxes = new Map<string, SandboxInstance>();

// Command: /sandbox-start
slack.command('/sandbox-start', async ({ command, ack, say, respond }) => {
  await ack();

  const sandboxId = uuidv4().substring(0, 8);
  const userId = command.user_id;
  const channelId = command.channel_id;

  try {
    await respond({
      text: `🚀 Starting sandbox \`${sandboxId}\`...`,
      thread_ts: command.response_url,
    });

    // Create PostgreSQL container
    const dbContainer = await docker.createContainer({
      Image: 'postgres:16-alpine',
      name: `doingok-db-${sandboxId}`,
      Env: [
        'POSTGRES_USER=doingok',
        'POSTGRES_PASSWORD=doingok',
        'POSTGRES_DB=doingok',
      ],
      PortBindings: {
        '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '0' }],
      },
      HealthCheck: {
        Test: ['CMD-SHELL', 'pg_isready -U doingok'],
        Interval: 10000000000,
        Timeout: 5000000000,
        Retries: 5,
      },
    });

    await dbContainer.start();

    // Get allocated port
    const dbInfo = await dbContainer.inspect();
    const dbPort = dbInfo.NetworkSettings.Ports['5432/tcp'][0].HostPort;
    const dbUrl = `postgresql://doingok:doingok@localhost:${dbPort}/doingok`;

    // Create API container
    const apiContainer = await docker.createContainer({
      Image: 'doingok-api:latest',
      name: `doingok-api-${sandboxId}`,
      Env: [
        `DATABASE_URL=${dbUrl}`,
        'NODE_ENV=development',
        `JWT_SECRET=sandbox-${sandboxId}`,
      ],
      PortBindings: {
        '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: '0' }],
      },
      Links: [`doingok-db-${sandboxId}:postgres`],
    });

    await apiContainer.start();

    // Get allocated port
    const apiInfo = await apiContainer.inspect();
    const apiPort = apiInfo.NetworkSettings.Ports['3000/tcp'][0].HostPort;
    const apiUrl = `http://localhost:${apiPort}`;

    // Store sandbox reference
    const sandbox: SandboxInstance = {
      id: sandboxId,
      userId,
      channelId,
      apiContainer,
      dbContainer,
      startedAt: new Date(),
      apiUrl,
    };

    activeSandboxes.set(sandboxId, sandbox);

    // Notify user
    await slack.client.chat.postMessage({
      channel: channelId,
      thread_ts: command.response_url,
      text: `✅ Sandbox \`${sandboxId}\` is ready!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ Sandbox \`${sandboxId}\` is ready!\n\n*API URL:* <${apiUrl}|${apiUrl}>\n*Database:* \`localhost:${dbPort}\`\n*Started:* <!date^${Math.floor(new Date().getTime() / 1000)}^{date_num} {time_secs}|Just now>`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Destroy Sandbox',
              },
              value: sandboxId,
              action_id: 'destroy_sandbox',
              style: 'danger',
            },
          ],
        },
      ],
    });

    // Auto-cleanup after 2 hours
    setTimeout(() => destroySandbox(sandboxId), 2 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Failed to start sandbox:', error);
    await respond({
      text: `❌ Failed to start sandbox: ${error}`,
      thread_ts: command.response_url,
    });
  }
});

// Command: /sandbox-destroy
slack.command('/sandbox-destroy', async ({ command, ack, respond }) => {
  await ack();

  const sandboxId = command.text.trim();
  const sandbox = activeSandboxes.get(sandboxId);

  if (!sandbox) {
    await respond({
      text: `❌ Sandbox \`${sandboxId}\` not found`,
      thread_ts: command.response_url,
    });
    return;
  }

  try {
    await destroySandbox(sandboxId);
    await respond({
      text: `✅ Sandbox \`${sandboxId}\` destroyed`,
      thread_ts: command.response_url,
    });
  } catch (error) {
    await respond({
      text: `❌ Failed to destroy sandbox: ${error}`,
      thread_ts: command.response_url,
    });
  }
});

// Button action: Destroy Sandbox
slack.action('destroy_sandbox', async ({ body, ack }) => {
  await ack();

  const sandboxId = body.actions[0].value;
  try {
    await destroySandbox(sandboxId);

    await slack.client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: body.message.thread_ts,
      text: `✅ Sandbox \`${sandboxId}\` destroyed`,
    });
  } catch (error) {
    await slack.client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: body.message.thread_ts,
      text: `❌ Failed to destroy sandbox: ${error}`,
    });
  }
});

async function destroySandbox(sandboxId: string): Promise<void> {
  const sandbox = activeSandboxes.get(sandboxId);
  if (!sandbox) throw new Error(`Sandbox ${sandboxId} not found`);

  try {
    // Stop and remove containers
    await sandbox.apiContainer.stop().catch(() => {});
    await sandbox.dbContainer.stop().catch(() => {});
    await sandbox.apiContainer.remove().catch(() => {});
    await sandbox.dbContainer.remove().catch(() => {});

    activeSandboxes.delete(sandboxId);

    console.log(`Destroyed sandbox ${sandboxId}`);
  } catch (error) {
    console.error(`Error destroying sandbox ${sandboxId}:`, error);
    throw error;
  }
}

// List active sandboxes
slack.command('/sandbox-list', async ({ command, ack, respond }) => {
  await ack();

  if (activeSandboxes.size === 0) {
    await respond({
      text: 'No active sandboxes',
      thread_ts: command.response_url,
    });
    return;
  }

  const sandboxList = Array.from(activeSandboxes.entries())
    .map(
      ([id, sandbox]) =>
        `• \`${id}\` - Started by <@${sandbox.userId}> at ${sandbox.startedAt.toLocaleTimeString()}\n  API: <${sandbox.apiUrl}|${sandbox.apiUrl}>`
    )
    .join('\n');

  await respond({
    text: `*Active Sandboxes:*\n${sandboxList}`,
    thread_ts: command.response_url,
  });
});

export { slack };

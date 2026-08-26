import type { WebClient } from '@slack/web-api';
import { prisma } from '@slack-thread-cost/core';

/**
 * Ensures a Workspace row exists for the team the bot is installed in.
 * Called once at startup.
 */
export async function ensureWorkspace(client: WebClient): Promise<string> {
  const info = await client.team.info();
  const team = info.team;
  if (!team?.id) {
    throw new Error('Slack team.info did not return a team id — check bot token/permissions.');
  }

  const workspace = await prisma.workspace.upsert({
    where: { slackTeamId: team.id },
    update: { name: team.name ?? team.id },
    create: { slackTeamId: team.id, name: team.name ?? team.id },
  });

  return workspace.id;
}

/**
 * Upserts a Channel row for every public/private channel the bot is
 * currently a member of. Channel membership (i.e. `/invite`-ing the bot)
 * is the opt-in mechanism for tracking — this just mirrors that into the
 * DB. An optional TRACKED_CHANNELS allowlist narrows further.
 */
export async function syncTrackedChannels(
  client: WebClient,
  workspaceId: string,
  trackedChannelsEnv?: string
): Promise<Set<string>> {
  const allowlist = trackedChannelsEnv
    ? new Set(
        trackedChannelsEnv
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      )
    : null;

  const trackedSlackChannelIds = new Set<string>();
  let cursor: string | undefined;

  do {
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 200,
      cursor,
    });

    for (const channel of result.channels ?? []) {
      if (!channel.id || !channel.is_member) continue;
      if (allowlist && !allowlist.has(channel.id)) continue;

      await prisma.channel.upsert({
        where: { slackChannelId: channel.id },
        update: {
          name: channel.name ?? channel.id,
          isPrivate: Boolean(channel.is_private),
          isTracked: true,
        },
        create: {
          slackChannelId: channel.id,
          name: channel.name ?? channel.id,
          isPrivate: Boolean(channel.is_private),
          isTracked: true,
          workspaceId,
        },
      });

      trackedSlackChannelIds.add(channel.id);
    }

    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  console.log(
    `[channelRegistry] Tracking ${trackedSlackChannelIds.size} channel(s): ${
      trackedSlackChannelIds.size > 0 ? [...trackedSlackChannelIds].join(', ') : '(none — invite the bot to a channel)'
    }`
  );

  return trackedSlackChannelIds;
}

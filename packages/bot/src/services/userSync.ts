import type { WebClient } from '@slack/web-api';
import { prisma, StaffClassificationProvider } from '@slack-thread-cost/core';

/**
 * Pulls the workspace's user list from Slack and resolves each person's
 * classification via the active provider, caching the result on the User
 * row. Runs on startup and on a periodic timer — never per-message — so
 * message ingestion never blocks on a classification lookup.
 */
export async function syncUsers(
  client: WebClient,
  provider: StaffClassificationProvider
): Promise<void> {
  let cursor: string | undefined;
  let synced = 0;
  let unmapped = 0;

  do {
    const result = await client.users.list({ limit: 200, cursor });

    for (const member of result.members ?? []) {
      if (!member.id || member.deleted || member.is_bot || member.id === 'USLACKBOT') continue;

      const email = member.profile?.email;
      const classification = await provider.getClassification({
        slackUserId: member.id,
        email,
      });

      const classificationRecord = classification
        ? await prisma.classification.findUnique({ where: { code: classification.classificationCode } })
        : null;

      if (!classificationRecord) unmapped += 1;

      await prisma.user.upsert({
        where: { slackUserId: member.id },
        update: {
          displayName: member.profile?.display_name || member.name || member.id,
          realName: member.profile?.real_name,
          email,
          classificationId: classificationRecord?.id ?? null,
          classificationSource: classification?.source ?? null,
          lastSyncedAt: new Date(),
        },
        create: {
          slackUserId: member.id,
          displayName: member.profile?.display_name || member.name || member.id,
          realName: member.profile?.real_name,
          email,
          classificationId: classificationRecord?.id ?? null,
          classificationSource: classification?.source ?? null,
          lastSyncedAt: new Date(),
        },
      });

      synced += 1;
    }

    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  console.log(`[userSync] Synced ${synced} user(s), ${unmapped} unclassified.`);
}

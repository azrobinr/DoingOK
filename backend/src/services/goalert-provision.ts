// Best-effort GoAlert provisioning at registration.
//
// Creates the user's GoAlert service and stores the resulting integration key
// in users.goalert_service_key. Failures are logged and swallowed so a GoAlert
// outage never blocks account creation — the user can be re-provisioned later.

import { PrismaClient } from '@prisma/client';
import { GoAlertProvisioner } from './goalert.js';

export async function provisionGoAlertForUser(
  prisma: PrismaClient,
  provisioner: GoAlertProvisioner,
  userId: string
): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  try {
    const result = await provisioner.provisionUserService({
      userId: user.id,
      displayName: user.displayName || user.fullName,
    });
    if (!result) return null;

    await prisma.user.update({
      where: { id: userId },
      data: { goalertServiceKey: result.integrationKey },
    });
    return result.integrationKey;
  } catch (err) {
    console.error(`[goalert] provisioning failed for user ${userId}:`, err);
    return null;
  }
}

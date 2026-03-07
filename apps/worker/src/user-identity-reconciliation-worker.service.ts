import { loadWorkerEnv } from '@adottaungatto/config';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { IntervalWorkerTask } from './interval-worker-task';
import {
  UserIdentityReconciliationRepository,
  type ReconcileLinkedIdentityInput,
} from './user-identity-reconciliation.repository';
import { WorkerDistributedLockService } from './worker-distributed-lock.service';

const userIdentityReconciliationWorkerLockName = 'worker:user-identity-reconciliation';

interface KeycloakAdminUser {
  id?: string;
  email?: string;
}

interface KeycloakFederatedIdentity {
  identityProvider?: string;
  userId?: string;
  userName?: string;
}

const normalizeProviderAlias = (provider: string): string => provider.trim().toLowerCase();

const isProviderAlias = (provider: string): boolean =>
  /^[a-z0-9][a-z0-9_-]{0,62}$/.test(provider);

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export type UserIdentityReconciliationSummary = {
  scannedUsers: number;
  reconciledUsers: number;
  missingUsers: number;
  failedUsers: number;
  updatedEmails: number;
  upsertedLinkedIdentities: number;
  removedLinkedIdentities: number;
};

const emptySummary = (): UserIdentityReconciliationSummary => ({
  scannedUsers: 0,
  reconciledUsers: 0,
  missingUsers: 0,
  failedUsers: 0,
  updatedEmails: 0,
  upsertedLinkedIdentities: 0,
  removedLinkedIdentities: 0,
});

@Injectable()
export class UserIdentityReconciliationWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly env = loadWorkerEnv();
  private readonly logger = new Logger(UserIdentityReconciliationWorkerService.name);
  private readonly keycloakBaseUrl = this.env.KEYCLOAK_URL.replace(/\/$/, '');
  private reconciliationTask: IntervalWorkerTask | null = null;
  private processing = false;

  constructor(
    private readonly userIdentityReconciliationRepository: UserIdentityReconciliationRepository,
    private readonly workerDistributedLockService: WorkerDistributedLockService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.USER_IDENTITY_RECONCILIATION_ENABLED) {
      this.logger.log('User identity reconciliation worker is disabled.');
      return;
    }

    await this.runReconciliationCycleSafe();
    this.reconciliationTask = new IntervalWorkerTask(
      this.env.USER_IDENTITY_RECONCILIATION_POLL_MS,
      async () => {
        await this.runReconciliationCycleSafe();
      },
    );
    this.reconciliationTask.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.reconciliationTask?.stop();
    this.reconciliationTask = null;
  }

  async runReconciliationCycle(): Promise<UserIdentityReconciliationSummary> {
    if (!this.env.USER_IDENTITY_RECONCILIATION_ENABLED || this.processing) {
      return emptySummary();
    }

    this.processing = true;

    try {
      const execution = await this.workerDistributedLockService.runWithLock(
        userIdentityReconciliationWorkerLockName,
        async () => {
          const summary = emptySummary();
          const adminToken = await this.requestKeycloakAdminToken();

          if (!adminToken) {
            throw new Error('Keycloak admin integration is unavailable.');
          }

          let cursorUserDatabaseId: string | null = null;
          let processedBatches = 0;

          while (
            processedBatches < this.env.USER_IDENTITY_RECONCILIATION_MAX_BATCHES_PER_CYCLE
          ) {
            processedBatches += 1;

            const candidates =
              await this.userIdentityReconciliationRepository.listKeycloakUsersBatch(
                cursorUserDatabaseId,
                this.env.USER_IDENTITY_RECONCILIATION_BATCH_SIZE,
              );
            if (candidates.length === 0) {
              break;
            }

            for (const candidate of candidates) {
              summary.scannedUsers += 1;

              try {
                const keycloakUser = await this.fetchKeycloakUser(adminToken, candidate.keycloakUserId);
                if (!keycloakUser) {
                  summary.missingUsers += 1;
                  continue;
                }

                const resolvedEmail = normalizeText(keycloakUser.email) ?? candidate.currentEmail;
                const federatedIdentities = await this.fetchKeycloakFederatedIdentities(
                  adminToken,
                  candidate.keycloakUserId,
                );
                const linkedIdentities = this.mapFederatedIdentities(
                  federatedIdentities,
                  resolvedEmail,
                );

                const reconcileSummary =
                  await this.userIdentityReconciliationRepository.reconcileKeycloakUser({
                    userDatabaseId: candidate.userDatabaseId,
                    keycloakUserId: candidate.keycloakUserId,
                    email: resolvedEmail,
                    linkedIdentities,
                  });

                summary.reconciledUsers += 1;
                summary.updatedEmails += reconcileSummary.emailUpdated ? 1 : 0;
                summary.upsertedLinkedIdentities += reconcileSummary.upsertedLinkedIdentities;
                summary.removedLinkedIdentities += reconcileSummary.removedLinkedIdentities;
              } catch (error) {
                summary.failedUsers += 1;
                this.logger.warn(
                  `Identity reconciliation failed for user_id=${candidate.userDatabaseId} keycloak_id=${candidate.keycloakUserId} (${(error as Error).message}).`,
                );
              }
            }

            cursorUserDatabaseId = candidates[candidates.length - 1]?.userDatabaseId ?? null;
            if (candidates.length < this.env.USER_IDENTITY_RECONCILIATION_BATCH_SIZE) {
              break;
            }
          }

          if (summary.scannedUsers > 0) {
            this.logger.log(
              `Identity reconciliation scanned=${summary.scannedUsers} reconciled=${summary.reconciledUsers} missing=${summary.missingUsers} failed=${summary.failedUsers} email_updates=${summary.updatedEmails} linked_upserts=${summary.upsertedLinkedIdentities} linked_removed=${summary.removedLinkedIdentities}.`,
            );
          }

          return summary;
        },
      );

      if (!execution.acquired) {
        return emptySummary();
      }

      return execution.result ?? emptySummary();
    } finally {
      this.processing = false;
    }
  }

  private async runReconciliationCycleSafe(): Promise<void> {
    try {
      await this.runReconciliationCycle();
    } catch (error) {
      this.logger.warn(
        `User identity reconciliation cycle skipped (${(error as Error).message}).`,
      );
    }
  }

  private mapFederatedIdentities(
    identities: KeycloakFederatedIdentity[],
    fallbackEmailAtLink: string,
  ): ReconcileLinkedIdentityInput[] {
    const deduped = new Map<string, ReconcileLinkedIdentityInput>();

    for (const identity of identities) {
      const provider = normalizeProviderAlias(identity.identityProvider ?? '');
      const providerSubject = normalizeText(identity.userId);

      if (!isProviderAlias(provider) || providerSubject === null) {
        continue;
      }

      if (provider === 'keycloak' || provider === 'dev-header') {
        continue;
      }

      const emailAtLink = normalizeText(identity.userName) ?? fallbackEmailAtLink;
      const key = `${provider}:${providerSubject}`;
      deduped.set(key, {
        provider,
        providerSubject,
        emailAtLink,
      });
    }

    return Array.from(deduped.values());
  }

  private async requestKeycloakAdminToken(): Promise<string | null> {
    const tokenUrl = `${this.keycloakBaseUrl}/realms/${this.env.KEYCLOAK_ADMIN_REALM}/protocol/openid-connect/token`;
    const formData = new URLSearchParams();
    formData.set('grant_type', 'password');
    formData.set('client_id', this.env.KEYCLOAK_ADMIN_CLIENT_ID);
    formData.set('username', this.env.KEYCLOAK_ADMIN);
    formData.set('password', this.env.KEYCLOAK_ADMIN_PASSWORD);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { access_token?: string };
    return typeof payload.access_token === 'string' && payload.access_token.length > 0
      ? payload.access_token
      : null;
  }

  private async fetchKeycloakUser(
    accessToken: string,
    keycloakUserId: string,
  ): Promise<KeycloakAdminUser | null> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(
        keycloakUserId,
      )}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Unable to read Keycloak user (${response.status}).`);
    }

    const payload = (await response.json()) as unknown;
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return null;
    }

    const user = payload as KeycloakAdminUser;
    return {
      id: normalizeText(user.id) ?? keycloakUserId,
      email: normalizeText(user.email) ?? undefined,
    };
  }

  private async fetchKeycloakFederatedIdentities(
    accessToken: string,
    keycloakUserId: string,
  ): Promise<KeycloakFederatedIdentity[]> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(
        keycloakUserId,
      )}/federated-identity`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`Unable to read Keycloak federated identities (${response.status}).`);
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as KeycloakFederatedIdentity[]) : [];
  }
}

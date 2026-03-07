import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserIdentityReconciliationWorkerService } from './user-identity-reconciliation-worker.service';

describe('UserIdentityReconciliationWorkerService', () => {
  const repositoryMock = {
    listKeycloakUsersBatch: vi.fn(),
    reconcileKeycloakUser: vi.fn(),
  };
  const workerDistributedLockServiceMock = {
    runWithLock: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USER_IDENTITY_RECONCILIATION_ENABLED = 'true';
    process.env.USER_IDENTITY_RECONCILIATION_BATCH_SIZE = '100';
    process.env.USER_IDENTITY_RECONCILIATION_MAX_BATCHES_PER_CYCLE = '10';
    process.env.KEYCLOAK_URL = 'http://localhost:8080';
    process.env.KEYCLOAK_REALM = 'adottaungatto';
    process.env.KEYCLOAK_ADMIN_REALM = 'master';
    process.env.KEYCLOAK_ADMIN_CLIENT_ID = 'admin-cli';
    process.env.KEYCLOAK_ADMIN = 'admin';
    process.env.KEYCLOAK_ADMIN_PASSWORD = 'admin';

    workerDistributedLockServiceMock.runWithLock.mockImplementation(
      async (_lockName: string, task: () => Promise<unknown>) => ({
        acquired: true,
        result: await task(),
      }),
    );
    vi.stubGlobal('fetch', vi.fn());
  });

  it('reconciles keycloak users and linked identities', async () => {
    repositoryMock.listKeycloakUsersBatch.mockResolvedValueOnce([
      {
        userDatabaseId: '1',
        keycloakUserId: 'kc-user-1',
        currentEmail: 'old@example.test',
      },
    ]);
    repositoryMock.reconcileKeycloakUser.mockResolvedValueOnce({
      emailUpdated: true,
      upsertedLinkedIdentities: 2,
      removedLinkedIdentities: 1,
    });

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'token-value',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'kc-user-1',
          email: 'new@example.test',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            identityProvider: 'google',
            userId: 'google-subject-1',
            userName: 'google@example.test',
          },
        ],
      });

    const service = new UserIdentityReconciliationWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runReconciliationCycle();

    expect(summary).toEqual({
      scannedUsers: 1,
      reconciledUsers: 1,
      missingUsers: 0,
      failedUsers: 0,
      updatedEmails: 1,
      upsertedLinkedIdentities: 2,
      removedLinkedIdentities: 1,
    });

    expect(repositoryMock.reconcileKeycloakUser).toHaveBeenCalledWith({
      userDatabaseId: '1',
      keycloakUserId: 'kc-user-1',
      email: 'new@example.test',
      linkedIdentities: [
        {
          provider: 'google',
          providerSubject: 'google-subject-1',
          emailAtLink: 'google@example.test',
        },
      ],
    });
  });

  it('skips reconciliation when worker is disabled', async () => {
    process.env.USER_IDENTITY_RECONCILIATION_ENABLED = 'false';

    const service = new UserIdentityReconciliationWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runReconciliationCycle();

    expect(summary).toEqual({
      scannedUsers: 0,
      reconciledUsers: 0,
      missingUsers: 0,
      failedUsers: 0,
      updatedEmails: 0,
      upsertedLinkedIdentities: 0,
      removedLinkedIdentities: 0,
    });
    expect(workerDistributedLockServiceMock.runWithLock).not.toHaveBeenCalled();
  });

  it('skips reconciliation when distributed lock is not acquired', async () => {
    workerDistributedLockServiceMock.runWithLock.mockResolvedValueOnce({
      acquired: false,
    });

    const service = new UserIdentityReconciliationWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runReconciliationCycle();

    expect(summary).toEqual({
      scannedUsers: 0,
      reconciledUsers: 0,
      missingUsers: 0,
      failedUsers: 0,
      updatedEmails: 0,
      upsertedLinkedIdentities: 0,
      removedLinkedIdentities: 0,
    });
    expect(repositoryMock.listKeycloakUsersBatch).not.toHaveBeenCalled();
  });

  it('tracks missing users and continues on per-user failures', async () => {
    repositoryMock.listKeycloakUsersBatch.mockResolvedValueOnce([
      {
        userDatabaseId: '11',
        keycloakUserId: 'kc-missing',
        currentEmail: 'missing@example.test',
      },
      {
        userDatabaseId: '12',
        keycloakUserId: 'kc-failing',
        currentEmail: 'failing@example.test',
      },
    ]);

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'token-value',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'kc-failing',
          email: 'updated@example.test',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

    const service = new UserIdentityReconciliationWorkerService(
      repositoryMock as never,
      workerDistributedLockServiceMock as never,
    );
    const summary = await service.runReconciliationCycle();

    expect(summary).toEqual({
      scannedUsers: 2,
      reconciledUsers: 0,
      missingUsers: 1,
      failedUsers: 1,
      updatedEmails: 0,
      upsertedLinkedIdentities: 0,
      removedLinkedIdentities: 0,
    });
    expect(repositoryMock.reconcileKeycloakUser).not.toHaveBeenCalled();
  });
});

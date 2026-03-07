import { Badge } from '@adottaungatto/ui';
import type { ReactNode } from 'react';
import { getWebSession } from '../lib/auth';
import { fetchMyProfile } from '../lib/users';
import { LinkButton } from './link-button';
import { PageShell } from './page-shell';
import { WorkspaceSubnav } from './workspace-subnav';

interface WorkspacePageShellProps {
  aside?: ReactNode;
  children?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
  titleExtra?: ReactNode;
}

const resolveWorkspaceAccountLabel = (
  profile: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null,
): string | null => {
  const displayName = profile?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const fullName = [profile?.firstName, profile?.lastName]
    .map((item) => item?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) {
    return fullName;
  }

  return null;
};

export async function WorkspacePageShell({
  aside,
  children,
  description,
  eyebrow,
  title,
  titleExtra,
}: WorkspacePageShellProps) {
  const session = await getWebSession().catch(() => null);
  const emailVerified = session?.user.emailVerified === true;
  const profile = session ? await fetchMyProfile().catch(() => null) : null;
  const workspaceAccountLabel = resolveWorkspaceAccountLabel(profile);

  return (
    <div className="space-y-6">
      <WorkspaceSubnav accountLabel={workspaceAccountLabel} />
      {!emailVerified ? (
        <section className="rounded-3xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-4 shadow-[var(--shadow-sm)] sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning">Verifica email richiesta</Badge>
              </div>
              <p className="text-sm text-[var(--color-text)]">
                Completa la verifica dell indirizzo email per finalizzare onboarding e sicurezza del
                tuo account.
              </p>
            </div>
            <LinkButton href="/verifica-account" variant="outline">
              Verifica account
            </LinkButton>
          </div>
        </section>
      ) : null}
      <PageShell
        aside={aside}
        description={description}
        eyebrow={eyebrow}
        title={title}
        titleExtra={titleExtra}
      >
        {children}
      </PageShell>
    </div>
  );
}

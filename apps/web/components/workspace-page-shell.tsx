import type { ReactNode } from 'react';
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

export function WorkspacePageShell({
  aside,
  children,
  description,
  eyebrow,
  title,
  titleExtra,
}: WorkspacePageShellProps) {
  return (
    <div className="space-y-6">
      <WorkspaceSubnav />
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

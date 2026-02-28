import { Card, CardContent, CardHeader, CardTitle } from '@adottaungatto/ui';
import type { ReactNode } from 'react';
import { PageShell } from './page-shell';

const defaultIntegrations = [
  'Route e metadata Next.js gia predisposte.',
  'Theme provider e motion centralizzato gia collegati.',
  'UI condivisa pronta per essere riusata nel rebuild.',
];

const defaultNextSteps = [
  'Reintrodurre solo le feature davvero necessarie.',
  'Spingere componenti comuni nella shared UI invece di ricreare view ad hoc.',
  'Riagganciare API specifiche solo quando il nuovo flusso e definito.',
];

interface ScaffoldPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  integrations?: string[];
  nextSteps?: string[];
  actions?: ReactNode;
}

export function ScaffoldPlaceholder({
  eyebrow,
  title,
  description,
  route,
  integrations = defaultIntegrations,
  nextSteps = defaultNextSteps,
  actions,
}: ScaffoldPlaceholderProps) {
  return (
    <PageShell
      aside={
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Route preservata
            </p>
            <p className="text-sm font-medium text-[var(--color-text)]">{route}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              La feature e stata rimossa per ripartire da una base pulita.
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      }
      description={description}
      eyebrow={eyebrow}
      title={title}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resta attivo</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {integrations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Da ricostruire</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {nextSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

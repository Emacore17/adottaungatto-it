import { LinkButton } from '../../../components/link-button';
import { ScaffoldPlaceholder } from '../../../components/scaffold-placeholder';
import { requireWebSession } from '../../../lib/auth';

interface MessageThreadPageProps {
  params: Promise<{
    threadId: string;
  }>;
}

export default async function MessageThreadPage({ params }: MessageThreadPageProps) {
  const { threadId } = await params;
  await requireWebSession(`/messaggi/${threadId}`);

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/messaggi" variant="outline">
          Torna ai messaggi
        </LinkButton>
      }
      description={`Il thread ${threadId} resta indirizzabile, ma la UI conversazionale e stata rimossa insieme allo store mock locale.`}
      eyebrow="Area riservata"
      integrations={[
        'Protezione route via requireWebSession().',
        'Routing dinamico Next.js gia pronto per una futura thread view.',
      ]}
      nextSteps={['Ricostruire inbox, thread detail e composer come flussi separati.']}
      route={`/messaggi/${threadId}`}
      title="Dettaglio thread"
    />
  );
}

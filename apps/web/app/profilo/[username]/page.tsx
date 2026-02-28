import { LinkButton } from '../../../components/link-button';
import { ScaffoldPlaceholder } from '../../../components/scaffold-placeholder';

interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/annunci" variant="outline">
          Torna agli annunci
        </LinkButton>
      }
      description={`La route pubblica del profilo @${username} resta disponibile, ma il vecchio profilo mock e stato rimosso.`}
      eyebrow="Profilo pubblico"
      integrations={['Routing dinamico gia predisposto per profili e vanity URL.']}
      nextSteps={[
        'Definire schema profilo, reputazione e annunci collegati solo dopo il redesign.',
      ]}
      route={`/profilo/${username}`}
      title={`Profilo di ${username}`}
    />
  );
}

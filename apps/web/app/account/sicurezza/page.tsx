import { LinkButton } from '../../../components/link-button';
import { ScaffoldPlaceholder } from '../../../components/scaffold-placeholder';
import { requireWebSession } from '../../../lib/auth';

export default async function AccountSecurityPage() {
  await requireWebSession('/account/sicurezza');

  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/account" variant="outline">
          Torna alla dashboard
        </LinkButton>
      }
      description="La sicurezza account verra ricostruita come area dedicata, senza portarsi dietro placeholder della vecchia interfaccia."
      eyebrow="Account"
      integrations={[
        'Protezione route via sessione server-side.',
        'Logout gia collegato alle route auth del frontend.',
      ]}
      nextSteps={[
        'Definire password, session management e future estensioni in pagine separate.',
        'Aggiungere telemetria e messaggi di sicurezza solo dopo il redesign.',
      ]}
      route="/account/sicurezza"
      title="Sicurezza account"
    />
  );
}

import { LinkButton } from '../../components/link-button';
import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function RegisterPage() {
  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/login" variant="outline">
          Vai al login
        </LinkButton>
      }
      description="La registrazione verra ridisegnata sopra il nuovo scaffold. La route resta disponibile per non perdere il percorso di navigazione."
      eyebrow="Autenticazione"
      nextSteps={['Definire sign up, verifica e onboarding nel nuovo perimetro auth.']}
      route="/registrati"
      title="Registrazione"
    />
  );
}

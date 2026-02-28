import { LinkButton } from '../../components/link-button';
import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function ForgotPasswordPage() {
  return (
    <ScaffoldPlaceholder
      actions={
        <LinkButton href="/login" variant="outline">
          Torna al login
        </LinkButton>
      }
      description="Il recupero password verra reintrodotto solo dopo aver ridefinito l'intero perimetro auth del nuovo frontend."
      eyebrow="Autenticazione"
      nextSteps={['Decidere UX, copy e dipendenze backend del reset password.']}
      route="/password-dimenticata"
      title="Password dimenticata"
    />
  );
}

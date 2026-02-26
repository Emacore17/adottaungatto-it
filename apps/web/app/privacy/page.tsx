import { StaticPage } from '../../components/static-page';

export default function PrivacyPage() {
  return (
    <StaticPage subtitle="Informativa trattamento dati personali." title="Privacy">
      <p>Raccogliamo solo i dati necessari per autenticazione, gestione annunci e sicurezza.</p>
      <p>I dati non vengono ceduti a terzi fuori dai casi previsti da legge o policy operative.</p>
      <p>
        Puoi richiedere accesso, rettifica o cancellazione dati tramite il modulo contatti dedicato.
      </p>
    </StaticPage>
  );
}

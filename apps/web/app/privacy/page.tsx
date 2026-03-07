import { Breadcrumbs } from '../../components/breadcrumbs';
import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';
import { getWebSession } from '../../lib/auth';

const accountSettingsPath = '/account/impostazioni';

export default async function PrivacyPage() {
  const session = await getWebSession().catch(() => null);
  const managePreferencesHref = session
    ? accountSettingsPath
    : `/login?next=${encodeURIComponent(accountSettingsPath)}`;
  const managePreferencesLabel = session ? 'Gestisci preferenze' : 'Accedi per gestire preferenze';

  return (
    <ContentPage
      actions={
        <>
          <LinkButton href={managePreferencesHref}>{managePreferencesLabel}</LinkButton>
          <LinkButton href="/contatti" variant="outline">
            Supporto
          </LinkButton>
        </>
      }
      breadcrumbs={<Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Privacy' }]} />}
      asideDescription="Questa pagina riassume in modo semplice quali dati entrano in gioco nelle funzioni attive del sito."
      badges={[
        { label: 'Trasparenza', variant: 'secondary' },
        { label: 'Solo funzioni utili', variant: 'outline' },
      ]}
      description="Un riepilogo operativo su account, annunci, messaggi e preferenze, pensato per capire subito dove finiscono i dati che inserisci."
      eyebrow="Privacy"
      highlights={[
        { label: 'Account', value: 'Email, ruoli e sessione' },
        { label: 'Annunci', value: 'Scheda pubblica e recapiti inseriti da te' },
        { label: 'Messaggi', value: 'Inbox privata e notifiche configurabili' },
      ]}
      sections={[
        {
          title: 'Dati di account',
          items: [
            'Le informazioni di accesso servono per autenticarti e sbloccare il workspace personale.',
            'L email del tuo account viene usata anche per mostrarti e aggiornarti sulle notifiche dei messaggi, quando abilitate.',
            'Le route private restano protette dalla sessione attiva e vengono nascoste quando non sei autenticato.',
          ],
        },
        {
          title: 'Annunci e recapiti',
          items: [
            'I dati che inserisci in un annuncio vengono usati per costruire la scheda pubblica e facilitare il contatto.',
            'Titolo, descrizione, localita, foto e recapiti servono a dare contesto a chi visita il profilo del gatto.',
            'Le informazioni devono restare accurate e aggiornate, cosi da evitare richieste inutili o fuori contesto.',
          ],
        },
        {
          title: 'Messaggi e notifiche',
          items: [
            'Le conversazioni private restano nella tua inbox per permetterti di seguire lo storico dei contatti.',
            'Puoi scegliere se ricevere o meno notifiche email per i nuovi messaggi dalla pagina impostazioni.',
            'La chat interna e il canale consigliato per parlare di un annuncio senza disperdere il contesto.',
          ],
        },
        {
          title: 'Controlli disponibili oggi',
          items: [
            'Puoi fare logout in qualsiasi momento dalle aree riservate o dalla testata del sito.',
            'Le preferenze di notifica messaggi sono modificabili direttamente dal tuo account.',
            session
              ? 'Hai accesso diretto alla gestione dei consensi e delle preferenze dalla pagina impostazioni.'
              : 'Per gestire consensi e preferenze del tuo account devi prima accedere; dopo il login verrai portato direttamente nelle impostazioni.',
            'I preferiti vengono sincronizzati sul tuo account (con fallback locale per utenti non autenticati) insieme alle preferenze di esperienza leggere.',
          ],
        },
      ]}
      title="Privacy e dati"
    />
  );
}

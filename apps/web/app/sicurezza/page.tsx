import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function SecurityPage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/login">Accedi</LinkButton>
          <LinkButton href="/account/sicurezza" variant="outline">
            Area sicurezza account
          </LinkButton>
        </>
      }
      asideDescription="La sicurezza qui significa soprattutto percorsi chiari, accessi protetti e contatti che restano dentro il contesto giusto."
      badges={[
        { label: 'Accesso protetto', variant: 'secondary' },
        { label: 'Messaggi interni', variant: 'outline' },
      ]}
      description="Linee guida pratiche su come tenere ordinato il tuo account, usare la chat in modo corretto e ridurre la condivisione superflua di dati."
      eyebrow="Sicurezza"
      highlights={[
        { label: 'Accesso', value: 'Route private disponibili solo con sessione attiva' },
        { label: 'Chat', value: 'Conversazioni collegate agli annunci' },
        { label: 'Controllo', value: 'Logout e preferenze dal workspace personale' },
      ]}
      sections={[
        {
          title: 'Protezione dell accesso',
          items: [
            'Le aree account, messaggi e pubblicazione richiedono autenticazione e non restano visibili a chi non e loggato.',
            'Quando hai finito di usare il sito, il logout e il modo piu semplice per chiudere correttamente la sessione.',
            'Se stai usando un dispositivo condiviso, evita di lasciare aperto il workspace personale.',
          ],
        },
        {
          title: 'Messaggi e dati personali',
          items: [
            'La chat privata e preferibile a canali esterni perche mantiene il contesto dell annuncio e riduce dispersione.',
            'Condividi solo i dati davvero necessari alla conversazione e rimanda le informazioni piu sensibili al momento opportuno.',
            'Messaggi chiari, contestuali e ordinati aiutano anche a riconoscere piu facilmente richieste sospette o fuori tema.',
          ],
        },
        {
          title: 'Annunci affidabili',
          items: [
            'Schede complete, localita corrette e foto leggibili migliorano fiducia e riducono domande inutili.',
            'Aggiorna lo stato dei tuoi annunci dal workspace per evitare contatti su profili non piu disponibili.',
            'Recapiti e contenuti dovrebbero essere sempre coerenti con la persona o organizzazione che pubblica.',
          ],
        },
        {
          title: 'Azioni rapide disponibili',
          items: [
            'Dalle impostazioni puoi gestire le notifiche email dei messaggi.',
            'Dalla pagina sicurezza account trovi il riepilogo dei controlli essenziali gia disponibili.',
            'Se un problema riguarda il funzionamento generale del sito, parti dai contatti o dalla pagina di manutenzione.',
          ],
        },
      ]}
      title="Sicurezza del sito e buone pratiche"
    />
  );
}

import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function ContactsPage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/faq">Apri le FAQ</LinkButton>
          <LinkButton href="/annunci" variant="outline">
            Vai agli annunci
          </LinkButton>
        </>
      }
      asideDescription="Il canale migliore dipende da cosa devi fare: annuncio, account, pubblicazione o supporto generale."
      badges={[
        { label: 'Supporto orientato al task', variant: 'secondary' },
        { label: 'Risposte piu rapide', variant: 'outline' },
      ]}
      description="Invece di un contatto generico, trovi qui il percorso piu diretto per arrivare alla risposta giusta con meno passaggi."
      eyebrow="Contatti"
      highlights={[
        { label: 'Annunci', value: 'Usa il dettaglio annuncio o la chat privata' },
        { label: 'Account', value: 'Login, preferenze e sicurezza in area riservata' },
        { label: 'Pubblicazione', value: 'Editor guidato con accesso rapido ai tuoi annunci' },
      ]}
      sections={[
        {
          title: 'Per un annuncio specifico',
          description:
            "Se vuoi chiedere informazioni su un gatto, usa sempre il dettaglio dell'annuncio o la conversazione privata collegata.",
          body: (
            <p>
              E il percorso piu veloce per parlare con l&apos;inserzionista, mantenere uno storico dei
              messaggi e non perdere il contesto del profilo che ti interessa.
            </p>
          ),
          footer: (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/annunci">Cerca un annuncio</LinkButton>
              <LinkButton href="/messaggi" variant="outline">
                Apri i messaggi
              </LinkButton>
            </div>
          ),
        },
        {
          title: 'Per il tuo account',
          description:
            'Se il problema riguarda accesso, preferenze o area riservata, parti dai percorsi account gia disponibili.',
          items: [
            'Accedi dal login per entrare nel workspace e consultare le aree riservate.',
            'Dalle impostazioni puoi gestire le notifiche email della messaggistica.',
            'La pagina sicurezza raccoglie le azioni essenziali per mantenere ordinato il tuo accesso.',
          ],
          footer: (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/login">Accedi</LinkButton>
              <LinkButton href="/account/impostazioni" variant="outline">
                Impostazioni
              </LinkButton>
            </div>
          ),
        },
        {
          title: 'Per pubblicare o modificare',
          description:
            'Se devi creare un nuovo annuncio, aggiornare foto o rivedere i dati, entra direttamente nel flusso di pubblicazione.',
          items: [
            'Lo spazio di editing e organizzato per sezioni, con accessi rapidi anche da mobile.',
            'Dopo il salvataggio puoi tornare ai tuoi annunci per controllare lo stato e continuare a lavorare.',
          ],
          footer: (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/pubblica">Pubblica</LinkButton>
              <LinkButton href="/account/annunci" variant="outline">
                I miei annunci
              </LinkButton>
            </div>
          ),
        },
        {
          title: 'Per supporto generale',
          description:
            'Stiamo concentrando la piattaforma su percorsi piu chiari e per questo partiamo dalle route che risolvono il problema nel punto giusto.',
          items: [
            'Consulta le FAQ per i dubbi piu frequenti su annunci, messaggi, preferiti e pubblicazione.',
            'Se una sezione non e momentaneamente disponibile, la pagina di manutenzione viene usata come punto di aggiornamento.',
          ],
          footer: (
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/faq">FAQ</LinkButton>
              <LinkButton href="/maintenance" variant="outline">
                Stato manutenzione
              </LinkButton>
            </div>
          ),
        },
      ]}
      title="Contatti e supporto"
    />
  );
}

import { ContentPage } from '../../components/content-page';
import { LinkButton } from '../../components/link-button';

export default function AboutPage() {
  return (
    <ContentPage
      actions={
        <>
          <LinkButton href="/annunci">Esplora annunci</LinkButton>
          <LinkButton href="/pubblica" variant="outline">
            Pubblica un annuncio
          </LinkButton>
        </>
      }
      asideDescription="Adotta un Gatto mette al centro schede chiare, contatti semplici e percorsi puliti sia da mobile sia da desktop."
      badges={[
        { label: 'Piattaforma verticale', variant: 'secondary' },
        { label: 'Mobile-first', variant: 'outline' },
      ]}
      description="Un ambiente dedicato ad adozioni, stalli e segnalazioni che riduce il rumore e fa emergere le informazioni davvero utili."
      eyebrow="Chi siamo"
      highlights={[
        { label: 'Ricerca', value: 'Filtri rapidi per luogo e tipologia' },
        { label: 'Contatto', value: 'Messaggi privati direttamente dagli annunci' },
        { label: 'Gestione', value: 'Workspace essenziale per account e pubblicazioni' },
      ]}
      sections={[
        {
          title: 'Perche esistiamo',
          items: [
            'Vogliamo rendere piu semplice trovare un gatto da accogliere o dare visibilita a un annuncio urgente.',
            'Riduciamo testi dispersivi, interfacce rumorose e passaggi inutili prima del primo contatto.',
            'Ogni pagina e progettata per far capire subito cosa fare, dove cliccare e quali informazioni contano davvero.',
          ],
        },
        {
          title: 'Come funziona',
          items: [
            'Puoi esplorare il catalogo pubblico, filtrare per localita e tipologia, e aprire i dettagli di ogni annuncio.',
            'Chi ha un account puo pubblicare, modificare i propri annunci e gestire le conversazioni in una inbox dedicata.',
            'I preferiti restano rapidi da usare e ti permettono di ritrovare gli annunci salvati senza ricominciare da zero.',
          ],
        },
        {
          title: 'Cosa curiamo di piu',
          items: [
            'Gerarchia visiva chiara: titolo, luogo, stato e CTA principali sempre leggibili.',
            'Esperienza coerente tra mobile e desktop, con touch target comodi e navigazione essenziale.',
            'Microcopy breve e concreto, senza testi interni al progetto o schermate che sembrano provvisorie.',
          ],
        },
        {
          title: 'A chi si rivolge',
          items: [
            'A chi cerca un gatto da adottare in modo piu consapevole e vicino al proprio territorio.',
            'A volontari, associazioni e privati che hanno bisogno di una scheda ordinata e semplice da aggiornare.',
            'A chi vuole seguire messaggi e preferiti in un workspace pulito, senza funzioni duplicate.',
          ],
        },
      ]}
      title="Un sito costruito per far incontrare annunci e persone nel modo piu chiaro possibile"
    />
  );
}

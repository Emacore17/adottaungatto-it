import { StaticPage } from '../../components/static-page';

export default function FaqPage() {
  return (
    <StaticPage subtitle="Domande frequenti su annunci, sicurezza e moderazione." title="FAQ">
      <div>
        <p className="font-semibold text-[var(--color-text)]">Come pubblico un annuncio?</p>
        <p>Vai su Pubblica annuncio, completa il wizard e invia in moderazione.</p>
      </div>
      <div>
        <p className="font-semibold text-[var(--color-text)]">Posso usare la piattaforma gratis?</p>
        <p>
          Si, la navigazione e la maggior parte delle funzionalita sono disponibili senza costi.
        </p>
      </div>
      <div>
        <p className="font-semibold text-[var(--color-text)]">
          Come segnalo un comportamento sospetto?
        </p>
        <p>Nel dettaglio annuncio trovi il pulsante Segnala annuncio e la guida sicurezza.</p>
      </div>
    </StaticPage>
  );
}

import { StaticPage } from '../../components/static-page';

export default function AboutPage() {
  return (
    <StaticPage
      subtitle="Marketplace italiano dedicato a adozioni, stalli e segnalazioni feline."
      title="Chi siamo"
    >
      <p>
        adottaungatto.it nasce per rendere il matching tra famiglie e inserzionisti affidabili più
        trasparente, con UX moderna e policy anti-truffa integrate.
      </p>
      <p>
        Lavoriamo con volontari, rescue e privati verificati per offrire un ecosistema premium ma
        concreto, orientato alla sicurezza degli animali.
      </p>
    </StaticPage>
  );
}

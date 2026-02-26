import { StaticPage } from '../../components/static-page';

export default function CookiePage() {
  return (
    <StaticPage subtitle="Informazioni su cookie tecnici, analitici e preferenze." title="Cookie">
      <p>Usiamo cookie tecnici per login, sessione e preferenze interfaccia (tema, filtri).</p>
      <p>
        Cookie analitici aggregati possono essere attivati per migliorare performance e usabilita
        della piattaforma.
      </p>
      <p>Puoi gestire le preferenze dal browser o dalle impostazioni account.</p>
    </StaticPage>
  );
}

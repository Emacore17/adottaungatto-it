import { ScaffoldPlaceholder } from '../../components/scaffold-placeholder';

export default function FaqPage() {
  return (
    <ScaffoldPlaceholder
      description="Le FAQ esistenti sono state rimosse per evitare contenuti scollegati da un prodotto che verra ridisegnato."
      eyebrow="Supporto"
      nextSteps={[
        'Scrivere FAQ solo a partire dai nuovi flussi effettivi.',
        'Separare chiaramente temi pubblici, account e moderazione.',
      ]}
      route="/faq"
      title="FAQ"
    />
  );
}

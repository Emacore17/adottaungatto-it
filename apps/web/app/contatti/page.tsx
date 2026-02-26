import { Button, Input } from '@adottaungatto/ui';
import { StaticPage } from '../../components/static-page';

export default function ContactsPage() {
  return (
    <StaticPage
      subtitle="Scrivici per supporto tecnico, moderazione o partnership."
      title="Contatti"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2" htmlFor="contact-form-name">
          <span className="text-xs font-medium text-[var(--color-text)]">Nome</span>
          <Input id="contact-form-name" />
        </label>
        <label className="space-y-2" htmlFor="contact-form-email">
          <span className="text-xs font-medium text-[var(--color-text)]">Email</span>
          <Input id="contact-form-email" type="email" />
        </label>
        <label className="space-y-2 sm:col-span-2" htmlFor="contact-form-message">
          <span className="text-xs font-medium text-[var(--color-text)]">Messaggio</span>
          <textarea
            className="min-h-32 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            id="contact-form-message"
          />
        </label>
      </div>
      <Button type="button">Invia richiesta (mock)</Button>
    </StaticPage>
  );
}

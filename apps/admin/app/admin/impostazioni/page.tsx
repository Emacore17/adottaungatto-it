import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@adottaungatto/ui';

export default function AdminSettingsPage() {
  return (
    <main className="space-y-4">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle>Impostazioni piattaforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <p>Cataloghi e policy configurabili. UI completa in attesa endpoint amministrativi.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2" htmlFor="report-threshold">
              <span className="text-xs font-medium text-[var(--color-text)]">
                Soglia report automatica
              </span>
              <Input defaultValue="3" id="report-threshold" />
            </label>
            <label className="space-y-2" htmlFor="max-media">
              <span className="text-xs font-medium text-[var(--color-text)]">
                Max media per annuncio
              </span>
              <Input defaultValue="12" id="max-media" />
            </label>
            <label className="space-y-2 md:col-span-2" htmlFor="policy-anti-fraud">
              <span className="text-xs font-medium text-[var(--color-text)]">
                Policy anti-truffa
              </span>
              <textarea
                id="policy-anti-fraud"
                className="min-h-28 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
                defaultValue="Richiedere verifica manuale per annunci con contatti esterni sospetti."
              />
            </label>
          </div>
          <Button type="button">Salva impostazioni (mock)</Button>
        </CardContent>
      </Card>
    </main>
  );
}

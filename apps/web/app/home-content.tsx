'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@adottaungatto/ui';
import { motion } from 'framer-motion';

export function HomeContent() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full"
      >
        <Card className="border-slate-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="success">web up</Badge>
              <Badge variant="outline">M0 bootstrap</Badge>
            </div>
            <CardTitle>adottaungatto-it: Web</CardTitle>
            <CardDescription>
              App pubblica avviata correttamente. Prossimo step: M1 auth + geografia italiana.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button>Inizia</Button>
            <Button variant="secondary">Esplora annunci</Button>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

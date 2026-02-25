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

export function AdminHomeContent() {
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
              <Badge variant="success">admin up</Badge>
              <Badge variant="outline">accesso separato</Badge>
            </div>
            <CardTitle>adottaungatto-it: Admin</CardTitle>
            <CardDescription>
              App di moderazione separata pronta per i task RBAC e review annunci (M1/M2).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button>Apri moderazione</Button>
            <Button variant="secondary">Vai agli audit</Button>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

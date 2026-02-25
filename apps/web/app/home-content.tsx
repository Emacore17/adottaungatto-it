'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  motionPresets,
} from '@adottaungatto/ui';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { LazyLocationSelector } from '../components/lazy-location-selector';
import type { LocationValue } from '../components/location-selector';

const emptyLocation: LocationValue = null;

export function HomeContent() {
  const router = useRouter();
  const [location, setLocation] = useState<LocationValue>(emptyLocation);

  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002', []);

  const handleLocationChange = useCallback((nextValue: LocationValue) => {
    setLocation(nextValue);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-start px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        animate={motionPresets.sectionEnter.animate}
        initial={motionPresets.sectionEnter.initial}
        transition={motionPresets.sectionEnter.transition}
        className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <Card className="border-slate-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="success">web up</Badge>
              <Badge variant="outline">M0 bootstrap</Badge>
            </div>
            <CardTitle>adottaungatto-it: Web</CardTitle>
            <CardDescription>
              App pubblica avviata correttamente. Login utente attivo via Keycloak locale.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                router.push('/annunci');
              }}
              variant="outline"
            >
              Esplora annunci
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                router.push('/login');
              }}
            >
              Login
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                router.push('/account');
              }}
              variant="secondary"
            >
              Area utente
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-300/60 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">M1.7</Badge>
              <Badge variant="secondary">Geography UI</Badge>
            </div>
            <CardTitle>Selezione luogo</CardTitle>
            <CardDescription>
              Input search semantico con suggerimenti disambiguati (comune, provincia, regione).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LazyLocationSelector
              apiBaseUrl={apiBaseUrl}
              onChange={handleLocationChange}
              value={location}
            />
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

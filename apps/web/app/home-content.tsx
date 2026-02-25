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
import { useCallback, useMemo, useState } from 'react';
import { LocationSelector, type LocationValue } from '../components/location-selector';

const emptyLocation: LocationValue = null;

export function HomeContent() {
  const [location, setLocation] = useState<LocationValue>(emptyLocation);

  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002', []);

  const handleLocationChange = useCallback((nextValue: LocationValue) => {
    setLocation(nextValue);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
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
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              Login
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/account';
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
            <LocationSelector
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

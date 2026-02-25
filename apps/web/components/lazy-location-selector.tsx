'use client';

import { Skeleton } from '@adottaungatto/ui';
import dynamic from 'next/dynamic';
import type { LocationSelectorProps } from './location-selector';

const LocationSelectorDynamic = dynamic(
  () => import('./location-selector').then((module) => module.LocationSelector),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    ),
  },
);

export function LazyLocationSelector(props: LocationSelectorProps) {
  return <LocationSelectorDynamic {...props} />;
}

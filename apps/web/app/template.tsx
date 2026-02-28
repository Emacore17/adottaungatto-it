import type { ReactNode } from 'react';
import { PageTransition } from '../components/motion/page-transition';

interface WebTemplateProps {
  children: ReactNode;
}

export default function WebTemplate({ children }: WebTemplateProps) {
  return <PageTransition>{children}</PageTransition>;
}

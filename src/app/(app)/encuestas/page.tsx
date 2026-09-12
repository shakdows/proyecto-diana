import type { Metadata } from 'next';
import { SurveyBoard } from '@/components/surveys/survey-board';
import { demoSurveys } from '@/features/surveys/demo';

export const metadata: Metadata = { title: 'Encuestas' };

/* La ventana de 30 días se mide contra `now`: prerrenderizar la dejaría
   anclada a la fecha de compilación. */
export const dynamic = 'force-dynamic';

export default function EncuestasPage() {
  return <SurveyBoard responses={demoSurveys(new Date())} />;
}

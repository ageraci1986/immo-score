import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { searchProjectRun } from '@/inngest/functions/search-project-run';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [searchProjectRun],
});

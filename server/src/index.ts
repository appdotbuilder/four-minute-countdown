import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  startTimerInputSchema, 
  getTimerInputSchema, 
  stopTimerInputSchema 
} from './schema';

// Import handlers
import { startTimer } from './handlers/start_timer';
import { getTimerStatus } from './handlers/get_timer_status';
import { stopTimer } from './handlers/stop_timer';
import { resumeTimer } from './handlers/resume_timer';
import { resetTimer } from './handlers/reset_timer';
import { getAllTimers } from './handlers/get_all_timers';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Start a new 4-minute countdown timer
  startTimer: publicProcedure
    .input(startTimerInputSchema)
    .mutation(({ input }) => startTimer(input)),
  
  // Get current status of a specific timer (remaining time, progress, etc.)
  getTimerStatus: publicProcedure
    .input(getTimerInputSchema)
    .query(({ input }) => getTimerStatus(input)),
  
  // Pause/stop a running timer
  stopTimer: publicProcedure
    .input(stopTimerInputSchema)
    .mutation(({ input }) => stopTimer(input)),
  
  // Resume a paused timer
  resumeTimer: publicProcedure
    .input(getTimerInputSchema)
    .mutation(({ input }) => resumeTimer(input)),
  
  // Reset timer back to original 4-minute duration
  resetTimer: publicProcedure
    .input(getTimerInputSchema)
    .mutation(({ input }) => resetTimer(input)),
  
  // Get all timers (for managing multiple timers)
  getAllTimers: publicProcedure
    .query(() => getAllTimers()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Timer Server listening at port: ${port}`);
}

start();
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * DEPRECATED: This edge function has been replaced by the SQL process_billing()
 * function which runs via pg_cron. That version correctly handles:
 *   - 85/15 host revenue split (tier-aware)
 *   - Host wallet credits
 *   - Auto-stop on zero balance
 *   - Proper transaction logging
 *
 * This stub remains to prevent deployment errors if the function is
 * still referenced in Supabase config. It returns immediately with no-op.
 */
serve(async () => {
  return new Response(
    JSON.stringify({
      deprecated: true,
      message: "Billing is handled by pg_cron SQL function. This edge function is a no-op.",
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})

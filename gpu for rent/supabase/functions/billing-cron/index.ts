import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // 1. Fetch all running instances
    const { data: instances, error: instancesError } = await supabase
      .from('instances')
      .select(`
        id,
        status,
        renter_id,
        machine_id,
        disk_size_gb,
        last_billed_at,
        machines (
          price_per_hour_inr,
          storage_price_per_gb_hr
        )
      `)
      .in('status', ['running', 'stopped'])

    if (instancesError) throw instancesError

    for (const instance of instances) {
      const now = new Date()
      const lastBilledAt = new Date(instance.last_billed_at)
      const minutesSinceLastBilled = (now.getTime() - lastBilledAt.getTime()) / (1000 * 60)

      if (minutesSinceLastBilled < 1) continue // Only bill if at least 1 minute has passed

      const machine = instance.machines
      if (!machine) continue

      // Calculate costs
      const gpuCostPerHour = instance.status === 'running' ? machine.price_per_hour_inr : 0
      const storageCostPerHour = machine.storage_price_per_gb_hr * instance.disk_size_gb
      
      const totalCostPerHour = gpuCostPerHour + storageCostPerHour
      const costForPeriod = (totalCostPerHour * minutesSinceLastBilled) / 60

      if (costForPeriod <= 0) continue

      // 2. Fetch renter's wallet balance
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('wallet_balance_inr')
        .eq('id', instance.renter_id)
        .single()

      if (userError || !user) continue

      const newBalance = user.wallet_balance_inr - costForPeriod

      // 3. Update wallet balance
      await supabase
        .from('users')
        .update({ wallet_balance_inr: newBalance })
        .eq('id', instance.renter_id)

      // 4. Update instance last_billed_at and total_cost
      await supabase.rpc('increment_instance_cost', {
        p_instance_id: instance.id,
        p_cost_increment: costForPeriod,
        p_new_last_billed_at: now.toISOString()
      })

      // 5. Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: instance.renter_id,
          instance_id: instance.id,
          amount_inr: costForPeriod,
          type: 'auto_deduct',
          status: 'completed'
        })

      // 6. Auto-stop if balance is <= 0
      if (newBalance <= 0 && instance.status === 'running') {
        await supabase
          .from('instances')
          .update({ status: 'stopped', stopped_at: now.toISOString() })
          .eq('id', instance.id)
        
        // Update machine status back to available
        await supabase
          .from('machines')
          .update({ status: 'available' })
          .eq('id', instance.machine_id)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})

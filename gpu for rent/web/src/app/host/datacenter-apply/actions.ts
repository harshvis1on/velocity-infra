'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitDatacenterApplication(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'host') {
    throw new Error('Only hosts can apply for datacenter status')
  }

  const { data: existing } = await supabase
    .from('datacenter_applications')
    .select('id, status')
    .eq('host_id', user.id)
    .in('status', ['pending', 'under_review'])
    .single()

  if (existing) {
    throw new Error('You already have a pending application')
  }

  const payload = {
    host_id: user.id,
    business_name: formData.get('business_name') as string,
    business_registration: formData.get('business_registration') as string,
    gstin: formData.get('gstin') as string || null,
    cin: formData.get('cin') as string || null,
    iso_cert_number: formData.get('iso_cert_number') as string || null,
    datacenter_name: formData.get('datacenter_name') as string,
    datacenter_address: formData.get('datacenter_address') as string,
    datacenter_city: formData.get('datacenter_city') as string,
    datacenter_state: formData.get('datacenter_state') as string,
    contact_name: formData.get('contact_name') as string,
    contact_phone: formData.get('contact_phone') as string,
    contact_email: formData.get('contact_email') as string,
    gpu_server_count: parseInt(formData.get('gpu_server_count') as string) || 0,
    additional_notes: formData.get('additional_notes') as string || null,
  }

  const { error } = await supabase
    .from('datacenter_applications')
    .insert(payload)

  if (error) throw new Error(error.message)

  revalidatePath('/host/datacenter-apply')
}

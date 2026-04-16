'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: {
  full_name?: string;
  company_name?: string;
  gstin?: string;
  billing_address?: string;
  billing_country?: string;
  timezone?: string;
  phone?: string;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in.')

  const allowed: Record<string, any> = {}
  if (data.full_name !== undefined) allowed.full_name = data.full_name
  if (data.company_name !== undefined) allowed.company_name = data.company_name
  if (data.gstin !== undefined) allowed.gstin = data.gstin
  if (data.billing_address !== undefined) allowed.billing_address = data.billing_address
  if (data.billing_country !== undefined) allowed.billing_country = data.billing_country
  if (data.timezone !== undefined) allowed.timezone = data.timezone
  if (data.phone !== undefined) allowed.phone = data.phone

  if (Object.keys(allowed).length === 0) return

  const { error } = await supabase
    .from('users')
    .update(allowed)
    .eq('id', user.id)

  if (error) throw new Error('Failed to update profile: ' + error.message)

  revalidatePath('/settings')
  revalidatePath('/billing')
}

export async function updateBankDetails(data: {
  bank_account_name: string;
  bank_account_number: string;
  bank_ifsc: string;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in.')

  const { error } = await supabase
    .from('users')
    .update({
      bank_account_name: data.bank_account_name,
      bank_account_number: data.bank_account_number,
      bank_ifsc: data.bank_ifsc,
    })
    .eq('id', user.id)

  if (error) throw new Error('Failed to update bank details: ' + error.message)

  revalidatePath('/settings')
  revalidatePath('/billing')
}

export async function updateNotificationPrefs(data: {
  notify_low_balance?: boolean;
  notify_rental_activity?: boolean;
  notify_payout?: boolean;
  notify_email?: boolean;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in.')

  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', user.id)

  if (error) throw new Error('Failed to update notifications: ' + error.message)

  revalidatePath('/settings')
}

export async function switchRole(newRole: 'host' | 'renter') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in.')

  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', user.id)

  if (error) throw new Error('Failed to switch role: ' + error.message)

  revalidatePath('/settings')
  revalidatePath('/console')
  revalidatePath('/host/dashboard')
}

export async function addSshKey(name: string, publicKey: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to add an SSH key.')
  }

  const { data, error } = await supabase
    .from('ssh_keys')
    .insert({
      user_id: user.id,
      name,
      public_key: publicKey
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding SSH key:', error)
    throw new Error('Failed to add SSH key.')
  }

  revalidatePath('/settings')
  revalidatePath('/console')
  return data
}

export async function deleteSshKey(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to delete an SSH key.')
  }

  const { error } = await supabase
    .from('ssh_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting SSH key:', error)
    throw new Error('Failed to delete SSH key.')
  }

  revalidatePath('/settings')
  revalidatePath('/console')
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

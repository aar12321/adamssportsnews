import { supabase } from './supabase';

export interface AurzoUser {
  id: string;
  email: string;
  fullName: string;
  tier: string;
  hasSportsAccess: boolean;
}

export async function checkAurzoSession(): Promise<AurzoUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Check platform access
  const { data: access } = await supabase
    .from('platform_access')
    .select('is_active')
    .eq('user_id', session.user.id)
    .eq('platform', 'sports')
    .single();

  // Get profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', session.user.id)
    .single();

  // Get membership
  const { data: membership } = await supabase
    .from('user_memberships')
    .select('*, plan:membership_plans(name)')
    .eq('user_id', session.user.id)
    .single();

  return {
    id: session.user.id,
    email: session.user.email || '',
    fullName: profile?.full_name || session.user.email || '',
    tier: membership?.plan?.name || 'free',
    hasSportsAccess: access?.is_active || false,
  };
}

export async function logActivity(action: string, metadata?: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('platform_activity').insert({
    user_id: session.user.id,
    platform: 'sports',
    action,
    metadata: metadata || {},
  });
}

import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { enablePush, disablePush, rememberPushToken, savedPushToken } from '@/lib/push-client';
import { registerPushDevice } from '@/lib/push.functions';

export function NotificationButton() {
  const { user } = useAuth();
  const register = useServerFn(registerPushDevice);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const token = savedPushToken();
    if (!user || !token) { setEnabled(false); return; }
    let active = true;
    void supabase.from('push_devices').select('token').eq('token', token).eq('user_id', user.id)
      .maybeSingle().then(({ data }) => { if (active) setEnabled(!!data); });
    return () => { active = false; };
  }, [user?.id]);

  async function toggle() {
    if (!user) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush(); setEnabled(false); toast.success('Notifications turned off on this device');
      } else {
        const result = await enablePush();
        if (result.status === 'registered') {
          await register({ data: { token: result.token } });
          rememberPushToken(result.token); setEnabled(true); toast.success('Message notifications enabled');
        } else {
          const messages = {
            'not-configured': 'Message alerts need Firebase setup. Update the connection and select Include web push.',
            'unsupported': 'This browser cannot receive notifications. On iPhone, add compsell to your Home Screen first.',
            'open-in-new-tab': 'Open compsell in its own tab or use the published app to enable notifications.',
            'denied': 'Notifications are blocked. Allow them in your browser’s site settings, then try again.',
          };
          toast.error(messages[result.status], { duration: 8000 });
        }
      }
    } catch {
      toast.error('Could not update notifications. Please try again.');
    } finally { setBusy(false); }
  }
  if (!user) return null;
  return <Button variant="outline" size="sm" disabled={busy} onClick={toggle}>
    {enabled ? <BellOff className="size-4" /> : <Bell className="size-4" />}
    {busy ? 'Updating…' : enabled ? 'Turn off alerts' : 'Enable notifications'}
  </Button>;
}

export function MessageAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`chat-alerts-${user.id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = payload.new;
        if (message['sender_id'] === user.id || typeof message['conversation_id'] !== 'string') return;
        const id = message['conversation_id'];
        void qc.invalidateQueries({ queryKey: ['conversations'] });
        void qc.invalidateQueries({ queryKey: ['messages', id] });
        if (pathname === `/chat/${id}`) return;
        toast('New message on compsell', {
          description: 'Open your conversation to reply.',
          action: { label: 'Open chat', onClick: () => { void navigate({ to: '/chat/$id', params: { id } }); } },
        });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, qc, navigate, pathname]);
  return null;
}
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { messageRecipient, stalePushToken } from './push-rules';

export const registerPushDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ token: z.string().min(20).max(4096) }))
  .handler(async ({ data, context }) => {
    // A browser token can move between accounts on a shared device.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('push_devices').upsert({
      token: data.token, user_id: context.userId, updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { registered: true };
  });

export const sendChatMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ conversationId: z.string().uuid(), message: z.string().trim().min(1).max(10000) }))
  .handler(async ({ data, context }) => {
    const { data: conversation, error: conversationError } = await context.supabase
      .from('conversations').select('buyer_id,seller_id').eq('id', data.conversationId).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) throw new Error('Conversation not found');
    const recipient = messageRecipient(conversation, context.userId);
    if (!recipient) throw new Error('You cannot message this conversation');
    const { error } = await context.supabase.from('messages').insert({
      conversation_id: data.conversationId, sender_id: context.userId, message: data.message,
    });
    if (error) throw error;

    // Never roll back a sent chat message if a notification provider fails.
    try {
      const key = process.env['LOVABLE_API_KEY'];
      const connectionKey = process.env['FIREBASE_MESSAGING_API_KEY'];
      if (!key || !connectionKey) return { sent: true, notifications: 'not-configured' as const };
      // Membership was checked as the caller above; recipient tokens are private.
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: devices, error: devicesError } = await supabaseAdmin.from('push_devices')
        .select('token').eq('user_id', recipient);
      if (devicesError) throw devicesError;
      const results = await Promise.all((devices ?? []).map(async (device) => {
        const response = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: {
            token: device.token,
            notification: { title: 'New message on compsell', body: 'Someone sent you a message. Open your chat to reply.' },
            data: { path: `/chat/${data.conversationId}` },
            webpush: { notification: { tag: `chat-${data.conversationId}`, icon: '/favicon.ico' },
              fcm_options: { link: `https://compsell.lovable.app/chat/${data.conversationId}` } },
          } }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          // Tokens must never appear in logs. Retain provider status and error code only.
          const safeBody = errorBody.replaceAll(device.token, '[device]');
          console.error(`FCM send failed [${response.status}]: ${safeBody}`);
          if (stalePushToken(response.status, errorBody)) {
            await supabaseAdmin.from('push_devices').delete().eq('token', device.token).eq('user_id', recipient);
          }
          return false;
        }
        return true;
      }));
      return { sent: true, notifications: results.some((result) => !result) ? 'failed' as const : 'sent' as const };
    } catch {
      console.error('Chat saved, but message notification delivery failed');
      return { sent: true, notifications: 'failed' as const };
    }
  });
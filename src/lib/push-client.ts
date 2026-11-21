import { supabase } from '@/integrations/supabase/client';

const DEVICE_KEY = 'compsell-push-device';

export type PushResult =
  | { status: 'registered'; token: string }
  | { status: 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied' };

export function savedPushToken(): string | null {
  return localStorage.getItem(DEVICE_KEY);
}

export function rememberPushToken(token: string) {
  localStorage.setItem(DEVICE_KEY, token);
}

export async function disablePush() {
  const token = savedPushToken();
  if (token) {
    const { error } = await supabase.from('push_devices').delete().eq('token', token);
    if (error) throw error;
  }
  localStorage.removeItem(DEVICE_KEY);
}

export async function enablePush(): Promise<PushResult> {
  const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'];
  const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'];
  const config = {
    apiKey: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as string | undefined,
    projectId: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as string | undefined,
    appId: appId as string | undefined,
    messagingSenderId: appId?.split(':')[1] ?? '',
  };
  if (!config.apiKey || !config.projectId || !config.appId || !vapidKey || !config.messagingSenderId) return { status: 'not-configured' };
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return { status: 'unsupported' };
  if (window.top !== window.self) return { status: 'open-in-new-tab' };
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return { status: 'unsupported' };
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' };
  const query = new URLSearchParams({ apiKey: config.apiKey, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId }).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  const { initializeApp, getApps } = await import('firebase/app');
  const app = getApps().find((existing) => existing.name === 'compsell-messaging') ?? initializeApp({
    apiKey: config.apiKey, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId,
  }, 'compsell-messaging');
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration });
  return token ? { status: 'registered', token } : { status: 'denied' };
}
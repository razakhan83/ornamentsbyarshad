import Pusher from 'pusher';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';

let pusherServerInstance = null;

export function getPusherServer() {
  if (!appId || !key || !secret) {
    return null;
  }

  if (!pusherServerInstance) {
    try {
      pusherServerInstance = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
    } catch {
      pusherServerInstance = null;
    }
  }

  return pusherServerInstance;
}

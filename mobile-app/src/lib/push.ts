// Push notification service for PWA
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }
  
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  });
  
  // Send subscription to backend
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
  
  return await response.json();
};

export const showLocalNotification = (title: string, body: string, url?: string) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-icon.png',
      vibrate: [200, 100, 200],
      data: { url: url || '/' }
    });
    
    notification.onclick = (event) => {
      event.preventDefault();
      window.open(notification.data.url, '_blank');
    };
  }
};

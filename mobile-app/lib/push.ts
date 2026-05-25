// Push notification service for PWA
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
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

export const subscribeToPush = async (userId: number, userType: string) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });
    
    // Send subscription to backend
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_type: userType,
        subscription: subscription
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Push subscription error:', error);
    return null;
  }
};

export const sendTestNotification = () => {
  showLocalNotification(
    'OmniPOS Alert',
    'This is a test notification from your mobile app!',
    '/dashboard'
  );
};

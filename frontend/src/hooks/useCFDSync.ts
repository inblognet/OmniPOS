import { useEffect, useState } from 'react';

// Defines the data structure sent over the air
export interface CFDPayload {
  // ✅ Added 'CUSTOMER_INPUT_DONE' so the CFD can signal the POS that the customer is finished
  type: 'IDLE' | 'ACTIVE_CART' | 'CHECKOUT_INTERACTION' | 'CHECKOUT_SUCCESS' | 'CUSTOMER_INPUT_DONE';
  cart?: any[];
  totals?: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    itemCount: number;
  };
  customerData?: {
    name?: string;
    phone?: string;
    email?: string;
    receiptMethod?: 'email' | 'sms' | 'whatsapp' | 'print' | 'none';
  };
  // ✅ Added customerInput payload to hold the data the customer typed on the CFD screen
  customerInput?: {
    customer: { name: string; phone: string; email: string; isGuest: boolean };
    receipt: { method: 'print' | 'email' | 'sms' | 'whatsapp' | 'none'; destination: string };
  };
}

export const useCFDSync = (channelName: string = 'omnipos_cfd_channel') => {
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const [cfdState, setCfdState] = useState<CFDPayload>({ type: 'IDLE' });

  useEffect(() => {
    const bc = new BroadcastChannel(channelName);
    setChannel(bc);

    // Listen for messages from the other window
    bc.onmessage = (event) => {
      setCfdState(event.data);
    };

    return () => {
      bc.close();
    };
  }, [channelName]);

  // Function to send data to the other window
  const broadcast = (payload: CFDPayload) => {
    if (channel) {
      channel.postMessage(payload);
    }
  };

  return { cfdState, broadcast };
};
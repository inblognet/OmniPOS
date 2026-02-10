// src/services/sms.ts

import { StoreSettings } from '../db/db';

export interface SmsReceiptData {
    storeName: string;
    orderId: string | number;
    date: string;
    total: string;
    items: { name: string; quantity: number; price: number }[];
    // ✅ NEW: Payment & Loyalty Fields
    paidAmount?: string;
    change?: string;
    customerName?: string;
    pointsRedeemed?: number;
    discountAmount?: string;
    pointsBalance?: number;
}

interface SendSmsOptions {
    settings: StoreSettings;
    recipientPhone: string;
    data: SmsReceiptData;
}

type SmsProviderResult = { ok: true; data?: any } | { ok: false; error: string };

// ✅ UPDATED: Rich Receipt Format with Payment Details
const formatSmsBody = (data: SmsReceiptData): string => {
    // 1. Welcome Header
    let body = "";
    if (data.customerName && data.customerName !== "Walk-in Customer") {
        body += `WELCOME ${data.customerName.toUpperCase()}!\n`;
    } else {
        body += `WELCOME!\n`;
    }

    // 2. Store & Order Info
    body += `${data.storeName}\n`;
    body += `================\n`;
    body += `Order: #${data.orderId}\n`;
    body += `Date: ${data.date}\n`;
    body += `----------------\n`;

    // 3. Items Loop
    data.items.forEach(item => {
        body += `${item.quantity} x ${item.name}\n`;
    });
    body += `----------------\n`;

    // 4. Loyalty Redemption (Only if used)
    if (data.pointsRedeemed && data.pointsRedeemed > 0) {
        body += `Redeemed: ${data.pointsRedeemed} Pts\n`;
        body += `Saving: -${data.discountAmount}\n`;
        body += `----------------\n`;
    }

    // 5. Financials (Total, Paid, Change)
    body += `TOTAL: ${data.total}\n`;

    if (data.paidAmount) {
        body += `PAID: ${data.paidAmount}\n`;
    }

    if (data.change) {
        body += `CHANGE: ${data.change}\n`;
    }

    body += `================\n`;

    // 6. Remaining Balance (Only if registered)
    if (data.pointsBalance !== undefined) {
        body += `Loyalty Balance: ${data.pointsBalance} Pts\n`;
    }

    body += `Thank You!`;
    return body;
};

// --- Helper: Smart Phone Number Formatter ---
const formatSriLankaNumber = (phone: string): string => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0') && clean.length === 10) return '94' + clean.substring(1);
    if (clean.startsWith('94') && clean.length === 11) return clean;
    if (clean.length === 9) return '94' + clean;
    return clean;
};

// --- Provider: Brevo ---
const sendBrevoSms = async (recipientPhone: string, body: string, settings: StoreSettings): Promise<SmsProviderResult> => {
    console.log('[SMS] Sending via Brevo...');
    try {
        const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': settings.smsAuthToken || '',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                "sender": settings.smsFromNumber,
                "recipient": recipientPhone,
                "content": body,
                "type": "transactional"
            })
        });
        const result = await response.json();
        if (!response.ok) return { ok: false, error: result.message || 'Brevo API Error' };
        return { ok: true, data: result };
    } catch (err: any) {
        return { ok: false, error: err.message };
    }
};

// --- Provider: Text.lk (HTTP API via GET) ---
const sendTextlkSms = async (recipientPhone: string, body: string, settings: StoreSettings): Promise<SmsProviderResult> => {
    console.log('[SMS] Starting Text.lk HTTP GET Request...');

    try {
        const baseUrl = 'https://app.text.lk/api/http/sms/send';
        const formattedPhone = formatSriLankaNumber(recipientPhone);

        console.log(`[SMS] Sending to: ${formattedPhone}`);

        // ✅ Ensure all values are strings for URLSearchParams
        const params = new URLSearchParams({
            "api_token": settings.smsApiToken || "",
            "recipient": formattedPhone,
            "sender_id": settings.smsFromNumber || "TextLKDemo",
            "message": body
        });

        const finalUrl = `${baseUrl}?${params.toString()}`;

        // Send GET Request (Bypasses CSRF)
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        const result = await response.json();
        console.log('[SMS] Text.lk Response:', result);

        if (result.status === 'success' || (result.data && result.data.status === 'success')) {
             return { ok: true, data: result };
        } else {
             throw new Error(result.message || 'Text.lk API Failed');
        }
    } catch (err: any) {
        console.error('[SMS] Network Error:', err);
        return { ok: false, error: err.message };
    }
};

// --- Provider: Generic ---
const sendGenericSms = async (provider: string): Promise<SmsProviderResult> => {
    console.warn(`[SMS] Provider '${provider}' not implemented.`);
    return { ok: false, error: 'Provider not supported' };
};

// --- Main Send Function ---
export const sendSmsReceipt = async ({ settings, recipientPhone, data }: SendSmsOptions) => {
    if (!settings.smsEnabled) {
        return { ok: false, error: 'SMS integration is disabled.' };
    }

    const body = formatSmsBody(data);
    let result: SmsProviderResult;

    try {
        switch (settings.smsProvider) {
            case 'brevo':
                result = await sendBrevoSms(recipientPhone, body, settings);
                break;
            case 'textlk':
                result = await sendTextlkSms(recipientPhone, body, settings);
                break;
            case 'twilio':
            case 'bird':
            case 'plivo':
                result = await sendGenericSms(settings.smsProvider);
                break;
            default:
                return { ok: false, error: 'Invalid SMS provider selected.' };
        }

        if (result.ok) {
            return { ok: true };
        } else {
            const errorMsg = result.error || 'Failed to send SMS.';
            console.error('[SMS Service] Error:', errorMsg);
            return { ok: false, error: errorMsg };
        }
    } catch (error: any) {
        console.error('[SMS Service] Exception:', error);
        return { ok: false, error: error.message || 'An unexpected error occurred.' };
    }
};
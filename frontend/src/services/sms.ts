// src/services/sms.ts

import axios from 'axios';
import api from '../api/axiosConfig'; // ✅ Use Axios to fetch Cloud Settings

export interface SmsReceiptData {
    storeName: string;
    orderId: string | number;
    date: string;
    total: string;
    items: { name: string; quantity: number; price: number }[];
    paidAmount?: string;
    change?: string;
    customerName?: string;
    pointsRedeemed?: number;
    discountAmount?: string;
    pointsBalance?: number;
}

interface SendSmsOptions {
    recipientPhone: string;
    data: SmsReceiptData;
}

type SmsProviderResult = { ok: true; data?: any } | { ok: false; error: string };

// --- Format Receipt ---
const formatSmsBody = (data: SmsReceiptData): string => {
    let body = "";
    if (data.customerName && data.customerName !== "Walk-in Customer") {
        body += `WELCOME ${data.customerName.toUpperCase()}!\n`;
    } else {
        body += `WELCOME!\n`;
    }

    body += `${data.storeName}\n`;
    body += `================\n`;
    body += `Order: #${data.orderId}\n`;
    body += `Date: ${data.date}\n`;
    body += `----------------\n`;

    data.items.forEach(item => {
        body += `${item.quantity} x ${item.name}\n`;
    });
    body += `----------------\n`;

    if (data.pointsRedeemed && data.pointsRedeemed > 0) {
        body += `Redeemed: ${data.pointsRedeemed} Pts\n`;
        body += `Saving: -${data.discountAmount}\n`;
        body += `----------------\n`;
    }

    body += `TOTAL: ${data.total}\n`;

    if (data.paidAmount) {
        body += `PAID: ${data.paidAmount}\n`;
    }
    if (data.change) {
        body += `CHANGE: ${data.change}\n`;
    }

    body += `================\n`;

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

// --- Provider: Brevo (Using Axios) ---
const sendBrevoSms = async (recipientPhone: string, body: string, config: any): Promise<SmsProviderResult> => {
    try {
        const response = await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', {
            "sender": config.smsFromNumber,
            "recipient": recipientPhone,
            "content": body,
            "type": "transactional"
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': config.smsAuthToken || '',
                'content-type': 'application/json'
            }
        });

        return { ok: true, data: response.data };
    } catch (err: any) {
        console.error("Brevo SMS API Error:", err.response?.data || err.message);
        return { ok: false, error: err.response?.data?.message || err.message };
    }
};

// --- Provider: Text.lk (Using Axios) ---
const sendTextlkSms = async (recipientPhone: string, body: string, config: any): Promise<SmsProviderResult> => {
    try {
        const baseUrl = 'https://app.text.lk/api/http/sms/send';
        const formattedPhone = formatSriLankaNumber(recipientPhone);

        const response = await axios.get(baseUrl, {
            params: {
                "api_token": config.smsApiToken || "",
                "recipient": formattedPhone,
                "sender_id": config.smsFromNumber || "TextLKDemo",
                "message": body
            },
            headers: { 'Accept': 'application/json' }
        });

        const result = response.data;

        if (result.status === 'success' || (result.data && result.data.status === 'success')) {
             return { ok: true, data: result };
        } else {
             throw new Error(result.message || 'Text.lk API Failed');
        }
    } catch (err: any) {
        console.error("Text.lk SMS API Error:", err.response?.data || err.message);
        return { ok: false, error: err.response?.data?.message || err.message };
    }
};

// --- Main Send Function ---
export const sendSmsReceipt = async ({ recipientPhone, data }: SendSmsOptions) => {
    try {
        // ✅ 1. Fetch Cloud Settings
        const configRes = await api.get('/integrations');
        const config = configRes.data;

        // ✅ 2. Validate
        if (!config.smsEnabled) {
            return { ok: false, error: 'SMS integration is disabled in Cloud Settings.' };
        }

        const body = formatSmsBody(data);
        let result: SmsProviderResult;

        // ✅ 3. Route to Provider
        switch (config.smsProvider) {
            case 'brevo':
                result = await sendBrevoSms(recipientPhone, body, config);
                break;
            case 'textlk':
                result = await sendTextlkSms(recipientPhone, body, config);
                break;
            default:
                return { ok: false, error: 'Unsupported or unconfigured SMS provider.' };
        }

        if (result.ok) {
            return { ok: true };
        } else {
            return { ok: false, error: result.error || 'Failed to send SMS.' };
        }
    } catch (error: any) {
        console.error('[SMS Service] Cloud Sync Exception:', error);
        return { ok: false, error: error.message || 'Failed to connect to cloud configurations.' };
    }
};
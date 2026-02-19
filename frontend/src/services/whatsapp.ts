import api from '../api/axiosConfig'; // ✅ Use Axios to fetch Cloud Settings

export interface WhatsAppReceiptData {
  storeName: string;
  saleId: number | string;
  date: string;
  items: any[];
  totals: {
    currency: string;
    subtotal: number;
    discount: number;
    total: number;
  };
}

export const sendWhatsAppReceipt = async (
  phone: string,
  receiptData: WhatsAppReceiptData
) => {
  try {
    // ✅ 1. Fetch Cloud Settings
    const configRes = await api.get('/integrations');
    const config = configRes.data;

    // ✅ 2. Validate Status
    if (!config.whatsappEnabled || !config.whatsappToken || !config.whatsappPhoneId) {
      return { ok: false, error: "WhatsApp integration is disabled or missing credentials in Cloud Settings" };
    }

    const token = config.whatsappToken;
    const phoneId = config.whatsappPhoneId;

    // 3. Basic Text Receipt Format
    const messageBody = `🧾 *RECEIPT: ${receiptData.storeName}*
Sale #${receiptData.saleId} | ${receiptData.date}
--------------------------------
${receiptData.items.map((item: any) => `${item.quantity}x ${item.name.slice(0, 20)}... ${receiptData.totals.currency}${(item.price * item.quantity).toFixed(2)}`).join('\n')}
--------------------------------
Total: ${receiptData.totals.currency}${receiptData.totals.total.toFixed(2)}

Thank you for your visit!`;

    // Ensure phone number is pure digits for Meta API
    const cleanPhone = phone.replace(/\D/g, '');

    // 4. Send Request to Meta Graph API
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: messageBody }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API Error:", data);
      return { ok: false, error: data.error?.message || "Unknown Meta Error" };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };

  } catch (error) {
    console.error("WhatsApp Service Error:", error);
    return { ok: false, error: "Network connection failed or Cloud settings unreachable" };
  }
};
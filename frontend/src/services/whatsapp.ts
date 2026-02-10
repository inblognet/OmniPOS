interface WhatsAppReceiptData {
  storeName: string;
  saleId: number;
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
  receiptData: WhatsAppReceiptData,
  credentials: { token: string; phoneId: string }
) => {
  const { token, phoneId } = credentials;

  if (!token || !phoneId) {
    return { ok: false, error: "Missing WhatsApp Credentials" };
  }

  // Basic Text Receipt Format
  const messageBody = `🧾 *RECEIPT: ${receiptData.storeName}*
Sale #${receiptData.saleId} | ${receiptData.date}
--------------------------------
${receiptData.items.map((item: any) => `${item.quantity}x ${item.name.slice(0, 20)}... ${receiptData.totals.currency}${(item.price * item.quantity).toFixed(2)}`).join('\n')}
--------------------------------
Total: ${receiptData.totals.currency}${receiptData.totals.total.toFixed(2)}
\nThank you for your visit!`;

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
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
    console.error("Network Error:", error);
    return { ok: false, error: "Network connection failed" };
  }
};
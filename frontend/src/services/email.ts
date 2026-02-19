import api from '../api/axiosConfig';

interface EmailPayload {
    recipientEmail: string;
    recipientName: string;
    storeName: string;
    orderId: number | string;
    date: string;
    total: string;
    items: any[];
}

export const sendEmailReceipt = async (payload: EmailPayload) => {
    try {
        // 1. Fetch live credentials from Cloud Integrations API
        const configRes = await api.get('/integrations');
        const config = configRes.data;

        // 2. Validate Service Status
        if (!config.emailEnabled || !config.emailApiKey || !config.emailSenderAddress) {
            return { ok: false, error: 'Email integration is disabled or missing API keys in Settings.' };
        }

        // 3. Construct the HTML Receipt Table
        const itemsHtml = payload.items.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${item.name} <br> <span style="font-size: 12px; color: #777;">x${item.quantity}</span></td>
                <td style="padding: 8px; text-align: right;">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        // 4. Build the Full HTML Body
        const htmlContent = `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">${payload.storeName}</h2>
                    <p style="margin: 5px 0 0; font-size: 14px;">Receipt #${payload.orderId}</p>
                </div>
                <div style="padding: 20px;">
                    <p>Hi ${payload.recipientName},</p>
                    <p>Thank you for your purchase! Here is your digital receipt.</p>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        ${itemsHtml}
                        <tr style="font-weight: bold; background-color: #f9f9f9;">
                            <td style="padding: 10px;">TOTAL</td>
                            <td style="padding: 10px; text-align: right;">${payload.total}</td>
                        </tr>
                    </table>

                    <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
                        ${payload.date} <br>
                        Thank you for visiting!
                    </p>
                </div>
            </div>
        `;

        // 5. Send Request to Brevo API using Cloud Keys
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': config.emailApiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: config.emailSenderName || payload.storeName,
                    email: config.emailSenderAddress
                },
                to: [
                    {
                        email: payload.recipientEmail,
                        name: payload.recipientName
                    }
                ],
                subject: `Receipt from ${payload.storeName} (Order #${payload.orderId})`,
                htmlContent: htmlContent
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { ok: false, error: errorData.message || 'Failed to send email via provider' };
        }

        return { ok: true };

    } catch (error) {
        console.error("Email API Error:", error);
        return { ok: false, error: 'Network error connecting to email provider' };
    }
};
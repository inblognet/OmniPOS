import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Save, MessageCircle, CheckCircle, Mail, Smartphone, HelpCircle } from 'lucide-react';

const IntegrationsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- State for Settings ---
  // We use a single object for all settings to make adding new ones easier
  const [localSettings, setLocalSettings] = useState<any>(null);

  // 1. Fetch current settings from Database
  const dbSettings = useLiveQuery(async () => {
    const last = await db.settings.orderBy('id').last();
    return last || await db.settings.get(1);
  });

  // 2. Sync Database -> Local State (Initial Load)
  useEffect(() => {
    if (dbSettings) {
      // Ensure default values for new fields if they don't exist yet
      setLocalSettings({
        ...dbSettings,
        smsProvider: dbSettings.smsProvider || 'textlk', // Default to Text.lk as requested
        smsEnabled: dbSettings.smsEnabled || false
      });
    }
  }, [dbSettings]);

  // Helper: Update a specific setting field
  const handleUpdate = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  // 3. Save Changes
  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const exists = await db.settings.get(1);

      // Prepare the data to save
      const payload = {
          // WhatsApp
          whatsappEnabled: localSettings?.whatsappEnabled || false,
          whatsappToken: localSettings?.whatsappToken || '',
          whatsappPhoneId: localSettings?.whatsappPhoneId || '',

          // Email (Brevo)
          emailEnabled: localSettings?.emailEnabled || false,
          emailApiKey: localSettings?.emailApiKey || '',
          emailSenderName: localSettings?.emailSenderName || '',
          emailSenderAddress: localSettings?.emailSenderAddress || '',

          // ✅ SMS Service (Universal)
          smsEnabled: localSettings?.smsEnabled || false,
          smsProvider: localSettings?.smsProvider || 'textlk',
          smsAccountSid: localSettings?.smsAccountSid || '',
          smsAuthToken: localSettings?.smsAuthToken || '',
          smsFromNumber: localSettings?.smsFromNumber || '',
          smsApiEndpoint: localSettings?.smsApiEndpoint || '',
          smsApiToken: localSettings?.smsApiToken || '',
          smsTemplateId: localSettings?.smsTemplateId || ''
      };

      if (!exists) {
        // Create default if missing
        await db.settings.add({
          id: 1,
          storeName: 'My Store',
          address: '', phone: '', email: '', headerText: '', footerText: '',
          taxRate: 0.08, currency: 'LKR ',
          ...payload
        });
      } else {
        // Update existing
        await db.settings.update(1, payload);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save integrations", error);
      alert("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render SMS fields based on provider
  const renderSmsFields = () => {
      const provider = localSettings?.smsProvider;

      switch (provider) {
          case 'textlk':
              return (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">HTTP API Endpoint</label>
                              <input
                                  type="text"
                                  value={localSettings?.smsApiEndpoint || ''}
                                  onChange={(e) => handleUpdate('smsApiEndpoint', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                  placeholder="https://app.text.lk/api/http/sms/send"
                              />
                              <p className="text-[10px] text-gray-400">The full API URL provided by Text.lk</p>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">API Token</label>
                              <input
                                  type="password"
                                  value={localSettings?.smsApiToken || ''}
                                  onChange={(e) => handleUpdate('smsApiToken', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                  placeholder="Your Text.lk API Token"
                              />
                          </div>
                      </div>

                      {/* ✅ ADDED: Sender ID Field for Text.lk */}
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Sender ID</label>
                          <input
                              type="text"
                              value={localSettings?.smsFromNumber || ''}
                              onChange={(e) => handleUpdate('smsFromNumber', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="TextLKDemo"
                              maxLength={11}
                          />
                          <p className="text-[10px] text-gray-400">Enter "TextLKDemo" for testing, or your approved Sender ID.</p>
                      </div>
                  </div>
              );
          case 'brevo':
              return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">API Key (v3)</label>
                          <input
                              type="password"
                              value={localSettings?.smsAuthToken || ''}
                              onChange={(e) => handleUpdate('smsAuthToken', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="xkeysib-..."
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Sender ID</label>
                          <input
                              type="text"
                              value={localSettings?.smsFromNumber || ''}
                              onChange={(e) => handleUpdate('smsFromNumber', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="MyShop"
                              maxLength={11}
                          />
                          <p className="text-[10px] text-gray-400">Max 11 Alphanumeric characters.</p>
                      </div>
                  </div>
              );
          case 'twilio':
          case 'plivo':
              return (
                  <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Account SID / Auth ID</label>
                              <input
                                  type="text"
                                  value={localSettings?.smsAccountSid || ''}
                                  onChange={(e) => handleUpdate('smsAccountSid', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                  placeholder="AC..."
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Auth Token</label>
                              <input
                                  type="password"
                                  value={localSettings?.smsAuthToken || ''}
                                  onChange={(e) => handleUpdate('smsAuthToken', e.target.value)}
                                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                  placeholder="Token"
                              />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">From Number / Sender ID</label>
                          <input
                              type="text"
                              value={localSettings?.smsFromNumber || ''}
                              onChange={(e) => handleUpdate('smsFromNumber', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="+1234567890 or MyShop"
                          />
                      </div>
                  </div>
              );
          case 'bird':
              return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">API Access Key (Live)</label>
                          <input
                              type="password"
                              value={localSettings?.smsAuthToken || ''}
                              onChange={(e) => handleUpdate('smsAuthToken', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="Live API Key"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Originator</label>
                          <input
                              type="text"
                              value={localSettings?.smsFromNumber || ''}
                              onChange={(e) => handleUpdate('smsFromNumber', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                              placeholder="MyShop"
                          />
                      </div>
                  </div>
              );
          default:
              return <div className="text-sm text-gray-400 italic">Select a provider to configure settings.</div>;
      }
  };

  if (!localSettings) return <div className="p-10 text-center text-gray-500">Loading Settings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Integrations</h1>
        <p className="text-gray-500 text-sm">Manage third-party connections and APIs.</p>
      </div>

      {/* --- 1. WHATSAPP INTEGRATION CARD --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <MessageCircle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">WhatsApp Cloud API</h2>
                <p className="text-xs text-gray-500">Send digital receipts via Meta.</p>
              </div>
           </div>

           <div className="flex items-center gap-2">
             <span className={`text-sm font-bold ${localSettings.whatsappEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {localSettings.whatsappEnabled ? 'Active' : 'Disabled'}
             </span>
             <button
               onClick={() => handleUpdate('whatsappEnabled', !localSettings.whatsappEnabled)}
               className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${localSettings.whatsappEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
             >
               <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${localSettings.whatsappEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
           </div>
        </div>

        <div className="p-6 space-y-4">
           {localSettings.whatsappEnabled && (
              <div className="animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Phone Number ID</label>
                          <input
                            type="text"
                            value={localSettings.whatsappPhoneId || ''}
                            onChange={(e) => handleUpdate('whatsappPhoneId', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="e.g. 10xxxxxxxxxxxxx"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Access Token</label>
                          <input
                            type="password"
                            value={localSettings.whatsappToken || ''}
                            onChange={(e) => handleUpdate('whatsappToken', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="EAAG..."
                          />
                      </div>
                  </div>
              </div>
           )}
        </div>
      </div>

      {/* --- 2. EMAIL INTEGRATION CARD --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <Mail size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Email Service (Brevo)</h2>
                <p className="text-xs text-gray-500">Send HTML receipts to customer email.</p>
              </div>
           </div>

           <div className="flex items-center gap-2">
             <span className={`text-sm font-bold ${localSettings.emailEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {localSettings.emailEnabled ? 'Active' : 'Disabled'}
             </span>
             <button
               onClick={() => handleUpdate('emailEnabled', !localSettings.emailEnabled)}
               className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${localSettings.emailEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
             >
               <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${localSettings.emailEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
           </div>
        </div>

        <div className="p-6 space-y-4">
           {localSettings.emailEnabled && (
              <div className="animate-in slide-in-from-top-2 space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brevo API Key (v3)</label>
                      <input
                          type="password"
                          value={localSettings.emailApiKey || ''}
                          onChange={(e) => handleUpdate('emailApiKey', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="xkeysib-..."
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Get your free key at <a href="https://brevo.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">brevo.com</a></p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sender Name</label>
                          <input
                              type="text"
                              value={localSettings.emailSenderName || ''}
                              onChange={(e) => handleUpdate('emailSenderName', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg"
                              placeholder="My Store"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sender Email</label>
                          <input
                              type="email"
                              value={localSettings.emailSenderAddress || ''}
                              onChange={(e) => handleUpdate('emailSenderAddress', e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg"
                              placeholder="receipts@mystore.com"
                          />
                      </div>
                  </div>
              </div>
           )}
        </div>
      </div>

      {/* --- 3. SMS INTEGRATION CARD (✅ NEW) --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">SMS Service API</h2>
                <p className="text-xs text-gray-500">Send text-based receipts via various providers.</p>
              </div>
           </div>

           <div className="flex items-center gap-2">
             <span className={`text-sm font-bold ${localSettings.smsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {localSettings.smsEnabled ? 'Active' : 'Disabled'}
             </span>
             <button
               onClick={() => handleUpdate('smsEnabled', !localSettings.smsEnabled)}
               className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${localSettings.smsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
             >
               <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${localSettings.smsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
           </div>
        </div>

        <div className="p-6 space-y-4">
           {localSettings.smsEnabled && (
              <div className="animate-in slide-in-from-top-2 space-y-4">
                  {/* Provider Selection */}
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Select SMS Provider</label>
                      <select
                          value={localSettings.smsProvider || 'textlk'}
                          onChange={(e) => handleUpdate('smsProvider', e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                          <option value="textlk">Text.lk (Best for No-BR in SL)</option>
                          <option value="brevo">Brevo (Easy / Limited)</option>
                          <option value="twilio">Twilio (International / Robust)</option>
                          <option value="bird">Bird / MessageBird</option>
                          <option value="plivo">Plivo</option>
                      </select>
                      <div className="mt-2 flex items-start gap-1 text-xs text-gray-500 bg-purple-50 p-2 rounded-lg border border-purple-100">
                          <HelpCircle size={14} className="shrink-0 mt-0.5 text-purple-600" />
                          <p>
                              {localSettings.smsProvider === 'textlk' && "Uses OAuth 2.0 or HTTP API. Ideal for local delivery in Sri Lanka without complex Sender ID registration."}
                              {localSettings.smsProvider === 'brevo' && "Transactional SMS. Requires Brevo credits and enabled SMS account."}
                              {localSettings.smsProvider === 'twilio' && "Requires Account SID, Auth Token and a purchased number or Alphanumeric ID."}
                              {(localSettings.smsProvider === 'bird' || localSettings.smsProvider === 'plivo') && "Standard API integration. Check provider limits for your region."}
                          </p>
                      </div>
                  </div>

                  {/* Dynamic Fields */}
                  {renderSmsFields()}
              </div>
           )}
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="flex justify-end pt-4">
          <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          >
              {loading ? 'Saving...' : success ? 'Settings Saved!' : 'Save All Changes'}
              {success ? <CheckCircle size={20}/> : <Save size={20}/>}
          </button>
      </div>

    </div>
  );
};

export default IntegrationsPage;
// cspell:ignore Dexie
import React, { useEffect, useState } from 'react';
import { useCFDSync } from '../../hooks/useCFDSync.ts';
import { db } from '../../db/db';
import {
  ShoppingBag, CheckCircle, UserPlus, SkipForward,
  UserCheck, Smartphone, Mail, Printer, MessageCircle, X, ArrowRight
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';
import { CFDConfig } from './CFDPanelScreen.tsx';
import VirtualKeyboard from '../../components/VirtualKeyboard';
import { customerService } from '../../services/customerService';

const CFDDisplayScreen: React.FC = () => {
  const { cfdState, broadcast } = useCFDSync();
  const currency = useCurrency();
  const [config, setConfig] = useState<CFDConfig | null>(null);

  const [step, setStep] = useState<'prompt' | 'register' | 'receipt' | 'done'>('prompt');
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', isGuest: false });
  const [receiptPref, setReceiptPref] = useState<{method: any, destination: string}>({ method: '', destination: '' });
  const [activeInput, setActiveInput] = useState<keyof typeof customerForm | 'destination' | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const existing = await db.settings.get(1);
      if (existing && (existing as any).cfdSettings) {
        setConfig((existing as any).cfdSettings);
      }
      // Inject root background styling dynamically to match theme
      document.body.style.backgroundColor = 'var(--background-color, #f3f4f6)';
    };
    loadConfig();
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  useEffect(() => {
    if (cfdState.type !== 'CHECKOUT_INTERACTION') {
      setStep('prompt');
      setCustomerForm({ name: '', phone: '', email: '', isGuest: false });
      setReceiptPref({ method: '', destination: '' });
      setActiveInput(null);
    }
  }, [cfdState.type]);

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;
    if (activeInput === 'destination') {
      setReceiptPref(prev => ({ ...prev, destination: prev.destination + key }));
    } else {
      const field = activeInput as keyof typeof customerForm;
      setCustomerForm(prev => ({ ...prev, [field]: String(prev[field]) + key }));
    }
  };

  const handleBackspace = () => {
    if (!activeInput) return;
    if (activeInput === 'destination') {
      setReceiptPref(prev => ({ ...prev, destination: prev.destination.slice(0, -1) }));
    } else {
      const field = activeInput as keyof typeof customerForm;
      setCustomerForm(prev => ({ ...prev, [field]: String(prev[field]).slice(0, -1) }));
    }
  };

  const handleRegisterContinue = async () => {
    if (customerForm.name && customerForm.phone) {
        try {
            await customerService.create({
                name: customerForm.name,
                phone: customerForm.phone,
                email: customerForm.email
            });
        } catch (error) {
            console.error("Failed to save customer from CFD", error);
        }
    }
    setActiveInput(null);
    setStep('receipt');
  };

  const handleFinalSubmit = (method: string) => {
    setStep('done');
    setActiveInput(null);
    broadcast({
      type: 'CUSTOMER_INPUT_DONE',
      customerInput: {
        customer: customerForm,
        receipt: { method: method as any, destination: receiptPref.destination }
      }
    });
  };

  const getKeyboardLayout = () => {
      if (activeInput === 'email' || (activeInput === 'destination' && receiptPref.method === 'email')) return 'email';
      if (activeInput === 'phone' || (activeInput === 'destination' && receiptPref.method !== 'email')) return 'phone';
      return 'full';
  };

  // --------------------------------------------------------
  // RENDER: IDLE
  // --------------------------------------------------------
  if (cfdState.type === 'IDLE') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--background-color,#f3f4f6)] dark:bg-slate-900 p-12 text-center transition-colors">
         <div className="animate-in fade-in zoom-in duration-700">
             <ShoppingBag size={80} className="text-[var(--primary-color,#3b82f6)] mx-auto mb-6 opacity-60" />
             <h1 className="text-5xl font-black text-[var(--text-color,#1f2937)] dark:text-white tracking-tight mb-4">{config?.welcomeMessage || "Welcome to Our Store"}</h1>
             <p className="text-2xl text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">We are ready to serve you!</p>
         </div>
      </div>
    );
  }

  if (cfdState.type === 'CHECKOUT_SUCCESS') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 p-12 text-center transition-colors">
         <div className="animate-in fade-in slide-in-from-bottom-10 duration-500">
             <CheckCircle size={100} className="text-green-500 mx-auto mb-6" />
             <h1 className="text-6xl font-black text-[var(--text-color,#1f2937)] dark:text-white tracking-tight mb-4">Thank You!</h1>
             <p className="text-3xl text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Please come again.</p>
         </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // RENDER: ACTIVE CART
  // --------------------------------------------------------
  if (cfdState.type === 'ACTIVE_CART') {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-[var(--background-color,#f3f4f6)] dark:bg-slate-900 transition-colors">
        <div className="w-1/2 h-full bg-[var(--card-color,#ffffff)] dark:bg-slate-800 p-8 flex flex-col items-center justify-center border-r border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 transition-colors">
           <div className="text-center opacity-40">
              <h2 className="text-3xl font-bold text-[var(--text-color,#1f2937)] dark:text-white mb-2">Promotional Content</h2>
              <p className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400">Configure banners in the CFD Panel.</p>
           </div>
        </div>
        <div className="w-1/2 h-full flex flex-col bg-[var(--background-color,#f9fafb)] dark:bg-slate-900 transition-colors">
           <div className="bg-[var(--primary-color,#2563eb)] text-white p-6 shadow-md shrink-0">
               <h2 className="text-3xl font-black tracking-tight flex items-center gap-3"><ShoppingBag size={32} /> Your Order</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cfdState.cart && cfdState.cart.length > 0 ? (
                  cfdState.cart.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-[var(--card-color,#ffffff)] dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 animate-in slide-in-from-right-4 duration-300">
                          <div className="flex-1">
                              <h3 className="text-xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">{item.name}</h3>
                              <div className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium mt-1">{item.quantity} x {currency}{Number(item.price).toFixed(2)}</div>
                          </div>
                          <div className="text-2xl font-black text-[var(--primary-color,#2563eb)] dark:text-blue-400">{currency}{(Number(item.price) * item.quantity).toFixed(2)}</div>
                      </div>
                  ))
              ) : (<div className="text-center text-[var(--sub-text-color,#6b7280)] dark:text-gray-500 mt-20 text-xl font-bold">Cart is empty.</div>)}
           </div>
           <div className="bg-[var(--card-color,#ffffff)] dark:bg-slate-800 p-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border-t border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 shrink-0 transition-colors">
               <div className="space-y-3 mb-6 text-xl">
                   {config?.showGross && <div className="flex justify-between text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium"><span>Subtotal</span><span className="text-[var(--text-color,#1f2937)] dark:text-gray-300">{currency}{cfdState.totals?.subtotal.toFixed(2) || '0.00'}</span></div>}
                   {config?.showTax && <div className="flex justify-between text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium"><span>Tax</span><span className="text-[var(--text-color,#1f2937)] dark:text-gray-300">{currency}{cfdState.totals?.tax.toFixed(2) || '0.00'}</span></div>}
                   {config?.showDiscount && (cfdState.totals?.discount || 0) > 0 && <div className="flex justify-between text-red-500 font-medium"><span>Discount</span><span>-{currency}{cfdState.totals?.discount.toFixed(2) || '0.00'}</span></div>}
               </div>
               <div className="flex justify-between items-end border-t border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 pt-6">
                   <div>
                       {config?.showItemCount && <span className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium text-lg block mb-1">{cfdState.totals?.itemCount || 0} Items</span>}
                       <span className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white uppercase tracking-widest">Total Due</span>
                   </div>
                   <span className="text-6xl font-black text-[var(--primary-color,#2563eb)] dark:text-blue-400 tracking-tighter drop-shadow-sm">{currency}{cfdState.totals?.total.toFixed(2) || '0.00'}</span>
               </div>
           </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // RENDER: CHECKOUT INTERACTION MODE
  // --------------------------------------------------------
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--background-color,#f9fafb)] dark:bg-slate-900 transition-colors">

      {/* ✅ FIXED: LEFT SIDE dynamically synced to theme, removed solid color */}
      <div className="w-1/3 h-full bg-[var(--card-color,#ffffff)] dark:bg-slate-800 border-r border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 p-10 flex flex-col z-10 relative transition-colors">
          <div className="flex-1">
             <h2 className="text-4xl font-black tracking-tight flex items-center gap-3 mb-8 text-[var(--text-color,#1f2937)] dark:text-white">
                 <ShoppingBag size={40} className="text-[var(--primary-color,#3b82f6)]"/> Checkout
             </h2>
             <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2">
                 {cfdState.cart?.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center bg-[var(--background-color,#f9fafb)] dark:bg-slate-900 p-4 rounded-xl border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 shadow-sm">
                         <div className="truncate pr-4">
                             <h3 className="font-bold text-lg truncate text-[var(--text-color,#1f2937)] dark:text-white">{item.name}</h3>
                             <p className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Qty: {item.quantity}</p>
                         </div>
                         <div className="font-bold text-xl text-[var(--primary-color,#2563eb)] dark:text-blue-400">
                             {currency}{(Number(item.price) * item.quantity).toFixed(2)}
                         </div>
                     </div>
                 ))}
             </div>
          </div>
          <div className="pt-8 border-t border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 mt-4">
              <p className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 text-xl font-medium mb-1">Amount Due</p>
              <p className="text-7xl font-black tracking-tighter text-[var(--primary-color,#2563eb)] dark:text-blue-400 drop-shadow-sm">
                  {currency}{cfdState.totals?.total.toFixed(2)}
              </p>
          </div>
      </div>

      {/* RIGHT SIDE: Dynamic Theme Panel */}
      <div className="w-2/3 h-full flex flex-col relative bg-[var(--background-color,#f9fafb)] dark:bg-slate-900 transition-colors">
          <div className="flex-1 p-12 flex flex-col justify-center">

             {step === 'prompt' && (
                 <div className="animate-in fade-in zoom-in duration-300">
                     <h2 className="text-5xl font-black text-[var(--text-color,#1f2937)] dark:text-white text-center mb-12">Welcome! Are you a member?</h2>
                     <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                         <button onClick={() => setStep('register')} className="p-8 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-[var(--primary-color,#3b82f6)] dark:hover:border-blue-500 hover:scale-105 transition-all shadow-sm">
                             <UserPlus size={56} className="text-[var(--primary-color,#3b82f6)] dark:text-blue-400"/>
                             <span className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">New<br/>Customer</span>
                         </button>
                         <button onClick={() => setStep('register')} className="p-8 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-[var(--primary-color,#3b82f6)] dark:hover:border-blue-500 hover:scale-105 transition-all shadow-sm">
                             <UserCheck size={56} className="text-[var(--primary-color,#3b82f6)] dark:text-blue-400"/>
                             <span className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">Existing<br/>Member</span>
                         </button>
                         <button onClick={() => { setCustomerForm({...customerForm, isGuest: true}); setStep('receipt'); }} className="p-8 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-105 transition-all shadow-sm">
                             <SkipForward size={56} className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400"/>
                             <span className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">Skip /<br/>Walk-In</span>
                         </button>
                     </div>
                 </div>
             )}

             {step === 'register' && (
                 <div className="max-w-2xl mx-auto w-full animate-in slide-in-from-right-12 duration-300">
                     <h2 className="text-4xl font-black text-[var(--text-color,#1f2937)] dark:text-white mb-8">Enter Your Details</h2>
                     <div className="space-y-6">
                         <div onClick={() => setActiveInput('name')} className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${activeInput === 'name' ? 'border-[var(--primary-color,#3b82f6)] bg-[var(--primary-color)]/10 dark:bg-blue-900/20' : 'border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800'}`}>
                             <label className="block text-sm font-bold text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 uppercase mb-1">Full Name</label>
                             <div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white h-8">{customerForm.name || <span className="opacity-30">Tap to enter name</span>}</div>
                         </div>
                         <div onClick={() => setActiveInput('phone')} className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${activeInput === 'phone' ? 'border-[var(--primary-color,#3b82f6)] bg-[var(--primary-color)]/10 dark:bg-blue-900/20' : 'border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800'}`}>
                             <label className="block text-sm font-bold text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 uppercase mb-1">Phone Number</label>
                             <div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white h-8">{customerForm.phone || <span className="opacity-30">Tap to enter phone</span>}</div>
                         </div>
                         <div onClick={() => setActiveInput('email')} className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${activeInput === 'email' ? 'border-[var(--primary-color,#3b82f6)] bg-[var(--primary-color)]/10 dark:bg-blue-900/20' : 'border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800'}`}>
                             <label className="block text-sm font-bold text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 uppercase mb-1">Email Address (Optional)</label>
                             <div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white h-8">{customerForm.email || <span className="opacity-30">Tap to enter email</span>}</div>
                         </div>
                     </div>
                     <div className="mt-8 flex gap-4">
                         <button onClick={() => setStep('prompt')} className="px-8 py-4 bg-[var(--sidebar-color,#e5e7eb)] dark:bg-slate-800 text-[var(--text-color,#1f2937)] dark:text-white font-bold rounded-2xl text-xl hover:opacity-80 transition-opacity">Back</button>
                         <button onClick={handleRegisterContinue} className="flex-1 py-4 bg-[var(--primary-color,#2563eb)] text-white font-bold rounded-2xl text-xl hover:brightness-110 shadow-lg flex justify-center items-center gap-2 transition-all">Continue <ArrowRight/></button>
                     </div>
                 </div>
             )}

             {step === 'receipt' && (
                 <div className="max-w-4xl mx-auto w-full animate-in slide-in-from-right-12 duration-300 text-center">
                     <h2 className="text-5xl font-black text-[var(--text-color,#1f2937)] dark:text-white mb-10">How would you like your receipt?</h2>

                     {!receiptPref.method ? (
                         <div className="grid grid-cols-2 gap-6">
                             <button onClick={() => { setReceiptPref({ method: 'whatsapp', destination: customerForm.phone }); setActiveInput('destination'); }} className="p-6 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 rounded-3xl flex items-center gap-6 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left">
                                 <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full text-green-600 dark:text-green-400"><MessageCircle size={40}/></div>
                                 <div><div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">WhatsApp</div><div className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Eco-friendly & fast</div></div>
                             </button>
                             <button onClick={() => { setReceiptPref({ method: 'sms', destination: customerForm.phone }); setActiveInput('destination'); }} className="p-6 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 rounded-3xl flex items-center gap-6 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left">
                                 <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full text-blue-600 dark:text-blue-400"><Smartphone size={40}/></div>
                                 <div><div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">Text Message</div><div className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Sent via SMS</div></div>
                             </button>
                             <button onClick={() => { setReceiptPref({ method: 'email', destination: customerForm.email }); setActiveInput('destination'); }} className="p-6 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 rounded-3xl flex items-center gap-6 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left">
                                 <div className="bg-purple-100 dark:bg-purple-900/50 p-4 rounded-full text-purple-600 dark:text-purple-400"><Mail size={40}/></div>
                                 <div><div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">Email</div><div className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Digital copy</div></div>
                             </button>
                             <button onClick={() => handleFinalSubmit('print')} className="p-6 border-2 border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 rounded-3xl flex items-center gap-6 hover:border-gray-800 dark:hover:border-gray-500 transition-all text-left">
                                 <div className="bg-gray-200 dark:bg-slate-700 p-4 rounded-full text-gray-700 dark:text-gray-300"><Printer size={40}/></div>
                                 <div><div className="text-2xl font-bold text-[var(--text-color,#1f2937)] dark:text-white">Print Only</div><div className="text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Standard paper receipt</div></div>
                             </button>
                             <button onClick={() => handleFinalSubmit('none')} className="col-span-2 py-6 text-[var(--sub-text-color,#9ca3af)] dark:text-gray-500 font-bold hover:text-[var(--text-color,#1f2937)] dark:hover:text-white hover:underline text-xl transition-colors">No receipt needed</button>
                         </div>
                     ) : (
                         <div className="max-w-xl mx-auto">
                             <h3 className="text-2xl font-bold text-[var(--text-color,#4b5563)] dark:text-gray-300 mb-6">Confirm your {receiptPref.method === 'email' ? 'Email' : 'Number'}</h3>
                             <div onClick={() => setActiveInput('destination')} className={`p-4 border-2 rounded-2xl cursor-pointer text-left transition-colors border-[var(--primary-color,#3b82f6)] bg-[var(--primary-color)]/10 dark:bg-blue-900/20`}>
                                 <div className="text-3xl font-bold text-[var(--text-color,#1f2937)] dark:text-white h-10">{receiptPref.destination || <span className="opacity-30">Tap to type...</span>}</div>
                             </div>
                             <div className="mt-8 flex gap-4">
                                 <button onClick={() => { setReceiptPref({method:'', destination:''}); setActiveInput(null); }} className="px-8 py-4 bg-[var(--sidebar-color,#e5e7eb)] dark:bg-slate-800 text-[var(--text-color,#1f2937)] dark:text-white font-bold rounded-2xl text-xl hover:opacity-80 transition-opacity">Back</button>
                                 <button onClick={() => handleFinalSubmit(receiptPref.method)} className="flex-1 py-4 bg-[var(--primary-color,#2563eb)] text-white font-bold rounded-2xl text-xl hover:brightness-110 shadow-lg transition-all">Send Receipt & Complete</button>
                             </div>
                         </div>
                     )}
                 </div>
             )}

             {step === 'done' && (
                 <div className="animate-in fade-in zoom-in duration-500 text-center">
                     <div className="w-24 h-24 border-8 border-[var(--primary-color)]/20 border-t-[var(--primary-color,#2563eb)] rounded-full animate-spin mx-auto mb-8"></div>
                     <h2 className="text-5xl font-black text-[var(--text-color,#1f2937)] dark:text-white mb-4">Please complete payment</h2>
                     <p className="text-2xl text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 font-medium">Hand your cash or card to the cashier.</p>
                 </div>
             )}
          </div>

          {activeInput && (
            <div className="absolute bottom-6 left-12 right-12 bg-[var(--card-color,#ffffff)] dark:bg-slate-800 border border-[var(--sidebar-color,#e5e7eb)] dark:border-slate-700 shadow-2xl rounded-3xl p-6 animate-in slide-in-from-bottom-10 z-50">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-[var(--sub-text-color,#6b7280)] dark:text-gray-400 uppercase tracking-widest text-sm">Touch Keyboard</span>
                    <button onClick={() => setActiveInput(null)} className="text-[var(--sub-text-color,#9ca3af)] hover:text-[var(--text-color,#1f2937)] dark:hover:text-white bg-[var(--background-color,#f3f4f6)] dark:bg-slate-700 p-2 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <VirtualKeyboard
                   layout={getKeyboardLayout() as any}
                   onKeyPress={handleKeyPress}
                   onBackspace={handleBackspace}
                   onEnter={() => setActiveInput(null)}
                   className="!bg-transparent !border-none !shadow-none !p-0"
                />
            </div>
          )}
      </div>

    </div>
  );
};

export default CFDDisplayScreen;
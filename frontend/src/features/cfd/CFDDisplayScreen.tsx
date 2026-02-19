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

// ✅ Import Customer Service to save data directly to DB
import { customerService } from '../../services/customerService';

const CFDDisplayScreen: React.FC = () => {
  const { cfdState, broadcast } = useCFDSync();
  const currency = useCurrency();
  const [config, setConfig] = useState<CFDConfig | null>(null);

  // --- Interactive Checkout State ---
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
    };
    loadConfig();
    document.body.style.backgroundColor = '#f3f4f6';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  // Reset interaction state if we re-enter checkout
  useEffect(() => {
    if (cfdState.type !== 'CHECKOUT_INTERACTION') {
      setStep('prompt');
      setCustomerForm({ name: '', phone: '', email: '', isGuest: false });
      setReceiptPref({ method: '', destination: '' });
      setActiveInput(null);
    }
  }, [cfdState.type]);

  // --- Keyboard Handlers ---
  const handleKeyPress = (key: string) => {
    if (!activeInput) return;
    if (activeInput === 'destination') {
      setReceiptPref(prev => ({ ...prev, destination: prev.destination + key }));
    } else {
      setCustomerForm(prev => ({ ...prev, [activeInput]: prev[activeInput as string] + key }));
    }
  };

  const handleBackspace = () => {
    if (!activeInput) return;
    if (activeInput === 'destination') {
      setReceiptPref(prev => ({ ...prev, destination: prev.destination.slice(0, -1) }));
    } else {
      setCustomerForm(prev => ({ ...prev, [activeInput]: (prev[activeInput as string] as string).slice(0, -1) }));
    }
  };

  // --- ✅ NEW: Save Customer to Cloud DB ---
  const handleRegisterContinue = async () => {
    // If they provided a name and phone, let's create them in the DB!
    if (customerForm.name && customerForm.phone) {
        try {
            await customerService.create({
                name: customerForm.name,
                phone: customerForm.phone,
                email: customerForm.email // Will save email too!
            });
        } catch (error) {
            console.error("Failed to save customer from CFD", error);
            // We ignore the error in UI so the customer isn't blocked from checking out
        }
    }
    setActiveInput(null);
    setStep('receipt');
  };

  // --- Submission ---
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

  // --------------------------------------------------------
  // RENDER: IDLE
  // --------------------------------------------------------
  if (cfdState.type === 'IDLE') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center">
         <div className="animate-in fade-in zoom-in duration-700">
             <ShoppingBag size={80} className="text-indigo-400 mx-auto mb-6 opacity-50" />
             <h1 className="text-5xl font-black text-gray-800 tracking-tight mb-4">{config?.welcomeMessage || "Welcome to Our Store"}</h1>
             <p className="text-2xl text-gray-500 font-medium">We are ready to serve you!</p>
         </div>
      </div>
    );
  }

  if (cfdState.type === 'CHECKOUT_SUCCESS') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-green-50 p-12 text-center">
         <div className="animate-in fade-in slide-in-from-bottom-10 duration-500">
             <CheckCircle size={100} className="text-green-500 mx-auto mb-6" />
             <h1 className="text-6xl font-black text-gray-900 tracking-tight mb-4">Thank You!</h1>
             <p className="text-3xl text-gray-600 font-medium">Please come again.</p>
         </div>
      </div>
    );
  }

  if (cfdState.type === 'ACTIVE_CART') {
    return (
      <div className="h-screen w-screen flex overflow-hidden bg-gray-100">
        <div className="w-1/2 h-full bg-white p-8 flex flex-col items-center justify-center border-r border-gray-200">
           <div className="text-center opacity-30">
              <h2 className="text-3xl font-bold text-gray-400 mb-2">Promotional Content</h2>
              <p className="text-gray-400">Configure banners in the CFD Panel.</p>
           </div>
        </div>
        <div className="w-1/2 h-full flex flex-col bg-gray-50">
           <div className="bg-indigo-600 text-white p-6 shadow-md"><h2 className="text-3xl font-black tracking-tight flex items-center gap-3"><ShoppingBag size={32} /> Your Order</h2></div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cfdState.cart && cfdState.cart.length > 0 ? (
                  cfdState.cart.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-right-4 duration-300">
                          <div className="flex-1"><h3 className="text-xl font-bold text-gray-800">{item.name}</h3><div className="text-gray-500 font-medium mt-1">{item.quantity} x {currency}{Number(item.price).toFixed(2)}</div></div>
                          <div className="text-2xl font-black text-indigo-700">{currency}{(Number(item.price) * item.quantity).toFixed(2)}</div>
                      </div>
                  ))
              ) : (<div className="text-center text-gray-400 mt-20">Cart is empty.</div>)}
           </div>
           <div className="bg-white p-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border-t border-gray-200">
               <div className="space-y-3 mb-6 text-xl">
                   {config?.showGross && <div className="flex justify-between text-gray-500 font-medium"><span>Subtotal</span><span>{currency}{cfdState.totals?.subtotal.toFixed(2) || '0.00'}</span></div>}
                   {config?.showTax && <div className="flex justify-between text-gray-500 font-medium"><span>Tax</span><span>{currency}{cfdState.totals?.tax.toFixed(2) || '0.00'}</span></div>}
                   {config?.showDiscount && (cfdState.totals?.discount || 0) > 0 && <div className="flex justify-between text-red-500 font-medium"><span>Discount</span><span>-{currency}{cfdState.totals?.discount.toFixed(2) || '0.00'}</span></div>}
               </div>
               <div className="flex justify-between items-end border-t border-gray-200 pt-6">
                   <div>{config?.showItemCount && <span className="text-gray-500 font-medium text-lg block mb-1">{cfdState.totals?.itemCount || 0} Items</span>}<span className="text-2xl font-bold text-gray-800 uppercase tracking-widest">Total Due</span></div>
                   <span className="text-6xl font-black text-indigo-600 tracking-tighter">{currency}{cfdState.totals?.total.toFixed(2) || '0.00'}</span>
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
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      <div className="w-1/3 h-full bg-indigo-600 text-white p-10 flex flex-col shadow-2xl z-10 relative">
          <div className="flex-1">
             <h2 className="text-4xl font-black tracking-tight flex items-center gap-3 mb-8"><ShoppingBag size={40} /> Checkout</h2>
             <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2">
                 {cfdState.cart?.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center bg-indigo-700/50 p-4 rounded-xl">
                         <div className="truncate pr-4"><h3 className="font-bold text-lg truncate">{item.name}</h3><p className="text-indigo-200">Qty: {item.quantity}</p></div>
                         <div className="font-bold text-xl">{currency}{(Number(item.price) * item.quantity).toFixed(2)}</div>
                     </div>
                 ))}
             </div>
          </div>
          <div className="pt-8 border-t border-indigo-500 mt-4">
              <p className="text-indigo-200 text-xl font-medium mb-1">Amount Due</p>
              <p className="text-7xl font-black tracking-tighter">{currency}{cfdState.totals?.total.toFixed(2)}</p>
          </div>
      </div>

      <div className="w-2/3 h-full flex flex-col relative bg-white">
          <div className="flex-1 p-12 flex flex-col justify-center">

             {step === 'prompt' && (
                 <div className="animate-in fade-in zoom-in duration-300">
                     <h2 className="text-5xl font-black text-gray-800 text-center mb-12">Welcome! Are you a member?</h2>
                     <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
                         <button onClick={() => setStep('register')} className="p-8 bg-blue-50 border-2 border-blue-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-blue-100 hover:scale-105 transition-all shadow-sm">
                             <UserPlus size={56} className="text-blue-600"/>
                             <span className="text-2xl font-bold text-blue-800">New<br/>Customer</span>
                         </button>
                         <button onClick={() => setStep('register')} className="p-8 bg-indigo-50 border-2 border-indigo-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-indigo-100 hover:scale-105 transition-all shadow-sm">
                             <UserCheck size={56} className="text-indigo-600"/>
                             <span className="text-2xl font-bold text-indigo-800">Existing<br/>Member</span>
                         </button>
                         <button onClick={() => { setCustomerForm({...customerForm, isGuest: true}); setStep('receipt'); }} className="p-8 bg-gray-50 border-2 border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-gray-100 hover:scale-105 transition-all shadow-sm">
                             <SkipForward size={56} className="text-gray-500"/>
                             <span className="text-2xl font-bold text-gray-700">Skip /<br/>Walk-In</span>
                         </button>
                     </div>
                 </div>
             )}

             {step === 'register' && (
                 <div className="max-w-2xl mx-auto w-full animate-in slide-in-from-right-12 duration-300">
                     <h2 className="text-4xl font-black text-gray-800 mb-8">Enter Your Details</h2>
                     <div className="space-y-6">
                         <div onClick={() => setActiveInput('name')} className={`p-4 border-2 rounded-2xl cursor-pointer transition-colors ${activeInput === 'name' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                             <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Full Name</label>
                             <div className="text-2xl font-bold text-gray-800 h-8">{customerForm.name || <span className="text-gray-300">Tap to enter name</span>}</div>
                         </div>
                         <div onClick={() => setActiveInput('phone')} className={`p-4 border-2 rounded-2xl cursor-pointer transition-colors ${activeInput === 'phone' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                             <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                             <div className="text-2xl font-bold text-gray-800 h-8">{customerForm.phone || <span className="text-gray-300">Tap to enter phone</span>}</div>
                         </div>
                         <div onClick={() => setActiveInput('email')} className={`p-4 border-2 rounded-2xl cursor-pointer transition-colors ${activeInput === 'email' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                             <label className="block text-sm font-bold text-gray-500 uppercase mb-1">Email Address (Optional)</label>
                             <div className="text-2xl font-bold text-gray-800 h-8">{customerForm.email || <span className="text-gray-300">Tap to enter email</span>}</div>
                         </div>
                     </div>
                     <div className="mt-8 flex gap-4">
                         <button onClick={() => setStep('prompt')} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl text-xl hover:bg-gray-200">Back</button>
                         {/* ✅ NEW: Button calls handleRegisterContinue instead of immediately jumping to receipt */}
                         <button onClick={handleRegisterContinue} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl text-xl hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2">Continue <ArrowRight/></button>
                     </div>
                 </div>
             )}

             {step === 'receipt' && (
                 <div className="max-w-4xl mx-auto w-full animate-in slide-in-from-right-12 duration-300 text-center">
                     <h2 className="text-5xl font-black text-gray-800 mb-10">How would you like your receipt?</h2>

                     {!receiptPref.method ? (
                         <div className="grid grid-cols-2 gap-6">
                             <button onClick={() => { setReceiptPref({ method: 'whatsapp', destination: customerForm.phone }); setActiveInput('destination'); }} className="p-6 border-2 border-gray-200 rounded-3xl flex items-center gap-6 hover:border-green-500 hover:bg-green-50 transition-all text-left">
                                 <div className="bg-green-100 p-4 rounded-full text-green-600"><MessageCircle size={40}/></div>
                                 <div><div className="text-2xl font-bold text-gray-800">WhatsApp</div><div className="text-gray-500 font-medium">Eco-friendly & fast</div></div>
                             </button>
                             <button onClick={() => { setReceiptPref({ method: 'sms', destination: customerForm.phone }); setActiveInput('destination'); }} className="p-6 border-2 border-gray-200 rounded-3xl flex items-center gap-6 hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                                 <div className="bg-blue-100 p-4 rounded-full text-blue-600"><Smartphone size={40}/></div>
                                 <div><div className="text-2xl font-bold text-gray-800">Text Message</div><div className="text-gray-500 font-medium">Sent via SMS</div></div>
                             </button>
                             <button onClick={() => { setReceiptPref({ method: 'email', destination: customerForm.email }); setActiveInput('destination'); }} className="p-6 border-2 border-gray-200 rounded-3xl flex items-center gap-6 hover:border-purple-500 hover:bg-purple-50 transition-all text-left">
                                 <div className="bg-purple-100 p-4 rounded-full text-purple-600"><Mail size={40}/></div>
                                 <div><div className="text-2xl font-bold text-gray-800">Email</div><div className="text-gray-500 font-medium">Digital copy</div></div>
                             </button>
                             <button onClick={() => handleFinalSubmit('print')} className="p-6 border-2 border-gray-200 rounded-3xl flex items-center gap-6 hover:border-gray-800 hover:bg-gray-100 transition-all text-left">
                                 <div className="bg-gray-200 p-4 rounded-full text-gray-700"><Printer size={40}/></div>
                                 <div><div className="text-2xl font-bold text-gray-800">Print Only</div><div className="text-gray-500 font-medium">Standard paper receipt</div></div>
                             </button>
                             <button onClick={() => handleFinalSubmit('none')} className="col-span-2 py-6 text-gray-400 font-bold hover:text-gray-600 hover:underline text-xl">No receipt needed</button>
                         </div>
                     ) : (
                         <div className="max-w-xl mx-auto">
                             <h3 className="text-2xl font-bold text-gray-600 mb-6">Confirm your {receiptPref.method === 'email' ? 'Email' : 'Number'}</h3>
                             <div onClick={() => setActiveInput('destination')} className={`p-4 border-2 rounded-2xl cursor-pointer text-left transition-colors border-indigo-600 bg-indigo-50`}>
                                 <div className="text-3xl font-bold text-gray-800 h-10">{receiptPref.destination || <span className="text-gray-300">Tap to type...</span>}</div>
                             </div>
                             <div className="mt-8 flex gap-4">
                                 <button onClick={() => { setReceiptPref({method:'', destination:''}); setActiveInput(null); }} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl text-xl hover:bg-gray-200">Back</button>
                                 <button onClick={() => handleFinalSubmit(receiptPref.method)} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl text-xl hover:bg-indigo-700 shadow-lg">Send Receipt & Complete</button>
                             </div>
                         </div>
                     )}
                 </div>
             )}

             {step === 'done' && (
                 <div className="animate-in fade-in zoom-in duration-500 text-center">
                     <div className="w-24 h-24 border-8 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-8"></div>
                     <h2 className="text-5xl font-black text-gray-800 mb-4">Please complete payment</h2>
                     <p className="text-2xl text-gray-500 font-medium">Hand your cash or card to the cashier.</p>
                 </div>
             )}
          </div>

          {activeInput && (
            <div className="absolute bottom-6 left-12 right-12 bg-white border border-gray-200 shadow-2xl rounded-3xl p-6 animate-in slide-in-from-bottom-10 z-50">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Touch Keyboard</span>
                    <button onClick={() => setActiveInput(null)} className="text-gray-400 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <VirtualKeyboard
                   layout={(activeInput === 'phone' || (activeInput === 'destination' && receiptPref.method !== 'email')) ? 'numeric' : 'full'}
                   onKeyPress={handleKeyPress}
                   onBackspace={handleBackspace}
                   onEnter={() => setActiveInput(null)}
                />
            </div>
          )}
      </div>

    </div>
  );
};

export default CFDDisplayScreen;
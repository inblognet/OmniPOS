import React, { useState, useEffect, useRef } from 'react';
import {
  User, CreditCard, Banknote, QrCode, CheckCircle, Printer, X, Coins,
  ArrowRight, ArrowLeft, Keyboard as KeyboardIcon, Smartphone, Loader2,
  AlertCircle, Mail, MessageSquare
} from 'lucide-react';

// Cloud Services
import { customerService, Customer } from '../../services/customerService';
import { orderService } from '../../services/orderService';

import { useCurrency } from '../../hooks/useCurrency';
import VirtualKeyboard from '../../components/VirtualKeyboard';
import { sendWhatsAppReceipt } from '../../services/whatsapp';
import { sendEmailReceipt } from '../../services/email';
import { sendSmsReceipt } from '../../services/sms';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    subtotal: number;
    itemsCount: number;
    customer?: Customer | null;
    cartItems: any[];
    onComplete: (orderData: any) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, subtotal, itemsCount, customer, cartItems, onComplete }) => {
    const currency = useCurrency();
    const [step, setStep] = useState(1);

    // --- Data State ---
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customer || null);
    const [usePoints, setUsePoints] = useState(false);
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'QR'>('Cash');
    const [isProcessing, setIsProcessing] = useState(false);

    const [cloudCustomers, setCloudCustomers] = useState<Customer[]>([]);

    const [settings] = useState<any>({
        storeName: 'OmniPOS Store',
        currency: 'LKR',
        loyaltyRedemptionRate: 1,
        loyaltySpendThreshold: 100,
        loyaltyEarnRate: 1,
        whatsappEnabled: true,
        emailEnabled: true,
        smsEnabled: true,
        whatsappToken: 'YOUR_TOKEN',
        emailApiKey: 'YOUR_KEY'
    });

    // --- Communication States ---
    const [sendWhatsapp, setSendWhatsapp] = useState(false);
    const [waPhone, setWaPhone] = useState('');
    const [waStatus, setWaStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const [sendEmail, setSendEmail] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const [sendSms, setSendSms] = useState(false);
    const [smsPhone, setSmsPhone] = useState('');
    const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const [step5Selection, setStep5Selection] = useState<'none' | 'whatsapp' | 'email' | 'sms'>('none');
    const [showKeyboard, setShowKeyboard] = useState(true);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const paymentInputRef = useRef<HTMLInputElement>(null);
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const smsInputRef = useRef<HTMLInputElement>(null);

    // --- Calculations ---
    const redemptionValue = settings?.loyaltyRedemptionRate || 1;
    const loyaltyThreshold = settings?.loyaltySpendThreshold || 100;
    const loyaltyEarnRate = settings?.loyaltyEarnRate || 1;

    const maxRedeemablePoints = selectedCustomer
        ? Math.min(selectedCustomer.loyaltyPoints || 0, Math.floor(subtotal / redemptionValue))
        : 0;
    const pointsDiscount = usePoints ? maxRedeemablePoints * redemptionValue : 0;
    const finalTotal = Math.max(0, subtotal - pointsDiscount);
    const changeDue = Math.max(0, parseFloat(paidAmount || '0') - finalTotal);

    // Calculate points earned for this transaction
    const pointsToEarn = selectedCustomer ? Math.floor(finalTotal / loyaltyThreshold) * loyaltyEarnRate : 0;

    // --- Fetch Customers ---
    useEffect(() => {
        if (isOpen) {
            customerService.getAll().then(setCloudCustomers).catch(err => console.error(err));
        }
    }, [isOpen]);

    const filteredCustomers = cloudCustomers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearch))
    ).slice(0, 3);

    // --- Init ---
    useEffect(() => {
        if (isOpen) {
            setStep(customer ? 2 : 1);
            setSelectedCustomer(customer || null);
            setCustomerSearch(customer?.name || '');
            setUsePoints(false);
            setPaidAmount('');
            setPaymentMethod('Cash');
            setIsProcessing(false);
            setShowKeyboard(true);
            setStep5Selection('none');

            setSendWhatsapp(false);
            setWaPhone(customer?.phone || '');
            setWaStatus('idle');
            if (customer?.phone && settings?.whatsappEnabled) setSendWhatsapp(true);

            setSendEmail(false);
            setEmailAddress('');
            setEmailStatus('idle');

            setSendSms(false);
            setSmsPhone(customer?.phone || '');
            setSmsStatus('idle');
            if (customer?.phone && settings?.smsEnabled) setSendSms(true);
        }
    }, [isOpen, customer, settings]);

    // --- Auto-Focus ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (step === 1 && searchInputRef.current) searchInputRef.current.focus();
            if (step === 3) {
                if (paidAmount === '') setPaidAmount(finalTotal.toFixed(2));
                if (paymentInputRef.current) {
                    paymentInputRef.current.focus();
                    paymentInputRef.current.select();
                }
            }
            if (step === 5) {
                if (sendWhatsapp && phoneInputRef.current) phoneInputRef.current.focus();
                else if (sendEmail && emailInputRef.current) emailInputRef.current.focus();
                else if (sendSms && smsInputRef.current) smsInputRef.current.focus();
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [step, isOpen, finalTotal, sendWhatsapp, sendEmail, sendSms]);

    // --- Navigation ---
    const goNext = () => {
        if (step === 1) {
            if (filteredCustomers.length > 0 && customerSearch.trim() !== '') {
                setSelectedCustomer(filteredCustomers[0]);
                setCustomerSearch(filteredCustomers[0].name);
                setStep(2);
            } else {
                setSelectedCustomer(null);
                setStep(3);
            }
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            if (parseFloat(paidAmount || '0') >= finalTotal) setStep(4);
        } else if (step === 4) {
            setStep(5);
        } else if (step === 5) {
            handleFinalize();
        }
    };

    const goBack = () => {
        if (step === 1) onClose();
        else if (step === 2) setStep(1);
        else if (step === 3) setStep(selectedCustomer ? 2 : 1);
        else setStep(prev => prev - 1);
    };

    // --- Virtual Keyboard Logic ---
    const handleVirtualKeyPress = (key: string) => {
        if (step === 1) {
            setCustomerSearch(prev => prev + key);
            searchInputRef.current?.focus();
        } else if (step === 3) {
            setPaidAmount(prev => {
                if (key === '.' && prev.includes('.')) return prev;
                return prev + key;
            });
            paymentInputRef.current?.focus();
        } else if (step === 5) {
            if (sendWhatsapp && document.activeElement === phoneInputRef.current) {
                setWaPhone(prev => prev + key);
                phoneInputRef.current?.focus();
            } else if (sendEmail && document.activeElement === emailInputRef.current) {
                setEmailAddress(prev => prev + key);
                emailInputRef.current?.focus();
            } else if (sendSms && document.activeElement === smsInputRef.current) {
                setSmsPhone(prev => prev + key);
                smsInputRef.current?.focus();
            }
        }
    };

    const handleVirtualBackspace = () => {
        if (step === 1) {
            setCustomerSearch(prev => prev.slice(0, -1));
            searchInputRef.current?.focus();
        } else if (step === 3) {
            setPaidAmount(prev => prev.slice(0, -1));
            paymentInputRef.current?.focus();
        } else if (step === 5) {
            if (sendWhatsapp && document.activeElement === phoneInputRef.current) {
                setWaPhone(prev => prev.slice(0, -1));
                phoneInputRef.current?.focus();
            } else if (sendEmail && document.activeElement === emailInputRef.current) {
                setEmailAddress(prev => prev.slice(0, -1));
                emailInputRef.current?.focus();
            } else if (sendSms && document.activeElement === smsInputRef.current) {
                setSmsPhone(prev => prev.slice(0, -1));
                smsInputRef.current?.focus();
            }
        }
    };

    // --- Keyboard Listeners ---
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (step === 5) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFinalize();
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setStep5Selection(prev => {
                        if (prev === 'email') return 'whatsapp';
                        if (prev === 'sms') return 'email';
                        return 'whatsapp';
                    });
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setStep5Selection(prev => {
                        if (prev === 'whatsapp') return 'email';
                        if (prev === 'email') return 'sms';
                        return 'sms';
                    });
                } else if (e.key === ' ' || e.key === 'Shift') {
                    e.preventDefault();
                    if (step5Selection === 'whatsapp' && settings?.whatsappEnabled) setSendWhatsapp(p => !p);
                    if (step5Selection === 'email' && settings?.emailEnabled) setSendEmail(p => !p);
                    if (step5Selection === 'sms' && settings?.smsEnabled) setSendSms(p => !p);
                }
            } else {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    goNext();
                } else if (e.key === 'Shift') {
                    return;
                }
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Home') {
                e.preventDefault();
                setShowKeyboard(prev => !prev);
            } else if (e.key === 'Backspace') {
                if ((step === 1 && document.activeElement === searchInputRef.current) ||
                    (step === 3 && document.activeElement === paymentInputRef.current) ||
                    (step === 5 && (document.activeElement === phoneInputRef.current || document.activeElement === emailInputRef.current || document.activeElement === smsInputRef.current))) {
                    return;
                }
                e.preventDefault();
                goBack();
            }

            if (step === 2) {
                if (e.key === 'ArrowRight') setUsePoints(true);
                else if (e.key === 'ArrowLeft') setUsePoints(false);
            } else if (step === 4) {
                const methods: ('Cash' | 'Card' | 'QR')[] = ['Cash', 'Card', 'QR'];
                if (e.key === 'ArrowRight') setPaymentMethod(methods[(methods.indexOf(paymentMethod) + 1) % 3]);
                else if (e.key === 'ArrowLeft') setPaymentMethod(methods[(methods.indexOf(paymentMethod) - 1 + 3) % 3]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, step, customerSearch, filteredCustomers, paidAmount, finalTotal, paymentMethod, sendWhatsapp, waPhone, sendEmail, emailAddress, sendSms, smsPhone, step5Selection]);

    // --- Finalize ---
    const handleFinalize = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            // ✅ 1. Prepare Data for Cloud (With Loyalty Points)
            const orderPayload = {
                customerId: selectedCustomer?.id || null,
                totalAmount: finalTotal,
                paymentMethod: paymentMethod,
                pointsRedeemed: usePoints ? maxRedeemablePoints : 0,
                pointsEarned: pointsToEarn,
                items: cartItems.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            // ✅ 2. Create Order in Cloud
            const newOrder = await orderService.create(orderPayload);
            const orderId = newOrder.id;

            // ✅ 3. Handle Receipts (Rich Payloads)
            const receiptPayload = {
                storeName: settings?.storeName || 'Store',
                saleId: orderId,
                date: new Date().toLocaleDateString(),
                items: cartItems || [],
                totals: {
                    currency: settings?.currency || 'LKR',
                    subtotal: subtotal,
                    discount: pointsDiscount,
                    total: finalTotal
                }
            };

            // Send WhatsApp
            if (sendWhatsapp && waPhone && settings?.whatsappEnabled) {
                setWaStatus('sending');
                const result = await sendWhatsAppReceipt(waPhone, receiptPayload, { token: settings.whatsappToken, phoneId: settings.whatsappPhoneId });
                setWaStatus(result.ok ? 'success' : 'error');
            }

            // Send Email
            if (sendEmail && emailAddress && settings?.emailEnabled) {
                setEmailStatus('sending');
                const result = await sendEmailReceipt({
                    ...receiptPayload,
                    recipientEmail: emailAddress,
                    recipientName: selectedCustomer?.name || 'Valued Customer',
                    total: `${currency}${finalTotal}`,
                    orderId: orderId
                }, { apiKey: settings.emailApiKey, senderName: settings.storeName, senderEmail: settings.emailSender });
                setEmailStatus(result.ok ? 'success' : 'error');
            }

            // Send SMS
            if (sendSms && smsPhone && settings?.smsEnabled) {
                setSmsStatus('sending');
                const result = await sendSmsReceipt({
                    settings,
                    recipientPhone: smsPhone,
                    data: {
                        orderId: orderId,
                        storeName: settings.storeName,
                        date: new Date().toLocaleDateString(),
                        total: `${currency}${finalTotal.toFixed(2)}`,
                        paidAmount: paidAmount,
                        change: changeDue.toString(),
                        items: receiptPayload.items,
                        customerName: selectedCustomer?.name,
                        pointsBalance: (selectedCustomer?.loyaltyPoints || 0) + pointsToEarn
                    }
                });
                setSmsStatus(result.ok ? 'success' : 'error');
            }

            // ✅ 4. COMPLETE AND PRINT (WITH POINTS DATA)
            setTimeout(() => {
                onComplete({
                    ...newOrder,
                    items: cartItems,
                    tendered: parseFloat(paidAmount),
                    change: changeDue,
                    customer_name: selectedCustomer?.name,
                    // ✅ CRITICAL: Pass points data to parent for printing
                    pointsRedeemed: usePoints ? maxRedeemablePoints : 0,
                    pointsEarned: pointsToEarn,
                    loyaltyBalance: (selectedCustomer?.loyaltyPoints || 0) - (usePoints ? maxRedeemablePoints : 0) + pointsToEarn
                });
                onClose();
            }, 1000);

        } catch (error) {
            console.error("Checkout Failed:", error);
            alert("❌ Failed to create order.");
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[700px]">
                {/* Header */}
                <div className="bg-gray-900 text-white p-5 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            Checkout <span className="text-gray-400 text-lg font-normal">Step {step}/5</span>
                        </h2>
                        <div className="text-sm text-gray-400 mt-1">{itemsCount} Items • Total: {currency}{finalTotal.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowKeyboard(!showKeyboard)} className="flex items-center gap-1 text-xs font-bold bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors">
                            <KeyboardIcon size={14} /> {showKeyboard ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={onClose}><X size={28} className="text-gray-400 hover:text-white" /></button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col relative">
                    {/* Step 1: Customer */}
                    {step === 1 && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><User /> Select Customer</h3>
                            <div className="relative mb-4">
                                <input ref={searchInputRef} type="text" className="w-full text-2xl p-4 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none font-bold text-gray-800 placeholder-gray-300" placeholder="Search..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                                {filteredCustomers.length > 0 && customerSearch && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-xl mt-2 z-10">
                                        {filteredCustomers.map(c => (
                                            <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setStep(2); }} className="p-4 border-b hover:bg-blue-50 cursor-pointer font-bold text-lg flex justify-between">
                                                <span>{c.name}</span> <span className="text-gray-400 font-normal text-sm">({c.loyaltyPoints || 0} pts)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {showKeyboard && <VirtualKeyboard layout="full" onKeyPress={handleVirtualKeyPress} onBackspace={handleVirtualBackspace} onEnter={goNext} className="h-full border-none shadow-none bg-gray-50" />}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Loyalty */}
                    {step === 2 && selectedCustomer && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 justify-center">
                            <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2"><Coins /> Loyalty Program</h3>
                            <div onClick={() => setUsePoints(!usePoints)} className={`p-8 rounded-2xl border-4 cursor-pointer transition-all ${usePoints ? 'bg-purple-50 border-purple-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-2xl font-bold text-gray-800">{selectedCustomer.name}</div>
                                    <div className="text-xl bg-gray-200 text-gray-700 px-4 py-1 rounded-full font-bold">{selectedCustomer.loyaltyPoints || 0} pts</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xl font-medium text-gray-600">Redeem {maxRedeemablePoints} Points?</span>
                                    {usePoints ? <CheckCircle size={32} className="text-purple-600"/> : <div className="w-8 h-8 rounded-full border-2 border-gray-300"></div>}
                                </div>
                                {usePoints && <div className="mt-4 text-3xl font-black text-purple-700 text-right">Saving: -{currency}{pointsDiscount.toFixed(2)}</div>}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Payment Amount */}
                    {step === 3 && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><Banknote /> Payment Amount</h3>
                            <div className="flex gap-6 h-full">
                                <div className="w-1/2 flex flex-col">
                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-gray-400 uppercase mb-1">Total Due</label>
                                        <div className="text-4xl font-black text-blue-600">{currency}{finalTotal.toFixed(2)}</div>
                                    </div>
                                    <div className="relative mb-4"><input ref={paymentInputRef} type="text" className="w-full text-4xl p-4 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none font-black text-gray-900 text-right" value={paidAmount} onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) setPaidAmount(e.target.value); }} /></div>
                                    <div className={`p-4 rounded-xl border-2 text-center transition-colors ${parseFloat(paidAmount || '0') >= finalTotal ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        <div className="text-xs uppercase font-bold">Change Due</div>
                                        <div className="text-3xl font-black">{currency}{changeDue.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="w-1/2 h-full">
                                    {showKeyboard && <VirtualKeyboard layout="numeric" onKeyPress={handleVirtualKeyPress} onBackspace={handleVirtualBackspace} onEnter={goNext} className="h-full border-none shadow-none bg-gray-50" />}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Method */}
                    {step === 4 && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 justify-center">
                            <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2"><CreditCard /> Select Method</h3>
                            <div className="grid grid-cols-3 gap-6 h-64">
                                {['Cash', 'Card', 'QR'].map((method) => (
                                    <button key={method} onClick={() => setPaymentMethod(method as any)} className={`rounded-2xl border-4 flex flex-col items-center justify-center gap-4 transition-all ${paymentMethod === method ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xl scale-105' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                                        {method === 'Cash' && <Banknote size={48} />}
                                        {method === 'Card' && <CreditCard size={48} />}
                                        {method === 'QR' && <QrCode size={48} />}
                                        <span className="text-2xl font-bold">{method}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Finalize */}
                    {step === 5 && (
                        <div className="flex flex-col h-full animate-in zoom-in-95 justify-center items-center text-center relative">
                            <div className="flex items-center justify-center gap-4 mb-4">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center animate-bounce"><Printer size={40} /></div>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-1">Ready to Print</h2>
                            <p className="text-gray-500 text-sm mb-6">Receipt generated. Confirm to complete sale.</p>

                            <div className="w-full max-w-md space-y-3 h-auto max-h-[300px] overflow-y-auto pr-2">
                                <div className={`bg-gray-50 border rounded-xl p-4 text-left transition-all ${step5Selection === 'whatsapp' ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200'}`} onClick={() => setStep5Selection('whatsapp')}>
                                    <label className="flex items-center justify-between cursor-pointer mb-2">
                                        <div className="flex items-center gap-2 font-bold text-gray-700 text-sm"><MessageSquare className="text-green-600" size={18}/><span>Send WhatsApp Receipt</span></div>
                                        {waStatus === 'success' && <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={14}/> Sent</span>}
                                        {waStatus === 'error' && <span className="flex items-center gap-1 text-xs font-bold text-red-500"><AlertCircle size={14}/> Failed</span>}
                                        <input type="checkbox" className="w-4 h-4 accent-green-600" checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} />
                                    </label>
                                    {sendWhatsapp && <div className="animate-in slide-in-from-top-2 fade-in"><input ref={phoneInputRef} type="text" placeholder="9477xxxxxxx" value={waPhone} onChange={e => setWaPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 outline-none" /></div>}
                                </div>

                                <div className={`bg-gray-50 border rounded-xl p-4 text-left transition-all ${step5Selection === 'email' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`} onClick={() => setStep5Selection('email')}>
                                    <label className="flex items-center justify-between cursor-pointer mb-2">
                                        <div className="flex items-center gap-2 font-bold text-gray-700 text-sm"><Mail className="text-blue-600" size={18}/><span>Send Email Receipt</span></div>
                                        {emailStatus === 'success' && <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={14}/> Sent</span>}
                                        {emailStatus === 'error' && <span className="flex items-center gap-1 text-xs font-bold text-red-500"><AlertCircle size={14}/> Failed</span>}
                                        <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                                    </label>
                                    {sendEmail && <div className="animate-in slide-in-from-top-2 fade-in"><input ref={emailInputRef} type="email" placeholder="customer@example.com" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>}
                                </div>

                                <div className={`bg-gray-50 border rounded-xl p-4 text-left transition-all ${step5Selection === 'sms' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200'}`} onClick={() => setStep5Selection('sms')}>
                                    <label className="flex items-center justify-between cursor-pointer mb-2">
                                        <div className="flex items-center gap-2 font-bold text-gray-700 text-sm"><Smartphone className="text-purple-600" size={18}/><span>Send SMS Receipt</span></div>
                                        {smsStatus === 'success' && <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={14}/> Sent</span>}
                                        {smsStatus === 'error' && <span className="flex items-center gap-1 text-xs font-bold text-red-500"><AlertCircle size={14}/> Failed</span>}
                                        <input type="checkbox" className="w-4 h-4 accent-purple-600" checked={sendSms} onChange={e => setSendSms(e.target.checked)} />
                                    </label>
                                    {sendSms && <div className="animate-in slide-in-from-top-2 fade-in"><input ref={smsInputRef} type="text" placeholder="9477xxxxxxx" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none" /></div>}
                                </div>
                            </div>

                            <button onClick={handleFinalize} disabled={isProcessing} className="mt-6 bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl flex items-center gap-3 transition-transform active:scale-95 disabled:opacity-70">
                                {isProcessing ? <><Loader2 className="animate-spin" /> Processing...</> : <><CheckCircle size={24} /> Complete Sale (Enter)</>}
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 p-5 border-t border-gray-200 flex justify-between shrink-0">
                    <button onClick={goBack} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-2">
                        <ArrowLeft size={20} /> Back <span className="text-xs font-normal opacity-50 ml-1">(Backspace)</span>
                    </button>

                    {step < 5 && (
                        <button onClick={goNext} disabled={step === 3 && (parseFloat(paidAmount || '0') < finalTotal)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {step === 1 && customerSearch === '' ? 'Skip / Walk-in' : 'Next Step'} <ArrowRight size={20} /> <span className="text-xs font-normal opacity-50 ml-1">(Enter)</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
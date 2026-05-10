'use client';
// components/ClaimBusinessButton.tsx
import { useState } from 'react';
import { Shield, CheckCircle, Loader2, X, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Step = 'idle' | 'form' | 'verify' | 'done';

interface Props {
  businessId: string;
  isClaimed:  boolean;
  isOwner?:   boolean;
}

export default function ClaimBusinessButton({ businessId, isClaimed, isOwner }: Props) {
  const { data: session } = useSession();
  const router             = useRouter();

  const [step,       setStep]       = useState<Step>('idle');
  const [loading,    setLoading]    = useState(false);
  const [proofType,  setProofType]  = useState<'email' | 'phone'>('email');
  const [proofValue, setProofValue] = useState('');
  const [claimId,    setClaimId]    = useState('');
  const [code,       setCode]       = useState('');
  const [devCode,    setDevCode]    = useState(''); // only shown in dev

  // Already claimed by someone else
  if (isClaimed && !isOwner) return null;

  // Current user is the owner
  if (isOwner) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
        <CheckCircle className="w-4 h-4" /> You own this listing
      </div>
    );
  }

  // Step 1: submit claim with proof of contact
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) { router.push('/login'); return; }
    if (!proofValue.trim()) { toast.error('Please enter your contact info'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`/api/businesses/${businessId}/claim`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ proofType, proofValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClaimId(data.claimId);
      if (data._devCode) setDevCode(data._devCode); // dev only
      setStep('verify');
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: enter verification code
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { toast.error('Enter the verification code'); return; }

    setLoading(true);
    try {
      const res  = await fetch(`/api/businesses/${businessId}/claim`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ claimId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep('done');
      toast.success(data.message);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  // Idle state — just the button
  if (step === 'idle') {
    return (
      <button
        onClick={() => {
          if (!session?.user) { router.push('/login'); return; }
          setStep('form');
        }}
        className="flex items-center gap-2 btn-secondary text-sm"
      >
        <Shield className="w-4 h-4" /> Claim This Business
      </button>
    );
  }

  // Done state
  if (step === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50
                      border border-blue-100 px-4 py-2 rounded-xl">
        <CheckCircle className="w-4 h-4" />
        Claim submitted — awaiting admin review
      </div>
    );
  }

  // Modal overlay for form + verify steps
  return (
    <>
      <button
        onClick={() => setStep('form')}
        className="flex items-center gap-2 btn-secondary text-sm"
      >
        <Shield className="w-4 h-4" /> Claim This Business
      </button>

      {/* Modal */}
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-500" />
                {step === 'form' ? 'Claim This Business' : 'Enter Verification Code'}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {step === 'form'
                  ? 'Provide a contact method associated with this business.'
                  : `We sent a 6-digit code to ${proofValue}.`}
              </p>
            </div>
            <button
              onClick={() => { setStep('idle'); setCode(''); setProofValue(''); setDevCode(''); }}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step 1: contact form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verify ownership via
                </label>
                <div className="flex gap-2">
                  {(['email', 'phone'] as const).map((type) => (
                    <button
                      key={type} type="button"
                      onClick={() => setProofType(type)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                                  border text-sm font-medium transition-colors ${
                        proofType === type
                          ? 'bg-brand-50 border-brand-400 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {type === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business {proofType === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  value={proofValue}
                  onChange={(e) => setProofValue(e.target.value)}
                  type={proofType === 'email' ? 'email' : 'tel'}
                  placeholder={proofType === 'email' ? 'info@yourbusiness.com' : '+1 (415) 555-0100'}
                  required
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  This must match the contact info listed for the business.
                </p>
              </div>

              {/* What happens next */}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
                <p className="font-semibold text-gray-700">What happens next:</p>
                <p>1. We send a verification code to the contact provided</p>
                <p>2. Enter the code to confirm you have access</p>
                <p>3. Our team reviews and approves the claim (usually within 24h)</p>
                <p>4. You receive an email when your listing is activated</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* Step 2: enter code */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              {/* Dev helper */}
              {devCode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm">
                  <p className="font-semibold text-yellow-700 mb-0.5">Development mode</p>
                  <p className="text-yellow-600">
                    Your code: <span className="font-mono font-bold tracking-widest">{devCode}</span>
                  </p>
                  <p className="text-xs text-yellow-500 mt-1">This banner won't appear in production.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  6-digit verification code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="input text-center text-2xl font-mono tracking-widest py-4"
                />
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  Code sent to {proofValue} · expires in 24 hours
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Confirm & Submit Claim'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('form'); setCode(''); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Use a different contact method
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
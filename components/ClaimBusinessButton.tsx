'use client';
// components/ClaimBusinessButton.tsx
import { useState, useRef } from 'react';
import { Shield, CheckCircle, Loader2, X, Mail, Phone, Upload, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Step = 'idle' | 'prepare' | 'form' | 'verify' | 'upload' | 'done';

interface DocFile {
  file:  File;
  label: string;
  id:    string;
}

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
  const [docs,       setDocs]       = useState<DocFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isClaimed && !isOwner) return null;

  if (isOwner) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
        <CheckCircle className="w-4 h-4" /> You own this listing
      </div>
    );
  }

  function reset() {
    setStep('idle');
    setCode('');
    setProofValue('');
    setClaimId('');
    setDocs([]);
  }

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
      setStep('verify');
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  }

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

      setStep('upload');
      toast.success('Code verified! Now upload your ownership documents.');
    } catch (err: any) {
      toast.error(err.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (docs.length >= 3) { toast.error('Maximum 3 documents allowed'); return; }
    if (selected.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(selected.type)) {
      toast.error('Accepted formats: PDF, JPEG, PNG, WebP');
      return;
    }

    setDocs(prev => [...prev, { file: selected, label: '', id: crypto.randomUUID() }]);
    e.target.value = '';
  }

  function updateLabel(id: string, label: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, label } : d));
  }

  function removeDoc(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  async function handleUploadAndSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (docs.length === 0) { toast.error('Upload at least one document'); return; }

    const unlabeled = docs.find(d => !d.label.trim());
    if (unlabeled) { toast.error('Add a label to each document'); return; }

    setLoading(true);
    try {
      for (const doc of docs) {
        const fd = new FormData();
        fd.append('file',  doc.file);
        fd.append('label', doc.label.trim());

        const res  = await fetch(`/api/businesses/${businessId}/claim/documents`, {
          method: 'POST',
          body:   fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      const finalRes  = await fetch(`/api/businesses/${businessId}/claim/documents`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const finalData = await finalRes.json();
      if (!finalRes.ok) throw new Error(finalData.error);

      setStep('done');
      toast.success(finalData.message);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => {
          if (!session?.user) { router.push('/login'); return; }
          setStep('prepare');
        }}
        className="flex items-center gap-2 btn-secondary text-sm"
      >
        <Shield className="w-4 h-4" /> Claim This Business
      </button>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium bg-blue-50
                      border border-blue-100 px-4 py-2 rounded-xl">
        <CheckCircle className="w-4 h-4" />
        Claim submitted — awaiting admin review
      </div>
    );
  }

  const stepTitles: Record<Exclude<Step, 'idle' | 'done'>, string> = {
    prepare: 'Before You Start',
    form:    'Claim This Business',
    verify:  'Enter Verification Code',
    upload:  'Upload Ownership Documents',
  };

  const stepDescriptions: Record<Exclude<Step, 'idle' | 'done'>, string> = {
    prepare: 'Have these ready before you begin.',
    form:    'Provide a contact method associated with this business.',
    verify:  `We sent a 6-digit code to ${proofValue}.`,
    upload:  'Upload at least 1 document (max 3). Label each one.',
  };

  return (
    <>
      <button
        onClick={() => setStep('prepare')}
        className="flex items-center gap-2 btn-secondary text-sm"
      >
        <Shield className="w-4 h-4" /> Claim This Business
      </button>

      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">

          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-500" />
                {stepTitles[step as Exclude<Step, 'idle' | 'done'>]}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {stepDescriptions[step as Exclude<Step, 'idle' | 'done'>]}
              </p>
            </div>
            <button
              onClick={reset}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === 'prepare' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold text-amber-800">Prepare at least one of:</p>
                <ul className="space-y-1.5 text-amber-700">
                  {[
                    'Registre de Commerce',
                    'Identification Fiscale',
                    'Utility bill showing business address',
                    'Government-issued ID (owner)',
                    'Bank statement with business name',
                  ].map((doc) => (
                    <li key={doc} className="flex items-start gap-2">
                      <span className="mt-0.5">📄</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">How it works:</p>
                <p>1. Verify your contact info with a 6-digit code</p>
                <p>2. Upload your ownership documents (PDF, JPG, PNG · max 5MB each)</p>
                <p>3. Our team reviews and approves within 24h</p>
                <p>4. You get an email when your listing is activated</p>
              </div>

              <button
                onClick={() => setStep('form')}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                I&apos;m ready — continue
              </button>
            </div>
          )}

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
                  placeholder={proofType === 'email' ? 'info@yourbusiness.com' : '0612345678'}
                  required
                  className="input"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  This must match the contact info listed for the business.
                </p>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Verification Code'}
              </button>

              <button type="button" onClick={() => setStep('prepare')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Back
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
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
                  Code sent to {proofValue} · expires in 15 minutes
                </p>
              </div>

              <button type="submit" disabled={loading || code.length !== 6}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify Code'}
              </button>

              <button type="button" onClick={() => { setStep('form'); setCode(''); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Use a different contact method
              </button>
            </form>
          )}

          {step === 'upload' && (
            <form onSubmit={handleUploadAndSubmit} className="space-y-4">
              {docs.length > 0 && (
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">{doc.file.name}</p>
                        <input
                          value={doc.label}
                          onChange={(e) => updateLabel(doc.id, e.target.value)}
                          placeholder="Label (e.g. Registre de Commerce)"
                          maxLength={100}
                          className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-200"
                        />
                      </div>
                      <button type="button" onClick={() => removeDoc(doc.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {docs.length < 3 && (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400
                             hover:border-brand-300 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {docs.length === 0 ? 'Add document' : 'Add another document'}
                  <span className="text-xs">({docs.length}/3)</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <p className="text-xs text-gray-400 text-center">
                PDF, JPEG, PNG, WebP · Max 5MB each
              </p>

              <button type="submit" disabled={loading || docs.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : `Submit Claim with ${docs.length} Document${docs.length !== 1 ? 's' : ''}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

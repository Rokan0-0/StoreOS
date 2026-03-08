"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Store, Upload, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshBusiness, loading: authLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("Supermarket");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) return setError("Please enter your business name.");
    if (step === 2 && !phone.trim()) return setError("Please enter a contact phone number.");
    
    setError("");
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!user) return setError("Not authenticated. Please sign in.");
    setLoading(true);
    setError("");

    try {
      let logo_url = null;

      // 1. Create Business Record first (to get the ID for the logo path)
      const { data: businessData, error: dbError } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name,
          type,
          address,
          phone,
          low_stock_threshold: 5
        })
        .select('id')
        .single();

      if (dbError) throw dbError;
      const businessId = businessData.id;

      // 2. Upload Logo if exists
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${businessId}/logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile);
          
        if (uploadError) {
          console.error("Failed to upload logo:", uploadError);
          // We don't fail the whole onboarding if just the logo fails
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath);
            
          logo_url = publicUrl;
          
          // Update the business record with the logo URL
          await supabase
            .from('businesses')
            .update({ logo_url })
            .eq('id', businessId);
        }
      }

      // Refresh Auth Context to sync downstream
      await refreshBusiness();
      
      // Force a full reload so the dashboard layout loads with fresh auth state
      window.location.href = "/dashboard/sales/new";

    } catch (err: any) {
      setError(err.message || "Failed to save business profile.");
      setLoading(false);
    }
  };

  // Show loading spinner while Auth context is still initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Prevent background rendering or loader showing if we are about to redirect
  if (!user) return null;

  // Double-check auth state
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0d1117]">
      <div className="w-full max-w-lg mb-8">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step > i ? 'bg-green-500 text-white' : 
                  step === i ? 'bg-white text-green-600 ring-4 ring-green-500/20' : 
                  'bg-white/10 text-gray-500'
                }`}
              >
                {step > i ? <CheckCircle className="w-5 h-5" /> : i}
              </div>
              <div className="hidden sm:block text-xs font-semibold text-gray-400">
                {i === 1 ? 'Basics' : i === 2 ? 'Details' : 'Logo'}
              </div>
            </div>
          ))}
        </div>
        <div className="h-1 bg-white/10 rounded-full w-full relative overflow-hidden mt-4">
          <div 
            className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl animate-slide-up">
        
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Let&apos;s set up your store</h2>
              <p className="text-gray-500 mt-1">What is the name of your business?</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Iya Basira Supermarket"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Type</label>
              <select 
                className="input cursor-pointer"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Supermarket">Supermarket</option>
                <option value="Provision Store">Provision Store</option>
                <option value="General Store">General Store</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Store Details</h2>
              <p className="text-gray-500 mt-1">Where are you located?</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                className="input"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Shop Address (Optional)</label>
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="123 Broad Street, Lagos"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Logo */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Brand Logo</h2>
              <p className="text-gray-500 mt-1">Add a logo for your receipts (Optional)</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
              {logoPreview ? (
                <div className="relative w-32 h-32 mb-4 group">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain rounded-xl" />
                  <div 
                    className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-white text-xs font-semibold">Change</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-24 h-24 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-2 mb-4 cursor-pointer hover:border-green-500 transition-colors text-gray-400 hover:text-green-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8" />
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleLogoSelect}
              />
              <p className="text-sm text-gray-500 font-medium text-center">
                Click to upload a square image.<br />PNG or JPG, max 2MB.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={loading}
              className="px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          
          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving...
              </div>
            ) : step === 3 ? (
              <>Complete Setup <Store className="w-4 h-4" /></>
            ) : (
              <>Next Step <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

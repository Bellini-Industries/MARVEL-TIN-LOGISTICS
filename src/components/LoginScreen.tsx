import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  ShieldCheck,
  UserCheck,
  LogIn,
  AlertCircle,
  ArrowRight,
  Phone,
  Radio,
  MapPin,
  CheckCircle2,
  FileCheck2,
  Lock,
  ChevronRight,
  Sparkles,
  Smartphone
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    signInWithGoogle,
    switchRoleOrTruck,
    setDemoUser,
    signUpDriverWithPhone,
    signInDriverWithPhone
  } = useAuth();

  // Mode: 'driver' (phone auth) or 'admin' (Google / executive access)
  const [authCategory, setAuthCategory] = useState<'driver' | 'admin'>('driver');

  // Driver submode: 'login' or 'signup'
  const [driverMode, setDriverMode] = useState<'login' | 'signup'>('login');

  // Driver Phone Form State
  const [dialCode, setDialCode] = useState<string>('+27');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [assignedTruck, setAssignedTruck] = useState<string>('JRB 216MP');
  const [prdpNumber, setPrdpNumber] = useState<string>('PrDP-GP-884102');
  const [prdpExpiry, setPrdpExpiry] = useState<string>('2027-11-30');
  const [phoneGpsConsent, setPhoneGpsConsent] = useState<boolean>(true);

  // OTP Step State
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google sign in state
  const [signingInGoogle, setSigningInGoogle] = useState<boolean>(false);

  // Handle Send OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanNum = phoneNumber.trim().replace(/\D/g, '');
    if (cleanNum.length < 7) {
      setAuthError('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    if (driverMode === 'signup' && !driverName.trim()) {
      setAuthError('Please provide your full legal driver name as shown on your PrDP permit.');
      return;
    }

    // Move to OTP step with simulated verification code
    setOtpSent(true);
    setOtpCode('123456'); // Pre-filled demo convenience code
  };

  // Handle Verify OTP and Complete Auth
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    const fullPhone = `${dialCode} ${phoneNumber.trim()}`;

    try {
      if (driverMode === 'signup') {
        const res = await signUpDriverWithPhone({
          phoneNumber: fullPhone,
          name: driverName.trim(),
          truckId: assignedTruck,
          prdpNumber,
          prdpExpiryDate: prdpExpiry
        });
        if (!res.success) {
          setAuthError(res.error || 'Signup failed');
        }
      } else {
        const res = await signInDriverWithPhone(fullPhone, otpCode);
        if (!res.success) {
          setAuthError(res.error || 'Login failed');
        }
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-tap demo sign-in for drivers
  const handleQuickDriverLogin = async (phone: string, name: string, truck: 'JRB 216MP' | 'KBR 813MP') => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await signInDriverWithPhone(phone, '123456');
    } catch {
      if (setDemoUser) {
        setDemoUser('driver', truck, name);
      } else {
        switchRoleOrTruck('driver', truck, name);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google sign-in for admin
  const handleGoogleSignIn = async () => {
    setSigningInGoogle(true);
    setAuthError(null);
    try {
      const result = await signInWithGoogle();
      if (!result.success && result.error) {
        setAuthError(result.error);
      }
    } catch {
      setAuthError('Sign in window was closed. You can use Instant Admin Access below.');
    } finally {
      setSigningInGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background radial decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full relative z-10 space-y-6">
        {/* Company Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 text-white shadow-xl shadow-blue-500/20 mb-1">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">
                MARVEL TIN
              </h1>
              <span className="text-xs font-bold tracking-widest px-2 py-0.5 rounded-md bg-blue-500/20 text-sky-300 border border-blue-500/30 uppercase">
                FLEET-OPS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              Cross-Border Freight Logistics & Real-Time Driver Telematics
            </p>
          </div>
        </div>

        {/* Primary Role Switcher: Driver Phone Access vs Fleet Management */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-1.5 shadow-xl flex items-center text-xs font-bold">
          <button
            onClick={() => {
              setAuthCategory('driver');
              setAuthError(null);
              setOtpSent(false);
            }}
            className={`flex-1 py-2.5 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              authCategory === 'driver'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4 text-sky-300" />
            <span>Driver Phone GPS Sign-In</span>
          </button>

          <button
            onClick={() => {
              setAuthCategory('admin');
              setAuthError(null);
            }}
            className={`flex-1 py-2.5 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              authCategory === 'admin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            <span>Admin & Controller Access</span>
          </button>
        </div>

        {/* Driver Phone Registration & Real-Time GPS Tracking Card */}
        {authCategory === 'driver' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5 animate-in fade-in duration-200">
            {/* Driver Mode Subtabs (Log In vs Sign Up) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>{driverMode === 'login' ? 'Driver Phone Sign-In' : 'Driver Mobile Registration'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your phone transmits live GPS location to dispatch while on route.
                </p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDriverMode('login');
                    setOtpSent(false);
                    setAuthError(null);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    driverMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDriverMode('signup');
                    setOtpSent(false);
                    setAuthError(null);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    driverMode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* STEP 1: Phone & Driver Credentials Form */}
            {!otpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
                {/* Phone Number Input with Corridor Country Dial Prefix */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Mobile Phone Number (Corridor SIM)
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-700 focus-within:border-blue-500 bg-slate-950">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="bg-slate-800/80 text-slate-200 px-3 py-2.5 font-mono text-xs border-r border-slate-700 focus:outline-none"
                    >
                      <option value="+27">🇿🇦 +27 (SA)</option>
                      <option value="+263">🇿🇼 +263 (ZIM)</option>
                      <option value="+267">🇧🇼 +267 (BOT)</option>
                      <option value="+260">🇿🇲 +260 (ZAM)</option>
                      <option value="+258">🇲🇿 +258 (MOZ)</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="82 555 0192"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      className="flex-1 px-3 py-2.5 text-xs text-white placeholder-slate-500 bg-transparent focus:outline-none font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Used for automated GPS dispatch pings and clearing agent notifications.
                  </span>
                </div>

                {/* Additional fields for Sign-Up Mode */}
                {driverMode === 'signup' && (
                  <div className="space-y-3 pt-1 border-t border-slate-800/60">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Driver Full Legal Name (as on PrDP)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sipho Sithole"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        required
                        className="w-full rounded-xl px-3 py-2.5 text-xs border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          Assigned Fleet Unit
                        </label>
                        <select
                          value={assignedTruck}
                          onChange={(e) => setAssignedTruck(e.target.value)}
                          className="w-full rounded-xl px-3 py-2.5 text-xs border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-blue-500 font-bold"
                        >
                          <option value="JRB 216MP">JRB 216MP (Scania R500)</option>
                          <option value="KBR 813MP">KBR 813MP (Volvo FH16)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">
                          PrDP Permit Number
                        </label>
                        <input
                          type="text"
                          value={prdpNumber}
                          onChange={(e) => setPrdpNumber(e.target.value)}
                          className="w-full rounded-xl px-3 py-2.5 text-xs border border-slate-700 bg-slate-950 text-white font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Real-Time Phone GPS Consent Checkbox */}
                    <label className="flex items-start space-x-2.5 p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={phoneGpsConsent}
                        onChange={(e) => setPhoneGpsConsent(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-0"
                      />
                      <span>
                        <strong className="text-white block">Enable Real-Time Phone GPS Telematics</strong>
                        Allow this phone to automatically ping current GPS coordinates (latitude, longitude, speed) to Trans-Corridor dispatch while on duty.
                      </span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4" />
                  <span>{driverMode === 'signup' ? 'Continue with Phone & GPS Setup' : 'Send One-Time Passcode (OTP)'}</span>
                </button>
              </form>
            ) : (
              /* STEP 2: OTP Verification Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs animate-in fade-in">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-1">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">Passcode Sent via SMS</span>
                  </div>
                  <p className="text-[11px] opacity-90 font-mono">
                    Sent to: {dialCode} {phoneNumber} (Demo code: <strong>123456</strong>)
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-blue-500"
                    placeholder="123456"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer transition-all"
                  >
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>{isSubmitting ? 'Verifying & Initializing...' : 'Verify Phone & Start Tracking'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="px-3 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* Quick 1-Tap Driver Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                1-Tap Registered Driver Access (Instant Demo)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDriverLogin('+27 82 555 0192', 'Tichaona Ndlovu', 'JRB 216MP')}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">Tichaona (JRB 216MP)</span>
                    <span className="text-[10px] text-amber-400 font-mono">+27 82 555 0192</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDriverLogin('+27 83 444 8921', 'Anthony Mthembu', 'KBR 813MP')}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">Anthony (KBR 813MP)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">+27 83 444 8921</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin & Controller Management Sign-In */}
        {authCategory === 'admin' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Fleet Management & Financial Controller</span>
              </h2>
              <p className="text-xs text-slate-400">
                Full visibility of telematics, dispatch orders, SARS Section 20 tax invoices, and driver accounting.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={signingInGoogle}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{signingInGoogle ? 'Opening Google Sign-In...' : 'Sign in with Google (Authorized Admin)'}</span>
            </button>

            {/* Instant Fast 1-Click Access for Admin & Controller */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                Instant Access Roles
              </span>

              <button
                type="button"
                onClick={() => {
                  if (setDemoUser) {
                    setDemoUser('admin');
                  } else {
                    switchRoleOrTruck('admin');
                  }
                }}
                className="w-full p-3 rounded-xl bg-purple-950/20 hover:bg-purple-900/30 border border-purple-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs">Fleet Administrator</span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 rounded">
                      swedyj16@gmail.com
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Live GPS Telematics Map, Accounting Hub & Controller Invoicing
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (setDemoUser) {
                    setDemoUser('accountant');
                  } else {
                    switchRoleOrTruck('accountant');
                  }
                }}
                className="w-full p-3 rounded-xl bg-blue-950/20 hover:bg-blue-900/30 border border-blue-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs">Nomsa Dlamini (Financial Controller)</span>
                    <span className="text-[10px] font-mono text-sky-300 bg-blue-500/20 px-1.5 rounded">
                      Controller
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    SARS Section 20 Tax Invoices, CPK/RPK & Debtors Aging
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Corridor Hub Footer */}
        <div className="text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono">
          <span>Harare</span>
          <span>•</span>
          <span>Beitbridge Border</span>
          <span>•</span>
          <span>Johannesburg</span>
          <span>•</span>
          <span>Durban Port</span>
        </div>
      </div>
    </div>
  );
};

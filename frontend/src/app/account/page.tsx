"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Coffee,
  Sparkles,
  ArrowRight,
  LogOut,
  ShieldCheck,
  QrCode,
  Phone,
  Mail,
  RefreshCw,
  Award,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Copy,
  Check,
  Gift,
  ShoppingBag,
  ArrowDownCircle,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMyLoyaltyApi,
  updateMyProfileApi,
  type CustomerLoyaltySummaryResponse,
} from "@/lib/api";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";

type AccountTab = "profile" | "rewards" | "card" | "security";

/**
 * Deterministic visual QR-style matrix derived from the customer's canonical member ID
 * so the Digital Member Card displays a stable, account-specific visual identifier.
 */
function MemberQrPattern({ memberId }: { memberId: string }) {
  const cells = useMemo(() => {
    const size = 9;
    const grid: boolean[] = [];
    let hash = 2166136261;
    for (let i = 0; i < memberId.length; i++) {
      hash ^= memberId.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Finder corners
        const inTopLeft = row < 3 && col < 3;
        const inTopRight = row < 3 && col >= size - 3;
        const inBottomLeft = row >= size - 3 && col < 3;
        if (inTopLeft || inTopRight || inBottomLeft) {
          const isCenter =
            (row === 1 && col === 1) ||
            (row === 1 && col === size - 2) ||
            (row === size - 2 && col === 1);
          const isBorder =
            row === 0 ||
            row === 2 ||
            row === size - 1 ||
            row === size - 3 ||
            col === 0 ||
            col === 2 ||
            col === size - 1 ||
            col === size - 3;
          grid.push(isCenter || isBorder);
        } else {
          const bit = ((hash >>> ((row * size + col) % 24)) ^ (row * 7 + col * 13)) & 1;
          grid.push(bit === 1);
        }
      }
    }
    return grid;
  }, [memberId]);

  return (
    <div
      className="w-24 h-24 rounded-xl bg-white p-2 shadow-inner grid grid-cols-9 gap-0.5 shrink-0"
      aria-label={`Member QR identifier for ${memberId}`}
    >
      {cells.map((filled, idx) => (
        <span
          key={idx}
          className={`rounded-[1px] ${filled ? "bg-[#173D2B]" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading, refreshUser, updateUserLocally } = useAuth();

  const urlTab = (searchParams.get("tab") || "profile").toLowerCase();
  const initialTab: AccountTab =
    urlTab === "rewards" || urlTab === "card" || urlTab === "security" ? urlTab : "profile";
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);

  // Loyalty ledger state (strictly customer-scoped from /api/v1/account/loyalty)
  const [loyalty, setLoyalty] = useState<CustomerLoyaltySummaryResponse | null>(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security / Password Management State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Member Card copy state
  const [copiedId, setCopiedId] = useState(false);

  // Keep active tab synced with URL query (?tab=rewards, ?tab=card, etc.)
  useEffect(() => {
    const q = (searchParams.get("tab") || "profile").toLowerCase();
    if (q === "rewards" || q === "card" || q === "security" || q === "profile") {
      setActiveTab(q);
    }
  }, [searchParams]);

  const selectTab = (tab: AccountTab) => {
    setActiveTab(tab);
    const nextUrl = tab === "profile" ? "/account" : `/account?tab=${tab}`;
    router.replace(nextUrl, { scroll: false });
  };

  // Sync authoritative profile + loyalty balance on mount so Header and Account NEVER diverge
  const syncAccountData = useCallback(async () => {
    if (!user) return;
    setLoadingLoyalty(true);
    setLoyaltyError(null);
    try {
      const [refreshedUser, loyaltyData] = await Promise.all([
        refreshUser(),
        fetchMyLoyaltyApi(),
      ]);
      setLoyalty(loyaltyData);
      if (refreshedUser && refreshedUser.loyalty_points !== loyaltyData.balance) {
        updateUserLocally({ loyalty_points: loyaltyData.balance });
      }
    } catch (err) {
      setLoyaltyError(err instanceof Error ? err.message : "Could not refresh loyalty data.");
    } finally {
      setLoadingLoyalty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || "");
      setEditPhone(user.phone ? String(user.phone) : "");
      void syncAccountData();
    } else {
      setLoyalty(null);
    }
  }, [user?.id, syncAccountData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setSavingProfile(true);
    try {
      const res = await updateMyProfileApi({
        full_name: editName.trim(),
        phone: editPhone.trim(),
      });
      updateUserLocally(res.user);
      setIsEditingProfile(false);
      setProfileFeedback({ type: "success", text: res.message || "Profile saved to your member account." });
    } catch (err) {
      setProfileFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile changes.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityFeedback(null);
    if (newPassword.length < 6) {
      setSecurityFeedback({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityFeedback({ type: "error", text: "New passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await updateMyProfileApi({
        ...(user?.has_password ? { current_password: currentPassword } : {}),
        new_password: newPassword,
      });
      updateUserLocally(res.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecurityFeedback({
        type: "success",
        text: "Password updated securely. You can now sign in with email and password.",
      });
    } catch (err) {
      setSecurityFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyMemberId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.refresh();
    router.replace("/");
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center bg-[#FFFCF7] min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs text-[#573B2C] font-mono">
            Loading Jhe&apos;s Cafe&apos; member profile...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 sm:py-28 flex-1 flex items-center justify-center bg-[#FFFCF7] px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-10 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto text-[#173D2B]">
            <User className="w-8 h-8 text-[#315640]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-bold text-[#173D2B]">Member Sign In Required</h1>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Sign in or create an account to manage your profile, Loyalty Bean Points, and digital member pass.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login?redirect=/account"
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
            </Link>
            <Link
              href="/register?redirect=/account"
              className="w-full py-3.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-all"
            >
              <span>Create New Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "JC";

  // Single authoritative loyalty balance shared across Header & Account
  const authoritativePoints = loyalty ? loyalty.balance : Number(user.loyalty_points) || 0;
  const rewardGoal = 400;
  const progressPercent = Math.min(100, Math.round((authoritativePoints / rewardGoal) * 100));
  const isVip = user.role?.toLowerCase() === "vip";
  const isGoogleLinked = user.auth_provider === "google";

  return (
    <div className="py-10 sm:py-16 bg-[#FFFCF7] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#573B2C]">
          <Link href="/" className="hover:text-[#173D2B] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#173D2B]">My Account</span>
        </nav>

        {/* Membership Header Card */}
        <div className="rounded-3xl border border-[#E5DACB] bg-gradient-to-br from-[#F5F0E7] to-[#ECE5D8] p-6 sm:p-9 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-md ring-4 ring-white/70"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold shadow-md ring-4 ring-white/70">
                  {initials}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#173D2B]">
                    {user.full_name}
                  </h1>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#173D2B] text-[#C9AE8B] text-[10px] font-bold uppercase tracking-wider">
                    {isVip ? "Highland VIP" : user.role || "Member"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#573B2C]">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#315640]" />
                    <span>{user.email}</span>
                  </span>
                  {user.phone && (
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#315640]" />
                      <span>{user.phone}</span>
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-[#573B2C]/75 font-mono pt-1">
                  Member ID: <span className="text-[#173D2B] font-semibold">{user.id}</span>
                </p>
              </div>
            </div>

            {/* Authoritative Loyalty Balance Box */}
            <div className="w-full sm:w-64 bg-white/95 backdrop-blur-xs p-5 rounded-2xl border border-[#E5DACB] text-center sm:text-right shadow-sm shrink-0">
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#573B2C]">
                  Loyalty Bean Points
                </span>
                <button
                  type="button"
                  onClick={() => void syncAccountData()}
                  disabled={loadingLoyalty}
                  aria-label="Refresh loyalty balance"
                  className="text-[#315640] hover:text-[#173D2B] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLoyalty ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingLoyalty && !loyalty ? (
                <div className="h-10 w-24 ml-auto mt-1 rounded-xl bg-[#F5F0E7] animate-pulse" />
              ) : (
                <div className="flex items-center justify-center sm:justify-end gap-1.5 mt-0.5">
                  <Sparkles className="w-5 h-5 text-[#C9AE8B]" />
                  <span
                    id="account-loyalty-points"
                    className="font-serif text-4xl font-bold text-[#173D2B]"
                  >
                    {authoritativePoints}
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#573B2C]">pts</span>
                </div>
              )}

              <span className="text-[11px] text-emerald-800 block font-medium mt-1">
                {authoritativePoints >= rewardGoal
                  ? "Reward Available to Redeem!"
                  : `${rewardGoal - authoritativePoints} pts until free specialty drink`}
              </span>
              <div className="w-full bg-[#E5DACB] h-2 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-[#173D2B] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Account Quick Actions (Clean Separation: Link to /my-orders instead of embedding it) */}
          <div className="mt-6 pt-5 border-t border-[#E5DACB]/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#173D2B] text-white hover:bg-[#315640] transition-colors font-semibold shadow-xs"
              >
                <Coffee className="w-3.5 h-3.5 text-[#C9AE8B]" />
                <span>Browse Menu</span>
              </Link>
              <Link
                href="/my-orders"
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white transition-colors font-semibold"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Go to My Orders</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 text-xs text-rose-800 hover:text-rose-950 transition-colors cursor-pointer font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Section Tabs — Strictly Account & Membership Responsibilities */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[#E5DACB] pb-3">
          {[
            { id: "profile" as const, label: "Profile", icon: User },
            { id: "rewards" as const, label: "Loyalty Bean Points", icon: Award },
            { id: "card" as const, label: "Digital Member Card", icon: CreditCard },
            { id: "security" as const, label: "Account Security", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#173D2B] text-white shadow-xs"
                    : "bg-white border border-[#E5DACB] text-[#573B2C] hover:text-[#173D2B] hover:bg-[#F5F0E7]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C9AE8B]" : "text-[#315640]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SECTION A — PROFILE */}
        {activeTab === "profile" && (
          <section className="rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DACB] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                  Member Profile
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
                  Personal Information
                </h2>
              </div>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setEditName(user.full_name || "");
                    setEditPhone(user.phone ? String(user.phone) : "");
                    setProfileFeedback(null);
                    setIsEditingProfile(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#315640]" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {profileFeedback && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 ${
                  profileFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {profileFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <label htmlFor="profile-full-name" className="text-xs font-semibold text-[#173D2B] block">
                    Full Name
                  </label>
                  <input
                    id="profile-full-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-4 py-3 text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="profile-email" className="text-xs font-semibold text-[#173D2B] block">
                    Verified Email Address (Locked)
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-[#E5DACB] bg-[#F5F0E7]/70 px-4 py-3 text-xs text-[#573B2C] font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="profile-phone" className="text-xs font-semibold text-[#173D2B] block">
                    Mobile Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 0917 888 9900"
                    className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-4 py-3 text-xs text-[#173D2B] font-mono focus:outline-hidden focus:border-[#173D2B]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-5 py-2.5 rounded-full border border-[#E5DACB] text-[#573B2C] hover:bg-[#F5F0E7] text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#E5DACB] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                    Full Name
                  </span>
                  <p className="font-serif text-base font-bold text-[#173D2B]">{user.full_name}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#E5DACB] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                    Verified Email
                  </span>
                  <p className="font-mono text-sm font-semibold text-[#173D2B] flex items-center gap-2 flex-wrap">
                    <span>{user.email}</span>
                    <span className="text-[10px] font-sans font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#E5DACB] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                    Mobile Number
                  </span>
                  <p className="font-mono text-sm font-semibold text-[#173D2B]">
                    {user.phone ? String(user.phone) : "Not provided yet"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#E5DACB] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]/80 block">
                    Membership Tier &amp; ID
                  </span>
                  <p className="font-mono text-sm font-semibold text-[#173D2B]">
                    {isVip ? "Highland VIP" : "Member"} · {user.id}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION B — LOYALTY BEAN POINTS */}
        {activeTab === "rewards" && (
          <div className="space-y-6">
            {loyaltyError && (
              <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loyaltyError}</span>
              </div>
            )}

            {/* Loyalty Balance Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                  Current Balance
                </span>
                <p className="font-serif text-3xl font-bold text-[#173D2B]">
                  {authoritativePoints} <span className="text-sm font-sans text-[#573B2C]">pts</span>
                </p>
                <span className="text-[11px] text-[#315640]">Synced with header &amp; Airtable</span>
              </div>

              <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                  Total Points Earned
                </span>
                <p className="font-serif text-3xl font-bold text-emerald-900">
                  +{loyalty?.total_earned ?? authoritativePoints}{" "}
                  <span className="text-sm font-sans text-[#573B2C]">pts</span>
                </p>
                <span className="text-[11px] text-[#573B2C]">1 Bean Point per ₱50 spent</span>
              </div>

              <div className="p-5 rounded-3xl border border-[#E5DACB] bg-white shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#573B2C]">
                  Total Points Redeemed
                </span>
                <p className="font-serif text-3xl font-bold text-amber-900">
                  -{loyalty?.total_redeemed ?? 0}{" "}
                  <span className="text-sm font-sans text-[#573B2C]">pts</span>
                </p>
                <span className="text-[11px] text-[#573B2C]">In-store counter redemptions</span>
              </div>
            </div>

            {/* Available Rewards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-serif text-2xl font-bold text-[#173D2B]">Available Rewards</h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5F0E7] text-[#315640] border border-[#E5DACB]">
                  Portfolio Demo Loyalty Program
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                    <Coffee className="w-5 h-5 text-[#315640]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#173D2B]">Free Handcrafted Drink</h3>
                  <p className="text-xs text-[#573B2C] leading-relaxed">
                    Redeem any standard 16oz specialty beverage at the counter once you reach 400 Bean Points.
                  </p>
                  <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full inline-block">
                    Progress: {authoritativePoints} / 400 pts
                  </span>
                </div>

                <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                    <Sparkles className="w-5 h-5 text-[#C9AE8B]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#173D2B]">Birthday Pastry Voucher</h3>
                  <p className="text-xs text-[#573B2C] leading-relaxed">
                    Demo perk: present your Digital Member Card during your birthday week for a complimentary pastry slice.
                  </p>
                  <span className="text-[10px] font-mono font-semibold text-[#173D2B] bg-[#F5F0E7] px-2.5 py-1 rounded-full inline-block">
                    Counter Benefit
                  </span>
                </div>

                <div className="p-6 rounded-3xl border border-[#E5DACB] bg-white space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                    <ShieldCheck className="w-5 h-5 text-[#315640]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#173D2B]">Lounge Seating Priority</h3>
                  <p className="text-xs text-[#573B2C] leading-relaxed">
                    Authenticated members can reserve walnut tables and quiet lounge zones on the Our Space page.
                  </p>
                  <span className="text-[10px] font-mono font-semibold text-[#173D2B] bg-[#F5F0E7] px-2.5 py-1 rounded-full inline-block">
                    Active Benefit
                  </span>
                </div>
              </div>
            </div>

            {/* Loyalty Transaction History */}
            <div className="rounded-3xl border border-[#E5DACB] bg-white overflow-hidden shadow-2xs">
              <div className="px-6 py-4 bg-[#F5F0E7]/70 border-b border-[#E5DACB] flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                    Loyalty Transaction History
                  </h3>
                  <p className="text-[11px] text-[#573B2C]">
                    Verified Bean Point credits and redemptions for your account only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void syncAccountData()}
                  disabled={loadingLoyalty}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315640] hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLoyalty ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingLoyalty && !loyalty ? (
                <div className="p-10 text-center text-xs text-[#573B2C]">
                  Loading your loyalty ledger...
                </div>
              ) : !loyalty || loyalty.transactions.length === 0 ? (
                <div className="p-10 text-center text-xs text-[#573B2C] space-y-2">
                  <Award className="w-8 h-8 text-[#C9AE8B] mx-auto" />
                  <p className="font-semibold text-[#173D2B]">No Bean Point transactions recorded yet.</p>
                  <p>Place a coffee or pastry order to start accumulating loyalty points automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5DACB]">
                  {loyalty.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#FFFCF7] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F5F0E7] flex items-center justify-center shrink-0 mt-0.5">
                          {tx.transaction_type === "signup_bonus" ? (
                            <Gift className="w-4 h-4 text-[#315640]" />
                          ) : tx.transaction_type === "redemption" ? (
                            <ArrowDownCircle className="w-4 h-4 text-amber-700" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-[#C9AE8B]" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#173D2B]">{tx.description}</p>
                          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#573B2C]/80">
                            <span>{tx.transaction_ref}</span>
                            {tx.order_reference && <span>· Order #{tx.order_reference}</span>}
                            <span>
                              · {tx.created_at ? new Date(tx.created_at).toLocaleString() : "Recorded"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold text-sm shrink-0 ${
                          tx.signed_points < 0 ? "text-amber-800" : "text-emerald-800"
                        }`}
                      >
                        {tx.signed_points >= 0 ? `+${tx.points}` : `-${tx.points}`} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION C — DIGITAL MEMBER CARD */}
        {activeTab === "card" && (
          <div className="py-4">
            <div className="max-w-md mx-auto rounded-3xl bg-[#173D2B] text-white p-8 shadow-xl border border-[#0F2A1D] space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <JhesCafeLogo variant="emblem" size="sm" />
                <div className="text-right">
                  <span className="font-serif font-bold text-lg text-[#FFFCF7] block">
                    Jhe&apos;s Cafe&apos;
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-[#C9AE8B] font-mono">
                    Digital Member Pass
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#C9AE8B]">Member Name</p>
                  <p className="font-serif text-2xl font-bold tracking-tight text-[#FFFCF7] truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-white/75 truncate font-mono">{user.email}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#C9AE8B]">Bean Balance</p>
                  <p className="font-serif text-2xl font-bold text-[#FFFCF7]">
                    {authoritativePoints} <span className="text-xs font-mono text-[#C9AE8B]">pts</span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-[#C9AE8B] block">
                    Member ID
                  </span>
                  <span className="font-mono text-xs font-bold text-white block break-all">
                    {user.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyMemberId()}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C9AE8B] hover:text-white transition-colors cursor-pointer pt-1"
                  >
                    {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId ? "Copied Member ID" : "Copy Member ID"}</span>
                  </button>
                </div>

                <MemberQrPattern memberId={user.id} />
              </div>

              <p className="text-[10px] text-center text-white/60 leading-relaxed flex items-center justify-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#C9AE8B]" />
                <span>Present this digital member card at the Jhe&apos;s Cafe&apos; counter to claim points.</span>
              </p>
            </div>
          </div>
        )}

        {/* SECTION D — ACCOUNT SECURITY */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Connected Sign-In Methods */}
            <div className="lg:col-span-5 rounded-3xl border border-[#E5DACB] bg-white p-6 space-y-5 shadow-2xs">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#315640]">
                  Sign-In Providers
                </span>
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  Linked Authentication
                </h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl border border-[#E5DACB] bg-[#FFFCF7] flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#173D2B]">Google Account</p>
                    <p className="text-[11px] text-[#573B2C] font-mono">{user.email}</p>
                  </div>
                  {isGoogleLinked ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase">
                      Connected
                    </span>
                  ) : (
                    <Link
                      href="/auth/google?redirect=/account?tab=security"
                      className="px-3 py-1 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#173D2B] hover:text-white font-semibold text-[10px] uppercase transition-colors"
                    >
                      Link Google
                    </Link>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-[#E5DACB] bg-[#FFFCF7] flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#173D2B]">Email &amp; Password Login</p>
                    <p className="text-[11px] text-[#573B2C]">
                      {user.has_password
                        ? "Password sign-in enabled"
                        : "Set a password to enable email sign-in"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                      user.has_password
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {user.has_password ? "Enabled" : "Not Set"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5DACB]">
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full py-3 rounded-full border border-rose-300 bg-rose-50 hover:bg-rose-700 hover:text-white text-rose-900 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of This Device</span>
                </button>
              </div>
            </div>

            {/* Password Management */}
            <div className="lg:col-span-7 rounded-3xl border border-[#E5DACB] bg-white p-6 space-y-5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B]">
                  <KeyRound className="w-4 h-4 text-[#315640]" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    {user.has_password ? "Change Password" : "Set Account Password"}
                  </h2>
                  <p className="text-xs text-[#573B2C]">
                    Secure your Jhe&apos;s Cafe&apos; member session with a strong password (min 6 characters).
                  </p>
                </div>
              </div>

              {securityFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 ${
                    securityFeedback.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  {securityFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span>{securityFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                {user.has_password && (
                  <div className="space-y-1.5">
                    <label htmlFor="sec-current-pw" className="text-xs font-semibold text-[#173D2B] block">
                      Current Password
                    </label>
                    <input
                      id="sec-current-pw"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-4 py-2.5 text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="sec-new-pw" className="text-xs font-semibold text-[#173D2B] block">
                      New Password
                    </label>
                    <input
                      id="sec-new-pw"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-4 py-2.5 text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="sec-confirm-pw" className="text-xs font-semibold text-[#173D2B] block">
                      Confirm New Password
                    </label>
                    <input
                      id="sec-confirm-pw"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-[#E5DACB] bg-[#FFFCF7] px-4 py-2.5 text-xs text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#C9AE8B]" />
                  <span>{savingPassword ? "Updating..." : "Update Password"}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center bg-[#FFFCF7] min-h-[70vh]">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}

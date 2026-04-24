import React, { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPlatformAccess } from "./auth";
import { membershipSignupUrl } from "./config";
import { PLATFORM_LABEL } from "./config";

/**
 * AurzoAuthGate guards authenticated routes (Dashboard, Profile, etc).
 *
 * Flow:
 *   1. While the Supabase session is loading → show a spinner.
 *   2. No session → redirect to `/login`.
 *   3. Session, but `me_has_platform_access` returns false → show a
 *      "You don't have access" screen with a button to the membership
 *      portal so the user can upgrade/purchase.
 *   4. Session + access → render the wrapped children.
 *
 * Onboarding enforcement is handled inside the Onboarding page itself
 * (it no-ops and forwards to `/` when already complete), which keeps
 * this gate focused on a single concern.
 */
export default function AurzoAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;
    if (!user) {
      setCheckingAccess(false);
      setHasAccess(false);
      return;
    }
    setCheckingAccess(true);
    hasPlatformAccess().then(ok => {
      if (cancelled) return;
      setHasAccess(ok);
      setCheckingAccess(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || (user && checkingAccess)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {PLATFORM_LABEL} access required
          </h2>
          <p className="text-sm text-muted-foreground">
            Your Aurzo membership doesn't include {PLATFORM_LABEL} yet. Add it
            from the membership portal to continue.
          </p>
          <a
            href={membershipSignupUrl()}
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            Open membership portal
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

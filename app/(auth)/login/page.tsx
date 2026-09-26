"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(135deg, #f0eaf3 0%, #f8f9fa 50%, #eff6ff 100%)",
      }}
    >
      {/* Left branding panel (hidden on mobile) */}
      <div
        className="hidden md:flex"
        style={{
          width: 420,
          flexShrink: 0,
          background: "linear-gradient(160deg, #714b67 0%, #5a3d55 60%, #432d40 100%)",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 48px",
          color: "#fff",
        }}
      >
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              fontWeight: 800,
              marginBottom: 24,
            }}
          >
            SS
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>
            StockSense
          </h1>
          <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            Documents drive stock.<br />The ledger is the audit trail.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            { icon: "📦", title: "Document-first inventory", desc: "Stock only moves on Validate — no silent writes" },
            { icon: "📍", title: "Per-location quants", desc: "Know exactly where every unit sits" },
            { icon: "📋", title: "Immutable ledger", desc: "Every movement is traceable and auditable" },
          ].map((f) => (
            <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ marginBottom: 32, flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "var(--brand)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                fontWeight: 800,
                color: "#fff",
                marginBottom: 12,
              }}
            >
              SS
            </div>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--brand)" }}>StockSense</h2>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--ink-muted)" }}>
              Use your credentials below to access the warehouse.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "28px 28px 24px",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {error && (
              <div className="alert-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <label className="block">
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                  marginBottom: 6,
                  letterSpacing: "0.02em",
                }}
              >
                Email address
              </span>
              <input
                className="form-input"
                name="email"
                type="email"
                defaultValue="manager@stocksense.dev"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--ink-muted)",
                  marginBottom: 6,
                  letterSpacing: "0.02em",
                }}
              >
                Password
              </span>
              <input
                className="form-input"
                name="password"
                type="password"
                defaultValue="StockSense!1"
                autoComplete="current-password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary"
              style={{ width: "100%", padding: "11px 16px", fontSize: "0.9375rem" }}
            >
              {pending ? (
                <>
                  <svg className="loading-pulse" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </>
              ) : "Sign in →"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <Link href="/signup" className="link-brand">Create account</Link>
              <Link href="/reset" className="link-brand">Forgot password?</Link>
            </div>
          </form>

          {/* Demo credentials hint */}
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              background: "rgba(113,75,103,0.06)",
              border: "1px solid rgba(113,75,103,0.12)",
              borderRadius: 8,
              fontSize: "0.8rem",
              color: "var(--brand-dark)",
            }}
          >
            <strong>Demo credentials pre-filled.</strong> Staff login: <code style={{ fontFamily: "var(--font-mono)" }}>staff@stocksense.dev</code>
          </div>
        </div>
      </div>
    </div>
  );
}

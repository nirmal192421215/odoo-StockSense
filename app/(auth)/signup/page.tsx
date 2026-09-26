"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Field, inputClass } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    };
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPending(false);
        setError(data.error ?? "Could not create account.");
        return;
      }
      const login = await signIn("credentials", {
        email: body.email,
        password: body.password,
        redirect: false,
      });
      setPending(false);
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setPending(false);
      setError("An unexpected error occurred during signup.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(135deg, #f0eaf3 0%, #f8f9fa 50%, #eff6ff 100%)",
      }}
    >
      {/* Left branding panel */}
      <div
        className="hidden md:flex"
        style={{
          width: 440,
          flexShrink: 0,
          background: "linear-gradient(160deg, #714b67 0%, #5a3d55 60%, #432d40 100%)",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 48px",
          color: "#fff",
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 16,
            }}
          >
            📦
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
            StockSense
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", marginTop: 6, lineHeight: 1.5 }}>
            Enterprise Double-Entry Inventory Ledger & Warehouse Management System
          </p>
        </div>

        <div className="space-y-4">
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ fontSize: 18 }}>🛡️</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#fff" }}>Role-Based Access</p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                New registrations are granted Warehouse Staff clearance for receipt checking and picking operations.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#fff" }}>Audit Traceability</p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                All document transitions are logged with user identifiers for tamper-evident tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div
          className="card animate-fade-in"
          style={{
            width: "100%",
            maxWidth: 440,
            padding: "40px 36px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              Join StockSense
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--ink-muted)", marginTop: 4 }}>
              Create an operator account to manage warehouse stock
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.8125rem",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Full Name" required>
              <input
                className={inputClass()}
                name="name"
                type="text"
                placeholder="Alex Operator"
                required
                autoComplete="name"
              />
            </Field>

            <Field label="Work Email Address" required>
              <input
                className={inputClass()}
                name="email"
                type="email"
                placeholder="staff@stocksense.dev"
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Create Password" required hint="Minimum 8 characters with at least one number">
              <input
                className={inputClass()}
                name="password"
                type="password"
                placeholder="••••••••"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </Field>

            <div style={{ paddingTop: 8 }}>
              <Button
                type="submit"
                loading={pending}
                className="w-full justify-center"
              >
                Create Account
              </Button>
            </div>
          </form>

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid var(--border-light)",
              textAlign: "center",
              fontSize: "0.8125rem",
              color: "var(--ink-muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ color: "var(--brand)", fontWeight: 600 }}
              className="hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

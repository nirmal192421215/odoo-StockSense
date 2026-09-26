"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, inputClass } from "@/components/ui";

export default function ResetPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function requestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const value = String(form.get("email"));
    setEmail(value);
    try {
      const res = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      setMessage(data.hint ?? "One-time verification code has been dispatched.");
      setStep("reset");
    } catch {
      setError("Failed to request password reset code.");
    } finally {
      setPending(false);
    }
  }

  async function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: String(form.get("otp")),
          password: String(form.get("password")),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update password.");
        return;
      }
      setMessage("Password successfully updated. You may now log in.");
    } catch {
      setError("An unexpected error occurred during password update.");
    } finally {
      setPending(false);
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
            🔐
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
            Account Recovery
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.875rem", marginTop: 6, lineHeight: 1.5 }}>
            Secure identity verification and credential update for warehouse system operators.
          </p>
        </div>

        <div className="space-y-4">
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#fff" }}>Fast Recovery</p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                Instant OTP verification for sandbox environments and local demo profiles (Demo code: 123456).
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
              {step === "request" ? "Reset Credentials" : "Enter Verification Code"}
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--ink-muted)", marginTop: 4 }}>
              {step === "request"
                ? "Enter your registered operator email to receive a recovery code"
                : `Verification code dispatched to ${email}`}
            </p>
          </div>

          {message && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.8125rem",
                marginBottom: 20,
              }}
            >
              ✓ {message}
            </div>
          )}

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

          {step === "request" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <Field label="Work Email Address" required>
                <input
                  className={inputClass()}
                  name="email"
                  type="email"
                  placeholder="manager@stocksense.dev"
                  required
                  autoComplete="email"
                />
              </Field>

              <div style={{ paddingTop: 8 }}>
                <Button
                  type="submit"
                  loading={pending}
                  className="w-full justify-center"
                >
                  Send Verification Code
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-4">
              <Field label="Verification Code (OTP)" required hint="Sandbox demo default code is 123456">
                <input
                  className={inputClass("font-mono text-center tracking-widest text-base font-bold")}
                  name="otp"
                  defaultValue="123456"
                  required
                />
              </Field>

              <Field label="New Password" required hint="Minimum 8 characters">
                <input
                  className={inputClass()}
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </Field>

              <div style={{ paddingTop: 8 }}>
                <Button
                  type="submit"
                  loading={pending}
                  className="w-full justify-center"
                >
                  Update Password
                </Button>
              </div>
            </form>
          )}

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
            Remember your credentials?{" "}
            <Link
              href="/login"
              style={{ color: "var(--brand)", fontWeight: 600 }}
              className="hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

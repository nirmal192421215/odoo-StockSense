"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, Spinner, inputClass } from "@/components/ui";
import { api } from "@/lib/client";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ user: { name: string; email: string; role: string } }>("/api/me").then((d) => {
      setName(d.user.name);
      setEmail(d.user.email);
      setRole(d.user.role);
      setLoaded(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const res = await api<{ user: { name: string } }>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setName(res.user.name);
      setMessage("Profile details updated successfully.");
    } catch {
      setMessage("Failed to update profile.");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-6 max-w-xl">
        <PageHeader title="User Profile" subtitle="Account preferences and security credentials" />
        <Spinner />
      </div>
    );
  }

  const isManager = role === "inventory_manager";

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <PageHeader
        title="User Profile"
        subtitle="Manage your operator identity and system credentials"
      />

      {message && (
        <div
          className={`p-3.5 rounded-lg border text-sm font-medium ${
            message.includes("success")
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.includes("success") ? "✓ " : "⚠️ "}
          {message}
        </div>
      )}

      {/* Profile Overview Card */}
      <Card className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--brand) 0%, #4a2f43 100%)" }}
        >
          {name ? name.slice(0, 2).toUpperCase() : "U"}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold" style={{ color: "var(--ink)" }}>
            {name || "User"}
          </h2>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{
                background: isManager ? "rgba(113, 75, 103, 0.1)" : "rgba(37, 99, 235, 0.1)",
                color: isManager ? "var(--brand)" : "#2563eb",
              }}
            >
              {role.replace("_", " ")}
            </span>
            <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
              • {isManager ? "Full Warehouse Clearance" : "Operator Clearance"}
            </span>
          </div>
        </div>
      </Card>

      {/* Account Settings Form */}
      <Card className="space-y-5">
        <h3 className="text-sm font-semibold border-b pb-2" style={{ borderColor: "var(--border-light)", color: "var(--ink)" }}>
          Personal Information
        </h3>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Full Name" required>
            <input
              className={inputClass()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Email Address" hint="Email is your authentication identifier and cannot be modified directly.">
            <input
              className={inputClass("bg-slate-50 cursor-not-allowed")}
              value={email}
              disabled
            />
          </Field>

          <Field label="Assigned Role" hint="Role determines validation clearances and master configuration privileges.">
            <input
              className={inputClass("bg-slate-50 cursor-not-allowed capitalize font-medium")}
              value={role.replace("_", " ")}
              disabled
            />
          </Field>

          <div className="pt-2">
            <Button type="submit" loading={pending}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Security & Audit Info */}
      <div
        className="p-4 rounded-xl text-xs space-y-1"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border-light)",
          color: "var(--ink-muted)",
        }}
      >
        <p className="font-semibold text-ink">🔒 Double-Entry Audit Trail Notice</p>
        <p>
          All stock moves validated by your account are cryptographically and immutably attributed in the stock ledger
          audit logs for regulatory compliance and full inventory traceability.
        </p>
      </div>
    </div>
  );
}

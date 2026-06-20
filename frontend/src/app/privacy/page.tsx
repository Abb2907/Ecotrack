"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import {
  Shield,
  Download,
  Trash2,
  UndoDot,
  AlertCircle,
  CheckCircle2,
  FileJson,
  Info,
} from "lucide-react";

export default function PrivacyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState(false);
  const [deletionDate, setDeletionDate] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    // Check if user already has a pending deletion (reflected in profile)
    api
      .getProfile()
      .then((p) => {
        if (p.deletionRequested) {
          setDeletionScheduled(true);
          const d = new Date(p.deletionRequested);
          d.setDate(d.getDate() + 7);
          setDeletionDate(d.toLocaleDateString("en-GB", { dateStyle: "long" }));
        }
      })
      .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  function flash(msg: string, isErr = false) {
    if (isErr) {
      setError(msg);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(msg);
      setError(null);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecotrack-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Your data has been exported successfully.");
    } catch {
      flash("Export failed. Please try again.", true);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleScheduleDelete() {
    if (
      !window.confirm(
        "Are you sure? You will have 7 days to cancel before all data is permanently erased."
      )
    )
      return;
    setDeleteLoading(true);
    try {
      const result = await api.scheduleDeletion();
      setDeletionScheduled(true);
      setDeletionDate(
        new Date(result.scheduledDeletionDate).toLocaleDateString("en-GB", { dateStyle: "long" })
      );
      flash("Account deletion scheduled. You have 7 days to cancel.");
    } catch {
      flash("Failed to schedule deletion. Please try again.", true);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleCancelDelete() {
    setCancelLoading(true);
    try {
      await api.cancelDeletion();
      setDeletionScheduled(false);
      setDeletionDate(null);
      flash("Deletion request cancelled. Your account is safe.");
    } catch {
      flash("Failed to cancel deletion. Please try again.", true);
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 text-xs font-bold mb-3">
          <Shield className="h-3.5 w-3.5" /> GDPR Compliant
        </div>
        <h1 className="text-3xl font-extrabold text-brand-text">Privacy & Data Controls</h1>
        <p className="text-brand-muted text-sm mt-1">
          You own your data. Export a full copy at any time, or permanently delete your account with
          a 7-day safety window.
        </p>
      </div>

      {/* Status messages */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-sm font-semibold">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-error/10 border border-brand-error/30 text-brand-error text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {/* Active Deletion Warning */}
      {deletionScheduled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-brand-error/10 border border-brand-error/40">
          <div className="flex items-center gap-3 text-brand-error">
            <Trash2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Account Deletion Scheduled</p>
              <p className="text-xs mt-0.5">
                Permanent erasure on: <strong>{deletionDate}</strong>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelDelete}
            loading={cancelLoading}
            icon={<UndoDot className="h-4 w-4" />}
          >
            Cancel Deletion
          </Button>
        </div>
      )}

      {/* Data Export */}
      <Card hoverable={false}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shrink-0">
            <FileJson className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-brand-text mb-1">Export My Data</h2>
            <p className="text-sm text-brand-muted mb-4">
              Download a complete JSON file containing your profile, carbon baseline, all logged
              activities, and weekly AI recommendations. This satisfies your GDPR Article 20 right
              to data portability.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                "Profile & Preferences",
                "Carbon Baseline",
                "Activity Logs",
                "AI Recommendations",
              ].map((item) => (
                <span
                  key={item}
                  className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-brand-muted border border-brand-border/50"
                >
                  {item}
                </span>
              ))}
            </div>
            <Button
              onClick={handleExport}
              loading={exportLoading}
              icon={<Download className="h-4 w-4" />}
              variant="secondary"
            >
              Download Data Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Deletion */}
      <Card hoverable={false} className="border-brand-error/20">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-error/10 flex items-center justify-center text-brand-error shrink-0">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-brand-text mb-1">Delete My Account</h2>
            <p className="text-sm text-brand-muted mb-4">
              Request permanent deletion of your EcoTrack account and all associated data. A{" "}
              <strong className="text-brand-text">7-day grace period</strong> is enforced before
              irreversible purging — you can cancel anytime during this window.
            </p>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/40 border border-brand-border/50 mb-5">
              <Info className="h-4 w-4 text-brand-muted shrink-0 mt-0.5" />
              <p className="text-xs text-brand-muted">
                Anonymised telemetry already streamed to BigQuery (used only for aggregate
                sustainability research) cannot be retrieved after anonymisation. It contains no
                personally identifiable information.
              </p>
            </div>

            {deletionScheduled ? (
              <p className="text-sm text-brand-muted font-semibold">
                ✓ A deletion has already been scheduled. Use the cancel button above to restore your
                account.
              </p>
            ) : (
              <Button
                variant="danger"
                onClick={handleScheduleDelete}
                loading={deleteLoading}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Schedule Account Deletion
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* GDPR Info */}
      <Card hoverable={false} className="bg-slate-800/20">
        <h3 className="font-bold text-brand-text mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-secondary" /> Your Rights Under GDPR
        </h3>
        <ul className="space-y-2 text-sm text-brand-muted">
          {[
            ["Art. 15", "Right of Access – View all data EcoTrack holds about you"],
            ["Art. 17", "Right to Erasure – Delete your account and all associated data"],
            [
              "Art. 20",
              "Right to Portability – Download your data in machine-readable JSON format",
            ],
            ["Art. 21", "Right to Object – Stop processing your data at any time"],
          ].map(([art, desc]) => (
            <li key={art} className="flex gap-3">
              <span className="font-bold text-brand-secondary shrink-0 w-16">{art}</span>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

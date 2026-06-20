"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api, ActionItem, DailyLog } from "../../lib/api";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import {
  Car, Zap, Utensils, Plus, Trash2, CheckCircle2, AlertCircle,
  Filter, Calendar, Loader2
} from "lucide-react";

const CATEGORY_CONFIG = {
  transport: { label: "Transport", icon: Car, color: "text-brand-secondary", bg: "bg-brand-secondary/10" },
  energy: { label: "Energy", icon: Zap, color: "text-brand-accent", bg: "bg-brand-accent/10" },
  diet: { label: "Diet", icon: Utensils, color: "text-brand-primary", bg: "bg-brand-primary/10" },
};

function SearchParamHandler({ catalog, setSelectedAction, setActiveCategory }: { catalog: ActionItem[], setSelectedAction: any, setActiveCategory: any }) {
  const searchParams = useSearchParams();
  const rec = searchParams.get("rec");

  useEffect(() => {
    if (rec && catalog.length > 0) {
      const search = rec.toLowerCase();
      const words = search.split(/\s+/).filter(w => w.length > 3);
      
      let bestMatch: ActionItem | null = null;
      let maxScore = 0;

      for (const action of catalog) {
        let score = 0;
        const target = (action.title + " " + action.description).toLowerCase();
        for (const w of words) {
           if (target.includes(w)) score++;
        }
        if (score > maxScore) {
          maxScore = score;
          bestMatch = action;
        }
      }

      if (bestMatch) {
         setSelectedAction(bestMatch);
         setActiveCategory(bestMatch.category);
      } else {
         setSelectedAction(catalog[0]);
         setActiveCategory(catalog[0].category);
      }
    }
  }, [rec, catalog, setSelectedAction, setActiveCategory]);

  return null;
}

export default function LogPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [catalog, setCatalog] = useState<ActionItem[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const [catalogData, logsData] = await Promise.all([api.getCatalog(), api.getLogs(20)]);
      setCatalog(catalogData);
      setLogs(logsData);
    } catch (err: any) {
      setError("Failed to load activity data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogAction() {
    if (!selectedAction) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const newLog = await api.logAction(selectedAction.actionId, date, quantity);
      setLogs([newLog, ...logs]);
      setSuccessMsg(`Logged! You saved ${newLog.co2Reduced.toFixed(2)} kg CO₂e.`);
      setSelectedAction(null);
      setQuantity(1);
    } catch (err: any) {
      setError("Failed to log action. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    setDeletingId(logId);
    try {
      await api.deleteLog(logId);
      setLogs(logs.filter((l) => l.logId !== logId));
    } catch {
      setError("Failed to delete log.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredCatalog = activeCategory === "all"
    ? catalog
    : catalog.filter((a) => a.category === activeCategory);

  const totalSaved = logs.reduce((a, b) => a + b.co2Reduced, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-brand-muted font-semibold">Loading action catalog…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <SearchParamHandler catalog={catalog} setSelectedAction={setSelectedAction} setActiveCategory={setActiveCategory} />
      </Suspense>

      <div>
        <h1 className="text-3xl font-extrabold text-brand-text">Log Daily Actions</h1>
        <p className="text-brand-muted text-sm mt-1">
          Record a green habit from the catalog and track your CO₂ reduction in real time.
        </p>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="py-4" hoverable={false}>
          <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">Today's Total Saved</p>
          <p className="text-2xl font-extrabold text-brand-primary mt-1">
            {logs.filter(l => l.date === date).reduce((a, b) => a + b.co2Reduced, 0).toFixed(2)}{" "}
            <span className="text-xs text-brand-muted font-normal">kg CO₂e</span>
          </p>
        </Card>
        <Card className="py-4" hoverable={false}>
          <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">All-Time Saved</p>
          <p className="text-2xl font-extrabold text-brand-secondary mt-1">
            {totalSaved.toFixed(2)}{" "}
            <span className="text-xs text-brand-muted font-normal">kg CO₂e</span>
          </p>
        </Card>
        <Card className="py-4 hidden md:block" hoverable={false}>
          <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">Actions Logged</p>
          <p className="text-2xl font-extrabold text-brand-accent mt-1">{logs.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Catalog Panel (left, 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card hoverable={false}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-muted" /> Action Catalog
              </h2>
              <div className="flex gap-2">
                {["all", "transport", "energy", "diet"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                      activeCategory === cat
                        ? "bg-brand-primary text-brand-dark"
                        : "bg-slate-800 text-brand-muted hover:text-brand-text"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredCatalog.length === 0 && (
                <p className="text-center text-brand-muted text-sm py-8">No actions in this category.</p>
              )}
              {filteredCatalog.map((action) => {
                const cfg = CATEGORY_CONFIG[action.category];
                const Icon = cfg.icon;
                const isSelected = selectedAction?.actionId === action.actionId;
                return (
                  <button
                    key={action.actionId}
                    onClick={() => setSelectedAction(isSelected ? null : action)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-brand-primary bg-brand-primary/10"
                        : "border-brand-border hover:border-slate-600 bg-slate-800/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-brand-text text-sm truncate">{action.title}</div>
                        <div className="text-xs text-brand-muted">{action.description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${cfg.color}`}>
                          -{action.baseReduction} kg
                        </div>
                        <div className="text-[10px] text-brand-muted">per {action.unit}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Log Form (right, 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card hoverable={false}>
            <h2 className="text-lg font-bold text-brand-text mb-4">Record Entry</h2>

            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-sm font-semibold mb-4">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-error/10 border border-brand-error/30 text-brand-error text-sm font-semibold mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Selected Action Preview */}
            {selectedAction ? (
              <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 mb-4">
                <p className="text-xs text-brand-muted font-bold uppercase">Selected Action</p>
                <p className="font-bold text-brand-text mt-0.5">{selectedAction.title}</p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {selectedAction.baseReduction} kg CO₂e per {selectedAction.unit}
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-brand-border text-center text-brand-muted text-sm mb-4">
                ← Select an action from the catalog
              </div>
            )}

            {/* Date */}
            <div className="space-y-1 mb-4">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full bg-slate-800/60 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-1 mb-6">
              <label className="text-xs font-bold text-brand-muted uppercase tracking-wider">
                Quantity ({selectedAction?.unit ?? "units"})
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800/60 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
              />
              {selectedAction && (
                <p className="text-xs text-brand-primary font-bold">
                  Estimated saving: {(selectedAction.baseReduction * quantity).toFixed(3)} kg CO₂e
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleLogAction}
              disabled={!selectedAction}
              loading={submitting}
              icon={<Plus className="h-4 w-4" />}
            >
              Log Action
            </Button>
          </Card>
        </div>
      </div>

      {/* Activity History */}
      <Card hoverable={false}>
        <h2 className="text-lg font-bold text-brand-text mb-4">Activity History</h2>
        {logs.length === 0 ? (
          <p className="text-center text-brand-muted py-8 text-sm">No activities logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-brand-border">
                <tr className="text-xs text-brand-muted uppercase font-bold">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Action</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4 text-right">Qty</th>
                  <th className="py-3 pr-4 text-right">CO₂ Saved</th>
                  <th className="py-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {logs.map((log) => {
                  const cfg = CATEGORY_CONFIG[log.category];
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.logId} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 pr-4 text-brand-muted">{log.date}</td>
                      <td className="py-3 pr-4 font-semibold text-brand-text capitalize">
                        {log.actionId.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${cfg.bg} ${cfg.color}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-brand-muted">{log.quantity}</td>
                      <td className="py-3 pr-4 text-right font-bold text-brand-primary">
                        -{log.co2Reduced.toFixed(3)} kg
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.logId)}
                          disabled={deletingId === log.logId}
                          className="p-1.5 rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-all disabled:opacity-40"
                        >
                          {deletingId === log.logId
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

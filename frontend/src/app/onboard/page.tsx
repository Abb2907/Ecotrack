"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { Car, Zap, Utensils, ArrowRight, ArrowLeft, CheckCircle2, Leaf } from "lucide-react";

interface StepData {
  transport: number;
  energy: number;
  diet: number;
}

const STEPS = ["Transport", "Energy", "Diet", "Review"];

const TRANSPORT_OPTIONS = [
  { label: "Heavy Driver (>50 km/day by gasoline car)", value: 9.6 },
  { label: "Moderate Driver (20–50 km/day)", value: 4.8 },
  { label: "Occasional Driver (<20 km/day)", value: 2.4 },
  { label: "Electric Vehicle User", value: 1.1 },
  { label: "Public Transit / Cycle", value: 0.5 },
  { label: "Remote Worker / Walker", value: 0.1 },
];

const ENERGY_OPTIONS = [
  { label: "Large home, gas heating (>200 kWh/day)", value: 12.0 },
  { label: "Medium home, mixed energy (100–200 kWh/day)", value: 6.5 },
  { label: "Small apartment, grid electric (<100 kWh/day)", value: 3.7 },
  { label: "Energy-efficient home with solar panels", value: 1.2 },
  { label: "Zero-energy / off-grid setup", value: 0.3 },
];

const DIET_OPTIONS = [
  { label: "Meat-heavy (most days)", value: 7.2 },
  { label: "Mixed omnivore (meat a few times a week)", value: 4.5 },
  { label: "Pescatarian (fish, no red meat)", value: 3.0 },
  { label: "Vegetarian (no meat)", value: 2.1 },
  { label: "Vegan (no animal products)", value: 1.1 },
];

export default function OnboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({ transport: 0, energy: 0, diet: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    router.push("/");
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateBaseline(data.transport, data.energy, data.diet);
      router.push("/");
    } catch (err: any) {
      setError("Failed to save baseline. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isStepComplete = (s: number) => {
    if (s === 0) return data.transport > 0;
    if (s === 1) return data.energy > 0;
    if (s === 2) return data.diet > 0;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold border border-brand-primary/20 mb-2">
          <Leaf className="h-3.5 w-3.5" /> Step {step + 1} of {STEPS.length}
        </div>
        <h1 className="text-3xl font-extrabold text-brand-text">Set Your Carbon Baseline</h1>
        <p className="text-brand-muted text-sm">
          Choose the option that best describes your daily lifestyle. You can always update this
          later.
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-brand-primary" : "bg-slate-700"
              }`}
            />
            <p
              className={`text-xs mt-1.5 font-semibold text-center ${i <= step ? "text-brand-primary" : "text-brand-muted"}`}
            >
              {s}
            </p>
          </div>
        ))}
      </div>

      {/* Step 0 — Transport */}
      {step === 0 && (
        <Card hoverable={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-brand-text">Daily Transportation</h2>
              <p className="text-xs text-brand-muted">
                How do you typically commute or travel each day?
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {TRANSPORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, transport: opt.value })}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                  data.transport === opt.value
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-brand-border text-brand-muted hover:border-slate-600 hover:text-brand-text"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{opt.label}</span>
                  <span className="text-xs font-bold opacity-60">{opt.value} kg CO₂e</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Step 1 — Energy */}
      {step === 1 && (
        <Card hoverable={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-brand-text">Home Energy Usage</h2>
              <p className="text-xs text-brand-muted">
                What best describes your home&apos;s energy consumption?
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {ENERGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, energy: opt.value })}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                  data.energy === opt.value
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-brand-border text-brand-muted hover:border-slate-600 hover:text-brand-text"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{opt.label}</span>
                  <span className="text-xs font-bold opacity-60">{opt.value} kg CO₂e</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Step 2 — Diet */}
      {step === 2 && (
        <Card hoverable={false}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-brand-text">Dietary Habits</h2>
              <p className="text-xs text-brand-muted">
                Which eating pattern best matches your regular diet?
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {DIET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setData({ ...data, diet: opt.value })}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                  data.diet === opt.value
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-brand-border text-brand-muted hover:border-slate-600 hover:text-brand-text"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{opt.label}</span>
                  <span className="text-xs font-bold opacity-60">{opt.value} kg CO₂e</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <Card hoverable={false}>
          <h2 className="text-xl font-bold text-brand-text mb-6">Review Your Baseline</h2>
          <div className="space-y-4">
            {[
              {
                label: "Transport",
                icon: Car,
                value: data.transport,
                color: "text-brand-secondary",
              },
              { label: "Home Energy", icon: Zap, value: data.energy, color: "text-brand-accent" },
              { label: "Diet", icon: Utensils, value: data.diet, color: "text-brand-primary" },
            ].map(({ label, icon: Icon, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-brand-border/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="font-semibold text-brand-text">{label}</span>
                </div>
                <span className={`text-lg font-bold ${color}`}>
                  {value.toFixed(1)}{" "}
                  <span className="text-xs text-brand-muted font-normal">kg CO₂e/day</span>
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/30 mt-2">
              <span className="font-bold text-brand-text">Total Daily Baseline</span>
              <span className="text-xl font-extrabold text-brand-primary">
                {(data.transport + data.energy + data.diet).toFixed(1)}{" "}
                <span className="text-xs font-normal text-brand-muted">kg CO₂e/day</span>
              </span>
            </div>
          </div>
          {error && <p className="text-brand-error text-sm mt-4 font-semibold">{error}</p>}
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!isStepComplete(step)}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            Next: {STEPS[step + 1]}
          </Button>
        ) : (
          <Button onClick={handleSave} loading={saving} icon={<CheckCircle2 className="h-4 w-4" />}>
            Save & Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import {
  Car, Zap, Utensils, Calculator, Loader2, AlertCircle, BarChart3,
  ArrowRight
} from "lucide-react";

type Category = "transport" | "energy" | "diet";

interface CalcResult {
  category: Category;
  co2_kg: number;
  label: string;
}

const TRANSPORT_MODES = [
  { value: "gasoline_car", label: "Gasoline Car", factor: "~0.19 kg/km" },
  { value: "diesel_car", label: "Diesel Car", factor: "~0.17 kg/km" },
  { value: "electric_car", label: "Electric Car", factor: "~0.05 kg/km" },
  { value: "bus", label: "Bus", factor: "~0.09 kg/km" },
  { value: "train", label: "Train", factor: "~0.04 kg/km" },
];

const ENERGY_SOURCES = [
  { value: "grid_electricity", label: "Grid Electricity", factor: "~0.37 kg/kWh" },
  { value: "natural_gas", label: "Natural Gas", factor: "~0.18 kg/kWh" },
  { value: "heating_oil", label: "Heating Oil", factor: "~0.27 kg/kWh" },
];

const DIET_TYPES = [
  { value: "meat_heavy", label: "Meat-Heavy", factor: "~3.2 kg/meal" },
  { value: "vegetarian", label: "Vegetarian", factor: "~1.2 kg/meal" },
  { value: "vegan", label: "Vegan", factor: "~0.7 kg/meal" },
];

const CATEGORY_CONFIG = {
  transport: { label: "Transport", icon: Car, color: "text-brand-secondary", bg: "bg-brand-secondary/10" },
  energy: { label: "Energy", icon: Zap, color: "text-brand-accent", bg: "bg-brand-accent/10" },
  diet: { label: "Diet", icon: Utensils, color: "text-brand-primary", bg: "bg-brand-primary/10" },
};

export default function CalculatorPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Category>("transport");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CalcResult[]>([]);

  // Transport state
  const [distance, setDistance] = useState(10);
  const [mode, setMode] = useState("gasoline_car");

  // Energy state
  const [kwh, setKwh] = useState(50);
  const [source, setSource] = useState("grid_electricity");

  // Diet state
  const [meals, setMeals] = useState(3);
  const [dietType, setDietType] = useState("meat_heavy");

  if (!user) {
    router.push("/");
    return null;
  }

  async function handleCalculate() {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const token = user ? await user.getIdToken() : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      let endpoint = "";
      let body = {};
      let label = "";

      if (activeTab === "transport") {
        endpoint = `${BACKEND_URL}/api/v1/calculator/transport`;
        body = { distance_km: distance, mode };
        label = `${distance} km by ${mode.replace(/_/g, " ")}`;
      } else if (activeTab === "energy") {
        endpoint = `${BACKEND_URL}/api/v1/calculator/energy`;
        body = { kwh, source };
        label = `${kwh} kWh of ${source.replace(/_/g, " ")}`;
      } else {
        endpoint = `${BACKEND_URL}/api/v1/calculator/diet`;
        body = { meals, diet_type: dietType };
        label = `${meals} ${dietType.replace(/_/g, " ")} meals`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setResults((prev) => [
        { category: activeTab, co2_kg: data.co2_kg, label },
        ...prev.slice(0, 9),
      ]);
    } catch (err: any) {
      setError("Calculation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalEmissions = results.reduce((a, b) => a + b.co2_kg, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold border border-brand-accent/20 mb-2">
            <Calculator className="h-3.5 w-3.5" /> Emission Factor Calculator
          </div>
          <h1 className="text-3xl font-extrabold text-brand-text">Carbon Calculator</h1>
          <p className="text-brand-muted text-sm mt-1">
            Estimate your emissions across transport, energy, and diet using certified GHG Protocol factors.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/onboard")} icon={<BarChart3 className="h-4 w-4" />}>
          Update Baseline
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-error/10 border border-brand-error/30 text-brand-error text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calculator Form */}
        <div className="lg:col-span-3">
          <Card hoverable={false}>
            {/* Category Tabs */}
            <div className="flex gap-2 mb-6">
              {(["transport", "energy", "diet"] as Category[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      activeTab === cat
                        ? `${cfg.bg} ${cfg.color} border border-current`
                        : "bg-slate-800/40 text-brand-muted hover:text-brand-text border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Transport Form */}
            {activeTab === "transport" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-2">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={distance}
                    onChange={(e) => setDistance(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800/60 border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-2">
                    Transport Mode
                  </label>
                  <div className="space-y-2">
                    {TRANSPORT_MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMode(m.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                          mode === m.value
                            ? "border-brand-secondary bg-brand-secondary/10 text-brand-secondary"
                            : "border-brand-border text-brand-muted hover:border-slate-600 hover:text-brand-text"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{m.label}</span>
                          <span className="text-xs font-bold opacity-60">{m.factor}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Energy Form */}
            {activeTab === "energy" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-2">
                    Energy Usage (kWh)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={kwh}
                    onChange={(e) => setKwh(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800/60 border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-2">
                    Energy Source
                  </label>
                  <div className="space-y-2">
                    {ENERGY_SOURCES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSource(s.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                          source === s.value
                            ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                            : "border-brand-border text-brand-muted hover:border-slate-600 hover:text-brand-text"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{s.label}</span>
                          <span className="text-xs font-bold opacity-60">{s.factor}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Diet Form */}
            {activeTab === "diet" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-2">
                    Number of Meals
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={meals}
                    onChange={(e) => setMeals(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800/60 border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-brand-muted uppercase tracking-wider block mb-2">
                    Diet Type
                  </label>
                  <div className="space-y-2">
                    {DIET_TYPES.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDietType(d.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                          dietType === d.value
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-brand-border text-brand-muted hover:border-slate-600 hover:text-brand-text"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{d.label}</span>
                          <span className="text-xs font-bold opacity-60">{d.factor}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full mt-6" onClick={handleCalculate} loading={loading} icon={<Calculator className="h-4 w-4" />}>
              Calculate Emissions
            </Button>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card hoverable={false}>
            <h2 className="text-lg font-bold text-brand-text mb-4">Calculation Results</h2>

            {results.length === 0 ? (
              <div className="py-8 text-center text-brand-muted text-sm font-semibold">
                Run a calculation to see your emission estimates here.
              </div>
            ) : (
              <>
                {/* Total Summary */}
                <div className="p-4 rounded-xl bg-brand-error/10 border border-brand-error/30 mb-4">
                  <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">Total Estimated Emissions</p>
                  <p className="text-2xl font-extrabold text-brand-error mt-1">
                    {totalEmissions.toFixed(2)} <span className="text-xs font-normal text-brand-muted">kg CO₂e</span>
                  </p>
                </div>

                {/* Results List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {results.map((r, idx) => {
                    const cfg = CATEGORY_CONFIG[r.category];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-brand-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-brand-text capitalize">{r.label}</p>
                            <p className="text-xs text-brand-muted">{cfg.label}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-brand-error">{r.co2_kg.toFixed(4)} kg</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          {/* Action CTA */}
          <Card hoverable className="text-center">
            <p className="text-sm text-brand-muted mb-3">Ready to reduce your footprint?</p>
            <Button className="w-full" onClick={() => router.push("/log")} icon={<ArrowRight className="h-4 w-4" />}>
              Log a Reduction Action
            </Button>
          </Card>
        </div>
      </div>

      {/* Accessible Data Table Summary */}
      {results.length > 0 && (
        <Card hoverable={false}>
          <h3 className="text-lg font-bold text-brand-text mb-3">Results Summary (Accessible Table)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Carbon emission calculation results</caption>
              <thead className="border-b border-brand-border">
                <tr className="text-xs text-brand-muted uppercase font-bold">
                  <th scope="col" className="py-3 pr-4">#</th>
                  <th scope="col" className="py-3 pr-4">Category</th>
                  <th scope="col" className="py-3 pr-4">Description</th>
                  <th scope="col" className="py-3 text-right">CO₂ (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 pr-4 text-brand-muted">{idx + 1}</td>
                    <td className="py-3 pr-4 font-semibold text-brand-text capitalize">{r.category}</td>
                    <td className="py-3 pr-4 text-brand-muted capitalize">{r.label}</td>
                    <td className="py-3 text-right font-bold text-brand-error">{r.co2_kg.toFixed(4)}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t border-brand-border">
                  <td colSpan={3} className="py-3 text-brand-text">Total</td>
                  <td className="py-3 text-right text-brand-error">{totalEmissions.toFixed(4)} kg</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

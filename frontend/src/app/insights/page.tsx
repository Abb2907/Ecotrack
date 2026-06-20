"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, WeeklyInsights, RecommendationItem } from "../../lib/api";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import {
  Sparkles, RefreshCw, TrendingUp, Zap, Leaf, ChevronRight,
  AlertCircle, Loader2, Clock, Award
} from "lucide-react";

const IMPACT_CONFIG = {
  high: { label: "High Impact", color: "text-brand-primary", bg: "bg-brand-primary/10", border: "border-brand-primary/30" },
  medium: { label: "Medium Impact", color: "text-brand-accent", bg: "bg-brand-accent/10", border: "border-brand-accent/30" },
  low: { label: "Low Impact", color: "text-brand-secondary", bg: "bg-brand-secondary/10", border: "border-brand-secondary/30" },
};

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "text-brand-primary" },
  moderate: { label: "Moderate", color: "text-brand-accent" },
  hard: { label: "Hard", color: "text-brand-error" },
};

function RecommendationCard({ rec }: { rec: RecommendationItem }) {
  const impact = IMPACT_CONFIG[rec.impact];
  const diff = DIFFICULTY_CONFIG[rec.difficulty];

  return (
    <Card className={`border ${impact.border}`} hoverable>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-bold text-brand-text text-base leading-snug">{rec.title}</h3>
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${impact.bg} ${impact.color}`}>
          {impact.label}
        </span>
      </div>
      <p className="text-sm text-brand-muted leading-relaxed mb-4">{rec.description}</p>
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-brand-muted flex items-center gap-1">
          <Award className="h-3.5 w-3.5" /> Difficulty:{" "}
          <span className={diff.color}>{diff.label}</span>
        </span>
        <Link href={`/log?rec=${encodeURIComponent(rec.title)}`} className={`flex items-center gap-1 ${impact.color} hover:underline transition-all`}>
          Log this action <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export default function InsightsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [insights, setInsights] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseSafeDate = (d: any) => {
    if (!d) return Date.now();
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? Date.now() : parsed;
  };

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    loadInsights();
  }, [user]);

  async function loadInsights() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLatestInsights();
      setInsights(data);
    } catch {
      // 404 means no insights yet — not an error
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.generateInsights();
      setInsights(data);
    } catch (err: any) {
      setError("Failed to generate recommendations. Please ensure your baseline and recent logs are set up.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="text-brand-muted font-semibold">Loading AI recommendations…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold border border-brand-primary/20 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Powered by Google Gemini
          </div>
          <h1 className="text-3xl font-extrabold text-brand-text">Weekly AI Insights</h1>
          <p className="text-brand-muted text-sm mt-1">
            Personalized recommendations generated using your carbon baseline and recent activity logs.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          loading={generating}
          icon={<RefreshCw className="h-4 w-4" />}
          variant={insights ? "outline" : "primary"}
        >
          {insights ? "Regenerate Insights" : "Generate My Insights"}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-error/10 border border-brand-error/30 text-brand-error text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      {/* Empty state */}
      {!insights && !error && (
        <Card hoverable={false} className="text-center py-16">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-primary/10 text-brand-primary mb-4 mx-auto">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-brand-text mb-2">No Insights Generated Yet</h2>
          <p className="text-brand-muted text-sm max-w-md mx-auto mb-6">
            Click &quot;Generate My Insights&quot; to let Google Gemini analyse your activity logs and produce a personalised sustainability action plan.
          </p>
          <Button onClick={handleGenerate} loading={generating} icon={<Sparkles className="h-4 w-4" />}>
            Generate My Insights
          </Button>
        </Card>
      )}

      {/* Insights Content */}
      {insights && (
        <>
          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-brand-muted font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Generated: {new Date(parseSafeDate(insights.createdAt)).toLocaleDateString("en-GB", { dateStyle: "long" })}
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-brand-primary" />
              {insights.recommendations.length} Personalised Recommendations
            </span>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            {(["high", "medium", "low"] as const).map((imp) => {
              const count = insights.recommendations.filter((r) => r.impact === imp).length;
              if (!count) return null;
              const cfg = IMPACT_CONFIG[imp];
              return (
                <div key={imp} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                  {imp === "high" ? <Leaf className="h-3.5 w-3.5" /> : imp === "medium" ? <Zap className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                  {count} {cfg.label}
                </div>
              );
            })}
          </div>

          {/* Recommendation cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} rec={rec} />
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-brand-muted text-center border-t border-brand-border/40 pt-6">
            Recommendations are generated by Google Gemini (Vertex AI) and based on your personal activity data. Estimates use certified GHG Protocol emission factors.
          </p>
        </>
      )}
    </div>
  );
}

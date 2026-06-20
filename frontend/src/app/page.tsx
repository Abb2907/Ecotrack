"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { api, UserProfile, DailyLog } from "../lib/api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { 
  Leaf, 
  TrendingDown, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Car, 
  Zap, 
  Utensils, 
  AlertCircle,
  FileCheck
} from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load User Profile from Firestore (registers profile if not existing)
        let userProfile: UserProfile;
        try {
          userProfile = await api.getProfile();
        } catch (err: any) {
          // If profile not found, try to auto-register
          if (user?.displayName && user?.email) {
            userProfile = await api.registerUser(user.displayName, user.email);
          } else {
            throw err;
          }
        }

        setProfile(userProfile);
        
        // Redirect to onboarding page if user has not filled in their baseline metrics yet
        if (
          userProfile.carbonBaseline.transport === 0 &&
          userProfile.carbonBaseline.energy === 0 &&
          userProfile.carbonBaseline.diet === 0
        ) {
          router.push("/onboard");
          return;
        }

        // Fetch recent logs
        const recentLogs = await api.getLogs(5);
        setLogs(recentLogs);
      } catch (err: any) {
        console.error("Dashboard Loading Error:", err);
        setError("Could not load your sustainability dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user, authLoading, router]);

  // Calculate stats
  const totalBaseline = profile?.carbonBaseline?.total || 0;
  const totalReduced = logs.reduce((acc, curr) => acc + curr.co2Reduced, 0);
  const currentFootprint = Math.max(0, totalBaseline - totalReduced);
  const percentageReduced = totalBaseline > 0 ? (totalReduced / totalBaseline) * 100 : 0;

  // Unauthenticated Welcome State
  if (!user && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center">
        {/* Decorative Gradients */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 -z-10 w-72 h-72 md:w-96 md:h-96 rounded-full bg-brand-primary/10 blur-[100px]" />
        
        <div className="max-w-3xl px-4 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold uppercase tracking-wider border border-brand-primary/20">
            <Leaf className="h-3.5 w-3.5" />
            Empowering Personal Decarbonization
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-brand-text via-brand-secondary to-brand-primary bg-clip-text text-transparent leading-none">
            Track, Reduce, and Optimize Your Carbon Footprint
          </h1>
          
          <p className="text-lg md:text-xl text-brand-muted max-w-2xl mx-auto font-medium">
            EcoTrack connects with certified carbon models and Vertex AI to give you real-time feedback, daily tracking actions, and smart recommendations.
          </p>

          <div className="flex justify-center gap-4 pt-6">
            <Button size="lg" onClick={() => router.push("/log")}>
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-20 px-4">
          <Card>
            <div className="h-10 w-10 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary mb-4">
              <Leaf className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-brand-text mb-2">Daily Logging</h3>
            <p className="text-sm text-brand-muted">
              Instantly record conscious actions like cycling, eating vegan meals, and conserving power to track exact reduction values.
            </p>
          </Card>
          
          <Card>
            <div className="h-10 w-10 bg-brand-secondary/10 rounded-lg flex items-center justify-center text-brand-secondary mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-brand-text mb-2">Vertex AI Insights</h3>
            <p className="text-sm text-brand-muted">
              Get customized weekly suggestions generated by Google Gemini using your baseline data and active log trends.
            </p>
          </Card>
          
          <Card>
            <div className="h-10 w-10 bg-brand-accent/10 rounded-lg flex items-center justify-center text-brand-accent mb-4">
              <FileCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-brand-text mb-2">GDPR Controlled</h3>
            <p className="text-sm text-brand-muted">
              Full data transparency. Export all profile activity logs or trigger safe deletion requests with a 7-day recovery grace period.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
        <p className="text-brand-muted text-sm font-semibold">Loading EcoTrack Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-xl mx-auto mt-8 border-brand-error/20">
        <div className="flex gap-3 text-brand-error">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Failed to load data</h3>
            <p className="text-sm mt-1">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* GDPR Deletion Requested Warning Banner */}
      {profile?.deletionRequested && (
        <div className="flex items-center gap-3 p-4 bg-brand-error/10 border border-brand-error/30 rounded-xl text-brand-error">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <span className="font-bold">Account Scheduled for Deletion:</span> Your account and telemetry logs will be permanently deleted. You can cancel this request anytime on the{" "}
            <Link href="/privacy" className="underline font-semibold hover:text-brand-text transition-colors">
              Privacy Settings
            </Link>{" "}
            page.
          </div>
        </div>
      )}

      {/* Header Profile Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-text">
            Welcome back, {profile?.displayName}!
          </h1>
          <p className="text-brand-muted text-sm font-medium mt-1">
            Analyze your daily sustainability targets and track emission reductions.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/log")}>
            Log Activity
          </Button>
          <Button onClick={() => router.push("/insights")} icon={<Sparkles className="h-4 w-4" />}>
            AI Insights
          </Button>
        </div>
      </div>

      {/* Primary Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Carbon Baseline Target</span>
            <div className="text-3xl font-bold text-brand-text mt-1">{totalBaseline.toFixed(1)} <span className="text-sm text-brand-muted">kg CO2e/day</span></div>
            <p className="text-xs text-brand-muted mt-2">
              Based on onboarding transportation, home utilities, and diet parameters.
            </p>
          </div>
          <div className="mt-6 border-t border-brand-border/60 pt-4 flex gap-4 text-xs text-brand-muted">
            <div className="flex items-center gap-1"><Car className="h-3.5 w-3.5 text-brand-secondary" /> {profile?.carbonBaseline.transport.toFixed(1)}</div>
            <div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-brand-accent" /> {profile?.carbonBaseline.energy.toFixed(1)}</div>
            <div className="flex items-center gap-1"><Utensils className="h-3.5 w-3.5 text-brand-primary" /> {profile?.carbonBaseline.diet.toFixed(1)}</div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Carbon Saved Today</span>
            <div className="text-3xl font-bold text-brand-primary mt-1">-{totalReduced.toFixed(1)} <span className="text-sm text-brand-muted">kg CO2e</span></div>
            <p className="text-xs text-brand-muted mt-2">
              Total greenhouse gas emissions mitigated through active green habits.
            </p>
          </div>
          <div className="mt-6">
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className="bg-brand-primary h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, percentageReduced)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-brand-muted mt-1.5 font-bold">
              <span>0% saved</span>
              <span>{percentageReduced.toFixed(0)}% of baseline target</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">Net Carbon Footprint</span>
            <div className="text-3xl font-bold text-brand-secondary mt-1">{currentFootprint.toFixed(1)} <span className="text-sm text-brand-muted">kg CO2e/day</span></div>
            <p className="text-xs text-brand-muted mt-2">
              Your real carbon balance remaining after factoring completed logs.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs text-brand-primary font-bold bg-brand-primary/10 border border-brand-primary/20 px-3 py-1.5 rounded-lg w-max">
            <TrendingDown className="h-4 w-4" />
            <span>Progress: On Track</span>
          </div>
        </Card>
      </div>

      {/* Double Column Panel: Recent Logs and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Logs Table */}
        <Card hoverable={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-brand-text">Recent Logged Activities</h3>
            <Link href="/log" className="text-xs text-brand-primary hover:underline font-bold">
              View History
            </Link>
          </div>
          
          {logs.length === 0 ? (
            <div className="py-8 text-center text-brand-muted text-sm font-semibold">
              No actions logged yet. Go to &quot;Log Activity&quot; to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-brand-muted">
                <thead className="text-xs text-brand-text uppercase border-b border-brand-border/60">
                  <tr>
                    <th scope="col" className="py-3">Date</th>
                    <th scope="col" className="py-3">Activity</th>
                    <th scope="col" className="py-3 text-right">CO2 Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.logId} className="border-b border-brand-border/30 hover:bg-slate-800/10">
                      <td className="py-3 font-medium">{log.date}</td>
                      <td className="py-3 text-brand-text font-bold capitalize">
                        {log.actionId.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 text-right text-brand-primary font-bold">
                        -{log.co2Reduced.toFixed(2)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* AI Recommendations Quick Card */}
        <Card hoverable={false} className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <h3 className="text-lg font-bold text-brand-text">AI Recommendation Preview</h3>
            </div>
            <p className="text-sm text-brand-muted leading-relaxed">
              Google Gemini generates weekly actionable reduction ideas using your logged activities and baseline habits.
            </p>
            <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-brand-muted space-y-2">
              <div className="font-bold text-brand-text flex items-center gap-1.5">
                <Leaf className="h-3.5 w-3.5 text-brand-primary" />
                Latest Recommendations:
              </div>
              <p>Explore target recommendations around transportation optimizations, energy reductions, and daily actions.</p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-brand-border/40">
            <Button className="w-full" onClick={() => router.push("/insights")}>
              View Full AI Report
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Search, Brain, BarChart3, Send, Shield, Zap,
  ArrowRight, Check, Star, ChevronRight, Globe, Target,
  Mail, Lock, User, Eye, EyeOff, Building2, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PLANS } from '@/lib/plans';
import type { AuthView } from '@/lib/types';
import { toast } from 'sonner';
import { useSession, signIn } from 'next-auth/react';

interface AuthPageProps {
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  onAuthSuccess: () => void;
}

// Static class maps — Tailwind v4 cannot detect dynamically interpolated class names.
const FEATURE_CARD_STYLES: Record<string, string> = {
  emerald: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  sky: 'bg-sky-500/10',
  violet: 'bg-violet-500/10',
  rose: 'bg-rose-500/10',
  teal: 'bg-teal-500/10',
};

const FEATURE_ICON_STYLES: Record<string, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  sky: 'text-sky-400',
  violet: 'text-violet-400',
  rose: 'text-rose-400',
  teal: 'text-teal-400',
};

// ============================================
// Landing Page
// ============================================
function LandingPage({ onAuthViewChange }: { onAuthViewChange: (v: AuthView) => void }) {
  return (
    <div className="min-h-screen bg-background animated-gradient-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-semibold">
              <span className="gradient-text">LeadFinder</span>
              <span className="ml-1 text-muted-foreground">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onAuthViewChange('login')}>Sign In</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => onAuthViewChange('register')}>
              Get Started Free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <Zap className="mr-1.5 h-3.5 w-3.5" /> AI-Powered Lead Discovery
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Find, Score & Close
              <br />
              <span className="gradient-text">Your Best Leads</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              The intelligent lead finder for data analysts. Discover high-value prospects, score them with AI, and generate personalized outreach — all in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 px-8 text-base" onClick={() => onAuthViewChange('register')}>
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => onAuthViewChange('login')}>
                Sign In to Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need to find & close leads</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            From discovery to conversion, LeadFinder AI automates the entire pipeline for freelance data analysts.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'Smart Discovery', desc: 'Find businesses by location, industry, and size with AI-powered discovery engine.', color: 'emerald' },
              { icon: Brain, title: 'AI Lead Scoring', desc: 'Multi-factor scoring algorithm rates every lead 0-100 based on data needs, growth potential, and readiness.', color: 'amber' },
              { icon: Send, title: 'Cold Outreach AI', desc: 'Generate personalized cold emails, LinkedIn messages, and call scripts tailored to each prospect.', color: 'sky' },
              { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track pipeline performance, score distributions, industry breakdowns, and conversion rates.', color: 'violet' },
              { icon: Target, title: 'CRM Built-In', desc: 'Manage pipeline stages, track activities, add notes, and never lose a follow-up.', color: 'rose' },
              { icon: Globe, title: 'Multi-Source Data', desc: 'Pull from Google Maps, LinkedIn, business directories and more — all in one search.', color: 'teal' },
            ].map((feature, i) => {
              return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="glass-card h-full hover:glow-emerald transition-shadow duration-300 border-border/50">
                  <CardHeader>
                    <div className={`h-10 w-10 rounded-lg ${FEATURE_CARD_STYLES[feature.color] || FEATURE_CARD_STYLES.emerald} flex items-center justify-center mb-2`}>
                      <feature.icon className={`h-5 w-5 ${FEATURE_ICON_STYLES[feature.color] || FEATURE_ICON_STYLES.emerald}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
              );
          })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <blockquote className="text-xl font-medium mb-4">
            &ldquo;LeadFinder AI cut my prospecting time by 80%. The AI scoring is incredibly accurate — my best clients all scored 85+.&rdquo;
          </blockquote>
          <p className="text-muted-foreground">Sarah Chen, Freelance Data Analyst</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to find your next client?</h2>
          <p className="text-muted-foreground mb-8">Join hundreds of data analysts using AI to build their pipeline.</p>
          <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 px-8 text-base" onClick={() => onAuthViewChange('register')}>
            Get Started Free — No Credit Card <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> 50 free credits/month</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> AI scoring included</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> No credit card required</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>&copy; 2026 LeadFinder AI</span>
          <div className="flex items-center gap-4">
            <Shield className="h-4 w-4" /> SOC 2 Compliant
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// Login Form
// ============================================
function LoginForm({ onAuthViewChange, onAuthSuccess }: { onAuthViewChange: (v: AuthView) => void; onAuthSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  // If already logged in, redirect
  if (session?.user) {
    onAuthSuccess();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid email or password');
      } else {
        toast.success('Welcome back!');
        onAuthSuccess();
      }
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email first, then click "Forgot password?"');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.resetLink) {
        toast.success('Reset link generated! (Dev mode)', {
          description: data.resetLink,
          duration: 15000,
        });
        window.open(data.resetLink, '_blank');
      } else {
        toast.success('If that email exists, a reset link has been sent.');
      }
    } catch {
      toast.error('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: 'admin@leadfinder.ai',
        password: 'demo1234',
        redirect: false,
      });
      if (result?.error) {
        toast.error('Demo account not available. Please register first.');
      } else {
        toast.success('Welcome to the demo!');
        onAuthSuccess();
      }
    } catch {
      toast.error('Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <Card className="glass-card border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your LeadFinder AI account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={handleForgotPassword} disabled={isLoading} className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDemoLogin} disabled={isLoading}>
              Try Demo Account
            </Button>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button onClick={() => onAuthViewChange('register')} className="text-emerald-400 hover:text-emerald-300 font-medium">
                Sign up free
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

// ============================================
// Register Form
// ============================================
function RegisterForm({ onAuthViewChange, onAuthSuccess }: { onAuthViewChange: (v: AuthView) => void; onAuthSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, orgName }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.success('Account created! Please sign in.');
        onAuthViewChange('login');
      } else {
        toast.success('Account created! Welcome to LeadFinder AI!');
        onAuthSuccess();
      }
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center px-4 py-8">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <Card className="glass-card border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Start your free trial — no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org">Team Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="org" placeholder="My Team" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="reg-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Free plan includes:</p>
                <ul className="space-y-0.5">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> 50 discovery credits/month</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> AI lead scoring (10/month)</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> AI outreach generation (10/month)</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Table & card views, CSV export</li>
                </ul>
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Account
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button onClick={() => onAuthViewChange('login')} className="text-emerald-400 hover:text-emerald-300 font-medium">
                Sign in
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

// ============================================
// Main Auth Page Component
// ============================================
export function AuthPage({ authView, setAuthView, onAuthSuccess }: AuthPageProps) {
  return (
    <AnimatePresence mode="wait">
      {authView === 'landing' && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LandingPage onAuthViewChange={setAuthView} />
        </motion.div>
      )}
      {authView === 'login' && (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LoginForm onAuthViewChange={setAuthView} onAuthSuccess={onAuthSuccess} />
        </motion.div>
      )}
      {authView === 'register' && (
        <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <RegisterForm onAuthViewChange={setAuthView} onAuthSuccess={onAuthSuccess} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
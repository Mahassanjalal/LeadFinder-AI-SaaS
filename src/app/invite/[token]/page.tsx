'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, Users, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'sonner';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; role: string; orgName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'This invite is invalid or has expired.');
          return;
        }
        setInvite(await res.json());
      } catch {
        setError('Failed to load invite.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // If already logged in as the invited email, accept immediately
  useEffect(() => {
    if (status === 'authenticated' && session?.user && invite && (session.user as any).email === invite.email) {
      acceptInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, invite]);

  const acceptInvite = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`You've joined ${invite?.orgName}!`);
        // If not logged in, sign in; otherwise go home
        if (status !== 'authenticated') {
          const result = await signIn('credentials', {
            email: invite?.email,
            password,
            redirect: false,
          });
          if (result?.error) {
            toast.error('Account created — please sign in.');
            router.push('/');
            return;
          }
        }
        router.push('/');
      } else {
        toast.error(data.error || 'Failed to accept invite');
      }
    } catch {
      toast.error('Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-border/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Users className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">You're invited</CardTitle>
            <CardDescription>
              {loading
                ? 'Loading invite…'
                : invite
                  ? `Join ${invite.orgName} as ${invite.role}`
                  : 'Team invitation'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            ) : invite ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="truncate">{invite.email}</span>
                </div>

                {status === 'authenticated' && (session?.user as any)?.email === invite.email ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle2 className="size-4" /> Accepting your invitation…
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Create Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      onClick={acceptInvite}
                      disabled={accepting || password.length < 8}
                    >
                      {accepting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Accept Invite
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

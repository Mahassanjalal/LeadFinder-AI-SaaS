'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Send,
  Copy,
  RefreshCw,
  Sparkles,
  Search,
  User,
  Building2,
  Mail,
  Linkedin,
  Phone,
  FileText,
  MessageSquare,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadStore } from '@/stores/lead-store';
import { parseJsonField } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

/* ---------- Message type definitions ---------- */

const MESSAGE_TYPES = [
  { value: 'cold_email', label: 'Cold Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn Connection', icon: Linkedin },
  { value: 'linkedin', label: 'LinkedIn Message', icon: MessageSquare },
  { value: 'follow_up', label: 'Follow-up Email', icon: RefreshCw },
  { value: 'demo_request', label: 'Proposal Intro', icon: FileText },
  { value: 'demo_request', label: 'Discovery Call Script', icon: Phone },
] as const;

/* Display‑only key so each selector entry is unique */
type DisplayKey =
  | 'cold_email'
  | 'linkedin_connection'
  | 'linkedin_message'
  | 'follow_up_email'
  | 'proposal_intro'
  | 'call_script';

const MESSAGE_TYPE_MAP: Record<DisplayKey, { apiType: string; label: string; icon: typeof Mail }> = {
  cold_email: { apiType: 'cold_email', label: 'Cold Email', icon: Mail },
  linkedin_connection: { apiType: 'linkedin', label: 'LinkedIn Connection', icon: Linkedin },
  linkedin_message: { apiType: 'linkedin', label: 'LinkedIn Message', icon: MessageSquare },
  follow_up_email: { apiType: 'follow_up', label: 'Follow-up Email', icon: RefreshCw },
  proposal_intro: { apiType: 'demo_request', label: 'Proposal Intro', icon: FileText },
  call_script: { apiType: 'demo_request', label: 'Discovery Call Script', icon: Phone },
};

/* ---------- Component ---------- */

export function OutreachAssistant() {
  const { filteredLeads, selectedLead, setSelectedLead } = useLeadStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageType, setMessageType] = useState<DisplayKey>('cold_email');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  /* Filtered lead list for search */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return filteredLeads.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return filteredLeads.filter(
      (l) =>
        l.companyName.toLowerCase().includes(q) ||
        l.industry.toLowerCase().includes(q) ||
        (l.decisionMaker?.toLowerCase().includes(q) ?? false),
    );
  }, [searchQuery, filteredLeads]);

  const selectedConfig = MESSAGE_TYPE_MAP[messageType];
  const SelectedIcon = selectedConfig.icon;

  /* Handle lead selection */
  const handleSelectLead = useCallback(
    (leadId: string) => {
      const lead = filteredLeads.find((l) => l.id === leadId) ?? null;
      setSelectedLead(lead);
      setGeneratedMessage(null);
    },
    [filteredLeads, setSelectedLead],
  );

  /* Generate outreach message */
  const handleGenerate = useCallback(async () => {
    if (!selectedLead) {
      toast.error('Please select a lead first');
      return;
    }

    setIsGenerating(true);
    setGeneratedMessage(null);

    try {
      const painPointsRaw = selectedLead.painPoints
        ? parseJsonField<string[]>(selectedLead.painPoints, []).join(', ')
        : undefined;

      const payload = {
        companyName: selectedLead.companyName,
        industry: selectedLead.industry,
        contactName: selectedLead.decisionMaker ?? undefined,
        contactTitle: selectedLead.decisionMakerTitle ?? undefined,
        city: selectedLead.city ?? undefined,
        state: selectedLead.state ?? undefined,
        leadScore: selectedLead.leadScore,
        painPoints: painPointsRaw,
        employeeCount: selectedLead.employeeCount ?? undefined,
        revenue: selectedLead.estimatedRevenue ?? undefined,
        messageType: selectedConfig.apiType,
      };

      const res = await fetch('/api/ai/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to generate message');
      }

      const data = await res.json();
      setGeneratedMessage({ subject: data.subject, body: data.body });
      toast.success(`${selectedConfig.label} generated successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedLead, selectedConfig]);

  /* Copy to clipboard */
  const handleCopy = useCallback(async () => {
    if (!generatedMessage) return;
    const text = generatedMessage.subject
      ? `Subject: ${generatedMessage.subject}\n\n${generatedMessage.body}`
      : generatedMessage.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [generatedMessage]);

  /* Regenerate */
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ─── Left Column: Controls ─── */}
      <div className="space-y-6">
        {/* Lead Selector */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-500" />
              Select a Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, company, industry…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="max-h-64 overflow-y-auto">
              <div className="space-y-1 pr-2">
                {searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No leads found
                  </p>
                )}
                {searchResults.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleSelectLead(lead.id)}
                    className={cn(
                      'w-full flex items-start gap-3 rounded-lg p-3 text-left transition-colors',
                      'hover:bg-emerald-500/5',
                      selectedLead?.id === lead.id &&
                        'bg-emerald-500/10 ring-1 ring-emerald-500/30',
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.industry}
                        {lead.city ? ` · ${lead.city}` : ''}
                      </p>
                      {lead.decisionMaker && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lead.decisionMaker}
                          {lead.decisionMakerTitle ? ` · ${lead.decisionMakerTitle}` : ''}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs font-medium tabular-nums"
                    >
                      {lead.leadScore}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Type Selector */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              Message Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MESSAGE_TYPE_MAP) as [DisplayKey, (typeof MESSAGE_TYPE_MAP)[DisplayKey]][]).map(
                ([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setMessageType(key);
                        setGeneratedMessage(null);
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all',
                        messageType === key
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-border hover:border-emerald-500/30 hover:bg-emerald-500/5',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          messageType === key
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground',
                        )}
                      />
                      <span className="truncate">{config.label}</span>
                    </button>
                  );
                },
              )}
            </div>

            <Separator />

            {/* Selected lead summary */}
            {selectedLead && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <p className="text-sm font-medium">{selectedLead.companyName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {selectedLead.industry}
                  </span>
                  {selectedLead.decisionMaker && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedLead.decisionMaker}
                    </span>
                  )}
                  {selectedLead.employeeCount && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedLead.employeeCount} employees
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleGenerate}
              disabled={isGenerating || !selectedLead}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {selectedConfig.label}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ─── Right Column: Generated Message ─── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <AnimatePresence mode="wait">
          {generatedMessage ? (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Card className="glass-card">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <SelectedIcon className="h-4 w-4 text-emerald-500" />
                      {selectedConfig.label}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 px-2.5 text-xs"
                      >
                        {copied ? (
                          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className="h-8 px-2.5 text-xs"
                      >
                        <RefreshCw
                          className={cn(
                            'mr-1.5 h-3.5 w-3.5',
                            isGenerating && 'animate-spin',
                          )}
                        />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedMessage.subject && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Subject
                      </Label>
                      <p className="text-sm font-medium leading-relaxed rounded-md bg-muted/60 px-3 py-2">
                        {generatedMessage.subject}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Message
                    </Label>
                    <div className="rounded-md bg-muted/60 p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {generatedMessage.body}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[280px]"
            >
              <div className="text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Crafting your message…</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Personalizing for {selectedLead?.companyName ?? 'selected lead'}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[280px]"
            >
              <div className="text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Send className="h-7 w-7 text-emerald-500/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No message generated yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Select a lead, pick a message type, and hit Generate
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
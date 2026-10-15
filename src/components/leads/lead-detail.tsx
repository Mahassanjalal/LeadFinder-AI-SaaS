'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Phone, Mail, MapPin, Linkedin, Building2, Calendar,
  Star, Users, DollarSign, Clock, MessageSquare, Plus, Send,
  ExternalLink, Tag, FileText, Activity as ActivityIcon,
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadScoreBadge } from './lead-score-badge';
import { useLeadStore } from '@/stores/lead-store';
import {
  PIPELINE_STAGES,
  OUTREACH_STATUSES,
  parseJsonField,
  type Lead,
  type Note,
  type Activity,
  type OutreachMessage,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function ScoreBar({ label, value, color, barColor }: { label: string; value: number | null; color: string; barColor: string }) {
  if (value == null) return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold tabular-nums', color)}>{value}</span>
      </div>
      <Progress value={value} className={cn('h-1.5', barColor)} />
    </div>
  );
}

function InfoRow({ icon: Icon, value, href }: { icon: React.ElementType; value: string | null; href?: string }) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-2 text-sm py-1">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">
        {content}
      </a>
    );
  }
  return content;
}

// Module-level fetcher: the effect below only writes state from promise
// callbacks, so no React state is mutated synchronously during the effect.
async function fetchLeadById(id: string) {
  const res = await fetch(`/api/leads/${id}`);
  if (!res.ok) throw new Error(`Failed to load lead (${res.status})`);
  return res.json();
}

export function LeadDetail({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loadedForLeadId, setLoadedForLeadId] = useState<string | null>(null);
  const loading = !!leadId && loadedForLeadId !== leadId;
  const [noteText, setNoteText] = useState('');
  const [outreachType, setOutreachType] = useState<string>('cold_email');
  const [outreachMsg, setOutreachMsg] = useState<OutreachMessage | null>(null);
  const [generating, setGenerating] = useState(false);
  const { updateLead } = useLeadStore();

  useEffect(() => {
    if (!open || !leadId) return;
    const id = leadId;
    let cancelled = false;

    fetchLeadById(id)
      .then((json) => {
        if (!cancelled) setLead(json);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to the store copy so an offline/failed request still renders.
        const storeLead = useLeadStore.getState().filteredLeads.find((l) => l.id === id);
        if (storeLead) setLead(storeLead);
        else toast.error('Failed to load lead details');
      })
      .finally(() => {
        if (!cancelled) setLoadedForLeadId(id);
      });

    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  const handleAddNote = async () => {
    if (!noteText.trim() || !leadId) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      const note = await res.json();
      setLead((prev) =>
        prev ? { ...prev, notes: [note, ...(prev.notes || [])] } : prev
      );
      setNoteText('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleGenerateOutreach = async () => {
    if (!leadId || !lead) return;
    setGenerating(true);
    setOutreachMsg(null);
    try {
      const res = await fetch('/api/ai/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          type: outreachType,
          companyName: lead.companyName,
          industry: lead.industry,
          city: lead.city,
          state: lead.state,
          painPoints: lead.painPoints,
        }),
      });
      const json = await res.json();
      setOutreachMsg(json);
    } catch {
      toast.error('Failed to generate outreach');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStage = async (stage: string) => {
    if (!leadId) return;
    updateLead(leadId, { pipelineStage: stage });
    setLead((prev) => (prev ? { ...prev, pipelineStage: stage } : prev));
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: stage }),
      });
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleUpdateOutreach = async (status: string) => {
    if (!leadId) return;
    updateLead(leadId, { outreachStatus: status });
    setLead((prev) => (prev ? { ...prev, outreachStatus: status } : prev));
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreachStatus: status }),
      });
    } catch {
      toast.error('Failed to update outreach status');
    }
  };

  const handleToggleFavorite = () => {
    if (!lead) return;
    const newVal = !lead.isFavorite;
    updateLead(lead.id, { isFavorite: newVal });
    setLead((prev) => (prev ? { ...prev, isFavorite: newVal } : prev));
  };

  if (!lead && !loading) return null;

  const painPoints = parseJsonField<string[]>(lead?.painPoints ?? null, []);
  const opportunities = parseJsonField<string[]>(lead?.analyticsOpportunities ?? null, []);
  const services = parseJsonField<string[]>(lead?.recommendedServices ?? null, []);
  const tags = parseJsonField<string[]>(lead?.tags ?? null, []);
  const notes = lead?.notes || [];
  const activities = lead?.activities || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="space-y-3 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ) : lead ? (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <SheetHeader className="text-left space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Building2 className="size-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-lg leading-tight">{lead.companyName}</SheetTitle>
                      <SheetDescription className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{lead.industry}</Badge>
                        {lead.companySize && (
                          <span className="text-xs text-muted-foreground">{lead.companySize} employees</span>
                        )}
                      </SheetDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className="shrink-0"
                  >
                    <Star
                      className={cn(
                        'size-5',
                        lead.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
                      )}
                    />
                  </Button>
                </div>
              </SheetHeader>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h3>
                <InfoRow icon={Globe} value={lead.website} href={lead.website || undefined} />
                <InfoRow icon={Mail} value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                <InfoRow icon={Phone} value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                <InfoRow
                  icon={MapPin}
                  value={[lead.address, lead.city, lead.state, lead.postalCode].filter(Boolean).join(', ')}
                />
                {lead.linkedinUrl && (
                  <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">
                    <div className="flex items-center gap-2 text-sm py-1">
                      <Linkedin className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate">LinkedIn Profile</span>
                      <ExternalLink className="size-3" />
                    </div>
                  </a>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {lead.employeeCount != null && (
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <Users className="size-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-sm font-bold">{lead.employeeCount.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Employees</div>
                  </div>
                )}
                {lead.estimatedRevenue && (
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <DollarSign className="size-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-sm font-bold">{lead.estimatedRevenue}</div>
                    <div className="text-[10px] text-muted-foreground">Revenue</div>
                  </div>
                )}
                {lead.googleRating != null && (
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <Star className="size-4 mx-auto text-amber-500 mb-1 fill-amber-400" />
                    <div className="text-sm font-bold">{lead.googleRating}</div>
                    <div className="text-[10px] text-muted-foreground">Rating</div>
                  </div>
                )}
                {lead.yearsInBusiness != null && (
                  <div className="text-center p-2 rounded-lg bg-muted/30">
                    <Calendar className="size-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-sm font-bold">{lead.yearsInBusiness}yr</div>
                    <div className="text-[10px] text-muted-foreground">In Business</div>
                  </div>
                )}
              </div>

              <Separator />

              {/* AI Score */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Score</h3>
                <div className="flex items-center gap-4">
                  <LeadScoreBadge score={lead.leadScore} size="lg" showLabel />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ScoreBar label="Digital Maturity" value={lead.digitalMaturity} color="text-sky-600" barColor="[&>div]:bg-sky-600" />
                  <ScoreBar label="Growth Potential" value={lead.growthPotential} color="text-emerald-600" barColor="[&>div]:bg-emerald-600" />
                  <ScoreBar label="Operational Complexity" value={lead.operationalComplexity} color="text-violet-600" barColor="[&>div]:bg-violet-600" />
                  <ScoreBar label="Marketing Sophistication" value={lead.marketingSophistication} color="text-amber-600" barColor="[&>div]:bg-amber-600" />
                </div>
                {lead.aiExplanations && (() => {
                  try {
                    const exp = JSON.parse(lead.aiExplanations);
                    return (
                      <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                        {exp.overall && (
                          <p className="text-xs font-medium text-foreground">{exp.overall}</p>
                        )}
                        {exp.digitalMaturity && <p className="text-[11px] text-muted-foreground">📊 {exp.digitalMaturity}</p>}
                        {exp.growthPotential && <p className="text-[11px] text-muted-foreground">📈 {exp.growthPotential}</p>}
                        {exp.operationalComplexity && <p className="text-[11px] text-muted-foreground">⚙️ {exp.operationalComplexity}</p>}
                        {exp.marketingSophistication && <p className="text-[11px] text-muted-foreground">📣 {exp.marketingSophistication}</p>}
                        {exp.urgency && <p className="text-[11px] text-muted-foreground">⏰ {exp.urgency}</p>}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>

              <Separator />

              {/* AI Insights */}
              {(lead.businessSummary || painPoints.length > 0 || services.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</h3>

                  {lead.businessSummary && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Business Summary</p>
                      <p className="text-sm leading-relaxed">{lead.businessSummary}</p>
                    </div>
                  )}

                  {painPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Pain Points</p>
                      <div className="flex flex-wrap gap-1.5">
                        {painPoints.map((pp) => (
                          <Badge key={pp} variant="secondary" className="text-xs bg-red-50 text-red-700 border-red-100">
                            {pp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {opportunities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Analytics Opportunities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {opportunities.map((opp) => (
                          <Badge key={opp} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-100">
                            {opp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {services.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Recommended Services</p>
                      <div className="flex flex-wrap gap-1.5">
                        {services.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs bg-violet-50 text-violet-700 border-violet-100">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs gap-1">
                          <Tag className="size-3" />
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* CRM */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Pipeline Stage</label>
                    <Select value={lead.pipelineStage} onValueChange={handleUpdateStage}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Outreach Status</label>
                    <Select value={lead.outreachStatus} onValueChange={handleUpdateOutreach}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTREACH_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {lead.decisionMaker && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Decision Maker: </span>
                    <span className="font-medium">{lead.decisionMaker}</span>
                    {lead.decisionMakerTitle && (
                      <span className="text-muted-foreground"> — {lead.decisionMakerTitle}</span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="size-3.5" /> Notes ({notes.length})
                </h3>
                <div className="flex gap-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="min-h-[60px] text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                    }}
                  />
                </div>
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()} className="gap-1.5">
                  <Plus className="size-3.5" /> Add Note
                </Button>
                {notes.length > 0 && (
                  <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                    {notes.map((note: Note) => (
                      <div key={note.id} className="text-sm p-2 rounded-lg bg-muted/30 border">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Activity Timeline */}
              {activities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ActivityIcon className="size-3.5" /> Recent Activity
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activities.slice(0, 10).map((act: Activity) => (
                      <div key={act.id} className="flex gap-3 text-sm">
                        <div className="size-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="font-medium">{act.title}</p>
                          {act.description && (
                            <p className="text-xs text-muted-foreground">{act.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(act.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Outreach Generation */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" /> Generate Outreach
                </h3>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <Select value={outreachType} onValueChange={setOutreachType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold_email">Cold Email</SelectItem>
                        <SelectItem value="linkedin_connection">LinkedIn Connection</SelectItem>
                        <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
                        <SelectItem value="follow_up_email">Follow-up Email</SelectItem>
                        <SelectItem value="call_script">Call Script</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGenerateOutreach} disabled={generating} className="gap-1.5">
                    {generating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Send className="size-4" />
                      </motion.div>
                    ) : (
                      <Send className="size-4" />
                    )}
                    Generate
                  </Button>
                </div>
                {outreachMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border bg-muted/30 p-3 space-y-2"
                  >
                    {outreachMsg.subject && (
                      <p className="font-medium text-sm">
                        <span className="text-muted-foreground mr-1.5">Subject:</span>
                        {outreachMsg.subject}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{outreachMsg.body}</p>
                  </motion.div>
                )}
              </div>

              {/* Bottom padding */}
              <div className="h-4" />
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
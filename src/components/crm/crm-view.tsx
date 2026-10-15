'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Phone,
  Calendar,
  FileText,
  ArrowRightLeft,
  FileSpreadsheet,
  Plus,
  Send,
  Clock,
  AlertCircle,
  StickyNote,
  LayoutGrid,
  Activity as ActivityIcon,
  User,
  Building2,
  Globe,
  MapPin,
  DollarSign,
  Users,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ScoreRing } from '@/components/shared/score-ring';
import { EmptyState } from '@/components/shared/empty-state';
import { useLeadStore } from '@/stores/lead-store';
import type { Lead, Activity, Note } from '@/lib/types';
import { PIPELINE_STAGES, OUTREACH_STATUSES, getScoreColor, getScoreBgColor, parseJsonField } from '@/lib/types';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  'New': 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  'Contacted': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  'Replied': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Meeting Set': 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  'Proposal Sent': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Won': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Lost': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

const STAGE_DOT_COLORS: Record<string, string> = {
  'New': 'bg-gray-400',
  'Contacted': 'bg-sky-500',
  'Replied': 'bg-emerald-500',
  'Meeting Set': 'bg-teal-500',
  'Proposal Sent': 'bg-amber-500',
  'Won': 'bg-emerald-500',
  'Lost': 'bg-rose-500',
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'email_sent':
      return Mail;
    case 'call_made':
      return Phone;
    case 'meeting_set':
      return Calendar;
    case 'note_added':
      return FileText;
    case 'stage_changed':
      return ArrowRightLeft;
    case 'proposal_sent':
      return FileSpreadsheet;
    default:
      return ActivityIcon;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'email_sent':
      return 'text-sky-500 bg-sky-500/10';
    case 'call_made':
      return 'text-emerald-500 bg-emerald-500/10';
    case 'meeting_set':
      return 'text-teal-500 bg-teal-500/10';
    case 'note_added':
      return 'text-amber-500 bg-amber-500/10';
    case 'stage_changed':
      return 'text-violet-500 bg-violet-500/10';
    case 'proposal_sent':
      return 'text-orange-500 bg-orange-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

// Module-level fetchers: the effect below only wires their promise results
// into state, so nothing writes React state synchronously during the effect.
async function fetchLeadActivities(leadId: string): Promise<Activity[]> {
  try {
    const res = await fetch(`/api/leads/${leadId}/activities`);
    const data = res.ok ? await res.json() : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchLeadNotes(leadId: string): Promise<Note[]> {
  try {
    const res = await fetch(`/api/leads/${leadId}/notes`);
    const data = res.ok ? await res.json() : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function CrmView() {
  const { leads, updateLead } = useLeadStore();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  // Notes/activities are keyed by the lead they were fetched for: switching
  // leads reads as "loading" instead of showing stale rows, and nothing has to
  // be cleared synchronously inside an effect.
  const [activitiesData, setActivitiesData] = useState<{ leadId: string | null; items: Activity[] }>({ leadId: null, items: [] });
  const [notesData, setNotesData] = useState<{ leadId: string | null; items: Note[] }>({ leadId: null, items: [] });
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activityType, setActivityType] = useState('email_sent');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  // Derived selectors: data only shows when it belongs to the selected lead.
  const activities = activitiesData.leadId === selectedLeadId ? activitiesData.items : [];
  const notes = notesData.leadId === selectedLeadId ? notesData.items : [];
  const isLoadingActivities = !!selectedLeadId && activitiesData.leadId !== selectedLeadId;
  const isLoadingNotes = !!selectedLeadId && notesData.leadId !== selectedLeadId;

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((stage) => {
      counts[stage] = leads.filter((l) => l.pipelineStage === stage).length;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter !== 'all' && l.pipelineStage !== stageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.companyName.toLowerCase().includes(q) ||
          l.industry.toLowerCase().includes(q) ||
          (l.decisionMaker?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [leads, searchQuery, stageFilter]);

  const needsFollowUp = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return leads.filter((l) => {
      if (l.pipelineStage === 'Won' || l.pipelineStage === 'Lost') return false;
      const updated = new Date(l.updatedAt);
      return updated < threeDaysAgo && l.pipelineStage !== 'New';
    });
  }, [leads]);

  const fetchActivities = useCallback((leadId: string) =>
    fetchLeadActivities(leadId).then((items) => setActivitiesData({ leadId, items })),
  []);

  const fetchNotes = useCallback((leadId: string) =>
    fetchLeadNotes(leadId).then((items) => setNotesData({ leadId, items })),
  []);

  useEffect(() => {
    // Deselecting shows empty lists automatically (derived selectors above).
    if (!selectedLeadId) return;
    const leadId = selectedLeadId;
    let cancelled = false;
    fetchLeadActivities(leadId).then((items) => {
      if (!cancelled) setActivitiesData({ leadId, items });
    });
    fetchLeadNotes(leadId).then((items) => {
      if (!cancelled) setNotesData({ leadId, items });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedLeadId]);

  const handleStageChange = useCallback(
    async (leadId: string, newStage: string) => {
      updateLead(leadId, { pipelineStage: newStage });
      try {
        await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pipelineStage: newStage }),
        });
      } catch {
        // Silent fail — optimistic update already done
      }
      if (selectedLeadId === leadId) {
        fetchActivities(leadId);
      }
    },
    [updateLead, selectedLeadId, fetchActivities]
  );

  const handleAddNote = useCallback(async () => {
    if (!selectedLeadId || !newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotesData((prev) => ({
          leadId: selectedLeadId,
          items: [data, ...(prev.leadId === selectedLeadId ? prev.items : [])],
        }));
        setNewNote('');
      }
    } catch {
      // silent
    } finally {
      setIsAddingNote(false);
    }
  }, [selectedLeadId, newNote]);

  const handleAddActivity = useCallback(async () => {
    if (!selectedLeadId || !activityTitle.trim()) return;
    setIsAddingActivity(true);
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activityType,
          title: activityTitle.trim(),
          description: activityDescription.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivitiesData((prev) => ({
          leadId: selectedLeadId,
          items: [data, ...(prev.leadId === selectedLeadId ? prev.items : [])],
        }));
        setActivityTitle('');
        setActivityDescription('');
      }
    } catch {
      // silent
    } finally {
      setIsAddingActivity(false);
    }
  }, [selectedLeadId, activityType, activityTitle, activityDescription]);

  const painPoints = selectedLead ? parseJsonField<string[]>(selectedLead.painPoints, []) : [];
  const recommendedServices = selectedLead ? parseJsonField<string[]>(selectedLead.recommendedServices, []) : [];
  const tags = selectedLead ? parseJsonField<string[]>(selectedLead.tags, []) : [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4">
      {/* Pipeline Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {PIPELINE_STAGES.map((stage, index) => (
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
          >
            <Card
              className={cn(
                'py-3 px-3 cursor-pointer transition-all hover:shadow-md border',
                stageFilter === stage && 'ring-2 ring-emerald-500/50 shadow-md'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('h-2 w-2 rounded-full', STAGE_DOT_COLORS[stage])} />
                <span className="text-xs text-muted-foreground truncate">{stage}</span>
              </div>
              <div className="text-lg font-bold">{pipelineCounts[stage]}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Follow-up Warning */}
      {needsFollowUp.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            <strong>{needsFollowUp.length} leads</strong> need follow-up (no activity in 3+ days)
          </span>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Lead List */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm pl-8"
              />
            </div>
            {stageFilter !== 'all' && (
              <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer" onClick={() => setStageFilter('all')}>
                {stageFilter}
                <span className="ml-0.5 text-muted-foreground">×</span>
              </Badge>
            )}
          </div>

          <ScrollArea className="flex-1 max-h-[calc(100vh-360px)] lg:max-h-none">
            <div className="space-y-1.5 pr-2">
              {filteredLeads.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No leads found"
                  description="Try adjusting your search or filters."
                  className="py-8"
                />
              ) : (
                filteredLeads.map((lead) => {
                  const isFollowUp = needsFollowUp.some((l) => l.id === lead.id);
                  return (
                    <motion.button
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm',
                        selectedLeadId === lead.id
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-sm'
                          : 'hover:border-border'
                      )}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          <ScoreRing score={lead.leadScore} size={36} strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{lead.companyName}</span>
                            {isFollowUp && (
                              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{lead.industry}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge
                              className={cn('text-[10px] py-0 px-1.5 border', STAGE_COLORS[lead.pipelineStage] || '')}
                              variant="outline"
                            >
                              {lead.pipelineStage}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDate(lead.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Lead Details */}
        <div className="flex-1 min-w-0 min-h-0">
          <AnimatePresence mode="wait">
            {selectedLead ? (
              <motion.div
                key={selectedLead.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="h-full flex flex-col"
              >
                <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
                  <TabsList className="w-fit">
                    <TabsTrigger value="details" className="gap-1.5 text-xs">
                      <User className="h-3.5 w-3.5" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="activities" className="gap-1.5 text-xs">
                      <ActivityIcon className="h-3.5 w-3.5" />
                      Activities
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-1.5 text-xs">
                      <StickyNote className="h-3.5 w-3.5" />
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="flex-1 min-h-0 mt-2">
                    <ScrollArea className="h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
                      <div className="space-y-4 pr-4 pb-4">
                        {/* Header Card */}
                        <Card className="py-4 glass-card">
                          <CardContent className="px-4">
                            <div className="flex items-start gap-4">
                              <ScoreRing score={selectedLead.leadScore} size={72} strokeWidth={5} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h2 className="text-lg font-bold">{selectedLead.companyName}</h2>
                                  {selectedLead.isFavorite && (
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{selectedLead.industry}</p>
                                {selectedLead.businessCategory && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{selectedLead.businessCategory}</p>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <Badge variant="outline" className={cn('text-[10px]', STAGE_COLORS[selectedLead.pipelineStage] || '')}>
                                    {selectedLead.pipelineStage}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    {selectedLead.outreachStatus}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Stage Changer */}
                            <div className="mt-4 flex items-center gap-3">
                              <Label className="text-xs text-muted-foreground shrink-0">Move to:</Label>
                              <Select
                                value={selectedLead.pipelineStage}
                                onValueChange={(v) => handleStageChange(selectedLead.id, v)}
                              >
                                <SelectTrigger className="h-8 w-full text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PIPELINE_STAGES.map((stage) => (
                                    <SelectItem key={stage} value={stage} className="text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className={cn('h-2 w-2 rounded-full', STAGE_DOT_COLORS[stage])} />
                                        {stage}
                                        <span className="text-muted-foreground ml-1">({pipelineCounts[stage]})</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Contact Info */}
                        <Card className="py-4">
                          <CardHeader className="px-4 pb-2">
                            <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              {selectedLead.decisionMaker && (
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{selectedLead.decisionMaker}</p>
                                    {selectedLead.decisionMakerTitle && (
                                      <p className="text-xs text-muted-foreground">{selectedLead.decisionMakerTitle}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {selectedLead.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{selectedLead.email}</span>
                                </div>
                              )}
                              {selectedLead.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{selectedLead.phone}</span>
                                </div>
                              )}
                              {selectedLead.website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs truncate">{selectedLead.website}</span>
                                </div>
                              )}
                              {(selectedLead.city || selectedLead.state) && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">
                                    {[selectedLead.city, selectedLead.state].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              )}
                              {selectedLead.linkedinUrl && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs text-sky-600 truncate">LinkedIn Profile</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Company Details */}
                        <Card className="py-4">
                          <CardHeader className="px-4 pb-2">
                            <CardTitle className="text-sm font-semibold">Company Details</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {selectedLead.companySize && (
                                <div className="text-center p-2 rounded-lg bg-muted/30">
                                  <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-xs font-medium">{selectedLead.companySize}</p>
                                  <p className="text-[10px] text-muted-foreground">Size</p>
                                </div>
                              )}
                              {selectedLead.estimatedRevenue && (
                                <div className="text-center p-2 rounded-lg bg-muted/30">
                                  <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-xs font-medium">{selectedLead.estimatedRevenue}</p>
                                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                                </div>
                              )}
                              {selectedLead.estimatedProjectValue && (
                                <div className="text-center p-2 rounded-lg bg-muted/30">
                                  <DollarSign className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                                  <p className="text-xs font-medium">{selectedLead.estimatedProjectValue}</p>
                                  <p className="text-[10px] text-muted-foreground">Est. Value</p>
                                </div>
                              )}
                              {selectedLead.yearsInBusiness && (
                                <div className="text-center p-2 rounded-lg bg-muted/30">
                                  <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                                  <p className="text-xs font-medium">{selectedLead.yearsInBusiness}yr</p>
                                  <p className="text-[10px] text-muted-foreground">In Business</p>
                                </div>
                              )}
                            </div>

                            {/* Score Breakdown */}
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { label: 'Digital Maturity', value: selectedLead.digitalMaturity },
                                { label: 'Growth Potential', value: selectedLead.growthPotential },
                                { label: 'Urgency', value: selectedLead.urgencyScore },
                                { label: 'Complexity', value: selectedLead.operationalComplexity },
                                { label: 'Data Volume', value: selectedLead.dataVolumeIndicators },
                                { label: 'Marketing', value: selectedLead.marketingSophistication },
                              ].map((metric) =>
                                metric.value != null ? (
                                  <div key={metric.label} className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <motion.div
                                        className="h-full rounded-full bg-emerald-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${metric.value}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground w-20 text-right truncate">
                                      {metric.label}
                                    </span>
                                    <span className="text-[10px] font-medium w-6 text-right">{metric.value}</span>
                                  </div>
                                ) : null
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Pain Points & Recommendations */}
                        {(painPoints.length > 0 || recommendedServices.length > 0) && (
                          <Card className="py-4">
                            <CardContent className="px-4 space-y-3">
                              {painPoints.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                    Pain Points
                                  </h4>
                                  <ul className="space-y-1">
                                    {painPoints.map((point, i) => (
                                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        {point}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {recommendedServices.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                                    <Star className="h-3.5 w-3.5 text-emerald-500" />
                                    Recommended Services
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {recommendedServices.map((service, i) => (
                                      <Badge key={i} variant="secondary" className="text-[10px]">
                                        {service}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {tags.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                                    <LayoutGrid className="h-3.5 w-3.5 text-teal-500" />
                                    Tags
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {tags.map((tag, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px]">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Activities Tab */}
                  <TabsContent value="activities" className="flex-1 min-h-0 mt-2">
                    <div className="flex flex-col h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
                      {/* Add Activity Form */}
                      <Card className="py-3 mb-3 shrink-0">
                        <CardContent className="px-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Select value={activityType} onValueChange={setActivityType}>
                              <SelectTrigger className="h-8 w-[160px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email_sent">📧 Email Sent</SelectItem>
                                <SelectItem value="call_made">📞 Call Made</SelectItem>
                                <SelectItem value="meeting_set">📅 Meeting Set</SelectItem>
                                <SelectItem value="stage_changed">🔄 Stage Changed</SelectItem>
                                <SelectItem value="proposal_sent">📄 Proposal Sent</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Activity title..."
                              value={activityTitle}
                              onChange={(e) => setActivityTitle(e.target.value)}
                              className="h-8 text-xs flex-1"
                            />
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={handleAddActivity}
                              disabled={isAddingActivity || !activityTitle.trim()}
                            >
                              {isAddingActivity ? 'Adding...' : 'Add'}
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Description (optional)..."
                            value={activityDescription}
                            onChange={(e) => setActivityDescription(e.target.value)}
                            className="text-xs min-h-[50px] resize-none"
                            rows={2}
                          />
                        </CardContent>
                      </Card>

                      {/* Activity Timeline */}
                      <ScrollArea className="flex-1">
                        <div className="pr-4 pb-4">
                          {isLoadingActivities ? (
                            <div className="space-y-3">
                              {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex gap-3">
                                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                                  <div className="flex-1 space-y-1.5 pt-1">
                                    <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : activities.length === 0 ? (
                            <EmptyState
                              icon={ActivityIcon}
                              title="No activities yet"
                              description="Start tracking interactions with this lead by adding an activity."
                              className="py-8"
                            />
                          ) : (
                            <div className="relative">
                              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                              <div className="space-y-4">
                                {activities.map((activity, index) => {
                                  const Icon = getActivityIcon(activity.type);
                                  const colorClass = getActivityColor(activity.type);
                                  return (
                                    <motion.div
                                      key={activity.id}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className="flex gap-3 relative"
                                    >
                                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10', colorClass)}>
                                        <Icon className="h-3.5 w-3.5" />
                                      </div>
                                      <div className="flex-1 pb-2">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium">{activity.title}</p>
                                          <span className="text-[10px] text-muted-foreground ml-auto">
                                            {formatDate(activity.createdAt)}
                                          </span>
                                        </div>
                                        {activity.description && (
                                          <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                                        )}
                                        <Badge variant="outline" className="text-[10px] mt-1">
                                          {activity.type.replace(/_/g, ' ')}
                                        </Badge>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="flex-1 min-h-0 mt-2">
                    <div className="flex flex-col h-[calc(100vh-320px)] lg:h-[calc(100vh-280px)]">
                      {/* Add Note */}
                      <Card className="py-3 mb-3 shrink-0">
                        <CardContent className="px-4">
                          <Textarea
                            placeholder="Add a note about this lead..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="text-xs min-h-[70px] resize-none mb-2"
                            rows={3}
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                              onClick={handleAddNote}
                              disabled={isAddingNote || !newNote.trim()}
                            >
                              <Plus className="h-3 w-3" />
                              {isAddingNote ? 'Saving...' : 'Add Note'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Notes List */}
                      <ScrollArea className="flex-1">
                        <div className="space-y-3 pr-4 pb-4">
                          {isLoadingNotes ? (
                            <div className="space-y-3">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-lg border p-3 space-y-2">
                                  <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
                                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                                  <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                                </div>
                              ))}
                            </div>
                          ) : notes.length === 0 ? (
                            <EmptyState
                              icon={StickyNote}
                              title="No notes yet"
                              description="Add notes to keep track of important details about this lead."
                              className="py-8"
                            />
                          ) : (
                            notes.map((note, index) => (
                              <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="rounded-lg border p-3 bg-card hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <FileText className="h-2.5 w-2.5" />
                                    Note
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(note.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <EmptyState
                  icon={User}
                  title="Select a Lead"
                  description="Choose a lead from the list to view and manage their CRM details, activities, and notes."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Building2, Plus, Loader2, Globe, Linkedin,
  FolderOpen, ChevronRight, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LeadScoreBadge } from './lead-score-badge';
import { INDUSTRIES, COMPANY_SIZES } from '@/lib/types';
import { useLeadStore } from '@/stores/lead-store';
import { toast } from 'sonner';

interface DiscoveredBusiness {
  id: string;
  companyName: string;
  industry: string;
  businessCategory: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  employeeCount: number | null;
  estimatedRevenue: string | null;
  yearsInBusiness: number | null;
  googleRating: number | null;
  reviewCount: number | null;
  decisionMaker: string | null;
  decisionMakerTitle: string | null;
  linkedinUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

const SOURCES = [
  { id: 'google_maps', label: 'Google Maps', icon: MapPin },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'directories', label: 'Business Directories', icon: FolderOpen },
  { id: 'web', label: 'Web Search', icon: Globe },
];

export function LeadDiscovery() {
  const { setLeads, leads } = useLeadStore();
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('US');
  const [postalCode, setPostalCode] = useState('');
  const [radius, setRadius] = useState([25]);
  const [selectedSources, setSelectedSources] = useState<string[]>(['google_maps', 'linkedin', 'directories', 'web']);
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [results, setResults] = useState<DiscoveredBusiness[]>([]);
  const [meta, setMeta] = useState<{ location: string; radius: string; totalFound: number } | null>(null);

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]
    );
  };

  const handleDiscover = async () => {
    if (!city && !state && !postalCode) {
      toast.error('Please enter a city, state, or postal code');
      return;
    }
    if (selectedSources.length === 0) {
      toast.error('Please select at least one source');
      return;
    }

    setDiscovering(true);
    setResults([]);
    setMeta(null);

    try {
      const body: Record<string, string> = {};
      if (city) body.city = city;
      if (state) body.state = state;
      if (country) body.country = country;
      if (postalCode) body.postalCode = postalCode;
      body.radius = String(radius[0]);
      if (industry) body.industry = industry;

      const res = await fetch('/api/ai/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      setResults(json.businesses || []);
      setMeta(json.meta || null);
      toast.success(`Found ${json.meta?.totalFound || 0} businesses`);
    } catch {
      toast.error('Discovery failed. Please try again.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddToPipeline = async (business: DiscoveredBusiness) => {
    try {
      // Create lead in database
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...business,
          pipelineStage: 'New',
          isFavorite: false,
          outreachStatus: 'Not Contacted',
          tags: null,
          leadScore: 0,
        }),
      });

      const newLead = await res.json();

      // Update store
      setLeads([...leads, newLead]);
      setResults((prev) => prev.filter((b) => b.id !== business.id));
      toast.success(`${business.companyName} added to pipeline`);
    } catch {
      toast.error('Failed to add lead');
    }
  };

  return (
    <div className="space-y-6">
      {/* Discovery Form */}
      <Card className="bg-white/70 backdrop-blur-sm border-border/60">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">Discover New Leads</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">City</Label>
              <Input
                placeholder="e.g. San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">State / Region</Label>
              <Input
                placeholder="e.g. CA"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Country</Label>
              <Input
                placeholder="US"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Postal Code</Label>
              <Input
                placeholder="e.g. 94105"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
          </div>

          {/* Radius Slider */}
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground">Search Radius</Label>
              <span className="text-sm font-medium tabular-nums">{radius[0]} km</span>
            </div>
            <Slider
              min={1}
              max={200}
              step={5}
              value={radius}
              onValueChange={setRadius}
            />
          </div>

          {/* Sources */}
          <div className="mt-4">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Data Sources</Label>
            <div className="flex flex-wrap gap-3">
              {SOURCES.map((source) => (
                <label
                  key={source.id}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedSources.includes(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <source.icon className="size-3.5 text-muted-foreground" />
                  {source.label}
                </label>
              ))}
            </div>
          </div>

          {/* Industry & Size Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Industry (Optional)</Label>
              <Select value={industry} onValueChange={(v) => setIndustry(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Industries</SelectItem>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Company Size (Optional)</Label>
              <Select value={companySize} onValueChange={(v) => setCompanySize(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sizes</SelectItem>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleDiscover}
            disabled={discovering}
            className="mt-5 gap-2 bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {discovering ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Search className="size-4" />
                Discover Leads
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      <AnimatePresence>
        {discovering && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-16 space-y-4"
          >
            <div className="relative">
              <div className="size-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <Sparkles className="size-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-sm">Searching for businesses...</p>
              <p className="text-xs text-muted-foreground">
                Scanning {meta?.location || 'your area'} within {radius[0]} km radius
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {!discovering && results.length > 0 && (
        <div className="space-y-3">
          {meta && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span>
                Found <strong className="text-foreground">{meta.totalFound}</strong> businesses near{' '}
                <strong className="text-foreground">{meta.location}</strong> ({meta.radius})
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {results.map((business, index) => (
                <motion.div
                  key={business.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/70 backdrop-blur-sm border-border/60 hover:border-emerald-200 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                            <Building2 className="size-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{business.companyName}</h3>
                            <Badge variant="outline" className="text-[10px] font-normal mt-0.5">
                              {business.industry}
                            </Badge>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {business.googleRating && (
                            <div className="text-xs">
                              <span className="text-amber-500">★</span>{' '}
                              <span className="font-medium tabular-nums">{business.googleRating}</span>
                            </div>
                          )}
                          {business.employeeCount && (
                            <div className="text-xs text-muted-foreground">
                              {business.employeeCount} emp
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {business.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {business.city}{business.state ? `, ${business.state}` : ''}
                          </span>
                        )}
                        {business.decisionMaker && (
                          <span>{business.decisionMaker} — {business.decisionMakerTitle}</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddToPipeline(business)}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-8"
                        >
                          <Plus className="size-3.5" />
                          Add to Pipeline
                        </Button>
                        {business.website && (
                          <a href={business.website} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                              <Globe className="size-3.5" />
                              Website
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!discovering && results.length === 0 && !meta && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="size-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Search className="size-8 text-emerald-300" />
          </div>
          <div>
            <p className="font-medium text-sm">No discoveries yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter a location and click &ldquo;Discover Leads&rdquo; to find new business opportunities
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
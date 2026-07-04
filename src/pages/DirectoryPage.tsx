import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/lib/types';
import { Building2, Globe, Phone, Mail, MapPin, Search, ExternalLink, MessageCircle } from 'lucide-react';
import { trackEvent } from '@enter-pro/analytics-sdk';

const INDUSTRIES = ['All', 'Beauty & Fashion', 'Financial Services', 'Food & Restaurant', 'Healthcare', 'Technology', 'Trade & Commerce', 'Transportation', 'Education', 'Consulting', 'Real Estate', 'Other'];

export function DirectoryPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('companies')
      .select('*, profile:owner_id(first_name, last_name)')
      .eq('is_approved', true)
      .order('company_name');
    setCompanies((data || []) as Company[]);
    setLoading(false);
  };

  const filtered = companies.filter(c => {
    const matchSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industry === 'All' || c.industry === industry;
    return matchSearch && matchIndustry;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        {/* Header */}
        <div className="gradient-hero py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 hero-pattern pointer-events-none" />
          <div className="container mx-auto text-center relative">
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-5 shadow-gold">
              <Building2 className="h-8 w-8 text-gold-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Nigerian Business Directory</h1>
            <p className="text-primary-foreground/75 max-w-2xl mx-auto text-lg">
              Support your fellow Nigerians in Vietnam. Discover businesses and services run by our community members.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (e.target.value.length > 2) {
                    trackEvent('directory_search', { eventType: 'custom', properties: { query: e.target.value } });
                  }
                }}
                placeholder="Search businesses..."
                className="pl-9 h-11"
              />
            </div>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-full sm:w-52 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="h-44 bg-muted" />
                  <CardContent className="p-5 space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 opacity-40">
                <Building2 className="h-10 w-10 text-primary-foreground" />
              </div>
              <p className="text-lg font-semibold">No businesses found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(company => (
                <Card key={company.id} className="shadow-card card-lift hover:shadow-green transition-smooth overflow-hidden border-border flex flex-col">
                  {/* Logo Area */}
                  <div className="relative bg-white border-b border-border h-44 flex items-center justify-center p-6">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={`${company.company_name} logo`}
                        className="max-h-32 max-w-full object-contain"
                      />
                    ) : company.cover_image_url ? (
                      <img
                        src={company.cover_image_url}
                        alt={company.company_name}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-primary-foreground" />
                      </div>
                    )}
                    {company.industry && (
                      <Badge className="absolute top-3 right-3 gradient-primary text-primary-foreground border-0 text-xs font-medium">
                        {company.industry}
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-5 flex flex-col flex-1">
                    {/* Business Name */}
                    <h3 className="font-bold text-foreground text-base leading-snug mb-1">{company.company_name}</h3>
                    {company.business_type && (
                      <p className="text-xs text-primary font-medium mb-2">{company.business_type}</p>
                    )}
                    {company.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{company.description}</p>
                    )}

                    {/* Contact & Address */}
                    <div className="space-y-2 text-xs text-muted-foreground mt-auto">
                      {company.address_in_vietnam && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="leading-snug">{company.address_in_vietnam}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={`tel:${company.phone}`} className="hover:text-primary font-medium transition-smooth"
                            onClick={() => trackEvent('business_contact_clicked', { eventType: 'conversion', properties: { company: company.company_name, type: 'phone' } })}>
                            {company.phone}
                          </a>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={`mailto:${company.email}`} className="hover:text-primary truncate transition-smooth"
                            onClick={() => trackEvent('business_contact_clicked', { eventType: 'conversion', properties: { company: company.company_name, type: 'email' } })}>
                            {company.email}
                          </a>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1 truncate transition-smooth"
                            onClick={() => trackEvent('business_contact_clicked', { eventType: 'conversion', properties: { company: company.company_name, type: 'website' } })}>
                            {company.website.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                      {!company.phone && !company.email && !company.website && (
                        <div className="flex items-center gap-2 text-muted-foreground/60">
                          <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Contact via NIDO Vietnam community</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Register CTA */}
          <div className="mt-14 p-8 rounded-2xl gradient-primary text-primary-foreground text-center relative overflow-hidden">
            <div className="absolute inset-0 hero-pattern pointer-events-none opacity-50" />
            <div className="relative">
              <h3 className="text-xl font-bold mb-2">List Your Business</h3>
              <p className="text-primary-foreground/75 text-sm mb-5 max-w-md mx-auto">
                Are you a Nigerian entrepreneur in Vietnam? Get your business listed in our directory and reach the entire NIDO community.
              </p>
              <a href="mailto:info@nidovietnam.com" className="inline-flex items-center gap-2 bg-gold text-gold-foreground font-semibold px-6 py-2.5 rounded-xl shadow-gold hover:opacity-90 transition-smooth text-sm">
                <Mail className="h-4 w-4" /> Submit Your Business
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

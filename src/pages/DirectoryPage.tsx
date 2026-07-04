import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/lib/types';
import { Building2, Globe, Phone, Mail, MapPin, Search, ExternalLink } from 'lucide-react';

const INDUSTRIES = ['All', 'Technology', 'Trade & Commerce', 'Education', 'Food & Restaurant', 'Fashion', 'Healthcare', 'Consulting', 'Transportation', 'Real Estate', 'Other'];

export function DirectoryPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*, profile:owner_id(first_name, last_name)').eq('is_approved', true).order('company_name');
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
        <div className="gradient-hero py-16 px-4">
          <div className="container mx-auto text-center">
            <Building2 className="h-12 w-12 text-gold mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Nigerian Business Directory</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Support your fellow Nigerians in Vietnam. Discover businesses and services run by our community members.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search businesses..." className="pl-9" />
            </div>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-full sm:w-48">
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
                <Card key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-t-lg" />
                  <CardContent className="p-5 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No businesses found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(company => (
                <Card key={company.id} className="shadow-card hover:shadow-green transition-smooth overflow-hidden">
                  {company.cover_image_url ? (
                    <img src={company.cover_image_url} alt={company.company_name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 gradient-primary flex items-center justify-center">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.company_name} className="h-20 w-20 rounded-full object-cover" />
                      ) : (
                        <Building2 className="h-12 w-12 text-primary-foreground/50" />
                      )}
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-foreground">{company.company_name}</h3>
                      {company.industry && <Badge variant="secondary" className="text-xs ml-2 shrink-0">{company.industry}</Badge>}
                    </div>
                    {company.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{company.description}</p>}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {company.address_in_vietnam && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{company.address_in_vietnam}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={`tel:${company.phone}`} className="hover:text-primary">{company.phone}</a>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={`mailto:${company.email}`} className="hover:text-primary truncate">{company.email}</a>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1 truncate">
                            {company.website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

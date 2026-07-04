import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from '@/lib/types';
import { Calendar, MapPin, Users } from 'lucide-react';

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('activities').select('*').eq('is_published', true).order('event_date', { ascending: false });
      setActivities((data || []) as Activity[]);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        <div className="gradient-hero py-16 px-4">
          <div className="container mx-auto text-center">
            <Calendar className="h-12 w-12 text-gold mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Community Activities</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Stay connected with NIDO Vietnam events, programs, and community activities.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-5 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No activities posted yet</p>
              <p className="text-sm mt-1">Check back soon for upcoming events!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {activities.map(activity => (
                <Card key={activity.id} className="shadow-card hover:shadow-green transition-smooth overflow-hidden">
                  {activity.cover_image_url && (
                    <img src={activity.cover_image_url} alt={activity.title} className="w-full h-48 object-cover" />
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-foreground text-lg">{activity.title}</h3>
                      <Badge className="gradient-primary text-primary-foreground border-0 shrink-0">Event</Badge>
                    </div>
                    {activity.event_date && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        {new Date(activity.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {activity.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        {activity.location}
                      </p>
                    )}
                    {activity.description && <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>}
                    {activity.content && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{activity.content}</p>
                      </div>
                    )}
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

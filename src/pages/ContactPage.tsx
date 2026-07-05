import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Mail, MessageCircle, Globe, ExternalLink, CheckCircle, Facebook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('contact_messages').insert({
      name: form.name,
      email: form.email,
      subject: form.subject,
      message: form.message,
    });
    if (!error) setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1">
        {/* Header */}
        <div className="gradient-hero py-16 px-4">
          <div className="container mx-auto text-center">
            <Phone className="h-12 w-12 text-gold mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Contact Us</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Get in touch with NIDO Vietnam or the Nigerian Embassy in Hanoi.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Contact Form */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">Send Us a Message</h2>
              {sent ? (
                <Alert className="border-primary bg-primary/10">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary font-medium">
                    Thank you! Your message has been received. We will get back to you soon.
                  </AlertDescription>
                </Alert>
              ) : (
                <Card className="shadow-card">
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Your Name</Label>
                          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Email</Label>
                          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Subject</Label>
                        <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Message</Label>
                        <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} required />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
                        {loading ? 'Sending...' : 'Send Message'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              {/* NIDO Contact */}
              <Card className="shadow-card border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                      <img src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png" alt="NIDO" className="h-6 w-6 object-contain" />
                    </div>
                    NIDO Vietnam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { icon: Phone, label: 'NIDO Hotline', value: '+84326189705 (Dr. Michael Omar)', href: 'tel:+84326189705' },
                    { icon: Mail, label: 'Email', value: 'info@nidovietnam.com', href: 'mailto:info@nidovietnam.com' },
                    { icon: Facebook, label: 'Facebook Group', value: 'NIDO Vietnam Group', href: 'https://www.facebook.com/groups/357099351095953' },
                    { icon: MessageCircle, label: 'WhatsApp Community', value: 'Join Our WhatsApp', href: 'https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ' },
                    { icon: MessageCircle, label: 'WhatsApp Group 2', value: 'Second WhatsApp Group', href: 'https://chat.whatsapp.com/HFaStQ14rmkAuaswLKhaUl' },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary">
                          {value}
                        </a>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Embassy Contact */}
              <Card className="shadow-card border-gold/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <img src="https://cdn.enter.pro/resources/uid_100149613/db051db4-b309-4c.jpeg" alt="Embassy" className="h-8 w-8 rounded-full object-cover" />
                    Nigerian Embassy — Hanoi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { icon: Phone, label: 'Office Lines', value: '+84-24-37263610 / +84-24-37263611', href: 'tel:+842437263610' },
                    { icon: Phone, label: 'Fax', value: '+84-24-37263615', href: '#' },
                    { icon: MessageCircle, label: 'WhatsApp (Strictly)', value: '+84775568278', href: 'https://wa.me/84775568278' },
                    { icon: Mail, label: 'Email', value: 'contact-us@nigeriaembassy.org.vn', href: 'mailto:contact-us@nigeriaembassy.org.vn' },
                    { icon: Globe, label: 'Website', value: 'nigeriaembassy.org.vn', href: 'https://nigeriaembassy.org.vn' },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gold shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary flex items-center gap-1">
                          {value}
                          {href.startsWith('http') && <ExternalLink className="h-3 w-3" />}
                        </a>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

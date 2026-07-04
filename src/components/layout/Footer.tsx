import { Link } from 'react-router-dom';
import { Facebook, MessageCircle, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      {/* Nigerian flag stripe */}
      <div className="nigeria-flag-stripe h-1" />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png"
              alt="NIDO Vietnam"
              className="h-12 mb-4"
            />
            <p className="text-sm text-sidebar-foreground/70 leading-relaxed">
              Nigerians in Diaspora Organization Vietnam — uniting Nigerians living and working in Vietnam.
            </p>
            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.facebook.com/groups/357099351095953"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-accent hover:bg-primary transition-smooth"
                title="Facebook Group"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://chat.whatsapp.com/JY6blJObydS8b7CMvcrYMJ"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-accent hover:bg-primary transition-smooth"
                title="WhatsApp Community"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="https://chat.whatsapp.com/HFaStQ14rmkAuaswLKhaUl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-accent hover:bg-primary transition-smooth"
                title="WhatsApp Group 2"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sidebar-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              {[
                { label: 'About NIDO', href: '/' },
                { label: 'Member Directory', href: '/directory' },
                { label: 'Photo Gallery', href: '/gallery' },
                { label: 'Events & Activities', href: '/activities' },
                { label: 'NIDO Constitution', href: '/constitution' },
                { label: 'Passport Information', href: '/passport-info' },
              ].map(l => (
                <li key={l.href}>
                  <Link to={l.href} className="hover:text-primary transition-smooth">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* NIDO Contact */}
          <div>
            <h3 className="font-semibold text-sidebar-foreground mb-4">NIDO Vietnam</h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>+84326189705 (Dr. Michael Omar)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href="mailto:info@nidovietnam.com" className="hover:text-primary">info@nidovietnam.com</a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>Vietnam</span>
              </li>
            </ul>
          </div>

          {/* Embassy Contact */}
          <div>
            <h3 className="font-semibold text-sidebar-foreground mb-4">Nigerian Embassy</h3>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                <div>
                  <div>+84-24-37263610</div>
                  <div>+84-24-37263611</div>
                </div>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold shrink-0" />
                <span>WhatsApp: +84775568278</span>
              </li>
              <li>
                <a
                  href="https://nigeriaembassy.org.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                  nigeriaembassy.org.vn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-sidebar-border" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-sidebar-foreground/50">
          <p>© {new Date().getFullYear()} NIDO Vietnam. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <img
              src="https://cdn.enter.pro/resources/uid_100149613/db051db4-b309-4c.jpeg"
              alt="Nigeria Coat of Arms"
              className="h-6 w-6 rounded-full object-cover"
            />
            <span>Unity and Faith, Peace and Progress</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

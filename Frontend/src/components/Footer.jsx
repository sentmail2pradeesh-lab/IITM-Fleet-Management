import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#1a2a4a] text-white/80">
      {/* 3px gradient top border */}
      <div className="h-[3px] bg-gradient-to-r from-[#0b1f3a] via-[#1d4ed8] to-[#3b82f6]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/15">
          {/* Logo + Bus */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <img src="/iitm-logo.png" className="w-9 h-9" alt="IITM" />
              <div>
                <div className="font-bold text-white text-lg">IIT Madras</div>
                <div className="text-xs text-white/60">
                  Fleet Booking Portal
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-white/70">
                Request vehicles, track approvals, and manage bookings through a
                single, streamlined portal.
              </div>
            </div>

            <div className="mt-5 group relative rounded-lg overflow-hidden border border-white/10 shadow-sm">
              <img
                src="/bus.jpg"
                alt="Fleet Bus"
                className="w-full h-28 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#1d4ed8]/25 via-transparent to-[#0ea5e9]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="p-6">
            <div className="text-sm font-semibold text-white mb-4">Quick Links</div>
            <div className="flex flex-col gap-3 text-sm text-white/70">
              <FooterLink to="/home">Home</FooterLink>
              <FooterLink to="/dashboard">My Requests</FooterLink>
              <FooterLink to="/guide/pending">Guide / HoD</FooterLink>
              <FooterLink to="/approver/pending">Transport Supervisor</FooterLink>
            </div>
          </div>

          {/* Support */}
          <div className="p-6">
            <div className="text-sm font-semibold text-white mb-4">Support</div>
            <div className="text-sm text-white/70 space-y-3">
              <div>For booking queries, contact the Transport Office.</div>

              <div className="flex items-center gap-2 text-xs text-white/70">
                <MailIcon />
                <a
                  className="hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
                  href="mailto:transport-office@iitm.ac.in"
                >
                  transport-office@iitm.ac.in
                </a>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/70">
                <PhoneIcon />
                <a
                  className="hover:text-white transition-colors duration-200 underline-offset-4 hover:underline"
                  href="tel:+910000000000"
                >
                  +91-00000-00000
                </a>
              </div>
            </div>
          </div>

          {/* Admin & Reporting */}
          <div className="p-6">
            <div className="text-sm font-semibold text-white mb-4">Admin & Reporting</div>
            <div className="flex flex-col gap-3 text-sm text-white/70">
              <FooterLink to="/approver/vehicles">Vehicles (Add/Manage)</FooterLink>
              <FooterLink to="/approver/reports">Usage Reports</FooterLink>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#16243c] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
          <div className="text-xs text-white/70">
            © {year} IIT Madras, Transport Office. All rights reserved.
          </div>
          <div className="text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-2">
            <FooterBottomLink>Privacy</FooterBottomLink>
            <FooterBottomLink>Terms</FooterBottomLink>
            <FooterBottomLink>Support</FooterBottomLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="relative inline-flex items-center text-white/70 hover:text-white transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-[#3b82f6] after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
    >
      {children}
    </Link>
  );
}

function FooterBottomLink({ children }) {
  return (
    <span className="cursor-default hover:text-white transition-colors duration-200">
      {children}
    </span>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="text-white/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h16v16H4z" opacity="0" />
      <path d="M4 6h16" opacity="0" />
      <path d="M4 6h16v12H4z" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="text-white/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.07 4.18 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.12.86.32 1.7.59 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.58a2 2 0 0 1 2.11-.45c.8.27 1.64.47 2.5.59A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

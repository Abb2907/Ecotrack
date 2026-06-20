import React from "react";
import { Leaf } from "lucide-react";

/**
 * Application footer component.
 *
 * Displays the EcoTrack brand, copyright information, and links
 * to privacy policy, GDPR portability, and terms of use.
 *
 * @returns The rendered footer element.
 */
export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-brand-dark/40 border-t border-brand-border py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-brand-primary/60" />
            <span className="text-sm font-semibold text-brand-muted">
              EcoTrack Sustainability Portal
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-brand-muted">
            <span>© {new Date().getFullYear()} EcoTrack Inc.</span>
            <span className="hover:text-brand-primary cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-brand-primary cursor-pointer transition-colors">GDPR Portability</span>
            <span className="hover:text-brand-primary cursor-pointer transition-colors">Terms of Use</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;

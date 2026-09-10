import { permanentRedirect } from 'next/navigation';

export default function TermsPage() {
  permanentRedirect('/terms-of-service');
}

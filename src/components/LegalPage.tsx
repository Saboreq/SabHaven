import type { ReactNode } from 'react';

import {
  GITHUB_REPOSITORY_URL,
  HOSTED_SERVICE_URL,
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR,
  PRIVACY_VERSION,
  TERMS_VERSION
} from '../lib/legal';

export type LegalKind = 'privacy' | 'terms' | 'acceptable-use' | 'abuse' | 'security' | 'contact';

interface LegalPageProps {
  kind: LegalKind;
}

interface Section {
  heading: string;
  body: ReactNode;
}

export function LegalPage({ kind }: LegalPageProps) {
  const page = legalPage(kind);

  return (
    <main className="legal-page" aria-labelledby="legal-title">
      <header className="legal-page__heading">
        <p className="eyebrow">{page.kicker}</p>
        <h1 id="legal-title">{page.title}</h1>
        <p>{page.intro}</p>
        {page.version ? <p className="legal-version">Effective: {page.version}</p> : null}
      </header>
      <div className="legal-page__content">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body}
          </section>
        ))}
      </div>
    </main>
  );
}

function legalPage(kind: LegalKind): {
  kicker: string;
  title: string;
  intro: ReactNode;
  version?: string;
  sections: Section[];
} {
  if (kind === 'privacy') {
    return {
      kicker: 'Legal',
      title: 'Privacy Policy',
      intro: <>This notice explains how the hosted SabHaven service at <a href={HOSTED_SERVICE_URL}>{HOSTED_SERVICE_URL}</a> handles personal data. Self-hosted SabHaven installations are controlled by their own operators.</>,
      version: PRIVACY_VERSION,
      sections: [
        {
          heading: '1. Controller and contact',
          body: <p>The operator and data controller for the hosted service is <strong>{LEGAL_OPERATOR}</strong>. Privacy requests can be sent to <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>.</p>
        },
        {
          heading: '2. Data we process',
          body: <><p>Depending on how you use SabHaven, we process account identifiers such as your email address and user ID, account role and invite-redemption records, file and folder metadata, the files you choose to upload, legal-acceptance records, and support or abuse-report information you send to us.</p><p>Infrastructure providers may also process technical information needed to deliver and secure the service, such as IP addresses, request metadata, browser information, timestamps and security logs.</p></>
        },
        {
          heading: '3. Why we process data',
          body: <><p>We process data to create and operate accounts, authenticate users, store and deliver files, enforce permissions, provide support, prevent abuse, investigate security incidents, maintain the service and comply with applicable legal obligations.</p><p>Where GDPR applies, these activities may rely on performance of the service contract, legitimate interests in operating and securing the service, compliance with legal obligations, and consent where a separate optional feature specifically requires it.</p></>
        },
        {
          heading: '4. Service providers and recipients',
          body: <><p>SabHaven uses third-party infrastructure including Supabase for authentication, database and storage services, Vercel for application hosting and delivery, and Cloudflare where it is used for DNS, network or security services. These providers may process information on our behalf under their applicable service terms and data-protection arrangements.</p><p>We may also disclose information when required by law, to protect users or the service, or to investigate credible abuse and security reports.</p></>
        },
        {
          heading: '5. International processing',
          body: <p>Some infrastructure providers may process data outside Poland or the European Economic Area. Where GDPR requires transfer safeguards, the relevant provider and operator arrangements are intended to use an applicable transfer mechanism. Exact processing locations can depend on provider configuration.</p>
        },
        {
          heading: '6. Retention',
          body: <><p>Account and content data is generally kept while the account or content remains active. When an eligible user deletes an account through SabHaven, the application attempts to remove that user's stored files and account-linked database records. Limited information may remain where required for legal, fraud-prevention, security or dispute purposes, and provider backups or security logs may persist according to provider retention schedules.</p><p>Support and abuse correspondence is retained only as long as reasonably necessary for the request, security, dispute or legal purpose for which it was collected.</p></>
        },
        {
          heading: '7. Browser storage and cookies',
          body: <p>SabHaven uses browser storage and similar strictly functional technology required for authentication and session continuity. The application does not currently include advertising or marketing trackers. If non-essential analytics or similar technologies are added later, this notice and any required consent controls will be updated.</p>
        },
        {
          heading: '8. Your rights',
          body: <><p>Where GDPR applies, you may have rights to access, correct, erase, restrict or receive your personal data, and to object to certain processing. You can request help at <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>. Signed-in users can also use the Account &amp; Privacy page to export account data or, where available, delete their account.</p><p>You may also complain to the competent data-protection authority, including the President of the Personal Data Protection Office (Prezes UODO) in Poland where applicable.</p></>
        },
        {
          heading: '9. Security and user responsibility',
          body: <p>SabHaven uses access controls and other technical safeguards, but no online system can guarantee absolute security. Keep your credentials confidential, use strong passwords and do not upload information you are not authorized to store or share.</p>
        },
        {
          heading: '10. Changes',
          body: <p>Material changes to this notice may be reflected by a new version date. If a change materially affects registered users, additional notice may be provided through the service where appropriate.</p>
        }
      ]
    };
  }

  if (kind === 'terms') {
    return {
      kicker: 'Legal',
      title: 'Terms of Service',
      intro: <>These Terms govern use of the hosted SabHaven service operated by <strong>{LEGAL_OPERATOR}</strong>. By creating an account or continuing to use the hosted service, you agree to these Terms.</>,
      version: TERMS_VERSION,
      sections: [
        {
          heading: '1. Service and operator',
          body: <><p>SabHaven provides invite-only file storage and delivery, public-download functionality, private member storage, account administration and related features. The hosted service is operated by <strong>{LEGAL_OPERATOR}</strong>. Contact: <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>.</p><p>These Terms apply to the hosted service at <a href={HOSTED_SERVICE_URL}>{HOSTED_SERVICE_URL}</a>. A person who independently self-hosts the open-source software is responsible for their own service terms, privacy disclosures and legal compliance.</p></>
        },
        {
          heading: '2. Technical requirements',
          body: <p>You need an internet connection, a current browser with JavaScript and secure storage enabled, and—when registering—a valid invitation and email address. You are responsible for your own device, connectivity and local security.</p>
        },
        {
          heading: '3. Accounts',
          body: <p>Registration is invitation-only. You must provide accurate account information, protect your credentials and notify us if you reasonably believe your account has been compromised. You are responsible for activity performed through your account unless applicable law provides otherwise.</p>
        },
        {
          heading: '4. Your content',
          body: <><p>You retain ownership of content you upload. You grant the operator a limited, non-exclusive right to host, copy, process and transmit that content only as reasonably necessary to operate, secure, maintain and legally administer SabHaven.</p><p>You must have the rights and permissions required to upload and share your content. Public content may be accessible without authentication. Private content is intended to be restricted by SabHaven's access controls, but no security mechanism is guaranteed to be perfect.</p></>
        },
        {
          heading: '5. Prohibited use',
          body: <p>You must follow the <a href="/acceptable-use">Acceptable Use Policy</a>. In particular, do not use SabHaven for unlawful content, malware, credential theft, abuse, infringement, unauthorized access attempts, service disruption or activity that violates another person's rights.</p>
        },
        {
          heading: '6. Moderation and illegal content',
          body: <p>We may restrict access to content or accounts when reasonably necessary to address illegal content, security threats, abuse, violations of these Terms or legal obligations. Reports can be submitted through the <a href="/abuse">Report abuse or illegal content</a> page. We may request enough information to identify and assess the reported material.</p>
        },
        {
          heading: '7. Availability, maintenance and changes',
          body: <p>The service is provided on an as-available basis. Maintenance, provider outages, security work or changes to the project can temporarily affect availability. Features may be changed, suspended or discontinued where reasonably necessary. We do not promise uninterrupted or error-free operation.</p>
        },
        {
          heading: '8. Backups and data loss',
          body: <p>Unless separately agreed in writing, SabHaven is not a managed backup service. Keep independent copies of important files. To the maximum extent permitted by applicable law, the operator is not responsible for losses caused solely by a user's failure to keep appropriate backups.</p>
        },
        {
          heading: '9. Suspension and termination',
          body: <p>You may stop using the service at any time. Eligible signed-in users can request account deletion through the Account &amp; Privacy page. We may suspend or terminate access for material violations, security threats, legal requirements or serious abuse. Where appropriate and lawful, we may provide notice or an opportunity to correct the issue.</p>
        },
        {
          heading: '10. Complaints and support',
          body: <p>Service complaints, privacy requests and general support requests may be sent to <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>. Include enough detail for us to understand the issue and identify the relevant account, content or event without sending unnecessary sensitive information.</p>
        },
        {
          heading: '11. Disclaimers and liability',
          body: <><p>SabHaven is open-source software and the hosted service depends on third-party infrastructure. To the maximum extent permitted by law, no warranty is made that the service will always be available, secure, free from defects or suitable for every purpose.</p><p>Nothing in these Terms excludes or limits rights or liability that cannot lawfully be excluded or limited, including mandatory consumer protections that apply to you.</p></>
        },
        {
          heading: '12. Governing law',
          body: <p>These Terms are governed by the laws of Poland, subject to any mandatory consumer-protection or jurisdiction rules that apply regardless of this clause.</p>
        },
        {
          heading: '13. Changes to the Terms',
          body: <p>We may update these Terms for legal, security, operational or feature changes. A new version date will identify updated Terms. Where a change materially affects existing registered users, renewed acceptance or additional notice may be requested where appropriate.</p>
        }
      ]
    };
  }

  if (kind === 'acceptable-use') {
    return {
      kicker: 'Policy',
      title: 'Acceptable Use Policy',
      intro: 'Use SabHaven responsibly. This policy applies to accounts, uploads, downloads, public links and attempts to interact with the service.',
      version: TERMS_VERSION,
      sections: [
        {
          heading: 'Allowed use',
          body: <p>You may use SabHaven to store and share files you are legally entitled to possess and distribute, subject to your account permissions and the service's technical limits.</p>
        },
        {
          heading: 'Prohibited content',
          body: <ul><li>Content that is illegal to possess, distribute or make available.</li><li>Malware, ransomware, credential-stealing material or files intended to compromise other systems.</li><li>Content that infringes copyright, privacy, confidentiality or other rights when you do not have a lawful basis to use it.</li><li>Material used for harassment, threats, fraud, impersonation, exploitation or other unlawful abuse.</li></ul>
        },
        {
          heading: 'Prohibited behavior',
          body: <ul><li>Attempting to bypass authentication, authorization, storage policies or account boundaries.</li><li>Scanning, scraping or automated traffic that materially degrades the service or ignores reasonable rate limits.</li><li>Interfering with availability, introducing malicious code or attempting denial-of-service activity.</li><li>Using another person's credentials or accessing content without authorization.</li><li>Misrepresenting the origin, ownership or legality of uploaded content.</li></ul>
        },
        {
          heading: 'Enforcement',
          body: <p>We may remove or restrict content, suspend an account, preserve relevant evidence or make legally required disclosures when reasonably necessary to enforce this policy, protect users and infrastructure, or comply with law. Proportionate action will depend on the seriousness, recurrence and legal context of the issue.</p>
        },
        {
          heading: 'Reports',
          body: <p>Report suspected abuse or illegal content at <a href="/abuse">/abuse</a> or by email to <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>.</p>
        }
      ]
    };
  }

  if (kind === 'abuse') {
    return {
      kicker: 'Trust & safety',
      title: 'Report abuse or illegal content',
      intro: 'Use this channel for content or activity you believe is illegal, abusive, infringing or dangerous. Security vulnerabilities should be reported through the Security page instead.',
      sections: [
        {
          heading: 'How to submit a report',
          body: <><p>Email <a href={'mailto:' + LEGAL_CONTACT_EMAIL + '?subject=SabHaven%20abuse%20or%20illegal%20content%20report'}>{LEGAL_CONTACT_EMAIL}</a> with the subject “SabHaven abuse or illegal content report”.</p><p>Please include the exact SabHaven URL or file/folder identifier you are reporting, a clear explanation of the issue, the legal right or rule you believe is affected where known, supporting context or evidence, and a reliable way to contact you. Avoid sending unrelated personal data.</p></>
        },
        {
          heading: 'Good-faith and sufficiently detailed notices',
          body: <p>Reports should be submitted in good faith and should contain enough information for the operator to locate and assess the material. A report that does not identify the relevant content or explain the concern may require follow-up before action can be taken.</p>
        },
        {
          heading: 'What happens next',
          body: <p>Reports are reviewed based on available information, applicable law, service rules, user safety and security. Possible outcomes include no action, a request for more information, restricting access, removal, account action, preservation of relevant records or escalation where legally required.</p>
        },
        {
          heading: 'Copyright and rights complaints',
          body: <p>If you are reporting infringement, identify the protected work or right, the specific SabHaven material at issue, your relationship to the right holder and why you believe the use is unauthorized.</p>
        },
        {
          heading: 'Emergency situations',
          body: <p>Do not rely on this mailbox for emergency response. If there is an immediate threat to life or physical safety, contact the appropriate emergency service or competent authority first.</p>
        }
      ]
    };
  }

  if (kind === 'security') {
    return {
      kicker: 'Security',
      title: 'Security and responsible disclosure',
      intro: 'Security reports are welcome. Please avoid public disclosure of an unpatched vulnerability until there has been a reasonable opportunity to investigate and remediate it.',
      sections: [
        {
          heading: 'Report privately',
          body: <p>Email <a href={'mailto:' + LEGAL_CONTACT_EMAIL + '?subject=SabHaven%20security%20report'}>{LEGAL_CONTACT_EMAIL}</a> with the subject “SabHaven security report”. You can also review the repository's <a href={GITHUB_REPOSITORY_URL + '/blob/main/SECURITY.md'} rel="noreferrer" target="_blank">SECURITY.md</a>.</p>
        },
        {
          heading: 'Include useful detail',
          body: <p>Include the affected URL or component, reproduction steps, expected and observed behavior, security impact and any minimal proof of concept needed to reproduce the issue. Do not send real user secrets or unrelated personal data.</p>
        },
        {
          heading: 'Research boundaries',
          body: <ul><li>Do not access, modify or download another user's private data.</li><li>Do not perform denial-of-service, destructive testing, social engineering or credential attacks.</li><li>Use test accounts and the minimum activity necessary to demonstrate the issue.</li><li>Stop if testing would cause harm or expose data beyond what is needed to establish the vulnerability.</li></ul>
        },
        {
          heading: 'Open-source security',
          body: <p>Security-sensitive implementation details, threat-model notes and remediation work are tracked in the public repository when disclosure is safe. A public repository does not authorize attacks against the hosted service or third-party infrastructure.</p>
        }
      ]
    };
  }

  if (kind === 'contact') {
    return {
      kicker: 'Contact',
      title: 'Contact SabHaven',
      intro: <>The hosted service is operated by <strong>{LEGAL_OPERATOR}</strong>.</>,
      sections: [
        {
          heading: 'General, privacy and legal',
          body: <p>Email <a href={'mailto:' + LEGAL_CONTACT_EMAIL}>{LEGAL_CONTACT_EMAIL}</a>. Please use a descriptive subject and avoid sending passwords, access tokens or unnecessary sensitive information.</p>
        },
        {
          heading: 'Abuse or illegal content',
          body: <p>Use the <a href="/abuse">abuse-reporting page</a> so your report includes the information needed to identify and assess the content.</p>
        },
        {
          heading: 'Security vulnerabilities',
          body: <p>Use the <a href="/security">security page</a> and report vulnerabilities privately before public disclosure.</p>
        },
        {
          heading: 'Open-source project',
          body: <p>Source code, public issues and contribution information are available at <a href={GITHUB_REPOSITORY_URL} rel="noreferrer" target="_blank">{GITHUB_REPOSITORY_URL}</a>.</p>
        }
      ]
    };
  }

  return {
    kicker: 'Legal',
    title: 'Legal information',
    intro: 'The requested legal page could not be found.',
    sections: []
  };
}

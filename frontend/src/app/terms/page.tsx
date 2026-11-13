import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | PolyMate",
  description:
    "Read the terms and conditions for using PolyMate's educational platform.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: [
      "Welcome to PolyMate. These Terms of Service govern your access to and use of the PolyMate educational platform.",
      "By accessing PolyMate or creating an account, you agree to these terms. If you do not agree, you should not use the platform.",
    ],
  },
  {
    title: "2. About PolyMate",
    content: [
      "PolyMate is an educational platform designed to help diploma and polytechnic students access study materials, notes, question papers and academic support.",
      "The platform enables authorized faculty members to share educational resources and allows students to access available materials for academic learning.",
      "PolyMate is an independent educational platform and does not represent an official examination board, university or government authority unless explicitly stated.",
    ],
  },
  {
    title: "3. Account Registration and Eligibility",
    content: [
      "Users must provide accurate information when creating an account and keep their account information up to date.",
      "Users are responsible for maintaining the confidentiality of their login credentials and for activity conducted through their accounts.",
      "Faculty accounts may be subject to approval, verification or suspension by authorized platform administrators.",
      "Users who are minors must obtain parent or guardian permission where required by applicable law.",
    ],
  },
  {
    title: "4. Acceptable Use",
    content: [
      "PolyMate must be used for lawful educational and academic purposes.",
      "Users must not upload malicious files, distribute harmful content, impersonate another person, harass other users or attempt to gain unauthorized access to accounts or systems.",
      "Users must not interfere with platform operations, bypass security controls or misuse automated services.",
      "Users must not use PolyMate to distribute unauthorized examination materials or engage in academic misconduct.",
    ],
  },
  {
    title: "5. Educational Materials and Copyright",
    content: [
      "Study materials available on PolyMate may belong to their respective authors, institutions or copyright holders.",
      "Faculty members who upload materials must have the necessary rights or permission to share those materials.",
      "Students may access available materials for personal educational purposes, subject to applicable copyright restrictions.",
      "Users must not reproduce, sell, redistribute or commercially exploit protected materials without appropriate permission.",
      "PolyMate may remove materials that violate copyright, applicable law or platform guidelines.",
    ],
  },
  {
    title: "6. Faculty Responsibilities",
    content: [
      "Faculty members are responsible for ensuring that uploaded educational materials are accurate, relevant and appropriately categorized.",
      "Faculty members must not upload confidential student information, unauthorized personal data or files containing malicious software.",
      "Uploaded materials may be reviewed, restricted or removed by authorized administrators when necessary.",
    ],
  },
  {
    title: "7. Community and Academic Support",
    content: [
      "PolyMate Community allows students to submit academic material requests, feedback, technical issues and support requests.",
      "Users must communicate respectfully and provide relevant information when submitting requests or messages.",
      "PolyMate aims to respond to requests within a reasonable period, but does not guarantee that every request will be fulfilled or resolved within a specific time.",
      "Community conversations are intended for the requesting student and authorized administrators, subject to the Privacy Policy.",
    ],
  },
  {
    title: "8. Notifications and Email Services",
    content: [
      "PolyMate may provide in-app notifications and service-related email notifications concerning account activity, Community requests and administrative updates.",
      "Official administrative notifications may be sent through the authorized PolyMate Gmail account using the Google Gmail API.",
      "Email delivery depends on external service availability and is not guaranteed to be immediate.",
      "Users should refer to the platform dashboard for the latest account information and request status.",
    ],
  },
  {
    title: "9. Third-Party Services",
    content: [
      "PolyMate uses third-party services, including Firebase Authentication, Supabase, Vercel, Render and Google APIs, to provide platform functionality.",
      "Use of these services may also be subject to their respective terms, policies and service limitations.",
      "PolyMate does not control the availability or operation of third-party services.",
    ],
  },
  {
    title: "10. Service Availability",
    content: [
      "PolyMate aims to provide a reliable educational service. However, temporary interruptions may occur due to maintenance, technical issues, hosting limitations or circumstances outside our control.",
      "Features and available materials may be updated, modified or discontinued when necessary.",
      "PolyMate does not guarantee uninterrupted access to every feature or educational resource.",
    ],
  },
  {
    title: "11. Account Suspension and Termination",
    content: [
      "PolyMate may restrict or suspend accounts that violate these terms, misuse platform resources or create security risks.",
      "Users may contact PolyMate to request account closure or review of an account restriction.",
      "Account closure and data deletion requests are handled in accordance with the Privacy Policy and applicable requirements.",
    ],
  },
  {
    title: "12. Educational Disclaimer",
    content: [
      "PolyMate provides educational resources for learning and academic reference.",
      "While we aim to support accurate and useful content, we do not guarantee that all materials are complete, current or free from errors.",
      "Students should verify important academic information, examination schedules and official requirements with their institutions or relevant educational authorities.",
      "Use of PolyMate does not guarantee examination results, academic qualifications or employment outcomes.",
    ],
  },
  {
    title: "13. Privacy and Data Protection",
    content: [
      "PolyMate handles personal information as described in its Privacy Policy.",
      "Users should review the Privacy Policy to understand how account information, authentication data, educational activity and support information are processed.",
    ],
  },
  {
    title: "14. Changes to These Terms",
    content: [
      "These Terms of Service may be updated to reflect changes in platform features, security practices or applicable requirements.",
      "The latest version will be available on this page. Material changes may be communicated through the platform where appropriate.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="text-xl font-bold text-blue-600 dark:text-blue-400"
          >
            PolyMate
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <div className="mb-5 inline-flex rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <FileText className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Effective date: November 13, 2026
          </p>

          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Please read these terms carefully before using
            PolyMate. They explain your rights,
            responsibilities and the guidelines for using
            our educational platform.
          </p>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          {sections.map((section) => (
            <section
              key={section.title}
              className="mb-8 border-b border-slate-100 pb-8 last:mb-0 last:border-0 last:pb-0 dark:border-slate-800"
            >
              <h2 className="mb-4 text-lg font-semibold">
                {section.title}
              </h2>

              <div className="space-y-3">
                {section.content.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-7 text-slate-600 dark:text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-4 text-lg font-semibold">
              15. Contact Us
            </h2>

            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              For questions about these Terms of Service,
              copyright concerns or platform support,
              please contact PolyMate.
            </p>

            <a
              href="mailto:polymate.official@gmail.com"
              className="mt-4 inline-flex items-center gap-2 break-all text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <Mail className="h-4 w-4 shrink-0" />
              polymate.official@gmail.com
            </a>

            <div className="mt-6">
              <Link
                href="/privacy"
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Read our Privacy Policy
              </Link>
            </div>
          </section>
        </article>

        <footer className="mt-8 text-center text-sm text-slate-500">
          &copy; 2026 PolyMate. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

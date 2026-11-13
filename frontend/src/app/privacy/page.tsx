import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | PolyMate",
  description:
    "Learn how PolyMate collects, uses and protects your information.",
};

const sections = [
  {
    title: "1. Introduction",
    content: [
      "PolyMate is an educational platform designed to help diploma and polytechnic students access study materials, question papers and academic support.",
      "This Privacy Policy explains how information is collected, used, stored and protected when you use PolyMate.",
    ],
  },
  {
    title: "2. Information We Collect",
    content: [
      "Account information may include your name, email address, institution and account role, such as student or faculty.",
      "Faculty members may provide academic details and upload educational PDF materials.",
      "We also process bookmarks, Community requests, support messages and related activity necessary to provide platform features.",
    ],
  },
  {
    title: "3. Authentication and Google Sign-In",
    content: [
      "PolyMate uses Firebase Authentication to manage account registration, login, email verification and password recovery.",
      "If you choose Google Sign-In, we receive basic account information authorized through Google, such as your name and email address.",
      "PolyMate does not receive or store your Google account password.",
    ],
  },
  {
    title: "4. How We Use Your Information",
    content: [
      "We use your information to authenticate your account, provide educational materials, manage faculty uploads, respond to Community requests and maintain platform security.",
      "Information may also be used to deliver relevant service notifications, improve reliability and investigate technical or security issues.",
      "PolyMate does not sell personal information.",
    ],
  },
  {
    title: "5. Google Gmail API and Email Notifications",
    content: [
      "PolyMate uses the Google Gmail API to send official administrative notifications and service test emails through its authorized official Gmail account.",
      "The Gmail sending permission is used to send platform-related notifications. PolyMate does not use this permission to read, search or delete Gmail inbox messages.",
      "Official Community notifications contain limited request information and a reference to the secure administrator dashboard. Student passwords and private support conversations are not included in these notifications.",
      "PolyMate's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
    ],
  },
  {
    title: "6. Data Storage and Service Providers",
    content: [
      "PolyMate uses Firebase Authentication for account authentication, Supabase PostgreSQL for application data and Supabase Storage for educational PDF files.",
      "The website is hosted on Vercel, and backend services are hosted on Render.",
      "These service providers process information as necessary to operate the platform, subject to their applicable privacy policies and security practices.",
    ],
  },
  {
    title: "7. Data Sharing and Access",
    content: [
      "Information is accessible to authorized users and administrators according to their responsibilities and platform permissions.",
      "Community requests and support conversations are intended for the requesting student and authorized administrators.",
      "We may disclose information when required by applicable law or when reasonably necessary to protect the security and integrity of the platform.",
    ],
  },
  {
    title: "8. Data Security",
    content: [
      "PolyMate uses authenticated access, role-based authorization and secure network connections to help protect account information and application data.",
      "Access to backend credentials and administrative operations is restricted.",
      "Although reasonable security measures are used, no internet-based service can guarantee absolute security.",
    ],
  },
  {
    title: "9. Data Retention and Deletion",
    content: [
      "Information is retained as needed to operate accounts, provide educational services, resolve support requests and maintain platform security.",
      "Users may contact PolyMate to request access, correction or deletion of their personal information.",
      "Deletion requests will be reviewed subject to applicable legal, security and operational requirements.",
    ],
  },
  {
    title: "10. Cookies and Local Storage",
    content: [
      "PolyMate and its authentication services may use cookies or browser storage to maintain login sessions, remember preferences and support essential website functionality.",
      "Users can manage browser storage through their browser settings. Disabling essential storage may affect authentication and other platform features.",
    ],
  },
  {
    title: "11. Student Privacy",
    content: [
      "PolyMate is intended for educational use by diploma and polytechnic students and faculty.",
      "Users should provide only information necessary for academic and support purposes. Students who are minors should use the platform with appropriate parent, guardian or institutional guidance where required.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    content: [
      "This Privacy Policy may be updated when platform features, service providers or applicable requirements change.",
      "The latest version will be available on this page.",
    ],
  },
];

export default function PrivacyPage() {
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
            <ShieldCheck className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Effective date: November 13, 2026
          </p>

          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Your privacy matters. This policy explains how
            PolyMate handles your information and protects
            your privacy while providing educational services.
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
              13. Contact Us
            </h2>

            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              For privacy questions, account deletion requests
              or concerns about your information, contact
              PolyMate through our official email address.
            </p>

            <a
              href="mailto:polymate.official@gmail.com"
              className="mt-4 inline-flex items-center gap-2 break-all text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <Mail className="h-4 w-4 shrink-0" />
              polymate.official@gmail.com
            </a>

            <div className="mt-6">
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                Google API Services User Data Policy
              </a>
            </div>
          </section>
        </article>

        <footer className="mt-8 text-center text-sm text-slate-500">
          &copy; 2026 PolyMate.
          All rights reserved.
        </footer>
      </div>
    </main>
  );
}

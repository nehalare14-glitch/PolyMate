"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InstallAppButton } from "@/components/pwa/PWAProvider";
import Image from "next/image";
import logoLight from "../../../public/images/polymate-logo-light.webp";
import logoDark from "../../../public/images/polymate-logo-dark.jpeg";
import googleLogo from "../../../public/images/google-logo.png";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  loginWithEmail,
  loginWithGoogle,
  resendVerificationEmail,
} from "@/lib/auth-service";
import { auth } from "@/lib/firebase";
import { getDashboardPath, type UserRole } from "@/lib/roles";
import { completeRegistration } from "@/lib/registration-completion";

type Profile = {
  user: {
    role: UserRole;
  };
};


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function redirectToDashboard(profile: Profile) {


    router.replace(getDashboardPath(profile.user.role));
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithEmail(email, password).catch((error) => { if (!(error instanceof Error) || !error.message.includes("Profile not found")) throw error; });
      const profile = await completeRegistration();
      redirectToDashboard(profile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setError("");

    try {
      const message = await resendVerificationEmail();
      setError(message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send verification email."
      );
    }
  }
  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {

      const profile = await loginWithGoogle() as Profile;


      if (profile.user.role !== "student") {
        await auth.signOut();
        setError(
          "Google Sign-In is available for registered students only."
        );
        return;
      }

      router.replace("/student/dashboard");

    } catch (err) {

      if (
        err instanceof Error &&
        err.message.includes("Profile not found")
      ) {
        await auth.signOut();
        setError(
          "You're not registered with PolyMate. Please register as a student first."
        );
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in failed."
      );
    } finally {
      setLoading(false);
    }
  }



  return (
    <main className="min-h-dvh bg-[#f5f7fb] dark:bg-[#0f172a] lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#102b60] px-10 py-8 text-white lg:flex lg:flex-col lg:justify-between xl:px-12">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-48 -left-32 h-[500px] w-[500px] rounded-full border border-white/10" />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1746a2]">
            <GraduationCap size={25} />
          </span>
          <span className="text-2xl font-bold tracking-tight">PolyMate</span>
        </Link>

        <div className="relative max-w-lg">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-blue-100">
            <Sparkles size={16} />
            Your diploma learning companion
          </div>

          <h1 className="text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
            Everything you need to
            <span className="block text-[#91bdff]">learn better.</span>
          </h1>

          <p className="mt-6 max-w-md text-lg leading-8 text-blue-100/80">
            Access subject notes, previous question papers, syllabus,
            and essential academic resources in one organized place.
          </p>

          <div className="mt-8 grid max-w-md gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-blue-200">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 className="font-semibold">Organized study materials</h3>
                <p className="mt-1 text-sm text-blue-100/70">
                  Find resources by branch, semester, and subject.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-blue-200">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-semibold">Secure student access</h3>
                <p className="mt-1 text-sm text-blue-100/70">
                  Your academic resources in a protected workspace.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-blue-100/60">
          &copy; 2026 PolyMate. Built for diploma students.
        </p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-5 py-8 sm:px-10 lg:py-6">
        <div className="w-full max-w-[430px]">
          <Link
            href="/"
            className="mb-12 flex items-center gap-2 text-[#1746a2] dark:text-blue-400 lg:hidden"
          >
            <GraduationCap size={30} />
            <span className="text-2xl font-bold">PolyMate</span>
          </Link>

          <div className="mb-5">
            <div className="mb-3 flex justify-center">
              <Image
                src={logoLight}
                alt="PolyMate"
                className="h-auto w-full max-w-[220px] rounded-xl object-contain dark:hidden"
              />
              <Image
                src={logoDark}
                alt="PolyMate"
                className="hidden h-auto w-full max-w-[220px] rounded-xl object-contain dark:block"
              />
            </div>
            <p className="mt-3 text-center text-[#111827] dark:text-slate-100">
              Sign in to continue your learning journey.
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100">
                Email address
              </label>
              <div className="relative">
                <Mail size={19} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-12 pr-4 text-[#111827] dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-[#111827] dark:text-slate-100">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm font-semibold text-[#1746a2] dark:text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole size={19} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-12 pr-12 text-[#111827] dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-3.5 text-slate-400"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
  <div className="space-y-2">
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {error}
    </p>

    {error.includes("not registered with PolyMate") && (
      <Link
        href="/register?type=student"
        className="inline-block text-sm font-semibold text-blue-700 hover:underline"
      >
        Register Now
      </Link>
    )}
  </div>
)}
              {error.toLowerCase().includes("verif") && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  Resend Verification Email
                </button>
              )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1746a2] font-semibold text-white hover:bg-[#123b89] disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={19} />}
            </button>
          </form>
          <div className="mt-4">          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image src={googleLogo} width={20} height={20} alt="" aria-hidden="true" className="h-5 w-5 shrink-0 object-contain" />
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              New to PolyMate?
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          </div>

          <div className="mt-5">
            <p className="mb-4 text-center text-sm text-[#111827] dark:text-slate-100">
              Choose your account type
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/register?type=student"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950 px-3 py-4 text-[#1746a2] dark:text-blue-400 hover:border-blue-400 hover:bg-blue-100 dark:bg-blue-900"
              >
                <GraduationCap size={24} />
                <span className="text-sm font-semibold">
                  Register as Student
                </span>
              </Link>

              <Link
                href="/register?type=faculty"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-4 text-[#111827] dark:text-slate-100 hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-950"
              >
                <BookOpen size={24} />
                <span className="text-sm font-semibold">
                  Register as Faculty
                </span>
              </Link>
            </div>
          </div>

          <InstallAppButton className="mt-6" />

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure authentication powered by Firebase
          </p>
        </div>
      </section>
    </main>
  );
}

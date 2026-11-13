"use client";

import InstitutionSelector from "@/components/auth/InstitutionSelector";

import { useState, type FormEvent } from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpenCheck,
  Mail,
  LockKeyhole,
  UserRound,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  submitStudentRegistration,
  submitFacultyApplication,
} from "@/lib/auth-service";

type AccountType = "student" | "faculty";

function subscribeToAccountType(callback: () => void) {
  window.addEventListener("popstate", callback);

  return () =>
    window.removeEventListener("popstate", callback);
}

function getAccountType(): AccountType {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("type") === "faculty"
    ? "faculty"
    : "student";
}

function getServerAccountType(): AccountType {
  return "student";
}

export default function RegisterPage() {
  const requestedType = useSyncExternalStore(
    subscribeToAccountType,
    getAccountType,
    getServerAccountType
  );

  const [selectedType, setType] =
    useState<AccountType | null>(null);

  const type = selectedType ?? requestedType;
  const [name, setName] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [facultyBranch, setFacultyBranch] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const fullName = name.trim();
    const collegeCode = institutionCode.trim();
    const accountEmail = email.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (fullName.length < 2 || fullName.length > 80) {
      setError("Full name must contain 2 to 80 characters.");
      return;
    }

    if (!collegeCode) {
      setError("Please select your institution.");
      return;
    }

    const branches = [
      "CSE", "ECE", "EEE", "MEC",
      "CIVIL", "AIML", "CCP"
    ];

    if (
      type === "faculty" &&
      !branches.includes(facultyBranch)
    ) {
      setError("Please select a valid faculty branch.");
      return;
    }

    setLoading(true);

    let registrationUser = null;
    let profileSaved = false;

    try {
      try {
        const result = await createUserWithEmailAndPassword(
          auth,
          accountEmail,
          password
        );

        registrationUser = result.user;
      } catch (creationError) {
        const code = (
          creationError as { code?: string }
        )?.code;

        if (code !== "auth/email-already-in-use") {
          throw creationError;
        }

        // Recover an unfinished registration securely.
        // The user must prove ownership with their password.
        const result = await signInWithEmailAndPassword(
          auth,
          accountEmail,
          password
        );

        registrationUser = result.user;
      }

      // Save the complete profile before reporting success.
      // Supabase is the permanent source of registration data.
      const response =
        type === "faculty"
          ? await submitFacultyApplication(
              fullName,
              facultyBranch,
              collegeCode
            )
          : await submitStudentRegistration(
              fullName,
              collegeCode
            );

      const profile = response?.user;

      if (
        !profile ||
        profile.role !== type ||
        !profile.full_name ||
        !profile.email ||
        profile.institution_id == null ||
        !profile.institution_name
      ) {
        throw new Error(
          "Registration details could not be confirmed. Please retry."
        );
      }

      // Existing profiles must not be silently overwritten.
      if (
        String(profile.college_code) !== collegeCode ||
        profile.full_name !== fullName ||
        (
          type === "faculty" &&
          profile.faculty_branch !== facultyBranch
        )
      ) {
        throw new Error(
          "This account already has different registered details. Sign in to view your existing profile."
        );
      }

      profileSaved = true;

      // Browser storage is no longer required for new registrations.
      // Remove only the old recovery data belonging to this UID.
      try {
        const key =
          `polymate-registration-${registrationUser.uid}`;

        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // Storage availability must not block registration.
      }

      // Supabase is authoritative for profile information.
      // Firebase display name is a convenience, not a dependency.
      try {
        await updateProfile(registrationUser, {
          displayName: fullName,
        });
      } catch {
        // A display-name update failure does not lose the profile.
      }

      await registrationUser.reload();

      if (!registrationUser.emailVerified) {
        await sendEmailVerification(registrationUser);

        setSuccess(
          type === "faculty"
            ? "Faculty registration saved successfully! Verify your email, then wait for Admin approval."
            : "Registration saved successfully! Verify your email before signing in."
        );
      } else {
        setSuccess(
          type === "faculty"
            ? "Faculty registration is complete. Sign in to check your approval status."
            : "Registration is complete. You can now sign in."
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed.";

      setError(
        profileSaved
          ? "Your profile is saved, but email verification could not be completed. Sign in to resend verification. " + message
          : message + " If your account was already created, retry registration using the same email and password."
      );
    } finally {
      if (registrationUser) {
        try {
          await signOut(auth);
        } catch {
          // Preserve the original registration result.
        }
      }

      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-[#111827] dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-dvh bg-[#f5f7fb] dark:bg-[#0f172a] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-[#1746a2] dark:text-blue-400"
        >
          <GraduationCap size={30} />
          <span className="text-2xl font-bold">PolyMate</span>
        </Link>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm sm:p-9">
          <h1 className="text-3xl font-bold text-[#111827] dark:text-slate-100">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-[#111827] dark:text-slate-100">
            Join the PolyMate academic community.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            {([
              ["student", "Student", GraduationCap],
              ["faculty", "Faculty", BookOpenCheck],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setType(value);
                  setError("");
                  setSuccess("");
                }}
                aria-pressed={type === value}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-5 font-semibold ${
                  type === value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700"
                    : "border-slate-200 dark:border-slate-600 text-[#111827] dark:text-slate-100"
                }`}
              >
                <Icon size={26} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="mt-7 space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100">
                Full name
              </label>
              <div className="relative">
                <UserRound size={18} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  id="fullName"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className={`${fieldClass} pl-11`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100">
                Email address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`${fieldClass} pl-11`}
                />
              </div>
            </div>



            {type === "faculty" && (
              <div>
                <label
                  htmlFor="facultyBranch"
                  className="mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100"
                >
                  Faculty Branch
                </label>
                <select
                  id="facultyBranch"
                  required
                  value={facultyBranch}
                  onChange={(e) => setFacultyBranch(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Select your branch</option>
                  <option value="CSE">Computer Science Engineering (CSE)</option>
                  <option value="ECE">Electronics & Communication (ECE)</option>
                  <option value="EEE">Electrical & Electronics (EEE)</option>
                  <option value="MEC">Mechanical Engineering (MEC)</option>
                  <option value="CIVIL">Civil Engineering (CIVIL)</option>
                  <option value="AIML">Artificial Intelligence & ML (AIML)</option>
                  <option value="CCP">Computer & Commercial Practice (CCP)</option>
                </select>
              </div>
            )}

            <InstitutionSelector
              value={institutionCode}
              onChange={setInstitutionCode}
            />
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100">
                Password
              </label>
              <div className="relative">
                <LockKeyhole size={18} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className={`${fieldClass} pl-11`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#111827] dark:text-slate-100">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={fieldClass}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <div role="status" className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 size={19} className="shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1746a2] py-3.5 font-semibold text-white hover:bg-[#123b89] disabled:opacity-60"
            >
              {loading ? "Creating account..." : `Register as ${type === "student" ? "Student" : "Faculty"}`}
              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#111827] dark:text-slate-100">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

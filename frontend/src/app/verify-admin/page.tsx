"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function VerifyAdminPage() {
  const [email, setEmail] = useState("polymate.official@gmail.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function sendVerification() {
    setMessage("Sending verification email...");

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (result.user.emailVerified) {
        setMessage("This email is already verified.");
      } else {
        await sendEmailVerification(result.user);
        setMessage("Verification email sent. Check your Gmail inbox and spam folder.");
      }

      await signOut(auth);
      setPassword("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send verification email."
      );
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>PolyMate Email Verification</h1>

      <p>Verify the official Super Admin email.</p>

      <input
        type="email"
        value={email}
        readOnly
        style={{ width: "100%", padding: 12, marginBottom: 12 }}
      />

      <input
        type="password"
        placeholder="Firebase account password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 12, marginBottom: 12 }}
      />

      <button
        onClick={sendVerification}
        style={{ padding: 12, cursor: "pointer" }}
      >
        Send Verification Email
      </button>

      <p role="status">{message}</p>
    </main>
  );
}

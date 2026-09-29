import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { VerifyForm } from "./VerifyForm";
import { Stepper } from "../../Stepper";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyPage() {
  const email = (await cookies()).get("sp-pending-email")?.value;
  return (
    <div className="card card-pad sm:p-7">
      <Stepper step={2} />
      <h1 className="text-2xl font-extrabold">Check your email</h1>
      {email ? (
        <>
          <p className="mt-1 text-ink-2">
            We sent a 6-digit code to <strong className="text-ink">{email}</strong>. It expires in 1 hour.
          </p>
          <VerifyForm />
        </>
      ) : (
        <p className="mt-2 text-ink-2">
          This sign-up has expired.{" "}
          <Link className="font-extrabold text-blue" href="/signup">
            Start again
          </Link>
          .
        </p>
      )}
    </div>
  );
}

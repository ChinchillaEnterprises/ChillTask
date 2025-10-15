import * as React from "react";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/Authentication/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

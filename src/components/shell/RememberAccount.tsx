"use client";
import { useEffect } from "react";
import { rememberDeviceAccount } from "@/lib/device-accounts";

export function RememberAccount({ email, username, avatarColour, demo }: { email: string; username: string; avatarColour: string; demo: boolean }) {
  useEffect(() => {
    if (!demo) rememberDeviceAccount({ email, username, avatarColour });
  }, [email, username, avatarColour, demo]);
  return null;
}

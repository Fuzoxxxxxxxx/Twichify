"use client";

import { useEffect } from "react";

export default function ChatbotPage() {
  useEffect(() => {
    window.location.href = "/dashboard";
  }, []);

  return null;
}

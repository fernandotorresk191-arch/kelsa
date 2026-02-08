"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Button } from "../ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={() => router.back()}
    >
      <FiArrowLeft className="mr-2" />
      Назад
    </Button>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center",
            padding: "2rem",
            background: "linear-gradient(to bottom, #ffffff, #f5f0ff, #ffffff)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>🔧</div>

          <h1
            style={{
              fontSize: "5rem",
              fontWeight: 900,
              background: "linear-gradient(135deg, #7c3aed, #ec4899, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
              marginBottom: "1rem",
            }}
          >
            500
          </h1>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 0.75rem" }}>
            Мы уже всё чиним!
          </h2>

          <p style={{ color: "#6b7280", maxWidth: "420px", lineHeight: 1.6, marginBottom: "2rem" }}>
            Что-то пошло не так на нашей стороне. Команда уже работает над
            исправлением — скоро вернёмся в строй!
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#fff",
              border: "1px solid #ede9fe",
              borderRadius: "16px",
              padding: "14px 24px",
              marginBottom: "2rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#fbbf24",
              }}
            />
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>
              Ведутся технические работы
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(to right, #7c3aed, #ec4899)",
                boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
              }}
            >
              Попробовать снова
            </button>

            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#6d28d9",
                background: "#ede9fe",
                textDecoration: "none",
              }}
            >
              На главную
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

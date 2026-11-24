import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;

  const size =
    filename === "icon-192.png"
      ? 192
      : filename === "icon-512.png"
      ? 512
      : null;

  if (!size) {
    return new Response("Not found", { status: 404 });
  }

  const badgeSize = Math.round(size * 0.68);
  const iconSize = Math.round(size * 0.44);
  const radius = Math.round(size * 0.17);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
        }}
      >
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            borderRadius: radius,
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4" />
            <path d="M12 12a12.6 12.6 0 0 1-8.7 5" />
            <path d="M16.8 13.6a16.55 16.55 0 0 1-9 7.5" />
            <path d="M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10" />
            <path d="M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5" />
          </svg>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
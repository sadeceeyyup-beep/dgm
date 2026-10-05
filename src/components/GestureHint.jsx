import React from "react";
export default function GestureHint({ motion = false, scroll = false }) {
  return (
    <svg
      viewBox="0 0 32 40"
      fill="none"
      aria-hidden="true"
      className={`gesture-icon ${scroll ? "scroll" : ""}`}
    >
      {motion
        ? (
          <>
            <rect
              x="9"
              y="4"
              width="14"
              height="28"
              rx="4"
              stroke="currentColor"
            />
            <path
              d="M14 28h4M4 11l-2 5 3 5M28 11l2 5-3 5"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </>
        )
        : (
          <>
            <path
              d="M13 23V12a3 3 0 0 1 6 0v8m0-3 4 1a4 4 0 0 1 3 4v6a8 8 0 0 1-8 8h-1c-3 0-5-2-7-5l-4-6a3 3 0 0 1 4-4l3 2Z"
              stroke="currentColor"
              strokeLinecap="round"
            />
            <path
              d="M16 3v3m-5-1 5-3 5 3"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </>
        )}
      <circle cx="16" cy="4" r="1.5" fill="currentColor" />
    </svg>
  );
}

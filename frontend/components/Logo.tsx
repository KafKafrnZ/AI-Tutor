import type { SVGProps } from "react";

type LogoProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export default function Logo({ title = "Ascend AI", ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{title}</title>
      <path
        d="M18 88L43 61L65 73L94 29"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M77 29H94V46"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="88" r="10" fill="currentColor" />
      <circle cx="43" cy="61" r="10" fill="currentColor" />
      <circle cx="65" cy="73" r="10" fill="currentColor" />
    </svg>
  );
}

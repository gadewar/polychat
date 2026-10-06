import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import animationData from "@/assets/lottie-json.json"; // Import JSON directly

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const colors = [
  "bg-pink-100 dark:bg-[#712c4a57] text-pink-600 dark:text-[#ff006e] border-[1px] border-pink-400 dark:border-[#ff006faa]",
  "bg-amber-100 dark:bg-[#ffd60a2a] text-amber-600 dark:text-[#ffd60a] border-[1px] border-amber-400 dark:border-[#ffd60abb]",
  "bg-emerald-100 dark:bg-[#06d6a02a] text-emerald-600 dark:text-[#06d6a0] border-[1px] border-emerald-400 dark:border-[#06d6a0bb]",
  "bg-cyan-100 dark:bg-[#4cc9f02a] text-cyan-600 dark:text-[#4cc9f0] border-[1px] border-cyan-400 dark:border-[#4cc9f0bb]",
];

export const getColor = (color) => {
  if (color >= 0 && color < colors.length) {
    return colors[color];
  }
  return colors[0]; // Default color
};

export default animationData;

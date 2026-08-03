export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mediaMatch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mediaMatch || iosStandalone);
}

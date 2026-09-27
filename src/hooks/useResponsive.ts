import { useWindowDimensions, Platform, DimensionValue } from "react-native";

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isWeb = Platform.OS === "web";
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isWide = width >= BREAKPOINTS.xl;

  const showDesktopNav = isWeb && width >= BREAKPOINTS.md;
  const maxContentWidth: DimensionValue = isDesktop ? 1120 : isTablet ? 840 : "100%";

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    showDesktopNav,
    maxContentWidth,
  };
}

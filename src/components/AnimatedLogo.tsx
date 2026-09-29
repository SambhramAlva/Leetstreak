import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { LOGO_SVG_XML } from "@/assets/logoSvgXml";

interface AnimatedLogoProps {
  size?: number;
}

export function AnimatedLogo({ size = 28 }: AnimatedLogoProps) {
  if (Platform.OS === "web") {
    const encoded = encodeURIComponent(LOGO_SVG_XML);
    return (
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <img
          src={`data:image/svg+xml;utf8,${encoded}`}
          width={size}
          height={size}
          alt="LeetStreak Logo"
          style={{ width: size, height: size, display: "block" }}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <SvgXml xml={LOGO_SVG_XML} width={size} height={size} />
    </View>
  );
}

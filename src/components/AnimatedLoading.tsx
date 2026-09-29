import React from "react";
import { Platform, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { LOADING_SVG_XML } from "@/assets/loadingSvgXml";

interface AnimatedLoadingProps {
  size?: number;
}

export function AnimatedLoading({ size = 64 }: AnimatedLoadingProps) {
  if (Platform.OS === "web") {
    const encoded = encodeURIComponent(LOADING_SVG_XML);
    return (
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <img
          src={`data:image/svg+xml;utf8,${encoded}`}
          width={size}
          height={size}
          alt="Loading..."
          style={{ width: size, height: size, display: "block" }}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <SvgXml xml={LOADING_SVG_XML} width={size} height={size} />
    </View>
  );
}

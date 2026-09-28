import React from "react";
import {
  Activity,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Flame,
  Group,
  Home,
  Link2,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react-native";

const icons = { activity: Activity, admin: ShieldCheck, check: Check, down: ChevronDown, up: ChevronUp, profile: CircleUserRound, flame: Flame, group: Group, home: Home, link: Link2, chat: MessageCircle, settings: Settings, user: UserRound, close: X, analytics: BarChart3 };
export type AppIconName = keyof typeof icons;

export function AppIcon({ name, size = 18, color = "currentColor", strokeWidth = 2 }: { name: AppIconName; size?: number; color?: string; strokeWidth?: number }) {
  const Icon = icons[name];
  return <Icon {...({ size, color, strokeWidth } as any)} />;
}
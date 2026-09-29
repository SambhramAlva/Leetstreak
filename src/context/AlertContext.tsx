import React, { createContext, useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Animated,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, fonts } from "@/theme/theme";
import { AppIcon, AppIconName } from "@/components/AppIcon";

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const ICON_MAP: Record<AlertType, { name: AppIconName; colorKey: string }> = {
  info: { name: "activity", colorKey: "primary" },
  success: { name: "check", colorKey: "success" },
  warning: { name: "flame", colorKey: "warning" },
  error: { name: "close", colorKey: "danger" },
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertOptions(null);
  }, []);

  const type = alertOptions?.type || "info";
  const iconConfig = ICON_MAP[type];
  const iconColor = (colors as any)[iconConfig.colorKey] || colors.primary;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alertOptions && (
        <Modal
          transparent
          animationType="fade"
          visible={!!alertOptions}
          onRequestClose={hideAlert}
        >
          <View style={styles.overlay}>
            <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Alert Header / Icon */}
              <View style={styles.headerRow}>
                <View style={[styles.iconContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <AppIcon name={iconConfig.name} size={22} color={iconColor} strokeWidth={2.5} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{alertOptions.title}</Text>
              </View>

              {/* Alert Message */}
              <Text style={[styles.message, { color: colors.textMuted }]}>
                {alertOptions.message}
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {(alertOptions.buttons || [{ text: "OK" }]).map((btn, idx) => {
                  const isDestructive = btn.style === "destructive";
                  const isCancel = btn.style === "cancel";

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        hideAlert();
                        btn.onPress?.();
                      }}
                      style={[
                        styles.btn,
                        isDestructive
                          ? { backgroundColor: colors.danger }
                          : isCancel
                          ? { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }
                          : { backgroundColor: colors.primary },
                        Platform.OS === "web" && ({ cursor: "pointer" } as any),
                      ]}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          { color: isCancel ? colors.text : "#ffffff" },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: fonts.display,
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: fonts.body,
  },
});

import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TabBarIconProps {
  name: string;
  color: string;
  size?: number;
}

export const TabBarIcon: React.FC<TabBarIconProps> = ({
  name,
  color,
  size = 24,
}) => {
  return <Ionicons name={name as any} size={size} color={color} />;
};

interface BottomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        // Get icon name from options
        const iconName = options.tabBarIcon
          ? options.tabBarIcon({
              focused: isFocused,
              color: isFocused ? "#3498db" : "#bdc3c7",
              size: 24,
            })
          : null;

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            {iconName}
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? "#3498db" : "#bdc3c7" },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    paddingBottom: 4,
    paddingTop: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default CustomTabBar;

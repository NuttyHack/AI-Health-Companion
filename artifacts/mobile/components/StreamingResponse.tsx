import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { MarkdownText } from "./MarkdownText";

interface Props {
  content: string;
  isStreaming: boolean;
}

export function StreamingResponse({ content, isStreaming }: Props) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isStreaming) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      opacity.setValue(0);
    }
  }, [isStreaming, opacity]);

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
    >
      <View style={styles.content}>
        <MarkdownText text={content} />
        {isStreaming && (
          <Animated.View style={[styles.cursor, { backgroundColor: colors.primary, opacity }]} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  cursor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 8,
  },
});
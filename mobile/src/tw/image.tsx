import { useCssElement } from "react-native-css";
import React from "react";
import { StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";

function CSSImage(props: React.ComponentProps<typeof ExpoImage>) {
  // @ts-expect-error: objectFit/objectPosition come from className and map to contentFit/contentPosition
  const { objectFit, objectPosition, ...style } = StyleSheet.flatten(props.style) || {};
  return (
    <ExpoImage
      contentFit={objectFit}
      contentPosition={objectPosition}
      {...props}
      source={typeof props.source === "string" ? { uri: props.source } : props.source}
      style={style}
    />
  );
}

export const Image = (props: React.ComponentProps<typeof CSSImage> & { className?: string }) =>
  useCssElement(CSSImage, props, { className: "style" });
Image.displayName = "CSS(Image)";

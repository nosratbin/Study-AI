/**
 * Native renderer for parsed lesson markdown. Text is selectable and scales with the system font size; no container
 * has a fixed height. Body is 16/26 for comfortable Bangla reading.
 */
import { createContext, Fragment, use, useMemo, useState, type ReactNode } from "react";
import { Linking, Platform, type StyleProp, type ViewStyle } from "react-native";
import { ScrollView as GestureScrollView, type PanGesture } from "react-native-gesture-handler";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { cn } from "@/lib/cn";
import { Text, View } from "@/tw";
import { inlineText, parseMarkdown, stripLeadingTitle, type Block, type Inline } from "./markdown";

const MONO = Platform.select({ android: "monospace", ios: "Menlo", default: "monospace" });

/**
 * The lesson reader's page-swipe pan. Sideways scrollers (code, tables) `block` it: the pan waits until the scroller
 * fails, so dragging a long code line scrolls the code and never flips the lesson.
 */
export const PageSwipeContext = createContext<PanGesture | null>(null);

function SideScroll({ children, style, contentContainerStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle> }) {
  const pageSwipe = use(PageSwipeContext);
  return (
    <GestureScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      block={pageSwipe ?? undefined}
      style={style}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </GestureScrollView>
  );
}

/** http(s) opens in the in-app browser and mailto in the mail app; the parser already dropped every other scheme. */
function openLink(href: string) {
  if (/^mailto:/i.test(href)) Linking.openURL(href).catch(() => undefined);
  else if (/^https?:\/\//i.test(href)) WebBrowser.openBrowserAsync(href).catch(() => undefined);
}

const MIN_RATIO = 0.5;
const MAX_RATIO = 3;

/** A full-width https image. The aspect ratio starts at 16:9 and is corrected once the image reports its size. */
function ImageBlock({ alt, src }: { alt: string; src: string | null }) {
  const [ratio, setRatio] = useState(16 / 9);
  if (!src) return alt ? <Text className="text-[13px] italic leading-[18px] text-muted">{alt}</Text> : null;
  return (
    <Image
      source={{ uri: src }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={alt || "Lesson image"}
      cachePolicy="memory-disk"
      contentFit="contain"
      style={{ width: "100%", aspectRatio: ratio, borderRadius: 16 }}
      onLoad={(e) => {
        const { width, height } = e.source;
        if (width > 0 && height > 0) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height)));
      }}
    />
  );
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "code") {
          return (
            <Text key={i} className="bg-muted-bg text-brand-700" style={{ fontFamily: MONO }}>
              {` ${n.text} `}
            </Text>
          );
        }
        if (n.type === "image") {
          // Images inside running text show only their alt text.
          return n.alt ? (
            <Text key={i} className="italic text-muted">
              {n.alt}
            </Text>
          ) : null;
        }
        if (n.type === "link") {
          if (!n.href) return <Inlines key={i} nodes={n.children} />;
          const href = n.href;
          return (
            <Text key={i} accessibilityRole="link" onPress={() => openLink(href)} className="font-semibold text-brand-700 underline">
              <Inlines nodes={n.children} />
            </Text>
          );
        }
        return (
          <Text key={i} className={cn(n.bold && "font-semibold", n.italic && "italic")}>
            {n.text}
          </Text>
        );
      })}
    </>
  );
}

const BODY = "text-[16px] leading-[26px] text-ink";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return (
        <Text accessibilityRole="header" selectable className={cn("type-heading text-ink", block.level <= 2 ? "mt-4" : "mt-2")}>
          <Inlines nodes={block.content} />
        </Text>
      );
    case "paragraph":
      return (
        <Text selectable className={BODY}>
          <Inlines nodes={block.content} />
        </Text>
      );
    case "list":
      return (
        <View className="gap-2">
          {block.items.map((item, i) => (
            <View key={i} className="flex-row gap-2.5" style={{ paddingLeft: item.depth * 20 }}>
              <Text className={cn(BODY, "min-w-5 text-right", item.ordered ? "font-semibold text-brand-700" : "text-muted")} importantForAccessibility="no">
                {item.ordered ? `${item.number}.` : "•"}
              </Text>
              <Text selectable className={cn(BODY, "flex-1")}>
                <Inlines nodes={item.content} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "code":
      return (
        <View className="overflow-hidden rounded-2xl bg-[#0F172A]">
          {block.lang ? <Text className="px-4 pt-3 text-[13px] text-slate-400">{block.lang}</Text> : null}
          <SideScroll contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text selectable className="text-[13px] leading-[20px] text-slate-100" style={{ fontFamily: MONO }}>
              {block.text}
            </Text>
          </SideScroll>
        </View>
      );
    case "quote":
      return (
        <View className="gap-3 rounded-2xl bg-brand-50 px-4 py-3">
          {block.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </View>
      );
    case "hr":
      return <View className="my-2 h-px bg-line" />;
    case "table":
      return (
        <SideScroll style={{ marginHorizontal: -4 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
          <View className="overflow-hidden rounded-2xl bg-card">
            {[block.header, ...block.rows].map((row, r) => (
              <View
                key={r}
                className={cn("flex-row", r === 0 ? "bg-muted-bg" : r > 1 && "border-t border-line")}
                accessible
                accessibilityLabel={
                  r === 0
                    ? `Table columns: ${row.map((cell) => inlineText(cell)).join(", ")}`
                    : row.map((cell, c) => `${inlineText(block.header[c] ?? [])}: ${inlineText(cell)}`).join(", ")
                }
              >
                {row.map((cell, c) => (
                  <Text key={c} className={cn("w-40 px-3 py-2.5", BODY, r === 0 && "font-semibold")}>
                    <Inlines nodes={cell} />
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </SideScroll>
      );
    case "image":
      return <ImageBlock alt={block.alt} src={block.src} />;
  }
}

/** Renders lesson markdown. Pass `title` to drop a leading heading that repeats the lesson title. */
export function Markdown({ source, title }: { source: string; title?: string }) {
  const blocks = useMemo(() => {
    const parsed = parseMarkdown(source);
    return title ? stripLeadingTitle(parsed, title) : parsed;
  }, [source, title]);
  return (
    <View className="gap-4">
      {blocks.map((b, i) => (
        <Fragment key={i}>
          <BlockView block={b} />
        </Fragment>
      ))}
    </View>
  );
}

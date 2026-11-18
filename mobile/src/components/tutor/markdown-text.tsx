/** Renders a tutor reply's Markdown with selectable text. https links open in the in-app browser and show their host. */
import { memo, useMemo } from "react";
import * as WebBrowser from "expo-web-browser";
import { Text, View } from "@/tw";
import { httpsHost, linkDisplay, parseMarkdown, type Inline } from "./markdown";

function openLink(url: string) {
  if (!httpsHost(url)) return;
  WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

function styleClass(n: { bold?: boolean; italic?: boolean }) {
  return [n.bold ? "font-semibold" : "", n.italic ? "italic" : ""].join(" ").trim() || undefined;
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return nodes.map((n, i) => {
    switch (n.type) {
      case "code":
        return (
          <Text key={i} className="bg-muted-bg font-mono text-[14px]">
            {` ${n.text} `}
          </Text>
        );
      case "link": {
        // The label is written by the LLM, so always show where the link really goes.
        const { label, host } = linkDisplay(n.text, n.url, n.host);
        return (
          <Text
            key={i}
            className={styleClass(n)}
            onPress={() => openLink(n.url)}
            accessibilityRole="link"
            accessibilityLabel={host ? `${label}, opens ${host}` : `${label}, opens in browser`}
          >
            <Text className="text-brand-700 underline">{label}</Text>
            {host ? <Text className="text-muted">{` (${host})`}</Text> : null}
          </Text>
        );
      }
      default:
        return n.bold || n.italic ? (
          <Text key={i} className={styleClass(n)}>
            {n.text}
          </Text>
        ) : (
          n.text
        );
    }
  });
}

export const MarkdownText = memo(function MarkdownText({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View className="gap-3">
      {blocks.map((b, i) => {
        if (b.type === "code")
          return (
            <View key={i} className="rounded-2xl bg-muted-bg px-3 py-2.5">
              <Text selectable className="font-mono text-[13px] leading-[20px] text-ink">
                {b.text}
              </Text>
            </View>
          );
        if (b.type === "heading")
          return (
            <Text key={i} selectable accessibilityRole="header" className="type-heading text-ink">
              <Inlines nodes={b.inlines} />
            </Text>
          );
        if (b.type === "list")
          return (
            <View key={i} className="gap-1.5">
              {b.items.map((item, j) => (
                <View key={j} className="flex-row gap-2">
                  <Text className="min-w-5 text-[15px] leading-[24px] text-muted">{b.ordered ? `${b.start + j}.` : "•"}</Text>
                  <Text selectable className="flex-1 text-[15px] leading-[24px] text-ink">
                    <Inlines nodes={item} />
                  </Text>
                </View>
              ))}
            </View>
          );
        return (
          <Text key={i} selectable className="text-[15px] leading-[24px] text-ink">
            <Inlines nodes={b.inlines} />
          </Text>
        );
      })}
    </View>
  );
});

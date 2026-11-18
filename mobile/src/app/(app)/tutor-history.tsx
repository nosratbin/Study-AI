/** Tutor conversation list, pushed from the AI Tutor header. Picking one pops back to the chat with it loaded. */
import { Alert, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, EmptyState, ErrorState, Icon } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { aiKeys, emitTutorEvent } from "@/components/tutor/session";
import { api, toApiError } from "@/lib/api";
import { useApiQuery } from "@/lib/query";
import { timeAgo, type Conversation } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Pressable, Text, View } from "@/tw";

function RowSkeleton() {
  return (
    <View className="gap-2 rounded-2xl bg-card px-4 py-4">
      <Skeleton className="h-4 w-4/5 rounded-lg" />
      <Skeleton className="h-3 w-1/3 rounded-lg" />
    </View>
  );
}

function ConversationRow({ item, onOpen, onDelete, deleting }: { item: Conversation; onOpen: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <View className="flex-row items-center rounded-2xl bg-card" style={{ opacity: deleting ? 0.5 : 1 }}>
      <PressableScale onPress={onOpen} accessibilityLabel={`Open conversation: ${item.title}`} className="min-h-16 flex-1 justify-center py-3 pl-4 pr-1">
        <Text className="text-[15px] font-semibold leading-[24px] text-ink" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-[13px] text-muted">
          {timeAgo(item.updated_at)} · {item.language === "bn" ? "বাংলা" : "English"}
        </Text>
      </PressableScale>
      <Pressable
        onPress={onDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel={`Delete conversation: ${item.title}`}
        className="mr-1 h-12 w-12 items-center justify-center rounded-full active:bg-muted-bg"
      >
        <Icon name="trash-outline" size={20} />
      </Pressable>
    </View>
  );
}

export default function TutorHistoryScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const list = useApiQuery<Conversation[]>(aiKeys.conversations, "/ai/conversations");

  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/ai/conversations/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      qc.setQueryData<Conversation[]>(aiKeys.conversations, (l) => l?.filter((x) => x.id !== id));
      qc.removeQueries({ queryKey: aiKeys.messages(id) });
      emitTutorEvent({ type: "deleted", conversationId: id });
    },
    onError: (e) => Alert.alert("Couldn't delete", toApiError(e).message),
  });

  function open(id: string | null) {
    emitTutorEvent({ type: "open", conversationId: id });
    router.back();
  }

  function confirmDelete(item: Conversation) {
    Alert.alert("Delete this conversation?", `"${item.title}" will be removed. This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(item.id) },
    ]);
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.surface }}>
      <Stack.Screen options={{ title: "Conversations" }} />
      {list.isPending ? (
        <View className="gap-3 px-4 pt-2" accessibilityLabel="Loading conversations">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </View>
      ) : list.isError && !list.data ? (
        <View className="px-4 pt-2">
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        </View>
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onOpen={() => open(item.id)}
              onDelete={() => confirmDelete(item)}
              deleting={remove.isPending && remove.variables === item.id}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" title="No conversations yet" body="Ask the tutor anything and your chats will be saved here." />
          }
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={c.brand500} colors={[c.brand500]} />}
        />
      )}
      <View className="px-4 pb-2 pt-2">
        <Button icon="create-outline" onPress={() => open(null)}>
          New chat
        </Button>
      </View>
    </SafeAreaView>
  );
}

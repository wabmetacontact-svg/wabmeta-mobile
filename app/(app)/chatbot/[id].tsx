// app/(app)/chatbot/[id].tsx
import React, {
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { chatbots as chatbotsApi } from "../../../src/services/api";
import { Colors } from "../../../src/constants/colors";
import {
  Chatbot,
  FlowNode,
  NodeType,
  NODE_TYPE_CONFIGS,
} from "../../../src/types/chatbot";
import { AddNodeSheet } from "../../../src/components/chatbot/AddNodeSheet";
import { NodeConfigSheet } from "../../../src/components/chatbot/NodeConfigSheet";
import { ChatbotSettingsSheet } from "../../../src/components/chatbot/ChatbotSettingsSheet";
import { FlowNodeItem } from "../../../src/components/chatbot/FlowNodeItem";

export default function ChatbotBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";

  const [chatbot, setChatbot] = useState<Partial<Chatbot>>({
    name: "New Chatbot",
    description: "",
    triggerKeywords: [],
    isDefault: false,
    welcomeMessage: "",
    fallbackMessage: "",
    flowData: {
      nodes: [
        {
          id: `start-${Date.now()}`,
          type: "start",
          // position is optional on mobile (the builder is a list, not a canvas)
          // but the web canvas and the backend schema expect it — keep flows
          // portable by laying nodes out in a vertical column.
          position: { x: 0, y: 0 },
          data: { label: "Start" },
        },
      ],
      edges: [],
    },
  });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showAddNode, setShowAddNode] = useState(false);
  const [addNodeAfterId, setAddNodeAfterId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // ═══════════════════════════════════
  // FETCH
  // ═══════════════════════════════════

  useEffect(() => {
    if (isNew) return;
    loadChatbot();
  }, [id]);

  const loadChatbot = async () => {
    try {
      const res = await chatbotsApi.getById(id!);
      if (res?.data?.success) {
        setChatbot(res.data.data as Chatbot);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load chatbot");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════
  // NODE OPERATIONS
  // ═══════════════════════════════════

  const nodes = chatbot.flowData?.nodes || [];
  const edges = chatbot.flowData?.edges || [];

  // Build ordered list of nodes based on edges
  const orderedNodes = useMemo(() => {
    const startNode = nodes.find((n) => n.type === "start");
    if (!startNode) return nodes;

    const visited = new Set<string>();
    const result: FlowNode[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      result.push(node);

      // Find next node via edges
      const nextEdge = edges.find((e) => e.source === nodeId);
      if (nextEdge) {
        traverse(nextEdge.target);
      }
    };

    traverse(startNode.id);

    // Add any orphaned nodes at end
    nodes.forEach((n) => {
      if (!visited.has(n.id)) result.push(n);
    });

    return result;
  }, [nodes, edges]);

  const addNode = (type: NodeType, afterNodeId: string | null) => {
    const config = NODE_TYPE_CONFIGS.find((c) => c.type === type);
    const newNodeId = `${type}-${Date.now()}`;

    const defaultData: any = {
      label: config?.label || type,
    };

    // Set defaults based on type
    switch (type) {
      case "message":
        defaultData.message = "Type your message here...";
        defaultData.messageType = "text";
        break;
      case "button":
        defaultData.message = "What can I help you with?";
        defaultData.buttons = [
          { id: `btn-${Date.now()}-1`, text: "Option 1" },
          { id: `btn-${Date.now()}-2`, text: "Option 2" },
        ];
        break;
      case "list":
        defaultData.message = "Please choose from menu:";
        defaultData.listButtonText = "View Options";
        defaultData.listSections = [
          {
            title: "Section 1",
            rows: [
              {
                id: `row-${Date.now()}`,
                title: "Option 1",
                description: "",
              },
            ],
          },
        ];
        break;
      case "ai":
        defaultData.systemPrompt =
          "You are a helpful customer support agent.";
        break;
      case "condition":
        defaultData.condition = {
          type: "keyword",
          value: "",
        };
        break;
      case "delay":
        defaultData.delay = 2;
        break;
      case "action":
        defaultData.action = { type: "tag", value: "" };
        break;
    }

    const newNode: FlowNode = {
      id: newNodeId,
      type,
      // Give every node a position so mobile-authored flows render correctly
      // when opened on the web canvas (list order → vertical column).
      position: { x: 0, y: (nodes.length + 1) * 140 },
      data: defaultData,
    };

    // Update flow: add node and create edge
    const newNodes = [...nodes, newNode];
    let newEdges = [...edges];

    if (afterNodeId) {
      // Find existing edge from afterNodeId
      const existingEdge = edges.find((e) => e.source === afterNodeId);

      if (existingEdge) {
        // Remove old edge, add two new edges
        newEdges = newEdges.filter((e) => e.id !== existingEdge.id);
        newEdges.push({
          id: `edge-${Date.now()}-1`,
          source: afterNodeId,
          target: newNodeId,
        });
        newEdges.push({
          id: `edge-${Date.now()}-2`,
          source: newNodeId,
          target: existingEdge.target,
        });
      } else {
        // Just add edge from afterNodeId to new node
        newEdges.push({
          id: `edge-${Date.now()}`,
          source: afterNodeId,
          target: newNodeId,
        });
      }
    }

    setChatbot({
      ...chatbot,
      flowData: { nodes: newNodes, edges: newEdges },
    });

    setShowAddNode(false);
    setAddNodeAfterId(null);

    // Auto-open config for new node
    setTimeout(() => setSelectedNode(newNode), 300);
  };

  const updateNode = (nodeId: string, newData: any) => {
    const newNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n
    );
    setChatbot({
      ...chatbot,
      flowData: { nodes: newNodes, edges },
    });

    // Update selected node too
    if (selectedNode?.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: { ...selectedNode.data, ...newData },
      });
    }
  };

  const deleteNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.type === "start") {
      Alert.alert("Cannot Delete", "Start node cannot be deleted");
      return;
    }

    Alert.alert("Delete Node", "Are you sure you want to delete this node?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // Remove node
          const newNodes = nodes.filter((n) => n.id !== nodeId);

          // Fix edges - if node was in middle, reconnect
          const incomingEdge = edges.find((e) => e.target === nodeId);
          const outgoingEdge = edges.find((e) => e.source === nodeId);

          let newEdges = edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          );

          // If node was in middle, connect previous to next
          if (incomingEdge && outgoingEdge) {
            newEdges.push({
              id: `edge-${Date.now()}`,
              source: incomingEdge.source,
              target: outgoingEdge.target,
            });
          }

          setChatbot({
            ...chatbot,
            flowData: { nodes: newNodes, edges: newEdges },
          });
          setSelectedNode(null);
        },
      },
    ]);
  };

  // ═══════════════════════════════════
  // SAVE / ACTIVATE
  // ═══════════════════════════════════

  const handleSave = async (silent = false) => {
    if (!chatbot.name?.trim()) {
      Alert.alert("Error", "Chatbot name is required");
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        name: chatbot.name,
        description: chatbot.description,
        triggerKeywords: chatbot.triggerKeywords || [],
        isDefault: chatbot.isDefault || false,
        welcomeMessage: chatbot.welcomeMessage || "",
        fallbackMessage: chatbot.fallbackMessage || "",
        flowData: chatbot.flowData,
      };

      let savedId = id;
      if (isNew) {
        const res = await chatbotsApi.create(payload);
        if (res?.data?.success) {
          savedId = res.data.data.id;
          if (!silent) {
            Alert.alert("Success", "Chatbot created!", [
              {
                text: "OK",
                onPress: () =>
                  router.replace(`/(app)/chatbot/${savedId}` as never),
              },
            ]);
          }
        }
      } else {
        const res = await chatbotsApi.update(id!, payload);
        if (res?.data?.success) {
          setChatbot((prev) => ({ ...prev, ...res.data.data }));
        }
        if (!silent) Alert.alert("Success", "Chatbot saved!");
      }

      return savedId;
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    // Validate
    const startNode = nodes.find((n) => n.type === "start");
    const hasOtherNode = nodes.length > 1;

    if (!startNode || !hasOtherNode) {
      Alert.alert(
        "Cannot Activate",
        "Flow must have Start node and at least one other node"
      );
      return;
    }

    // Auto save first
    const savedId = await handleSave(true);
    if (!savedId) return;

    try {
      await chatbotsApi.activate(savedId);
      Alert.alert("Success", "Chatbot activated! 🚀");
      loadChatbot();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to activate"
      );
    }
  };

  const handleDeactivate = async () => {
    if (isNew) return;
    try {
      await chatbotsApi.deactivate(id!);
      Alert.alert("Success", "Chatbot paused");
      loadChatbot();
    } catch (err) {
      Alert.alert("Error", "Failed to deactivate");
    }
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Discard Changes?",
              "Any unsaved changes will be lost",
              [
                { text: "Keep Editing", style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ]
            );
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatbot.name || "Untitled"}
          </Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerSubtitle}>
              {nodes.length} nodes
            </Text>
            {chatbot.status && (
              <View
                style={[
                  styles.statusMini,
                  {
                    backgroundColor:
                      chatbot.status === "ACTIVE"
                        ? `${Colors.success}20`
                        : chatbot.status === "PAUSED"
                        ? `${Colors.warning}20`
                        : `${Colors.textMuted}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusMiniText,
                    {
                      color:
                        chatbot.status === "ACTIVE"
                          ? Colors.success
                          : chatbot.status === "PAUSED"
                          ? Colors.warning
                          : Colors.textMuted,
                    },
                  ]}
                >
                  {chatbot.status}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.iconBtn}
        >
          <Ionicons name="settings" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Flow */}
      <ScrollView
        contentContainerStyle={styles.flowContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        {(!chatbot.triggerKeywords ||
          chatbot.triggerKeywords.length === 0) &&
          !chatbot.isDefault && (
            <TouchableOpacity
              style={styles.settingsWarn}
              onPress={() => setShowSettings(true)}
            >
              <Ionicons name="warning" size={16} color={Colors.warning} />
              <Text style={styles.settingsWarnText}>
                No trigger keywords set. Tap to configure.
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.warning}
              />
            </TouchableOpacity>
          )}

        {/* Nodes */}
        {orderedNodes.map((node, index) => (
          <View key={node.id}>
            <FlowNodeItem
              node={node}
              onPress={() => setSelectedNode(node)}
              onDelete={
                node.type === "start" ? undefined : () => deleteNode(node.id)
              }
            />

            {/* Add Node Button between */}
            {index < orderedNodes.length - 1 && (
              <TouchableOpacity
                style={styles.addBetween}
                onPress={() => {
                  setAddNodeAfterId(node.id);
                  setShowAddNode(true);
                }}
              >
                <View style={styles.connector} />
                <View style={styles.addBetweenBtn}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                </View>
                <View style={styles.connector} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Add first node button */}
        {orderedNodes.length > 0 &&
          orderedNodes[orderedNodes.length - 1].type !== "end" && (
            <TouchableOpacity
              style={styles.addLastBtn}
              onPress={() => {
                setAddNodeAfterId(
                  orderedNodes[orderedNodes.length - 1].id
                );
                setShowAddNode(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.connector} />
              <View style={styles.addBigBtn}>
                <Ionicons name="add-circle" size={22} color={Colors.primary} />
                <Text style={styles.addBigBtnText}>Add Node</Text>
              </View>
            </TouchableOpacity>
          )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {chatbot.status === "ACTIVE" ? (
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={handleDeactivate}
          >
            <Ionicons name="pause" size={16} color={Colors.warning} />
            <Text style={[styles.actionText, { color: Colors.warning }]}>
              Pause
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={handleActivate}
            disabled={isNew}
          >
            <Ionicons name="rocket" size={16} color={Colors.success} />
            <Text style={[styles.actionText, { color: Colors.success }]}>
              Activate
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => handleSave(false)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Node Sheet */}
      <AddNodeSheet
        visible={showAddNode}
        onClose={() => {
          setShowAddNode(false);
          setAddNodeAfterId(null);
        }}
        onSelect={(type) => addNode(type, addNodeAfterId)}
      />

      {/* Node Config Sheet */}
      {selectedNode && (
        <NodeConfigSheet
          visible={!!selectedNode}
          node={selectedNode}
          onUpdate={(data) => updateNode(selectedNode.id, data)}
          onDelete={
            selectedNode.type === "start"
              ? undefined
              : () => {
                  deleteNode(selectedNode.id);
                }
          }
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Settings Sheet */}
      <ChatbotSettingsSheet
        visible={showSettings}
        chatbot={chatbot}
        onUpdate={(data) => setChatbot({ ...chatbot, ...data })}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  statusMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusMiniText: {
    fontSize: 9,
    fontWeight: "800",
  },

  flowContainer: {
    padding: 16,
    paddingBottom: 80,
    alignItems: "center",
  },

  settingsWarn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.warning}10`,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.warning}20`,
    width: "100%",
  },
  settingsWarnText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
    fontWeight: "600",
  },

  connector: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
  },

  addBetween: {
    alignItems: "center",
  },
  addBetweenBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  addLastBtn: {
    alignItems: "center",
    marginTop: 4,
  },
  addBigBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}10`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    gap: 8,
  },
  addBigBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },

  bottomBar: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${Colors.warning}15`,
    gap: 6,
  },
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${Colors.success}15`,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

// src/components/inbox/EmojiPicker.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  smileys: {
    label: "Smileys",
    icon: "happy" as const,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
      "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
      "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎",
      "🤓", "🧐",
    ],
  },
  gestures: {
    label: "Gestures",
    icon: "hand-left" as const,
    emojis: [
      "👍", "👎", "👏", "🙏", "👌", "🤌", "🤏", "✌️", "🤞", "🤟",
      "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚",
      "🖐️", "✋", "🖖", "💪", "🦾", "✍️", "🤳", "💅", "🦵", "🦿",
      "🦶", "👣", "👀", "👁️", "🧠", "🫀", "🫁", "🦷",
    ],
  },
  hearts: {
    label: "Hearts",
    icon: "heart" as const,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
      "💌", "💋", "💯",
    ],
  },
  animals: {
    label: "Animals",
    icon: "paw" as const,
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒",
      "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗",
      "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰",
    ],
  },
  food: {
    label: "Food",
    icon: "fast-food" as const,
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈",
      "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦",
      "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔",
      "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖",
      "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯",
    ],
  },
  activities: {
    label: "Activities",
    icon: "football" as const,
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🥏", "🎱", "🪀",
      "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁",
      "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️",
      "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️",
    ],
  },
  objects: {
    label: "Objects",
    icon: "cube" as const,
    emojis: [
      "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️",
      "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️",
      "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭",
      "⏱️", "⏲️", "⏰", "🕰️", "⏳", "⌛",
    ],
  },
  symbols: {
    label: "Symbols",
    icon: "star" as const,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "💢",
      "💥", "💫", "💦", "💨", "🕳️", "💣", "💤", "🌟", "⭐", "🌈",
      "☀️", "⛅", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️",
      "⛄", "🌬️", "🌊", "💧", "☔", "☂️", "🎈", "🎉", "🎊",
    ],
  },
};

export function EmojiPicker({ onSelect, onClose }: Props) {
  const [category, setCategory] = useState<keyof typeof EMOJI_CATEGORIES>("smileys");

  const categories = Object.keys(EMOJI_CATEGORIES) as Array<
    keyof typeof EMOJI_CATEGORIES
  >;
  const currentEmojis = EMOJI_CATEGORIES[category].emojis;

  const emojisPerRow = 8;
  const emojiRows: string[][] = [];
  for (let i = 0; i < currentEmojis.length; i += emojisPerRow) {
    emojiRows.push(currentEmojis.slice(i, i + emojisPerRow));
  }

  return (
    <View style={styles.container}>
      {/* Emojis Grid */}
      <ScrollView
        style={styles.emojiScroll}
        contentContainerStyle={styles.emojiGrid}
      >
        {emojiRows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.emojiRow}>
            {row.map((emoji, i) => (
              <TouchableOpacity
                key={`${emoji}-${i}`}
                style={styles.emojiBtn}
                onPress={() => onSelect(emoji)}
                activeOpacity={0.6}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Categories */}
      <View style={styles.categories}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryBtn,
              category === cat && styles.categoryBtnActive,
            ]}
            onPress={() => setCategory(cat)}
          >
            <Ionicons
              name={EMOJI_CATEGORIES[cat].icon}
              size={20}
              color={category === cat ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  emojiScroll: {
    flex: 1,
  },
  emojiGrid: {
    padding: 8,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  emojiBtn: {
    width: (SCREEN_W - 24) / 8,
    height: (SCREEN_W - 24) / 8,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 26,
  },
  categories: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surfaceSecondary,
  },
  categoryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBtnActive: {
    backgroundColor: `${Colors.primary}15`,
  },
});

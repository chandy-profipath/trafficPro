import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../theme';
import { fetchChatMessages, sendChatMessage, ChatMessage, fetchShops, DBShop, subscribeChat } from '../lib/db';

export type ChatProvider = { id: string; name: string; type: 'mechanic' | 'supplier' };

interface Props {
  initialProvider?: ChatProvider | null;
}

export default function ChatSheet({ initialProvider }: Props) {
  const { colors } = useTheme();
  const [selectedProvider, setSelectedProvider] = useState<ChatProvider | null>(initialProvider || null);
  const [providers, setProviders] = useState<ChatProvider[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  useEffect(() => {
    async function loadProviders() {
      const shops = await fetchShops();
      setProviders(shops.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type === 'Supplier' ? 'supplier' : 'mechanic'
      })));
    }
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      loadMessages();
      const unsub = subscribeChat(selectedProvider.id, (msg) => {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
      return () => { unsub(); };
    }
  }, [selectedProvider]);

  const loadMessages = async () => {
    if (!selectedProvider) return;
    setLoading(true);
    const msgs = await fetchChatMessages(selectedProvider.id);
    setMessages(msgs);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedProvider) return;
    const text = inputText;
    setInputText('');
    try {
      await sendChatMessage(selectedProvider.id, text);
      // Message will come back via subscription if we are lucky, 
      // but we add it optimistically or rely on subscription.
      // fetchChatMessages already handles deduplication in useEffect if we had logic for it.
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  if (!selectedProvider) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Providers</Text>
        <ScrollView style={{ flex: 1 }}>
          {providers.map(p => (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.providerItem, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => setSelectedProvider(p)}
            >
              <View style={[styles.avatar, { backgroundColor: p.type === 'mechanic' ? '#F97316' : '#6366F1' }]}>
                <MaterialCommunityIcons 
                  name={p.type === 'mechanic' ? 'wrench' : 'cog'} 
                  size={20} 
                  color="#fff" 
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.providerName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[styles.providerType, { color: colors.textMuted }]}>
                  {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setSelectedProvider(null)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{selectedProvider.name}</Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
        ) : (
          messages.map(m => (
            <View key={m.id} style={[styles.msgRow, m.isMe ? styles.myRow : styles.theirRow]}>
              <View style={[
                styles.bubble, 
                { backgroundColor: m.isMe ? colors.primary : colors.surfaceElevated }
              ]}>
                <Text style={[styles.msgText, { color: m.isMe ? '#fff' : colors.text }]}>
                  {m.text}
                </Text>
              </View>
              <Text style={[styles.time, { color: colors.textMuted }]}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={120}
      >
        <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: colors.primary }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginLeft: 12, opacity: 0.6 },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  providerName: { fontSize: 15, fontWeight: '700' },
  providerType: { fontSize: 12, marginTop: 2 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  msgRow: { marginBottom: 16, maxWidth: '85%' },
  myRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { padding: 12, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  msgText: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 4, marginHorizontal: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }
});

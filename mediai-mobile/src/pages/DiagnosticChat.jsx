// src/pages/DiagnosticChat.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import { useDiagnosticChat } from '../hooks/useDiagnosticChat';
import { iotDataForChat } from '../services/diagnosticChatService';
import { colors } from '../styles/globalStyles';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.round(SCREEN_W * 0.8);

const SUGGESTIONS = [
  "J'ai de la fièvre depuis 2 jours",
  "Je tousse depuis plus d'une semaine",
  "J'ai des maux de tête intenses",
  "Je me sens très fatigué(e) et j'ai des frissons",
];

// Couleur d'une barre d'hypothèse selon la probabilité.
const hypColor = (pct) => (pct > 60 ? colors.greenLight : pct >= 30 ? colors.yellow : colors.warn);

const formatConvDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dots]);

  return (
    <View style={styles.typingRow}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.typingDot,
            {
              opacity: dot,
              transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

// Carte diagnostic affichée sous la bulle IA finale.
function DiagnosticCard({ diagnostic, onOpenCarnet, onFindPharmacy }) {
  const hypotheses = Array.isArray(diagnostic?.hypotheses) ? diagnostic.hypotheses : [];

  return (
    <View style={styles.diagCard}>
      <View style={styles.diagCardHead}>
        <Text style={styles.diagCardBadge}>🩺 Diagnostic</Text>
        <Text style={styles.diagCardTitle}>{diagnostic?.title || 'Diagnostic MediAI'}</Text>
      </View>

      {hypotheses.map((h, index) => {
        const pct = Math.max(0, Math.min(100, Number(h.probability) || 0));
        return (
          <View key={`${h.name}-${index}`} style={styles.hypRow}>
            <View style={styles.hypHead}>
              <Text style={styles.hypName} numberOfLines={1}>{h.name}</Text>
              <Text style={[styles.hypPct, { color: hypColor(pct) }]}>{pct}%</Text>
            </View>
            <View style={styles.hypBarBg}>
              <View style={[styles.hypBarFill, { width: `${pct}%`, backgroundColor: hypColor(pct) }]} />
            </View>
          </View>
        );
      })}

      <View style={styles.diagActions}>
        <TouchableOpacity style={styles.diagBtnPrimary} onPress={onOpenCarnet}>
          <Text style={styles.diagBtnPrimaryText}>📔 Voir dans le carnet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.diagBtnGhost} onPress={onFindPharmacy}>
          <Text style={styles.diagBtnGhostText}>💊 Trouver une pharmacie</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MessageBubble({ message, onOpenCarnet, onFindPharmacy }) {
  const isUser = message.role === 'user';
  const isPending = message.pending;

  const renderContent = (text = '') => text.split(/\*\*(.*?)\*\*/g).map((part, index) => (
    index % 2 === 1
      ? <Text key={`${message.id}-bold-${index}`} style={styles.bold}>{part}</Text>
      : <Text key={`${message.id}-text-${index}`}>{part}</Text>
  ));

  return (
    <View>
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>M</Text>
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          {isPending ? (
            <TypingDots />
          ) : (
            <>
              <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                {isUser ? message.content : renderContent(message.content)}
              </Text>
              <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
                {message.created_at
                  ? new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </Text>
            </>
          )}
        </View>
      </View>

      {!isUser && message.diagnostic && (
        <DiagnosticCard
          diagnostic={message.diagnostic}
          onOpenCarnet={() => onOpenCarnet(message.diagnostic)}
          onFindPharmacy={onFindPharmacy}
        />
      )}
    </View>
  );
}

function IotStrip({ deviceData, connected }) {
  if (!connected || !deviceData) return null;

  const bloodPressure = deviceData.bpSystolic && deviceData.bpDiastolic
    ? `${deviceData.bpSystolic}/${deviceData.bpDiastolic}`
    : null;

  const chips = [
    deviceData.temp ? `Temp. ${deviceData.temp} degC` : null,
    deviceData.hr ? `FC ${deviceData.hr} bpm` : null,
    deviceData.spo2 ? `SpO2 ${deviceData.spo2}%` : null,
    bloodPressure ? `TA ${bloodPressure}` : null,
    deviceData.glyc ? `Gly. ${deviceData.glyc} g/L` : null,
    deviceData.resp ? `Resp. ${deviceData.resp}/min` : null,
  ].filter(Boolean);

  if (!chips.length) return null;

  return (
    <View style={styles.iotStrip}>
      <Text style={styles.iotStripTitle}>Capteurs ESP32 transmis a MedGemma</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.iotChipsRow}>
          {chips.map((chip) => (
            <View key={chip} style={styles.iotChip}>
              <Text style={styles.iotChipText}>{chip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function WelcomeMessage({ userName, onSuggestion }) {
  return (
    <View style={styles.welcome}>
      <Text style={styles.welcomeEmoji}>MediAI</Text>
      <Text style={styles.welcomeTitle}>Bonjour {userName}</Text>
      <Text style={styles.welcomeText}>
        Decrivez vos symptomes. L'assistant tient compte du contexte camerounais et des donnees capteurs disponibles.
      </Text>
      <View style={styles.suggestionsWrap}>
        {SUGGESTIONS.map((suggestion) => (
          <TouchableOpacity key={suggestion} style={styles.suggChip} onPress={() => onSuggestion(suggestion)}>
            <Text style={styles.suggChipText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Panneau latéral : nouveau chat + liste des conversations.
function Drawer({ anim, open, insets, conversations, conversationId, onNewChat, onSelect, onDelete, onClose }) {
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_W, 0] });
  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { width: DRAWER_W, transform: [{ translateX }], paddingTop: insets.top + 14 }]}>
        <Text style={styles.drawerBrand}>MediAI</Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={onNewChat}>
          <Text style={styles.newChatIcon}>＋</Text>
          <Text style={styles.newChatText}>Nouveau chat</Text>
        </TouchableOpacity>

        <Text style={styles.drawerSection}>Conversations</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {conversations.length === 0 ? (
            <Text style={styles.drawerEmpty}>Aucune conversation pour le moment.</Text>
          ) : (
            conversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={[styles.convItem, conv.id === conversationId && styles.convItemActive]}
                onPress={() => onSelect(conv.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.convTitle} numberOfLines={1}>
                    {conv.title || 'Nouvelle consultation'}
                  </Text>
                  <View style={styles.convMetaRow}>
                    <Text style={styles.convDate}>{formatConvDate(conv.started_at || conv.created_at)}</Text>
                    {conv.status === 'completed' && <Text style={styles.convDone}>✓ diagnostic</Text>}
                  </View>
                </View>
                <TouchableOpacity hitSlop={8} onPress={() => onDelete(conv)}>
                  <Text style={styles.convDelete}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export default function Diagnostic({ navigation }) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const [input, setInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const { user } = useAuth();
  const { connected, deviceData } = useBiometric();
  const {
    messages,
    conversations,
    conversationId,
    needsConfirmation,
    loading,
    fetching,
    error,
    sendMessage,
    answerConfirmation,
    startNewChat,
    loadConversation,
    removeConversation,
  } = useDiagnosticChat();

  const firstName = user?.prenom || user?.nom || 'vous';
  const statusText = loading ? 'MedGemma analyse...' : 'Propulse par MedGemma';
  const iot = () => (connected ? iotDataForChat(deviceData) : {});

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages]);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };
  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setDrawerOpen(false));
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await sendMessage(text, iot());
  };

  const handleNewChat = () => {
    startNewChat();
    closeDrawer();
  };

  const handleSelectConversation = async (id) => {
    closeDrawer();
    await loadConversation(id);
  };

  const handleDeleteConversation = (conv) => {
    Alert.alert('Supprimer', `Supprimer « ${conv.title || 'cette conversation'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeConversation(conv.id) },
    ]);
  };

  const handleOpenCarnet = (diagnostic) => {
    if (diagnostic?.id) {
      navigation?.navigate('DiagnosticDetail', { id: diagnostic.id });
    } else {
      navigation?.navigate('Carnet');
    }
  };

  const handleFindPharmacy = () => {
    try {
      navigation?.navigate('Pharmacies');
    } catch (e) {
      Alert.alert('Pharmacies', 'La recherche de pharmacies sera bientôt disponible.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuBtn} accessibilityLabel="Ouvrir le menu">
            <Text style={styles.menuBtnText}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>M</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Diagnostic IA</Text>
              <Text style={styles.headerSub}>{statusText}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleNewChat} style={styles.clearBtn} accessibilityLabel="Nouveau chat">
            <Text style={styles.clearBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        <IotStrip deviceData={deviceData} connected={connected} />

        {fetching ? (
          <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.loadingText}>Chargement de votre conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.messagesListEmpty]}
            ListEmptyComponent={<WelcomeMessage userName={firstName} onSuggestion={(text) => { setInput(text); inputRef.current?.focus(); }} />}
            renderItem={({ item }) => (
              <MessageBubble message={item} onOpenCarnet={handleOpenCarnet} onFindPharmacy={handleFindPharmacy} />
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {error && (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {needsConfirmation && !loading ? (
          <View style={[styles.confirmBar, { paddingBottom: insets.bottom + 6 }]}>
            <TouchableOpacity style={styles.confirmYes} onPress={() => answerConfirmation(true, iot())}>
              <Text style={styles.confirmYesText}>✅ Oui, c'est tout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmNo} onPress={() => answerConfirmation(false, iot())}>
              <Text style={styles.confirmNoText}>➕ Non, j'ai d'autres symptômes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 6 }]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Decrivez vos symptomes..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || loading}
            >
              {loading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.sendBtnIcon}>{">"}</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.disclaimer, { paddingBottom: insets.bottom ? 4 : 8 }]}>
          MediAI est un outil d'aide - consultez un medecin pour toute decision medicale.
        </Text>
      </KeyboardAvoidingView>

      <Drawer
        anim={drawerAnim}
        open={drawerOpen}
        insets={insets}
        conversations={conversations}
        conversationId={conversationId}
        onNewChat={handleNewChat}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onClose={closeDrawer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0faf4' },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: '#f0faf4' },
  loadingText: { color: colors.muted, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.green, gap: 8 },
  menuBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  menuBtnText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  headerTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 1 },
  clearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  clearBtnText: { color: colors.white, fontSize: 20, fontWeight: '800' },
  iotStrip: { backgroundColor: colors.greenPale, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.mint },
  iotStripTitle: { fontSize: 10, fontWeight: '700', color: colors.green, marginBottom: 5 },
  iotChipsRow: { flexDirection: 'row', gap: 6 },
  iotChip: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.mint },
  iotChipText: { fontSize: 11, fontWeight: '600', color: colors.green },
  messagesList: { padding: 16, paddingBottom: 10 },
  messagesListEmpty: { flexGrow: 1, justifyContent: 'center' },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.greenPale, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: colors.mint },
  aiAvatarText: { fontSize: 11, color: colors.green, fontWeight: '800' },
  bubble: { maxWidth: '82%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: colors.green, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  bubbleTextUser: { color: colors.white },
  bubbleTime: { fontSize: 9, color: 'rgba(107,143,113,0.8)', marginTop: 5, textAlign: 'right' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.62)' },
  bold: { fontWeight: '700' },
  typingRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 4, paddingVertical: 6 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.greenLight },

  // Carte diagnostic
  diagCard: { marginLeft: 36, marginBottom: 14, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.mint, padding: 14, maxWidth: '92%' },
  diagCardHead: { marginBottom: 12 },
  diagCardBadge: { fontSize: 10, fontWeight: '800', color: colors.greenLight, marginBottom: 4, textTransform: 'uppercase' },
  diagCardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  hypRow: { marginBottom: 10 },
  hypHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  hypName: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text, marginRight: 8 },
  hypPct: { fontSize: 12, fontWeight: '800' },
  hypBarBg: { height: 8, backgroundColor: '#eef2ed', borderRadius: 4, overflow: 'hidden' },
  hypBarFill: { height: '100%', borderRadius: 4 },
  diagActions: { marginTop: 8, gap: 8 },
  diagBtnPrimary: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  diagBtnPrimaryText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  diagBtnGhost: { backgroundColor: colors.greenPale, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.mint },
  diagBtnGhostText: { color: colors.green, fontSize: 13, fontWeight: '700' },

  welcome: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  welcomeEmoji: { fontSize: 24, fontWeight: '800', color: colors.green, marginBottom: 12 },
  welcomeTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  welcomeText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  suggChip: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: colors.mint },
  suggChipText: { fontSize: 12, color: colors.green, fontWeight: '600' },
  errorBar: { backgroundColor: '#fee2e2', paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border },
  input: { flex: 1, backgroundColor: '#f0faf4', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnIcon: { color: colors.white, fontSize: 30, lineHeight: 32, fontWeight: '700' },

  // Barre de confirmation Oui / Non
  confirmBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border },
  confirmYes: { flex: 1, backgroundColor: colors.green, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  confirmYesText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  confirmNo: { flex: 1.3, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: colors.mint },
  confirmNoText: { color: colors.green, fontSize: 12, fontWeight: '700' },

  disclaimer: { fontSize: 9, color: colors.muted, textAlign: 'center', paddingHorizontal: 20, paddingTop: 4, backgroundColor: colors.white },

  // Drawer
  overlay: { backgroundColor: '#000' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: colors.white, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 12 },
  drawerBrand: { fontSize: 20, fontWeight: '800', color: colors.green, marginBottom: 16 },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 18 },
  newChatIcon: { color: colors.white, fontSize: 18, fontWeight: '800' },
  newChatText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  drawerSection: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', marginBottom: 10 },
  drawerEmpty: { fontSize: 12, color: colors.muted, paddingVertical: 12 },
  convItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4 },
  convItemActive: { backgroundColor: colors.greenPale },
  convTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  convMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  convDate: { fontSize: 10, color: colors.muted },
  convDone: { fontSize: 10, color: colors.greenLight, fontWeight: '700' },
  convDelete: { fontSize: 14, color: colors.muted, paddingHorizontal: 4 },
});

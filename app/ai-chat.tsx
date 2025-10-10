import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { ChatMessage, geminiService } from '@/services/gemini';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AIChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const bg = Colors.dark.background;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const cancelReplyRef = useRef(false);

  const renderInlineSegments = (text: string) => {
    const segments: React.ReactNode[] = [];
    const regex = /\*(.+?)\*|\*(.+?)\*/g; // *bold* or italic
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push(
          <Text key={`t-${lastIndex}`} style={styles.messageText}>
            {text.slice(lastIndex, match.index)}
          </Text>
        );
      }
      const bold = match[1];
      const italic = match[2];
      if (bold) {
        segments.push(
          <Text key={`b-${match.index}`} style={[styles.messageText, { fontWeight: '700' }]}>
            {bold}
          </Text>
        );
      } else if (italic) {
        segments.push(
          <Text key={`i-${match.index}`} style={[styles.messageText, { fontStyle: 'italic' }]}>
            {italic}
          </Text>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push(
        <Text key={`t-${lastIndex}-end`} style={styles.messageText}>
          {text.slice(lastIndex)}
        </Text>
      );
    }

    return segments;
  };

  const renderFormattedMessage = (content: string) => {
    const lines = content.split(/\r?\n/);
    return (
      <View>
        {lines.map((line, index) => {
          // unordered list
          const ulMatch = line.match(/^\s*[-•]\s+(.*)$/);
          if (ulMatch) {
            return (
              <View key={`ul-${index}`} style={styles.listRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.messageText}>{renderInlineSegments(ulMatch[1])}</Text>
              </View>
            );
          }
          // ordered list
          const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
          if (olMatch) {
            return (
              <View key={`ol-${index}`} style={styles.listRow}>
                <Text style={styles.numberBullet}>{`${olMatch[1]}.`}</Text>
                <Text style={styles.messageText}>{renderInlineSegments(olMatch[2])}</Text>
              </View>
            );
          }
          // blank line spacer
          if (line.trim().length === 0) {
            return <View key={`sp-${index}`} style={{ height: 6 }} />;
          }
          // paragraph
          return (
            <Text key={`p-${index}`} style={styles.messageText}>
              {renderInlineSegments(line)}
            </Text>
          );
        })}
      </View>
    );
  };

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    setIsInitializing(true);
    try {
      // Check if API is configured
      if (!geminiService.isConfigured()) {
        Alert.alert(
          'API Key Required',
          'Please add your Gemini API key to the .env file to use InVo AI.\n\nAdd this line:\nEXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      await geminiService.initializeChat();
      
      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi! I'm InVo AI — your inventory assistant.

I can help with:
• Inventory status and stock alerts
• Sales trends and best sellers
• Supplier info and ordering tips
• Business insights and pricing

What would you like to know today?`,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      Alert.alert(
        'Initialization Failed',
        'Unable to start AI chat. Please check your internet connection and API key.',
        [
          { text: 'Retry', onPress: () => initializeChat() },
          { text: 'Go Back', onPress: () => router.back(), style: 'cancel' }
        ]
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    cancelReplyRef.current = false;

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('Sending message to AI:', userMessage.content);
      const response = await geminiService.sendMessage(userMessage.content);
      console.log('Received response from AI:', response.substring(0, 100) + '...');
      
      if (!response || response.trim().length === 0) {
        throw new Error('Received empty response from AI');
      }
      
      if (cancelReplyRef.current) {
        return; // stop was requested; do not append assistant message
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Scroll to bottom after response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${errorMessage}\n\nPlease try again or check your API configuration.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // quick actions removed

  if (isInitializing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <ThemedText type="subtitle">InVo AI</ThemedText>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <ThemedText style={styles.loadingText}>Initializing AI Assistant...</ThemedText>
            <ThemedText style={styles.loadingSubtext}>Analyzing your business data...</ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
            <IconSymbol name="chevron.left" size={22} color="#E5E7EB" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText type="subtitle" style={styles.headerCenterTitle}>InVo AI</ThemedText>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  'Reset Chat',
                  'Start a new conversation? This will clear the current chat history.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Reset', 
                      style: 'destructive',
                      onPress: () => {
                        geminiService.resetChat();
                        setMessages([]);
                        initializeChat();
                      }
                    }
                  ]
                );
              }} 
              style={styles.headerIconButton}
            >
              <IconSymbol name="arrow.clockwise" size={22} color="#E5E7EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions removed */}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === 'assistant' ? (
                <View style={styles.assistantMessageWrapper}>
                  <View style={styles.aiAvatarTop}>
                    <IconSymbol name="sparkles" size={14} color="#3B82F6" />
                  </View>
                  <View
                    style={[styles.messageContainer, styles.assistantMessageContainer]}
                  >
                    <View style={styles.messageInner}>
                      {renderFormattedMessage(message.content)}
                    </View>
                  </View>
                  <Text style={[styles.messageTime, styles.assistantMessageTime]}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ) : (
                <View style={styles.messageWrapper}>
                  <View
                    style={[styles.messageContainer, styles.userMessageContainer]}
                  >
                    <View style={styles.messageInner}>
                      {renderFormattedMessage(message.content)}
                    </View>
                  </View>
                  <Text style={[styles.messageTime, styles.userMessageTime]}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>
          ))}
          
          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.assistantMessageWrapper}>
                <View style={styles.aiAvatarTop}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
                <View style={styles.typingContainer}>
                  <Text style={styles.typingText}>InVo AI is thinking...</Text>
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
                    <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
                    <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
                  </View>
                </View>
                <View style={styles.stopRow}>
                  <TouchableOpacity
                    style={styles.stopChip}
                    onPress={() => { cancelReplyRef.current = true; setIsLoading(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stopDot} />
                    <Text style={styles.stopText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything about your business..."
              placeholderTextColor="#6B7280"
              multiline
              maxLength={1000}
              editable={!isLoading}
              textAlignVertical="center"
            />
            {!!inputText && !isLoading && (
              <TouchableOpacity
                onPress={() => setInputText('')}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <IconSymbol name="xmark" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          {/* meta row removed as per request */}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  headerSubtitle: {
    color: '#9BA1A6',
    fontSize: 12,
    marginTop: 2,
  },
  resetButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterTitle: {
    color: '#E5E7EB',
    fontWeight: '600',
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: '#9BA1A6',
    fontSize: 14,
    textAlign: 'center',
  },
  // quick action styles removed
  messagesContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  messagesContent: {
    padding: 12,
    paddingBottom: 20,
  },
  messageBubble: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  aiAvatarTop: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  assistantMessageWrapper: {
    flex: 1,
    maxWidth: '95%',
  },
  messageWrapper: {
    flex: 1,
    maxWidth: '95%',
  },
  messageContainer: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messageInner: {
    padding: 5,
  },
  userMessageContainer: {
    backgroundColor: '#3B82F6',
    marginLeft: 'auto',
  },
  assistantMessageContainer: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    // removed blue accent border
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  bullet: {
    color: '#FFFFFF',
    width: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  numberBullet: {
    color: '#FFFFFF',
    width: 22,
    textAlign: 'right',
    marginRight: 6,
    marginTop: 2,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assistantMessageText: {
    color: '#FFFFFF',
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  userMessageTime: {
    color: '#9BA1A6',
    textAlign: 'right',
  },
  assistantMessageTime: {
    color: '#6B7280',
    textAlign: 'left',
  },
  typingContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  typingText: {
    color: '#9BA1A6',
    fontSize: 14,
    marginBottom: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginHorizontal: 2,
  },
  stopRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  stopText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 42,
    maxHeight: 120,
    paddingVertical: 10,
    marginRight: 12,
  },
  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4A5568',
    opacity: 0.6,
  },
  // input meta styles removed
});
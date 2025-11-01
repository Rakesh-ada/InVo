import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { ChatMessage, geminiService } from '@/services/gemini';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

export default function AIChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const bg = Colors.dark.background;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const cancelReplyRef = useRef(false);
  const messageIdCounter = useRef(0);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Generate unique message ID
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `${Date.now()}-${messageIdCounter.current}`;
  };

  const renderInlineSegments = (text: string, lineKey: string = '') => {
    const segments: React.ReactNode[] = [];
    const regex = /\*(.+?)\*|\*(.+?)\*/g; // *bold* or italic
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let segmentCount = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push(
          <Text key={`${lineKey}-t-${segmentCount++}`} style={styles.messageText}>
            {text.slice(lastIndex, match.index)}
          </Text>
        );
      }
      const bold = match[1];
      const italic = match[2];
      if (bold) {
        segments.push(
          <Text key={`${lineKey}-b-${segmentCount++}`} style={[styles.messageText, { fontWeight: '700' }]}>
            {bold}
          </Text>
        );
      } else if (italic) {
        segments.push(
          <Text key={`${lineKey}-i-${segmentCount++}`} style={[styles.messageText, { fontStyle: 'italic' }]}>
            {italic}
          </Text>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push(
        <Text key={`${lineKey}-t-${segmentCount++}-end`} style={styles.messageText}>
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
                <Text style={styles.messageText}>{renderInlineSegments(ulMatch[1], `ul-${index}`)}</Text>
              </View>
            );
          }
          // ordered list
          const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
          if (olMatch) {
            return (
              <View key={`ol-${index}`} style={styles.listRow}>
                <Text style={styles.numberBullet}>{`${olMatch[1]}.`}</Text>
                <Text style={styles.messageText}>{renderInlineSegments(olMatch[2], `ol-${index}`)}</Text>
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
              {renderInlineSegments(line, `p-${index}`)}
            </Text>
          );
        })}
      </View>
    );
  };

const initializeChat = useCallback(async () => {
    setIsInitializing(true);
    try {
      // Check if API is configured
      if (!geminiService.isConfigured()) {
        Alert.alert(
          'API Key Required',
          'Please configure your Gemini API key using the settings icon to use InVo AI.',
          [{ text: 'OK' }]
        );
        setIsInitializing(false);
        return;
      }

      await geminiService.initializeChat();
      
      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Hi! I'm InVo AI — your inventory assistant!

I can help you with:
• Inventory status and stock alerts
• Sales trends and best sellers
• Supplier info and ordering tips
• Business insights and pricing strategies

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
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsInitializing(false);
    }
  }, [router]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Keyboard visibility listener
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSpecialCommand = async (command: string): Promise<string | null> => {
    const lowerCommand = command.toLowerCase();
    
    // Daily briefing
    if (lowerCommand.includes('daily briefing') || lowerCommand.includes('morning report')) {
      return await geminiService.generateDailyBriefing();
    }
    
    // Inventory optimization
    if (lowerCommand.includes('optimize inventory') || lowerCommand.includes('optimize stock')) {
      const { inventoryOptimizationAgent } = await import('@/services/inventory-optimization-agent');
      const plan = await inventoryOptimizationAgent.optimizeStock();
      
      return `🤖 INVENTORY OPTIMIZATION ANALYSIS

📦 REORDER RECOMMENDATIONS (${plan.toReorder.length}):
${plan.toReorder.slice(0, 5).map((r, i) => 
  `${i + 1}. ${r.product.name}: Order ${r.suggestedQuantity} units (${r.priority.toUpperCase()})
   → ${r.reason}`
).join('\n')}

🏷️ DISCOUNT OPPORTUNITIES (${plan.toDiscount.length}):
${plan.toDiscount.slice(0, 3).map((d, i) => 
  `${i + 1}. ${d.product.name}: Suggest ${d.suggestedDiscount}% discount
   → ${d.reason}`
).join('\n')}

💡 KEY RECOMMENDATIONS:
${plan.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

💰 FINANCIAL IMPACT:
• Potential Revenue: ₹${Math.round(plan.estimatedRevenue).toLocaleString()}
• Estimated Savings: ₹${Math.round(plan.estimatedSavings).toLocaleString()}

Would you like details on any specific item?`;
    }
    
    return null;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreaming) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputText.trim();
    setInputText('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');
    cancelReplyRef.current = false;

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('Sending message to AI (streaming):', userMessage.content);
      
      // Check for special commands
      const specialResponse = await handleSpecialCommand(messageContent);
      if (specialResponse) {
        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: specialResponse,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsStreaming(false);
        setIsLoading(false);

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 200);
        return;
      }
      
      // Use streaming API
      await geminiService.sendMessageStream(
        messageContent,
        (chunk) => {
          // On each chunk received
          if (!cancelReplyRef.current) {
            setStreamingMessage(prev => prev + chunk);
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 50);
          }
        },
        (fullResponse) => {
          // On complete
          if (cancelReplyRef.current) {
            setStreamingMessage('');
            return;
          }

          const assistantMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          setStreamingMessage('');
          setIsStreaming(false);
          setIsLoading(false);

          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 200);
        },
        (error) => {
          // On error
          console.error('Failed to get AI response:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          const errorChatMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: `❌ Sorry, I encountered an error: ${errorMessage}\n\nPlease try again or check your API configuration.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorChatMessage]);
          setStreamingMessage('');
          setIsStreaming(false);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Streaming setup error:', error);
      setStreamingMessage('');
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey) {
      Alert.alert('Validation', 'Please enter your Gemini API key.');
      return;
    }

    try {
      // Update the API key in gemini service
      geminiService.updateApiKey(trimmedKey);
      
      setIsApiKeyModalOpen(false);
      setApiKeyInput('');
      
      Alert.alert('Success', 'API key updated successfully! You can now use InVo AI.', [
        {
          text: 'OK',
          onPress: () => {
            // Reinitialize chat with new API key
            geminiService.resetChat();
            setMessages([]);
            initializeChat();
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to update API key:', error);
      Alert.alert('Error', 'Failed to update API key. Please try again.');
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
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIconButton}>
            <IconSymbol name="chevron.left" size={22} color="#E5E7EB" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="#E5E7EB">
              <Path d="M16.4004 21H14.2461L12.2461 16H5.75391L3.75391 21H1.59961L8 4.99996H10L16.4004 21ZM21 12V21H19V12H21ZM6.55371 14H11.4463L9 7.88473L6.55371 14ZM19.5293 2.3193C19.7058 1.89351 20.2942 1.8935 20.4707 2.3193L20.7236 2.93063C21.1555 3.97343 21.9615 4.80613 22.9746 5.2568L23.6914 5.57613C24.1022 5.75881 24.1022 6.35634 23.6914 6.53902L22.9326 6.87691C21.945 7.31619 21.1534 8.11942 20.7139 9.12789L20.4668 9.69332C20.2863 10.1075 19.7136 10.1075 19.5332 9.69332L19.2861 9.12789C18.8466 8.11941 18.0551 7.31619 17.0674 6.87691L16.3076 6.53902C15.8974 6.35617 15.8974 5.75894 16.3076 5.57613L17.0254 5.2568C18.0384 4.80613 18.8445 3.97343 19.2764 2.93063L19.5293 2.3193Z" />
            </Svg>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => setIsApiKeyModalOpen(true)} 
              style={styles.headerIconButton}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="#E5E7EB">
                <Path d="M22 12H20V5H4V18.3851L5.76282 17H12V19H6.45455L2 22.5V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V12ZM14.145 19.071C14.0505 18.7301 14 18.371 14 18C14 17.629 14.0505 17.2699 14.145 16.929L13.1699 16.366L14.1699 14.634L15.1459 15.1975C15.6475 14.6867 16.2851 14.31 17 14.126V13H19V14.126C19.7149 14.31 20.3525 14.6867 20.8541 15.1975L21.8301 14.634L22.8301 16.366L21.855 16.929C21.9495 17.2699 22 17.629 22 18C22 18.371 21.9495 18.7301 21.855 19.071L22.8301 19.634L21.8301 21.366L20.8541 20.8025C20.3525 21.3133 19.7149 21.69 19 21.874V23H17V21.874C16.2851 21.69 15.6475 21.3133 15.1459 20.8025L14.1699 21.366L13.1699 19.634L14.145 19.071ZM18 20C19.1046 20 20 19.1046 20 18C20 16.8954 19.1046 16 18 16C16.8954 16 16 16.8954 16 18C16 19.1046 16.8954 20 18 20Z" />
              </Svg>
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
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6">
                    <Path d="M15.9991 2.99995C19.3131 2.99995 22 5.69516 22 8.9941V21H8.00099C4.68693 21 2.00001 18.3048 2.00001 15.0058V11H4.00001V15.0058C4.00001 17.2042 5.79547 19 8.00099 19H20V8.9941C20 6.79576 18.2046 4.99995 15.9991 4.99995H10V2.99995H15.9991ZM10 13H8.00002V11H10V13ZM16 13H14V11H16V13ZM3.52931 1.31928C3.70584 0.89349 4.29418 0.893492 4.47071 1.31928L4.72364 1.93061C5.15555 2.9734 5.96155 3.80612 6.97462 4.25679L7.6924 4.57612C8.10268 4.75894 8.10263 5.35615 7.6924 5.53902L6.93263 5.87691C5.94498 6.31619 5.15339 7.11941 4.71388 8.12789L4.46681 8.69332C4.28636 9.10745 3.71366 9.10745 3.53321 8.69332L3.28614 8.12789C2.84661 7.11942 2.05506 6.31619 1.06739 5.87691L0.307623 5.53902C-0.102517 5.35615 -0.102565 4.75894 0.307623 4.57612L1.0254 4.25679C2.03845 3.80613 2.84446 2.97343 3.27638 1.93061L3.52931 1.31928Z" />
                  </Svg>
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
          
          {/* Streaming message */}
          {isStreaming && streamingMessage && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.assistantMessageWrapper}>
                <View style={styles.aiAvatarTop}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6">
                    <Path d="M15.9991 2.99995C19.3131 2.99995 22 5.69516 22 8.9941V21H8.00099C4.68693 21 2.00001 18.3048 2.00001 15.0058V11H4.00001V15.0058C4.00001 17.2042 5.79547 19 8.00099 19H20V8.9941C20 6.79576 18.2046 4.99995 15.9991 4.99995H10V2.99995H15.9991ZM10 13H8.00002V11H10V13ZM16 13H14V11H16V13ZM3.52931 1.31928C3.70584 0.89349 4.29418 0.893492 4.47071 1.31928L4.72364 1.93061C5.15555 2.9734 5.96155 3.80612 6.97462 4.25679L7.6924 4.57612C8.10268 4.75894 8.10263 5.35615 7.6924 5.53902L6.93263 5.87691C5.94498 6.31619 5.15339 7.11941 4.71388 8.12789L4.46681 8.69332C4.28636 9.10745 3.71366 9.10745 3.53321 8.69332L3.28614 8.12789C2.84661 7.11942 2.05506 6.31619 1.06739 5.87691L0.307623 5.53902C-0.102517 5.35615 -0.102565 4.75894 0.307623 4.57612L1.0254 4.25679C2.03845 3.80613 2.84446 2.97343 3.27638 1.93061L3.52931 1.31928Z" />
                  </Svg>
                </View>
                <View style={[styles.messageContainer, styles.assistantMessageContainer]}>
                  <View style={styles.messageInner}>
                    {renderFormattedMessage(streamingMessage)}
                  </View>
                </View>
              </View>
            </View>
          )}
          
          {isLoading && !isStreaming && (
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
                    onPress={() => { 
                      cancelReplyRef.current = true; 
                      setIsLoading(false); 
                      setIsStreaming(false);
                      setStreamingMessage('');
                    }}
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
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF">
                  <Path d="M21.7267 2.95694L16.2734 22.0432C16.1225 22.5716 15.7979 22.5956 15.5563 22.1126L11 13L1.9229 9.36919C1.41322 9.16532 1.41953 8.86022 1.95695 8.68108L21.0432 2.31901C21.5716 2.14285 21.8747 2.43866 21.7267 2.95694ZM19.0353 5.09647L6.81221 9.17085L12.4488 11.4255L15.4895 17.5068L19.0353 5.09647Z" />
                </Svg>
              )}
            </TouchableOpacity>
          </View>
          {/* meta row removed as per request */}
        </View>
      </KeyboardAvoidingView>

      {/* API Key Modal */}
      <Modal visible={isApiKeyModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Svg width={32} height={32} viewBox="0 0 24 24" fill="#3B82F6">
                <Path d="M22 12H20V5H4V18.3851L5.76282 17H12V19H6.45455L2 22.5V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V12ZM14.145 19.071C14.0505 18.7301 14 18.371 14 18C14 17.629 14.0505 17.2699 14.145 16.929L13.1699 16.366L14.1699 14.634L15.1459 15.1975C15.6475 14.6867 16.2851 14.31 17 14.126V13H19V14.126C19.7149 14.31 20.3525 14.6867 20.8541 15.1975L21.8301 14.634L22.8301 16.366L21.855 16.929C21.9495 17.2699 22 17.629 22 18C22 18.371 21.9495 18.7301 21.855 19.071L22.8301 19.634L21.8301 21.366L20.8541 20.8025C20.3525 21.3133 19.7149 21.69 19 21.874V23H17V21.874C16.2851 21.69 15.6475 21.3133 15.1459 20.8025L14.1699 21.366L13.1699 19.634L14.145 19.071ZM18 20C19.1046 20 20 19.1046 20 18C20 16.8954 19.1046 16 18 16C16.8954 16 16 16.8954 16 18C16 19.1046 16.8954 20 18 20Z" />
              </Svg>
              <ThemedText type="subtitle" style={styles.modalTitle}>Gemini API Key</ThemedText>
            </View>
            
            <View style={styles.modalBody}>
              <ThemedText style={styles.modalDescription}>
                Enter your Google Gemini API key to enable AI features. Get your key from Google AI Studio.
              </ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel} darkColor="#9BA1A6">API Key</ThemedText>
                <TextInput
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="AIza..."
                  placeholderTextColor="#6B7280"
                  style={styles.apiKeyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={() => {
                  setIsApiKeyModalOpen(false);
                  setApiKeyInput('');
                }}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSaveButton]} 
                onPress={handleSaveApiKey}
              >
                <ThemedText style={styles.modalSaveText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
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
    backgroundColor: 'transparent',
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
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  messageInner: {
    padding: 2,
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
    fontSize: 17,
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
    backgroundColor: 'transparent',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingTop: 12,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 28,
    paddingHorizontal: 10,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDescription: {
    color: '#9BA1A6',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  apiKeyInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  modalCancelButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  modalSaveButton: {
    backgroundColor: '#3B82F6',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // input meta styles removed
});
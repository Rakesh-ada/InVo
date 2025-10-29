import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [qrPaymentImage, setQrPaymentImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    markAppAsLaunched();
  }, []);

  const markAppAsLaunched = async () => {
    try {
      // Mark that the app has been launched (for first-time detection)
      await AsyncStorage.setItem('@invo_has_launched', 'true');
    } catch (e) {
      console.warn('Failed to mark app as launched', e);
    }
  };

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickQrPaymentImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setQrPaymentImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save profile data if provided
      if (profileName.trim()) {
        const initialSettings = {
          profileName: profileName.trim(),
          businessName: businessName.trim() || 'My Business',
          isDarkMode: true,
          autoSync: false,
          profileImageUri: profileImage,
          qrPaymentImageUri: qrPaymentImage,
        };
        await AsyncStorage.setItem('@invo_settings', JSON.stringify(initialSettings));
      }
      
      await AsyncStorage.setItem('@onboarding_complete', 'true');
      router.replace('/dashboard');
    } catch (e) {
      console.warn('Failed to complete onboarding:', e);
    }
  };

  const nextSlide = () => {
    if (currentSlide < 2) {
      const nextIndex = currentSlide + 1;
      setCurrentSlide(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const previousSlide = () => {
    if (currentSlide > 0) {
      const prevIndex = currentSlide - 1;
      setCurrentSlide(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * screenWidth,
        animated: true,
      });
    }
  };

  const bg = Colors.dark.background;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.scrollView}
        >
          {/* Slide 1: Welcome */}
          <View style={styles.slide}>
            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Image 
                    source={require('@/assets/images/iconcirc.png')} 
                    style={styles.logoImage} 
                    resizeMode="contain" 
                  />
                </View>
              </View>
              <ThemedText type="title" style={styles.title}>
                Welcome to InVo
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Effortless Inventory Mastery 🚀
              </ThemedText>
            </View>
          </View>

          {/* Slide 2: Profile Setup */}
          <View style={styles.slide}>
            <View style={styles.profileSetupContent}>
              <View style={styles.headerSection}>
                <ThemedText type="title" style={styles.profileSetupTitle}>
                  Profile Setup
                </ThemedText>
                
<ThemedText style={styles.profileSetupSubtitle}>
                  Let{'\''}s Personalize Your Experience
                </ThemedText>
              </View>
              
              <View style={styles.profileSection}>
                <TouchableOpacity 
                  style={styles.profileImageContainer} 
                  onPress={pickProfileImage}
                  activeOpacity={0.8}
                >
                  {profileImage ? (
                    <Image 
                      source={{ uri: profileImage }} 
                      style={styles.profileImageImg} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <IconSymbol name="person.fill" size={50} color="#9BA1A6" />
                    </View>
                  )}
                </TouchableOpacity>
                <ThemedText style={styles.addPhotoText}>Tap to add photo</ThemedText>
              </View>
              
              <View style={styles.nameInputContainer}>
                <TextInput
                  value={profileName}
                  onChangeText={setProfileName}
                  style={styles.nameInput}
                  placeholder="Enter Your Name"
                  placeholderTextColor="#6B7280"
                />
                
                <ThemedText style={styles.instructionText}>
                  This will be displayed in your settings
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Slide 3: Business Setup */}
          <View style={styles.slide}>
            <View style={styles.businessSetupContent}>
              <View style={styles.headerSection}>
                <ThemedText type="title" style={styles.businessSetupTitle}>
                  Business Setup
                </ThemedText>
                
<ThemedText style={styles.businessSetupSubtitle}>
                  Let{'\''}s set up Your Business Profile
                </ThemedText>
              </View>
              
              <View style={styles.qrSection}>
                <TouchableOpacity 
                  style={styles.qrImageContainer} 
                  onPress={pickQrPaymentImage}
                  activeOpacity={0.8}
                >
                  {qrPaymentImage ? (
                    <Image 
                      source={{ uri: qrPaymentImage }} 
                      style={styles.qrImageImg} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View style={styles.qrImagePlaceholder}>
                      <IconSymbol name="qrcode" size={60} color="#9BA1A6" />
                    </View>
                  )}
                </TouchableOpacity>
                <ThemedText style={styles.addQrText}>Tap to add QR code</ThemedText>
              </View>
              
              <View style={styles.businessNameInputContainer}>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  style={styles.businessNameInput}
                  placeholder="Enter Business Name"
                  placeholderTextColor="#6B7280"
                />
                
                <ThemedText style={styles.instructionText}>
                  This will be displayed on your settings
                </ThemedText>
              </View>
            </View>
          </View>

        </ScrollView>

        {/* Navigation Controls */}
        <View style={styles.controls}>
          <View style={styles.pagination}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentSlide && styles.activeDot,
                ]}
              />
            ))}
          </View>
          
          <View style={[styles.buttonContainer, currentSlide === 0 && styles.centeredButtonContainer]}>
            {currentSlide > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={previousSlide}
              >
                <ThemedText style={styles.backButtonText}>Back</ThemedText>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={nextSlide}
            >
              <ThemedText style={styles.getStartedButtonText}>
                {currentSlide === 0 ? "Let's GO!" : currentSlide === 2 ? 'Get Started' : 'Next'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  scrollView: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featureList: {
    gap: 16,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginLeft: 12,
  },
  controls: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444444',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#3B82F6',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centeredButtonContainer: {
    justifyContent: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  getStartedButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  getStartedButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileSetupContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    maxWidth: 300,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  profileSetupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  profileSetupSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
    marginBottom: 12,
  },
  profileImageImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  nameInputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nameInput: {
    width: '100%',
    fontSize: 20,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 12,
    textAlign: 'center',
    marginBottom: 25,
  },
  instructionText: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  businessSetupContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    maxWidth: 300,
  },
  businessSetupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 0,
  },
  businessSetupSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  qrImageContainer: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3B82F6',
    marginBottom: 12,
  },
  qrImageImg: {
    width: 160,
    height: 160,
    borderRadius: 16,
  },
  qrImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addQrText: {
    fontSize: 12,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  businessNameInputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  businessNameInput: {
    width: '100%',
    fontSize: 20,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 12,
    textAlign: 'center',
    marginBottom: 25,
  },
});



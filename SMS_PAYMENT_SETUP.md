# SMS Payment Verification Setup

This guide explains how to set up automatic SMS-based payment verification for your InVo app.

## Overview

The app now monitors incoming SMS messages for payment confirmations. When the payment modal is open, it automatically:
1. Requests SMS permissions from the user
2. Monitors incoming SMS messages
3. Looks for payment deduction messages matching the cart total
4. Displays a success animation when payment is detected
5. Automatically completes the transaction

## Features Implemented

### ✅ Completed
- SMS permission handling (Android)
- Payment SMS monitoring service
- Animated success state (green checkmark with rotation animation)
- QR code fade-out animation
- Auto-complete after payment detection
- Support for multiple payment apps (UPI, GPay, PhonePe, Paytm, etc.)

## Installation Steps

### 1. Install Required Packages

Run the following command to install the necessary dependencies:

```bash
npx expo install expo-sms
```

### 2. For Full SMS Reading (Production)

The current implementation includes a placeholder for SMS reading. To enable actual SMS reading on Android, you need to add a native SMS reading library.

**Option A: Using Expo Config Plugin (Recommended for Expo)**

Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ]
    ]
  }
}
```

**Option B: Using React Native Module**

Install `react-native-android-sms`:
```bash
npm install react-native-android-sms
```

Then update `services/sms-payment-monitor.ts` line 108-131 with:

```typescript
import SmsAndroid from 'react-native-android-sms';

private async checkRecentSMS(): Promise<PaymentSMS | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    const messages = await new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          indexFrom: 0,
          maxCount: 20,
          minDate: fiveMinutesAgo,
        }),
        (fail) => reject(fail),
        (count, smsList) => {
          const messages = JSON.parse(smsList);
          resolve(messages);
        }
      );
    });

    // Check each message for payment information
    for (const sms of messages) {
      if (this.isPaymentMessage(sms.body)) {
        const amount = this.parsePaymentAmount(sms.body);
        if (amount && Math.abs(amount - this.expectedAmount) < 0.01) {
          return {
            amount,
            timestamp: new Date(sms.date),
            message: sms.body,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading SMS:', error);
    return null;
  }
}
```

### 3. Build the App

For development:
```bash
npx expo run:android
```

For production build:
```bash
eas build --platform android
```

## How It Works

### Payment Flow

1. **User Opens Payment Modal**
   - Clicks "Proceed" in the cart
   - Payment modal shows QR code
   - SMS monitoring starts automatically

2. **User Makes Payment**
   - User scans QR code with payment app
   - Completes payment in their banking/UPI app
   - Bank sends SMS confirmation to user's phone

3. **Automatic Detection**
   - App monitors SMS messages every 2 seconds
   - Parses messages for payment keywords and amounts
   - Matches payment amount to cart total

4. **Success Animation**
   - QR code fades out and scales down
   - Green checkmark appears with rotation animation
   - "Payment Successful!" message displays
   - Transaction completes automatically after 2 seconds

### Supported Payment Patterns

The SMS monitor detects payments from messages containing:
- Keywords: `debited`, `paid`, `sent`, `transferred`, `payment`, `UPI`, `GPay`, `PhonePe`, `Paytm`
- Amount formats: `Rs 240.00`, `₹240`, `INR 240.00`, `Rs. 240`

### Manual Override

Users can still manually click "Done" button if:
- SMS permissions are denied
- SMS monitoring is not working
- They prefer manual confirmation

## Testing

### Test Without Real SMS

For testing the animation without actual SMS:

1. Open payment modal
2. In your browser/developer console, call:
```javascript
// Simulate payment detection after 5 seconds
setTimeout(() => {
  // This would be called by SMS monitor in production
  handlePaymentDetected();
}, 5000);
```

### Test With Real SMS

1. Set up QR code in Settings (pointing to your payment account)
2. Add items to cart
3. Click "Proceed"
4. Make a real payment from another phone
5. Watch the animation trigger automatically

## Permissions

The app requests these Android permissions:
- `READ_SMS` - To read incoming SMS messages
- `RECEIVE_SMS` - To receive SMS messages in real-time

Users will see a permission prompt when first opening the payment modal.

## Security Considerations

- SMS messages are only read when payment modal is active
- Only searches for payment-related messages
- No SMS data is stored or transmitted
- Monitoring stops when modal is closed
- Uses local processing only

## Customization

### Adjust Animation Timing

Edit `app/(tabs)/explore.tsx`:

```typescript
// QR fade-out duration (line 333-342)
duration: 300, // milliseconds

// Success animation delay (line 346)
setTimeout(() => { ... }, 300);

// Auto-complete delay (line 363)
setTimeout(() => { ... }, 2000);
```

### Modify SMS Patterns

Edit `services/sms-payment-monitor.ts`:

```typescript
// Add more payment keywords (line 82-93)
const debitKeywords = [
  'debited',
  'paid',
  // Add your custom keywords
  'custom-bank-keyword',
];

// Add more amount patterns (line 57-62)
const patterns = [
  // Add regex patterns for your region
  /your-custom-pattern/i,
];
```

## Troubleshooting

### SMS Not Detected

1. Check permissions granted: Settings → Apps → InVo → Permissions
2. Verify SMS contains payment keywords
3. Ensure amount format is recognized
4. Check console logs for SMS parsing errors

### Animation Not Playing

1. Ensure React Native Reanimated is properly installed
2. Check console for animation errors
3. Verify `useNativeDriver: true` is supported

### Manual Testing

Use the "Done" button to bypass SMS detection for testing other features.

## Future Enhancements

Potential improvements:
- [ ] Support for bank-specific SMS formats
- [ ] Transaction ID matching
- [ ] Multiple language support
- [ ] Vibration/sound feedback on success
- [ ] SMS history viewer
- [ ] Configurable timeout duration

## Support

For issues or questions:
- Check the console logs for detailed error messages
- Ensure SMS permissions are granted
- Test with manual "Done" button first
- Verify QR code is properly set up in Settings

import * as SMS from 'expo-sms';
import { Platform, PermissionsAndroid } from 'react-native';
import SmsAndroid from 'react-native-android-sms';

export interface PaymentSMS {
  amount: number;
  transactionId?: string;
  timestamp: Date;
  message: string;
}

export class SMSPaymentMonitor {
  private static instance: SMSPaymentMonitor;
  private isMonitoring: boolean = false;
  private expectedAmount: number = 0;
  private onPaymentDetected?: (payment: PaymentSMS) => void;
  private checkInterval?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): SMSPaymentMonitor {
    if (!SMSPaymentMonitor.instance) {
      SMSPaymentMonitor.instance = new SMSPaymentMonitor();
    }
    return SMSPaymentMonitor.instance;
  }

  /**
   * Request SMS permissions on Android
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ]);

      return (
        granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.error('Error requesting SMS permissions:', err);
      return false;
    }
  }

  /**
   * Parse payment amount from SMS message
   */
  private parsePaymentAmount(message: string): number | null {
    // Common patterns in payment SMS:
    // "debited Rs 240.00", "INR 240.00", "₹240.00", "Rs. 240", "Amount: 240"
    const patterns = [
      /(?:debited|paid|sent|transferred).*?(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?).*?(?:debited|paid|sent|transferred)/i,
      /amount[:\s]+(?:Rs\.?|INR|₹)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  /**
   * Check if message is a payment debit/sent message
   */
  private isPaymentMessage(message: string): boolean {
    const debitKeywords = [
      'debited',
      'paid',
      'sent',
      'transferred',
      'transaction',
      'payment',
      'upi',
      'gpay',
      'phonepe',
      'paytm',
    ];

    const lowerMessage = message.toLowerCase();
    return debitKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Read recent SMS messages (last 5 minutes) and check for payment
   */
  private async checkRecentSMS(): Promise<PaymentSMS | null> {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      // Read SMS messages from inbox
      const messages: any = await new Promise((resolve, reject) => {
        SmsAndroid.list(
          JSON.stringify({
            box: 'inbox',
            indexFrom: 0,
            maxCount: 20,
          }),
          (fail: any) => {
            console.warn('Failed to read SMS:', fail);
            reject(fail);
          },
          (count: number, smsList: string) => {
            try {
              const parsedMessages = JSON.parse(smsList);
              resolve(parsedMessages);
            } catch (e) {
              console.error('Failed to parse SMS list:', e);
              resolve([]);
            }
          }
        );
      });

      // Check each recent message for payment information
      if (Array.isArray(messages)) {
        for (const sms of messages) {
          // Only check messages from last 5 minutes
          const messageTime = parseInt(sms.date || sms.date_sent || '0');
          if (messageTime < fiveMinutesAgo) {
            continue;
          }

          const messageBody = sms.body || '';
          
          // Check if this is a payment-related message
          if (this.isPaymentMessage(messageBody)) {
            const amount = this.parsePaymentAmount(messageBody);
            
            // Check if amount matches expected amount (within 1 paisa tolerance)
            if (amount && Math.abs(amount - this.expectedAmount) < 0.01) {
              console.log('✅ Payment SMS detected:', messageBody);
              return {
                amount,
                timestamp: new Date(messageTime),
                message: messageBody,
                transactionId: this.extractTransactionId(messageBody),
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error reading SMS:', error);
      return null;
    }
  }

  /**
   * Extract transaction ID from SMS message if available
   */
  private extractTransactionId(message: string): string | undefined {
    const patterns = [
      /(?:UPI|Txn|Transaction|Ref|Reference).*?(?:ID|No|Number)[:\s]+([A-Z0-9]+)/i,
      /(?:Order|Payment).*?ID[:\s]+([A-Z0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Start monitoring for payment SMS matching the expected amount
   */
  async startMonitoring(
    expectedAmount: number,
    onPaymentDetected: (payment: PaymentSMS) => void
  ): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.error('SMS permissions not granted');
      return false;
    }

    this.expectedAmount = expectedAmount;
    this.onPaymentDetected = onPaymentDetected;
    this.isMonitoring = true;

    // Check SMS every 2 seconds
    this.checkInterval = setInterval(async () => {
      const payment = await this.checkRecentSMS();
      
      if (payment && Math.abs(payment.amount - this.expectedAmount) < 0.01) {
        this.onPaymentDetected?.(payment);
        this.stopMonitoring();
      }
    }, 2000);

    return true;
  }

  /**
   * Stop monitoring for payment SMS
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    this.isMonitoring = false;
    this.expectedAmount = 0;
    this.onPaymentDetected = undefined;
  }

  /**
   * Check if currently monitoring
   */
  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }
}

export default SMSPaymentMonitor.getInstance();

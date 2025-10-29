/**
 * Test Helper for SMS Payment Detection
 * 
 * Use this during development to test the payment animation
 * without needing actual SMS messages.
 */

import { PaymentSMS } from './sms-payment-monitor';

export class TestSMSHelper {
  /**
   * Simulate a payment SMS after a delay
   * Useful for testing the animation flow
   */
  static simulatePaymentSMS(
    amount: number,
    delayMs: number = 3000
  ): Promise<PaymentSMS> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const payment: PaymentSMS = {
          amount,
          timestamp: new Date(),
          message: `Rs ${amount.toFixed(2)} debited from your account. UPI Ref: TEST${Date.now()}`,
          transactionId: `TEST${Date.now()}`,
        };
        
        console.log('🧪 Test SMS Generated:', payment);
        resolve(payment);
      }, delayMs);
    });
  }

  /**
   * Generate a mock SMS message for different payment apps
   */
  static generateMockSMS(
    amount: number,
    type: 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'bank' = 'upi'
  ): PaymentSMS {
    const messages = {
      upi: `Rs ${amount.toFixed(2)} debited from your A/C XX1234 on ${new Date().toLocaleDateString()} to VPA merchant@upi. UPI Ref: ${Date.now()}`,
      
      gpay: `You paid ₹${amount.toFixed(2)} to Merchant using Google Pay. UPI transaction ID: ${Date.now()}`,
      
      phonepe: `Rs.${amount} debited from account XX1234. PhonePe Txn ID: ${Date.now()}. If not done by you, call 18001234567`,
      
      paytm: `INR ${amount.toFixed(2)} sent to Merchant via Paytm. Order ID: ${Date.now()}. Download app: paytm.in/app`,
      
      bank: `Dear Customer, Rs ${amount.toFixed(2)} debited from A/c XX1234 on ${new Date().toLocaleDateString()}. Avl Bal: Rs 10000. HDFC Bank`,
    };

    return {
      amount,
      timestamp: new Date(),
      message: messages[type],
      transactionId: `${type.toUpperCase()}${Date.now()}`,
    };
  }

  /**
   * Test different SMS formats to verify parsing
   */
  static testSMSParsing() {
    console.log('🧪 Testing SMS Parsing...\n');

    const testCases = [
      { amount: 240.00, type: 'upi' as const },
      { amount: 240.00, type: 'gpay' as const },
      { amount: 240.00, type: 'phonepe' as const },
      { amount: 240.00, type: 'paytm' as const },
      { amount: 240.00, type: 'bank' as const },
    ];

    testCases.forEach(({ amount, type }) => {
      const sms = this.generateMockSMS(amount, type);
      console.log(`\n📱 ${type.toUpperCase()}:`);
      console.log(`Message: ${sms.message}`);
      console.log(`Amount: ₹${sms.amount}`);
      console.log(`TxnID: ${sms.transactionId}`);
    });

    console.log('\n✅ Test parsing complete!');
  }

  /**
   * Simulate a payment flow for end-to-end testing
   */
  static async simulatePaymentFlow(
    amount: number,
    onProgress?: (step: string) => void
  ): Promise<PaymentSMS> {
    const steps = [
      'Payment initiated...',
      'Scanning QR code...',
      'Authenticating payment...',
      'Processing transaction...',
      'Payment successful!',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onProgress?.(steps[i]);
      console.log(`🔄 ${steps[i]}`);
    }

    return this.generateMockSMS(amount);
  }
}

// Example usage in development:
// 
// // Test animation after 3 seconds
// TestSMSHelper.simulatePaymentSMS(240.00, 3000).then(payment => {
//   console.log('Payment detected:', payment);
// });
//
// // Test different SMS formats
// TestSMSHelper.testSMSParsing();
//
// // Test full payment flow
// TestSMSHelper.simulatePaymentFlow(240.00, (step) => {
//   console.log('Progress:', step);
// });

export default TestSMSHelper;

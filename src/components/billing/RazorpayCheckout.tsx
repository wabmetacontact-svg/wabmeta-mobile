// src/components/billing/RazorpayCheckout.tsx
import React, { useState } from "react";
import { View, Modal, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../context/AuthContext";

interface Props {
  visible: boolean;
  orderId: string;
  amount: number;
  razorpayKey: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (data: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  onClose: () => void;
}

export function RazorpayCheckout({
  visible,
  orderId,
  amount,
  razorpayKey,
  prefillName,
  prefillEmail,
  prefillContact,
  onSuccess,
  onClose,
}: Props) {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; background: #ffffff; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #0A6B5C; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="loader" id="loader"></div>
      
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>
        window.onload = function() {
          var options = {
            key: "${razorpayKey}",
            amount: "${amount}",
            currency: "INR",
            name: "WabMeta",
            description: "Plan Subscription / Top Up",
            order_id: "${orderId}",
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SUCCESS',
                data: response
              }));
            },
            prefill: {
              name: "${prefillName || organization?.name || ''}",
              email: "${prefillEmail || ''}",
              contact: "${prefillContact || ''}"
            },
            theme: {
              color: "#0A6B5C"
            },
            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLOSED' }));
              }
            }
          };

          var rzp1 = new Razorpay(options);
          
          rzp1.on('payment.failed', function (response){
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'FAILED',
              error: response.error
            }));
          });
          
          var loader = document.getElementById('loader');
          if (loader) loader.style.display = 'none';
          rzp1.open();
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "SUCCESS") {
        onSuccess(data.data);
      } else if (data.type === "CLOSED") {
        onClose();
      } else if (data.type === "FAILED") {
        console.error("Payment failed:", data.error);
        onClose();
      }
    } catch (err) {
      console.error("Failed to parse WebView message:", err);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Secure Checkout</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Initializing secure payment gateway...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#000" },
  closeBtn: { padding: 4 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#666", fontWeight: "600" },
});

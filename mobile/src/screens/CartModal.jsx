import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X, Send, Download, Mail } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import useAuthStore from '@shared/stores/useAuthStore';
import useChatStore from '@shared/stores/useChatStore';

export default function CartModal({ visible, onClose, chat }) {
  const { sendMessage } = useChatStore();
  const token = useAuthStore(s => s.token);

  // Client and Cart Data extraction
  const cartData = chat?.client?.cartData || {};
  let cartItems = [];
  let shippingAddress = '';
  let razonSocial = '';
  let rfc = '';
  let billingAddress = '';

  if (Array.isArray(cartData)) {
    cartItems = cartData;
  } else if (cartData && cartData.items) {
    cartItems = cartData.items;
    shippingAddress = cartData.shippingAddress || '';
    razonSocial = cartData.razonSocial || '';
    rfc = cartData.rfc || cartData.RFC || '';
    billingAddress = cartData.billingAddress || cartData.domicilioFiscal || '';
  }

  const clientName = chat?.client?.name || '';
  const clientPhone = chat?.client?.phoneNumber || chat?.client?.phone || '';

  // Calculation
  const total = cartItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 1)), 0);
  const subtotal = total / 1.16;
  const iva = total - subtotal;

  const handleSendSummary = () => {
    let text = '*RESUMEN DE COTIZACI\u00d3N*\n\n';
    
    cartItems.forEach(item => {
      const lineTotal = (item.precio || 0) * (item.cantidad || 1);
      text += `${item.cantidad}x ${item.clave}\n`;
      text += `_${item.descripcion}_\n`;
      text += `$${(item.precio || 0).toFixed(2)} c/u  ->  $${lineTotal.toFixed(2)}\n`;
      text += '----------------------------------------\n';
    });

    text += `*Subtotal:* $${subtotal.toFixed(2)}\n`;
    text += `*IVA (16%):* $${iva.toFixed(2)}\n`;
    text += `*Total Neto:* $${total.toFixed(2)}\n`;

    if (shippingAddress) {
      text += `\n*Direcci\u00f3n de Env\u00edo:*\n${shippingAddress}`;
    }

    if (sendMessage) {
      sendMessage(text, false);
      Toast.show({ type: 'success', text1: 'Resumen enviado al chat' });
      onClose();
    } else {
      Toast.show({ type: 'error', text1: 'No se pudo enviar el mensaje' });
    }
  };

  const handleDownloadPDF = async () => {
    Toast.show({ type: 'info', text1: 'Generando PDF', text2: 'Esta funci\u00f3n requiere m\u00f3dulos nativos en m\u00f3vil. Estar\u00e1 disponible pr\u00f3ximamente.' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Carrito y Cotizaci\u00f3n</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#94a3b8" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Client Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos del Cliente</Text>
              <Text style={styles.textRow}><Text style={styles.bold}>Nombre:</Text> {clientName}</Text>
              <Text style={styles.textRow}><Text style={styles.bold}>Tel\u00e9fono:</Text> {clientPhone}</Text>
              
              {(razonSocial || rfc || billingAddress) ? (
                <View style={styles.billingCard}>
                  {razonSocial ? <Text style={styles.textRow}><Text style={styles.bold}>Raz\u00f3n Social:</Text> {razonSocial}</Text> : null}
                  {rfc ? <Text style={styles.textRow}><Text style={styles.bold}>RFC:</Text> {rfc}</Text> : null}
                  {billingAddress ? <Text style={styles.textRow}><Text style={styles.bold}>Direcci\u00f3n Fisc.:</Text> {billingAddress}</Text> : null}
                </View>
              ) : null}

              {shippingAddress ? (
                <View style={styles.shippingCard}>
                  <Text style={styles.textRow}><Text style={styles.bold}>Env\u00edo:</Text> {shippingAddress}</Text>
                </View>
              ) : null}
            </View>

            {/* Cart Items Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Partidas del Carrito</Text>
              {cartItems.length === 0 ? (
                <Text style={styles.emptyText}>El carrito est\u00e1 vac\u00edo</Text>
              ) : (
                cartItems.map((item, idx) => {
                  const lineTotal = (item.precio || 0) * (item.cantidad || 1);
                  return (
                    <View key={idx} style={styles.cartItem}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemClave}>{item.cantidad}x {item.clave}</Text>
                        <Text style={styles.itemTotal}>${lineTotal.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{item.descripcion}</Text>
                      <Text style={styles.itemPrice}>${(item.precio || 0).toFixed(2)} c/u</Text>
                    </View>
                  );
                })
              )}
            </View>

            {/* Totals Section */}
            {cartItems.length > 0 && (
              <View style={styles.totalsSection}>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal:</Text><Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>IVA (16%):</Text><Text style={styles.totalValue}>${iva.toFixed(2)}</Text></View>
                <View style={[styles.totalRow, styles.grandTotalRow]}><Text style={styles.grandTotalLabel}>Total Neto:</Text><Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text></View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnSummary, cartItems.length === 0 && styles.btnDisabled]} 
              disabled={cartItems.length === 0}
              onPress={handleSendSummary}
            >
              <Send size={18} color="#06b6d4" />
              <Text style={styles.btnSummaryText}>Resumen a Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnPdf, cartItems.length === 0 && styles.btnDisabled]} 
              disabled={cartItems.length === 0}
              onPress={handleDownloadPDF}
            >
              <Download size={18} color="#ffffff" />
              <Text style={styles.btnPdfText}>Cotizaci\u00f3n PDF</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0f172a',
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 5,
  },
  scrollContent: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#06b6d4',
    marginBottom: 10,
  },
  textRow: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#f8fafc',
  },
  billingCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  shippingCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  cartItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemClave: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 15,
  },
  itemTotal: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 15,
  },
  itemDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 4,
  },
  itemPrice: {
    color: '#94a3b8',
    fontSize: 13,
  },
  totalsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  totalValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  grandTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  grandTotalLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  btnSummary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSummaryText: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  btnPdf: {
    backgroundColor: '#0284c7', // sales-blue-600
  },
  btnPdfText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  }
});

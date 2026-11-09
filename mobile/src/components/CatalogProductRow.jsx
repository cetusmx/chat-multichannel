import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Package } from 'lucide-react-native';
import useCatalogStore from '../stores/useCatalogStore';
import { productTitle, productSubtitle, productBadges, stockLabel } from '../utils/catalog';
import { theme } from '../utils/theme';

function formatMoney(value, currency) {
  const n = Number(value ?? 0);
  const amount = n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency && currency !== 'MXN' ? `$${amount} ${currency}` : `$${amount}`;
}

/**
 * One catalog result (Product DTO) rendered according to the tenant's
 * display template. `actions` is a slot for buttons.
 * Mirrors frontend/src/features/catalog/CatalogProductRow.jsx.
 */
export default function CatalogProductRow({ product, actions, style }) {
  const schema = useCatalogStore((s) => s.schema);
  const capabilities = useCatalogStore((s) => s.capabilities);
  const [imageFailed, setImageFailed] = useState(false);

  const title = productTitle(product, schema.display);
  const subtitle = productSubtitle(product, schema.display);
  const badges = productBadges(product, schema.display, schema);
  const stock = stockLabel(product);
  const inStock = (product.stock?.total ?? 0) > 0;
  const showImage = capabilities.productImages && product.imageUrl && !imageFailed;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.body}>
        {showImage ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" onError={() => setImageFailed(true)} />
        ) : null}
        <View style={styles.info}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              {subtitle ? (
                <View style={styles.subtitleRow}>
                  <Package size={14} color="#3b82f6" />
                  <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                </View>
              ) : null}
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
            {stock ? (
              <View style={[styles.stockBadge, inStock ? styles.stockIn : styles.stockOut]}>
                <Text style={[styles.stockText, inStock ? styles.stockTextIn : styles.stockTextOut]}>{stock}</Text>
              </View>
            ) : null}
          </View>
          {badges.length > 0 && (
            <View style={styles.badges}>
              {badges.map((b) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.price}>
          {formatMoney(product.priceNet, product.currency)}
          <Text style={styles.tax}>  IVA incluido{product.unit ? ` · ${product.unit}` : ''}</Text>
        </Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  body: {
    flexDirection: 'row',
    gap: 10,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  subtitle: {
    flex: 1,
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 12,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 13,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  stockIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  stockOut: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: '#475569',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockTextIn: {
    color: theme.colors.success,
  },
  stockTextOut: {
    color: theme.colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  price: {
    flex: 1,
    color: theme.colors.success,
    fontWeight: 'bold',
    fontSize: 14,
  },
  tax: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'normal',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

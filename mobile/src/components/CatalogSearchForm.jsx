import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Modal, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Search, ChevronDown, Check, X } from 'lucide-react-native';
import useCatalogStore from '../stores/useCatalogStore';
import { hasRequiredValues } from '../utils/catalog';
import { theme } from '../utils/theme';

const ACCENT = '#06b6d4';
const PLACEHOLDER = '#64748b';

/**
 * Search form rendered from the tenant's catalog schema. Controlled:
 * `values` is { q, <attributeKey>: string }, `onChange(next)`.
 * Mirrors frontend/src/features/catalog/CatalogSearchForm.jsx with RN widgets.
 */
export default function CatalogSearchForm({ values, onChange, onSubmit, loading = false, error = null }) {
  const schema = useCatalogStore((s) => s.schema);
  const options = useCatalogStore((s) => s.options);
  const optionsLoading = useCatalogStore((s) => s.optionsLoading);
  const loadOptions = useCatalogStore((s) => s.loadOptions);
  const [pickerKey, setPickerKey] = useState(null);

  useEffect(() => {
    for (const a of schema.attributes) {
      if (a.type === 'select' && !a.options && a.optionsSource) loadOptions(a.key);
    }
  }, [schema, loadOptions]);

  const set = (key, value) => onChange({ ...values, [key]: value });
  const hasAnyValue = (values.q && values.q.trim()) || schema.attributes.some((a) => values[a.key] !== '' && values[a.key] != null);
  const canSubmit = hasRequiredValues(schema, values) && !!hasAnyValue;

  const labelFor = (a) => `${a.unit ? `${a.label} (${a.unit})` : a.label}${a.required ? ' *' : ''}`;
  const isTruthy = (v) => v === true || v === 'true';

  const renderAttribute = (a) => {
    switch (a.type) {
      case 'select': {
        const list = options[a.key] || a.options || [];
        const selected = list.find((o) => String(o.value) === String(values[a.key] ?? ''));
        const isLoading = !!optionsLoading[a.key];
        return (
          <TouchableOpacity
            style={[styles.input, styles.selectBtn, isLoading && styles.disabled]}
            disabled={isLoading}
            onPress={() => setPickerKey(a.key)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
          >
            <Text style={[styles.selectText, !selected && styles.selectPlaceholder]} numberOfLines={1}>
              {isLoading ? 'Cargando opciones…' : selected ? selected.label : (a.placeholder || `Seleccionar ${a.label.toLowerCase()}`)}
            </Text>
            {isLoading ? <ActivityIndicator size="small" color={PLACEHOLDER} /> : <ChevronDown size={16} color={PLACEHOLDER} />}
          </TouchableOpacity>
        );
      }
      case 'boolean':
        return (
          <View style={[styles.input, styles.switchRow]}>
            <Text style={styles.switchLabel}>{isTruthy(values[a.key]) ? 'Sí' : 'No'}</Text>
            <Switch
              value={isTruthy(values[a.key])}
              onValueChange={(v) => set(a.key, v ? 'true' : '')}
              trackColor={{ false: theme.colors.border, true: ACCENT }}
              thumbColor="#fff"
            />
          </View>
        );
      case 'range':
        return (
          <TextInput
            style={styles.input}
            value={values[a.key] ?? ''}
            onChangeText={(t) => set(a.key, t)}
            placeholder={a.placeholder || 'min-max'}
            placeholderTextColor={PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
        );
      case 'number':
        return (
          <TextInput
            style={styles.input}
            value={values[a.key] ?? ''}
            onChangeText={(t) => set(a.key, t)}
            placeholder={a.placeholder || ''}
            placeholderTextColor={PLACEHOLDER}
            keyboardType="decimal-pad"
          />
        );
      default:
        return (
          <TextInput
            style={styles.input}
            value={values[a.key] ?? ''}
            onChangeText={(t) => set(a.key, t)}
            placeholder={a.placeholder || ''}
            placeholderTextColor={PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
          />
        );
    }
  };

  const pickerAttr = pickerKey ? schema.attributes.find((a) => a.key === pickerKey) : null;
  const pickerList = pickerAttr ? (options[pickerAttr.key] || pickerAttr.options || []) : [];

  return (
    <View style={styles.form}>
      {schema.textSearch.enabled && (
        <View style={styles.fieldFull}>
          <Text style={styles.label}>{schema.textSearch.label}</Text>
          <View style={styles.textSearchWrap}>
            <Search size={16} color={PLACEHOLDER} style={styles.textSearchIcon} />
            <TextInput
              style={[styles.input, styles.textSearchInput]}
              value={values.q ?? ''}
              onChangeText={(t) => set('q', t)}
              placeholder={schema.textSearch.placeholder}
              placeholderTextColor={PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => { if (canSubmit && !loading) onSubmit?.(values); }}
            />
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {schema.attributes.map((a) => {
          const full = a.type === 'select' && schema.attributes.length > 3 && a.required;
          return (
            <View key={a.key} style={full ? styles.fieldFull : styles.fieldHalf}>
              <Text style={styles.label} numberOfLines={1}>{labelFor(a)}</Text>
              {renderAttribute(a)}
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || loading) && styles.disabled]}
        disabled={!canSubmit || loading}
        onPress={() => onSubmit?.(values)}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={18} color="#fff" />}
        <Text style={styles.submitText}>Buscar</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={!!pickerAttr} transparent animationType="fade" onRequestClose={() => setPickerKey(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerKey(null)}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerAttr?.label}</Text>
              <TouchableOpacity onPress={() => setPickerKey(null)} style={styles.pickerClose}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ value: '', label: pickerAttr?.placeholder || `Seleccionar ${pickerAttr?.label?.toLowerCase() || ''}` }, ...pickerList]}
              keyExtractor={(o, i) => `${o.value}-${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = String(item.value) === String(values[pickerAttr?.key] ?? '');
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => { set(pickerAttr.key, String(item.value)); setPickerKey(null); }}
                  >
                    <Text style={[styles.pickerItemText, item.value === '' && styles.selectPlaceholder]} numberOfLines={2}>{item.label}</Text>
                    {active && <Check size={16} color={ACCENT} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.pickerEmpty}>Sin opciones</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  fieldFull: {
    width: '100%',
  },
  fieldHalf: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: theme.colors.surface,
    color: '#fff',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textSearchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  textSearchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  textSearchInput: {
    paddingLeft: 36,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  selectText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  selectPlaceholder: {
    color: PLACEHOLDER,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#3b82f6',
    height: 40,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '70%',
    paddingBottom: theme.spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  pickerTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerClose: {
    padding: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  pickerItemActive: {
    backgroundColor: theme.colors.surface,
  },
  pickerItemText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
  },
  pickerEmpty: {
    color: PLACEHOLDER,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: theme.spacing.lg,
  },
});

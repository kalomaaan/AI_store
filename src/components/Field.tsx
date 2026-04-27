import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, font } from '@/theme/colors';

type Props = TextInputProps & { label?: string; hint?: string; error?: string };

export function Field({ label, hint, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textDim}
        style={[styles.input, !!error && styles.inputErr, style as any]}
        {...rest}
      />
      {!!hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {!!error && <Text style={styles.err}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    color: colors.textDim,
    fontSize: font.sm,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputErr: { borderColor: colors.danger },
  hint: { color: colors.textDim, fontSize: font.sm, marginTop: 4 },
  err: { color: colors.danger, fontSize: font.sm, marginTop: 4 },
});

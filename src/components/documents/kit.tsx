import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';

/**
 * Piezas compartidas de los PDF.
 *
 * Tipografía: Helvetica, que `@react-pdf/renderer` trae incorporada. Registrar
 * la fuente de la marca obligaría a descargarla en cada arranque en frío de la
 * función serverless: un PDF que tarda dos segundos más —o que falla si el
 * CDN no responde— a cambio de un detalle que el cliente no va a notar en un
 * papel impreso.
 *
 * Los colores se repiten aquí en vez de leerse de `globals.css` porque el PDF
 * no tiene CSS. Si cambian los tokens, hay que cambiarlos aquí también: es
 * duplicación consciente y está anotada.
 */

export const COLOR = {
  ink: '#0F172A',
  muted: '#475569',
  subtle: '#64748B',
  line: '#E2E8F0',
  brand: '#146EF5',
  graphite: '#101820',
  ok: '#15803D',
  crit: '#B91C1C',
  warn: '#B45309',
  sunken: '#F5F7FA',
} as const;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 52,
    paddingHorizontal: 38,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: COLOR.ink,
    lineHeight: 1.45,
  },
  brandBar: {
    backgroundColor: COLOR.graphite,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandName: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Helvetica-Bold', letterSpacing: 0.6 },
  brandTag: { color: '#94A3B8', fontSize: 7.5, marginTop: 1 },
  docTitle: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  docCode: { color: '#94A3B8', fontSize: 8, marginTop: 1, textAlign: 'right' },

  h2: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  muted: { color: COLOR.muted },
  subtle: { color: COLOR.subtle, fontSize: 8 },

  card: {
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },

  th: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLOR.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  td: { fontSize: 8.5 },
  trHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
    paddingBottom: 4,
    marginBottom: 2,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.line,
    paddingVertical: 5,
  },

  footer: {
    position: 'absolute',
    bottom: 22,
    left: 38,
    right: 38,
    borderTopWidth: 1,
    borderTopColor: COLOR.line,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: COLOR.subtle },
});

export function Brand({ title, code }: { readonly title: string; readonly code?: string }) {
  return (
    <View style={styles.brandBar} fixed>
      <View>
        <Text style={styles.brandName}>ROMERO MOTORS</Text>
        <Text style={styles.brandTag}>Taller inteligente</Text>
      </View>
      <View>
        <Text style={styles.docTitle}>{title}</Text>
        {code !== undefined && <Text style={styles.docCode}>{code}</Text>}
      </View>
    </View>
  );
}

/**
 * Pie con numeración real.
 *
 * «Página 2 de 5» exige saber el total, que `@react-pdf/renderer` solo conoce
 * tras maquetar: por eso se resuelve con la función de `render`, no con una
 * variable. Sin el total, una hoja suelta no dice si falta algo detrás — y en
 * un acta de entrega eso importa.
 */
export function Footer({ note }: { readonly note: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{note}</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

export function Sheet({
  title,
  code,
  footerNote,
  children,
}: {
  readonly title: string;
  readonly code?: string;
  readonly footerNote: string;
  readonly children: ReactNode;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <Brand title={title} code={code} />
      {children}
      <Footer note={footerNote} />
    </Page>
  );
}

export function Field({
  label,
  value,
  width = '25%',
}: {
  readonly label: string;
  readonly value: string;
  readonly width?: string;
}) {
  return (
    <View style={{ width }}>
      <Text style={styles.subtle}>{label}</Text>
      <Text style={{ fontSize: 9, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

export function Money({
  value,
  bold = false,
}: {
  readonly value: string;
  readonly bold?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: bold ? 10 : 8.5,
        fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica',
        textAlign: 'right',
      }}
    >
      {value}
    </Text>
  );
}

export { Document, Page, Text, View };

/**
 * ITP Reminder Email Template
 * React Email component for ITP expiration reminders
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ITPReminderEmailProps {
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export function ITPReminderEmail({
  plate,
  expiryDate,
  daysUntilExpiry,
}: ITPReminderEmailProps) {
  const isUrgent = daysUntilExpiry <= 3;
  const formattedDate = new Date(expiryDate).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Html>
      <Head />
      <Preview>
        {`ITP pentru ${plate} expiră în ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'zi' : 'zile'}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>uitdeITP.ro</Heading>
            <Text style={tagline}>Reminder ITP</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {isUrgent && (
              <div style={urgentBanner}>
                <Text style={urgentText}>⚠️ ATENȚIE: Expirare iminentă!</Text>
              </div>
            )}

            <Heading style={h2}>
              ITP pentru {plate} expiră {daysUntilExpiry === 1 ? 'MÂINE' : `în ${daysUntilExpiry} zile`}
            </Heading>

            <Text style={paragraph}>
              Bună ziua,
            </Text>

            <Text style={paragraph}>
              Aceasta este o notificare automată că inspecția tehnică periodică (ITP) pentru
              vehiculul cu numărul de înmatriculare <strong>{plate}</strong> va expira pe data
              de <strong>{formattedDate}</strong>.
            </Text>

            {isUrgent ? (
              <Text style={{...paragraph, ...urgentInfo}}>
                <strong>Este important să programezi inspecția cât mai curând posibil!</strong>
                Circulația cu ITP expirat este sancționată conform legislației rutiere în vigoare.
              </Text>
            ) : (
              <Text style={paragraph}>
                Recomandăm să programezi inspecția cât mai curând pentru a evita expirarea și
                eventualele sancțiuni.
              </Text>
            )}

            {/* Call to Action */}
            <Section style={buttonContainer}>
              <Button
                style={button}
                href="https://uitdeitp.ro/dashboard"
              >
                Vizualizează Detalii
              </Button>
            </Section>

            {/* Info Box */}
            <Section style={infoBox}>
              <Text style={infoTitle}>📋 Informații Utile:</Text>
              <Text style={infoItem}>• ITP-ul poate fi efectuat cu până la 90 de zile înainte de expirare</Text>
              <Text style={infoItem}>• Durata medie a inspecției: 30-60 minute</Text>
              <Text style={infoItem}>• Documentele necesare: CI/Buletin, Certificat de înmatriculare</Text>
              <Text style={infoItem}>• Cost estimativ: 100-200 RON (în funcție de tipul vehiculului)</Text>
            </Section>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Acest email a fost trimis automat de platforma <strong>uitdeITP.ro</strong>
            </Text>
            <Text style={footerText}>
              Pentru a gestiona notificările tale, vizitează{' '}
              <a href="https://uitdeitp.ro/dashboard/settings" style={link}>
                Setările Contului
              </a>
            </Text>
            <Text style={footerText}>
              Nu dorești să primești aceste notificări?{' '}
              <a href="https://uitdeitp.ro/unsubscribe" style={link}>
                Dezabonare
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Default props for preview
ITPReminderEmail.PreviewProps = {
  plate: 'B-123-ABC',
  expiryDate: '2025-12-31',
  daysUntilExpiry: 7,
} as ITPReminderEmailProps;

export default ITPReminderEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#3B82F6',
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const tagline = {
  color: '#E0F2FE',
  fontSize: '14px',
  margin: '8px 0 0 0',
  padding: '0',
};

const content = {
  padding: '0 40px',
};

const urgentBanner = {
  backgroundColor: '#FEE2E2',
  border: '2px solid #DC2626',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '32px',
  marginBottom: '24px',
};

const urgentText = {
  color: '#991B1B',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '32px 0 24px',
  padding: '0',
};

const paragraph = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const urgentInfo = {
  backgroundColor: '#FEF3C7',
  borderLeft: '4px solid #F59E0B',
  padding: '12px 16px',
  borderRadius: '4px',
};

const buttonContainer = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#3B82F6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const infoBox = {
  backgroundColor: '#F1F5F9',
  border: '1px solid #CBD5E1',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '32px',
};

const infoTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 12px 0',
};

const infoItem = {
  fontSize: '14px',
  color: '#475569',
  margin: '8px 0',
  lineHeight: '20px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  padding: '0 40px',
};

const footerText = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '8px 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#3B82F6',
  textDecoration: 'underline',
};

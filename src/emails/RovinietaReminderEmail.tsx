/**
 * Rovinieta Reminder Email Template
 * React Email component for Rovinieta expiration reminders
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

interface RovinietaReminderEmailProps {
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

export function RovinietaReminderEmail({
  plate,
  expiryDate,
  daysUntilExpiry,
}: RovinietaReminderEmailProps) {
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
        {`Rovinieta pentru ${plate} expiră în ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'zi' : 'zile'}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>uitdeITP.ro</Heading>
            <Text style={tagline}>Reminder Rovinieta</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {isUrgent && (
              <div style={urgentBanner}>
                <Text style={urgentText}>⚠️ ATENȚIE: Expirare iminentă!</Text>
              </div>
            )}

            <Heading style={h2}>
              Rovinieta pentru {plate} expiră {daysUntilExpiry === 1 ? 'MÂINE' : `în ${daysUntilExpiry} zile`}
            </Heading>

            <Text style={paragraph}>
              Bună ziua,
            </Text>

            <Text style={paragraph}>
              Aceasta este o notificare automată că taxa de drum (Rovinieta) pentru vehiculul cu
              numărul de înmatriculare <strong>{plate}</strong> va expira pe data de{' '}
              <strong>{formattedDate}</strong>.
            </Text>

            {isUrgent ? (
              <Text style={{...paragraph, ...urgentInfo}}>
                <strong>Este obligatoriu să achiziționezi o nouă Rovinieta înainte de expirare!</strong>
                Circulația fără Rovinieta validă este interzisă și se sancționează conform
                legislației în vigoare.
              </Text>
            ) : (
              <Text style={paragraph}>
                Recomandăm să achiziționezi o nouă Rovinieta cât mai curând pentru a evita expirarea
                și eventualele sancțiuni.
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
              <Text style={infoItem}>
                • Rovinieta se poate achiziționa online pe{' '}
                <a href="https://www.roviniete.ro" style={link}>
                  www.roviniete.ro
                </a>
              </Text>
              <Text style={infoItem}>• Disponibilă și la benzinării și centre autorizate</Text>
              <Text style={infoItem}>• Opțiuni: 7 zile, 30 zile, 90 zile sau 1 an</Text>
              <Text style={infoItem}>• Verificare validitate: SMS la 7623 cu textul "RO [nr. înmatriculare]"</Text>
              <Text style={infoItem}>• Amenda pentru lipsă Rovinieta: 1000-4000 RON</Text>
            </Section>

            {/* Pricing Section */}
            <Section style={pricingBox}>
              <Text style={pricingTitle}>💰 Prețuri Orientative (2025):</Text>
              <Text style={pricingItem}>
                <strong>Auto (până la 3.5t):</strong>
              </Text>
              <Text style={pricingSubItem}>• 7 zile: ~15 RON</Text>
              <Text style={pricingSubItem}>• 30 zile: ~40 RON</Text>
              <Text style={pricingSubItem}>• 90 zile: ~90 RON</Text>
              <Text style={pricingSubItem}>• 1 an: ~160 RON</Text>
            </Section>

            {/* Tips Section */}
            <Section style={tipsBox}>
              <Text style={tipsTitle}>💡 Sfaturi:</Text>
              <Text style={paragraph}>
                • Achiziționează Rovinieta anuală pentru a economisi ~40% față de lunară
              </Text>
              <Text style={paragraph}>
                • Păstrează dovada plății (e-mail sau SMS) până la validarea în sistem
              </Text>
              <Text style={paragraph}>
                • Verifică validitatea cu 1 zi înainte de călătorie pentru siguranță
              </Text>
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
RovinietaReminderEmail.PreviewProps = {
  plate: 'B-123-ABC',
  expiryDate: '2025-12-31',
  daysUntilExpiry: 7,
} as RovinietaReminderEmailProps;

export default RovinietaReminderEmail;

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
  backgroundColor: '#8B5CF6',
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
  color: '#EDE9FE',
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
  backgroundColor: '#8B5CF6',
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

const pricingBox = {
  backgroundColor: '#F0FDF4',
  border: '1px solid #BBF7D0',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '24px',
};

const pricingTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 12px 0',
};

const pricingItem = {
  fontSize: '14px',
  color: '#1e293b',
  margin: '12px 0 4px 0',
  fontWeight: '600' as const,
};

const pricingSubItem = {
  fontSize: '14px',
  color: '#475569',
  margin: '4px 0 4px 16px',
  lineHeight: '20px',
};

const tipsBox = {
  backgroundColor: '#EFF6FF',
  border: '1px solid #BFDBFE',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '24px',
};

const tipsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 12px 0',
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
  color: '#8B5CF6',
  textDecoration: 'underline',
};

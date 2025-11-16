'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Info } from 'lucide-react';

interface NotificationTemplateEditorProps {
  smsTemplate5d: string;
  smsTemplate3d: string;
  smsTemplate1d: string;
  emailTemplate5d: string;
  emailTemplate3d: string;
  emailTemplate1d: string;
  stationName: string;
  stationPhone: string;
  stationAddress: string;
  onSave: (templates: {
    sms_template_5d: string;
    sms_template_3d: string;
    sms_template_1d: string;
    email_template_5d: string;
    email_template_3d: string;
    email_template_1d: string;
  }) => Promise<void>;
}

const PLACEHOLDERS = [
  { key: '{name}', description: 'Numele clientului' },
  { key: '{plate}', description: 'Numărul de înmatriculare' },
  { key: '{date}', description: 'Data expirării (format: 15 Dec 2025)' },
  { key: '{station_name}', description: 'Numele stației tale' },
  { key: '{station_phone}', description: 'Telefonul stației' },
  { key: '{station_address}', description: 'Adresa stației' },
  { key: '{app_url}', description: 'Link către aplicație' },
  { key: '{opt_out_link}', description: 'Link de dezabonare (GDPR)' },
];

const SAMPLE_DATA = {
  name: 'Ion Popescu',
  plate: 'B123ABC',
  date: '20 Dec 2025',
  station_name: 'Auto Service Demo',
  station_phone: '+40712345678',
  station_address: 'Str. Exemplu Nr. 123, București',
  app_url: 'https://uitdeitp.ro',
  opt_out_link: 'https://uitdeitp.ro/opt-out/xxx',
};

function renderPreview(template: string, stationName: string, stationPhone: string, stationAddress: string): string {
  return template
    .replace(/{name}/g, SAMPLE_DATA.name)
    .replace(/{plate}/g, SAMPLE_DATA.plate)
    .replace(/{date}/g, SAMPLE_DATA.date)
    .replace(/{station_name}/g, stationName || SAMPLE_DATA.station_name)
    .replace(/{station_phone}/g, stationPhone || SAMPLE_DATA.station_phone)
    .replace(/{station_address}/g, stationAddress || SAMPLE_DATA.station_address)
    .replace(/{app_url}/g, SAMPLE_DATA.app_url)
    .replace(/{opt_out_link}/g, SAMPLE_DATA.opt_out_link);
}

export function NotificationTemplateEditor({
  smsTemplate5d,
  smsTemplate3d,
  smsTemplate1d,
  emailTemplate5d,
  emailTemplate3d,
  emailTemplate1d,
  stationName,
  stationPhone,
  stationAddress,
  onSave,
}: NotificationTemplateEditorProps) {
  // SMS templates state
  const [sms5d, setSms5d] = useState(smsTemplate5d);
  const [sms3d, setSms3d] = useState(smsTemplate3d);
  const [sms1d, setSms1d] = useState(smsTemplate1d);

  // Email templates state
  const [email5d, setEmail5d] = useState(emailTemplate5d);
  const [email3d, setEmail3d] = useState(emailTemplate3d);
  const [email1d, setEmail1d] = useState(emailTemplate1d);

  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        sms_template_5d: sms5d,
        sms_template_3d: sms3d,
        sms_template_1d: sms1d,
        email_template_5d: email5d,
        email_template_3d: email3d,
        email_template_1d: email1d,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    sms5d !== smsTemplate5d ||
    sms3d !== smsTemplate3d ||
    sms1d !== smsTemplate1d ||
    email5d !== emailTemplate5d ||
    email3d !== emailTemplate3d ||
    email1d !== emailTemplate1d;

  return (
    <div className="space-y-6">
      {/* Placeholders Guide */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Variabile disponibile:</strong>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {PLACEHOLDERS.map((p) => (
              <div key={p.key}>
                <code className="bg-muted px-1 rounded">{p.key}</code> - {p.description}
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="sms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sms">Template-uri SMS</TabsTrigger>
          <TabsTrigger value="email">Template-uri Email</TabsTrigger>
        </TabsList>

        {/* SMS Templates */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS - 5 zile înainte</CardTitle>
              <CardDescription>
                Mesaj trimis cu 5 zile înainte de expirare (reminder informativ)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sms-5d">Template SMS</Label>
                <Textarea
                  id="sms-5d"
                  value={sms5d}
                  onChange={(e) => setSms5d(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder="Ex: Salut {name}, ITP pentru {plate}..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Caractere: {sms5d.length} / 160 (1 SMS = 160 caractere)
                </p>
              </div>
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(sms5d, stationName, stationPhone, stationAddress)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS - 3 zile înainte</CardTitle>
              <CardDescription>
                Mesaj trimis cu 3 zile înainte de expirare (reminder urgent)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sms-3d">Template SMS</Label>
                <Textarea
                  id="sms-3d"
                  value={sms3d}
                  onChange={(e) => setSms3d(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder="Ex: ATENȚIE {name}, ITP {plate} expiră în 3 zile..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Caractere: {sms3d.length} / 160
                </p>
              </div>
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(sms3d, stationName, stationPhone, stationAddress)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS - 1 zi înainte</CardTitle>
              <CardDescription>
                Mesaj trimis cu o zi înainte de expirare (reminder critic)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sms-1d">Template SMS</Label>
                <Textarea
                  id="sms-1d"
                  value={sms1d}
                  onChange={(e) => setSms1d(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder="Ex: URGENT {name}, ITP {plate} expiră MÂINE..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Caractere: {sms1d.length} / 160
                </p>
              </div>
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(sms1d, stationName, stationPhone, stationAddress)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email - 5 zile înainte</CardTitle>
              <CardDescription>
                Email trimis cu 5 zile înainte de expirare (reminder informativ)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-5d">Template Email</Label>
                <Textarea
                  id="email-5d"
                  value={email5d}
                  onChange={(e) => setEmail5d(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Ex: Bună {name},&#10;&#10;ITP pentru {plate}..."
                />
              </div>
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(email5d, stationName, stationPhone, stationAddress)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email - 3 zile înainte</CardTitle>
              <CardDescription>
                Email trimis cu 3 zile înainte de expirare (reminder urgent)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-3d">Template Email</Label>
                <Textarea
                  id="email-3d"
                  value={email3d}
                  onChange={(e) => setEmail3d(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Ex: ATENȚIE {name},&#10;&#10;ITP {plate} expiră în 3 zile..."
                />
              </div>
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(email3d, stationName, stationPhone, stationAddress)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email - 1 zi înainte</CardTitle>
              <CardDescription>
                Email trimis cu o zi înainte de expirare (reminder critic)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-1d">Template Email</Label>
                <Textarea
                  id="email-1d"
                  value={email1d}
                  onChange={(e) => setEmail1d(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Ex: URGENT {name},&#10;&#10;ITP {plate} expiră MÂINE..."
                />
              </div>
              {showPreview && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {renderPreview(email1d, stationName, stationPhone, stationAddress)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="mr-2 h-4 w-4" />
          {showPreview ? 'Ascunde' : 'Arată'} Preview
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Se salvează...' : 'Salvează Template-uri'}
        </Button>
      </div>
    </div>
  );
}

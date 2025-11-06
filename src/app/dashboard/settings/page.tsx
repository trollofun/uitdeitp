'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ProfileTab } from '@/components/dashboard/settings/ProfileTab';
import { NotificationsTab } from '@/components/dashboard/settings/NotificationsTab';
import { SecurityTab } from '@/components/dashboard/settings/SecurityTab';
import { AccountTab } from '@/components/dashboard/settings/AccountTab';
import { User, Bell, Shield, UserX } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Desktop: Tabs, Mobile: Accordion
  if (isMobile) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-2">Setări</h1>
        <p className="text-muted-foreground mb-6">
          Gestionează-ți profilul, notificările și securitatea
        </p>

        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="profile" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="font-semibold">Profil</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4">
              <ProfileTab />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notifications" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <span className="font-semibold">Notificări</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4">
              <NotificationsTab />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="security" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Securitate</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4">
              <SecurityTab />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="account" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                <span className="font-semibold">Cont</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4">
              <AccountTab />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }

  // Desktop view with tabs
  return (
    <div className="container max-w-6xl py-8">
      <h1 className="text-3xl font-bold mb-2">Setări</h1>
      <p className="text-muted-foreground mb-6">
        Gestionează-ți profilul, notificările și securitatea
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificări</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Securitate</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserX className="h-4 w-4" />
            <span className="hidden sm:inline">Cont</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

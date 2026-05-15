import Link from "next/link";
import {
  User as UserIcon,
  Building2,
  Palette,
  Bell,
  History,
  Settings as SettingsIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AyarlarNav } from "./_nav";

export default function AyarlarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={<SettingsIcon size={20} />}
        title="Ayarlar"
        subtitle="Hesap, şirket bilgileri, görünüm ve bildirim tercihleri"
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <AyarlarNav />
        <div>{children}</div>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Field, Label, Select, TextInput } from "@/components/ui/form-field";
import { SectionCard } from "../profil-form";
import { updateBildirim } from "../actions";

interface Props {
  initial: {
    emailBildirim: boolean;
    pushBildirim: boolean;
    vadeUyariGun: number;
    defaultKdvOrani: number;
    defaultParaBirimi: string;
    defaultVadeGun: number;
  };
}

export function BildirimForm({ initial }: Props) {
  const [pending, start] = useTransition();
  async function submit(formData: FormData) {
    const r = await updateBildirim(formData);
    if (r.ok) toast.success("Bildirim tercihleri kaydedildi");
    else toast.error(r.error);
  }

  return (
    <form action={(fd) => start(() => void submit(fd))} className="space-y-6">
      <SectionCard
        title="Bildirimler"
        description="Vade hatırlatıcıları ve aktivite uyarıları"
      >
        <div className="space-y-3">
          <ToggleRow
            id="emailBildirim"
            label="E-posta Bildirimleri"
            description="Vade yaklaşan kayıtlar için e-posta uyarısı"
            defaultChecked={initial.emailBildirim}
          />
          <ToggleRow
            id="pushBildirim"
            label="Push Bildirimleri"
            description="Tarayıcı/PWA üzerinden anlık bildirim (ileride aktif olacak)"
            defaultChecked={initial.pushBildirim}
            disabled
          />
          <div
            className="border-t pt-4"
            style={{ borderColor: "var(--border)" }}
          >
            <Field>
              <Label
                htmlFor="vadeUyariGun"
                hint="kaç gün önceden uyarılayım?"
              >
                Vade Uyarı Süresi
              </Label>
              <Select
                id="vadeUyariGun"
                name="vadeUyariGun"
                defaultValue={initial.vadeUyariGun}
              >
                <option value="0">Vadesi geldiği gün</option>
                <option value="1">1 gün önceden</option>
                <option value="3">3 gün önceden</option>
                <option value="7">1 hafta önceden</option>
                <option value="14">2 hafta önceden</option>
              </Select>
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Varsayılan Değerler"
        description="Yeni kayıt ekrarken otomatik doldurulan alanlar"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <Label htmlFor="defaultKdvOrani" hint="%">
              KDV Oranı
            </Label>
            <Select
              id="defaultKdvOrani"
              name="defaultKdvOrani"
              defaultValue={initial.defaultKdvOrani}
            >
              <option value="0">0% (KDV'siz)</option>
              <option value="1">1%</option>
              <option value="10">10%</option>
              <option value="20">20%</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="defaultParaBirimi">Para Birimi</Label>
            <Select
              id="defaultParaBirimi"
              name="defaultParaBirimi"
              defaultValue={initial.defaultParaBirimi}
            >
              <option value="TRY">₺ TRY — Türk Lirası</option>
              <option value="USD">$ USD — Amerikan Doları</option>
              <option value="EUR">€ EUR — Euro</option>
              <option value="GBP">£ GBP — Sterlin</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="defaultVadeGun" hint="gün">
              Vade Süresi
            </Label>
            <TextInput
              id="defaultVadeGun"
              name="defaultVadeGun"
              type="number"
              min="0"
              max="365"
              defaultValue={initial.defaultVadeGun}
            />
          </Field>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" isDisabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

function ToggleRow({
  id,
  label,
  description,
  defaultChecked,
  disabled = false,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-colors ${
        disabled ? "opacity-60" : ""
      }`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-strong)",
      }}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {description}
        </div>
      </div>
      <input
        type="checkbox"
        id={id}
        name={id}
        value="true"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-4 cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
    </label>
  );
}

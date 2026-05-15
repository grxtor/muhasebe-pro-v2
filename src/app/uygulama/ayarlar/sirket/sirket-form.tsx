"use client";

import { useTransition } from "react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { Field, Label, TextArea, TextInput } from "@/components/ui/form-field";
import { SectionCard } from "../profil-form";
import { updateSirketBilgisi } from "../actions";

interface Initial {
  sirketAdi: string;
  vergiNo: string;
  vergiDairesi: string;
  tcKimlikNo: string;
  adres: string;
  sehir: string;
  ulke: string;
  telefon: string;
  email: string;
  website: string;
  iban: string;
  bankaAdi: string;
  logoUrl: string;
}

export function SirketForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  async function submit(formData: FormData) {
    const r = await updateSirketBilgisi(formData);
    if (r.ok) toast.success("Şirket bilgileri kaydedildi");
    else toast.error(r.error);
  }

  return (
    <form action={(fd) => start(() => void submit(fd))} className="space-y-6">
      <SectionCard
        title="Şirket Kimliği"
        description="Faturalarda, dekontlarda ve raporlarda görünür"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="sirketAdi">Şirket / Ad Soyad</Label>
            <TextInput
              id="sirketAdi"
              name="sirketAdi"
              defaultValue={initial.sirketAdi}
              placeholder="Örnek Yazılım Ltd. Şti."
            />
          </Field>
          <Field>
            <Label htmlFor="vergiNo">Vergi No</Label>
            <TextInput
              id="vergiNo"
              name="vergiNo"
              defaultValue={initial.vergiNo}
              placeholder="1234567890"
            />
          </Field>
          <Field>
            <Label htmlFor="vergiDairesi">Vergi Dairesi</Label>
            <TextInput
              id="vergiDairesi"
              name="vergiDairesi"
              defaultValue={initial.vergiDairesi}
            />
          </Field>
          <Field>
            <Label htmlFor="tcKimlikNo">T.C. Kimlik (şahıs şirketi için)</Label>
            <TextInput
              id="tcKimlikNo"
              name="tcKimlikNo"
              defaultValue={initial.tcKimlikNo}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="İletişim" description="Şirket adresi ve iletişim">
        <div className="space-y-4">
          <Field>
            <Label htmlFor="adres">Adres</Label>
            <TextArea
              id="adres"
              name="adres"
              rows={2}
              defaultValue={initial.adres}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <Label htmlFor="sehir">Şehir</Label>
              <TextInput
                id="sehir"
                name="sehir"
                defaultValue={initial.sehir}
              />
            </Field>
            <Field>
              <Label htmlFor="ulke">Ülke</Label>
              <TextInput id="ulke" name="ulke" defaultValue={initial.ulke} />
            </Field>
            <Field>
              <Label htmlFor="telefon">Telefon</Label>
              <TextInput
                id="telefon"
                name="telefon"
                defaultValue={initial.telefon}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="email">E-posta</Label>
              <TextInput
                id="email"
                name="email"
                type="email"
                defaultValue={initial.email}
              />
            </Field>
            <Field>
              <Label htmlFor="website">Web sitesi</Label>
              <TextInput
                id="website"
                name="website"
                defaultValue={initial.website}
                placeholder="https://"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Banka Bilgileri"
        description="Faturalarda IBAN otomatik basılır"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="bankaAdi">Banka Adı</Label>
            <TextInput
              id="bankaAdi"
              name="bankaAdi"
              defaultValue={initial.bankaAdi}
            />
          </Field>
          <Field>
            <Label htmlFor="iban">IBAN</Label>
            <TextInput
              id="iban"
              name="iban"
              defaultValue={initial.iban}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Logo"
        description="Faturalarda sol üstte görünür"
      >
        <Field>
          <Label htmlFor="logoUrl" hint="opsiyonel">
            Logo URL'i
          </Label>
          <TextInput
            id="logoUrl"
            name="logoUrl"
            defaultValue={initial.logoUrl}
            placeholder="https://cdn.firma.com/logo.png"
          />
        </Field>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="md" isDisabled={pending}>
          {pending ? "Kaydediliyor…" : "Tüm Bilgileri Kaydet"}
        </Button>
      </div>
    </form>
  );
}

import { getRequestConfig } from "next-intl/server";

/**
 * next-intl yapılandırması.
 *
 * Şimdilik sadece TR aktif; altyapı kurulu olduğu için EN eklemek
 * gelecekte sadece `messages/en.json` + locale routing ayarı eklemekle olur.
 */
export default getRequestConfig(async () => {
  const locale = "tr";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Europe/Istanbul",
    now: new Date(),
  };
});

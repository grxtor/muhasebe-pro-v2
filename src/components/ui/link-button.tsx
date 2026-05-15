import Link, { type LinkProps } from "next/link";
import { buttonVariants, type ButtonVariants } from "@heroui/styles";
import type { ComponentProps } from "react";

type AnchorProps = Omit<ComponentProps<"a">, keyof LinkProps>;

interface LinkButtonProps extends LinkProps, AnchorProps, ButtonVariants {
  children: React.ReactNode;
}

/**
 * Next.js Link + HeroUI button stilleri.
 *
 * HeroUI v3'te `<Button>` bir `<button>` öğesi render eder, içine `<a>` koymak
 * geçersiz HTML olur. Client-side gezinmeli butonlar için bu bileşeni kullan.
 *
 * NOT: `@heroui/react`'tan import yapmıyoruz çünkü o "client-only" işaretli.
 * Sadece `@heroui/styles`'tan stil util'lerini alıyoruz — bunlar pure CSS.
 */
export function LinkButton({
  variant,
  size,
  fullWidth,
  isIconOnly,
  className,
  children,
  ...linkProps
}: LinkButtonProps) {
  const classes = [
    buttonVariants({ variant, size, fullWidth, isIconOnly }),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link {...linkProps} className={classes}>
      {children}
    </Link>
  );
}

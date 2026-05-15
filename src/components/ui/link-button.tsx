import Link, { type LinkProps } from "next/link";
import { buttonVariants, type ButtonVariants } from "@heroui/styles";
import { cn } from "@heroui/react";
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
  return (
    <Link
      {...linkProps}
      className={cn(
        buttonVariants({ variant, size, fullWidth, isIconOnly }),
        className,
      )}
    >
      {children}
    </Link>
  );
}

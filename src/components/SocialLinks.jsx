import { FacebookIcon, InstagramIcon, TelegramIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { SOCIALS } from "@/data";

const items = [
  { key: "telegram", href: SOCIALS.telegram, label: "Telegram", Icon: TelegramIcon },
  { key: "instagram", href: SOCIALS.instagram, label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", href: SOCIALS.facebook, label: "Facebook", Icon: FacebookIcon },
];

export default function SocialLinks({ className = "" }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {items.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-brand-700"
        >
          <Icon width={20} height={20} />
        </a>
      ))}
    </div>
  );
}

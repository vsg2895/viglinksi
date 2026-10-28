/**
 * The leading mark on a menu child: the category's own icon, or a quiet dot
 * when it has none.
 *
 * One component for the header dropdown and the footer group, so the two
 * cannot drift apart — and so they match the category chips, which show the
 * very same icons.
 *
 * `icon` arrives ALREADY RESOLVED to a full URL. The layout resolves it on the
 * server, which keeps storage configuration out of client components.
 *
 * A plain <img>, not next/image, for the same reason as the chips: the
 * optimizer refuses SVG unless `dangerouslyAllowSVG` is enabled, and an SVG
 * gains nothing from resizing. alt="" because the label beside it already names
 * the category; announcing it twice is noise.
 *
 * No filter or opacity on the image: the icons are gradient tiles that carry
 * their own background, so they read on light and dark themes alike.
 */
export default function MenuItemIcon({ icon }: { icon?: string | null }) {
  if (icon) {
    return <img src={icon} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" aria-hidden />
  }

  // bg-current, so the dot follows the label's colour on hover without a
  // second class that has to exist.
  return <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
}

// Маленький хелпер для умовного склеювання класів.
// cn("a", cond && "b", undefined, "c") -> "a b c"
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

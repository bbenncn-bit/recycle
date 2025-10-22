// 简化的 cn 工具函数，不依赖外部包
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}




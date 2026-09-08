/** 空函数 */
export function noop(): void {}

/** 是否为函数 */
export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function'
}

/** 是否为普通对象 */
export function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

/** 是否为数组 */
export function isArray(value: unknown): value is any[] {
  return Array.isArray(value)
}

/** 是否为 Promise 或类 Promise */
export function isPromiseLike(value: unknown): value is PromiseLike<any> {
  return !!value && (typeof value === 'object' || typeof value === 'function') && isFunction((value as any).then)
}

/** 是否为 null / undefined */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/** 是否为空值（用于联动判断依赖值是否为空） */
export function isEmptyValue(value: unknown): boolean {
  return isNil(value) || value === '' || (isArray(value) && value.length === 0)
}

/** 按点路径取值，如 getByPath(row, 'user.name')；路径为空返回 undefined */
export function getByPath(source: any, path?: string): any {
  if (!source || !path) return undefined
  if (!path.includes('.')) return source[path]
  const keys = path.split('.')
  let current: any = source
  for (const key of keys) {
    if (isNil(current)) return undefined
    current = current[key]
  }
  return current
}

/** 转数组：单值包一层，数组原样返回，空值返回空数组 */
export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (isNil(value)) return []
  return isArray(value) ? value : [value]
}

/** 解析「值或函数」形式：函数形式以给定参数调用 */
export function resolveValue<T>(value: T | ((...args: any[]) => T), ...args: any[]): T {
  return isFunction(value) ? value(...args) : value
}

/** 防抖：返回带 cancel 方法的防抖函数 */
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Parameters<T>): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }
  debounced.cancel = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return debounced as ((...args: Parameters<T>) => void) & { cancel: () => void }
}

/** 请求竞态序号：只有最新一次请求的结果会被采纳 */
export function createSeq() {
  let seq = 0
  return {
    /** 开启一次新请求，返回本次请求序号 */
    next: (): number => ++seq,
    /** 判断给定序号是否仍为最新请求 */
    isLatest: (s: number): boolean => s === seq
  }
}

/** localStorage 安全读写（SSR / 隐私模式兜底） */
export const storage = {
  get(key: string): any {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : undefined
    } catch {
      return undefined
    }
  },
  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 忽略：配额满或不可用 */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      /* 忽略 */
    }
  }
}

/** 生成简单自增 uid（列无 prop 时使用） */
let uidCounter = 0
export function genUid(prefix = 'col'): string {
  uidCounter += 1
  return `${prefix}_${uidCounter}`
}

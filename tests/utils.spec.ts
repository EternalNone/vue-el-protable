import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSeq,
  debounce,
  genUid,
  getByPath,
  isArray,
  isEmptyValue,
  isFunction,
  isNil,
  isPlainObject,
  isPromiseLike,
  noop,
  resolveValue,
  storage,
  toArray
} from '../src/utils'

describe('noop', () => {
  it('调用返回 undefined', () => {
    expect(noop()).toBeUndefined()
  })
})

describe('isFunction', () => {
  it('识别各种函数形态', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(async () => {})).toBe(true)
    expect(isFunction(function named() {})).toBe(true)
    expect(isFunction(class Foo {})).toBe(true)
    expect(isFunction(null)).toBe(false)
    expect(isFunction({})).toBe(false)
    expect(isFunction('fn')).toBe(false)
  })
})

describe('isPlainObject', () => {
  it('仅字面量对象为 true', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(new Date())).toBe(false)
  })
})

describe('isArray', () => {
  it('数组为 true，其余为 false', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 2])).toBe(true)
    expect(isArray('1,2')).toBe(false)
    expect(isArray({ length: 0 })).toBe(false)
  })
})

describe('isPromiseLike', () => {
  it('Promise 与类 Promise 为 true', () => {
    expect(isPromiseLike(Promise.resolve(1))).toBe(true)
    expect(isPromiseLike({ then: () => {} })).toBe(true)
    expect(isPromiseLike({})).toBe(false)
    expect(isPromiseLike(null)).toBe(false)
    expect(isPromiseLike('then')).toBe(false)
  })
})

describe('isNil', () => {
  it('仅 null / undefined 为 true', () => {
    expect(isNil(null)).toBe(true)
    expect(isNil(undefined)).toBe(true)
    expect(isNil(0)).toBe(false)
    expect(isNil('')).toBe(false)
    expect(isNil(false)).toBe(false)
  })
})

describe('isEmptyValue', () => {
  it('null / undefined / 空字符串 / 空数组视为空', () => {
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue(undefined)).toBe(true)
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue([])).toBe(true)
  })

  it('0、false、空白字符串、对象不视为空', () => {
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
    expect(isEmptyValue(' ')).toBe(false)
    expect(isEmptyValue({})).toBe(false)
  })
})

describe('getByPath', () => {
  it('点路径取嵌套值', () => {
    expect(getByPath({ user: { name: 'tom' } }, 'user.name')).toBe('tom')
    expect(getByPath({ a: { b: { c: 3 } } }, 'a.b.c')).toBe(3)
  })

  it('支持数组索引路径', () => {
    const source = { list: [{ name: 'a' }, { name: 'b' }] }
    expect(getByPath(source, 'list.1.name')).toBe('b')
    expect(getByPath(source, 'list.0')).toEqual({ name: 'a' })
  })

  it('单键路径直接取值', () => {
    expect(getByPath({ name: 'x' }, 'name')).toBe('x')
  })

  it('路径缺失返回 undefined', () => {
    expect(getByPath({ user: {} }, 'user.name')).toBeUndefined()
    expect(getByPath({ list: [] }, 'list.0.name')).toBeUndefined()
  })

  it('中间节点为 null 时返回 undefined', () => {
    expect(getByPath({ user: null }, 'user.name')).toBeUndefined()
  })

  it('source 或 path 为空返回 undefined', () => {
    expect(getByPath(null, 'a')).toBeUndefined()
    expect(getByPath({ a: 1 }, '')).toBeUndefined()
    expect(getByPath({ a: 1 })).toBeUndefined()
  })
})

describe('toArray', () => {
  it('单值包一层、数组原样返回、空值返回空数组', () => {
    expect(toArray(1)).toEqual([1])
    expect(toArray('a')).toEqual(['a'])
    const arr = [1, 2]
    expect(toArray(arr)).toBe(arr) // 数组原样返回（同一引用）
    expect(toArray(null)).toEqual([])
    expect(toArray(undefined)).toEqual([])
  })
})

describe('resolveValue', () => {
  it('普通值直接返回', () => {
    expect(resolveValue(5)).toBe(5)
    expect(resolveValue('s')).toBe('s')
    expect(resolveValue(undefined)).toBeUndefined()
  })

  it('函数形式以给定参数调用', () => {
    expect(resolveValue((a: number, b: number) => a + b, 1, 2)).toBe(3)
    const fn = vi.fn(() => 'r')
    expect(resolveValue(fn, 'arg')).toBe('r')
    expect(fn).toHaveBeenCalledWith('arg')
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('等待期内重复调用只执行一次，且取最后一次参数', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced(1)
    debounced(2)
    debounced(3)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
  })

  it('默认等待 300ms', () => {
    const fn = vi.fn()
    const debounced = debounce(fn)
    debounced()
    vi.advanceTimersByTime(299)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancel 阻止待执行的调用', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('createSeq', () => {
  it('next 从 1 开始递增', () => {
    const seq = createSeq()
    expect(seq.next()).toBe(1)
    expect(seq.next()).toBe(2)
    expect(seq.next()).toBe(3)
  })

  it('isLatest 仅对最新序号为 true', () => {
    const seq = createSeq()
    const first = seq.next()
    const second = seq.next()
    expect(seq.isLatest(first)).toBe(false)
    expect(seq.isLatest(second)).toBe(true)
    seq.next()
    expect(seq.isLatest(second)).toBe(false)
  })
})

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('set / get 序列化往返', () => {
    storage.set('k', { a: 1, b: [2, 3] })
    expect(storage.get('k')).toEqual({ a: 1, b: [2, 3] })
  })

  it('键不存在返回 undefined', () => {
    expect(storage.get('missing')).toBeUndefined()
  })

  it('存储内容不是合法 JSON 时返回 undefined', () => {
    localStorage.setItem('bad', '{oops')
    expect(storage.get('bad')).toBeUndefined()
  })

  it('remove 删除指定键', () => {
    storage.set('k', 1)
    storage.remove('k')
    expect(storage.get('k')).toBeUndefined()
  })
})

describe('genUid', () => {
  it('默认前缀 col 且序号递增', () => {
    const a = genUid()
    const b = genUid()
    expect(a).toMatch(/^col_\d+$/)
    expect(b).toMatch(/^col_\d+$/)
    expect(Number(b.split('_')[1])).toBe(Number(a.split('_')[1]) + 1)
  })

  it('支持自定义前缀', () => {
    expect(genUid('slot')).toMatch(/^slot_\d+$/)
  })
})

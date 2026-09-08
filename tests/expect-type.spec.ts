import { describe, expect, it } from 'vitest'
import { expectTypeOf } from 'expect-type'
import type { ColumnConfig } from '../src/ProTable/types/column'
import type { ProTableInstance } from '../src/ProTable/types/events'
import type { ProTableFieldNames, ProTableOptions } from '../src/ProTable/types/options'
import type { SearchConfig } from '../src/ProTable/types/search'

describe('ProTableOptions 类型契约', () => {
  it('api 签名：接收请求参数，返回 Promise', () => {
    expectTypeOf<NonNullable<ProTableOptions['api']>>().toEqualTypeOf<(params: any) => Promise<any>>()
  })

  it('beforeFetch 可返回 false 中断、可返回对象改写参数', () => {
    type BeforeFetch = NonNullable<ProTableOptions['beforeFetch']>
    expectTypeOf<Parameters<BeforeFetch>>().toEqualTypeOf<[any]>()
    expectTypeOf<false>().toMatchTypeOf<ReturnType<BeforeFetch>>()
    // 运行时赋值检查：返回 false 的写法合法
    const abortFetch: BeforeFetch = () => false
    expect(abortFetch({})).toBe(false)
  })

  it('fieldNames 结构：列表与总数两个可选点路径', () => {
    expectTypeOf<ProTableOptions['fieldNames']>().toEqualTypeOf<ProTableFieldNames | undefined>()
    expectTypeOf<ProTableFieldNames>().toEqualTypeOf<{ list?: string; total?: string }>()
  })

  it('paginationProps 结构：页码与条数参数名覆盖', () => {
    expectTypeOf<NonNullable<ProTableOptions['paginationProps']>>().toEqualTypeOf<{
      page?: string
      pageSize?: string
    }>()
  })

  it('afterFetch 对行数组做加工并返回行数组', () => {
    expectTypeOf<NonNullable<ProTableOptions['afterFetch']>>().toEqualTypeOf<
      (rows: Record<string, any>[]) => Record<string, any>[]
    >()
  })
})

describe('ColumnConfig 类型契约', () => {
  it('标题、排序、多级表头与隐藏字段类型', () => {
    expectTypeOf<ColumnConfig['label']>().toEqualTypeOf<string>()
    expectTypeOf<ColumnConfig['sortable']>().toEqualTypeOf<boolean | 'custom' | undefined>()
    expectTypeOf<ColumnConfig['children']>().toEqualTypeOf<ColumnConfig[] | undefined>()
    expectTypeOf<ColumnConfig['hidden']>().toEqualTypeOf<boolean | undefined>()
  })

  it('search 支持布尔开关或配置对象', () => {
    expectTypeOf<ColumnConfig['search']>().toEqualTypeOf<boolean | SearchConfig | undefined>()
    // 运行时赋值检查：两种形态均可赋
    const boolCol: ColumnConfig = { label: '姓名', search: true }
    const configCol: ColumnConfig = { label: '状态', search: { type: 'select' } }
    expect(boolCol.search).toBe(true)
    expect(configCol.search).toEqual({ type: 'select' })
  })
})

describe('SearchConfig 类型契约', () => {
  it('splitKeys 为起止两个参数名', () => {
    expectTypeOf<SearchConfig['splitKeys']>().toEqualTypeOf<{ start: string; end: string } | undefined>()
  })

  it('deps 为依赖字段键数组', () => {
    expectTypeOf<SearchConfig['deps']>().toEqualTypeOf<string[] | undefined>()
  })

  it('defaultValue 可为任意值', () => {
    expectTypeOf<SearchConfig['defaultValue']>().toEqualTypeOf<any>()
  })
})

describe('ProTableInstance 类型契约', () => {
  it('暴露全部实例方法', () => {
    expectTypeOf<ProTableInstance>().toHaveProperty('reload')
    expectTypeOf<ProTableInstance>().toHaveProperty('refresh')
    expectTypeOf<ProTableInstance>().toHaveProperty('getQuery')
    expectTypeOf<ProTableInstance>().toHaveProperty('setQuery')
    expectTypeOf<ProTableInstance>().toHaveProperty('resetQuery')
    expectTypeOf<ProTableInstance>().toHaveProperty('getSelection')
    expectTypeOf<ProTableInstance>().toHaveProperty('setSelection')
    expectTypeOf<ProTableInstance>().toHaveProperty('clearSelection')
    expectTypeOf<ProTableInstance>().toHaveProperty('getTableRef')
  })

  it('实例方法签名', () => {
    expectTypeOf<ProTableInstance['reload']>().toEqualTypeOf<() => void>()
    expectTypeOf<ProTableInstance['refresh']>().toEqualTypeOf<() => void>()
    expectTypeOf<ProTableInstance['getQuery']>().toEqualTypeOf<() => Record<string, any>>()
    expectTypeOf<ProTableInstance['setQuery']>().toEqualTypeOf<(patch: Record<string, any>) => void>()
    expectTypeOf<ProTableInstance['resetQuery']>().toEqualTypeOf<() => void>()
    expectTypeOf<ProTableInstance['getSelection']>().toEqualTypeOf<() => Record<string, any>[]>()
    expectTypeOf<ProTableInstance['setSelection']>().toEqualTypeOf<(rows: Record<string, any>[]) => void>()
    expectTypeOf<ProTableInstance['clearSelection']>().toEqualTypeOf<() => void>()
    expectTypeOf<ProTableInstance['getTableRef']>().toEqualTypeOf<() => any>()
  })
})

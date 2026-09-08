<script setup lang="ts">
import { computed, defineComponent, useSlots, type PropType } from 'vue'
import { ElTableColumn } from 'element-plus'
import type { ColumnRenderScope, NormalizedColumn } from '../types'
import { getByPath } from '../../utils'

defineOptions({ name: 'ColumnNode' })

/** 动态透传插槽：显式声明插槽参数类型，打断递归组件互相透传插槽产生的循环类型推断 */
defineSlots<{
  [name: string]: (props: Record<string, any>) => any
}>()

const props = defineProps<{ col: NormalizedColumn }>()

/** 显式标注插槽字典：递归组件生成声明文件时，避免 useSlots 返回值的循环类型推断 */
const slots: Record<string, ((...args: any[]) => any) | undefined> = useSlots()

/** 内部字段与已显式绑定的字段，不透传给 el-table-column */
const INTERNAL_KEYS = new Set([
  'uid',
  'prop',
  'propPath',
  'slotName',
  'headerSlotName',
  'searchEnabled',
  'searchConfig',
  'label',
  'width',
  'minWidth',
  'fixed',
  'align',
  'headerAlign',
  'sortable',
  'formatter',
  'render',
  'slot',
  'headerSlot',
  'hidden',
  'ellipsis',
  'children'
])

/** column.render 返回 VNode，模板无法直接渲染，用函数式子组件包一层 */
const CellRender = defineComponent({
  name: 'ProTableCellRender',
  props: {
    renderFn: { type: Function as PropType<NonNullable<NormalizedColumn['render']>>, required: true },
    scope: { type: Object as PropType<ColumnRenderScope>, required: true }
  },
  setup(renderProps) {
    return () => renderProps.renderFn(renderProps.scope) ?? null
  }
})

const isDotted = computed<boolean>(() => props.col.propPath.includes('.'))
/** 点路径不传 prop 给 el-table-column（接线决策 6）；非点路径始终传，保证排序/原生取值可用 */
const nativeProp = computed<string | undefined>(() => (isDotted.value ? undefined : props.col.propPath || undefined))

const hasCellSlot = computed<boolean>(() => !!props.col.slot && !!slots[props.col.slotName])
const hasHeaderSlot = computed<boolean>(() => !!props.col.headerSlot && !!slots[props.col.headerSlotName])
/** 是否存在自定义单元格（插槽 / render / formatter / 点路径）；否则走 el-table-column 原生渲染 */
const hasCustomCell = computed<boolean>(
  () => hasCellSlot.value || !!props.col.render || !!props.col.formatter || isDotted.value
)

/** 透传给子列的插槽（排除 default / header，避免与单元格内容模板冲突） */
const passthroughSlots = computed<Record<string, unknown>>(() => {
  const result: Record<string, unknown> = {}
  for (const [name, fn] of Object.entries(slots)) {
    if (name !== 'default' && name !== 'header') result[name] = fn
  }
  return result
})

/** 列配置中的其余字段原样透传给 el-table-column */
const columnAttrs = computed<Record<string, any>>(() => {
  const attrs: Record<string, any> = {}
  for (const [key, value] of Object.entries(props.col)) {
    if (!INTERNAL_KEYS.has(key)) attrs[key] = value
  }
  return attrs
})

/** formatter 渲染：单元格值按点路径自行取出后传入 */
function formatCell(scope: { row: any; column: any; $index: number }): any {
  return props.col.formatter?.(scope.row, scope.column, getByPath(scope.row, props.col.propPath), scope.$index)
}
</script>

<template>
  <el-table-column
    v-bind="columnAttrs"
    :prop="nativeProp"
    :label="col.label"
    :width="col.width"
    :min-width="col.minWidth"
    :fixed="col.fixed"
    :align="col.align"
    :header-align="col.headerAlign"
    :sortable="col.sortable"
    :show-overflow-tooltip="col.ellipsis"
  >
    <!-- 自定义表头插槽：`${prop}-header` -->
    <template v-if="hasHeaderSlot" #header="scope">
      <slot :name="col.headerSlotName" v-bind="scope" />
    </template>
    <!-- 单元格内容：插槽 > render > formatter > 点路径取值 -->
    <template v-if="hasCustomCell" #default="scope">
      <slot v-if="hasCellSlot" :name="col.slotName" v-bind="scope" />
      <cell-render v-else-if="col.render" :render-fn="col.render" :scope="scope" />
      <template v-else-if="col.formatter">{{ formatCell(scope) }}</template>
      <template v-else>{{ getByPath(scope.row, col.propPath) }}</template>
    </template>
    <!-- 多级表头：递归渲染子列，并全量透传插槽 -->
    <column-node v-for="child in col.children ?? []" :key="child.uid" :col="child">
      <template v-for="(_, name) in passthroughSlots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
    </column-node>
  </el-table-column>
</template>

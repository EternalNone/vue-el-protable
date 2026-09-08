<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTimeSelect,
  ElTreeSelect
} from 'element-plus'
import type { ProTableOptions, ResolvedSearchItem } from '../types'
import type { SearchFormContext } from '../hooks/useSearchForm'
import { useFieldOptions } from '../hooks/useFieldOptions'
import { resolveValue } from '../../utils'

const props = defineProps<{
  /** 规范化后的筛选项 */
  item: ResolvedSearchItem
  /** useSearchForm 的完整返回值（查询状态与联动能力） */
  form: SearchFormContext
  /** 全局配置（回车查询开关等） */
  options: ProTableOptions
  /** 触发一次重查（自定义事件回调的辅助方法） */
  reload: () => void
}>()

const config = computed(() => props.item.config)

const { options, loading, depsDisabled, ensureOptions, handleRemoteSearch } = useFieldOptions({
  item: props.item,
  query: props.form.query,
  // 依赖变化 / 重置时由 useSearchForm 自增，驱动本字段选项重载
  reloadSignal: computed(() => props.form.optionTriggers[props.item.key] ?? 0),
  loadOptions: props.form.loadFieldOptions,
  remoteSearch: props.form.remoteSearchOptions
})

/** 当前值：以 form.query 为唯一数据源 */
const value = computed(() => props.form.query[props.item.key])

const fieldType = computed(() => props.item.type)
const isRemote = computed(() => !!config.value.remote && !!config.value.api)
/** 动态禁用（配置函数或布尔）+ 依赖值为空禁用（文档 §5.4） */
const isDisabled = computed(() => resolveValue(config.value.disabled, props.form.query) || depsDisabled.value)

/** 透传给底层控件的原生属性（用户可覆盖默认 placeholder） */
const controlProps = computed(() => config.value.props ?? {})
const inputPlaceholder = computed(() => `请输入${props.item.label}`)
const selectPlaceholder = computed(() => `请选择${props.item.label}`)

/** radio / checkbox 组没有「展开」时机，挂载即拉取选项；下拉类控件走 visible-change 懒加载 */
const NEEDS_IMMEDIATE_OPTIONS = new Set(['radio', 'checkbox'])
onMounted(() => {
  if (NEEDS_IMMEDIATE_OPTIONS.has(fieldType.value)) void ensureOptions()
})

/** 值变化统一入口：写回 query（hook 内部处理联动清空与 searchOnChange） */
function onChange(next: any): void {
  props.form.handleFieldChange(props.item.key, next)
}

/** 下拉类控件首次展开时懒加载选项 */
function onVisibleChange(visible: boolean): void {
  if (visible) void ensureOptions()
}

/** 回车触发查询（searchOnEnter 默认开启；textarea 回车换行不参与） */
function onEnter(): void {
  if (props.options.searchOnEnter !== false) props.form.handleSearch()
}

/** config.events 事件回调：(新值, 当前查询条件, 辅助方法) */
const customEvents = computed(() => {
  const handlers = config.value.events
  if (!handlers) return {}
  const out: Record<string, (...args: any[]) => void> = {}
  for (const [name, handler] of Object.entries(handlers)) {
    const eventName = name.startsWith('on') ? name : `on${name.charAt(0).toUpperCase()}${name.slice(1)}`
    out[eventName] = (...args: any[]) => handler(args[0], { ...props.form.query }, { reload: props.reload })
  }
  return out
})

/** el-option / el-radio / el-checkbox 的 key 兜底 */
function optionKey(opt: any, index: number): string {
  return opt.value !== undefined && opt.value !== null ? String(opt.value) : `opt_${index}`
}

/** OptionItem.value 为可选字段，Element Plus 控件要求确定值，缺失时兜底为空字符串 */
function optionValue(opt: { value?: string | number | boolean }): string | number | boolean {
  return opt.value ?? ''
}
</script>

<template>
  <!-- 文本输入 -->
  <el-input
    v-if="fieldType === 'input'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    :placeholder="inputPlaceholder"
    clearable
    v-on="customEvents"
    @update:model-value="onChange"
    @keyup.enter="onEnter"
  />
  <el-input
    v-else-if="fieldType === 'textarea'"
    v-bind="controlProps"
    type="textarea"
    :model-value="value"
    :disabled="isDisabled"
    :placeholder="inputPlaceholder"
    v-on="customEvents"
    @update:model-value="onChange"
  />
  <el-input-number
    v-else-if="fieldType === 'input-number'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    :placeholder="inputPlaceholder"
    v-on="customEvents"
    @update:model-value="onChange"
    @keyup.enter="onEnter"
  />
  <!-- 下拉选择（支持异步选项懒加载 / 远程搜索） -->
  <el-select
    v-else-if="fieldType === 'select'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    :loading="loading"
    :placeholder="selectPlaceholder"
    filterable
    clearable
    :remote="isRemote"
    :remote-method="isRemote ? handleRemoteSearch : undefined"
    v-on="customEvents"
    @update:model-value="onChange"
    @visible-change="onVisibleChange"
  >
    <el-option
      v-for="(opt, index) in options"
      :key="optionKey(opt, index)"
      :label="opt.label"
      :value="optionValue(opt)"
      :disabled="opt.disabled"
    />
  </el-select>
  <!-- 级联选择 -->
  <el-cascader
    v-else-if="fieldType === 'cascader'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    :loading="loading"
    :placeholder="selectPlaceholder"
    :options="(options as any)"
    clearable
    v-on="customEvents"
    @update:model-value="onChange"
    @visible-change="onVisibleChange"
  />
  <!-- 树选择 -->
  <el-tree-select
    v-else-if="fieldType === 'tree-select'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    :loading="loading"
    :placeholder="selectPlaceholder"
    :data="options"
    clearable
    v-on="customEvents"
    @update:model-value="onChange"
    @visible-change="onVisibleChange"
  />
  <!-- 日期 / 日期范围（type 直接映射，splitKeys 拆分由 useSearchForm 提交时处理） -->
  <el-date-picker
    v-else-if="
      ['date', 'dates', 'week', 'month', 'year', 'daterange', 'datetimerange', 'monthrange'].includes(
        fieldType
      )
    "
    v-bind="controlProps"
    :type="fieldType as any"
    :model-value="value"
    :disabled="isDisabled"
    :placeholder="selectPlaceholder"
    clearable
    v-on="customEvents"
    @update:model-value="onChange"
  />
  <!-- 固定时间点选择 -->
  <el-time-select
    v-else-if="fieldType === 'time-select'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    :placeholder="selectPlaceholder"
    start="00:00"
    end="23:59"
    step="00:30"
    clearable
    v-on="customEvents"
    @update:model-value="onChange"
  />
  <!-- 开关 -->
  <el-switch
    v-else-if="fieldType === 'switch'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    v-on="customEvents"
    @update:model-value="onChange"
  />
  <!-- 单选组 -->
  <el-radio-group
    v-else-if="fieldType === 'radio'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    v-on="customEvents"
    @update:model-value="onChange"
  >
    <el-radio v-for="(opt, index) in options" :key="optionKey(opt, index)" :value="opt.value" :disabled="opt.disabled">
      {{ opt.label }}
    </el-radio>
  </el-radio-group>
  <!-- 多选组 -->
  <el-checkbox-group
    v-else-if="fieldType === 'checkbox'"
    v-bind="controlProps"
    :model-value="value"
    :disabled="isDisabled"
    v-on="customEvents"
    @update:model-value="onChange"
  >
    <el-checkbox
      v-for="(opt, index) in options"
      :key="optionKey(opt, index)"
      :value="opt.value"
      :disabled="opt.disabled"
    >
      {{ opt.label }}
    </el-checkbox>
  </el-checkbox-group>
</template>

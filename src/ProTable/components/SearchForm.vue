<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import { ElButton, ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import type { ProTableOptions, ResolvedSearchItem } from '../types'
import type { SearchFormContext } from '../hooks/useSearchForm'
import FieldRenderer from './FieldRenderer.vue'

const props = defineProps<{
  /** useSearchForm 的完整返回值 */
  form: SearchFormContext
  /** 全局配置（栅格收起、按钮显隐、回车查询等） */
  options: ProTableOptions
  /** 触发一次重查（透传给 FieldRenderer 的自定义事件辅助方法） */
  reload: () => void
}>()

/** 显式标注插槽字典：生成声明文件时避免 useSlots 返回值的循环类型推断 */
const slots: Record<string, ((...args: any[]) => any) | undefined> = useSlots()

const collapsedSize = computed(() => props.options.collapsedSize ?? 4)
/** 初始收起状态（默认收起；筛选项未超过阈值时收起不生效） */
const collapsed = ref(props.options.searchCollapsed !== false)
/** 收起时可见项数：比一行阈值少 1，为查询/重置/展开按钮预留一个栅格位，保证按钮落在第一行 */
const collapsedCount = computed(() => Math.max(1, collapsedSize.value - 1))
/** 项数超过收起可见数才出现展开/收起按钮 */
const canCollapse = computed(() => props.form.searchItems.value.length > collapsedCount.value)

const showButtons = computed(() => props.options.showSearchButtons !== false)
const hasActionsSlot = computed<boolean>(() => !!slots['search-actions'])

/** 收起时仅渲染层隐藏超出项（隐藏项仍参与提交，useSearchForm 已保证） */
function isItemVisible(index: number): boolean {
  return !collapsed.value || index < collapsedCount.value
}

/** 按钮区栅格：当前可见项占满一行则换行，否则占据行内剩余空间（始终可见不丢失） */
function calcActionsSpan(spanOf: (span: number) => number): number {
  const shown = collapsed.value
    ? props.form.searchItems.value.slice(0, collapsedCount.value)
    : props.form.searchItems.value
  const sum = shown.reduce((acc, item) => acc + spanOf(item.colSpan), 0)
  const remain = 24 - (sum % 24)
  return remain >= 6 ? remain : 24
}
const actionsSpan = computed(() => calcActionsSpan((span) => span))
const actionsSpanMd = computed(() => calcActionsSpan((span) => Math.min(24, span * 2)))

/** 回车提交表单 → 触发查询（searchOnEnter 默认开启） */
function onSubmit(): void {
  if (props.options.searchOnEnter !== false) props.form.handleSearch()
}
</script>

<template>
  <div class="cpt-search">
    <el-form
      class="cpt-search__form"
      :model="form.query"
      :label-width="options.labelWidth ?? 'auto'"
      :label-position="options.labelPosition ?? 'right'"
      @submit.prevent="onSubmit"
    >
      <el-row :gutter="16">
        <!-- 筛选项：栅格随断点调整（xl/lg 原跨度，md 翻倍，sm/xs 整行） -->
        <el-col
          v-for="(item, index) in (form.searchItems.value as ResolvedSearchItem[])"
          v-show="isItemVisible(index)"
          :key="item.key"
          :xl="item.colSpan"
          :lg="item.colSpan"
          :md="Math.min(24, item.colSpan * 2)"
          :sm="24"
          :xs="24"
        >
          <el-form-item :label="item.label" :prop="item.key">
            <!-- custom 类型：交给外部 search-{key} 插槽自定义 -->
            <slot
              v-if="item.type === 'custom'"
              :name="`search-${item.key}`"
              :value="form.query[item.key]"
              :query="form.query"
              :item="item"
              :set-value="(val: any) => form.handleFieldChange(item.key, val)"
            />
            <field-renderer v-else :item="item" :form="form" :options="options" :reload="reload" />
          </el-form-item>
        </el-col>
        <!-- 按钮区：查询/重置/展开收起始终可见 -->
        <el-col
          v-if="showButtons || hasActionsSlot"
          class="cpt-search__actions-col"
          :xl="actionsSpan"
          :lg="actionsSpan"
          :md="actionsSpanMd"
          :sm="24"
          :xs="24"
        >
          <el-form-item class="cpt-search__actions" label-width="0">
            <template v-if="showButtons">
              <el-button type="primary" @click="form.handleSearch()">查询</el-button>
              <el-button @click="form.handleReset()">重置</el-button>
            </template>
            <el-button v-if="canCollapse" link class="cpt-search__collapse-btn" @click="collapsed = !collapsed">
              {{ collapsed ? '展开' : '收起' }}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline v-if="collapsed" points="6 9 12 15 18 9" />
                <polyline v-else points="18 15 12 9 6 15" />
              </svg>
            </el-button>
            <slot name="search-actions" :query="form.query" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

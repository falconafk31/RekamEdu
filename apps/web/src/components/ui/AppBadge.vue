<script setup lang="ts">
import { computed, type Component, type PropType } from 'vue'
import { CheckCircle2, Circle, Info, TriangleAlert, XCircle } from 'lucide-vue-next'

// tone: success|info|warning|danger|neutral|primary|library
// Always renders icon + label (never color alone) for accessibility.
const props = defineProps({
  label: { type: String, required: true },
  tone: { type: String, default: 'neutral' },
  icon: { type: Object as PropType<Component | null>, default: null },
  dot: { type: Boolean, default: false },
})

const toneClass = computed(() => {
  const map: Record<string, string> = {
    success: 'badge-success',
    info: 'badge-info',
    warning: 'badge-warning',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
    primary: 'badge-primary',
    library: 'badge-library',
    // backward-compat color names
    emerald: 'badge-success', green: 'badge-success',
    sky: 'badge-info', blue: 'badge-library',
    amber: 'badge-warning', rose: 'badge-danger', red: 'badge-danger',
    gray: 'badge-neutral', slate: 'badge-neutral',
  }
  return map[props.tone] ?? 'badge-neutral'
})

const defaultIcon = computed((): Component | null => {
  if (props.icon) return props.icon
  const map: Record<string, Component> = {
    success: CheckCircle2, info: Info, warning: TriangleAlert,
    danger: XCircle, neutral: Circle, primary: CheckCircle2, library: Info,
  }
  return map[props.tone] ?? null
})
</script>
<template>
  <span :class="toneClass">
    <span v-if="dot" class="badge-dot" aria-hidden="true" />
    <component v-else-if="defaultIcon" :is="defaultIcon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    {{ label }}
  </span>
</template>

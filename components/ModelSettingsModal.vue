
<template>
  <div class="modal" tabindex="-1" v-if="modelValue">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Model Settings</h5>
          <button type="button" class="btn-close" @click="$emit('update:modelValue', false)"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Temperature: {{ settings.temperature.toFixed(1) }}</label>
            <input
              type="range"
              class="form-range"
              min="0"
              max="2"
              step="0.1"
              v-model.number="settings.temperature"
            >
          </div>
          <!-- ... (tous les autres sliders) -->
        </div>
        <div class="modal-footer">
          <button @click="$emit('reset')" class="btn btn-secondary">Reset</button>
          <button @click="$emit('save')" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: Boolean,
    settings: Object,
  },
  emits: ['update:modelValue', 'save', 'reset'],
}
</script>

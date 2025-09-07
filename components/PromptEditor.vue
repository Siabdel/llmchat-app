
<template>
  <div class="prompt-editor-container">
    <div
      ref="editor"
      contenteditable="true"
      class="prompt-editor"
      @input="$emit('update:modelValue', $event.target.innerText)"
      @keydown="handleKeydown"
    ></div>
    <div class="token-counter">~{{ tokenCount }} tokens</div>
    <button @click="$emit('send')" class="btn btn-primary">Send</button>
  </div>
</template>

<script>
export default {
  props: {
    modelValue: String,
    tokenCount: Number,
  },
  emits: ['update:modelValue', 'send', 'file-upload'],
  methods: {
    handleKeydown(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.$emit('send')
      }
    }
  }
}
</script>

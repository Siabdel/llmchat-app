<template>
  <div id="chatMessages" class="chat-messages">
    <div
      v-for="(message, index) in messages"
      :key="index"
      class="chat-bubble"
      :class="message.role === 'user' ? 'user-bubble' : 'assistant-bubble'"
    >
      <div class="bubble-actions">
        <button @click="copyMessage(message.content)" class="btn btn-sm btn-outline-secondary">
          <i class="fas fa-copy"></i>
        </button>
        <button
          v-if="message.role === 'user'"
          @click="$emit('edit', message)"
          class="btn btn-sm btn-outline-secondary"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button
          v-else
          @click="$emit('regenerate', message)"
          class="btn btn-sm btn-outline-secondary"
        >
          <i class="fas fa-redo-alt"></i>
        </button>
      </div>
      <div class="message-content" v-html="formatMessage(message.content)"></div>
      <div class="bubble-metadata">
        <div>{{ message.role === 'user' ? 'You' : 'Assistant' }}</div>
        <div>{{ new Date(message.timestamp).toLocaleTimeString() }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    messages: Array,
    selectedModel: String,
  },
  emits: ['regenerate', 'edit'],
  methods: {
    formatMessage(content) {
      return content.replace(/\n/g, '<br>')
    },
    copyMessage(content) {
      navigator.clipboard.writeText(content)
    }
  }
}
</script>

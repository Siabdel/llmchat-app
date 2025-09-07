<template>
  <div id="sidebar" class="col-md-3 col-lg-2 d-md-block bg-light sidebar">
    <button @click="$emit('new-chat')" class="btn btn-primary w-100 mb-3">
      New Chat
    </button>
    <div class="list-group">
      <button
        v-for="chat in sortedChats"
        :key="chat.id"
        @click="$emit('load-chat', chat.id)"
        class="list-group-item list-group-item-action"
        :class="{ active: chat.id === currentChatId }"
      >
        {{ getChatTitle(chat) }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    chats: Object,
    currentChatId: String,
  },
  emits: ['new-chat', 'load-chat', 'delete-chat'],
  computed: {
    sortedChats() {
      return Object.values(this.chats).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
  },
  methods: {
    getChatTitle(chat) {
      if (chat.messages.length === 0) return chat.title
      const firstUserMessage = chat.messages.find(msg => msg.role === 'user')
      return firstUserMessage ? firstUserMessage.content.split('\n')[0].substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '') : chat.title
    }
  }
}
</script>


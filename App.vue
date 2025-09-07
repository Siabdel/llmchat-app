<template>
  <div id="app" class="d-flex flex-column vh-100">
    <!-- Header -->
    <header class="bg-primary text-white p-3 d-flex justify-content-between align-items-center shadow-sm">
      <h1 class="h4 mb-0 d-flex align-items-center gap-2">
        <i class="fas fa-robot"></i> LLM Chat
      </h1>
      <div class="d-flex gap-2">
        <button
          class="btn btn-outline-light btn-sm d-md-none"
          @click="toggleSidebar"
        >
          <i class="fas fa-bars"></i>
        </button>
        <button
          class="btn btn-outline-light btn-sm"
          @click="showModelSettings = true"
        >
          <i class="fas fa-cog"></i>
        </button>
        <button
          class="btn btn-sm"
          :class="darkMode ? 'btn-light' : 'btn-dark'"
          @click="toggleDarkMode"
        >
          <i :class="darkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-grow-1 d-flex overflow-hidden">
      <!-- Sidebar -->
      <ChatSidebar
        v-model:currentChatId="currentChatId"
        :chats="chats"
        :selectedModel="selectedModel"
        :visible="sidebarVisible"
        @new-chat="createNewChat"
        @load-chat="loadChat"
        @delete-chat="deleteCurrentChat"
        class="flex-shrink-0 border-end"
        :class="{ 'd-none': !sidebarVisible }"
      />

      <!-- Chat Area -->
      <div
        id="mainContent"
        class="d-flex flex-column flex-grow-1 overflow-hidden"
      >
        <!-- Chat Messages -->
        <div
          id="chatMessagesContainer"
          class="flex-grow-1 overflow-auto p-3"
          :class="darkMode ? 'bg-dark text-white' : 'bg-light'"
        >
          <div v-if="!currentChatId" class="text-center py-5">
            <i class="fas fa-comments fa-3x mb-3 text-muted"></i>
            <h3 class="text-muted">Crée un nouveau chat</h3>
            <p class="text-muted">Clique sur "New Chat" pour commencer</p>
          </div>
          <ChatMessages
            v-else
            ref="chatMessages"
            :messages="currentChat?.messages || []"
            :selectedModel="selectedModel"
            :darkMode="darkMode"
            @regenerate="regenerateResponse"
            @edit="editUserMessage"
          />
        </div>

        <!-- Prompt Editor -->
        <div class="p-3 border-top" :class="darkMode ? 'border-dark' : 'border-light'">
          <PromptEditor
            v-model="promptText"
            :tokenCount="tokenCount"
            :uploadedFiles="uploadedFiles"
            :darkMode="darkMode"
            @send="sendMessage"
            @file-upload="handleFileUpload"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ApiKeyModal
      v-if="!apiKey"
      @submit="handleApiKeySubmit"
    />
    <LeavePageModal
      v-if="showLeavePageModal"
      @confirm="confirmLeavePage"
      @cancel="showLeavePageModal = false"
    />
    <ModelSettingsModal
      v-model="showModelSettings"
      :settings="settings"
      @save="saveModelSettings"
      @reset="resetSettings"
    />
  </div>
</template>

<script>
import ChatSidebar from './components/ChatSidebar.vue'
import ChatMessages from './components/ChatMessages.vue'
import PromptEditor from './components/PromptEditor.vue'
import ModelSettingsModal from './components/ModelSettingsModal.vue'
import ApiKeyModal from './components/ApiKeyModal.vue'
import LeavePageModal from './components/LeavePageModal.vue'

const models = [
  { label: 'Gemini 2.5 Pro Experimental (1,048,576 context)', value: 'google/gemini-2.5-pro-exp-03-25:free', context: 1048576 },
  { label: 'Gemini 2.0 Flash (1,048,576 context)', value: 'google/gemini-2.0-flash-exp:free', context: 1048576 },
  { label: 'DeepSeek V3 0324 (163,840 context)', value: 'deepseek/deepseek-chat-v3-0324:free', context: 163840 },
  { label: 'DeepSeek R1 (163,840 context)', value: 'deepseek/deepseek-r1:free', context: 163840 },
  { label: 'Gemma 3 27B (131,072 context)', value: 'google/gemma-3-27b-it:free', context: 131072 },
  { label: 'Llama 3.2 1B (131,072 context)', value: 'meta-llama/llama-3.2-1b-instruct:free', context: 131072 },
]

export default {
  components: {
    ChatSidebar,
    ChatMessages,
    PromptEditor,
    ModelSettingsModal,
    ApiKeyModal,
    LeavePageModal
  },
  data() {
    return {
      apiKey: sessionStorage.getItem('apiKey') || null,
      currentChatId: null,
      chats: {},
      selectedModel: 'deepseek/deepseek-chat-v3-0324:free',
      fallbackModels: ['google/gemini-2.0-flash-exp:free', 'deepseek/deepseek-v3-base:free'],
      settings: {
        temperature: 1.0,
        topP: 1.0,
        topK: 0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        repetitionPenalty: 1.0,
        minP: 0.0,
        topA: 0.0,
        seed: null,
        maxTokens: null,
        logprobs: false,
        topLogprobs: null,
        streaming: true,
        reasoning: { effort: null, maxTokens: null, exclude: false }
      },
      uploadedFiles: [],
      currentlyStreaming: false,
      streamController: null,
      promptText: '',
      showModelSettings: false,
      showLeavePageModal: false,
      sidebarVisible: window.innerWidth >= 992,
      darkMode: false,
      models,
    }
  },
  computed: {
    currentChat() {
      return this.chats[this.currentChatId] || null
    },
    tokenCount() {
      return Math.ceil(this.promptText.length / 4)
    }
  },
  watch: {
    apiKey(newVal) {
      if (newVal) sessionStorage.setItem('apiKey', newVal)
    },
    darkMode(newVal) {
      document.body.classList.toggle('dark-mode', newVal)
    }
  },
  created() {
    this.loadAppState()
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode
    },
    handleResize() {
      this.sidebarVisible = window.innerWidth >= 992
    },
    handleApiKeySubmit(apiKey) {
      this.apiKey = apiKey
      this.initializeAfterAuth()
    },
    initializeAfterAuth() {
      this.loadAppState()
      if (Object.keys(this.chats).length === 0) {
        this.createNewChat()
      } else {
        const chatIds = Object.keys(this.chats)
        this.loadChat(chatIds[chatIds.length - 1])
      }
    },
    loadAppState() {
      const savedState = localStorage.getItem('llmChatAppState')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        this.chats = parsedState.chats || {}
        this.selectedModel = parsedState.selectedModel || this.selectedModel
        this.settings = parsedState.settings || this.settings
      }
    },
    saveAppState() {
      const stateToSave = {
        chats: this.chats,
        selectedModel: this.selectedModel,
        settings: this.settings
      }
      localStorage.setItem('llmChatAppState', JSON.stringify(stateToSave))
    },
    createNewChat() {
      const chatId = 'chat_' + Date.now()
      this.chats[chatId] = {
        id: chatId,
        title: 'New Conversation',
        model: this.selectedModel,
        messages: [],
        createdAt: new Date().toISOString()
      }
      this.currentChatId = chatId
      this.saveAppState()
    },
    loadChat(chatId) {
      this.currentChatId = chatId
      this.saveAppState()
    },
    deleteCurrentChat() {
      if (!this.currentChatId || Object.keys(this.chats).length <= 1) {
        this.createNewChat()
        return
      }
      delete this.chats[this.currentChatId]
      const chatIds = Object.keys(this.chats)
      this.loadChat(chatIds[0])
      this.saveAppState()
    },
    handleFileUpload(files) {
      this.uploadedFiles = [...this.uploadedFiles, ...files]
    },
    sendMessage() {
      if (!this.promptText.trim()) return

      const userMessage = {
        role: 'user',
        content: this.promptText,
        timestamp: new Date().toISOString()
      }

      this.chats[this.currentChatId].messages.push(userMessage)
      this.promptText = ''
      this.saveAppState()

      // Simuler une réponse de l'assistant (à remplacer par un vrai appel API)
      setTimeout(() => {
        const assistantMessage = {
          role: 'assistant',
          content: "Je suis une réponse simulée. Voici du code :\n\n```javascript\nconsole.log('Hello World!')\n```",
          model: this.selectedModel,
          timestamp: new Date().toISOString()
        }
        this.chats[this.currentChatId].messages.push(assistantMessage)
        this.saveAppState()
      }, 1000)
    },
    regenerateResponse(message) {
      console.log('Regenerate response for:', message)
    },
    editUserMessage(message) {
      console.log('Edit message:', message)
    },
    handleBeforeUnload(e) {
      if (Object.keys(this.chats).length > 0) {
        e.preventDefault()
        this.showLeavePageModal = true
        e.returnValue = ''
      }
    },
    confirmLeavePage() {
      window.close()
    },
    saveModelSettings(newSettings) {
      this.settings = newSettings
      this.saveAppState()
    },
    resetSettings() {
      this.settings = {
        temperature: 1.0,
        topP: 1.0,
        topK: 0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        repetitionPenalty: 1.0,
        minP: 0.0,
        topA: 0.0,
        seed: null,
        maxTokens: null,
        logprobs: false,
        topLogprobs: null,
        streaming: true,
        reasoning: { effort: null, maxTokens: null, exclude: false }
      }
      this.saveAppState()
    }
  }
}
</script>

<style>
:root {
  --primary-bg: #4e73df;
  --chat-bg: #f8f9fa;
  --user-bubble: #e3f2fd;
  --assistant-bubble: #ffffff;
  --border-color: #e3e6f0;
  --text-dark: #373a3c;
  --text-light: #f8f9fa;
}

.dark-mode {
  --primary-bg: #2e3d49;
  --chat-bg: #1a1a1a;
  --user-bubble: #2c3e50;
  --assistant-bubble: #343a40;
  --border-color: #495057;
  --text-dark: #f8f9fa;
  --text-light: #373a3c;
  background-color: var(--primary-bg);
  color: var(--text-dark);
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

#chatMessagesContainer {
  background-color: var(--chat-bg);
  border-radius: 0.5rem;
  height: 100%;
}

.chat-bubble {
  border-radius: 1rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 80%;
}

.user-bubble {
  background-color: var(--user-bubble);
  margin-left: auto;
  border-bottom-right-radius: 0;
  color: var(--text-dark);
}

.assistant-bubble {
  background-color: var(--assistant-bubble);
  margin-right: auto;
  border-bottom-left-radius: 0;
  color: var(--text-dark);
}

.dark-mode .user-bubble,
.dark-mode .assistant-bubble {
  color: var(--text-light);
}

.prompt-editor {
  min-height: 100px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background-color: var(--assistant-bubble);
  color: var(--text-dark);
}

.dark-mode .prompt-editor {
  background-color: #343a40;
  color: var(--text-light);
  border-color: var(--border-color);
}

/* Scrollbar styling */
#chatMessagesContainer::-webkit-scrollbar {
  width: 8px;
}

#chatMessagesContainer::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

#chatMessagesContainer::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.dark-mode #chatMessagesContainer::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
</style>


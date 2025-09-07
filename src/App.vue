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
// ... (les imports et data existants restent inchangés)
import axios from 'axios';
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
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    // Nettoie le controller si le composant est détruit
    this.cancelStream();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('resize', this.handleResize);
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
        if (chatIds.length > 0) {
          this.loadChat(chatIds[chatIds.length - 1])
        } else {
          this.createNewChat();
        }
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
      if (this.chats[chatId]) {
        this.currentChatId = chatId
        this.saveAppState()
      } else {
        console.error(`Invalid chatId: ${chatId}`);
        // Optionally, create a new chat here
        this.createNewChat();
      }
    },
    deleteCurrentChat() {
      if (!this.currentChatId || Object.keys(this.chats).length <= 1) {
        this.createNewChat()
      } else {
        delete this.chats[this.currentChatId]
        const chatIds = Object.keys(this.chats)
        if (chatIds.length > 0) {
          this.loadChat(chatIds[0])
        } else {
          this.createNewChat();
        }
        this.saveAppState()
      }
    },
    handleFileUpload(files) {
      this.uploadedFiles = [...this.uploadedFiles, ...files]
    },
    

    
   async sendMessage() {
      // 1. Vérifications préliminaires
      if (!this.promptText.trim()) {
        console.warn("Message vide ignoré");
        return;
      }
      if (!this.apiKey) {
        this.handleApiError(new Error("Clé API manquante"));
        return;
      }
      if (!this.currentChatId || !this.chats[this.currentChatId]) {
        this.handleApiError(new Error("Aucune conversation sélectionnée"));
        return;
      }

      // 2. Sauvegarde le texte actuel et réinitialise le champ
      const promptText = this.promptText;
      this.promptText = '';

      try {
        // 3. Annule tout stream en cours
        if (this.currentlyStreaming && this.streamController) {
          this.streamController.abort();
          this.currentlyStreaming = false;
        }

        // 4. Crée un CancelToken pour Axios (ou AbortController pour fetch)
        this.streamController = axios.CancelToken.source();

        // 5. Ajoute le message de l'utilisateur à la conversation
        const userMessage = {
          role: 'user',
          content: promptText,
          timestamp: new Date().toISOString()
        };
        this.chats[this.currentChatId].messages.push(userMessage);
        this.saveAppState();

        // 6. Ajoute un indicateur de chargement
        const waitingIndicator = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isWaiting: true
        };
        this.chats[this.currentChatId].messages.push(waitingIndicator);
        this.saveAppState();

        // 7. Remplace l'indicateur par un message vide (pour le streaming)
        const assistantMessageIndex = this.chats[this.currentChatId].messages.length - 1;
        this.chats[this.currentChatId].messages[assistantMessageIndex] = {
          role: 'assistant',
          content: '',
          model: this.selectedModel,
          timestamp: new Date().toISOString(),
          processing: true
        };
        this.saveAppState();

        // 8. Prépare les messages pour l'API (filtre les indicateurs)
        const messages = this.chats[this.currentChatId].messages
          .filter(msg => !(msg.isWaiting || msg.processing))
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));

        // 9. Construit le payload
        const requestPayload = {
          model: this.selectedModel,
          messages: messages,
          stream: this.settings.streaming
        };

        // Ajoute les paramètres optionnels
        if (this.settings.temperature !== 1.0) requestPayload.temperature = this.settings.temperature;
        if (this.settings.topP !== 1.0) requestPayload.top_p = this.settings.topP;
        if (this.settings.topK !== 0) requestPayload.top_k = this.settings.topK;
        if (this.settings.frequencyPenalty !== 0.0) requestPayload.frequency_penalty = this.settings.frequencyPenalty;
        if (this.settings.presencePenalty !== 0.0) requestPayload.presence_penalty = this.settings.presencePenalty;
        if (this.settings.repetitionPenalty !== 1.0) requestPayload.repetition_penalty = this.settings.repetitionPenalty;
        if (this.settings.minP !== 0.0) requestPayload.min_p = this.settings.minP;
        if (this.settings.topA !== 0.0) requestPayload.top_a = this.settings.topA;
        if (this.settings.seed !== null) requestPayload.seed = this.settings.seed;
        if (this.settings.maxTokens !== null) requestPayload.max_tokens = this.settings.maxTokens;
        if (this.settings.logprobs) requestPayload.logprobs = true;
        if (this.settings.topLogprobs !== null) requestPayload.top_logprobs = this.settings.topLogprobs;

        // Paramètres de reasoning
        if (this.settings.reasoning.effort || this.settings.reasoning.maxTokens || this.settings.reasoning.exclude) {
          requestPayload.reasoning = {};
          if (this.settings.reasoning.effort) requestPayload.reasoning.effort = this.settings.reasoning.effort;
          if (this.settings.reasoning.maxTokens) requestPayload.reasoning.max_tokens = this.settings.reasoning.maxTokens;
          if (this.settings.reasoning.exclude) requestPayload.reasoning.exclude = true;
        }

        console.log("Payload envoyé:", requestPayload); // Débogage

        // 10. Envoie la requête
        const startTime = Date.now();
        this.currentlyStreaming = true;

        if (this.settings.streaming) {
          // Utilise fetch pour le streaming (meilleur support SSE)
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestPayload),
            signal: this.streamController.token // Pour annuler la requête
          });

          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
          }

          // Traite le flux SSE
          await this.handleStreamResponse(response, startTime, assistantMessageIndex);
        } else {
          // Utilise Axios pour les réponses non-streaming
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            requestPayload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
              },
              cancelToken: this.streamController.token
            }
          );

          // Traite la réponse complète
          this.chats[this.currentChatId].messages[assistantMessageIndex] = {
            role: 'assistant',
            content: response.data.choices[0]?.message?.content || '',
            model: response.data.model || this.selectedModel,
            timestamp: new Date().toISOString(),
            processingTime: (Date.now() - startTime) / 1000,
            usage: response.data.usage || {}
          };
          this.saveAppState();
        }
      } catch (error) {
        console.error("Erreur dans sendMessage:", error);
        this.handleApiError(error);
      } finally {
        this.currentlyStreaming = false;
      }
    },

  // Méthode pour gérer le streaming (à ajouter)
  async handleStreamResponse(response, startTime, messageIndex) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith(':') || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));

              // Ajoute le contenu du delta
              if (data.choices?.[0]?.delta?.content) {
                content += data.choices[0].delta.content;
                this.chats[this.currentChatId].messages[messageIndex].content = content;
                this.saveAppState();
              }

              // Met à jour les métadonnées si disponibles
              if (data.usage) {
                this.chats[this.currentChatId].messages[messageIndex].usage = data.usage;
              }
            } catch (e) {
              console.error("Erreur de parsing SSE:", e, "Ligne:", trimmedLine);
            }
          }
        }

      // Finalise le message
      this.chats[this.currentChatId].messages[messageIndex].processing = false;
      this.chats[this.currentChatId].messages[messageIndex].processingTime = (Date.now() - startTime) / 1000;
      this.saveAppState();
    } } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  },

  // Méthode pour gérer les erreurs (à ajouter ou mettre à jour)
  handleApiError(error) {
    let errorMessage = 'Une erreur est survenue';

    if (error.name === 'AbortError') {
      errorMessage = 'Requête annulée';
    } else if (error.response) {
      // Erreur Axios
      errorMessage = `Erreur ${error.response.status}: ${error.response.data?.error?.message || 'Erreur serveur'}`;
    } else if (error.message) {
      // Erreur native ou fetch
      errorMessage = error.message;
    }

    // Affiche l'erreur dans l'interface
    const errorMessageObj = {
      role: 'error',
      content: `⚠️ ${errorMessage}`,
      timestamp: new Date().toISOString()
    };

    if (this.chats[this.currentChatId]) {
      const lastMessageIndex = this.chats[this.currentChatId].messages.length - 1;
      const lastMessage = this.chats[this.currentChatId].messages[lastMessageIndex];

      if (lastMessage.isWaiting || lastMessage.processing) {
        this.chats[this.currentChatId].messages[lastMessageIndex] = errorMessageObj;
      } else {
        this.chats[this.currentChatId].messages.push(errorMessageObj);
      }
      this.saveAppState();
    }
  },

  // Méthode pour annuler le stream (déjà dans ton code)
  cancelStream() {
    if (this.currentlyStreaming && this.streamController) {
      this.streamController.cancel('Requête annulée par l\'utilisateur');
      this.currentlyStreaming = false;
    }
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

<template>
  <div
    class="modal fade show d-block"
    tabindex="-1"
    style="background-color: rgba(0, 0, 0, 0.5)"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" :class="darkMode ? 'bg-dark text-white' : ''">
        <!-- En-tête du modal -->
        <div class="modal-header" :class="darkMode ? 'border-dark' : 'border-light'">
          <h5 class="modal-title">
            <i class="fas fa-key me-2"></i>
            Clé API requise
          </h5>
        </div>

        <!-- Corps du modal -->
        <div class="modal-body">
          <div class="mb-4">
            <p>
              Pour utiliser cette application, vous devez fournir une clé API valide.
            </p>
            <p class="mb-0 text-muted small">
              (Cette clé sera sauvegardée uniquement dans votre navigateur)
            </p>
          </div>

          <!-- Champ de saisie de la clé API -->
          <div class="mb-3">
            <label for="apiKeyInput" class="form-label">
              Votre clé API
            </label>
            <div class="input-group">
              <input
                type="password"
                class="form-control"
                id="apiKeyInput"
                v-model="apiKey"
                placeholder="Ex: sk-123456789abcdef..."
                :class="darkMode ? 'bg-dark text-white border-dark' : ''"
                @keyup.enter="handleSubmit"
              >
              <button
                class="btn btn-outline-secondary"
                type="button"
                @click="toggleShowKey"
              >
                <i :class="showKey ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
            <div v-if="error" class="text-danger mt-1 small">
              {{ error }}
            </div>
          </div>

          <!-- Exemple de format de clé -->
          <div class="alert alert-info p-2 small mb-0">
            <i class="fas fa-info-circle me-1"></i>
            Exemple : <code>sk-123456789abcdef123456789</code>
          </div>
        </div>

        <!-- Pied du modal -->
        <div class="modal-footer" :class="darkMode ? 'border-dark' : 'border-light'">
          <button
            type="button"
            class="btn btn-primary"
            @click="handleSubmit"
            :disabled="!apiKey.trim()"
          >
            <i class="fas fa-check me-1"></i>
            Valider
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ApiKeyModal',
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit'],
  data() {
    return {
      apiKey: '',
      showKey: false,
      error: ''
    }
  },
  watch: {
    showKey(newVal) {
      const input = document.getElementById('apiKeyInput')
      input.type = newVal ? 'text' : 'password'
    }
  },
  methods: {
    toggleShowKey() {
      this.showKey = !this.showKey
    },
    handleSubmit() {
      // Validation basique
      if (!this.apiKey.trim()) {
        this.error = 'Veuillez entrer une clé API valide'
        return
      }

      // Validation du format (optionnel)
      if (!/^[a-zA-Z0-9\-_]{20,}$/.test(this.apiKey)) {
        this.error = 'Format de clé invalide (doit contenir au moins 20 caractères)'
        return
      }

      this.error = ''
      this.$emit('submit', this.apiKey)
    }
  }
}
</script>

<style scoped>
/* Style pour le fond sombre du modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1050;
}

/* Style pour le champ de saisie en mode sombre */
.modal-content.bg-dark input.form-control {
  background-color: #2d3748;
  border-color: #4a5568;
  color: white;
}

.modal-content.bg-dark input.form-control:focus {
  background-color: #2d3748;
  border-color: #63b3ed;
  color: white;
}

/* Style pour le code dans l'alerte */
code {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 0.2rem;
  font-size: 0.9em;
}

.modal-content.bg-dark code {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Animation pour l'apparition du modal */
.modal-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

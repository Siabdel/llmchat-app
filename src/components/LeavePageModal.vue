
<template>
  <div
    class="modal fade show d-block"
    tabindex="-1"
    style="background-color: rgba(0, 0, 0, 0.5)"
    v-if="modelValue"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" :class="darkMode ? 'bg-dark text-white' : ''">
        <div class="modal-header" :class="darkMode ? 'border-dark' : 'border-light'">
          <h5 class="modal-title">
            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
            Quitter la page ?
          </h5>
          <button
            type="button"
            class="btn-close"
            :class="darkMode ? 'btn-close-white' : ''"
            @click="$emit('cancel')"
          ></button>
        </div>
        <div class="modal-body">
          <p>
            Vous avez des conversations en cours. Si vous quittez la page, vous perdrez toutes les modifications non sauvegardées.
          </p>
          <p class="mb-0">Voulez-vous vraiment quitter ?</p>
        </div>
        <div class="modal-footer" :class="darkMode ? 'border-dark' : 'border-light'">
          <button
            type="button"
            class="btn btn-secondary"
            @click="$emit('cancel')"
          >
            Annuler
          </button>
          <button
            type="button"
            class="btn btn-danger"
            @click="$emit('confirm')"
          >
            <i class="fas fa-door-open me-1"></i>
            Quitter
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LeavePageModal',
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel']
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

/* Style pour le bouton de fermeture en mode sombre */
.btn-close-white {
  filter: invert(1);
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

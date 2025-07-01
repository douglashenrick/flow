// Configuração básica
const APP_CONFIG = {
  STORAGE_KEY: "flow_tasks",
  REGEX_EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  REGEX_DATE: /^\d{4}-\d{2}-\d{2}$/,
};

// Estado global
let tasks = [];
let currentFilter = "all";

// Utilitários básicos
const utils = {
  generateId: () => Date.now().toString(36),

  formatDate: (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR");
  },

  getRelativeTime: (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    if (diffDays === -1) return "Ontem";
    if (diffDays > 1) return `Em ${diffDays} dias`;
    if (diffDays < -1) return `${Math.abs(diffDays)} dias atrás`;

    return utils.formatDate(dateStr);
  },

  isOverdue: (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    return dueDate < today;
  },

  sanitize: (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  notify: (message) => {
    const notification = document.createElement("div");
    notification.className = "alert alert-success position-fixed";
    notification.style.cssText = "top: 100px; right: 20px; z-index: 9999;";
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  },
};

// Storage simples
const storage = {
  save: () =>
    localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(tasks)),
  load: () => {
    const data = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
    return data
      ? JSON.parse(data)
      : [
          {
            id: "1",
            title: "Estudar para prova de matemática",
            description: "Revisar capítulos 1-3",
            category: "Acadêmico",
            priority: "high",
            dueDate: "2025-01-20",
            status: "pending",
          },
          {
            id: "2",
            title: "Finalizar projeto da disciplina",
            description: "Sistema de tarefas",
            category: "Acadêmico",
            priority: "high",
            dueDate: "2025-01-15",
            status: "completed",
          },
        ];
  },
};

// Validação simples
const validation = {
  validateField: (field) => {
    const errors = [];
    const value = field.value.trim();

    if (field.required && !value) {
      errors.push("Campo obrigatório");
    }

    if (
      field.type === "email" &&
      value &&
      !APP_CONFIG.REGEX_EMAIL.test(value)
    ) {
      errors.push("Email inválido");
    }

    if (field.type === "date" && value) {
      if (!APP_CONFIG.REGEX_DATE.test(value)) {
        errors.push("Data inválida");
      } else {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          errors.push("Data deve ser futura");
        }
      }
    }

    return errors;
  },

  showFeedback: (field, errors) => {
    const feedback = field.parentElement.querySelector(".form-feedback");
    field.classList.remove("is-invalid", "is-valid");

    if (feedback) {
      if (errors.length > 0) {
        field.classList.add("is-invalid");
        feedback.textContent = errors[0];
      } else if (field.value.trim()) {
        field.classList.add("is-valid");
        feedback.textContent = "";
      }
    }
  },

  validateForm: (form) => {
    let isValid = true;
    const fields = form.querySelectorAll("input[required], textarea[required]");

    fields.forEach((field) => {
      const errors = validation.validateField(field);
      validation.showFeedback(field, errors);
      if (errors.length > 0) isValid = false;
    });

    return isValid;
  },
};

// Gerenciador de tarefas simplificado
const taskManager = {
  init: () => {
    tasks = storage.load();
    taskManager.render();
    taskManager.updateStats();
  },

  create: (data) => {
    const task = {
      id: utils.generateId(),
      title: data.title,
      description: data.description || "",
      category: data.category || "Acadêmico",
      priority: data.priority || "medium",
      dueDate: data.dueDate || null,
      status: "pending",
    };

    tasks.push(task);
    storage.save();
    taskManager.render();
    taskManager.updateStats();
    utils.notify("Tarefa criada!");
  },

  toggle: (id) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.status = task.status === "completed" ? "pending" : "completed";
      storage.save();
      taskManager.render();
      taskManager.updateStats();
    }
  },

  delete: (id) => {
    if (confirm("Excluir tarefa?")) {
      tasks = tasks.filter((t) => t.id !== id);
      storage.save();
      taskManager.render();
      taskManager.updateStats();
      utils.notify("Tarefa excluída!");
    }
  },

  filter: (status) => {
    currentFilter = status;
    taskManager.render();
  },

  getFiltered: () => {
    return currentFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === currentFilter);
  },

  render: () => {
    const container = document.getElementById("tasks-container");
    if (!container) return;

    const filtered = taskManager.getFiltered();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <h4 class="text-muted">Nenhuma tarefa encontrada</h4>
          <button class="btn btn-primary-custom" data-bs-toggle="modal" data-bs-target="#taskModal">
            <i class="fas fa-plus"></i> Nova Tarefa
          </button>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map(
        (task) => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h5 class="${task.status === "completed" ? "text-decoration-line-through text-muted" : ""}">${utils.sanitize(task.title)}</h5>
              ${task.description ? `<p class="text-muted small">${utils.sanitize(task.description)}</p>` : ""}
              <div class="mb-2">
                <span class="badge bg-${task.priority === "high" ? "danger" : task.priority === "medium" ? "warning" : "success"}">${task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}</span>
                <span class="badge bg-secondary ms-1">${task.category}</span>
              </div>
              ${
                task.dueDate
                  ? `
                <small class="text-${utils.isOverdue(task.dueDate) && task.status !== "completed" ? "danger" : "muted"} d-block">
                  📅 ${utils.getRelativeTime(task.dueDate)}
                  ${utils.isOverdue(task.dueDate) && task.status !== "completed" ? ' <span class="badge bg-danger">Atrasada</span>' : ""}
                </small>
              `
                  : ""
              }
            </div>
            <div class="btn-group-vertical">
              <button class="btn btn-sm btn-outline-primary" onclick="taskManager.toggle('${task.id}')">
                <i class="fas fa-${task.status === "completed" ? "undo" : "check"}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="taskManager.delete('${task.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  },

  updateStats: () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = total - completed;

    const updateStat = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    updateStat("stat-total", total);
    updateStat("stat-pending", pending);
    updateStat("stat-completed", completed);
  },
};

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  // Validação em tempo real
  document.addEventListener("input", function (e) {
    if (e.target.matches("input, textarea")) {
      const errors = validation.validateField(e.target);
      validation.showFeedback(e.target, errors);
    }
  });

  // Formulário de tarefas
  const taskForm = document.getElementById("task-form");
  if (taskForm) {
    taskForm.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!validation.validateForm(this)) return;

      const formData = new FormData(this);
      taskManager.create({
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        priority: formData.get("priority"),
        dueDate: formData.get("dueDate"),
      });

      this.reset();
      this.querySelectorAll(".form-control").forEach((field) =>
        field.classList.remove("is-valid", "is-invalid"),
      );

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("taskModal"),
      );
      if (modal) modal.hide();
    });
  }

  // Filtros simples
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", function () {
      const filter = this.dataset.filter;
      taskManager.filter(filter);

      // Atualiza botões ativos
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Inicia aplicação
  taskManager.init();
});

// Exports para HTML
window.taskManager = taskManager;

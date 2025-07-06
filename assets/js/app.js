const APP_CONFIG = {
  STORAGE_KEY: "flow_tasks",
  REGEX_EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  REGEX_DATE: /^\d{2}\/\d{2}\/\d{4}$/,
};

let tasks = [];
let currentFilter = "all";

const utils = {
  generateId: () => Date.now().toString(36),

  getRelativeTime: (dateStr) => {
    if (!dateStr) return "";
    const diffDays = Math.ceil(
      (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Amanhã";
    if (diffDays === -1) return "Ontem";
    if (diffDays > 1) return `Em ${diffDays} dias`;
    if (diffDays < -1) return `${Math.abs(diffDays)} dias atrás`;

    return new Date(dateStr).toLocaleDateString("pt-BR");
  },

  isOverdue: (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) < today;
  },

  notify: (message) => {
    $('<div class="alert alert-success notification-success">')
      .text(message)
      .appendTo("body")
      .delay(3000)
      .fadeOut();
  },
};

// Storage
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
          title: "Finalizar projeto da disciplina",
          description: "Sistema de tarefas",
          category: "Acadêmico",
          priority: "high",
          dueDate: "2025-07-06",
          status: "completed",
        },
      ];
  },
};

// Validação
const validation = {
  validateField: (field) => {
    const value = field.value.trim();
    if (field.required && !value) return ["Campo obrigatório"];
    if (field.type === "email" && value && !APP_CONFIG.REGEX_EMAIL.test(value))
      return ["Email inválido"];

    if (field.id === "task-due-date" && value) {
      if (!APP_CONFIG.REGEX_DATE.test(value))
        return ["Data inválida (use dd/mm/aaaa)"];
      const [day, month, year] = value.split("/");
      const selectedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) return ["Data deve ser futura"];
    }
    return [];
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
    form
      .querySelectorAll("input[required], textarea[required]")
      .forEach((field) => {
        const errors = validation.validateField(field);
        validation.showFeedback(field, errors);
        if (errors.length > 0) isValid = false;
      });
    return isValid;
  },
};

// Gerenciador de tarefas
const taskManager = {
  init: () => {
    tasks = storage.load();
    taskManager.render();
    taskManager.updateStats();
  },

  create: (data) => {
    let dueDate = data.dueDate || null;

    // Converte data
    if (dueDate && APP_CONFIG.REGEX_DATE.test(dueDate)) {
      const [day, month, year] = dueDate.split("/");
      dueDate = `${year}-${month}-${day}`;
    }

    const task = {
      id: utils.generateId(),
      title: data.title,
      description: data.description || "",
      category: data.category || "Acadêmico",
      priority: data.priority || "medium",
      dueDate: dueDate,
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
              <h5 class="${task.status === "completed" ? "text-decoration-line-through text-muted" : ""}">${task.title}</h5>
              ${task.description ? `<p class="text-muted small">${task.description}</p>` : ""}
              <div class="mb-2">
                <span class="badge bg-${task.priority === "high" ? "danger" : task.priority === "medium" ? "warning" : "success"}">${task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}</span>
                <span class="badge bg-secondary ms-1">${task.category}</span>
              </div>
              ${task.dueDate
            ? `
                <small class="text-${utils.isOverdue(task.dueDate) && task.status !== "completed" ? "danger" : "muted"} d-block">
                  ${utils.getRelativeTime(task.dueDate)}
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

document.addEventListener("DOMContentLoaded", function () {
  // Validação
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
  $(document).ready(() => {
    $("[data-filter]").click(function () {
      $(this).addClass("active").siblings().removeClass("active");
      taskManager.filter($(this).data("filter"));
    });
  });

  // Inicia aplicação
  taskManager.init();

  // jQuery Mask Plugin para campo de data
  if ($("#task-due-date").length) {
    $("#task-due-date").mask("00/00/0000", {
      placeholder: "dd/mm/aaaa",
      translation: {
        0: { pattern: /[0-9]/ },
      },
    });
  }
});
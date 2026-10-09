

const STORAGE_KEY = "painel_tarefas_v1";

const DEFAULT_TASKS = [];

/* =========================================================
   02. ESTADO DA APLICAÇÃO
   ========================================================= */

let tasks = [];
let editingTaskId = null;

let filters = {
    search: "",
    status: "all",
    category: "all",
    priority: "all",
    period: "all"
};

/* =========================================================
   03. ELEMENTOS DO DOM
   ========================================================= */

const elements = {
    headerDate: document.querySelector(".header-date time"),

    taskSearch: document.querySelector("#task-search"),
    statusFilter: document.querySelector("#status-filter"),
    categoryFilter: document.querySelector("#category-filter"),
    priorityFilter: document.querySelector("#priority-filter"),
    periodFilter: document.querySelector("#period-filter"),

    clearFiltersButton: document.querySelector("#clear-filters-button"),
    newTaskButton: document.querySelector("#new-task-button"),
    openModalButton: document.querySelector("#open-task-modal-btn"),
    filterTasksButton: document.querySelector("#filter-tasks-button"),

    // Modal
    taskModal: document.querySelector("#task-modal"),
    modalBackdrop: document.querySelector("#modal-backdrop"),
    closeModalButton: document.querySelector("#close-task-modal-btn"),
    cancelModalButton: document.querySelector("#cancel-task-modal-btn"),

    newTaskSection: document.querySelector("#new-task-section"),
    newTaskForm: document.querySelector(".new-task-form"),
    quickTaskForm: document.querySelector(".quick-task-form"),

    taskTitle: document.querySelector("#task-title"),
    taskCategory: document.querySelector("#task-category"),
    taskDescription: document.querySelector("#task-description"),
    taskPriority: document.querySelector("#task-priority"),
    taskStatus: document.querySelector("#task-status"),
    taskDueDate: document.querySelector("#task-due-date"),
    taskDueTime: document.querySelector("#task-due-time"),
    taskType: document.querySelector("#task-type"),
    taskEstimatedTime: document.querySelector("#task-estimated-time"),
    taskNotes: document.querySelector("#task-notes"),

    quickTaskTitle: document.querySelector("#quick-task-title"),
    quickTaskCategory: document.querySelector("#quick-task-category"),
    quickTaskPriority: document.querySelector("#quick-task-priority"),
    quickTaskDate: document.querySelector("#quick-task-date"),
    quickTaskTime: document.querySelector("#quick-task-time"),

    taskLists: {
        important: document.querySelector(".important-task-list"),
        today: document.querySelector(".today-tasks .task-list"),
        upcoming: document.querySelector(".upcoming-tasks .task-list"),
        completed: document.querySelector(".completed-tasks .task-list")
    },

    counts: {
        important: document.querySelector(".important-tasks .task-count"),
        today: document.querySelector(".today-tasks .task-count"),
        completed: document.querySelector(".completed-tasks .task-count")
    },

    overviewCards: document.querySelectorAll(".overview-card"),

    productivityPercentage: document.querySelector(".productivity-percentage"),
    progressBar: document.querySelector(".progress-bar"),
    progressValue: document.querySelector(".progress-value"),
    progressDescription: document.querySelector(".progress-description"),

    categoryList: document.querySelector(".category-list"),
    distributionList: document.querySelector(".distribution-list")
};

/* =========================================================
   04. INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadTasks();
    normalizeTasks();
    bindEvents();
    updateAll();

    updateHeaderDateTime();
    setInterval(updateHeaderDateTime, 60000);
});

/* =========================================================
   05. ATUALIZAÇÃO DA DATA E HORA DO CABEÇALHO
   ========================================================= */

function updateHeaderDateTime() {
    if (!elements.headerDate) return;

    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    let formattedDate = now.toLocaleDateString('pt-BR', options);
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    elements.headerDate.setAttribute("datetime", now.toISOString());
    elements.headerDate.textContent = `${formattedDate} — ${hours}:${minutes}`;
}

/* =========================================================
   06. LOCAL STORAGE
   ========================================================= */

function loadTasks() {
    try {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        } else {
            tasks = structuredClone(DEFAULT_TASKS);
            saveTasks();
        }
    } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        tasks = structuredClone(DEFAULT_TASKS);
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Erro ao salvar tarefas:", error);
    }
}

/* =========================================================
   07. NORMALIZAÇÃO DE STATUS
   ========================================================= */

function normalizeTasks() {
    const today = getTodayString();

    tasks.forEach(task => {
        if (
            task.status !== "completed" &&
            task.dueDate &&
            task.dueDate < today
        ) {
            task.status = "overdue";
        }
    });

    saveTasks();
}

/* =========================================================
   08. EVENTOS
   ========================================================= */

function bindEvents() {
    /* Pesquisa */
    elements.taskSearch?.addEventListener("input", event => {
        filters.search = event.target.value.trim().toLowerCase();
        updateTaskLists();
    });

    /* Filtros */
    elements.statusFilter?.addEventListener("change", event => {
        filters.status = event.target.value;
        updateTaskLists();
    });

    elements.categoryFilter?.addEventListener("change", event => {
        filters.category = event.target.value;
        updateTaskLists();
    });

    elements.priorityFilter?.addEventListener("change", event => {
        filters.priority = event.target.value;
        updateTaskLists();
    });

    elements.periodFilter?.addEventListener("change", event => {
        filters.period = event.target.value;
        updateTaskLists();
    });

    /* Limpar filtros */
    elements.clearFiltersButton?.addEventListener("click", clearFilters);

    /* Botões para abrir Modal de Nova Tarefa (Captura TODOS os botões de criação) */
    document.querySelectorAll("#new-task-button, #open-task-modal-btn").forEach(button => {
        button.addEventListener("click", openNewTaskForm);
    });

    /* Fechar Modal */
    elements.closeModalButton?.addEventListener("click", closeTaskModal);
    elements.cancelModalButton?.addEventListener("click", closeTaskModal);
    elements.modalBackdrop?.addEventListener("click", closeTaskModal);

    /* Botão de Rolar para Filtros */
    elements.filterTasksButton?.addEventListener("click", () => {
        document.querySelector(".task-filters")?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    /* Formulário principal (Envio dentro do Modal) */
    elements.newTaskForm?.addEventListener("submit", handleTaskFormSubmit);

    /* Formulário rápido (Sidebar) */
    elements.quickTaskForm?.addEventListener("submit", handleQuickTaskSubmit);

    /* Reset do formulário */
    elements.newTaskForm?.addEventListener("reset", () => {
        editingTaskId = null;
        setTimeout(() => {
            updateFormMode();
        }, 0);
    });

    /* Eventos dos cards (Concluir, Editar, Eliminar) */
    document.addEventListener("change", handleCheckboxChange);
    document.addEventListener("click", handleDynamicActions);

    /* Atalhos de Teclado */
    document.addEventListener("keydown", handleKeyboardShortcuts);
}

/* =========================================================
   09. CONTROLE DO MODAL
   ========================================================= */

function openTaskModal() {
    if (elements.taskModal) {
        elements.taskModal.removeAttribute("hidden");
    }
}

function closeTaskModal() {
    if (elements.taskModal) {
        elements.taskModal.setAttribute("hidden", "");
    }
    editingTaskId = null;
    elements.newTaskForm?.reset();
    updateFormMode();
}

/* =========================================================
   10. ATUALIZAÇÃO GERAL
   ========================================================= */

function updateAll() {
    updateTaskLists();
    updateOverview();
    updateProgress();
    updateCategories();
    updateDistribution();
}

/* =========================================================
   11. FILTROS
   ========================================================= */

function getFilteredTasks() {
    return tasks.filter(task => {
        const matchesSearch =
            !filters.search ||
            task.title.toLowerCase().includes(filters.search) ||
            task.description.toLowerCase().includes(filters.search);

        const matchesStatus =
            filters.status === "all" ||
            task.status === filters.status;

        const matchesCategory =
            filters.category === "all" ||
            task.category === filters.category;

        const matchesPriority =
            filters.priority === "all" ||
            task.priority === filters.priority;

        const matchesPeriod =
            filters.period === "all" ||
            matchesPeriodFilter(task, filters.period);

        return (
            matchesSearch &&
            matchesStatus &&
            matchesCategory &&
            matchesPriority &&
            matchesPeriod
        );
    });
}

function matchesPeriodFilter(task, period) {
    const today = getTodayString();
    const tomorrow = addDays(today, 1);

    if (period === "today") return task.dueDate === today;
    if (period === "tomorrow") return task.dueDate === tomorrow;
    if (period === "week") return isWithinCurrentWeek(task.dueDate);
    if (period === "month") return isWithinCurrentMonth(task.dueDate);

    return true;
}

function clearFilters() {
    filters = {
        search: "",
        status: "all",
        category: "all",
        priority: "all",
        period: "all"
    };

    if (elements.taskSearch) elements.taskSearch.value = "";
    if (elements.statusFilter) elements.statusFilter.value = "all";
    if (elements.categoryFilter) elements.categoryFilter.value = "all";
    if (elements.priorityFilter) elements.priorityFilter.value = "all";
    if (elements.periodFilter) elements.periodFilter.value = "all";

    updateTaskLists();
}

/* =========================================================
   12. RENDERIZAÇÃO DAS LISTAS DE TAREFAS
   ========================================================= */

function updateTaskLists() {
    const filteredTasks = getFilteredTasks();

    const importantTasks = filteredTasks.filter(
        task => task.important && task.status !== "completed"
    );

    const todayTasks = filteredTasks.filter(
        task =>
            task.dueDate === getTodayString() &&
            task.status !== "completed"
    );

    const upcomingTasks = filteredTasks.filter(
        task =>
            task.dueDate > getTodayString() &&
            task.status !== "completed"
    );

    const completedTasks = filteredTasks.filter(
        task => task.status === "completed"
    );

    renderTaskList(
        elements.taskLists.important,
        importantTasks,
        "Nenhuma tarefa importante encontrada."
    );

    renderTaskList(
        elements.taskLists.today,
        todayTasks,
        "Nenhuma tarefa para hoje."
    );

    renderTaskList(
        elements.taskLists.upcoming,
        upcomingTasks,
        "Nenhuma tarefa próxima."
    );

    renderTaskList(
        elements.taskLists.completed,
        completedTasks,
        "Nenhuma tarefa concluída."
    );

    updateTaskCounts(importantTasks, todayTasks, completedTasks);
}

function renderTaskList(container, taskList, emptyMessage) {
    if (!container) return;

    container.innerHTML = "";

    if (taskList.length === 0) {
        container.appendChild(createEmptyState(emptyMessage));
        return;
    }

    const fragment = document.createDocumentFragment();

    taskList
        .sort(sortTasks)
        .forEach(task => {
            fragment.appendChild(createTaskCard(task));
        });

    container.appendChild(fragment);
}

/* =========================================================
   13. CRIAÇÃO DOS CARDS DE TAREFA
   ========================================================= */

function createTaskCard(task) {
    const article = document.createElement("article");

    article.className = [
        "task-card",
        `task-card-${task.status}`,
        task.important ? "task-card-important" : ""
    ].filter(Boolean).join(" ");

    article.dataset.taskId = task.id;

    article.innerHTML = `
        <div class="task-card-main">
            <div class="task-checkbox">
                <input
                    type="checkbox"
                    id="checkbox-${escapeAttribute(task.id)}"
                    data-task-checkbox="${escapeAttribute(task.id)}"
                    ${task.status === "completed" ? "checked" : ""}
                >
                <label for="checkbox-${escapeAttribute(task.id)}">
                    <span class="visually-hidden">
                        ${task.status === "completed"
                            ? "Marcar tarefa como pendente"
                            : "Concluir tarefa"}
                    </span>
                </label>
            </div>

            <div class="task-content">
                <div class="task-title-row">
                    <h4 class="task-title">
                        ${escapeHTML(task.title)}
                    </h4>
                    <span class="task-priority priority-${task.priority}">
                        ${getPriorityLabel(task.priority)}
                    </span>
                </div>

                <p class="task-description">
                    ${escapeHTML(task.description || "Sem descrição.")}
                </p>

                <div class="task-metadata">
                    <span class="task-category">
                        ${getCategoryLabel(task.category)}
                    </span>
                    <time datetime="${task.dueDate}${task.dueTime ? `T${task.dueTime}` : ""}">
                        ${formatTaskDate(task)}
                    </time>
                    <span class="task-status status-${task.status}">
                        ${getStatusLabel(task.status)}
                    </span>
                </div>
            </div>
        </div>

        <div class="task-card-actions">
            <button
                type="button"
                class="task-action"
                data-action="edit"
                data-task-id="${escapeAttribute(task.id)}"
            >
                Editar
            </button>
            <button
                type="button"
                class="task-action"
                data-action="delete"
                data-task-id="${escapeAttribute(task.id)}"
            >
                Excluir
            </button>
        </div>
    `;

    return article;
}

function createEmptyState(message) {
    const element = document.createElement("div");
    element.className = "task-empty-state";
    element.innerHTML = `<p>${escapeHTML(message)}</p>`;
    return element;
}

/* =========================================================
   14. AÇÕES DOS CARDS
   ========================================================= */

function handleCheckboxChange(event) {
    const checkbox = event.target.closest("[data-task-checkbox]");
    if (!checkbox) return;

    const taskId = checkbox.dataset.taskCheckbox;
    const task = findTask(taskId);
    if (!task) return;

    if (checkbox.checked) {
        task.status = "completed";
        task.completedAt = getTodayString();
    } else {
        task.status = determineCurrentStatus(task);
        task.completedAt = null;
    }

    saveTasks();
    updateAll();
}

function handleDynamicActions(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const taskId = actionButton.dataset.taskId;
    const action = actionButton.dataset.action;

    if (action === "edit") editTask(taskId);
    if (action === "delete") deleteTask(taskId);
}

/* =========================================================
   15. FORMULÁRIO PRINCIPAL
   ========================================================= */

function handleTaskFormSubmit(event) {
    event.preventDefault();

    const taskData = getMainFormData();

    if (!validateTaskData(taskData)) return;

    if (editingTaskId) {
        updateExistingTask(taskData);
    } else {
        createTask(taskData);
    }

    closeTaskModal();
    updateAll();

    showNotification("Tarefa salva com sucesso.", "success");
}

function createTask(taskData) {
    const newTask = {
        id: generateTaskId(),
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        status: taskData.status,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        type: taskData.type,
        estimatedTime: taskData.estimatedTime,
        notes: taskData.notes,
        important: taskData.priority === "high",
        completedAt: taskData.status === "completed" ? getTodayString() : null
    };

    tasks.push(newTask);
    saveTasks();
}

function updateExistingTask(taskData) {
    const task = findTask(editingTaskId);
    if (!task) return;

    Object.assign(task, {
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        priority: taskData.priority,
        status: taskData.status,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        type: taskData.type,
        estimatedTime: taskData.estimatedTime,
        notes: taskData.notes,
        completedAt: taskData.status === "completed" ? task.completedAt || getTodayString() : null
    });

    saveTasks();
}

/* =========================================================
   16. FORMULÁRIO RÁPIDO
   ========================================================= */

function handleQuickTaskSubmit(event) {
    event.preventDefault();

    const title = elements.quickTaskTitle?.value.trim();

    if (!title) {
        showNotification("Digite um título para a tarefa.", "error");
        elements.quickTaskTitle?.focus();
        return;
    }

    const task = {
        id: generateTaskId(),
        title,
        description: "",
        category: elements.quickTaskCategory?.value || "personal",
        priority: elements.quickTaskPriority?.value || "medium",
        status: "pending",
        dueDate: elements.quickTaskDate?.value || getTodayString(),
        dueTime: elements.quickTaskTime?.value || "",
        type: "single",
        estimatedTime: "",
        notes: "",
        important: elements.quickTaskPriority?.value === "high",
        completedAt: null
    };

    tasks.push(task);
    saveTasks();

    elements.quickTaskForm.reset();
    updateAll();

    showNotification("Tarefa adicionada.", "success");
}

/* =========================================================
   17. OBTENÇÃO E VALIDAÇÃO DE DADOS
   ========================================================= */

function getMainFormData() {
    return {
        title: elements.taskTitle?.value.trim() || "",
        description: elements.taskDescription?.value.trim() || "",
        category: elements.taskCategory?.value || "",
        priority: elements.taskPriority?.value || "",
        status: elements.taskStatus?.value || "pending",
        dueDate: elements.taskDueDate?.value || "",
        dueTime: elements.taskDueTime?.value || "",
        type: elements.taskType?.value || "single",
        estimatedTime: elements.taskEstimatedTime?.value.trim() || "",
        notes: elements.taskNotes?.value.trim() || ""
    };
}

function validateTaskData(taskData) {
    if (!taskData.title) {
        showNotification("O título da tarefa é obrigatório.", "error");
        elements.taskTitle?.focus();
        return false;
    }

    if (!taskData.category) {
        showNotification("Selecione uma categoria.", "error");
        elements.taskCategory?.focus();
        return false;
    }

    if (!taskData.priority) {
        showNotification("Selecione uma prioridade.", "error");
        elements.taskPriority?.focus();
        return false;
    }

    if (!taskData.dueDate) {
        showNotification("Defina uma data para a tarefa.", "error");
        elements.taskDueDate?.focus();
        return false;
    }

    return true;
}

/* =========================================================
   18. EDIÇÃO E MODAL
   ========================================================= */

function editTask(taskId) {
    const task = findTask(taskId);
    if (!task) return;

    editingTaskId = task.id;

    elements.taskTitle.value = task.title;
    elements.taskDescription.value = task.description || "";
    elements.taskCategory.value = task.category;
    elements.taskPriority.value = task.priority;
    elements.taskStatus.value = task.status;
    elements.taskDueDate.value = task.dueDate;
    elements.taskDueTime.value = task.dueTime || "";
    elements.taskType.value = task.type || "single";
    elements.taskEstimatedTime.value = task.estimatedTime || "";
    elements.taskNotes.value = task.notes || "";

    updateFormMode();
    openTaskModal();

    setTimeout(() => {
        elements.taskTitle.focus();
    }, 150);
}

function updateFormMode() {
    const submitButton = elements.newTaskForm?.querySelector('button[type="submit"]');
    const heading = document.querySelector("#new-task-title");

    if (!submitButton || !heading) return;

    if (editingTaskId) {
        heading.textContent = "Editar tarefa";
        submitButton.textContent = "Salvar alterações";
    } else {
        heading.textContent = "Adicionar nova tarefa";
        submitButton.textContent = "Criar tarefa";
    }
}

function openNewTaskForm() {
    editingTaskId = null;
    elements.newTaskForm?.reset();
    updateFormMode();
    openTaskModal();

    setTimeout(() => {
        elements.taskTitle?.focus();
    }, 150);
}

/* =========================================================
   19. EXCLUSÃO
   ========================================================= */

function deleteTask(taskId) {
    const task = findTask(taskId);
    if (!task) return;

    const confirmed = window.confirm(`Deseja excluir a tarefa "${task.title}"?`);
    if (!confirmed) return;

    tasks = tasks.filter(item => item.id !== taskId);
    saveTasks();
    updateAll();

    showNotification("Tarefa excluída.", "success");
}

/* =========================================================
   20. METRICAS E RESUMOS
   ========================================================= */

function updateOverview() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === "pending" || t.status === "in-progress").length;
    const today = tasks.filter(t => t.dueDate === getTodayString() && t.status !== "completed").length;
    const overdue = tasks.filter(t => t.status === "overdue").length;
    const completed = tasks.filter(t => t.status === "completed").length;

    const values = [total, pending, today, overdue, completed];

    elements.overviewCards.forEach((card, index) => {
        const value = card.querySelector(".overview-card-value strong");
        if (value) value.textContent = values[index];
    });
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (elements.productivityPercentage) {
        elements.productivityPercentage.textContent = `${percentage}%`;
    }

    if (elements.progressValue) {
        elements.progressValue.style.width = `${percentage}%`;
    }

    if (elements.progressBar) {
        elements.progressBar.setAttribute("aria-valuenow", percentage);
    }

    if (elements.progressDescription) {
        elements.progressDescription.textContent = `${completed} de ${total} tarefas foram concluídas.`;
    }
}

function updateCategories() {
    if (!elements.categoryList) return;

    const categories = ["academic", "personal", "project", "fitness", "organization"];

    categories.forEach(category => {
        const count = tasks.filter(t => t.category === category).length;
        const button = elements.categoryList.querySelector(`[data-category="${category}"]`);

        if (button) {
            const countElement = button.querySelector(".category-count");
            if (countElement) countElement.textContent = count;
        }
    });
}

function updateDistribution() {
    if (!elements.distributionList) return;

    const categories = ["academic", "personal", "project", "fitness", "organization"];
    const total = tasks.length;
    const items = elements.distributionList.querySelectorAll(".distribution-item");

    items.forEach((item, index) => {
        const category = categories[index];
        if (!category) return;

        const count = tasks.filter(t => t.category === category).length;
        const percentage = total === 0 ? 0 : Math.round((count / total) * 100);

        const value = item.querySelector("dd");
        if (value) value.textContent = `${percentage}%`;
    });
}

function updateTaskCounts(importantTasks, todayTasks, completedTasks) {
    if (elements.counts.important) {
        elements.counts.important.textContent = `${importantTasks.length} ${importantTasks.length === 1 ? "tarefa" : "tarefas"}`;
    }

    if (elements.counts.today) {
        elements.counts.today.textContent = `${todayTasks.length} ${todayTasks.length === 1 ? "tarefa" : "tarefas"}`;
    }

    if (elements.counts.completed) {
        elements.counts.completed.textContent = `${completedTasks.length} ${completedTasks.length === 1 ? "concluída" : "concluídas"}`;
    }
}

/* =========================================================
   21. UTILITÁRIOS E ORDENAÇÃO
   ========================================================= */

function sortTasks(a, b) {
    const statusOrder = { overdue: 0, "in-progress": 1, pending: 2, completed: 3 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
    }

    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    const dateA = `${a.dueDate} ${a.dueTime || "23:59"}`;
    const dateB = `${b.dueDate} ${b.dueTime || "23:59"}`;

    return dateA.localeCompare(dateB);
}

function findTask(taskId) {
    return tasks.find(task => task.id === taskId);
}

function determineCurrentStatus(task) {
    const today = getTodayString();
    return task.dueDate < today ? "overdue" : "pending";
}

function generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function getTodayString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(dateString, amount) {
    const date = parseLocalDate(dateString);
    date.setDate(date.getDate() + amount);
    return formatDateToString(date);
}

function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isWithinCurrentWeek(dateString) {
    const date = parseLocalDate(dateString);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const differenceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + differenceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return date >= monday && date <= sunday;
}

function isWithinCurrentMonth(dateString) {
    const date = parseLocalDate(dateString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function formatTaskDate(task) {
    if (!task.dueDate) return "Sem prazo";

    const today = getTodayString();
    const tomorrow = addDays(today, 1);

    if (task.status === "overdue") {
        const date = parseLocalDate(task.dueDate);
        return `Atrasada · ${date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
    }

    if (task.dueDate === today) {
        return task.dueTime ? `Hoje, ${task.dueTime}` : "Hoje";
    }

    if (task.dueDate === tomorrow) {
        return task.dueTime ? `Amanhã, ${task.dueTime}` : "Amanhã";
    }

    const date = parseLocalDate(task.dueDate);
    const formattedDate = date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

    return task.dueTime ? `${formattedDate}, ${task.dueTime}` : formattedDate;
}

function getCategoryLabel(category) {
    const labels = {
        academic: "Acadêmico",
        personal: "Pessoal",
        project: "Projeto",
        fitness: "Exercícios",
        organization: "Organização"
    };
    return labels[category] || "Sem categoria";
}

function getPriorityLabel(priority) {
    const labels = { high: "Alta", medium: "Média", low: "Baixa" };
    return labels[priority] || "Normal";
}

function getStatusLabel(status) {
    const labels = {
        pending: "Pendente",
        "in-progress": "Em andamento",
        completed: "Concluída",
        overdue: "Atrasada"
    };
    return labels[status] || "Pendente";
}

/* =========================================================
   22. NOTIFICAÇÕES E TECLAS DE ATALHO
   ========================================================= */

function showNotification(message, type = "success") {
    let container = document.querySelector(".notification-container");

    if (!container) {
        container = document.createElement("div");
        container.className = "notification-container";
        container.style.position = "fixed";
        container.style.right = "24px";
        container.style.bottom = "24px";
        container.style.zIndex = "9999";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "8px";
        document.body.appendChild(container);
    }

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.padding = "12px 16px";
    notification.style.background = "#151917";
    notification.style.border = "1px solid #303632";
    notification.style.borderRadius = "8px";
    notification.style.color = type === "error" ? "#d66a6a" : "#27de80";
    notification.style.fontSize = "14px";
    notification.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";
    notification.style.opacity = "0";
    notification.style.transform = "translateY(8px)";
    notification.style.transition = "opacity .18s ease, transform .18s ease";

    container.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
    });

    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(8px)";
        setTimeout(() => notification.remove(), 200);
    }, 2500);
}

function handleKeyboardShortcuts(event) {
    if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        elements.taskSearch?.focus();
    }

    if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewTaskForm();
    }

    if (event.key === "Escape" && elements.taskModal && !elements.taskModal.hasAttribute("hidden")) {
        closeTaskModal();
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value);
}

/* =========================================================
   23. EXPOSIÇÃO CONTROLADA
   ========================================================= */

window.TaskManager = {
    getTasks: () => [...tasks],
    addTask: createTask,
    deleteTask,
    editTask,
    refresh: updateAll,
    clearFilters
};
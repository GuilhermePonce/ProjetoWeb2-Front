import "./styles.css";
import { getBalances } from "./balances";
import {
  changePassword,
  getMe,
  isAuthenticated,
  login,
  logout,
  register,
  resetPassword,
  type User,
} from "./auth";
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
  type Expense,
} from "./expenses";
import { createGroup, deleteGroup, getGroup, listGroups, updateGroup, type Group } from "./groups";
import { addRoute, navigate, startRouter } from "./router";
import { listUsers } from "./users";

const app = document.querySelector<HTMLDivElement>("#app")!;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function layout(content: string): void {
  app.innerHTML = `<main class="app-shell">${content}</main>`;
}

function authLayout(title: string, content: string): void {
  layout(`
    <section class="auth-page">
      <div class="brand-panel">
        <span class="brand-mark">DA</span>
        <h1>DivideAi</h1>
        <p>Controle contas compartilhadas, veja saldos e combine pagamentos com clareza.</p>
      </div>
      <section class="panel auth-card">
        <h2>${title}</h2>
        ${content}
      </section>
    </section>
  `);
}

function dashboardLayout(user: User, content: string): void {
  layout(`
    <header class="topbar">
      <a class="brand" href="#/dashboard"><span class="brand-mark small">DA</span>DivideAi</a>
      <nav>
        <a href="#/dashboard">Grupos</a>
        <a href="#/change-password">Senha</a>
        <button class="ghost" id="logoutButton" type="button">Sair</button>
      </nav>
    </header>
    <section class="workspace">
      <div class="page-title">
        <div>
          <p class="eyebrow">Ola, ${escapeHtml(user.username)}</p>
          <h1>Suas divisoes</h1>
        </div>
      </div>
      ${content}
    </section>
  `);
  document.querySelector("#logoutButton")?.addEventListener("click", logout);
}

function requireAuth(): boolean {
  if (!isAuthenticated()) {
    navigate("/login");
    return false;
  }
  return true;
}

function showMessage(kind: "success" | "error", text: string): string {
  return `<p class="message ${kind}">${escapeHtml(text)}</p>`;
}

function readForm(form: HTMLFormElement): FormData {
  return new FormData(form);
}

function checkedNumbers(name: string): number[] {
  return [...document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map((input) =>
    Number(input.value),
  );
}

async function renderLogin(): Promise<void> {
  authLayout(
    "Entrar",
    `
      <form id="loginForm" class="form">
        <label>Usuario ou e-mail<input name="username" required autocomplete="username"></label>
        <label>Senha<input name="password" type="password" required autocomplete="current-password"></label>
        <button type="submit">Entrar</button>
      </form>
      <div class="link-row">
        <a href="#/register">Criar conta</a>
        <a href="#/forgot-password">Esqueci minha senha</a>
      </div>
      <div id="formMessage"></div>
    `,
  );

  document.querySelector<HTMLFormElement>("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = readForm(event.currentTarget as HTMLFormElement);
    try {
      await login(String(form.get("username")), String(form.get("password")));
      navigate("/dashboard");
    } catch (error) {
      setInlineMessage(error);
    }
  });
}

async function renderRegister(): Promise<void> {
  authLayout(
    "Cadastro",
    `
      <form id="registerForm" class="form">
        <label>Nome de usuario<input name="username" required autocomplete="username"></label>
        <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
        <label>Senha<input name="password" type="password" required autocomplete="new-password"></label>
        <label>Confirmacao de senha<input name="passwordConfirm" type="password" required autocomplete="new-password"></label>
        <button type="submit">Criar conta</button>
      </form>
      <div class="link-row"><a href="#/login">Voltar para login</a></div>
      <div id="formMessage"></div>
    `,
  );

  document.querySelector<HTMLFormElement>("#registerForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = readForm(event.currentTarget as HTMLFormElement);
    try {
      await register(
        String(form.get("username")),
        String(form.get("email")),
        String(form.get("password")),
        String(form.get("passwordConfirm")),
      );
      app.querySelector("#formMessage")!.innerHTML = showMessage("success", "Conta criada. Agora faca login.");
    } catch (error) {
      setInlineMessage(error);
    }
  });
}

async function renderForgotPassword(): Promise<void> {
  authLayout(
    "Redefinir senha",
    `
      <form id="resetForm" class="form">
        <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
        <button type="submit">Solicitar redefinicao</button>
      </form>
      <div class="link-row"><a href="#/login">Voltar para login</a></div>
      <div id="formMessage"></div>
    `,
  );

  document.querySelector<HTMLFormElement>("#resetForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = readForm(event.currentTarget as HTMLFormElement);
    try {
      const response = await resetPassword(String(form.get("email")));
      app.querySelector("#formMessage")!.innerHTML = showMessage("success", response.detail);
    } catch (error) {
      setInlineMessage(error);
    }
  });
}

async function renderDashboard(): Promise<void> {
  if (!requireAuth()) return;
  try {
    const [user, groups] = await Promise.all([getMe(), listGroups()]);
    dashboardLayout(
      user,
      `
        <div class="actions-bar">
          <a class="button" href="#/groups/new">Novo grupo</a>
        </div>
        <section class="grid">
          ${
            groups.length
              ? groups.map(groupCard).join("")
              : `<div class="empty">Nenhum grupo criado ainda.</div>`
          }
        </section>
      `,
    );
    document.querySelectorAll<HTMLButtonElement>("[data-delete-expense]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir esta despesa?")) return;
        await deleteExpense(Number(button.dataset.deleteExpense));
        navigate(`/groups/${groupId}`);
      });
    });
  } catch (error) {
    renderError(error);
  }
}

async function renderGroupForm(params: Record<string, string>): Promise<void> {
  if (!requireAuth()) return;
  const isEdit = params.id !== undefined;
  try {
    const [user, users, group] = await Promise.all([
      getMe(),
      listUsers(),
      isEdit ? getGroup(Number(params.id)) : Promise.resolve<Group | null>(null),
    ]);
    const selected = new Set(group?.member_details.map((member) => member.id) || [user.id]);

    dashboardLayout(
      user,
      `
        <section class="panel narrow">
          <h2>${isEdit ? "Editar grupo" : "Novo grupo"}</h2>
          <form id="groupForm" class="form">
            <label>Nome do grupo<input name="name" required value="${escapeAttr(group?.name || "")}"></label>
            <label>Descricao<textarea name="description">${escapeHtml(group?.description || "")}</textarea></label>
            <fieldset>
              <legend>Participantes</legend>
              <div class="check-grid">${users.map((member) => check("members", member, selected.has(member.id))).join("")}</div>
            </fieldset>
            <div class="button-row">
              <button type="submit">${isEdit ? "Salvar alteracoes" : "Criar grupo"}</button>
              ${isEdit ? `<button class="danger" id="deleteGroup" type="button">Excluir grupo</button>` : ""}
              <a class="ghost-link" href="#/dashboard">Cancelar</a>
            </div>
          </form>
          <div id="formMessage"></div>
        </section>
      `,
    );

    document.querySelector<HTMLFormElement>("#groupForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = readForm(event.currentTarget as HTMLFormElement);
      const payload = {
        name: String(form.get("name")),
        description: String(form.get("description")),
        members: checkedNumbers("members"),
      };
      try {
        const saved = isEdit ? await updateGroup(Number(params.id), payload) : await createGroup(payload);
        navigate(`/groups/${saved.id}`);
      } catch (error) {
        setInlineMessage(error);
      }
    });

    document.querySelector("#deleteGroup")?.addEventListener("click", async () => {
      if (!confirm("Excluir este grupo e suas despesas?")) return;
      await deleteGroup(Number(params.id));
      navigate("/dashboard");
    });
  } catch (error) {
    renderError(error);
  }
}

async function renderGroupDetails(params: Record<string, string>): Promise<void> {
  if (!requireAuth()) return;
  const groupId = Number(params.id);
  try {
    const [user, group, expenses, balances] = await Promise.all([
      getMe(),
      getGroup(groupId),
      listExpenses(groupId),
      getBalances(groupId),
    ]);
    dashboardLayout(
      user,
      `
        <section class="group-head">
          <div>
            <p class="eyebrow">Grupo</p>
            <h2>${escapeHtml(group.name)}</h2>
            <p>${escapeHtml(group.description || "Sem descricao.")}</p>
          </div>
          <div class="button-row">
            <a class="button" href="#/groups/${group.id}/expenses/new">Adicionar despesa</a>
            <a class="secondary" href="#/groups/${group.id}/edit">Editar grupo</a>
          </div>
        </section>

        <section class="panel">
          <h3>Participantes</h3>
          <div class="pill-row">${group.member_details.map((member) => `<span class="pill">${escapeHtml(member.username)}</span>`).join("")}</div>
        </section>

        <section class="panel">
          <h3>Despesas</h3>
          ${expenseTable(expenses)}
        </section>

        <section class="split">
          <div class="panel">
            <h3>Saldos</h3>
            <div class="balance-list">
              ${balances.balances
                .map(
                  (item) => `
                  <div class="balance-item ${item.balance >= 0 ? "positive" : "negative"}">
                    <strong>${escapeHtml(item.user)}</strong>
                    <span>Pago ${currency.format(item.paid)}</span>
                    <span>Devido ${currency.format(item.owed)}</span>
                    <b>${currency.format(item.balance)}</b>
                  </div>
                `,
                )
                .join("")}
            </div>
          </div>
          <div class="panel">
            <h3>Pagamentos sugeridos</h3>
            ${
              balances.settlements.length
                ? balances.settlements
                    .map(
                      (item) =>
                        `<p class="settlement"><b>${escapeHtml(item.from_user)}</b> paga <b>${currency.format(item.amount)}</b> para <b>${escapeHtml(item.to_user)}</b></p>`,
                    )
                    .join("")
                : `<p class="empty compact">Tudo certo por aqui.</p>`
            }
          </div>
        </section>
      `,
    );
  } catch (error) {
    renderError(error);
  }
}

async function renderExpenseForm(params: Record<string, string>): Promise<void> {
  if (!requireAuth()) return;
  const groupId = Number(params.groupId);
  const isEdit = params.expenseId !== undefined;
  try {
    const [user, group, expense] = await Promise.all([
      getMe(),
      getGroup(groupId),
      isEdit ? getExpense(Number(params.expenseId)) : Promise.resolve<Expense | null>(null),
    ]);
    const participantIds = new Set(expense?.participant_details.map((member) => member.id) || group.member_details.map((member) => member.id));

    dashboardLayout(
      user,
      `
        <section class="panel narrow">
          <h2>${isEdit ? "Editar despesa" : "Nova despesa"}</h2>
          <form id="expenseForm" class="form">
            <label>Titulo da despesa<input name="title" required value="${escapeAttr(expense?.title || "")}"></label>
            <label>Descricao<textarea name="description">${escapeHtml(expense?.description || "")}</textarea></label>
            <label>Valor<input name="amount" type="number" min="0.01" step="0.01" required value="${escapeAttr(expense?.amount || "")}"></label>
            <label>Usuario que pagou
              <select name="paid_by" required>
                ${group.member_details.map((member) => `<option value="${member.id}" ${expense?.paid_by === member.id ? "selected" : ""}>${escapeHtml(member.username)}</option>`).join("")}
              </select>
            </label>
            <fieldset>
              <legend>Participantes da divisao</legend>
              <div class="check-grid">${group.member_details.map((member) => check("participants", member, participantIds.has(member.id))).join("")}</div>
            </fieldset>
            <div class="button-row">
              <button type="submit">${isEdit ? "Salvar despesa" : "Criar despesa"}</button>
              ${isEdit ? `<button class="danger" id="deleteExpense" type="button">Excluir despesa</button>` : ""}
              <a class="ghost-link" href="#/groups/${groupId}">Cancelar</a>
            </div>
          </form>
          <div id="formMessage"></div>
        </section>
      `,
    );

    document.querySelector<HTMLFormElement>("#expenseForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = readForm(event.currentTarget as HTMLFormElement);
      const payload = {
        group: groupId,
        title: String(form.get("title")),
        description: String(form.get("description")),
        amount: String(form.get("amount")),
        paid_by: Number(form.get("paid_by")),
        participants: checkedNumbers("participants"),
      };
      try {
        if (isEdit) await updateExpense(Number(params.expenseId), payload);
        else await createExpense(payload);
        navigate(`/groups/${groupId}`);
      } catch (error) {
        setInlineMessage(error);
      }
    });

    document.querySelector("#deleteExpense")?.addEventListener("click", async () => {
      if (!confirm("Excluir esta despesa?")) return;
      await deleteExpense(Number(params.expenseId));
      navigate(`/groups/${groupId}`);
    });
  } catch (error) {
    renderError(error);
  }
}

async function renderChangePassword(): Promise<void> {
  if (!requireAuth()) return;
  try {
    const user = await getMe();
    dashboardLayout(
      user,
      `
        <section class="panel narrow">
          <h2>Trocar senha</h2>
          <form id="passwordForm" class="form">
            <label>Senha antiga<input name="oldPassword" type="password" required></label>
            <label>Nova senha<input name="newPassword" type="password" required></label>
            <label>Confirmacao da nova senha<input name="newPasswordConfirm" type="password" required></label>
            <button type="submit">Alterar senha</button>
          </form>
          <div id="formMessage"></div>
        </section>
      `,
    );

    document.querySelector<HTMLFormElement>("#passwordForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = readForm(event.currentTarget as HTMLFormElement);
      try {
        const response = await changePassword(
          String(form.get("oldPassword")),
          String(form.get("newPassword")),
          String(form.get("newPasswordConfirm")),
        );
        app.querySelector("#formMessage")!.innerHTML = showMessage("success", response.detail);
      } catch (error) {
        setInlineMessage(error);
      }
    });
  } catch (error) {
    renderError(error);
  }
}

function groupCard(group: Group): string {
  return `
    <article class="card">
      <h3>${escapeHtml(group.name)}</h3>
      <p>${escapeHtml(group.description || "Sem descricao.")}</p>
      <div class="card-meta">${group.member_details.length} participante(s)</div>
      <a class="stretched" href="#/groups/${group.id}">Abrir grupo</a>
    </article>
  `;
}

function expenseTable(expenses: Expense[]): string {
  if (!expenses.length) return `<p class="empty compact">Nenhuma despesa cadastrada.</p>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Titulo</th>
            <th>Valor</th>
            <th>Pago por</th>
            <th>Participantes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${expenses
            .map(
              (expense) => `
                <tr>
                  <td>${escapeHtml(expense.title)}</td>
                  <td>${currency.format(Number(expense.amount))}</td>
                  <td>${escapeHtml(expense.paid_by_details.username)}</td>
                  <td>${expense.participant_details.map((participant) => escapeHtml(participant.username)).join(", ")}</td>
                  <td class="table-actions">
                    <a href="#/groups/${expense.group}/expenses/${expense.id}/edit">Editar</a>
                    <button class="text-danger" type="button" data-delete-expense="${expense.id}">Excluir</button>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function check(name: string, user: User, selected: boolean): string {
  return `
    <label class="check">
      <input type="checkbox" name="${name}" value="${user.id}" ${selected ? "checked" : ""}>
      <span>${escapeHtml(user.username)}</span>
    </label>
  `;
}

function setInlineMessage(error: unknown): void {
  const target = app.querySelector("#formMessage");
  if (target) target.innerHTML = showMessage("error", error instanceof Error ? error.message : "Erro inesperado.");
}

function renderError(error: unknown): void {
  layout(`<section class="panel narrow">${showMessage("error", error instanceof Error ? error.message : "Erro inesperado.")}</section>`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

addRoute("/login", renderLogin);
addRoute("/register", renderRegister);
addRoute("/forgot-password", renderForgotPassword);
addRoute("/dashboard", renderDashboard);
addRoute("/change-password", renderChangePassword);
addRoute("/groups/new", renderGroupForm);
addRoute("/groups/:id", renderGroupDetails);
addRoute("/groups/:id/edit", renderGroupForm);
addRoute("/groups/:groupId/expenses/new", renderExpenseForm);
addRoute("/groups/:groupId/expenses/:expenseId/edit", renderExpenseForm);

startRouter();

export class QuizController {
  constructor(api, view) {
    this.api = api;
    this.view = view;
    this.game = null;
    this.busy = false;
    view.bind({
      menu: () => view.menu(), lessons: () => this.lessons(),
      help: () => view.help(), start: id => this.start(id),
      answer: id => this.answer(id), next: () => this.next(),
      exit: () => view.confirmExit(() => this.abandon()),
      replay: () => this.start(this.game.lesson_id),
    });
  }

  async init() {
    await this.run(async () => {
      try {
        this.game = await this.api.request('game');
        this.view.game(this.game);
      } catch (error) {
        if (error.status !== 410) throw error;
        this.view.welcome();
      }
    });
  }

  async run(action) {
    if (this.busy) return;
    this.busy = true;
    this.view.setBusy(true);
    this.view.clearError();
    try { await action(); }
    catch (error) {
      if (error.status === 410) {
        this.game = null;
        this.view.menu();
        this.view.error(error.message, () => this.lessons());
      } else if (error.status === 409) {
        this.view.error(error.message, () => this.init());
      } else {
        this.view.error(error.message, () => this.run(action));
      }
    } finally {
      this.busy = false;
      this.view.setBusy(false);
    }
  }

  lessons() {
    return this.run(async () => this.view.lessons(await this.api.request('lessons')));
  }

  start(lessonId) {
    const requestId = crypto.randomUUID();
    return this.run(async () => {
      this.game = await this.api.request('game', { lesson_id: lessonId, request_id: requestId });
      this.view.game(this.game);
    });
  }

  answer(alternativeId) {
    if (!this.game || this.game.feedback || this.game.completed) return;
    const payload = { game_id: this.game.game_id, question_id: this.game.question.id, alternative_id: alternativeId };
    return this.run(async () => {
      this.game = await this.api.request('game/answer', payload);
      this.view.game(this.game);
    });
  }

  next() {
    if (!this.game?.feedback || this.game.completed) return;
    const payload = { game_id: this.game.game_id, question_id: this.game.question.id };
    return this.run(async () => {
      this.game = await this.api.request('game/next', payload);
      this.view.game(this.game);
    });
  }

  abandon() {
    const payload = { game_id: this.game.game_id };
    return this.run(async () => {
      await this.api.request('game/abandon', payload);
      this.game = null;
      await this.api.request('lessons').then(data => this.view.lessons(data));
    });
  }
}

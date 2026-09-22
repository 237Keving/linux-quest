from dataclasses import asdict
from threading import RLock
from uuid import uuid4

from models import GameSession, Result


class GameError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class QuizService:
    def __init__(self, repository):
        self.repository = repository
        self.games = {}
        self.lock = RLock()

    def catalog(self):
        return [dict(id=l.id, title=l.title, description=l.description, symbol=l.symbol,
                     total=len(l.questions)) for l in self.repository.lessons.values()]

    def start(self, owner, lesson_id, request_id):
        with self.lock:
            previous = self.games.get(owner)
            if previous and previous.id == request_id:
                if previous.lesson_id != lesson_id:
                    raise GameError('Identificador já utilizado.', 409)
                return self._snapshot(previous)
            if not self.repository.get(lesson_id):
                raise GameError('Módulo não encontrado.', 404)
            game = GameSession(request_id, lesson_id)
            self.games[owner] = game
            return self._snapshot(game)

    def current(self, owner):
        with self.lock:
            return self._snapshot(self._get(owner))

    def _get(self, owner, game_id=None):
        game = self.games.get(owner)
        if not game:
            raise GameError('A partida não está mais disponível. Inicie uma nova.', 410)
        if game_id is not None and game.id != game_id:
            raise GameError('Esta partida foi substituída. Recarregue para continuar.', 409)
        return game

    def answer(self, owner, game_id, question_id, alternative_id):
        with self.lock:
            game = self._get(owner, game_id)
            lesson = self.repository.get(game.lesson_id)
            question = lesson.questions[game.index]
            if question.id != question_id or game.completed:
                raise GameError('Questão fora de sequência. Recarregue a partida.', 409)
            if alternative_id not in {a.id for a in question.alternatives}:
                raise GameError('Alternativa inválida.')
            if question_id in game.answers:
                if game.answers[question_id] != alternative_id:
                    raise GameError('Esta questão já foi respondida.', 409)
            else:
                game.answers[question_id] = alternative_id
            return self._snapshot(game)

    def advance(self, owner, game_id, question_id):
        with self.lock:
            game = self._get(owner, game_id)
            questions = self.repository.get(game.lesson_id).questions
            # Repetir uma transição já aplicada nunca pula outra pergunta.
            if question_id in game.answers and question_id != questions[game.index].id:
                return self._snapshot(game)
            if question_id != questions[game.index].id or question_id not in game.answers:
                raise GameError('Responda à questão atual antes de avançar.', 409)
            if game.index == len(questions) - 1:
                game.completed = True
            else:
                game.index += 1
            return self._snapshot(game)

    def abandon(self, owner, game_id):
        with self.lock:
            if owner in self.games:
                self._get(owner, game_id)
                del self.games[owner]

    def _snapshot(self, game):
        lesson = self.repository.get(game.lesson_id)
        correct = sum(game.answers.get(q.id) == q.correct_id for q in lesson.questions)
        total = len(lesson.questions)
        data = dict(game_id=game.id, lesson_id=lesson.id, title=lesson.title,
                    total=total, number=game.index + 1, score=correct, answered=len(game.answers),
                    completed=game.completed)
        if game.completed:
            percentage = round(correct / total * 100)
            message = ('Missão perfeita. Terminal dominado!' if percentage == 100 else
                       'Bom trabalho! Continue explorando.' if percentage >= 60 else
                       'Cada tentativa ensina. Vamos praticar mais?')
            data['result'] = asdict(Result(total, correct, total - correct, percentage, message))
            return data
        q = lesson.questions[game.index]
        data['question'] = dict(id=q.id, prompt=q.prompt, command=q.command,
                                alternatives=[asdict(a) for a in q.alternatives])
        if q.id in game.answers:
            selected = game.answers[q.id]
            data['feedback'] = dict(selected_id=selected, correct_id=q.correct_id,
                                    correct=selected == q.correct_id, explanation=q.explanation,
                                    source=q.source)
        return data

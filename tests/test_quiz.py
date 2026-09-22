from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import tempfile
import unittest

from main import create_app
from repositories.lesson_repository import LessonRepository
from services.quiz_service import GameError


class QuizTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(testing=True)
        self.client = self.app.test_client()
        self.service = self.app.extensions['quiz_service']

    def start(self, lesson='arquivos', request_id='partida-1', client=None):
        return (client or self.client).post('/api/game', json={
            'lesson_id': lesson, 'request_id': request_id}).get_json()

    def answer(self, state, alternative):
        return self.client.post('/api/game/answer', json=dict(game_id=state['game_id'],
            question_id=state['question']['id'], alternative_id=alternative))

    def advance(self, state):
        return self.client.post('/api/game/next', json=dict(game_id=state['game_id'],
            question_id=state['question']['id']))

    def test_catalog_and_source_validation(self):
        catalog = self.client.get('/api/lessons').get_json()
        self.assertEqual(len(catalog), 4)
        self.assertEqual(sum(l['total'] for l in catalog), 32)
        for lesson in self.service.repository.lessons.values():
            self.assertEqual(len(lesson.questions), 8)
            for q in lesson.questions:
                self.assertEqual(len(q.alternatives), 4)
                self.assertTrue(q.source['file'].endswith('.pdf'))
                self.assertGreater(q.source['page'], 0)

    def test_no_answer_leak(self):
        state = self.start()
        text = json.dumps(state)
        for forbidden in ('correct_id', 'explanation', 'feedback', 'questions'):
            self.assertNotIn(forbidden, text)

    def test_complete_four_modules_with_mixed_results(self):
        for lesson in self.service.repository.lessons.values():
            state = self.start(lesson.id, lesson.id)
            for index, q in enumerate(lesson.questions):
                chosen = q.correct_id if index % 2 == 0 else next(a.id for a in q.alternatives if a.id != q.correct_id)
                answered = self.answer(state, chosen).get_json()
                self.assertEqual(answered['feedback']['correct'], index % 2 == 0)
                self.assertEqual(answered['feedback']['source'], q.source)
                state = self.advance(answered).get_json()
            self.assertTrue(state['completed'])
            self.assertEqual(state['result']['correct'], 4)
            self.assertEqual(state['result']['errors'], 4)
            self.assertEqual(state['result']['percentage'], 50)

    def test_duplicate_answer_and_reload(self):
        state = self.start()
        q = self.service.repository.get('arquivos').questions[0]
        first = self.answer(state, q.correct_id).get_json()
        second = self.answer(state, q.correct_id).get_json()
        self.assertEqual(first, second)
        wrong = next(a.id for a in q.alternatives if a.id != q.correct_id)
        self.assertEqual(self.answer(state, wrong).status_code, 409)
        self.assertEqual(self.client.get('/api/game').get_json(), first)
        self.assertEqual(first['score'], 1)

    def test_duplicate_next_and_final_next(self):
        state = self.start()
        self.assertEqual(self.advance(state).status_code, 409)
        answered = self.answer(state, 'a').get_json()
        next_state = self.advance(answered).get_json()
        self.assertEqual(next_state, self.advance(answered).get_json())
        state = next_state
        for _ in range(7):
            answered = self.answer(state, 'a').get_json()
            state = self.advance(answered).get_json()
        self.assertTrue(state['completed'])
        self.assertEqual(state, self.advance(answered).get_json())

    def test_restart_and_old_requests(self):
        old = self.start()
        self.answer(old, 'b')
        fresh = self.start(request_id='partida-2')
        self.assertEqual(fresh['score'], 0)
        self.assertEqual(fresh['number'], 1)
        self.assertEqual(self.answer(old, 'b').status_code, 409)
        self.assertEqual(fresh, self.start(request_id='partida-2'))

    def test_sessions_are_isolated_and_restart_is_handled(self):
        self.start()
        other = self.app.test_client()
        self.assertEqual(other.get('/api/game').status_code, 410)
        state = self.start('redes', client=other)
        self.assertEqual(state['lesson_id'], 'redes')
        self.assertEqual(self.client.get('/api/game').get_json()['lesson_id'], 'arquivos')
        self.service.games.clear()
        self.assertEqual(self.client.get('/api/game').status_code, 410)

    def test_invalid_payloads(self):
        for data in (None, [], {}, {'lesson_id': 3}, {'lesson_id': 'x', 'request_id': 'r' * 101}):
            response = self.client.post('/api/game', json=data)
            self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post('/api/game', json={'lesson_id':'missing','request_id':'x'}).status_code,404)
        state = self.start()
        self.assertEqual(self.answer(state, 'rm -rf /').status_code, 400)
        self.assertEqual(self.client.get('/api/game').get_json()['score'], 0)

    def test_concurrent_duplicate_responses(self):
        self.service.start('owner', 'arquivos', 'r')
        q = self.service.repository.get('arquivos').questions[0]
        with ThreadPoolExecutor(max_workers=8) as pool:
            states = list(pool.map(lambda _: self.service.answer('owner','r',q.id,q.correct_id), range(24)))
        self.assertTrue(all(s['score'] == 1 for s in states))
        self.assertEqual(len(self.service.games['owner'].answers), 1)

    def test_abandon_is_repeatable(self):
        state = self.start()
        for _ in range(2):
            self.assertEqual(self.client.post('/api/game/abandon', json={'game_id': state['game_id']}).status_code,200)
        self.assertEqual(self.client.get('/api/game').status_code,410)

    def test_reject_bad_json_bank(self):
        original = json.loads(Path('data/arquivos.json').read_text(encoding='utf-8'))
        mutations = [lambda d: d['questions'][0].update(correct_id='z'),
                     lambda d: d['questions'][0]['source'].update(page=0),
                     lambda d: d['questions'][0]['alternatives'].pop(),
                     lambda d: d['questions'][1].update(id=d['questions'][0]['id'])]
        for mutation in mutations:
            data = json.loads(json.dumps(original))
            mutation(data)
            with tempfile.TemporaryDirectory() as folder:
                Path(folder, 'test.json').write_text(json.dumps(data),encoding='utf-8')
                with self.assertRaises(ValueError):
                    LessonRepository(folder)

    def test_result_extremes(self):
        for perfect in (True, False):
            state = self.start(request_id=str(perfect))
            for q in self.service.repository.get('arquivos').questions:
                selected = q.correct_id if perfect else next(a.id for a in q.alternatives if a.id != q.correct_id)
                state = self.advance(self.answer(state, selected).get_json()).get_json()
            self.assertEqual(state['result']['percentage'],100 if perfect else 0)


if __name__ == '__main__':
    unittest.main()

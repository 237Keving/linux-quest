import json
from pathlib import Path

from models import Alternative, Lesson, Question


class LessonRepository:
    def __init__(self, directory):
        self.lessons = {}
        question_ids = set()
        for path in sorted(Path(directory).glob('*.json')):
            try:
                raw = json.loads(path.read_text(encoding='utf-8'))
                for key in ('id', 'title', 'description', 'symbol'):
                    self._text(raw[key])
                if raw['id'] in self.lessons or not raw['questions']:
                    raise ValueError('Módulo duplicado ou vazio')
                questions = []
                for item in raw['questions']:
                    for key in ('id', 'prompt', 'explanation', 'correct_id'):
                        self._text(item[key])
                    if item['id'] in question_ids:
                        raise ValueError('ID de questão duplicado')
                    question_ids.add(item['id'])
                    alternatives = tuple(Alternative(**a) for a in item['alternatives'])
                    if len(alternatives) != 4 or {a.id for a in alternatives} != set('abcd'):
                        raise ValueError('São necessárias quatro alternativas a–d')
                    for a in alternatives:
                        self._text(a.text)
                    if len({a.text.strip() for a in alternatives}) != 4:
                        raise ValueError('Alternativas repetidas')
                    if item['correct_id'] not in 'abcd' or len(item['correct_id']) != 1:
                        raise ValueError('Gabarito inválido')
                    source = item['source']
                    self._text(source['file'])
                    if type(source['page']) is not int or source['page'] < 1:
                        raise ValueError('Página inválida')
                    if not isinstance(item.get('command', ''), str):
                        raise ValueError('Comando inválido')
                    questions.append(Question(item['id'], item['prompt'], item.get('command', ''),
                                              alternatives, item['correct_id'], item['explanation'], source))
                self.lessons[raw['id']] = Lesson(raw['id'], raw['title'], raw['description'],
                                                 raw['symbol'], tuple(questions))
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(f'JSON inválido em {path.name}: {error}') from error
        if not self.lessons:
            raise ValueError('Nenhum módulo encontrado')

    @staticmethod
    def _text(value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError('Texto obrigatório inválido')

    def get(self, lesson_id):
        return self.lessons.get(lesson_id)

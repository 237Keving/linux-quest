from uuid import uuid4

from flask import Blueprint, jsonify, render_template, request, session

from services.quiz_service import GameError


def create_blueprint(service):
    bp = Blueprint('quiz', __name__)

    def owner():
        if 'owner' not in session:
            session['owner'] = str(uuid4())
        return session['owner']

    def body(*fields):
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise GameError('Envie um objeto JSON válido.')
        for field in fields:
            value = data.get(field)
            if not isinstance(value, str) or not value.strip() or len(value) > 100:
                raise GameError(f'Campo inválido: {field}.')
        return data

    @bp.errorhandler(GameError)
    def game_error(error):
        return jsonify(error=str(error)), error.status

    @bp.get('/')
    def index():
        owner()
        return render_template('index.html')

    @bp.get('/api/lessons')
    def lessons():
        owner()
        return jsonify(service.catalog())

    @bp.get('/api/game')
    def current():
        return jsonify(service.current(owner()))

    @bp.post('/api/game')
    def start():
        data = body('lesson_id', 'request_id')
        return jsonify(service.start(owner(), data['lesson_id'], data['request_id']))

    @bp.post('/api/game/answer')
    def answer():
        data = body('game_id', 'question_id', 'alternative_id')
        return jsonify(service.answer(owner(), data['game_id'], data['question_id'], data['alternative_id']))

    @bp.post('/api/game/next')
    def advance():
        data = body('game_id', 'question_id')
        return jsonify(service.advance(owner(), data['game_id'], data['question_id']))

    @bp.post('/api/game/abandon')
    def abandon():
        data = body('game_id')
        service.abandon(owner(), data['game_id'])
        return jsonify(ok=True)

    return bp

from pathlib import Path
import secrets

from flask import Flask

from controllers.quiz_controller import create_blueprint
from repositories.lesson_repository import LessonRepository
from services.quiz_service import QuizService


def create_app(testing=False, data_dir=None):
    app = Flask(__name__)
    app.config.update(SECRET_KEY=secrets.token_hex(32), TESTING=testing,
                      SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Strict',
                      MAX_CONTENT_LENGTH=4096)
    repository = LessonRepository(data_dir or Path(__file__).parent / 'data')
    service = QuizService(repository)
    app.extensions['quiz_service'] = service
    app.register_blueprint(create_blueprint(service))

    @app.after_request
    def headers(response):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'"
        return response

    return app


if __name__ == '__main__':
    create_app().run(host='127.0.0.1', port=5000, debug=False)

import { ApiService } from './services/ApiService.js';
import { QuizController } from './controllers/QuizController.js';
import { QuizView } from './views/QuizView.js';

const controller = new QuizController(new ApiService(), new QuizView());
controller.init();

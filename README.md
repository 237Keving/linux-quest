# Linux Quest — Terminal Quiz

Quiz educacional sobre comandos Linux, desenvolvido por Kevin Rhoden, da turma TI23, para a disciplina Sistemas Operacionais Linux do professor Cristiano Forte.

O jogo possui quatro módulos com oito perguntas cada: navegação e arquivos, usuários e grupos, redirecionamentos e pipes e redes na prática. A correção acontece no servidor Flask; o navegador recebe o gabarito somente depois que o jogador responde.

## Como executar

É necessário ter Python 3.10 ou mais recente.

### Windows (PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

### Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 main.py
```

Abra `http://127.0.0.1:5000` no navegador. Depois da instalação, a aplicação funciona sem internet, fontes externas ou CDN. Para encerrar o servidor, volte ao terminal e pressione `Ctrl+C`.

## Como jogar

Escolha um módulo e responda às oito perguntas. Após cada resposta, o jogo mostra se houve acerto, indica a alternativa correta e apresenta uma explicação curta. As teclas `1` a `4` selecionam alternativas e `Enter` avança quando a correção estiver visível. Não há cronômetro.

A opção "Animações do terminal" fica no menu principal e alterna claramente entre ON e OFF. Ela controla scanlines, ruído, brilho, cursor, entradas e contagens. A interface também respeita a preferência `prefers-reduced-motion` do sistema.

## Estrutura do projeto

```text
linux-quest/
├── main.py                         criação e configuração do Flask
├── requirements.txt
├── data/                           quatro bancos de perguntas em JSON
├── models/__init__.py              Lesson, Question, Alternative, GameSession e Result
├── repositories/
│   └── lesson_repository.py        leitura e validação dos JSONs
├── services/
│   └── quiz_service.py             regras da partida e pontuação
├── controllers/
│   └── quiz_controller.py          rotas HTTP e validação das requisições
├── templates/index.html            estrutura semântica da página
├── static/
│   ├── css/style.css               visual responsivo de terminal
│   └── js/
│       ├── app.js                  composição das classes do frontend
│       ├── services/ApiService.js  comunicação com o Flask
│       ├── controllers/            coordenação da interface
│       └── views/QuizView.js       DOM, eventos e apresentação
└── tests/test_quiz.py              testes das regras principais
```

## MVC e camada de Services

No backend, os Models representam os dados e o estado de cada partida. `LessonRepository` carrega os JSONs e rejeita bancos inconsistentes. `QuizService` inicia partidas, impede respostas duplicadas, corrige, avança e calcula o resultado. O Controller HTTP valida a entrada, chama o Service e devolve JSON; ele não calcula pontos.

No frontend, `QuizView` é a única classe que consulta ou modifica o DOM e registra eventos. `QuizController` coordena ações da View e chama `ApiService`, que concentra todas as requisições ao Flask. A correção e a pontuação não são duplicadas em JavaScript.

## Percurso de uma resposta

1. A View registra o clique ou a tecla de uma alternativa.
2. O Controller bloqueia novos envios e passa os identificadores ao `ApiService`.
3. O Controller Flask valida o JSON recebido e chama `QuizService.answer`.
4. O Service confere a sessão, a partida e a questão atual. A resposta é registrada uma única vez, mesmo se a mesma requisição for repetida.
5. O servidor devolve a alternativa correta, a explicação, a fonte e a pontuação atualizada.
6. A View destaca a escolha e o gabarito e libera o botão da próxima pergunta.

As partidas são mantidas temporariamente na memória e separadas pela sessão do navegador. Reiniciar o servidor apaga esse estado; nesse caso, a interface orienta o jogador a iniciar uma nova partida.

## Como adicionar uma pergunta

Abra o JSON do módulo em `data/` e acrescente um objeto à lista `questions` seguindo o formato existente:

```json
{
  "id": "arquivos-9",
  "prompt": "Enunciado claro e contextualizado",
  "command": "comando opcional para exibição",
  "alternatives": [
    { "id": "a", "text": "Alternativa A" },
    { "id": "b", "text": "Alternativa B" },
    { "id": "c", "text": "Alternativa C" },
    { "id": "d", "text": "Alternativa D" }
  ],
  "correct_id": "a",
  "explanation": "Explicação técnica curta.",
  "source": { "file": "Material.pdf", "page": 1 }
}
```

O ID deve ser único em todo o projeto. Devem existir exatamente quatro alternativas diferentes, com IDs de `a` a `d`, uma única resposta correta e uma página válida. O repositório verifica essas regras ao iniciar a aplicação.


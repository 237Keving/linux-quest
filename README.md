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

## Materiais utilizados

- `Kevin Rhoden - Aplicação .pdf`: requisitos gerais do quiz, páginas 1 a 3.
- `Kevin Rhoden - Exercícios.pdf`: navegação e manipulação de arquivos, páginas 1 e 2.
- `Gerenciamento de Usuários.pptx.pdf`: usuários, grupos, senhas e auditoria, páginas 3 a 13. Os slides foram conferidos visualmente porque o PDF contém imagens.
- `aula 4.pdf`: redirecionamentos, descritores, pipes e `&&`, páginas 1 a 9.
- `Kevin Rhoden - Projeto.pdf`: bridge, endereços, namespaces, veth, rota e ping, páginas 2 a 4.
- `Desenvolvimento para internet.pdf`: HTML semântico, responsividade, organização, MVC e Services, principalmente páginas 2, 10, 13 a 16 e 19 a 20.

Cada pergunta guarda seu arquivo-fonte e página no JSON. A referência aparece ao jogador depois da resposta.

## Ajustes técnicos dos materiais

O trecho da página 4 de `aula 4.pdf` associa visualmente os símbolos de entrada e saída aos descritores de forma invertida. O projeto adota o comportamento correto do shell: `<` fornece a entrada padrão, `>` e `>>` redirecionam a saída padrão e `2>` e `2>>` redirecionam a saída de erro. `&>` e `2>&1` são apresentados com contexto Bash.

O slide da página 13 de `Gerenciamento de Usuários.pptx.pdf` pode sugerir que `userdel -r` apaga o diretório `/home` inteiro. A pergunta foi corrigida tecnicamente: a opção `-r` remove o diretório pessoal e a caixa de correio do usuário; arquivos pertencentes ao usuário em outros sistemas de arquivos podem permanecer.

`adduser` é tratado como ferramenta interativa comum no Debian. O comportamento padrão de `useradd`, inclusive a criação do diretório pessoal, pode variar conforme distribuição, opções e configuração; por isso as perguntas não dependem dessa simplificação.

## Limitações

- O estado é temporário e fica na memória de um único processo Flask.
- Não há login, banco de dados ou histórico permanente de resultados.
- O servidor incluído é adequado para apresentação e uso local, não para publicação em produção.
- Os comandos aparecem somente como texto e nunca são executados pela aplicação.

## Testes

Para executar a suíte:

```bash
python -m unittest discover -s tests -v
```

Ela cobre os quatro módulos, cálculo de resultado, isolamento de sessões, respostas e avanços duplicados, reinício, perda de estado do servidor, entradas inválidas e validação dos JSONs.

## Publicar em um repositório Git

O projeto já contém `.gitignore`. Depois de criar um repositório vazio na plataforma escolhida, execute na pasta do projeto:

```bash
git add .
git commit -m "Cria Linux Quest Terminal Quiz"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Substitua `URL_DO_SEU_REPOSITORIO` pela URL real. Nenhum repositório remoto foi criado automaticamente por este projeto.

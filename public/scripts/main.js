/* eslint-env browser */
/* global CodeMirror */

const colors = {
  black: '#151515',
  white: '#F5F5F5',
  'red-dark': '#AC4142',
  'red-light': '#AC4142',
  'yellow-dark': '#F4BF75',
  'yellow-light': '#F4BF75',
  'green-dark': '#90A959',
  'green-light': '#90A959',
  'blue-dark': '#6A9FB5',
  'blue-light': '#6A9FB5',
  'purple-dark': '#AA759F',
  'purple-light': '#AA759F',
  'cyan-dark': '#75B5AA',
  'cyan-light': '#75B5AA'
}

const colorsThemes = {
  light: {
    background: colors.white,
    foreground: colors.black,
    red: colors['red-light'],
    yellow: colors['yellow-light'],
    green: colors['green-light'],
    blue: colors['blue-light'],
    purple: colors['purple-light'],
    cyan: colors['cyan-light'],
    cursor: colors.black
  },
  dark: {
    bg: colors.white,
    fg: colors.black,
    red: colors['red-dark'],
    yellow: colors['yellow-dark'],
    green: colors['green-dark'],
    blue: colors['blue-dark'],
    purple: colors['purple-dark'],
    cyan: colors['cyan-dark'],
    cursor: colors.white
  }
}

let state = null

function init () {
  state = setup()
  changeTheme(state)
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function changeTheme (state) {
  const theme = localStorage.getItem('theme') || 'light'
  document.body.dataset.theme = theme

  const themeName = 'base16-' + theme
  state.editor.setOption('theme', themeName)
  if (state.term.contentWindow.term) {
    state.term.contentWindow.term.setOption('theme', colorsThemes[theme])
  }
  console.info('Theme Changed', themeName)
}

function runOnTerm (command, callback) {
  if (state.term.contentWindow.term && command) {
    state.term.contentWindow.term.paste(command + '\n')
  }
  if (callback) {
    sleep(100).then(function () {
      callback()
    })
  }
}

function setup () {
  const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    lineNumbers: true,
    styleActiveLine: true
  })
  editor.setSize('100%', '100%')

  const termContainer = document.getElementById('term')
  termContainer.src = '/ttyd/'

  setTimeout(function () {
    console.info('Focus')
    editor.focus()
    // termContainer.contentWindow.term.setOption('fontSize', 18)
  }, 1000)

  return {
    term: termContainer,
    editor: editor
  }
}

function undo () {
  state.editor.undo()
}

function changeLanguage () {
  const language = document.getElementById('languageSelect').value

  const languagesMode = {
    null: 'text',
    c: 'text/x-csrc',
    cplusplus: 'text/x-c++src',
    java: 'text/x-java',
    javascript: 'javascript',
    python: 'python',
    sql: 'sql'
  }

  const languagesHelloWorld = {
    null: '',
    c: '#include <stdio.h>\nint main() {\n    puts("Ola Mundo");\n    return 0;\n}\n',
    cplusplus: '#include <iostream>\nint main() {\n    std::cout << "Ola Mundo" << std::endl;\n    return 0;\n}',
    java: 'class Principal {\n    public static void main(String[] args) {\n        System.out.println("Ola Mundo");\n    }\n}',
    javascript: 'console.log("Ola Mundo")',
    python: 'print("Ola Mundo")',
    sql: 'SELECT 1+1'
  }

  const languagesConfig = {
    null: {
      indentUnit: 4
    },
    c: {
      indentUnit: 4
    },
    cplusplus: {
      indentUnit: 4
    },
    java: {
      indentUnit: 4
    },
    javascript: {
      indentUnit: 2
    },
    python: {
      indentUnit: 2
    },
    sql: {
      indentUnit: 2
    }
  }
  state.editor.setOption('mode', languagesMode[language])
  state.editor.setOption('indentUnit', languagesConfig[language].indentUnit)
  state.editor.setValue(languagesHelloWorld[language])
  console.info('Language changed to', languagesMode[language])
}

class NullRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'main.txt'
  }

  update () {
    return `cat >./${this.fileName} <<EOF
${this.code}
EOF`
  }

  run () {
    return `cat ${this.fileName}`
  }
}

class CRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'main.c'
  }

  update () {
    return `cat >./${this.fileName} <<EOF
${this.code}
EOF`
  }

  run () {
    return `gcc ${this.fileName} && ./a.out`
  }
}

class CPlusPlusRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'main.cpp'
  }

  update () {
    return `cat >./${this.fileName} <<EOF
${this.code}
EOF`
  }

  run () {
    return `g++ ${this.fileName} && ./a.out`
  }
}

class JavaRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'Principal.java'
  }

  update () {
    return `cat >./${this.fileName} <<EOF
${this.code}
EOF`
  }

  run () {
    return `javac ${this.fileName} && java Principal`
  }
}

class JavaScriptRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'main.js'
  }

  update () {
    return `cat >./${this.fileName} <<ENDOFFILE
const fs = require('fs')

const document = { write: function (msg) { console.log(msg) } };

function alert (msg) { console.log(msg) };

function prompt (msg) {
    process.stdin.resume()
    var buffer = Buffer.alloc(1)
    var result = ''
    var bytesRead

    while (true) {
        bytesRead = 0
        try {
            bytesRead = fs.readSync(process.stdin.fd, buffer, 0, 1)
        } catch (e) {
            if (e.code === 'EAGAIN') {
                console.error('ERROR: interactive stdin input not supported.')
                process.exit(1)
            } else if (e.code === 'EOF') {
                break
            }
            throw e
        }
        if (bytesRead === 0) {
            break
        }

        var char = buffer.toString('utf8')
        if (char === '\\r' || (result.length === 0 && (char === ' ' || char === '\\t'))) {
            continue
        } else if (char === '\\n' || char === ' ' || char === '\\t') {
            break
        } else {
            result += char
        }
    }

    process.stdin.pause()
    return result
};

${this.code}
ENDOFFILE`
  }

  run () {
    return `node -i ${this.fileName}`
  }
}

class PythonRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'main.py'
  }

  update () {
    return `cat >./${this.fileName} <<EOF
${this.code}
EOF`
  }

  run () {
    return `python3 ${this.fileName}`
  }
}

class SQLRunner {
  constructor (code) {
    this.code = code
    this.fileName = 'main.sql'
  }

  update () {
    return `cat >./${this.fileName} <<EOF
${this.code}
EOF`
  }

  run () {
    return `cat ${this.fileName} | sqlite3 db.sqlite3`
  }
}

const runners = {
  null: NullRunner,
  c: CRunner,
  cplusplus: CPlusPlusRunner,
  java: JavaRunner,
  javascript: JavaScriptRunner,
  python: PythonRunner,
  sql: SQLRunner
}

function run () {
  const languageSelect = document.getElementById('languageSelect')
  const language = languageSelect.value
  const code = state.editor.getValue()

  console.log('Run...', language)
  console.log(code)

  const runner = new runners[language](code)
  runOnTerm(runner.update(), function () {
    runOnTerm('clear', function () {
      runOnTerm(runner.run())
    })
  })
}

function darkxlight () {
  const element = document.body
  switch (element.dataset.theme) {
    case 'light':
      element.dataset.theme = 'dark'
      break
    case 'dark':
      element.dataset.theme = 'light'
      break
  }
  localStorage.setItem('theme', element.dataset.theme)
  changeTheme(state)
}

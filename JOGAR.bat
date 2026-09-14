@echo off
REM ============================================================================
REM  PokeArena - abre o jogo com um clique.
REM
REM  POR QUE ISTO EXISTE: o jogo precisa de um servidor local, e um servidor
REM  local precisa de um terminal. Quem so quer JOGAR nao deveria ter de abrir
REM  terminal toda vez, lembrar do comando, e lembrar da pasta certa.
REM
REM  E ha um erro que este arquivo evita de vez: abrir o app\index.html com dois
REM  cliques. A tela abre, mostra "simulando batalhas" e trava ali para sempre,
REM  porque o navegador BLOQUEIA modulos JavaScript carregados por file://. Nao
REM  e defeito do jogo, e nao ha contorno do lado da pagina.
REM
REM  Este .bat resolve os dois: sobe o servidor NA PASTA CERTA e abre o
REM  navegador no endereco certo.
REM ============================================================================

title PokeArena
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   O Node nao esta instalado, ou o terminal ainda nao o enxerga.
  echo.
  echo   1. instale em https://nodejs.org  ^(versao 22 ou mais nova^)
  echo   2. FECHE e reabra esta janela depois de instalar
  echo.
  echo   O passo 2 e o que mais confunde: o Windows so enxerga um programa
  echo   novo em janelas abertas DEPOIS da instalacao.
  echo.
  pause
  exit /b 1
)

echo.
echo   PokeArena subindo...
echo.
echo   O navegador abre sozinho em 3 segundos.
echo   Para PARAR o jogo: feche esta janela, ou aperte Ctrl+C aqui dentro.
echo.

REM  O navegador abre em paralelo, com um respiro para o servidor atender. Sem
REM  a espera, a primeira tentativa pega a porta ainda fechada e o Windows
REM  mostra "nao foi possivel acessar o site" — que parece defeito e nao e.
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8099/"

node tools/servir.mjs

REM  Se o node cair sozinho, a janela fica aberta com a mensagem de erro a
REM  vista. Fechar na cara de quem esta tentando entender e o pior desfecho.
echo.
echo   O servidor parou.
pause

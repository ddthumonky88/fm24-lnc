@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

rem Prefer IDE-managed JDKs, then use JAVA_HOME and common install locations.
set "JAVA_EXE="
set "MAVEN_CMD="
set "APP_JAR=%~dp0target\fm24-lnc-be-1.0.0.jar"

for /d %%D in ("%USERPROFILE%\.jdks\openjdk-2*" "%USERPROFILE%\.jdks\jdk-2*") do if not defined JAVA_EXE call :try_java_home "%%~fD"
if not defined JAVA_EXE if defined JAVA_HOME call :try_java_home "%JAVA_HOME%"

rem Search common JDK installation directories when JAVA_HOME is missing/stale.
if not defined JAVA_EXE (
    for /d %%D in ("%ProgramFiles%\Java\jdk-*") do if not defined JAVA_EXE call :try_java_home "%%~fD"
)
if not defined JAVA_EXE if exist "%ProgramFiles%\Eclipse Adoptium" (
    for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-*") do if not defined JAVA_EXE call :try_java_home "%%~fD"
)
if not defined JAVA_EXE if exist "%ProgramFiles%\Microsoft" (
    for /d %%D in ("%ProgramFiles%\Microsoft\jdk-*") do if not defined JAVA_EXE call :try_java_home "%%~fD"
)

rem Finally try java from PATH.
if not defined JAVA_EXE (
    for /f "delims=" %%J in ('where java.exe 2^>nul') do if not defined JAVA_EXE call :try_java_exe "%%~fJ"
)

if not defined JAVA_EXE (
    echo ERROR: Java 21 or newer was not found.
    echo Install JDK 21+ or set JAVA_HOME to its installation directory.
    pause
    exit /b 1
)

if defined MAVEN_HOME if exist "%MAVEN_HOME%\bin\mvn.cmd" set "MAVEN_CMD=%MAVEN_HOME%\bin\mvn.cmd"
if not defined MAVEN_CMD (
    for /f "delims=" %%M in ('where mvn.cmd 2^>nul') do if not defined MAVEN_CMD set "MAVEN_CMD=%%~fM"
)
if not defined MAVEN_CMD if exist "%USERPROFILE%\.m2\wrapper\dists" (
    for /r "%USERPROFILE%\.m2\wrapper\dists" %%M in (mvn.cmd) do if exist "%%~fM" if not defined MAVEN_CMD set "MAVEN_CMD=%%~fM"
)

set "PATH=%JAVA_HOME%\bin;%PATH%"
set "DB_HOST=127.0.0.1"
set "DB_PORT=5432"
set "DB_USERNAME=postgres"
set "DB_PASSWORD=123456"
set "DB_NAME=fm_lnc_db"
set "LNC_FILES_DIR=%~dp0data"

echo Starting FM24 LNC Java Backend...
echo Project: %~dp0
echo Java:   %JAVA_HOME%
if defined MAVEN_CMD (echo Maven:  %MAVEN_CMD%) else (echo Maven:  not found - using the existing JAR)
echo LNC:    %LNC_FILES_DIR%
echo Swagger: http://localhost:3001/docs
echo.

if defined MAVEN_CMD (
    call "%MAVEN_CMD%" spring-boot:run
) else (
    if not exist "%APP_JAR%" (
        echo ERROR: Maven is not installed and the built JAR does not exist:
        echo %APP_JAR%
        echo Install Maven 3.9+ and run: mvn clean package
        pause
        exit /b 1
    )
    "%JAVA_EXE%" -jar "%APP_JAR%"
)

set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo Backend stopped with exit code %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%

:try_java_home
if not exist "%~1\bin\java.exe" exit /b 0
if not exist "%~1\bin\javac.exe" exit /b 0
set "JAVA_HOME=%~1"
set "JAVA_EXE=%~1\bin\java.exe"
exit /b 0

:try_java_exe
for %%P in ("%~1\..\..") do set "JAVA_HOME=%%~fP"
set "JAVA_EXE=%~1"
exit /b 0

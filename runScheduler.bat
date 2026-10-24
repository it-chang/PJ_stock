@echo off
REM 排程總管：runScheduler.bat [auto^|status^|run 工作名]
REM   auto   檢查每個工作，該跑的才跑（Windows 排程用這個）
REM   status 只看狀態
REM   run    強制執行指定工作，例：runScheduler.bat run profit
REM 工作清單與規則在 _Scheduler.ipynb 第 1 區
chcp 65001 >nul
set PYTHON_PATH=C:\Users\user\anaconda3
set JOB_MODE=%~1
if "%JOB_MODE%"=="" set JOB_MODE=auto
set JOB_NAME=%~2
cd /d D:\Project\Jupyter\Stock\Main
"%PYTHON_PATH%\Scripts\jupyter.exe" nbconvert --to notebook --execute _Scheduler.ipynb --ExecutePreprocessor.timeout=-1 --output-dir Result\_scheduler --output _Scheduler_last
echo Done

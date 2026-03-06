Set WshShell = CreateObject("WScript.Shell")
' Run the server hidden using pythonw
WshShell.Run "pythonw app.py", 0, False
' Wait for 3 seconds for server to start
WScript.Sleep 3000
' Open the app in chrome window mode
WshShell.Run "chrome --app=http://127.0.0.1:5000", 1, False

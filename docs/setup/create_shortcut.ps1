$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\Liebe.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"c:\liebe\Liebe.vbs`""
$Shortcut.WorkingDirectory = "c:\liebe"
$Shortcut.IconLocation = "c:\liebe\static\icons\icon.ico"
$Shortcut.Save()
write-host "Desktop shortcut updated to run silently!"

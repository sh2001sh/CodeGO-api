$env:BROWSER = 'none'
Remove-Item Env:SQL_DSN -ErrorAction SilentlyContinue
Remove-Item Env:SQLITE_PATH -ErrorAction SilentlyContinue
Set-Location 'E:\sh\Coding\cpa_bussiness\new-api'
go run . --port 3000 *>> '.backend-live.out.log'

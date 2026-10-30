#####################################
# 【一次性設定】IIS 反向代理 TWSE 即時報價（取代付費的 corsproxy.io）
# 用途：讓 Content/getRealTime.js 打 /IT/twse/... 時，由 IIS 轉到 https://mis.twse.com.tw/...
# 執行：以「系統管理員」開 PowerShell，執行
#   powershell -ExecutionPolicy Bypass -File D:\Project\Jupyter\Stock\Main\setup_iis_twse_proxy.ps1
#####################################

$ErrorActionPreference = 'Stop'
$appcmd = "$env:windir\System32\inetsrv\appcmd.exe"
$webConfig = Join-Path $PSScriptRoot 'web.config'

# 1. 安裝 URL Rewrite + ARR（已安裝會略過）
winget install --id Microsoft.IIS.URLRewrite -e --accept-source-agreements --accept-package-agreements
winget install --id Microsoft.IIS.ApplicationRequestRouting -e --accept-source-agreements --accept-package-agreements

# 模組沒裝好就停止：web.config 加了 <rewrite> 但沒有模組，整個網站會 500
if (-not (Test-Path "$env:windir\System32\inetsrv\rewrite.dll")) {
    throw 'URL Rewrite 模組沒有安裝成功，web.config 不做修改'
}

# 2. 開啟 ARR 的 proxy 功能（只能在 applicationHost.config 設定）
& $appcmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost

# 3. web.config 加上 twse 代理規則（已存在就略過）
[xml]$xml = Get-Content $webConfig -Encoding UTF8
$ws = $xml.configuration.'system.webServer'
if ($ws.SelectSingleNode("rewrite/rules/rule[@name='TWSE']")) {
    Write-Host 'web.config 已有 TWSE 規則，略過'
} else {
    $frag = $xml.CreateDocumentFragment()
    $frag.InnerXml = @'
<rewrite>
            <rules>
                <!-- 即時報價：/IT/twse/* 轉到 TWSE mis（需 URL Rewrite + ARR，見 setup_iis_twse_proxy.ps1） -->
                <rule name="TWSE" stopProcessing="true">
                    <match url="^twse/(.*)" />
                    <action type="Rewrite" url="https://mis.twse.com.tw/{R:1}" />
                </rule>
            </rules>
        </rewrite>
'@
    $ws.AppendChild($frag) | Out-Null
    $xml.Save($webConfig)
    Write-Host 'web.config 已加入 TWSE 規則'
}

# 4. 重啟 IIS 並測試
iisreset
try {
    $r = Invoke-WebRequest 'http://localhost/IT/twse/stock/api/getStockInfo.jsp?ex_ch=tse_2330.tw' -UseBasicParsing -TimeoutSec 15
    Write-Host '測試成功：' $r.Content.Substring(0, [Math]::Min(120, $r.Content.Length))
} catch {
    Write-Warning "測試失敗：$($_.Exception.Message)"
}

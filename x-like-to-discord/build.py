"""標準PythonだけでChrome / Firefox用フォルダーを生成します。"""
from pathlib import Path
import json, shutil
root = Path(__file__).resolve().parent
common = {
 'manifest_version':3,'name':'X Like to Discord','version':'1.3.1',
 'description':'Xでいいねした投稿URLを、自分で設定したDiscord Webhookへ送信します。',
 'permissions':['storage'],'host_permissions':['https://discord.com/*'],
 'content_scripts':[{'matches':['https://x.com/*'],'js':['core.js','content.js'],'run_at':'document_start'}],
 'options_ui':{'page':'options.html','open_in_tab':True},
 'action':{'default_title':'X → Discord 設定'},
 'content_security_policy':{'extension_pages':"script-src 'self'; object-src 'none'; connect-src https://discord.com"}
}
for browser in ['chrome','firefox']:
 target = root / browser
 target.mkdir(exist_ok=True)
 for name in ['core.js','content.js','background.js','options.html','options.js','options.css']:
  shutil.copy2(root/name,target/name)
 manifest = dict(common)
 if browser == 'chrome':
  manifest['minimum_chrome_version']='102'
  manifest['background']={'service_worker':'background.js'}
 else:
  manifest['background']={'scripts':['core.js','background.js']}
  manifest['browser_specific_settings']={'gecko':{'id':'x-like-to-discord@local.example','strict_min_version':'140.0','data_collection_permissions':{'required':['websiteActivity','authenticationInfo']}}}
 (target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('chrome/ と firefox/ を生成しました。')

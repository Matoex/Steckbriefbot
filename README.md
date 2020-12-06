# Steckbriefbot
Nutze '?steckbriefhilfe' für Hilfe in Discord

Zur beim Inbetriebnehmen muss eine 'steckbriefeids.json'-Datei mit 
```javascript
{
    "bottoken": "bottoken",
    "rssurl": "rssurl",
    "rsschannel": "rsschannel",
    "rssaufgabenchannel": "rssaufgabenchannel"
}
```
existieren.
Die Gesteckbrieftrolle muss in ROLE_GESTECKBRIEFT_ID und die Serverid in GUILD_ID in index.js eingetragen werden.

Dann kann über '?setsteckbriefchannel' der Steckbriefkanal von jemandem mit 'MANAGE_GUILD' festgelegt werden.

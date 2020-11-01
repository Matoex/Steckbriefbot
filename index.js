/*
Nutze '?steckbriefhilfe' für Hilfe

Zur beim Inbetriebnehmen muss eine 'steckbriefeids.json'-Datei mit '{ "bottoken": "bottoken" }' existieren.
Die Gesteckbrieftrolle muss in ROLE_GESTECKBRIEFT_ID und die Serverid in GUILD_ID eingetragen werden.
Dann kann über '?setsteckbriefchannel' der Steckbriefkanal von jemandem mit 'MANAGE_GUILD' festgelegt werden.


TODO SetGuildID, SetRoleID
*/

const Discord = require('discord.js');
var client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']})
const fs = require('fs');


//Lade Steckbriefeids
steckbriefe = require("./steckbriefeids.json");
var STECKBRIEF_CHANNEL = steckbriefe.steckbriefchannel || console.log("Steckbriefchannel nicht definiert");
const TOKEN = steckbriefe.bottoken || console.log("Bottoken nicht definiert");

const GUILD_ID = "xxx";
const ROLE_GESTECKBRIEFT_ID = "yyy";
const PREFIX = "Steckbrief:";

client.login(TOKEN)

client.on("ready", () => {
    console.log(client.user.username + " gestartet, Channelid: " + STECKBRIEF_CHANNEL + " GuildID: " + GUILD_ID + " ROLE_GESTECKBRIEFT_ID: " + ROLE_GESTECKBRIEFT_ID);
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
    await oldMessage.fetch().then(function (Message) {
        if (newMessage.author.bot || newMessage.channel.type !== "dm") {
            return;
        }
        updatesentsteckbrief(newMessage);
    });
})

client.on('message', (msg) => {
        if (msg.author.bot) {
            return;
        }

        const args = msg.content.replace("\n", " ").split(' '); //Args ist ein Arra mit den Wörtern der Nachricht, split by " " SPACE

        if (args[0] == "?purge") {
            if (msg.channel.type != "text") { //Abbruch, wenn kein Servertextchannel (so werden DMs ausgeschlossen)
                return msg.reply('Das hier ist kein Textchannel auf einem Server!');
            }
            if (!msg.member.hasPermission('MANAGE_MESSAGES')) { //Nur Purgen, wenn der Befehlgeber die Berechtigung hat
                return msg.reply('Keine Berechtigung!');
            }

            const amount = args.slice(1).join(''); // Anzahl der zu löschenden Nachrichten, BSP: "?purge 6 9" => 69 Nachrichten

            if (!amount) return msg.reply('Keine Anzahl angegeben!');
            if (isNaN(amount)) return msg.reply('Keine Zahl angegeben!');

            if (amount > 99) return msg.reply('Du kannst nicht mehr als 99 Nachrichten auf ein mal löschen!');
            if (amount < 1) return msg.reply('Du musst mindestens eine Nachricht löschen!');

            msg.channel.bulkDelete(parseInt(amount) + 1);//Lösche amount Nachrichten im Channel

            return;
        }
        if (args[0] == "?setsteckbriefchannel") {
            if (!msg.member.hasPermission('MANAGE_GUILD')) { //Checkt beim Setzen von "?setsteckbriefchannel", ob Absender die Berechtigung hat
                return msg.reply('Keine Berechtigung!');
            }
            console.log("Steckbriefchannel zu " + msg.channel.name + " : " + msg.channel.id + " gesetzt.")
            msg.reply("Steckbriefchannel zu " + msg.channel.name + " : " + msg.channel.id + " gesetzt.")
            steckbriefe.steckbriefchannel = msg.channel.id;
            STECKBRIEF_CHANNEL = msg.channel.id;
            safeSteckbriefJSON();
            return;
        }
        if (args[0] == "?steckbriefhilfe") {
            getSteckbriefHilfe(msg.channel.id)
            return;
        }

        if (args[0] != PREFIX) { //Abbruch, wenn Nachricht nicht mit "Steckbrief:" beginnt
            return;
        }
        if (msg.channel.type !== "dm") { //Abbruch, wenn Nachricht nicht per DM gesendet wurde
            return;
        }

        if (msg.content.length < 200) {
            msg.reply("Dein Steckbrief benötigt mind. 200 Zeichen")
            return;
        }
        if (steckbriefe[msg.author.id] != null) { //Checkt, ob in Steckbreife schon ein Eintrag zur ID des Messagesenders existiert
            updatesentsteckbrief(msg);

        } else {
            addUserRole(msg.author)
            var nachricht = processMessage(PREFIX, msg); //Nachricht [Steckbrief als Embed, Steckbrief als Objekt]
            if(nachricht==false){
                return;
            }

            client.channels.fetch(STECKBRIEF_CHANNEL).then(function (channel) {
                channel.send("Der Steckbrief von " + msg.author.toString() + "\n\n", nachricht[0]).then(function (message) {
                    steckbriefe[msg.author.id] = {"messageid": message.id, "steckbrief": nachricht[1]}; //Setze steckbriefe[msg.author.id]
                    safeSteckbriefJSON(); //Speichere steckbriefe in der steckbriefeids.json Datei
                }).catch(() => {
                    console.error();
                });
                ;
            });
            sendMessageToChannelID(msg.channel.id, "Dein Steckbrief wurde gesendet")
        }
    }
);


function addUserRole(userid) {// Adde einen User by ID zu der Rolle ROLE_GESTECKBRIEFT_ID
    client.guilds.fetch(GUILD_ID).then(function (Guild) {
        Guild.members.fetch(userid).then(function (member) {
            /*
            if (member.roles.cache.has(ROLE_GESTECKBRIEFT_ID)) {

            }
            */
            member.roles.add(ROLE_GESTECKBRIEFT_ID).then().catch(console.error);
        }).catch(console.error);
        console.log(Guild.member(userid).user.username + " hat jetzt die Gesteckbrieft Rolle");
    })
}

function updatesentsteckbrief(msg) {
    if (!msg.content.startsWith(PREFIX)) {
        return;
    }
    if (msg.content.length < 200) {
        msg.reply("Dein Steckbrief benötigt mind. 200 Zeichen")
        return;
    }

    var nachricht = processMessage(PREFIX, msg); //Nachricht [Steckbrief als Embed, Steckbrief als Objekt]
    if(nachricht==false){
        return;
    }

    client.channels.fetch(STECKBRIEF_CHANNEL).then(function (channel) { //Hole den Steckbriefchannel
        channel.messages.fetch(steckbriefe[msg.author.id].messageid).then(function (message) {//Hole die gesendete Nachricht
            console.log("Steckbrief von " + msg.author.username + " wurde geändert")
            message.edit(nachricht[0]).then(console.log).catch(console.error);
            steckbriefe[msg.author.id].steckbrief = nachricht[1];
            safeSteckbriefJSON();//Speichere steckbriefe in der steckbriefeids.json Datei
        }).catch((error) => {
                if (error.message == 'Unknown Message') { //wenn die Nachricht nicht gefunden werden kann (gelöscht?), soll sie erneut gesendet werden
                    channel.send("Der Steckbrief von " + msg.author.toString() + "\n\n", nachricht[0]).then(function (message) {
                        console.log("Steckbrief von " + msg.author.username + " wurde erneut gesendet")
                        steckbriefe[msg.author.id] = {"messageid": message.id, "steckbrief": nachricht[1]}; //steckbriefe wird neu gespeichert
                        safeSteckbriefJSON(); //Speichere steckbriefe in der steckbriefeids.json Datei
                    }).catch((error) => {
                        console.error();
                    });
                }
            }
        );
    });
    sendMessageToChannelID(msg.channel.id, "Dein Steckbrief wurde aktualisiert")

}

function processMessage(prefix, message) {
    let text = message.content.trim().slice(prefix.length).replace("`", "").trim();//Text wird zum inhalt der gesendeten Nachricht gesetzt, "Steckbrief:" wird entfernt und Codeblocks werden entfernt
    var fields = text.split("\n"); //Fields ist ein Array, der jede Zeile als Element enthält

    const steckbrief = new Discord.MessageEmbed()
        .setColor(intToRGB(hashCode(message.author.id)))
        .setAuthor(message.author.username, message.author.avatarURL())
        .setDescription("");

    fields = fields.filter(zeile => zeile != "" || zeile != "\n"); //Leere Zeilen werden entfernt
    var fields_new = new Array();
    fields.forEach((zeile, index) => {
        zeile = zeile.split(":"); //Zeile ist ein Array, der die Nachricht der Zeile gesplittet an ":" enthält
        var thema = zeile[0].trim(); //Thema ist der Text vor dem :
        zeile.shift(); //Entferne das Thema aus dem Array
        var inhalt = zeile.join(":").trim() //Füge den Array wieder zusammen




        if (inhalt != ''&& thema != '') {
            switch (thema.toLowerCase()) {
                case "name": //Der Name wird zum Titel
                    steckbrief.setTitle(inhalt)
                    break;
                case "geburtstag": //Der Geburtstag kommt in die Beschreibung
                    steckbrief.setDescription(inhalt + ", " + steckbrief.description)
                    break;
                case "geschlecht": //Das Geschlecht kommt in die Beschreibung
                    steckbrief.setDescription(steckbrief.description + inhalt)
                    break;
                default: //Alle anderen Themen werden als Feld mit Inhalt dazugefüht
                    steckbrief.addField(thema, inhalt)
            }
            fields_new.push([thema, inhalt])
        }


    });
    steckbrief.setDescription(steckbrief.description.trim());
    steckbrief.setTimestamp(new Date())

    if (fields_new.length < 10) {
        message.reply("Dein Steckbrief benötigt mind. 10 gültige Zeilen")
        return false;
    }
    var fieldsobject = {};

    fields_new.forEach((element) => {
        fieldsobject[element[0]] = element[1];
    })

    return [steckbrief, fieldsobject];
}

function sendMessageToChannelID(channelid, message) {
    client.channels.fetch(channelid).then(function (channel) {
        channel.send(message)


    }).catch((error) => {
        console.error();
    });
}

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToRGB(i) {
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function safeSteckbriefJSON() {
    fs.writeFile("./steckbriefeids.json", JSON.stringify(steckbriefe, null, 4), err => {
        if (err) {
            throw err;
        }
    });
}

function getSteckbriefHilfe(channelid) {
    message = "So funktioniert das Steckbriefsystem:\n"+
        "```Steckbrief:\n"+
        "Name:\n"+
        "Geburtstag:\n"+
        "Geschlecht:\n"+
        "Religiosität:\n"+
        " \n"+
        "aktueller Wohnort:\n"+
        "urspränglicher Wohnort:\n"+
        "\n"+
        "Freizeit:\n"+
        "Spiele:\n"+
        "Vereine:\n"+
        "Musikinstrumente:\n"+
        "Interessen:\n"+
        "\n"+
        "Random Infos:\n"+
        "Lieblingstier:\n"+
        "Haustiere:  \n"+
        "Lieblingsbar:\n"+
        "Lieblingsurlaubsziel:\n"+
        "Lieblingsserie/Buch:\n"+
        "Lieblingsfarbe:\n"+
        "\n"+
        "Accountnamen:\n"+
        "Instagram:\n"+
        "Steam:\n"+
        "...\n"+
        "```"
    var e1 = new Discord.MessageEmbed()
        .setColor("#037a90")
        .addField("Erstmaliges Erstellen eines Steckbriefes", "Sende einfach eine Nachricht nach obigem Schema an den Bot **per Privatnachricht**.\nEs wird kein Codeblock benötigt.\nLeere Zeilen werden automatisch entfernt.")
        .addField("Welche Themen gibt es?", "Du kannst problemlos Kategorien über `Thema: Text` hinzufügen oder weglassen.\nThemen, zu denen der Inhalt nicht ausgefüllt wurde, werden automatsch entfernt.")
        .addField("Wichtg:", "Deine Nachricht an den Bot muss in der ersten Zeile mit `Steckbrief:` anfangen, nur dann wird die Nachricht vom Bot interpretiert. Alle weiteren Zeilen benötigen einen Text, einen Doppelpunt und dann wieder Text, sonst werden sie als leere Zeile interpretiert und nicht im Steckbrief angeführt.")
        .addField("Andere Steckbriefe sehen:", "Wenn du deinen Steckbrief gesendet hast, bekommst du eine Rolle, mit der du dann einen Channel sehen kannst, in dem die anderen Steckbriefe verfasst wurde.")
    var e2 = new Discord.MessageEmbed()
        .setColor("#870612")
        .addField("Ändern des Steckbriefes", "Entweder sendest du die Nachricht neu an den Bot, oder du editierst die an den Bot gesendete Nachricht")
    var e3 = new Discord.MessageEmbed()
        .setColor("#ffa500")
        .addField("Was Tun bei Problemen?", "Überprüfe, ob du alle formellen Vorgaben richtig umgesetzt hast, wenn das nicht geholfen hat, kannst du dich einfach an einen Serveradministrator wenden.")
        .setFooter("Credits: Matoex, Stealwonders, ButterToasted, RunningAnanas")
 /*
    var admin = new Discord.MessageEmbed()
        .setColor("#ffa500")
        .addField("Informationen für Administratoren", "Der Bot speichert beim Senden die Nachrichtid der gesendeten Nachricht und verwendet diese ID dann, um die Nachricht zu resolven. Wird die vom Bot gesendete Nachricht gelöscht, sendet der Bot einfach den Steckbrief erneut")
        .addField("?purge [Anzahl]", "Mit `?purge [Anzahl]` können alle mit 'MANAGE_MESSAGES' `[Anzahl]` letzte Nachrichten löschen.")
        .setFooter("By Matoex, Stealwonders, ButterToasted, RunningAnanas")
*/


    client.channels.fetch(channelid).then(function (channel) {
        channel.send(message)
            .then(msg => {
                channel.send(e1).then(msg => {
                    channel.send(e2).then(msg => {
                        channel.send(e3);
                    });
                    ;
                });
                ;
            }).catch((error) => {
            console.error();
        });

    });
}

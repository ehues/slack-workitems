
var html2text = require('html-to-text');
var WorkItems = require('./wi.js');
var relDate = require('relative-date');
var format = require('string-template');
var pkg = require('./package');

function load_env(name, desc) {
    var value = process.env[name];

    if ("" == value || undefined === value) {
        console.log("Environment variable " + name + " must be set. " + desc);
        process.exit(1);
    }

    return value;
}

// Consume our configuration 
var REPO = load_env("RTC_REPO", "It is the URI of the RTC server.");
var USER = load_env("RTC_USER", "It is the username of the RTC user that the bot will login as.");
var PASS = load_env("RTC_PASS", "It is the password of the RTC user that the bot logs in as. ");

var TOKEN = load_env("RTC_BOT_TOKEN", "It is the Slack bot token to use.");
var WEBHOOK = load_env("RTC_WEBHOOK", "It is the Slack webhook to use for rich attachments.");

var RTC_URI_OVERRIDE = process.env.RTC_URI_OVERRIDE;

var wiFetcher = new WorkItems(REPO, USER, PASS);

var ERR_CHANNEL = process.env.RTC_ERROR_CHANNEL;
if (ERR_CHANNEL[0] != '#') {
    ERR_CHANNEL = '#' + ERR_CHANNEL;
}


var Session = require('slackr-bot');

var sess = new Session({
    token: TOKEN,
    webhookClient: {
        webhookUrl: WEBHOOK
    }
});


// Handling for rewriting the link on a work item. This allows us to 
// make work items viewable outside a firewall. 
function wiLinkPassThrough(wi) {
    return wi['rdf:resource'];
}

function wiLinkRewrite(wi) {
    return format(RTC_URI_OVERRIDE, wi['dc:identifier']);
}

var rewriteLink = wiLinkPassThrough;

if (RTC_URI_OVERRIDE) {
    console.log('rewriting');
    rewriteLink = wiLinkRewrite;
}


// The handler for matches on the channel
function handleWorkItemMatch(message, match) {
    console.log("got " + match[1]);

    message.typing();

    wiFetcher.fetchOSLC(match[1]).then(function(wi) {
//        console.log(wi);
        var titleText = "Bug " + wi["dc:identifier"] + ": " + html2text.fromString(wi["dc:title"]);

        console.log(titleText);

        var statusLine = '';
        if (wi["rtc_cm:ownedBy"] && wi["rtc_cm:ownedBy"]["rdf:resource"]) {
            var ownerUri = wi["rtc_cm:ownedBy"]["rdf:resource"];
            var lastSlash = ownerUri.lastIndexOf('/');
            if (-1 != lastSlash) {
                var userName = ownerUri.substring(lastSlash + 1);

                statusLine += '_Owned by *' + userName + '*_. ';
            }
        }

        if (wi["dc:creator"] && wi["dc:creator"]["rdf:resource"]) {
            var ownerUri = wi["dc:creator"]["rdf:resource"];
            var lastSlash = ownerUri.lastIndexOf('/');
            if (-1 != lastSlash) {
                var userName = ownerUri.substring(lastSlash + 1);

                statusLine += '_Created by *' + userName + '*_. ';
            }
        }

        if (wi["rtc_cm:subscribers"]) {
            var subCount = wi["rtc_cm:subscribers"].length;
            if (subCount == 1) {
                statusLine += '_One subscriber_. ';
            }
            else {
                statusLine += '_' + subCount + " subscribers_. ";
            }
        }

        if (wi["rtc_cm:comments"]) {
            var ct = wi["rtc_cm:comments"].length;
            if (ct == 1) {
                statusLine += '_One comment_. ';
            }
            else {
                statusLine += '_' + ct + ' comments_. ';
            }
        }

        if (wi["dc:created"]) {
            var created = Date.parse(wi["dc:created"]);

            statusLine += '_Created ' + relDate(created) + '_. ';
        }

        if (wi["dc:modified"]) {
            var mod = Date.parse(wi["dc:modified"]);

            statusLine += '_Last modified ' + relDate(mod) + '_. ';
        }

        message.reply({
            text: '',
            attachments: [{
                    fallback: titleText,
                    title: titleText,
                    title_link: rewriteLink(wi),
                    text: statusLine + "\n" + html2text.fromString(wi['dc:description']),
                    color: "#7CD197",
                    mrkdwn_in: ["pretext", "text"]
            }]
        });
    }, function(err) {
        console.log("Error");
        console.log(err);

        if (ERR_CHANNEL) {
            var errMsg = "Failed fetching work item " + match[1];
            var chan = sess.channelData(message.data.channel);
            if (chan) {
                errMsg += " (referenced in #" + chan.name + ")";
            }
            sess.sendMessage({
                channel: ERR_CHANNEL,
                text: '',
                attachments: [{
                        color: 'danger',
                        fallback: errMsg,
                        title: errMsg,
                        text: JSON.stringify(err, null, 2),
                        mrkdwn_in: ["pretext", "text", "title"]
                }]
            });
        }
        else {
            message.reply({
                text: err.toString()
            });
        }
    });

}

sess.on(/bug\s*(\d+)/i, handleWorkItemMatch);
sess.on(/\b(\d+): \S*/i, handleWorkItemMatch);
sess.on(/http\S*action=com.ibm.team.workitem.viewWorkItem\S*id=(\d+)/i, handleWorkItemMatch);

require("./interactions/bark")(sess);
require("./interactions/karma")(sess);


sess.connected
.then(function (success) {
    if (ERR_CHANNEL) {
        sess.sendMessage({
                    channel: ERR_CHANNEL,
                    text: pkg.name + " (" + pkg.version + ") started." 
        });
    }
})
.fail(function (err) {
    console.log(err);
});

